import { createWaSocket } from "../../web/session.js";
import { db } from "../../../server/db/index.js";
import { channelConnections } from "../../../server/db/schema.js";
import { eq } from "drizzle-orm";
import { resolveUserPath } from "../../utils.js";
import { aiService } from "../../services/ai.js";
import QRCode from "qrcode";

interface ActiveConnection {
    socket: any;
    qr?: string;
    qrDataUrl?: string;
    status: "connecting" | "connected" | "disconnected";
    userId: string;
    assistantId: string;
}

export class MultiTenantWhatsAppHandler {
    private static instance: MultiTenantWhatsAppHandler;
    private connections: Map<string, ActiveConnection> = new Map();

    private constructor() { }

    public static getInstance(): MultiTenantWhatsAppHandler {
        if (!MultiTenantWhatsAppHandler.instance) {
            MultiTenantWhatsAppHandler.instance = new MultiTenantWhatsAppHandler();
        }
        return MultiTenantWhatsAppHandler.instance;
    }

    async connect(userId: string, assistantId: string) {
        const connectionKey = `${userId}:${assistantId}`;
        
        const existing = this.connections.get(connectionKey);
        if (existing && existing.status !== "disconnected") {
            if (existing.qr && !existing.qrDataUrl) {
                try {
                    existing.qrDataUrl = await QRCode.toDataURL(existing.qr);
                } catch {}
            }
            return existing;
        }

        const authDir = resolveUserPath(`sessions/${userId}/whatsapp`);

        const socket = await createWaSocket(false, true, {
            authDir,
            onQr: async (qr) => {
                const conn = this.connections.get(connectionKey);
                if (conn) {
                    conn.qr = qr;
                    try {
                        conn.qrDataUrl = await QRCode.toDataURL(qr);
                    } catch (e) {
                        console.error("[WhatsApp] Error generating QR image:", e);
                    }
                }
                console.log(`[WhatsApp] New QR for user ${userId}`);
            }
        });

        const connection: ActiveConnection = {
            socket,
            status: "connecting",
            userId,
            assistantId,
        };

        this.connections.set(connectionKey, connection);

        socket.ev.on("connection.update", async (update: any) => {
            const { connection: connStatus } = update;
            if (connStatus === "open") {
                connection.status = "connected";
                connection.qr = undefined;
                connection.qrDataUrl = undefined;
                await db.update(channelConnections)
                    .set({ status: "connected", lastConnectedAt: new Date() })
                    .where(eq(channelConnections.assistantId, assistantId));
                console.log(`[WhatsApp] Connected for user ${userId}`);
            } else if (connStatus === "close") {
                connection.status = "disconnected";
                await db.update(channelConnections)
                    .set({ status: "disconnected" })
                    .where(eq(channelConnections.assistantId, assistantId));
            }
        });

        socket.ev.on("messages.upsert", async (messageUpdate: any) => {
            const message = messageUpdate.messages?.[0];
            if (!message || message.key.fromMe) return;
            if (messageUpdate.type !== "notify") return;

            const text = message.message?.conversation || 
                         message.message?.extendedTextMessage?.text || 
                         "";

            if (!text) return;

            const from = message.key.remoteJid;
            console.log(`[WhatsApp] Message from ${from}: ${text}`);

            if (aiService.isInitialized()) {
                try {
                    const response = await aiService.processMessage(from, text);
                    await socket.sendMessage(from, { text: response });
                    console.log(`[WhatsApp] Sent AI response to ${from}`);
                } catch (err) {
                    console.error("[WhatsApp] Error processing message with AI:", err);
                }
            } else {
                console.log("[WhatsApp] AI service not initialized, skipping response");
            }
        });

        return connection;
    }

    getConnection(userId: string, assistantId: string) {
        return this.connections.get(`${userId}:${assistantId}`);
    }

    getAllConnections() {
        return Array.from(this.connections.entries()).map(([key, conn]) => ({
            key,
            status: conn.status,
            hasQr: !!conn.qrDataUrl,
            userId: conn.userId,
            assistantId: conn.assistantId,
        }));
    }

    async disconnect(userId: string, assistantId: string) {
        const connectionKey = `${userId}:${assistantId}`;
        const connection = this.connections.get(connectionKey);
        if (connection) {
            try {
                await connection.socket.logout();
            } catch (err) {
                console.error(`[WhatsApp] Logout error for ${assistantId}:`, err);
            }
            this.connections.delete(connectionKey);
        }
    }
}

import { createWaSocket } from "../../web/session.js";
import { db } from "../../../server/db/index.js";
import { channelConnections } from "../../../server/db/schema.js";
import { eq } from "drizzle-orm";
import { resolveUserPath } from "../../utils.js";

interface ActiveConnection {
    socket: any;
    qr?: string;
    status: "connecting" | "connected" | "disconnected";
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
        if (this.connections.has(connectionKey)) {
            return this.connections.get(connectionKey);
        }

        const authDir = resolveUserPath(`sessions/${userId}/whatsapp`);

        const socket = await createWaSocket(false, true, {
            authDir,
            onQr: (qr) => {
                const conn = this.connections.get(connectionKey);
                if (conn) conn.qr = qr;
                console.log(`[WhatsApp] New QR for user ${userId}`);
            }
        });

        const connection: ActiveConnection = {
            socket,
            status: "connecting",
        };

        this.connections.set(connectionKey, connection);

        socket.ev.on("connection.update", async (update: any) => {
            const { connection: connStatus } = update;
            if (connStatus === "open") {
                connection.status = "connected";
                connection.qr = undefined;
                await db.update(channelConnections)
                    .set({ status: "connected", lastConnectedAt: new Date() })
                    .where(eq(channelConnections.assistantId, assistantId));
            } else if (connStatus === "close") {
                connection.status = "disconnected";
                await db.update(channelConnections)
                    .set({ status: "disconnected" })
                    .where(eq(channelConnections.assistantId, assistantId));
            }
        });

        return connection;
    }

    getConnection(userId: string, assistantId: string) {
        return this.connections.get(`${userId}:${assistantId}`);
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

import { Express } from "express";
import { setupAuth } from "./auth.js";
import { db } from "./db/index.js";
import { assistants, channelConnections } from "./db/schema.js";
import { eq, and } from "drizzle-orm";
import { MultiTenantWhatsAppHandler } from "../src/channels/whatsapp/multiTenantHandler.js";
import { MultiTenantTelegramHandler } from "../src/channels/telegram/multiTenantHandler.js";

export function registerRoutes(app: Express) {
    setupAuth(app);

    app.get("/api/assistants", async (req, res) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const user = req.user as any;
        const userAssistants = await db.select().from(assistants).where(eq(assistants.userId, user.id));
        res.json(userAssistants);
    });

    app.post("/api/assistants", async (req, res) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const user = req.user as any;
        const { name, personality, defaultLlm } = req.body;
        const [newAssistant] = await db.insert(assistants).values({
            userId: user.id,
            name,
            personality,
            defaultLlm,
        }).returning();
        res.status(201).json(newAssistant);
    });

    app.get("/api/assistants/:id", async (req, res) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const [assistant] = await db.select().from(assistants).where(eq(assistants.id, req.params.id)).limit(1);
        if (!assistant) return res.status(404).json({ message: "Assistant not found" });
        res.json(assistant);
    });

    app.get("/api/channels", async (req, res) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const user = req.user as any;
        const connections = await db.select().from(channelConnections).where(eq(channelConnections.userId, user.id));
        res.json(connections);
    });

    app.get("/api/whatsapp/status", (req, res) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const user = req.user as any;
        const handler = MultiTenantWhatsAppHandler.getInstance();
        const connections = handler.getUserConnections(user.id);
        res.json({ connections });
    });

    const isDev = process.env.NODE_ENV !== "production";
    
    app.get("/api/channels/status", async (req, res) => {
        if (!isDev && !req.isAuthenticated()) return res.sendStatus(401);
        const userId = req.isAuthenticated() ? (req.user as any).id : "guest";
        const handler = MultiTenantWhatsAppHandler.getInstance();
        const connections = handler.getUserConnections(userId);
        const defaultConn = connections.find(c => c.assistantId === "default") || connections[0];
        res.json({
            whatsapp: {
                configured: true,
                linked: defaultConn?.status === "connected",
                running: !!defaultConn,
                connected: defaultConn?.status === "connected",
            }
        });
    });

    app.post("/api/channels/whatsapp/start", async (req, res) => {
        if (!isDev && !req.isAuthenticated()) return res.sendStatus(401);
        const userId = req.isAuthenticated() ? (req.user as any).id : "guest";
        const assistantId = "default";
        const handler = MultiTenantWhatsAppHandler.getInstance();
        
        try {
            const connection = await handler.connect(userId, assistantId);
            
            const maxWait = 10000;
            const startTime = Date.now();
            while (Date.now() - startTime < maxWait) {
                const conn = handler.getConnection(userId, assistantId);
                if (conn?.qrDataUrl) {
                    return res.json({ 
                        message: "Escanea el código QR con tu WhatsApp",
                        qrDataUrl: conn.qrDataUrl 
                    });
                }
                if (conn?.status === "connected") {
                    return res.json({ 
                        message: "WhatsApp ya está conectado",
                        connected: true 
                    });
                }
                await new Promise(r => setTimeout(r, 500));
            }
            
            res.json({ 
                message: "Generando código QR... Haz clic en 'Wait for scan' para esperar",
                qrDataUrl: connection?.qrDataUrl || null
            });
        } catch (err) {
            console.error("[WhatsApp] Start error:", err);
            res.status(500).json({ message: "Error al iniciar WhatsApp" });
        }
    });

    app.post("/api/channels/whatsapp/wait", async (req, res) => {
        if (!isDev && !req.isAuthenticated()) return res.sendStatus(401);
        const userId = req.isAuthenticated() ? (req.user as any).id : "guest";
        const assistantId = "default";
        const handler = MultiTenantWhatsAppHandler.getInstance();
        
        try {
            const maxWait = 60000;
            const startTime = Date.now();
            while (Date.now() - startTime < maxWait) {
                const conn = handler.getConnection(userId, assistantId);
                if (conn?.status === "connected") {
                    return res.json({ connected: true, message: "WhatsApp conectado exitosamente" });
                }
                if (conn?.qrDataUrl) {
                    return res.json({ 
                        connected: false, 
                        message: "Escanea el código QR",
                        qrDataUrl: conn.qrDataUrl 
                    });
                }
                await new Promise(r => setTimeout(r, 1000));
            }
            res.json({ connected: false, message: "Tiempo de espera agotado. Intenta de nuevo." });
        } catch (err) {
            res.status(500).json({ message: "Error esperando conexión" });
        }
    });

    app.post("/api/channels/whatsapp/logout", async (req, res) => {
        if (!isDev && !req.isAuthenticated()) return res.sendStatus(401);
        const userId = req.isAuthenticated() ? (req.user as any).id : "guest";
        const assistantId = "default";
        const handler = MultiTenantWhatsAppHandler.getInstance();
        
        try {
            await handler.disconnect(userId, assistantId);
            res.json({ message: "Sesión de WhatsApp cerrada" });
        } catch (err) {
            res.status(500).json({ message: "Error al cerrar sesión" });
        }
    });

    app.post("/api/channels/whatsapp/connect", async (req, res) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const user = req.user as any;
        const { assistantId } = req.body;

        const [existing] = await db.select().from(channelConnections)
            .where(and(eq(channelConnections.assistantId, assistantId), eq(channelConnections.channelType, "whatsapp")))
            .limit(1);

        if (!existing) {
            await db.insert(channelConnections).values({
                userId: user.id,
                assistantId,
                channelType: "whatsapp",
            });
        }

        const handler = MultiTenantWhatsAppHandler.getInstance();
        const connection = await handler.connect(user.id, assistantId);
        res.json({ 
            status: connection?.status, 
            qr: connection?.qrDataUrl,
            hasQr: !!connection?.qrDataUrl
        });
    });

    // Telegram Connect
    app.post("/api/channels/telegram/connect", async (req, res) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const user = req.user as any;
        const { assistantId, token } = req.body;

        if (!token) return res.status(400).json({ message: "Telegram token is required" });

        const [existing] = await db.select().from(channelConnections)
            .where(and(eq(channelConnections.assistantId, assistantId), eq(channelConnections.channelType, "telegram")))
            .limit(1);

        if (existing) {
            await db.update(channelConnections)
                .set({ botToken: token })
                .where(eq(channelConnections.id, existing.id));
        } else {
            await db.insert(channelConnections).values({
                userId: user.id,
                assistantId,
                channelType: "telegram",
                botToken: token,
            });
        }

        const handler = MultiTenantTelegramHandler.getInstance();
        const connection = await handler.connect(user.id, assistantId, token);
        res.json({ status: connection?.status });
    });
}

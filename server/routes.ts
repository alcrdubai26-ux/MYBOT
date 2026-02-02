import { Express } from "express";
import { setupAuth } from "./auth.js";
import { db } from "./db/index.js";
import { assistants, channelConnections } from "./db/schema.js";
import { eq, and } from "drizzle-orm";
import { MultiTenantWhatsAppHandler } from "../src/channels/whatsapp/multiTenantHandler.js";
import { MultiTenantTelegramHandler } from "../src/channels/telegram/multiTenantHandler.js";
import { emailService } from "../src/services/email.js";
import { browserService } from "../src/services/browser.js";
import { gammaService } from "../src/services/gamma.js";

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

    // Telegram Connect (simplified for dev)
    app.post("/api/channels/telegram/start", async (req, res) => {
        if (!isDev && !req.isAuthenticated()) return res.sendStatus(401);
        const userId = req.isAuthenticated() ? (req.user as any).id : "guest";
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ 
                message: "Se requiere el token del bot de Telegram. Obtenlo de @BotFather" 
            });
        }

        try {
            const handler = MultiTenantTelegramHandler.getInstance();
            const connection = await handler.connect(userId, "default", token);
            res.json({ 
                status: connection?.status,
                message: connection?.status === "connected" 
                    ? "Bot de Telegram conectado. Ahora puedes enviarle mensajes." 
                    : "Error al conectar"
            });
        } catch (err) {
            console.error("[Telegram] Connect error:", err);
            res.status(500).json({ message: "Error al conectar el bot de Telegram" });
        }
    });

    app.get("/api/channels/telegram/status", async (req, res) => {
        if (!isDev && !req.isAuthenticated()) return res.sendStatus(401);
        const userId = req.isAuthenticated() ? (req.user as any).id : "guest";
        const handler = MultiTenantTelegramHandler.getInstance();
        const bots = handler.getUserBots(userId);
        res.json({ 
            connected: bots.some(b => b.status === "connected"),
            bots 
        });
    });

    app.post("/api/channels/telegram/disconnect", async (req, res) => {
        if (!isDev && !req.isAuthenticated()) return res.sendStatus(401);
        const userId = req.isAuthenticated() ? (req.user as any).id : "guest";
        const handler = MultiTenantTelegramHandler.getInstance();
        await handler.disconnect(userId, "default");
        res.json({ message: "Bot de Telegram desconectado" });
    });

    // Telegram Connect (original with auth)
    app.post("/api/channels/telegram/connect", async (req, res) => {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const user = req.user as any;
        const { assistantId, token } = req.body;

        if (!token) return res.status(400).json({ message: "Telegram token is required" });

        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assistantId);
        
        if (isValidUUID) {
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
        }

        const handler = MultiTenantTelegramHandler.getInstance();
        const connection = await handler.connect(user.id, assistantId, token);
        res.json({ status: connection?.status });
    });

    // Email routes
    app.get("/api/email/accounts", async (req, res) => {
        if (!isDev && !req.isAuthenticated()) return res.sendStatus(401);
        await emailService.initialize();
        res.json({ accounts: emailService.getAccounts() });
    });

    app.post("/api/email/send", async (req, res) => {
        if (!isDev && !req.isAuthenticated()) return res.sendStatus(401);
        const { to, subject, body, html, from, cc, bcc } = req.body;
        
        if (!to || !subject || !body) {
            return res.status(400).json({ error: "to, subject y body son requeridos" });
        }

        await emailService.initialize();
        const result = await emailService.sendEmail({ to, subject, body, html, from, cc, bcc });
        res.json(result);
    });

    app.get("/api/email/recent", async (req, res) => {
        if (!isDev && !req.isAuthenticated()) return res.sendStatus(401);
        const count = parseInt(req.query.count as string) || 10;
        await emailService.initialize();
        const emails = await emailService.getRecentEmails(count);
        res.json({ emails });
    });

    app.get("/api/email/search", async (req, res) => {
        if (!isDev && !req.isAuthenticated()) return res.sendStatus(401);
        const query = req.query.q as string;
        const count = parseInt(req.query.count as string) || 10;
        
        if (!query) {
            return res.status(400).json({ error: "query param 'q' es requerido" });
        }

        await emailService.initialize();
        const emails = await emailService.searchEmails(query, count);
        res.json({ emails });
    });

    // Browser routes
    app.post("/api/browser/navigate", async (req, res) => {
        if (!isDev && !req.isAuthenticated()) return res.sendStatus(401);
        const { url, sessionId } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: "url es requerido" });
        }

        const result = await browserService.navigate(url, sessionId);
        res.json(result);
    });

    app.post("/api/browser/screenshot", async (req, res) => {
        if (!isDev && !req.isAuthenticated()) return res.sendStatus(401);
        const { sessionId } = req.body;
        const result = await browserService.screenshot(sessionId);
        res.json(result);
    });

    app.get("/api/browser/allowed-domains", (req, res) => {
        res.json({ 
            allowed: browserService.getAllowedDomains(),
            blocked: browserService.getBlockedDomains()
        });
    });

    // Gamma presentation routes
    app.post("/api/gamma/create", async (req, res) => {
        if (!isDev && !req.isAuthenticated()) return res.sendStatus(401);
        const { topic, slideCount } = req.body;
        
        if (!topic) {
            return res.status(400).json({ error: "topic es requerido" });
        }

        const result = await gammaService.createPresentation(topic, slideCount || 8);
        res.json(result);
    });
}

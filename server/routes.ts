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

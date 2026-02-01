import { createTelegramBot } from "../../telegram/bot.js";
import { db } from "../../../server/db/index.js";
import { channelConnections } from "../../../server/db/schema.js";
import { eq } from "drizzle-orm";

interface ActiveTelegramBot {
    bot: any;
    status: "connected" | "disconnected";
}

export class MultiTenantTelegramHandler {
    private static instance: MultiTenantTelegramHandler;
    private bots: Map<string, ActiveTelegramBot> = new Map();

    private constructor() { }

    public static getInstance(): MultiTenantTelegramHandler {
        if (!MultiTenantTelegramHandler.instance) {
            MultiTenantTelegramHandler.instance = new MultiTenantTelegramHandler();
        }
        return MultiTenantTelegramHandler.instance;
    }

    async connect(userId: string, assistantId: string, token: string) {
        const connectionKey = `${userId}:${assistantId}`;
        if (this.bots.has(connectionKey)) {
            return this.bots.get(connectionKey);
        }

        try {
            const bot = createTelegramBot({
                token,
                accountId: assistantId,
            });

            bot.start().catch((err) => {
                console.error(`[Telegram] Bot for assistant ${assistantId} failed:`, err);
                this.bots.delete(connectionKey);
            });

            const activeBot: ActiveTelegramBot = {
                bot,
                status: "connected",
            };

            this.bots.set(connectionKey, activeBot);

            await db.update(channelConnections)
                .set({ status: "connected", lastConnectedAt: new Date() })
                .where(eq(channelConnections.assistantId, assistantId));

            console.log(`[Telegram] Bot connected for assistant ${assistantId}`);
            return activeBot;
        } catch (err) {
            console.error(`[Telegram] Failed to create bot for assistant ${assistantId}:`, err);
            throw err;
        }
    }

    getBot(userId: string, assistantId: string) {
        return this.bots.get(`${userId}:${assistantId}`);
    }

    async disconnect(userId: string, assistantId: string) {
        const connectionKey = `${userId}:${assistantId}`;
        const activeBot = this.bots.get(connectionKey);
        if (activeBot) {
            try {
                await activeBot.bot.stop();
            } catch (err) {
                console.error(`[Telegram] Error stopping bot ${assistantId}:`, err);
            }
            this.bots.delete(connectionKey);
        }
    }
}

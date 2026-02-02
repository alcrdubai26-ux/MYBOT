import { createSimpleTelegramBot } from "../../telegram/simple-bot.js";

interface ActiveTelegramBot {
    bot: any;
    status: "connected" | "disconnected" | "error";
    error?: string;
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
        const existing = this.bots.get(connectionKey);
        if (existing && existing.status === "connected") {
            return existing;
        }

        try {
            const bot = createSimpleTelegramBot({
                token,
                assistantId,
            });

            bot.start().catch((err) => {
                console.error(`[Telegram] Bot for ${connectionKey} failed:`, err);
                const activeBot = this.bots.get(connectionKey);
                if (activeBot) {
                    activeBot.status = "error";
                    activeBot.error = String(err);
                }
            });

            const activeBot: ActiveTelegramBot = {
                bot,
                status: "connected",
            };

            this.bots.set(connectionKey, activeBot);
            console.log(`[Telegram] Bot connected for ${connectionKey}`);
            return activeBot;
        } catch (err) {
            console.error(`[Telegram] Failed to create bot for ${connectionKey}:`, err);
            throw err;
        }
    }

    getBot(userId: string, assistantId: string) {
        return this.bots.get(`${userId}:${assistantId}`);
    }

    getUserBots(userId: string) {
        return Array.from(this.bots.entries())
            .filter(([key]) => key.startsWith(`${userId}:`))
            .map(([key, bot]) => ({
                key,
                status: bot.status,
                error: bot.error,
            }));
    }

    async disconnect(userId: string, assistantId: string) {
        const connectionKey = `${userId}:${assistantId}`;
        const activeBot = this.bots.get(connectionKey);
        if (activeBot) {
            try {
                await activeBot.bot.stop();
            } catch (err) {
                console.error(`[Telegram] Error stopping bot ${connectionKey}:`, err);
            }
            this.bots.delete(connectionKey);
        }
    }
}

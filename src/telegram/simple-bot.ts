import { Bot } from "grammy";
import { aiService } from "../services/ai.js";

export interface SimpleTelegramBotOptions {
    token: string;
    assistantId: string;
}

export function createSimpleTelegramBot(opts: SimpleTelegramBotOptions) {
    const bot = new Bot(opts.token);
    
    bot.on("message:text", async (ctx) => {
        const text = ctx.message.text;
        const chatId = ctx.chat.id;
        const conversationKey = `${opts.assistantId}:telegram:${chatId}`;
        
        console.log(`[Telegram] Message from ${chatId}: ${text}`);
        
        if (aiService.isInitialized()) {
            try {
                await ctx.replyWithChatAction("typing");
                const response = await aiService.processMessage(conversationKey, text);
                await ctx.reply(response);
                console.log(`[Telegram] Sent AI response to ${chatId}`);
            } catch (err) {
                console.error("[Telegram] Error processing message with AI:", err);
                await ctx.reply("Lo siento, hubo un error procesando tu mensaje.");
            }
        } else {
            console.log("[Telegram] AI service not initialized");
            await ctx.reply("El asistente de IA no está configurado. Contacta al administrador.");
        }
    });
    
    bot.catch((err) => {
        console.error("[Telegram] Bot error:", err);
    });
    
    return bot;
}

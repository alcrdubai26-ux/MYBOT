import { Bot, InputFile } from "grammy";
import { aiService } from "../services/ai.js";
import * as fs from "fs";

export interface SimpleTelegramBotOptions {
    token: string;
    assistantId: string;
}

function detectImageRequest(text: string): string | null {
    const patterns = [
        /(?:genera|crea|hazme|dibuja|diseña)\s+(?:una?\s+)?(?:imagen|foto|ilustración|dibujo)\s+(?:de\s+)?(.+)/i,
        /(?:imagen|foto)\s+(?:de\s+)?(.+)/i,
        /\/imagen\s+(.+)/i,
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1].trim();
    }
    return null;
}

function detectVideoRequest(text: string): string | null {
    const patterns = [
        /(?:genera|crea|hazme)\s+(?:un?\s+)?(?:video|vídeo|clip)\s+(?:de\s+)?(.+)/i,
        /(?:video|vídeo)\s+(?:de\s+)?(.+)/i,
        /\/video\s+(.+)/i,
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1].trim();
    }
    return null;
}

export function createSimpleTelegramBot(opts: SimpleTelegramBotOptions) {
    const bot = new Bot(opts.token);
    
    bot.command("imagen", async (ctx) => {
        const prompt = ctx.match;
        if (!prompt) {
            await ctx.reply("Uso: /imagen [descripción de la imagen]");
            return;
        }
        
        await ctx.replyWithChatAction("upload_photo");
        await ctx.reply("Generando imagen... esto puede tardar unos segundos.");
        
        const result = await aiService.generateImage(prompt);
        if (result.success && result.imagePath) {
            await ctx.replyWithPhoto(new InputFile(result.imagePath));
            fs.unlinkSync(result.imagePath);
        } else {
            await ctx.reply(`Error generando imagen: ${result.error}`);
        }
    });
    
    bot.command("video", async (ctx) => {
        const prompt = ctx.match;
        if (!prompt) {
            await ctx.reply("Uso: /video [descripción del video]");
            return;
        }
        
        await ctx.replyWithChatAction("record_video");
        await ctx.reply("Generando video... esto puede tardar 2-5 minutos. Te aviso cuando esté listo.");
        
        const result = await aiService.generateVideo(prompt);
        if (result.success && result.videoPath) {
            await ctx.replyWithVideo(new InputFile(result.videoPath));
            fs.unlinkSync(result.videoPath);
        } else {
            await ctx.reply(`Error generando video: ${result.error}`);
        }
    });
    
    bot.on("message:text", async (ctx) => {
        const text = ctx.message.text;
        const chatId = ctx.chat.id;
        const conversationKey = `${opts.assistantId}:telegram:${chatId}`;
        
        console.log(`[Telegram] Message from ${chatId}: ${text}`);
        
        const imagePrompt = detectImageRequest(text);
        if (imagePrompt) {
            await ctx.replyWithChatAction("upload_photo");
            await ctx.reply("Vale, generando imagen...");
            
            const result = await aiService.generateImage(imagePrompt);
            if (result.success && result.imagePath) {
                await ctx.replyWithPhoto(new InputFile(result.imagePath));
                fs.unlinkSync(result.imagePath);
            } else {
                await ctx.reply(`Joder, no pude generar la imagen: ${result.error}`);
            }
            return;
        }
        
        const videoPrompt = detectVideoRequest(text);
        if (videoPrompt) {
            await ctx.replyWithChatAction("record_video");
            await ctx.reply("Voy a generar el video. Tardará unos minutos, te aviso cuando esté.");
            
            const result = await aiService.generateVideo(videoPrompt);
            if (result.success && result.videoPath) {
                await ctx.replyWithVideo(new InputFile(result.videoPath));
                fs.unlinkSync(result.videoPath);
            } else {
                await ctx.reply(`Error generando video: ${result.error}`);
            }
            return;
        }
        
        if (aiService.isInitialized()) {
            try {
                await ctx.replyWithChatAction("typing");
                const response = await aiService.processMessage(conversationKey, text);
                await ctx.reply(response);
                console.log(`[Telegram] Sent AI response to ${chatId}`);
            } catch (err: any) {
                const errorMsg = err?.message || String(err);
                console.error("[Telegram] Error processing message with AI:", errorMsg);
                console.error("[Telegram] Full error:", err);
                
                if (errorMsg.includes("API key")) {
                    await ctx.reply("Error: La API key de Gemini no es válida. Revisa la configuración.");
                } else if (errorMsg.includes("quota") || errorMsg.includes("rate")) {
                    await ctx.reply("Me he pasado del límite de la API. Espera un momento e inténtalo de nuevo.");
                } else if (errorMsg.includes("blocked") || errorMsg.includes("safety")) {
                    await ctx.reply("El mensaje fue bloqueado por el filtro de seguridad. Reformúlalo.");
                } else {
                    await ctx.reply("Joder, algo ha fallado. Inténtalo de nuevo.");
                }
            }
        } else {
            console.log("[Telegram] AI service not initialized - checking GEMINI_API_KEY...");
            console.log("[Telegram] GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
            await ctx.reply("El asistente de IA no está configurado. Contacta al administrador.");
        }
    });
    
    bot.catch((err) => {
        console.error("[Telegram] Bot error:", err);
    });
    
    return bot;
}

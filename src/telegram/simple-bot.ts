import { Bot, InputFile } from "grammy";
import { aiService } from "../services/ai.js";
import { emailService } from "../services/email.js";
import { voiceService } from "../services/voice.js";
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

function detectEmailRequest(text: string): { type: 'read' | 'search' | null; query?: string } {
    // Si piden Excel, informe, tabla, análisis → NO interceptar, dejar que el AI lo maneje con function calling
    if (/excel|informe|tabla|reporte|análisis|analisis|suscripciones/i.test(text)) {
        return { type: null };
    }
    
    const readPatterns = [
        /(?:muéstrame|muestrame|dame|lee|ver|leer)\s+(?:mis\s+)?(?:últimos\s+)?(?:correos?|emails?|mails?)/i,
        /(?:mis\s+)?(?:últimos\s+)?(?:correos?|emails?|mails?)(?:\s+recientes)?/i,
        /bandeja\s+de\s+entrada/i,
        /\/emails?/i,
    ];
    
    for (const pattern of readPatterns) {
        if (pattern.test(text)) return { type: 'read' };
    }
    
    const searchMatch = text.match(/(?:busca|encuentra|buscar)\s+(?:correos?|emails?|mails?)\s+(?:de|sobre|con)\s+(.+)/i);
    if (searchMatch) return { type: 'search', query: searchMatch[1].trim() };
    
    return { type: null };
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
    
    bot.command("voz", async (ctx) => {
        const text = ctx.match;
        if (!text) {
            await ctx.reply("Uso: /voz [texto que quieres que diga AMUN]");
            return;
        }
        
        await ctx.replyWithChatAction("record_voice");
        
        const result = await voiceService.textToSpeech(text);
        if (result.success && result.audioPath) {
            await ctx.replyWithVoice(new InputFile(result.audioPath));
            fs.unlinkSync(result.audioPath);
        } else {
            await ctx.reply(`Error generando audio: ${result.error}`);
        }
    });
    
    bot.on("message:voice", async (ctx) => {
        const chatId = ctx.chat.id;
        const conversationKey = `${opts.assistantId}:telegram:${chatId}`;
        
        console.log(`[Telegram] Voice message from ${chatId}`);
        
        try {
            await ctx.replyWithChatAction("typing");
            
            const file = await ctx.getFile();
            const fileUrl = `https://api.telegram.org/file/bot${opts.token}/${file.file_path}`;
            
            const response = await fetch(fileUrl);
            const audioBuffer = Buffer.from(await response.arrayBuffer());
            
            const transcription = await voiceService.transcribeAudio(audioBuffer, 'voice.ogg');
            
            if (!transcription.success || !transcription.text) {
                await ctx.reply("No pude entender el audio. ¿Puedes repetir?");
                return;
            }
            
            console.log(`[Telegram] Transcribed: "${transcription.text}"`);
            
            if (aiService.isInitialized()) {
                await ctx.replyWithChatAction("record_voice");
                const aiResponse = await aiService.processMessage(conversationKey, transcription.text);
                
                const voiceResult = await voiceService.textToSpeech(aiResponse);
                if (voiceResult.success && voiceResult.audioPath) {
                    await ctx.replyWithVoice(new InputFile(voiceResult.audioPath));
                    fs.unlinkSync(voiceResult.audioPath);
                } else {
                    await ctx.reply(aiResponse);
                }
                
                // Send any generated files (Excel, etc.)
                const generatedFiles = aiService.getGeneratedFiles();
                for (const filePath of generatedFiles) {
                    if (fs.existsSync(filePath)) {
                        console.log(`[Telegram] Sending file: ${filePath}`);
                        await ctx.replyWithDocument(new InputFile(filePath));
                        fs.unlinkSync(filePath);
                    }
                }
            } else {
                await ctx.reply(`Dijiste: "${transcription.text}"\n\nPero AMUN no está configurado.`);
            }
        } catch (err) {
            console.error("[Telegram] Error processing voice:", err);
            await ctx.reply("Error procesando el audio.");
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
        
        const emailRequest = detectEmailRequest(text);
        if (emailRequest.type === 'read') {
            await ctx.replyWithChatAction("typing");
            try {
                await emailService.initialize();
                const emails = await emailService.getRecentEmails(5);
                if (emails.length === 0) {
                    await ctx.reply("No he podido obtener tus correos. ¿Tienes Gmail conectado?");
                } else {
                    let response = "Aquí tienes tus últimos correos:\n\n";
                    emails.forEach((email, i) => {
                        const fromName = email.from?.split('<')[0]?.trim() || email.from || 'Desconocido';
                        response += `${i + 1}. *${email.subject || 'Sin asunto'}*\n`;
                        response += `   De: ${fromName}\n`;
                        response += `   ${email.snippet?.substring(0, 80)}...\n\n`;
                    });
                    await ctx.reply(response, { parse_mode: "Markdown" });
                }
            } catch (err) {
                console.error("[Telegram] Error fetching emails:", err);
                await ctx.reply("No pude acceder al correo. Puede que Gmail no esté conectado.");
            }
            return;
        }
        
        if (emailRequest.type === 'search' && emailRequest.query) {
            await ctx.replyWithChatAction("typing");
            try {
                await emailService.initialize();
                const emails = await emailService.searchEmails(emailRequest.query, 5);
                if (emails.length === 0) {
                    await ctx.reply(`No encontré correos sobre "${emailRequest.query}".`);
                } else {
                    let response = `Correos encontrados sobre "${emailRequest.query}":\n\n`;
                    emails.forEach((email, i) => {
                        const fromName = email.from?.split('<')[0]?.trim() || email.from || 'Desconocido';
                        response += `${i + 1}. *${email.subject || 'Sin asunto'}*\n`;
                        response += `   De: ${fromName}\n`;
                        response += `   ${email.snippet?.substring(0, 80)}...\n\n`;
                    });
                    await ctx.reply(response, { parse_mode: "Markdown" });
                }
            } catch (err) {
                console.error("[Telegram] Error searching emails:", err);
                await ctx.reply("Error buscando correos.");
            }
            return;
        }
        
        if (aiService.isInitialized()) {
            try {
                await ctx.replyWithChatAction("typing");
                const response = await aiService.processMessage(conversationKey, text);
                await ctx.reply(response);
                console.log(`[Telegram] Sent AI response to ${chatId}`);
                
                // Send any generated files (Excel, etc.)
                const generatedFiles = aiService.getGeneratedFiles();
                for (const filePath of generatedFiles) {
                    if (fs.existsSync(filePath)) {
                        console.log(`[Telegram] Sending file: ${filePath}`);
                        await ctx.replyWithDocument(new InputFile(filePath));
                        fs.unlinkSync(filePath);
                    }
                }
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

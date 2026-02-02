import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI, Modality } from "@google/genai";
import { db } from "../../server/db/index.js";
import { memory, conversations, messages, userTasks, userProjects, assistants } from "../../server/db/schema.js";
import { eq, desc, and, sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const AMUN_PERSONALITY = `
NOMBRE: AMUN

IDIOMA: Español (España). Usa "tú", no "usted".

PERSONALIDAD:
- Directo y sin rodeos. Nada de introducciones largas ni relleno.
- Respuestas cortas y al grano. Si puedes decirlo en 2 frases, no uses 10.
- Tono cercano y desenfadado, pero profesional cuando el tema lo requiere.
- Sé crítico y honesto. Si algo no tiene sentido o es mala idea, dilo claramente.
- No des la razón por quedar bien. Si el usuario se equivoca, corrígelo con respeto pero sin rodeos.
- Proactivo: sugiere cosas útiles sin que te las pidan.
- Práctico: prioriza soluciones sobre teoría.

ESTILO DE RESPUESTA:
- Usa frases cortas
- Evita muletillas falsas tipo "¡Claro!", "¡Por supuesto!", "¡Excelente pregunta!"
- No uses emojis salvo que el usuario los use primero
- Si algo requiere pasos, usa listas numeradas breves
- Cuando no sepas algo, dilo sin dar vueltas
- Puedes soltar algún taco ocasional para dar énfasis (joder, hostia, coño), pero sin pasarte

MULETILLAS NATURALES:
- "A ver..." (para empezar a explicar)
- "Mira..." (para llamar la atención)
- "O sea..." (para aclarar)
- "¿Entiendes?" o "¿no?" (al final de explicaciones)
- "La verdad es que..." (para ser honesto)
- "Joder" (cuando algo es complicado)
- "Vamos a ver" (para ordenar ideas)
- "Bro" (ocasionalmente, para cercanía)

CONTEXTO DEL USUARIO:
- Nombre: Angel
- Emprendedor y empresario
- 30 años de experiencia en construcción
- Fundador de ObraSmart Pro (SaaS de presupuestos de obra con IA)
- Empresa con sede en Dubai (Multiple Brand FZE)
- Valora la eficiencia y odia perder el tiempo
- Prefiere acción a reuniones o planificación excesiva

SOBRE OBRASMART PRO:
- SaaS de presupuestos de construcción con IA
- BertIA es la asistente IA que genera presupuestos en 30 segundos
- Entrada: voz, texto, fotos, planos
- Salida: presupuesto profesional en PDF
- Lanzamiento: Febrero 2026
- Mercados: España, México, Argentina, Colombia, Chile, Perú
- 23 oficios: Electricidad, Fontanería, Albañilería, Pintura, Carpintería, Climatización, Cristalería, Cerrajería, Reformas integrales, Baños, Cocinas, Techos, Suelos, Fachadas, Impermeabilización, Piscinas, Jardines, Domótica, Seguridad, Mudanzas, Limpieza, Pulido de mármol, Diseño de cocinas

LÍMITES:
NUNCA:
- Acceder a bancos o hacer pagos
- Compartir contraseñas o datos sensibles
- Enviar mensajes a terceros sin confirmación
- Inventar información

PEDIR CONFIRMACIÓN ANTES DE:
- Enviar emails o mensajes
- Publicar en redes sociales
- Cualquier acción irreversible

FORMATO:
- Respuestas CORTAS (máximo 3-4 párrafos)
- Listas de máximo 5-7 puntos
- Si necesitas más espacio, pregunta si quiere que amplíes

CUANDO NO SEPAS ALGO:
- "No lo sé, pero puedo buscarlo"
- "Eso no lo tengo claro, ¿quieres que investigue?"
- "Ni idea, bro"
`.trim();

interface MemoryItem {
  id: string;
  category: string | null;
  content: string;
  importance: number | null;
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

const AMUN_ASSISTANT_NAME = "AMUN";

class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private genAINew: GoogleGenAI | null = null;
  private model: any = null;
  private apiKey: string = "";
  private conversationHistory: Map<
    string,
    Array<{ role: string; parts: { text: string }[] }>
  > = new Map();
  private amunAssistantId: string | null = null;

  initialize(apiKey: string) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.genAINew = new GoogleGenAI({ apiKey });
    this.model = this.genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    console.log("[AI] Gemini 3.0 Flash inicializado con personalidad AMUN");
    console.log("[AI] Imagen 3.0 (imágenes) y Veo 2.0 (videos) habilitados");
    this.ensureAmunAssistant();
  }

  isInitialized(): boolean {
    return this.model !== null;
  }

  private async ensureAmunAssistant(): Promise<string> {
    if (this.amunAssistantId) return this.amunAssistantId;
    
    try {
      const existing = await db
        .select()
        .from(assistants)
        .where(eq(assistants.name, AMUN_ASSISTANT_NAME))
        .limit(1);

      if (existing.length > 0) {
        this.amunAssistantId = existing[0].id;
        console.log(`[AI] Asistente AMUN encontrado: ${this.amunAssistantId}`);
        return this.amunAssistantId;
      }

      const [newAssistant] = await db.insert(assistants).values({
        name: AMUN_ASSISTANT_NAME,
        personality: AMUN_PERSONALITY,
        systemPrompt: AMUN_PERSONALITY,
        defaultLlm: "gemini",
        language: "es",
        isActive: true,
      }).returning();

      this.amunAssistantId = newAssistant.id;
      console.log(`[AI] Asistente AMUN creado: ${this.amunAssistantId}`);
      return this.amunAssistantId;
    } catch (err) {
      console.error("[AI] Error creando asistente AMUN:", err);
      return "";
    }
  }

  async getAmunAssistantId(): Promise<string> {
    if (this.amunAssistantId) return this.amunAssistantId;
    return this.ensureAmunAssistant();
  }

  private async getRelevantMemory(assistantId: string): Promise<MemoryItem[]> {
    if (!isValidUUID(assistantId)) return [];
    try {
      const memories = await db
        .select({
          id: memory.id,
          category: memory.category,
          content: memory.content,
          importance: memory.importance,
        })
        .from(memory)
        .where(eq(memory.assistantId, assistantId))
        .orderBy(desc(memory.importance), desc(memory.lastAccessedAt))
        .limit(10);
      return memories;
    } catch (err) {
      console.log("[AI] No hay memoria guardada o error:", err);
      return [];
    }
  }

  private async getActiveTasks(assistantId: string): Promise<any[]> {
    if (!isValidUUID(assistantId)) return [];
    try {
      const tasks = await db
        .select()
        .from(userTasks)
        .where(and(
          eq(userTasks.assistantId, assistantId),
          sql`${userTasks.status} IN ('pending', 'in_progress')`
        ))
        .orderBy(desc(userTasks.priority))
        .limit(5);
      return tasks;
    } catch (err) {
      return [];
    }
  }

  private async getActiveProjects(assistantId: string): Promise<any[]> {
    if (!isValidUUID(assistantId)) return [];
    try {
      const projects = await db
        .select()
        .from(userProjects)
        .where(and(
          eq(userProjects.assistantId, assistantId),
          eq(userProjects.status, "active")
        ))
        .limit(5);
      return projects;
    } catch (err) {
      return [];
    }
  }

  private async saveMemory(assistantId: string, category: string, content: string, importance: number = 5) {
    if (!isValidUUID(assistantId)) {
      console.log(`[AI] Memoria no guardada (sin assistantId válido): ${category}`);
      return;
    }
    try {
      await db.insert(memory).values({
        assistantId,
        memoryType: "fact",
        category,
        content,
        importance,
        source: "user_told",
      });
      console.log(`[AI] Memoria guardada: ${category} - ${content.substring(0, 50)}...`);
    } catch (err) {
      console.error("[AI] Error guardando memoria:", err);
    }
  }

  private async saveConversation(assistantId: string, channelType: string, chatId: string, userMessage: string, aiResponse: string) {
    if (!isValidUUID(assistantId)) return;
    try {
      let conv = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.assistantId, assistantId),
          eq(conversations.channelChatId, chatId)
        ))
        .limit(1);

      let conversationId: string;
      if (conv.length === 0) {
        const newConv = await db.insert(conversations).values({
          assistantId,
          channelType,
          channelChatId: chatId,
          messageCount: 0,
        }).returning();
        conversationId = newConv[0].id;
      } else {
        conversationId = conv[0].id;
      }

      await db.insert(messages).values([
        { conversationId, role: "user", content: userMessage },
        { conversationId, role: "assistant", content: aiResponse },
      ]);

      await db.update(conversations)
        .set({ 
          messageCount: sql`${conversations.messageCount} + 2`,
          lastMessageAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));
    } catch (err) {
      console.error("[AI] Error guardando conversación:", err);
    }
  }

  private extractMemoryFromMessage(message: string): { category: string; content: string; importance: number } | null {
    const patterns = [
      { regex: /(?:me llamo|mi nombre es|soy) (\w+)/i, category: "personal", importance: 9 },
      { regex: /(?:mi empresa|trabajo en|fundé) (.+?)(?:\.|$)/i, category: "trabajo", importance: 8 },
      { regex: /(?:vivo en|estoy en) (.+?)(?:\.|$)/i, category: "personal", importance: 7 },
      { regex: /(?:he decidido|vamos a hacer|el plan es) (.+?)(?:\.|$)/i, category: "decisiones", importance: 8 },
      { regex: /(?:tengo que|debo|mañana voy a) (.+?)(?:\.|$)/i, category: "tareas", importance: 7 },
      { regex: /(?:prefiero|no me gusta|me encanta) (.+?)(?:\.|$)/i, category: "preferencias", importance: 6 },
      { regex: /(?:el lanzamiento|la fecha|el deadline) (?:es|será) (.+?)(?:\.|$)/i, category: "proyectos", importance: 9 },
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern.regex);
      if (match) {
        return {
          category: pattern.category,
          content: match[0],
          importance: pattern.importance,
        };
      }
    }
    return null;
  }

  async processMessage(conversationKey: string, message: string): Promise<string> {
    if (!this.model) {
      return "Error: El servicio de IA no está configurado. Añade GEMINI_API_KEY en los Secrets.";
    }

    try {
      const parts = conversationKey.split(":");
      let assistantId = parts[0];
      const channelType = parts[1] || "unknown";
      const chatId = parts[2] || "unknown";

      if (!isValidUUID(assistantId)) {
        assistantId = await this.getAmunAssistantId();
      }

      const memoryExtract = this.extractMemoryFromMessage(message);
      if (memoryExtract && isValidUUID(assistantId)) {
        await this.saveMemory(assistantId, memoryExtract.category, memoryExtract.content, memoryExtract.importance);
      }

      const [relevantMemory, activeTasks, activeProjects] = await Promise.all([
        this.getRelevantMemory(assistantId),
        this.getActiveTasks(assistantId),
        this.getActiveProjects(assistantId),
      ]);

      if (!this.conversationHistory.has(conversationKey)) {
        this.conversationHistory.set(conversationKey, []);
      }
      const history = this.conversationHistory.get(conversationKey)!;

      const chat = this.model.startChat({
        history: history,
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

      let contextInfo = "";
      if (relevantMemory.length > 0) {
        contextInfo += "\n\nMEMORIA GUARDADA:\n";
        relevantMemory.forEach(m => {
          contextInfo += `- [${m.category}] ${m.content}\n`;
        });
      }
      if (activeTasks.length > 0) {
        contextInfo += "\n\nTAREAS PENDIENTES:\n";
        activeTasks.forEach(t => {
          contextInfo += `- ${t.description} (prioridad: ${t.priority})\n`;
        });
      }
      if (activeProjects.length > 0) {
        contextInfo += "\n\nPROYECTOS ACTIVOS:\n";
        activeProjects.forEach(p => {
          contextInfo += `- ${p.name}: ${p.description || 'sin descripción'}\n`;
        });
      }

      let finalMessage = message;
      if (history.length === 0) {
        finalMessage = `${AMUN_PERSONALITY}${contextInfo}\n\n---\n\nMensaje del usuario: ${message}`;
      } else if (contextInfo) {
        finalMessage = `[Contexto actualizado:${contextInfo}]\n\nMensaje: ${message}`;
      }

      const result = await chat.sendMessage(finalMessage);
      const response = result.response.text();

      history.push({ role: "user", parts: [{ text: message }] });
      history.push({ role: "model", parts: [{ text: response }] });

      if (history.length > 40) {
        history.splice(0, 2);
      }

      this.saveConversation(assistantId, channelType, chatId, message, response).catch(() => {});

      return response;
    } catch (error) {
      console.error("[AI] Error procesando mensaje:", error);
      return "Joder, algo ha fallado. Inténtalo de nuevo.";
    }
  }

  clearHistory(conversationKey: string) {
    this.conversationHistory.delete(conversationKey);
  }

  async addTask(assistantId: string, description: string, priority: number = 5, dueDate?: Date) {
    try {
      await db.insert(userTasks).values({
        assistantId,
        description,
        priority,
        dueDate,
      });
      return true;
    } catch (err) {
      console.error("[AI] Error añadiendo tarea:", err);
      return false;
    }
  }

  async completeTask(taskId: string) {
    try {
      await db.update(userTasks)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(userTasks.id, taskId));
      return true;
    } catch (err) {
      return false;
    }
  }

  async generateImage(prompt: string, aspectRatio: string = "1:1"): Promise<{ success: boolean; imagePath?: string; error?: string }> {
    if (!this.genAINew) {
      return { success: false, error: "Servicio de IA no inicializado" };
    }

    try {
      console.log(`[AI] Generando imagen con Nano Banana: ${prompt.substring(0, 50)}...`);
      
      const response = await this.genAINew.models.generateContent({
        model: "imagen-3.0-generate-002",
        contents: prompt,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      const outputDir = path.join(process.cwd(), "generated");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const timestamp = Date.now();
      const imagePath = path.join(outputDir, `image_${timestamp}.png`);

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.mimeType?.startsWith("image/")) {
          const imageData = Buffer.from(part.inlineData.data!, "base64");
          fs.writeFileSync(imagePath, imageData);
          console.log(`[AI] Imagen guardada: ${imagePath}`);
          return { success: true, imagePath };
        }
      }

      return { success: false, error: "No se generó imagen en la respuesta" };
    } catch (error: any) {
      console.error("[AI] Error generando imagen:", error);
      return { success: false, error: error.message || "Error desconocido" };
    }
  }

  async generateVideo(prompt: string, durationSeconds: number = 8): Promise<{ success: boolean; videoPath?: string; error?: string }> {
    if (!this.genAINew) {
      return { success: false, error: "Servicio de IA no inicializado" };
    }

    try {
      console.log(`[AI] Generando video con Veo 3.1: ${prompt.substring(0, 50)}...`);
      
      let operation = await this.genAINew.models.generateVideos({
        model: "veo-2.0-generate-001",
        prompt: prompt,
        config: {
          aspectRatio: "16:9",
          numberOfVideos: 1,
        },
      });

      console.log("[AI] Esperando generación de video...");
      
      const maxWaitMs = 300000;
      const startTime = Date.now();
      
      while (!operation.done && (Date.now() - startTime) < maxWaitMs) {
        await new Promise(r => setTimeout(r, 10000));
        operation = await this.genAINew.operations.getVideosOperation({ operation });
        console.log("[AI] Video en progreso...");
      }

      if (!operation.done) {
        return { success: false, error: "Timeout esperando generación de video" };
      }

      const outputDir = path.join(process.cwd(), "generated");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const timestamp = Date.now();
      const videoPath = path.join(outputDir, `video_${timestamp}.mp4`);

      const generatedVideos = operation.response?.generatedVideos;
      if (generatedVideos && generatedVideos.length > 0) {
        const video = generatedVideos[0];
        if (video.video?.videoBytes) {
          const videoData = Buffer.from(video.video.videoBytes, "base64");
          fs.writeFileSync(videoPath, videoData);
          console.log(`[AI] Video guardado: ${videoPath}`);
          return { success: true, videoPath };
        }
      }

      return { success: false, error: "No se generó video en la respuesta" };
    } catch (error: any) {
      console.error("[AI] Error generando video:", error);
      return { success: false, error: error.message || "Error desconocido" };
    }
  }
}

export const aiService = new AIService();

import { Cron } from "croner";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../../server/db/index.js";
import {
  oauthConnections,
  assistants,
  proactiveTasks,
  users,
  channelConnections,
} from "../../server/db/schema.js";
import { MultiTenantTelegramHandler } from "../channels/telegram/multiTenantHandler.js";
import { MultiTenantWhatsAppHandler } from "../channels/whatsapp/multiTenantHandler.js";
import { aiService } from "../services/ai.js";
import { appleCalendarService } from "../services/calendar.js";
import { emailService } from "../services/email.js";

export class ProactiveWorker {
  private static instance: ProactiveWorker;

  private constructor() {}

  public static getInstance() {
    if (!ProactiveWorker.instance) {
      ProactiveWorker.instance = new ProactiveWorker();
    }
    return ProactiveWorker.instance;
  }

  start() {
    console.log("[Worker] Proactive Worker iniciado");

    // Daily Briefing: Cada mañana a las 8:00 AM
    new Cron("0 8 * * *", () => this.runDailyBriefing());

    // Context Analysis: Cada hora para revisar correos y calendario
    new Cron("0 * * * *", () => this.analyzeAllUsersContext());

    // Triggers personalizados: Cada 15 minutos
    new Cron("*/15 * * * *", () => this.checkCustomTriggers());
  }

  private async runDailyBriefing() {
    console.log("[Worker] Ejecutando Daily Briefing...");
    const tasks = await db
      .select()
      .from(proactiveTasks)
      .where(
        and(eq(proactiveTasks.taskType, "daily_briefing"), eq(proactiveTasks.isEnabled, true)),
      );

    for (const task of tasks) {
      if (!task.assistantId) continue;
      await this.generateAndSendBriefing(task.assistantId);
    }
  }

  private async generateAndSendBriefing(assistantId: string) {
    try {
      // 1. Obtener asistente y usuario
      const [assistant] = await db
        .select()
        .from(assistants)
        .where(eq(assistants.id, assistantId))
        .limit(1);
      if (!assistant || !assistant.userId) return;

      // 2. Obtener contexto de hoy (email y calendario)
      await emailService.initialize(); // TODO: Adaptar para multi-tenancy real
      const emails = await emailService.getRecentEmails(5);

      await appleCalendarService.initialize();
      const events = await appleCalendarService.getTodayEvents();

      // 3. Generar briefing con AI
      const prompt = `
                Genera un resumen matutino para Angel.
                EMAILS: ${JSON.stringify(emails)}
                EVENTOS HOY: ${JSON.stringify(events)}
                PERSONALIDAD: ${assistant.personality}
                Resumen MUY corto, directo y útil.
            `;

      const briefing = await aiService.processMessage(`${assistantId}:worker:briefing`, prompt);

      // 4. Enviar por el canal activo (WhatsApp preferido)
      await this.sendMessageToUser(assistant.userId, assistantId, briefing);

      // 5. Actualizar última ejecución
      await db
        .update(proactiveTasks)
        .set({ lastRunAt: new Date() })
        .where(eq(proactiveTasks.assistantId, assistantId));
    } catch (err) {
      console.error(`[Worker] Error in briefing for ${assistantId}:`, err);
    }
  }

  private async analyzeAllUsersContext() {
    console.log("[Worker] Analizando contexto global de usuarios...");
    // Implementación similar a briefing pero buscando "urgencias" o "relevancia"
  }

  private async checkCustomTriggers() {
    // Lógica para triggers específicos definidos por el usuario
  }

  private async sendMessageToUser(userId: string, assistantId: string, message: string) {
    // Intentar WhatsApp
    const waHandler = MultiTenantWhatsAppHandler.getInstance();
    const waConn = waHandler.getConnection(userId, assistantId);

    if (waConn && waConn.status === "connected") {
      // Aquí necesitaríamos el JID del usuario. Por ahora asumimos que el usuario es el dueño de la sesión.
      // En un sistema real, guardamos el JID del dueño en channel_connections.
      const [conn] = await db
        .select()
        .from(channelConnections)
        .where(
          and(
            eq(channelConnections.userId, userId),
            eq(channelConnections.channelType, "whatsapp"),
          ),
        )
        .limit(1);

      if (conn?.phoneNumber) {
        const jid = conn.phoneNumber.includes("@s.whatsapp.net")
          ? conn.phoneNumber
          : `${conn.phoneNumber}@s.whatsapp.net`;
        await waConn.socket.sendMessage(jid, { text: message });
        return;
      }
    }

    // Si no, intentar Telegram
    const tgHandler = MultiTenantTelegramHandler.getInstance();
    const tgBots = tgHandler.getUserBots(userId);
    const tgBot = tgBots.find((b) => b.status === "connected");

    if (tgBot) {
      // Necesitamos el chatId del usuario en Telegram.
      // Esto suele guardarse en la tabla de conversaciones o perfil de usuario.
      // Por ahora registramos el intento.
      console.log(`[Worker] Enviando vía Telegram a ${userId}: ${message.substring(0, 50)}...`);
    }
  }
}

export const proactiveWorker = ProactiveWorker.getInstance();

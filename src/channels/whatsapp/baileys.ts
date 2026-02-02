import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { db } from "../../../server/db/index.js";
import { channelConnections } from "../../../server/db/schema.js";

export class WhatsAppService {
  private sockets: Map<string, any> = new Map();

  async connect(assistantId: string, userId: string): Promise<{ qr?: string; status: string }> {
    const authPath = path.join(process.cwd(), "auth_info", assistantId);
    if (!fs.existsSync(authPath)) {
      fs.mkdirSync(authPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, console as any),
      },
      printQRInTerminal: false,
    });

    this.sockets.set(assistantId, sock);

    return new Promise((resolve) => {
      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log(`[WhatsApp] QR generado para ${assistantId}`);
          // Aquí guardaríamos el QR en la DB para que el frontend lo lea
          await db
            .update(channelConnections)
            .set({ credentials: { qrDataUrl: qr }, status: "pending" })
            .where(eq(channelConnections.assistantId, assistantId));

          resolve({ qr, status: "pending" });
        }

        if (connection === "close") {
          const shouldReconnect =
            (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log("[WhatsApp] Conexión cerrada. ¿Reconectar?", shouldReconnect);
          if (shouldReconnect) {
            this.connect(assistantId, userId);
          } else {
            this.sockets.delete(assistantId);
            await db
              .update(channelConnections)
              .set({ status: "disconnected", lastConnectedAt: new Date() })
              .where(eq(channelConnections.assistantId, assistantId));
          }
        } else if (connection === "open") {
          console.log("[WhatsApp] Conexión abierta con éxito");
          await db
            .update(channelConnections)
            .set({ status: "connected", lastConnectedAt: new Date() })
            .where(eq(channelConnections.assistantId, assistantId));
          resolve({ status: "connected" });
        }
      });

      sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === "notify") {
          await this.handleIncomingMessage(assistantId, msg);
        }
      });
    });
  }

  private async handleIncomingMessage(assistantId: string, msg: any) {
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption;

    if (!text) return;

    const from = msg.key.remoteJid;
    console.log(`[WhatsApp] Mensaje de ${from}: ${text}`);

    // Aquí llamaríamos al AI Service pasándole el assistantId
    // const response = await aiService.processMessage(assistantId, text, from, 'whatsapp');
    // await this.sendMessage(assistantId, from, response);
  }

  async sendMessage(assistantId: string, to: string, text: string) {
    const sock = this.sockets.get(assistantId);
    if (!sock) throw new Error("WhatsApp service not connected for this assistant");
    await sock.sendMessage(to, { text });
  }

  async sendDocument(
    assistantId: string,
    to: string,
    buffer: Buffer,
    filename: string,
    caption?: string,
  ) {
    const sock = this.sockets.get(assistantId);
    if (!sock) throw new Error("WhatsApp service not connected for this assistant");

    await sock.sendMessage(to, {
      document: buffer,
      mimetype: "application/pdf",
      fileName: filename,
      caption: caption,
    });
  }
}

export const whatsappService = new WhatsAppService();

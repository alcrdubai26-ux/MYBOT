import { GoogleGenerativeAI } from "@google/generative-ai";

class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private conversationHistory: Map<
    string,
    Array<{ role: string; parts: { text: string }[] }>
  > = new Map();

  private systemPrompt = `
Eres un asistente personal inteligente y útil.
Tu nombre es Asistente (el usuario puede cambiarlo).
Respondes de forma concisa pero completa.
Eres proactivo y sugieres cosas útiles cuando es relevante.
Hablas en español por defecto, pero te adaptas al idioma del usuario.
  `.trim();

  initialize(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    console.log("[AI] Gemini inicializado correctamente");
  }

  isInitialized(): boolean {
    return this.model !== null;
  }

  async processMessage(userId: string, message: string): Promise<string> {
    if (!this.model) {
      return "Error: El servicio de IA no está configurado. Añade GEMINI_API_KEY en los Secrets.";
    }

    try {
      if (!this.conversationHistory.has(userId)) {
        this.conversationHistory.set(userId, []);
      }
      const history = this.conversationHistory.get(userId)!;

      const chat = this.model.startChat({
        history: history,
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

      let finalMessage = message;
      if (history.length === 0) {
        finalMessage = `${this.systemPrompt}\n\nUsuario: ${message}`;
      }

      const result = await chat.sendMessage(finalMessage);
      const response = result.response.text();

      history.push({ role: "user", parts: [{ text: message }] });
      history.push({ role: "model", parts: [{ text: response }] });

      if (history.length > 40) {
        history.splice(0, 2);
      }

      return response;
    } catch (error) {
      console.error("[AI] Error procesando mensaje:", error);
      return "Lo siento, ha ocurrido un error procesando tu mensaje. Inténtalo de nuevo.";
    }
  }

  setSystemPrompt(prompt: string) {
    this.systemPrompt = prompt;
  }

  clearHistory(userId: string) {
    this.conversationHistory.delete(userId);
  }
}

export const aiService = new AIService();

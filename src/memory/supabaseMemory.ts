import { GoogleGenerativeAI } from "@google/generative-ai";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { db } from "../../server/db/index.js";
import { memory, learnedPreferences } from "../../server/db/schema.js";

export class SupabaseMemoryManager {
  private assistantId: string;
  private genAI: GoogleGenerativeAI;

  constructor(assistantId: string) {
    this.assistantId = assistantId;
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
  }

  /**
   * Generates a 768-dimension embedding using Google's text-embedding-004.
   * Note: The schema uses 1536 dimensions (intended for OpenAI).
   * We will stick to 768 if using Google, or adjust schema if needed.
   * For now, we'll use Google's default.
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (err) {
      console.error("[Memory] Error generating embedding:", err);
      return new Array(768).fill(0);
    }
  }

  async remember(
    content: string,
    type: "fact" | "preference" | "conversation_summary" | "learned_pattern",
    category?: string,
    importance: number = 5,
  ) {
    const embedding = await this.generateEmbedding(content);

    const [result] = await db
      .insert(memory)
      .values({
        assistantId: this.assistantId,
        memoryType: type,
        category: category,
        content: content,
        importance: importance,
        source: "conversation",
        embedding: embedding, // pgvector column
      })
      .returning();

    console.log(`[Memory] Learned ${type}: ${content.substring(0, 50)}...`);
    return result;
  }

  async recall(query: string, limit: number = 10) {
    const embedding = await this.generateEmbedding(query);
    const vectorStr = `[${embedding.join(",")}]`;

    // Semantic search using Cosine Similarity (<=> in pgvector)
    const results = await db
      .select()
      .from(memory)
      .where(eq(memory.assistantId, this.assistantId))
      .orderBy(sql`${memory.embedding} <=> ${vectorStr}`)
      .limit(limit);

    return results;
  }

  async getRecentContext(limit: number = 20) {
    const results = await db
      .select()
      .from(memory)
      .where(eq(memory.assistantId, this.assistantId))
      .orderBy(desc(memory.lastAccessedAt))
      .limit(limit);

    if (results.length > 0) {
      const ids = results.map((r) => r.id);
      // Update last accessed time for these memories
      void db
        .update(memory)
        .set({ lastAccessedAt: new Date() })
        .where(sql`${memory.id} IN (${ids.map((id) => `'${id}'`).join(",")})`);
    }

    return results;
  }

  async learnPreference(category: string, key: string, value: any) {
    const [existing] = await db
      .select()
      .from(learnedPreferences)
      .where(
        and(
          eq(learnedPreferences.assistantId, this.assistantId),
          eq(learnedPreferences.category, category),
          eq(learnedPreferences.preferenceKey, key),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(learnedPreferences)
        .set({
          preferenceValue: value,
          confidence: sql`LEAST(${learnedPreferences.confidence}::numeric + 0.1, 1.0)`,
          timesConfirmed: sql`${learnedPreferences.timesConfirmed} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(learnedPreferences.id, existing.id));
    } else {
      await db.insert(learnedPreferences).values({
        assistantId: this.assistantId,
        category,
        preferenceKey: key,
        preferenceValue: value,
        confidence: "0.5",
      });
    }
  }

  async getPreferences(category: string) {
    return await db
      .select()
      .from(learnedPreferences)
      .where(
        and(
          eq(learnedPreferences.assistantId, this.assistantId),
          eq(learnedPreferences.category, category),
          gte(learnedPreferences.confidence, "0.5"),
        ),
      )
      .orderBy(desc(learnedPreferences.confidence));
  }
}

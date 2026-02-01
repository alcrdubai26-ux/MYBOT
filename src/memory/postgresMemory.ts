import { db } from "../../server/db/index.js";
import { memory, learnedPreferences } from "../../server/db/schema.js";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export class PostgresMemoryManager {
    private assistantId: string;

    constructor(assistantId: string) {
        this.assistantId = assistantId;
    }

    async remember(params: {
        content: string;
        type: "fact" | "preference" | "conversation_summary" | "learned_pattern";
        category?: string;
        importance?: number;
        source?: string;
    }) {
        const [result] = await db.insert(memory).values({
            assistantId: this.assistantId,
            memoryType: params.type,
            category: params.category,
            content: params.content,
            importance: params.importance || 5,
            source: params.source || "conversation",
        }).returning();
        return result;
    }

    async recall(embedding: number[], limit: number = 10) {
        const vectorStr = `[${embedding.join(",")}]`;

        const results = await db.select()
            .from(memory)
            .where(eq(memory.assistantId, this.assistantId))
            .orderBy(sql`${memory.embedding} <=> ${vectorStr}`)
            .limit(limit);

        return results;
    }

    async getRecentContext(limit: number = 20) {
        const results = await db.select()
            .from(memory)
            .where(eq(memory.assistantId, this.assistantId))
            .orderBy(desc(memory.lastAccessedAt))
            .limit(limit);

        if (results.length > 0) {
            const ids = results.map(r => r.id);
            void db.update(memory)
                .set({ lastAccessedAt: new Date() })
                .where(sql`${memory.id} IN (${ids.join(",")})`);
        }

        return results;
    }

    async learnPreference(category: string, key: string, value: any) {
        const [existing] = await db.select()
            .from(learnedPreferences)
            .where(and(
                eq(learnedPreferences.assistantId, this.assistantId),
                eq(learnedPreferences.category, category),
                eq(learnedPreferences.preferenceKey, key)
            ))
            .limit(1);

        if (existing) {
            await db.update(learnedPreferences)
                .set({
                    preferenceValue: value,
                    confidence: sql`LEAST(${learnedPreferences.confidence} + 0.1, 1.0)`,
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
        return await db.select()
            .from(learnedPreferences)
            .where(and(
                eq(learnedPreferences.assistantId, this.assistantId),
                eq(learnedPreferences.category, category),
                gte(learnedPreferences.confidence, "0.5")
            ))
            .orderBy(desc(learnedPreferences.confidence));
    }
}

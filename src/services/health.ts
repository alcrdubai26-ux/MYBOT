import { eq, and, desc, gte } from "drizzle-orm";
import { db } from "../../server/db/index.js";
import { userHealthData } from "../../server/db/schema.js";

export interface HealthMetric {
  type: string;
  value: number;
  unit: string;
  measuredAt: string | Date;
  metadata?: any;
}

export class HealthService {
  /**
   * Sincroniza múltiples métricas de salud para un usuario
   */
  async syncHealthData(userId: string, metrics: HealthMetric[]) {
    if (metrics.length === 0) return;

    const dataToInsert = metrics.map((m) => ({
      userId,
      metricType: m.type,
      value: m.value,
      unit: m.unit,
      measuredAt: new Date(m.measuredAt),
      metadata: m.metadata || {},
    }));

    await db.insert(userHealthData).values(dataToInsert);
  }

  /**
   * Obtiene el resumen de salud reciente para el contexto de la IA
   */
  async getHealthSummary(userId: string) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentData = await db
      .select()
      .from(userHealthData)
      .where(and(eq(userHealthData.userId, userId), gte(userHealthData.measuredAt, yesterday)))
      .orderBy(desc(userHealthData.measuredAt));

    if (recentData.length === 0) return "No hay datos de salud recientes.";

    // Agrupar por tipo para un resumen legible
    const summary: Record<string, any> = {};
    recentData.forEach((d) => {
      if (!summary[d.metricType]) {
        summary[d.metricType] = { last: d.value, unit: d.unit, count: 0 };
      }
      summary[d.metricType].count++;
    });

    return Object.entries(summary)
      .map(
        ([type, data]) =>
          `${type}: ${data.last}${data.unit} (Promedio de ${data.count} lecturas recientes)`,
      )
      .join("; ");
  }
}

export const healthService = new HealthService();

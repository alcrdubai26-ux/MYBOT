import { eq, and } from "drizzle-orm";
import { db } from "../../server/db/index.js";
import { skills, userSkills } from "../../server/db/schema.js";

export interface SkillDefinition {
  id?: string;
  name: string;
  version: string;
  description: string;
  category: string;
  icon: string;
  authType: "none" | "oauth" | "api_key" | "credentials";
  oauthProvider?: string;
  scopes?: string[];
  envVars?: string[];
  minPlan: "free" | "pro" | "max";
  dependencies?: string[];
  functions: SkillFunction[];
}

export interface SkillFunction {
  name: string;
  description: string;
  parameters: Record<string, any>;
  returns: string;
}

export interface UserSkillStatus extends SkillDefinition {
  enabled: boolean;
  connected: boolean;
  lastUsed?: Date;
}

export class SkillsService {
  /**
   * Obtener todos los skills disponibles
   */
  async getAllSkills(): Promise<SkillDefinition[]> {
    const result = await db.select().from(skills).where(eq(skills.isActive, true));
    return result.map(this.mapSkillRow);
  }

  /**
   * Obtener skills por categoría
   */
  async getSkillsByCategory(category: string): Promise<SkillDefinition[]> {
    const result = await db
      .select()
      .from(skills)
      .where(and(eq(skills.category, category), eq(skills.isActive, true)));
    return result.map(this.mapSkillRow);
  }

  /**
   * Obtener skills habilitados para un usuario
   */
  async getUserEnabledSkills(userId: string): Promise<SkillDefinition[]> {
    const result = await db
      .select({
        skill: skills,
      })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(and(eq(userSkills.userId, userId), eq(userSkills.isEnabled, true)));

    return result.map((r) => this.mapSkillRow(r.skill));
  }

  /**
   * Obtener estado de skills para un usuario (para mostrar en UI)
   */
  async getUserSkillsStatus(userId: string): Promise<UserSkillStatus[]> {
    const allSkills = await db.select().from(skills).where(eq(skills.isActive, true));

    const userSkillsResult = await db
      .select()
      .from(userSkills)
      .where(eq(userSkills.userId, userId));

    const userSkillsMap = new Map(userSkillsResult.map((us) => [us.skillId, us]));

    return allSkills.map((skill) => {
      const userSkill = userSkillsMap.get(skill.id);
      return {
        ...this.mapSkillRow(skill),
        id: skill.id, // Ensure ID is passed for toggle/connect
        enabled: userSkill?.isEnabled ?? false,
        connected: userSkill?.isConnected ?? false,
        lastUsed: userSkill?.lastUsedAt || undefined,
      };
    });
  }

  /**
   * Activar/desactivar un skill para un usuario
   */
  async toggleSkill(userId: string, skillId: string, enabled: boolean): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(userSkills)
      .where(and(eq(userSkills.userId, userId), eq(userSkills.skillId, skillId)));

    if (existing) {
      await db
        .update(userSkills)
        .set({ isEnabled: enabled, updatedAt: new Date() })
        .where(eq(userSkills.id, existing.id));
    } else {
      const [skill] = await db.select().from(skills).where(eq(skills.id, skillId));
      if (!skill) throw new Error(`Skill ${skillId} no encontrado`);

      await db.insert(userSkills).values({
        userId,
        skillId,
        isEnabled: enabled,
        isConnected: skill.authType === "none",
      });
    }

    return true;
  }

  /**
   * Obtener credenciales de un skill para un usuario
   */
  async getSkillCredentials(userId: string, skillName: string) {
    const [skill] = await db.select().from(skills).where(eq(skills.name, skillName));
    if (!skill) return null;

    const [userSkill] = await db
      .select()
      .from(userSkills)
      .where(and(eq(userSkills.userId, userId), eq(userSkills.skillId, skill.id)));

    if (!userSkill || !userSkill.isConnected) return null;

    return {
      accessToken: userSkill.accessToken ? this.decrypt(userSkill.accessToken) : undefined,
      refreshToken: userSkill.refreshToken ? this.decrypt(userSkill.refreshToken) : undefined,
      apiKey: userSkill.apiKey ? this.decrypt(userSkill.apiKey) : undefined,
      credentials: userSkill.credentials ? (userSkill.credentials as any) : undefined,
    };
  }

  private mapSkillRow(row: any): SkillDefinition {
    return {
      name: row.name,
      version: row.version,
      description: row.description,
      category: row.category,
      icon: row.icon,
      authType: row.authType,
      oauthProvider: row.oauthProvider,
      scopes: row.scopes,
      envVars: row.envVars,
      minPlan: row.minPlan,
      dependencies: row.dependencies,
      functions: (row.functions as any) || [],
    };
  }

  private encrypt(text: string): string {
    // Placeholder for actual encryption
    return Buffer.from(text).toString("base64");
  }

  private decrypt(encrypted: string): string {
    return Buffer.from(encrypted, "base64").toString("utf8");
  }
}

export const skillsService = new SkillsService();

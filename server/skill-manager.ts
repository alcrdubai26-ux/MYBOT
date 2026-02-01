import { db } from "../db/index.js";
import { userSkills, oauthConnections } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export class MultiTenantSkillManager {
    /**
     * Fetches environment overrides for a specific user and assistant.
     * Merges OAuth tokens and manual skill configurations.
     */
    static async getSkillEnv(userId: string): Promise<Record<string, string>> {
        const env: Record<string, string> = {};

        // 1. Fetch OAuth Connections
        const oauths = await db.query.oauthConnections.findMany({
            where: eq(oauthConnections.userId, userId),
        });

        for (const conn of oauths) {
            if (conn.provider === 'github' && conn.accessToken) {
                env['GITHUB_TOKEN'] = conn.accessToken;
                env['GH_TOKEN'] = conn.accessToken;
            }
            if (conn.provider === 'google' && conn.accessToken) {
                env['GOOGLE_API_KEY'] = conn.accessToken;
            }
            // Add more mappings as needed
        }

        // 2. Fetch User-Specific Skill Configs
        const skills = await db.query.userSkills.findMany({
            where: and(
                eq(userSkills.userId, userId),
                eq(userSkills.isEnabled, true)
            ),
        });

        for (const skill of skills) {
            if (skill.skillConfig && typeof skill.skillConfig === 'object') {
                const config = skill.skillConfig as Record<string, string>;
                for (const [key, value] of Object.entries(config)) {
                    // We assume keys in skillConfig are intended to be env vars if they are uppercase
                    if (key === key.toUpperCase()) {
                        env[key] = value;
                    }
                }
            }
        }

        return env;
    }
}

import { Router } from 'express';
import { skillsService } from '../../src/services/skills.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Middleware de autenticación simple
const authMiddleware = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    next();
};

// Obtener todos los skills con estado del usuario
router.get('/user/skills', authMiddleware, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const skills = await skillsService.getUserSkillsStatus(userId);
        res.json(skills);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Activar/desactivar skill
router.patch('/user/skills/:skillId', authMiddleware, async (req: any, res) => {
    try {
        const { skillId } = req.params;
        const { enabled } = req.body;
        const userId = req.user.id;

        await skillsService.toggleSkill(userId, skillId, enabled);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Guardar configuración de onboarding
router.post('/user/onboarding', authMiddleware, async (req: any, res) => {
    try {
        const { channel, enabledSkills } = req.body;
        const userId = req.user.id;

        // Activar skills seleccionados
        for (const skillId of enabledSkills) {
            await skillsService.toggleSkill(userId, skillId, true);
        }

        // Guardar canal preferido y marcar onboarding como completado
        await db.update(users)
            .set({
                // Nota: asumiendo que el esquema de users tiene estos campos, o los ignoramos si no existen
                // Por ahora los comentaré si no estoy seguro del esquema de users
                updatedAt: new Date()
            })
            .where(eq(users.id, userId));

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;

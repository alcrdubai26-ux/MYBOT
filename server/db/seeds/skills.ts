import { db } from '../index.js';
import { skills } from '../schema.js';

export const PREDEFINED_SKILLS = [
    // ═══════════════════════════════════════════════════════════
    // CORE (siempre activos, plan free)
    // ═══════════════════════════════════════════════════════════
    {
        name: 'chat',
        version: '1.0.0',
        description: 'Conversación inteligente con IA',
        category: 'core',
        icon: '💬',
        authType: 'none',
        minPlan: 'free',
        functions: [
            { name: 'respond', description: 'Responder al usuario', parameters: { type: 'object', properties: { message: { type: 'string' } } } }
        ]
    },
    {
        name: 'web_search',
        version: '1.0.0',
        description: 'Buscar información en internet',
        category: 'core',
        icon: '🔍',
        authType: 'none',
        minPlan: 'free',
        functions: [
            { name: 'search', description: 'Buscar en la web', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
            { name: 'summarize', description: 'Buscar y resumir resultados', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } }
        ]
    },
    {
        name: 'memory',
        version: '1.0.0',
        description: 'Recordar información entre conversaciones',
        category: 'core',
        icon: '🧠',
        authType: 'none',
        minPlan: 'free',
        functions: [
            { name: 'remember', description: 'Guardar información', parameters: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } } } },
            { name: 'recall', description: 'Recordar información', parameters: { type: 'object', properties: { key: { type: 'string' } } } }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // PRODUCTIVIDAD
    // ═══════════════════════════════════════════════════════════
    {
        name: 'gmail',
        version: '1.0.0',
        description: 'Leer y enviar emails con Gmail',
        category: 'productivity',
        icon: '📧',
        authType: 'oauth',
        oauthProvider: 'google',
        scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
        minPlan: 'pro',
        functions: [
            { name: 'readEmails', description: 'Leer últimos emails', parameters: { type: 'object', properties: { count: { type: 'number' }, query: { type: 'string' } } } },
            { name: 'sendEmail', description: 'Enviar email', parameters: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } }, required: ['to', 'subject', 'body'] } },
            { name: 'searchEmails', description: 'Buscar emails', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } }
        ]
    },
    {
        name: 'calendar_google',
        version: '1.0.0',
        description: 'Gestionar eventos de Google Calendar',
        category: 'productivity',
        icon: '📅',
        authType: 'oauth',
        oauthProvider: 'google',
        scopes: ['https://www.googleapis.com/auth/calendar'],
        minPlan: 'pro',
        functions: [
            { name: 'getEvents', description: 'Obtener eventos', parameters: { type: 'object', properties: { days: { type: 'number' } } } },
            { name: 'createEvent', description: 'Crear evento', parameters: { type: 'object', properties: { title: { type: 'string' }, start: { type: 'string' }, end: { type: 'string' }, description: { type: 'string' } }, required: ['title', 'start'] } },
            { name: 'deleteEvent', description: 'Eliminar evento', parameters: { type: 'object', properties: { eventId: { type: 'string' } }, required: ['eventId'] } }
        ]
    },
    {
        name: 'calendar_apple',
        version: '1.0.0',
        description: 'Gestionar eventos de iCloud Calendar',
        category: 'productivity',
        icon: '📅',
        authType: 'credentials',
        envVars: ['APPLE_CALDAV_USER', 'APPLE_CALDAV_PASS'],
        minPlan: 'pro',
        functions: [
            { name: 'getEvents', description: 'Obtener eventos', parameters: { type: 'object', properties: { days: { type: 'number' } } } },
            { name: 'createEvent', description: 'Crear evento', parameters: { type: 'object', properties: { title: { type: 'string' }, start: { type: 'string' }, end: { type: 'string' } }, required: ['title', 'start'] } }
        ]
    },
    {
        name: 'notion',
        version: '1.0.0',
        description: 'Gestionar páginas y bases de datos de Notion',
        category: 'productivity',
        icon: '📝',
        authType: 'oauth',
        oauthProvider: 'notion',
        minPlan: 'pro',
        functions: [
            { name: 'searchPages', description: 'Buscar páginas', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
            { name: 'createPage', description: 'Crear página', parameters: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, parentId: { type: 'string' } }, required: ['title'] } },
            { name: 'updatePage', description: 'Actualizar página', parameters: { type: 'object', properties: { pageId: { type: 'string' }, content: { type: 'string' } }, required: ['pageId'] } }
        ]
    },
    {
        name: 'todoist',
        version: '1.0.0',
        description: 'Gestionar tareas con Todoist',
        category: 'productivity',
        icon: '✅',
        authType: 'oauth',
        oauthProvider: 'todoist',
        minPlan: 'pro',
        functions: [
            { name: 'getTasks', description: 'Obtener tareas', parameters: { type: 'object', properties: { filter: { type: 'string' } } } },
            { name: 'createTask', description: 'Crear tarea', parameters: { type: 'object', properties: { content: { type: 'string' }, dueDate: { type: 'string' }, priority: { type: 'number' } }, required: ['content'] } },
            { name: 'completeTask', description: 'Completar tarea', parameters: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } }
        ]
    },
    {
        name: 'linear',
        version: '1.0.0',
        description: 'Gestionar issues con Linear',
        category: 'productivity',
        icon: '📊',
        authType: 'oauth',
        oauthProvider: 'linear',
        minPlan: 'pro',
        functions: [
            { name: 'getIssues', description: 'Obtener issues', parameters: { type: 'object', properties: { teamId: { type: 'string' }, status: { type: 'string' } } } },
            { name: 'createIssue', description: 'Crear issue', parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, teamId: { type: 'string' } }, required: ['title', 'teamId'] } }
        ]
    },
    {
        name: 'github',
        version: '1.0.0',
        description: 'Gestionar repositorios de GitHub',
        category: 'productivity',
        icon: '🐙',
        authType: 'oauth',
        oauthProvider: 'github',
        minPlan: 'pro',
        functions: [
            { name: 'getRepos', description: 'Listar repositorios', parameters: { type: 'object', properties: {} } },
            { name: 'getIssues', description: 'Obtener issues', parameters: { type: 'object', properties: { repo: { type: 'string' } }, required: ['repo'] } },
            { name: 'createIssue', description: 'Crear issue', parameters: { type: 'object', properties: { repo: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } }, required: ['repo', 'title'] } }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // CREATIVIDAD
    // ═══════════════════════════════════════════════════════════
    {
        name: 'image_gen',
        version: '1.0.0',
        description: 'Generar imágenes con IA (Imagen 3)',
        category: 'creativity',
        icon: '🎨',
        authType: 'none',
        minPlan: 'pro',
        functions: [
            { name: 'generate', description: 'Generar imagen', parameters: { type: 'object', properties: { prompt: { type: 'string' }, style: { type: 'string' } }, required: ['prompt'] } }
        ]
    },
    {
        name: 'video_gen',
        version: '1.0.0',
        description: 'Generar videos con IA (Veo 3)',
        category: 'creativity',
        icon: '🎬',
        authType: 'none',
        minPlan: 'max',
        functions: [
            { name: 'generate', description: 'Generar video', parameters: { type: 'object', properties: { prompt: { type: 'string' }, duration: { type: 'number' } }, required: ['prompt'] } }
        ]
    },
    {
        name: 'gamma',
        version: '1.0.0',
        description: 'Crear presentaciones profesionales con Gamma',
        category: 'creativity',
        icon: '📊',
        authType: 'api_key',
        envVars: ['GAMMA_API_KEY'],
        minPlan: 'pro',
        functions: [
            { name: 'createPresentation', description: 'Crear presentación', parameters: { type: 'object', properties: { topic: { type: 'string' }, slides: { type: 'number' }, style: { type: 'string' } }, required: ['topic'] } }
        ]
    },
    {
        name: 'elevenlabs',
        version: '1.0.0',
        description: 'Generar audio con voz natural',
        category: 'creativity',
        icon: '🎤',
        authType: 'api_key',
        envVars: ['ELEVENLABS_API_KEY'],
        minPlan: 'pro',
        functions: [
            { name: 'textToSpeech', description: 'Convertir texto a voz', parameters: { type: 'object', properties: { text: { type: 'string' }, voice: { type: 'string' } }, required: ['text'] } }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // REDES SOCIALES
    // ═══════════════════════════════════════════════════════════
    {
        name: 'instagram',
        version: '1.0.0',
        description: 'Publicar y analizar en Instagram',
        category: 'social',
        icon: '📸',
        authType: 'oauth',
        oauthProvider: 'meta',
        scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'],
        minPlan: 'pro',
        functions: [
            { name: 'getInsights', description: 'Obtener estadísticas', parameters: { type: 'object', properties: {} } },
            { name: 'publishPost', description: 'Publicar imagen', parameters: { type: 'object', properties: { imageUrl: { type: 'string' }, caption: { type: 'string' } }, required: ['imageUrl', 'caption'] } },
            { name: 'publishReel', description: 'Publicar reel', parameters: { type: 'object', properties: { videoUrl: { type: 'string' }, caption: { type: 'string' } }, required: ['videoUrl', 'caption'] } }
        ]
    },
    {
        name: 'facebook',
        version: '1.0.0',
        description: 'Publicar y analizar en Facebook',
        category: 'social',
        icon: '👤',
        authType: 'oauth',
        oauthProvider: 'meta',
        scopes: ['pages_manage_posts', 'pages_read_engagement'],
        minPlan: 'pro',
        functions: [
            { name: 'publishPost', description: 'Publicar post', parameters: { type: 'object', properties: { message: { type: 'string' }, imageUrl: { type: 'string' } }, required: ['message'] } },
            { name: 'getPageInsights', description: 'Obtener estadísticas', parameters: { type: 'object', properties: {} } }
        ]
    },
    {
        name: 'tiktok',
        version: '1.0.0',
        description: 'Publicar en TikTok',
        category: 'social',
        icon: '🎵',
        authType: 'oauth',
        oauthProvider: 'tiktok',
        minPlan: 'pro',
        functions: [
            { name: 'publishVideo', description: 'Publicar video', parameters: { type: 'object', properties: { videoUrl: { type: 'string' }, description: { type: 'string' } }, required: ['videoUrl', 'description'] } }
        ]
    },
    {
        name: 'twitter',
        version: '1.0.0',
        description: 'Publicar y buscar en Twitter/X',
        category: 'social',
        icon: '🐦',
        authType: 'oauth',
        oauthProvider: 'twitter',
        minPlan: 'pro',
        functions: [
            { name: 'postTweet', description: 'Publicar tweet', parameters: { type: 'object', properties: { text: { type: 'string' }, imageUrl: { type: 'string' } }, required: ['text'] } },
            { name: 'search', description: 'Buscar tweets', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } }
        ]
    },
    {
        name: 'linkedin',
        version: '1.0.0',
        description: 'Publicar en LinkedIn',
        category: 'social',
        icon: '💼',
        authType: 'oauth',
        oauthProvider: 'linkedin',
        minPlan: 'pro',
        functions: [
            { name: 'publishPost', description: 'Publicar post', parameters: { type: 'object', properties: { text: { type: 'string' }, imageUrl: { type: 'string' } }, required: ['text'] } }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // SMART HOME & MEDIA
    // ═══════════════════════════════════════════════════════════
    {
        name: 'home_assistant',
        version: '1.0.0',
        description: 'Controlar dispositivos con Home Assistant',
        category: 'home',
        icon: '🏠',
        authType: 'api_key',
        envVars: ['HOME_ASSISTANT_URL', 'HOME_ASSISTANT_TOKEN'],
        minPlan: 'max',
        functions: [
            { name: 'getStates', description: 'Obtener estado de dispositivos', parameters: { type: 'object', properties: {} } },
            { name: 'callService', description: 'Ejecutar servicio', parameters: { type: 'object', properties: { domain: { type: 'string' }, service: { type: 'string' }, entityId: { type: 'string' } }, required: ['domain', 'service', 'entityId'] } },
            { name: 'turnOn', description: 'Encender dispositivo', parameters: { type: 'object', properties: { entityId: { type: 'string' } }, required: ['entityId'] } },
            { name: 'turnOff', description: 'Apagar dispositivo', parameters: { type: 'object', properties: { entityId: { type: 'string' } }, required: ['entityId'] } }
        ]
    },
    {
        name: 'spotify',
        version: '1.0.0',
        description: 'Controlar música en Spotify',
        category: 'home',
        icon: '🎧',
        authType: 'oauth',
        oauthProvider: 'spotify',
        scopes: ['user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing'],
        minPlan: 'pro',
        functions: [
            { name: 'play', description: 'Reproducir música', parameters: { type: 'object', properties: { query: { type: 'string' } } } },
            { name: 'pause', description: 'Pausar reproducción', parameters: { type: 'object', properties: {} } },
            { name: 'next', description: 'Siguiente canción', parameters: { type: 'object', properties: {} } },
            { name: 'getCurrentTrack', description: 'Obtener canción actual', parameters: { type: 'object', properties: {} } }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // FINANZAS
    // ═══════════════════════════════════════════════════════════
    {
        name: 'yahoo_finance',
        version: '1.0.0',
        description: 'Consultar precios de acciones y criptomonedas',
        category: 'finance',
        icon: '📈',
        authType: 'none',
        minPlan: 'free',
        functions: [
            { name: 'getQuote', description: 'Obtener precio', parameters: { type: 'object', properties: { symbol: { type: 'string' } }, required: ['symbol'] } },
            { name: 'getHistorical', description: 'Obtener histórico', parameters: { type: 'object', properties: { symbol: { type: 'string' }, period: { type: 'string' } }, required: ['symbol'] } }
        ]
    },
    {
        name: 'ynab',
        version: '1.0.0',
        description: 'Gestionar presupuesto con YNAB',
        category: 'finance',
        icon: '💰',
        authType: 'oauth',
        oauthProvider: 'ynab',
        minPlan: 'pro',
        functions: [
            { name: 'getBudgets', description: 'Obtener presupuestos', parameters: { type: 'object', properties: {} } },
            { name: 'getTransactions', description: 'Obtener transacciones', parameters: { type: 'object', properties: { budgetId: { type: 'string' } }, required: ['budgetId'] } }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // BROWSER & AUTOMATION
    // ═══════════════════════════════════════════════════════════
    {
        name: 'browser',
        version: '1.0.0',
        description: 'Navegar y automatizar acciones en el navegador',
        category: 'automation',
        icon: '🌐',
        authType: 'none',
        minPlan: 'max',
        functions: [
            { name: 'navigate', description: 'Navegar a URL', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
            { name: 'screenshot', description: 'Capturar pantalla', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
            { name: 'scrape', description: 'Extraer contenido', parameters: { type: 'object', properties: { url: { type: 'string' }, selector: { type: 'string' } }, required: ['url'] } }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // ESPECIALIZADO
    // ═══════════════════════════════════════════════════════════
    {
        name: 'obrasmart',
        version: '1.0.0',
        description: 'Generar presupuestos de obra con BertIA',
        category: 'specialized',
        icon: '🏗️',
        authType: 'credentials',
        envVars: ['OBRASMART_URL', 'OBRASMART_USER', 'OBRASMART_PASS'],
        minPlan: 'pro',
        functions: [
            { name: 'generateBudget', description: 'Generar presupuesto', parameters: { type: 'object', properties: { description: { type: 'string' }, margin: { type: 'number' }, quality: { type: 'string' } }, required: ['description'] } },
            { name: 'downloadPdf', description: 'Descargar PDF', parameters: { type: 'object', properties: { budgetId: { type: 'string' } }, required: ['budgetId'] } }
        ]
    }
];

export async function seedSkills() {
    for (const skill of PREDEFINED_SKILLS) {
        await db.insert(skills).values(skill as any).onConflictDoUpdate({
            target: skills.name,
            set: {
                version: skill.version,
                description: skill.description,
                category: skill.category,
                icon: (skill as any).icon,
                authType: (skill as any).authType,
                minPlan: (skill as any).minPlan,
                functions: skill.functions,
                updatedAt: new Date()
            }
        });
    }
    console.log(`✅ ${PREDEFINED_SKILLS.length} skills insertados/actualizados`);
}

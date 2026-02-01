export type Language = "es" | "en";

export const translations = {
  es: {
    brand: {
      title: "OPENCLAW",
      subtitle: "Panel de Control",
    },
    health: {
      label: "Estado",
      ok: "OK",
      offline: "Desconectado",
    },
    nav: {
      groups: {
        chat: "Chat",
        control: "Control",
        agent: "Agente",
        settings: "Ajustes",
        resources: "Recursos",
      } as Record<string, string>,
      expand: "Expandir barra lateral",
      collapse: "Contraer barra lateral",
      docs: "Documentación",
    },
    tabs: {
      chat: {
        title: "Chat",
        subtitle: "Sesión de chat directo con el gateway para intervenciones rápidas.",
      },
      overview: {
        title: "Resumen",
        subtitle: "Estado del gateway, puntos de entrada y lectura rápida de salud.",
      },
      channels: {
        title: "Canales",
        subtitle: "Gestionar canales y configuraciones.",
      },
      instances: {
        title: "Instancias",
        subtitle: "Señales de presencia de clientes y nodos conectados.",
      },
      sessions: {
        title: "Sesiones",
        subtitle: "Inspeccionar sesiones activas y ajustar valores por defecto.",
      },
      cron: {
        title: "Tareas Programadas",
        subtitle: "Programar despertares y ejecuciones recurrentes del agente.",
      },
      skills: {
        title: "Habilidades",
        subtitle: "Gestionar disponibilidad de habilidades e inyección de claves API.",
      },
      nodes: {
        title: "Nodos",
        subtitle: "Dispositivos emparejados, capacidades y exposición de comandos.",
      },
      config: {
        title: "Configuración",
        subtitle: "Editar ~/.openclaw/openclaw.json de forma segura.",
      },
      debug: {
        title: "Depuración",
        subtitle: "Instantáneas del gateway, eventos y llamadas RPC manuales.",
      },
      logs: {
        title: "Registros",
        subtitle: "Seguimiento en vivo de los registros del gateway.",
      },
    },
    chat: {
      placeholder: "Conectar al gateway para empezar a chatear...",
      disconnected: "Desconectado del gateway.",
      newSession: "Nueva sesión",
      send: "Enviar",
    },
    language: {
      label: "Idioma",
      es: "Español",
      en: "English",
    },
  },
  en: {
    brand: {
      title: "OPENCLAW",
      subtitle: "Gateway Dashboard",
    },
    health: {
      label: "Health",
      ok: "OK",
      offline: "Offline",
    },
    nav: {
      groups: {
        chat: "Chat",
        control: "Control",
        agent: "Agent",
        settings: "Settings",
        resources: "Resources",
      } as Record<string, string>,
      expand: "Expand sidebar",
      collapse: "Collapse sidebar",
      docs: "Docs",
    },
    tabs: {
      chat: {
        title: "Chat",
        subtitle: "Direct gateway chat session for quick interventions.",
      },
      overview: {
        title: "Overview",
        subtitle: "Gateway status, entry points, and a fast health read.",
      },
      channels: {
        title: "Channels",
        subtitle: "Manage channels and settings.",
      },
      instances: {
        title: "Instances",
        subtitle: "Presence beacons from connected clients and nodes.",
      },
      sessions: {
        title: "Sessions",
        subtitle: "Inspect active sessions and adjust per-session defaults.",
      },
      cron: {
        title: "Cron Jobs",
        subtitle: "Schedule wakeups and recurring agent runs.",
      },
      skills: {
        title: "Skills",
        subtitle: "Manage skill availability and API key injection.",
      },
      nodes: {
        title: "Nodes",
        subtitle: "Paired devices, capabilities, and command exposure.",
      },
      config: {
        title: "Config",
        subtitle: "Edit ~/.openclaw/openclaw.json safely.",
      },
      debug: {
        title: "Debug",
        subtitle: "Gateway snapshots, events, and manual RPC calls.",
      },
      logs: {
        title: "Logs",
        subtitle: "Live tail of the gateway file logs.",
      },
    },
    chat: {
      placeholder: "Connect to the gateway to start chatting...",
      disconnected: "Disconnected from gateway.",
      newSession: "New session",
      send: "Send",
    },
    language: {
      label: "Language",
      es: "Español",
      en: "English",
    },
  },
} as const;

export type Translations = typeof translations.es;

let currentLanguage: Language = "es";

export function setLanguage(lang: Language) {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(): Translations {
  return translations[currentLanguage];
}

export function initLanguage(lang: Language) {
  currentLanguage = lang;
}

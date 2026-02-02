# OpenClaw

## Overview
OpenClaw is a WhatsApp gateway CLI (Baileys web) with Pi RPC agent. This is a multi-component application featuring:
- A Lit-based control UI dashboard with i18n support (Spanish/English)
- Backend server with Express
- PostgreSQL database with Drizzle ORM
- Integration channels for WhatsApp, Telegram, Discord, Slack

## Internationalization (i18n)
The UI supports Spanish and English. Default language is Spanish.
- Translation file: `ui/src/ui/i18n.ts`
- Language toggle in the header (ES/EN buttons)
- Settings stored in localStorage

## AMUN - Asistente Personal con IA
AMUN es el asistente de IA configurado con personalidad específica para Angel/ObraSmart Pro.

### Características
- **Personalidad**: Español de España, directo, sin rodeos, expresiones naturales
- **Memoria persistente**: Guarda conversaciones y datos en PostgreSQL
- **Canales**: Telegram (funcionando), WhatsApp (en desarrollo)
- **IA**: Gemini 2.0 Flash

### Archivos clave
- Servicio IA: `src/services/ai.ts` - Personalidad AMUN + memoria
- Bot Telegram: `src/telegram/simple-bot.ts`
- WhatsApp Handler: `src/channels/whatsapp/multiTenantHandler.ts`
- Backend API: `server/` - Express en puerto 3000

### Tablas de memoria
- `assistants` - Configuración del asistente AMUN
- `memory` - Hechos y preferencias del usuario
- `conversations` - Historial de conversaciones
- `messages` - Mensajes individuales
- `user_tasks` - Tareas pendientes
- `user_projects` - Proyectos activos

### Required Secret
- `GEMINI_API_KEY` - Get from https://aistudio.google.com/apikey

### Conectar Telegram
```bash
curl -X POST http://localhost:3000/api/channels/telegram/start \
  -H "Content-Type: application/json" \
  -d '{"token": "TU_TOKEN_DE_BOTFATHER"}'
```

## Project Structure
```
/
├── ui/                 # Vite + Lit frontend control panel
├── server/             # Express backend API
│   ├── db/             # Database schema and connection (Drizzle ORM)
│   ├── auth.ts         # Authentication setup
│   └── routes.ts       # API routes
├── src/                # Core application source
│   ├── channels/       # WhatsApp, Telegram handlers
│   └── infra/          # Infrastructure utilities
├── extensions/         # Various integration extensions
├── packages/           # Workspace sub-packages
└── scripts/            # Build and utility scripts
```

## Tech Stack
- **Runtime**: Node.js 22+
- **Package Manager**: pnpm 10.23.0
- **Frontend**: Vite 7 + Lit 3
- **Backend**: Express 5
- **Database**: PostgreSQL with Drizzle ORM
- **Language**: TypeScript 5

## Development
The UI development server runs on port 5000:
```bash
cd ui && pnpm run dev
```

## Database
The project uses PostgreSQL with the pgvector extension for embeddings:
- Schema defined in `server/db/schema.ts`
- Drizzle config at `drizzle.config.ts`
- Run migrations with `pnpm drizzle-kit push`

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)

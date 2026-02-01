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

## WhatsApp + Gemini AI Integration
The system includes a WhatsApp bot that responds with Google Gemini AI:
- AI Service: `src/services/ai.ts` - Handles Gemini conversations
- WhatsApp Handler: `src/channels/whatsapp/multiTenantHandler.ts`
- Backend API: `server/` - Express server on port 3000
- Frontend proxies `/api` calls to backend

### Required Secret
- `GEMINI_API_KEY` - Get from https://aistudio.google.com/apikey

### Message Flow
1. User sends WhatsApp message
2. Bot receives via Baileys (multi-tenant handler)
3. Message processed by Gemini AI
4. Response sent back to WhatsApp

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

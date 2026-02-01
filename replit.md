# OpenClaw

## Overview
OpenClaw is a WhatsApp gateway CLI (Baileys web) with Pi RPC agent. This is a multi-component application featuring:
- A Lit-based control UI dashboard
- Backend server with Express
- PostgreSQL database with Drizzle ORM
- Integration channels for WhatsApp, Telegram, Discord, Slack

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

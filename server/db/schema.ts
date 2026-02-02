import { pgTable, text, serial, integer, timestamp, boolean, jsonb, decimal, uuid, vector } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Usuarios
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  plan: text("plan", { enum: ["free", "pro", "max"] }).default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Asistentes (cada usuario puede tener varios)
export const assistants = pgTable("assistants", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Asistente"),
  personality: text("personality").default("Eres un asistente personal útil y eficiente."),
  systemPrompt: text("system_prompt"),
  defaultLlm: text("default_llm", { enum: ["claude", "gemini", "gpt4", "deepseek"] }).default("gemini"),
  language: text("language").default("es"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conexiones de canales (WhatsApp, Telegram, etc.)
export const channelConnections = pgTable("channel_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  assistantId: uuid("assistant_id").references(() => assistants.id, { onDelete: "cascade" }),
  channelType: text("channel_type", { enum: ["whatsapp", "telegram", "discord", "slack"] }).notNull(),
  credentials: jsonb("credentials"), // Encriptado: session data, tokens, etc.
  phoneNumber: text("phone_number"), // Para WhatsApp
  botToken: text("bot_token"), // Para Telegram
  status: text("status", { enum: ["connected", "disconnected", "pending"] }).default("disconnected"),
  lastConnectedAt: timestamp("last_connected_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conexiones OAuth (Google, Microsoft, Notion, etc.)
export const oauthConnections = pgTable("oauth_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: ["google", "microsoft", "notion", "github", "slack"] }).notNull(),
  accessToken: text("access_token").notNull(), // Encriptado
  refreshToken: text("refresh_token"), // Encriptado
  tokenExpiresAt: timestamp("token_expires_at"),
  scopes: text("scopes").array(), // Permisos concedidos
  accountEmail: text("account_email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Memoria persistente del asistente
export const memory = pgTable("memory", {
  id: uuid("id").primaryKey().defaultRandom(),
  assistantId: uuid("assistant_id").references(() => assistants.id, { onDelete: "cascade" }),
  memoryType: text("memory_type", { enum: ["fact", "preference", "conversation_summary", "learned_pattern"] }).notNull(),
  category: text("category"), // 'personal', 'work', 'travel', 'food', etc.
  content: text("content").notNull(),
  importance: integer("importance").default(5),
  source: text("source"), // 'user_told', 'inferred_from_email', 'inferred_from_calendar', etc.
  embedding: vector("embedding", { dimensions: 1536 }), // Para búsqueda semántica
  expiresAt: timestamp("expires_at"), // Algunas memorias pueden expirar
  createdAt: timestamp("created_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
});

// Conversaciones completas
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  assistantId: uuid("assistant_id").references(() => assistants.id, { onDelete: "cascade" }),
  channelType: text("channel_type").notNull(),
  channelChatId: text("channel_chat_id"), // ID del chat en WhatsApp/Telegram
  startedAt: timestamp("started_at").defaultNow(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  messageCount: integer("message_count").default(0),
  summary: text("summary"), // Resumen generado periódicamente
});

// Mensajes individuales
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  mediaUrls: text("media_urls").array(), // Fotos, audios, videos adjuntos
  toolCalls: jsonb("tool_calls"), // Si el asistente llamó a herramientas
  llmUsed: text("llm_used"), // Qué modelo se usó para esta respuesta
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Skills habilitadas por usuario
export const userSkills = pgTable("user_skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  skillName: text("skill_name").notNull(),
  skillConfig: jsonb("skill_config"), // Configuración específica del skill
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Preferencias aprendidas automáticamente
export const learnedPreferences = pgTable("learned_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  assistantId: uuid("assistant_id").references(() => assistants.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // 'hotels', 'flights', 'restaurants', 'work_hours', etc.
  preferenceKey: text("preference_key").notNull(),
  preferenceValue: jsonb("preference_value").notNull(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }).default("0.5"), // 0.0 a 1.0
  timesConfirmed: integer("times_confirmed").default(0),
  timesRejected: integer("times_rejected").default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reglas de seguridad
export const securityRules = pgTable("security_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  ruleType: text("rule_type", { enum: ["blocked_domain", "blocked_action", "require_confirmation"] }).notNull(),
  ruleValue: text("rule_value").notNull(), // Dominio, acción, etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tareas proactivas programadas
export const proactiveTasks = pgTable("proactive_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  assistantId: uuid("assistant_id").references(() => assistants.id, { onDelete: "cascade" }),
  taskType: text("task_type").notNull(), // 'daily_briefing', 'email_digest', 'calendar_reminder', etc.
  schedule: text("schedule"), // Cron expression o 'on_trigger'
  triggerConditions: jsonb("trigger_conditions"), // Condiciones para disparar
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tareas y pendientes del usuario
export const userTasks = pgTable("user_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  assistantId: uuid("assistant_id").references(() => assistants.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  status: text("status", { enum: ["pending", "in_progress", "completed", "cancelled"] }).default("pending"),
  priority: integer("priority").default(5), // 1-10
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Proyectos del usuario
export const userProjects = pgTable("user_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  assistantId: uuid("assistant_id").references(() => assistants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["active", "paused", "completed", "archived"] }).default("active"),
  notes: jsonb("notes"), // Array de actualizaciones
  startDate: timestamp("start_date"),
  targetDate: timestamp("target_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relaciones
export const usersRelations = relations(users, ({ many }) => ({
  assistants: many(assistants),
  channelConnections: many(channelConnections),
  oauthConnections: many(oauthConnections),
  userSkills: many(userSkills),
  securityRules: many(securityRules),
}));

export const assistantsRelations = relations(assistants, ({ one, many }) => ({
  user: one(users, { fields: [assistants.userId], references: [users.id] }),
  channelConnections: many(channelConnections),
  memory: many(memory),
  conversations: many(conversations),
  learnedPreferences: many(learnedPreferences),
  proactiveTasks: many(proactiveTasks),
}));

// Schemas Zod
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const insertAssistantSchema = createInsertSchema(assistants);
export const selectAssistantSchema = createSelectSchema(assistants);
export type Assistant = typeof assistants.$inferSelect;
export type InsertAssistant = typeof assistants.$inferInsert;

export const insertMemorySchema = createInsertSchema(memory);
export const selectMemorySchema = createSelectSchema(memory);
export type Memory = typeof memory.$inferSelect;
export type InsertMemory = typeof memory.$inferInsert;

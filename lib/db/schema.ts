import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export const workflows = pgTable("workflows", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", { enum: ["active", "draft", "archived"] }).notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  type: text("type", { enum: ["one-time", "recurring"] }).notNull().default("one-time"),
  status: text("status", { enum: ["active", "paused", "completed"] }).notNull().default("active"),
  scheduledFor: text("scheduled_for"),
  frequency: text("frequency"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  type: text("type", { enum: ["trigger", "action"] }).notNull(),
  directory: text("directory"),
  port: integer("port"),
  pid: integer("pid"),
  status: text("status", { enum: ["stopped", "running", "crashed"] }).notNull().default("stopped"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;

export const serviceEndpoints = pgTable("service_endpoints", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  method: text("method", { enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] }).notNull(),
  path: text("path").notNull(),
  description: text("description").notNull().default(""),
  inputSchema: jsonb("input_schema").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ServiceEndpoint = typeof serviceEndpoints.$inferSelect;
export type NewServiceEndpoint = typeof serviceEndpoints.$inferInsert;

export const serviceRequiredSecrets = pgTable("service_required_secrets", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  secretKey: text("secret_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ServiceRequiredSecret = typeof serviceRequiredSecrets.$inferSelect;
export type NewServiceRequiredSecret = typeof serviceRequiredSecrets.$inferInsert;

export const aiChats = pgTable(
  "ai_chats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    status: text("status", {
      enum: ["idle", "pending", "processing", "completed", "failed"],
    })
      .notNull()
      .default("idle"),
    error: text("error"),
    model: text("model"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_chats_workspace_id_idx").on(table.workspaceId),
    index("ai_chats_user_id_idx").on(table.userId),
    index("ai_chats_updated_at_idx").on(table.updatedAt),
  ]
);

export type AiChat = typeof aiChats.$inferSelect;
export type NewAiChat = typeof aiChats.$inferInsert;

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => aiChats.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    status: text("status", {
      enum: ["pending", "streaming", "complete", "error"],
    })
      .notNull()
      .default("complete"),
    content: text("content").notNull().default(""),
    toolCalls: jsonb("tool_calls").notNull().default(sql`'[]'::jsonb`),
    toolResults: jsonb("tool_results").notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_messages_chat_id_idx").on(table.chatId),
    index("ai_messages_chat_id_created_at_idx").on(table.chatId, table.createdAt),
  ]
);

export type AiMessage = typeof aiMessages.$inferSelect;
export type NewAiMessage = typeof aiMessages.$inferInsert;

export const opencodeSessions = pgTable("opencode_sessions", {
  sessionId: text("session_id").primaryKey(),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OpenCodeSessionRow = typeof opencodeSessions.$inferSelect;
export type NewOpenCodeSessionRow = typeof opencodeSessions.$inferInsert;

export const secrets = pgTable(
  "secrets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    valueEncrypted: text("value_encrypted").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("secrets_workspace_user_key_idx").on(table.workspaceId, table.userId, table.key),
    index("secrets_workspace_id_idx").on(table.workspaceId),
    index("secrets_user_id_idx").on(table.userId),
  ]
);

export type SecretRow = typeof secrets.$inferSelect;
export type NewSecretRow = typeof secrets.$inferInsert;

export const workflowActionServices = pgTable(
  "workflow_action_services",
  {
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    actionServiceId: uuid("action_service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (table) => [
    {
      pk: { columns: [table.workflowId, table.actionServiceId] },
    },
  ]
);

export type WorkflowActionService = typeof workflowActionServices.$inferSelect;
export type NewWorkflowActionService = typeof workflowActionServices.$inferInsert;

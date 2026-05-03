import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";

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
  description: text("description").notNull().default(""),
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
  status: text("status", { enum: ["active", "archived"] })
    .notNull()
    .default("active"),
  detailedSteps: text("detailed_steps").notNull().default(""),
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
  workflowId: uuid("workflow_id").references(() => workflows.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  type: text("type", { enum: ["one-time", "recurring"] })
    .notNull()
    .default("one-time"),
  status: text("status", { enum: ["active", "paused", "completed"] })
    .notNull()
    .default("active"),
  // One-time scheduling
  scheduledAt: timestamp("scheduled_at"),
  // Recurring scheduling
  intervalType: text("interval_type", {
    enum: ["minutes", "hours", "daily", "weekly", "monthly"],
  }),
  intervalValue: integer("interval_value"),
  dayOfWeek: integer("day_of_week"),
  dayOfMonth: integer("day_of_month"),
  timeOfDay: text("time_of_day"),
  timezone: text("timezone").default("UTC"),
  // Execution tracking
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
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
  workflowId: uuid("workflow_id").references(() => workflows.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  type: text("type", { enum: ["trigger", "action"] }).notNull(),
  directory: text("directory"),
  port: integer("port"),
  pid: integer("pid"),
  status: text("status", {
    enum: ["stopped", "running", "crashed", "deploying"],
  })
    .notNull()
    .default("stopped"),
  spawnFailCount: integer("spawn_fail_count").notNull().default(0),
  qaSpawnCount: integer("qa_spawn_count").notNull().default(0),
  hubPieceId: text("hub_piece_id"),
  hubUpdatedAt: timestamp("hub_updated_at"),
  updateSource: text("update_source").default("user"),
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
  method: text("method", {
    enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  }).notNull(),
  path: text("path").notNull(),
  description: text("description").notNull().default(""),
  inputSchema: jsonb("input_schema")
    .$type<Record<string, unknown>>()
    .default({}),
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
export type NewServiceRequiredSecret =
  typeof serviceRequiredSecrets.$inferInsert;

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
      enum: ["idle", "pending", "processing", "completed", "failed", "stopped"],
    })
      .notNull()
      .default("idle"),
    error: text("error"),
    stopped: boolean("stopped").notNull().default(false),
    model: text("model"),
    agentType: text("agent_type").notNull().default("orchestrator"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_chats_workspace_id_idx").on(table.workspaceId),
    index("ai_chats_user_id_idx").on(table.userId),
    index("ai_chats_updated_at_idx").on(table.updatedAt),
  ],
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
      enum: ["pending", "streaming", "complete", "error", "compacted"],
    })
      .notNull()
      .default("complete"),
    content: text("content").notNull().default(""),
    reasoning: text("reasoning"),
    toolCalls: jsonb("tool_calls")
      .notNull()
      .default(sql`'[]'::jsonb`),
    toolResults: jsonb("tool_results")
      .notNull()
      .default(sql`'[]'::jsonb`),
    isCompacted: boolean("is_compacted").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_messages_chat_id_idx").on(table.chatId),
    index("ai_messages_chat_id_created_at_idx").on(
      table.chatId,
      table.createdAt,
    ),
    index("ai_messages_chat_compacted_idx").on(table.chatId, table.isCompacted),
  ],
);

export type AiMessage = typeof aiMessages.$inferSelect;
export type NewAiMessage = typeof aiMessages.$inferInsert;

export const opencodeSessions = pgTable("opencode_sessions", {
  sessionId: text("session_id").primaryKey(),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  status: text("status").default("active").notNull(),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at"),
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
    uniqueIndex("secrets_workspace_user_key_idx").on(
      table.workspaceId,
      table.userId,
      table.key,
    ),
    index("secrets_workspace_id_idx").on(table.workspaceId),
    index("secrets_user_id_idx").on(table.userId),
  ],
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
  ],
);

export type WorkflowActionService = typeof workflowActionServices.$inferSelect;
export type NewWorkflowActionService =
  typeof workflowActionServices.$inferInsert;

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recordType: text("record_type").notNull(),
    operation: text("operation", {
      enum: ["INSERT", "UPDATE", "DELETE"],
    }).notNull(),
    recordId: text("record_id"),
    workspaceId: uuid("workspace_id").notNull(),
    oldData: jsonb("old_data"),
    newData: jsonb("new_data"),
    processedByBrain: boolean("processed_by_brain").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("activity_log_processed_by_brain_idx").on(table.processedByBrain),
  ],
);

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;

// Brain table - stores summarized facts/episodes with vector embeddings
export const brain = pgTable(
  "brain",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["fact", "episode"] })
      .notNull()
      .default("fact"),
    category: text("category", {
      enum: ["pieces", "workflows", "runs", "credentials", "general"],
    })
      .notNull()
      .default("general"),
    summary: text("summary").notNull(),
    // Soft link back to source
    recordType: text("record_type"),
    recordId: text("record_id"),
    // Vector embedding for semantic search
    embedding: vector("embedding", { dimensions: 1536 }),
    tags: text("tags").array(),
    // Confidence strengthens with reinforcement
    confidence: real("confidence").notNull().default(1.0),
    reinforcementCount: integer("reinforcement_count").notNull().default(0),
    isReenforced: boolean("is_reenforced").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("brain_workspace_id_idx").on(table.workspaceId),
    index("brain_category_idx").on(table.category),
    index("brain_confidence_idx").on(table.confidence),
  ],
);

export type Brain = typeof brain.$inferSelect;
export type NewBrain = typeof brain.$inferInsert;

// Brain settings - user-configurable frequencies for brain runs
export const brainSettings = pgTable(
  "brain_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    // Ingestion settings
    ingestionEnabled: boolean("ingestion_enabled").notNull().default(true),
    ingestionIntervalMinutes: integer("ingestion_interval_minutes")
      .notNull()
      .default(60),
    // Reinforcement settings
    reinforcementEnabled: boolean("reinforcement_enabled")
      .notNull()
      .default(true),
    reinforcementIntervalHours: integer("reinforcement_interval_hours")
      .notNull()
      .default(24),
    reinforcementBatchSize: integer("reinforcement_batch_size")
      .notNull()
      .default(10),
    lastIngestionRun: timestamp("last_ingestion_run"),
    lastReinforcementRun: timestamp("last_reinforcement_run"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("brain_settings_workspace_id_idx").on(table.workspaceId),
  ],
);

export type BrainSettings = typeof brainSettings.$inferSelect;
export type NewBrainSettings = typeof brainSettings.$inferInsert;

export const workspaceSettings = pgTable("workspace_settings", {
  workspaceId: uuid("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  defaultModel: text("default_model")
    .notNull()
    .default("deepseek/deepseek-v3.2"),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type WorkspaceSettings = typeof workspaceSettings.$inferSelect;
export type NewWorkspaceSettings = typeof workspaceSettings.$inferInsert;

export const workflowExecutions = pgTable("workflow_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  chatId: uuid("chat_id").references(() => aiChats.id, {
    onDelete: "set null",
  }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  triggerType: text("trigger_type", {
    enum: ["internal_chat", "task"],
  }).notNull(),
  status: text("status", {
    enum: ["pending", "running", "completed", "failed", "cancelled"],
  })
    .notNull()
    .default("pending"),
  result: text("result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type NewWorkflowExecution = typeof workflowExecutions.$inferInsert;

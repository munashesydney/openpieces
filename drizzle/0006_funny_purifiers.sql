ALTER TABLE "workspace_settings" ADD COLUMN "daily_chat_limit" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "chat_limit_reset_at" timestamp;
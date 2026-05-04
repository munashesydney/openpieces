ALTER TABLE "workspaces" ADD COLUMN "agent_name" text DEFAULT 'Assistant' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "user_nickname" text DEFAULT 'User' NOT NULL;
CREATE TABLE "secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value_encrypted" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- ALTER TABLE "opencode_sessions" RENAME COLUMN "directory" TO "service_id";--> statement-breakpoint
-- ALTER TABLE "services" ADD COLUMN "directory" text;--> statement-breakpoint
-- ALTER TABLE "services" ADD COLUMN "port" integer;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "secrets_workspace_user_key_idx" ON "secrets" USING btree ("workspace_id","user_id","key");--> statement-breakpoint
CREATE INDEX "secrets_workspace_id_idx" ON "secrets" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "secrets_user_id_idx" ON "secrets" USING btree ("user_id");--> statement-breakpoint
-- ALTER TABLE "opencode_sessions" ADD CONSTRAINT "opencode_sessions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
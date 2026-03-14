CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Drop NOT NULL on tasks.workflow_id FIRST so we can safely null out bad values
ALTER TABLE "tasks" ALTER COLUMN "workflow_id" DROP NOT NULL;--> statement-breakpoint
-- Clear any non-UUID text values before altering column type
UPDATE "services" SET "workflow_id" = NULL WHERE "workflow_id" IS NOT NULL AND "workflow_id" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';--> statement-breakpoint
UPDATE "tasks" SET "workflow_id" = NULL WHERE "workflow_id" IS NOT NULL AND "workflow_id" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "workflow_id" SET DATA TYPE uuid USING "workflow_id"::uuid;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "workflow_id" SET DATA TYPE uuid USING "workflow_id"::uuid;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE set null ON UPDATE no action;
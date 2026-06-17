CREATE TABLE "event_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"event_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD COLUMN "event_payload" jsonb;--> statement-breakpoint
ALTER TABLE "event_subscriptions" ADD CONSTRAINT "event_subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_subscriptions" ADD CONSTRAINT "event_subscriptions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_subscriptions" ADD CONSTRAINT "event_subscriptions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_sub_workflow_event_idx" ON "event_subscriptions" USING btree ("workflow_id","event_id");--> statement-breakpoint
CREATE INDEX "event_sub_event_idx" ON "event_subscriptions" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_sub_workflow_idx" ON "event_subscriptions" USING btree ("workflow_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_workspace_name_idx" ON "events" USING btree ("workspace_id","event_name");--> statement-breakpoint
CREATE INDEX "events_workspace_id_idx" ON "events" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
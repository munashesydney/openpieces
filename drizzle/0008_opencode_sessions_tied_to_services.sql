ALTER TABLE "services" ADD COLUMN "directory" text;--> statement-breakpoint
DROP TABLE IF EXISTS "opencode_sessions";--> statement-breakpoint
CREATE TABLE "opencode_sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"service_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "opencode_sessions" ADD CONSTRAINT "opencode_sessions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;

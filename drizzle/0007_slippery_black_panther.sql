CREATE TABLE "opencode_sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"directory" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "ai_messages" ADD COLUMN "is_compacted" boolean NOT NULL DEFAULT false;--> statement-breakpoint
CREATE INDEX "ai_messages_chat_compacted_idx" ON "ai_messages" USING btree ("chat_id","is_compacted");

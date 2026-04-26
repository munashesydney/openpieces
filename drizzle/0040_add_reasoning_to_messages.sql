ALTER TABLE "ai_messages" ADD COLUMN "reasoning" text;--> statement-breakpoint
CREATE INDEX "ai_messages_chat_reasoning_idx" ON "ai_messages" USING btree ("chat_id") WHERE "reasoning" IS NOT NULL;

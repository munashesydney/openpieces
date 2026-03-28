-- Add stopped column to ai_chats for cancellation signaling
ALTER TABLE ai_chats ADD COLUMN stopped boolean NOT NULL DEFAULT false;

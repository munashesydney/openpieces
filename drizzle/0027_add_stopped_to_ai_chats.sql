-- Add 'stopped' status to ai_chats status enum
ALTER TYPE ai_chat_status ADD VALUE IF NOT EXISTS 'stopped';

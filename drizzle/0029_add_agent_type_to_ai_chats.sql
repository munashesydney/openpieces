-- Add agent_type column to ai_chats for tracking agent type
ALTER TABLE ai_chats ADD COLUMN agent_type text NOT NULL DEFAULT 'orchestrator';
-- Add status and last_message tracking to opencode_sessions
ALTER TABLE opencode_sessions ADD COLUMN status text DEFAULT 'active' NOT NULL;
ALTER TABLE opencode_sessions ADD COLUMN last_message text;
ALTER TABLE opencode_sessions ADD COLUMN last_message_at timestamp;

-- Set default status for existing rows
UPDATE opencode_sessions SET status = 'active' WHERE status IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN opencode_sessions.status IS 'Session status: active, completed, failed';
COMMENT ON COLUMN opencode_sessions.last_message IS 'Most recent message content received from OpenCode';
COMMENT ON COLUMN opencode_sessions.last_message_at IS 'Timestamp of the most recent message';
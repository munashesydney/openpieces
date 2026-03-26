-- Change brain.record_id from uuid to text
-- The record_id stores uuid for services/tasks/endpoints but text (e.g., ses_xxx) for opencode_sessions
ALTER TABLE brain ALTER COLUMN record_id TYPE text;

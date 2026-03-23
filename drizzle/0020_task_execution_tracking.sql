-- Add execution tracking columns to tasks table
ALTER TABLE tasks ADD COLUMN last_run_at timestamptz;
ALTER TABLE tasks ADD COLUMN next_run_at timestamptz;
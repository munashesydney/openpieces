-- Add structured scheduling columns to tasks table
ALTER TABLE tasks ADD COLUMN scheduled_at timestamptz;
ALTER TABLE tasks ADD COLUMN interval_type text;
ALTER TABLE tasks ADD COLUMN interval_value integer;
ALTER TABLE tasks ADD COLUMN day_of_week integer;
ALTER TABLE tasks ADD COLUMN day_of_month integer;
ALTER TABLE tasks ADD COLUMN time_of_day text;
ALTER TABLE tasks ADD COLUMN timezone text DEFAULT 'UTC';
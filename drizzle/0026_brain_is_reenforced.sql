-- Add is_reenforced column to brain table to track which entries have been processed by reinforcement
ALTER TABLE brain ADD COLUMN is_reenforced boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS brain_is_reenforced_idx ON brain (is_reenforced);

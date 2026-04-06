-- Add description column to workspaces table
ALTER TABLE workspaces ADD COLUMN description text NOT NULL DEFAULT '';
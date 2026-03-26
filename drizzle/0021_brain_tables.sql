-- Add processedByBrain to activity_log
ALTER TABLE activity_log ADD COLUMN processed_by_brain boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS activity_log_processed_by_brain_idx ON activity_log (processed_by_brain) WHERE processed_by_brain = false;

-- Create brain table
CREATE TABLE brain (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'fact' CHECK (type IN ('fact', 'episode')),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('pieces', 'workflows', 'runs', 'credentials', 'general')),
  summary text NOT NULL,
  record_type text,
  record_id uuid,
  embedding vector(1536),
  tags text[],
  confidence real NOT NULL DEFAULT 1.0,
  reinforcement_count integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brain_workspace_id_idx ON brain (workspace_id);
CREATE INDEX IF NOT EXISTS brain_embedding_idx ON brain USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS brain_category_idx ON brain (category);
CREATE INDEX IF NOT EXISTS brain_confidence_idx ON brain (confidence);

-- Create brain_settings table
CREATE TABLE brain_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ingestion_enabled boolean NOT NULL DEFAULT true,
  ingestion_interval_minutes integer NOT NULL DEFAULT 60,
  reinforcement_enabled boolean NOT NULL DEFAULT true,
  reinforcement_interval_hours integer NOT NULL DEFAULT 24,
  reinforcement_batch_size integer NOT NULL DEFAULT 10,
  last_ingestion_run timestamp,
  last_reinforcement_run timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS brain_settings_workspace_id_idx ON brain_settings (workspace_id);
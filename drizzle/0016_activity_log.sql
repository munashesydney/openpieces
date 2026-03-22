-- Activity log table for tracking changes to workspace resources
CREATE TABLE "activity_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "record_type" text NOT NULL,
  "operation" text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  "record_id" uuid,
  "workspace_id" uuid NOT NULL,
  "old_data" jsonb,
  "new_data" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Index for efficient querying by workspace
CREATE INDEX "activity_log_workspace_id_idx" ON "activity_log" ("workspace_id");

-- Index for filtering by record type
CREATE INDEX "activity_log_record_type_idx" ON "activity_log" ("record_type");

-- Trigger function to log workflow changes
CREATE OR REPLACE FUNCTION log_workflow_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (record_type, operation, record_id, workspace_id, new_data)
    VALUES ('workflow', TG_OP, NEW.id, NEW.workspace_id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_log (record_type, operation, record_id, workspace_id, old_data, new_data)
    VALUES ('workflow', TG_OP, NEW.id, NEW.workspace_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (record_type, operation, record_id, workspace_id, old_data)
    VALUES ('workflow', TG_OP, OLD.id, OLD.workspace_id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to workflows table
CREATE TRIGGER workflows_activity_trigger
AFTER INSERT OR UPDATE OR DELETE ON workflows
FOR EACH ROW EXECUTE FUNCTION log_workflow_changes();

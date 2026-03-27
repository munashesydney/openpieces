-- Add update_source column to track whether updates come from user or system (startup recovery)
ALTER TABLE services ADD COLUMN update_source TEXT DEFAULT 'user';

-- Update the log_changes trigger function to skip system-initiated updates
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
DECLARE
  workspace_uuid uuid;
  record_type_text text;
  lookup_service_id uuid;
  record_id_var text;
BEGIN
  -- Skip system-initiated updates (e.g., startup service recovery)
  IF TG_TABLE_NAME = 'services' AND TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.update_source = 'system' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Determine record type, workspace_id, and record_id based on table and operation
  IF TG_TABLE_NAME = 'services' THEN
    record_type_text := 'service';
    -- For INSERT/UPDATE use NEW, for DELETE use OLD
    IF TG_OP = 'DELETE' THEN
      workspace_uuid := OLD.workspace_id;
      record_id_var := OLD.id;
    ELSE
      workspace_uuid := NEW.workspace_id;
      record_id_var := NEW.id;
    END IF;
  ELSIF TG_TABLE_NAME = 'tasks' THEN
    record_type_text := 'task';
    IF TG_OP = 'DELETE' THEN
      workspace_uuid := OLD.workspace_id;
      record_id_var := OLD.id;
    ELSE
      workspace_uuid := NEW.workspace_id;
      record_id_var := NEW.id;
    END IF;
  ELSIF TG_TABLE_NAME = 'service_endpoints' THEN
    record_type_text := 'endpoint';
    -- Look up workspace_id through service - use OLD.service_id for DELETE, NEW for others
    IF TG_OP = 'DELETE' THEN
      lookup_service_id := OLD.service_id;
      record_id_var := OLD.id;
    ELSE
      lookup_service_id := NEW.service_id;
      record_id_var := NEW.id;
    END IF;
    SELECT s.workspace_id INTO workspace_uuid FROM services s WHERE s.id = lookup_service_id;
  ELSIF TG_TABLE_NAME = 'opencode_sessions' THEN
    record_type_text := 'opencode';
    -- Look up workspace_id through service - use OLD.service_id for DELETE, NEW for others
    IF TG_OP = 'DELETE' THEN
      lookup_service_id := OLD.service_id;
      record_id_var := OLD.session_id;
    ELSE
      lookup_service_id := NEW.service_id;
      record_id_var := NEW.session_id;
    END IF;
    SELECT s.workspace_id INTO workspace_uuid FROM services s WHERE s.id = lookup_service_id;
  ELSE
    record_type_text := TG_TABLE_NAME;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (record_type, operation, record_id, workspace_id, new_data)
    VALUES (record_type_text, TG_OP, record_id_var, workspace_uuid, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_log (record_type, operation, record_id, workspace_id, old_data, new_data)
    VALUES (record_type_text, TG_OP, record_id_var, workspace_uuid, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (record_type, operation, record_id, workspace_id, old_data)
    VALUES (record_type_text, TG_OP, record_id_var, workspace_uuid, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Reset update_source to 'user' for all existing rows
UPDATE services SET update_source = 'user' WHERE update_source IS NULL OR update_source = '';

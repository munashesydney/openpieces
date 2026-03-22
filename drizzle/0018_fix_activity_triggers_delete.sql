-- Fix: Use OLD.service_id for DELETE operations on tables that look up workspace_id via JOIN
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
DECLARE
  workspace_uuid uuid;
  record_type_text text;
  lookup_service_id uuid;
BEGIN
  -- Determine record type and workspace_id based on table and operation
  IF TG_TABLE_NAME = 'services' THEN
    record_type_text := 'service';
    -- For INSERT/UPDATE use NEW, for DELETE use OLD
    IF TG_OP = 'DELETE' THEN
      workspace_uuid := OLD.workspace_id;
    ELSE
      workspace_uuid := NEW.workspace_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'tasks' THEN
    record_type_text := 'task';
    IF TG_OP = 'DELETE' THEN
      workspace_uuid := OLD.workspace_id;
    ELSE
      workspace_uuid := NEW.workspace_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'service_endpoints' THEN
    record_type_text := 'endpoint';
    -- Look up workspace_id through service - use OLD.service_id for DELETE, NEW for others
    IF TG_OP = 'DELETE' THEN
      lookup_service_id := OLD.service_id;
    ELSE
      lookup_service_id := NEW.service_id;
    END IF;
    SELECT s.workspace_id INTO workspace_uuid FROM services s WHERE s.id = lookup_service_id;
  ELSIF TG_TABLE_NAME = 'opencode_sessions' THEN
    record_type_text := 'opencode';
    -- Look up workspace_id through service - use OLD.service_id for DELETE, NEW for others
    IF TG_OP = 'DELETE' THEN
      lookup_service_id := OLD.service_id;
    ELSE
      lookup_service_id := NEW.service_id;
    END IF;
    SELECT s.workspace_id INTO workspace_uuid FROM services s WHERE s.id = lookup_service_id;
  ELSE
    record_type_text := TG_TABLE_NAME;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (record_type, operation, record_id, workspace_id, new_data)
    VALUES (record_type_text, TG_OP, NEW.id, workspace_uuid, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_log (record_type, operation, record_id, workspace_id, old_data, new_data)
    VALUES (record_type_text, TG_OP, NEW.id, workspace_uuid, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (record_type, operation, record_id, workspace_id, old_data)
    VALUES (record_type_text, TG_OP, OLD.id, workspace_uuid, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
-- =============================================================================
-- Add activity logging triggers for events and event_subscriptions tables.
-- Uses CREATE OR REPLACE FUNCTION to safely update log_changes() in-place.
-- =============================================================================

CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
DECLARE
  workspace_uuid uuid;
  record_type_text text;
  lookup_service_id uuid;
  record_id_var text;
BEGIN
  -- Skip UPDATE on opencode_sessions (bookkeeping noise — webhooks & usage sync)
  IF TG_TABLE_NAME = 'opencode_sessions' AND TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Skip system-initiated updates (e.g., startup service recovery)
  IF TG_TABLE_NAME = 'services' AND TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.update_source = 'system' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Determine record type, workspace_id, and record_id based on table and operation
  IF TG_TABLE_NAME = 'services' THEN
    record_type_text := 'service';
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
  ELSIF TG_TABLE_NAME = 'events' THEN
    record_type_text := 'event';
    IF TG_OP = 'DELETE' THEN
      workspace_uuid := OLD.workspace_id;
      record_id_var := OLD.id;
    ELSE
      workspace_uuid := NEW.workspace_id;
      record_id_var := NEW.id;
    END IF;
  ELSIF TG_TABLE_NAME = 'event_subscriptions' THEN
    record_type_text := 'event_subscription';
    IF TG_OP = 'DELETE' THEN
      workspace_uuid := OLD.workspace_id;
      record_id_var := OLD.id;
    ELSE
      workspace_uuid := NEW.workspace_id;
      record_id_var := NEW.id;
    END IF;
  ELSIF TG_TABLE_NAME = 'service_endpoints' THEN
    record_type_text := 'endpoint';
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

  -- CASCADE DELETE SAFEGUARD
  -- If we're deleting a child record and the parent is already gone, workspace_uuid will be NULL.
  -- The parent's deletion was already logged, so we can safely skip logging the child's cascade deletion.
  IF TG_OP = 'DELETE' AND workspace_uuid IS NULL THEN
    RETURN OLD;
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

-- ---------------------------------------------------------------------------
-- Attach triggers to events and event_subscriptions tables
-- ---------------------------------------------------------------------------

CREATE TRIGGER events_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER event_subscriptions_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON event_subscriptions
  FOR EACH ROW EXECUTE FUNCTION log_changes();

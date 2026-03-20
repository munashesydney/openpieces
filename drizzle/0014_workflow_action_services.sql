CREATE TABLE "workflow_action_services" (
  "workflow_id" uuid NOT NULL REFERENCES "workflows"("id") ON DELETE CASCADE,
  "action_service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
  PRIMARY KEY ("workflow_id", "action_service_id")
);
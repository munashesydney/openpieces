CREATE TABLE IF NOT EXISTS "service_required_secrets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
  "secret_key" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "service_required_secrets_service_id_idx" ON "service_required_secrets"("service_id");
ALTER TABLE "workflows" ADD COLUMN "detailed_steps" text DEFAULT '' NOT NULL;
ALTER TABLE "workflows" ALTER COLUMN "status" SET DEFAULT 'active';

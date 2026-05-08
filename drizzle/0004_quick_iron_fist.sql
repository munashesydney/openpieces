ALTER TABLE "workflows" ALTER COLUMN "detailed_steps" DROP DEFAULT;--> statement-breakpoint

ALTER TABLE "workflows" ALTER COLUMN "detailed_steps" SET DATA TYPE jsonb USING to_jsonb("detailed_steps");--> statement-breakpoint

-- Wrap existing text values in JSON arrays; empty strings become empty arrays
UPDATE "workflows"
SET "detailed_steps" = jsonb_build_array("detailed_steps")
WHERE "detailed_steps" IS NOT NULL
  AND "detailed_steps" != '""'::jsonb;

UPDATE "workflows"
SET "detailed_steps" = '[]'::jsonb
WHERE "detailed_steps" = '""'::jsonb
   OR "detailed_steps" IS NULL;--> statement-breakpoint

ALTER TABLE "workflows" ALTER COLUMN "detailed_steps" SET DEFAULT '[]'::jsonb;

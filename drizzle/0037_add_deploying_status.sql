ALTER TABLE "services" DROP CONSTRAINT "services_status_check";
ALTER TABLE "services" ADD CONSTRAINT "services_status_check" CHECK ("status" IN ('stopped', 'running', 'crashed', 'deploying'));

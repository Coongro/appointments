-- Migrar timestamps a `with time zone` para que Drizzle devuelva ISO con offset.
-- Pre-launch, sin datos productivos.

ALTER TABLE "module_appointments_appointments"
  ALTER COLUMN "created_at" TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';

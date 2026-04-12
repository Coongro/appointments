CREATE TABLE "module_appointments_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendar_event_id" text,
	"contact_id" text NOT NULL,
	"pet_id" text,
	"staff_id" text,
	"consultation_id" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"reason" text,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

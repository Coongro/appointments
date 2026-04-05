import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const appointmentTable = pgTable('module_appointments_appointments', {
  id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
  calendar_event_id: text('calendar_event_id'),
  contact_id: text('contact_id').notNull(),
  staff_id: text('staff_id'),
  status: text('status').notNull().default('scheduled'),
  reason: text('reason'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at', { mode: 'string' }).notNull().default(sql`now()`),
  updated_at: timestamp('updated_at', { mode: 'string' }).notNull().default(sql`now()`),
});

export type AppointmentRow = typeof appointmentTable.$inferSelect;
export type NewAppointmentRow = typeof appointmentTable.$inferInsert;

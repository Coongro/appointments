/**
 * @coongro/appointments — Exportaciones server-only
 *
 * Schema tables y repositories (dependen de drizzle-orm).
 * NO importar desde el browser — usar '@coongro/appointments' para hooks/componentes.
 */

// Schema
export { appointmentTable } from './schema/appointment.js';
export type { AppointmentRow, NewAppointmentRow } from './schema/appointment.js';

// Repository
export { AppointmentRepository } from './repositories/appointment.repository.js';
export type { SearchParams } from './repositories/appointment.repository.js';

/**
 * @coongro/appointments — Entry point principal (browser-safe)
 *
 * Exportar aquí: hooks, componentes, tipos, utilidades.
 * NO exportar schema tables ni repositories (usan drizzle-orm, solo backend).
 * Para exports server-only → usar server.ts
 */

// Types
export type { AppointmentRow, NewAppointmentRow } from './schema/appointment.js';
export type {
  AppointmentStatus,
  Appointment,
  AppointmentCreateData,
  AppointmentUpdateData,
} from './types/appointment.js';
export type { AppointmentFilters, SortDirection } from './types/filters.js';
export type { AppointmentSchedulerProps } from './types/components.js';

// Hooks
export { useAppointments } from './hooks/useAppointments.js';
export type { UseAppointmentsOptions, UseAppointmentsResult } from './hooks/useAppointments.js';
export { useAppointment } from './hooks/useAppointment.js';
export type { UseAppointmentResult } from './hooks/useAppointment.js';
export { useAppointmentMutations } from './hooks/useAppointmentMutations.js';
export type { UseAppointmentMutationsResult } from './hooks/useAppointmentMutations.js';
export { useTodayAppointments } from './hooks/useTodayAppointments.js';
export type { UseTodayAppointmentsResult } from './hooks/useTodayAppointments.js';
export { useAppointmentsByStaff } from './hooks/useAppointmentsByStaff.js';
export type {
  UseAppointmentsByStaffOptions,
  UseAppointmentsByStaffResult,
} from './hooks/useAppointmentsByStaff.js';

// Utilities
export { toCalendarEvents, buildAppointmentMap, getInitials } from './utils/helpers.js';
export {
  STATUS_LABELS,
  STATUS_BLOCK_STYLES,
  STATUS_BADGE_STYLES,
  STATUS_DOT_STYLES,
  STATUS_EVENT_COLORS,
} from './utils/status.js';

// Components (se agregarán después del diseño HTML)
// export { AppointmentScheduler } from './components/AppointmentScheduler.js';

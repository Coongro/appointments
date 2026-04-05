/**
 * Props para componentes reutilizables de appointments.
 */
import type { Appointment } from './appointment.js';

export interface AppointmentSchedulerProps {
  /** Pre-fill: fecha (ISO string) */
  defaultDate?: string;
  /** Pre-fill: ID del staff member */
  defaultStaffId?: string;
  /** Pre-fill: ID del contacto (cliente) */
  defaultContactId?: string;
  /** Callback al agendar exitosamente */
  onScheduled?: (appointment: Appointment) => void;
  /** Callback al cancelar */
  onCancel?: () => void;
  /** Modo del formulario */
  mode?: 'create' | 'edit';
  /** ID del turno (para modo edit) */
  appointmentId?: string;
}

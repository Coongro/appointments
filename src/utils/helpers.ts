/**
 * Helpers compartidos para el plugin de appointments.
 */
import type { CalendarEvent } from '@coongro/calendar';

import type { Appointment } from '../types/appointment.js';

import { STATUS_EVENT_COLORS } from './status.js';

/** Convierte appointments a CalendarEvent[] para CalendarView/DayColumn. */
export function toCalendarEvents(appointments: Appointment[]): CalendarEvent[] {
  return appointments
    .filter((a) => a.event_start_at && a.event_end_at)
    .map((a) => ({
      id: a.id,
      title: a.pet_name ?? a.event_title ?? '',
      start_at: a.event_start_at,
      end_at: a.event_end_at,
      status: a.status === 'scheduled' ? 'confirmed' : a.status,
      color: STATUS_EVENT_COLORS[a.status],
    })) as unknown as CalendarEvent[];
}

/** Crea un Map<id, Appointment> para lookup rapido. */
export function buildAppointmentMap(appointments: Appointment[]): Map<string, Appointment> {
  const map = new Map<string, Appointment>();
  for (const a of appointments) map.set(a.id, a);
  return map;
}

/** Extrae iniciales de un nombre (max 2 caracteres). */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

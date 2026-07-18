/**
 * Recordatorio de turno: traduce la setting `appointments.reminders` a un input de
 * notificación agendada (motor de notificaciones del core, COONG-166/252).
 *
 * El aviso es para el EQUIPO de la clínica (campana de Coongro), no para el tutor
 * — llega por-tenant. El aviso directo al tutor por canal externo es otra cosa.
 */
import type { PluginNotifications } from '@coongro/plugin-sdk';

/** Input de notificación agendada, derivado del SDK (sin acoplar a un tipo interno). */
type ScheduleInput = Parameters<PluginNotifications['schedule']>[0];

/** Tipo de entidad con el que se agenda/cancela el recordatorio (para cancelByEntity). */
export const REMINDER_ENTITY_TYPE = 'appointment';

/** setting appointments.reminders → horas de anticipación (off/valor inválido = null). */
const OFFSET_HOURS: Record<string, number> = { '1': 1, '3': 3, '24': 24 };

/** Sufijo del mensaje con mascota y (si hay) tutor, sin template literals anidados. */
function reminderDetalle(petName?: string | null, ownerName?: string | null): string {
  if (petName && ownerName) return ` — ${petName} (tutor: ${ownerName})`;
  if (petName) return ` — ${petName}`;
  if (ownerName) return ` — ${ownerName}`;
  return '';
}

export interface TurnoReminderContext {
  /** Valor de la setting `appointments.reminders` ('off' | '1' | '3' | '24'). */
  pref: string;
  /** Inicio del turno en UTC ISO. */
  startAtUTC: string;
  /** Referencia para poder cancelar por entidad (usamos el calendar_event_id del turno). */
  entityId: string;
  /** Etiqueta local del turno para el mensaje (ej. "mañana 10:00"). */
  whenLabel: string;
  petName?: string | null;
  ownerName?: string | null;
}

/**
 * Construye el input del recordatorio, o `null` si no corresponde agendar
 * (recordatorio apagado, o el momento del aviso ya pasó).
 */
export function buildTurnoReminder(ctx: TurnoReminderContext): ScheduleInput | null {
  const hours = OFFSET_HOURS[ctx.pref];
  if (!hours) return null;

  const start = new Date(ctx.startAtUTC);
  if (Number.isNaN(start.getTime())) return null;

  const remindAt = new Date(start.getTime() - hours * 3_600_000);
  if (remindAt.getTime() <= Date.now()) return null; // el momento del aviso ya pasó

  const detalle = reminderDetalle(ctx.petName, ctx.ownerName);

  return {
    scheduledAt: remindAt,
    title: 'Recordatorio de turno',
    message: `Turno ${ctx.whenLabel}${detalle}`,
    level: 'info',
    entityId: ctx.entityId,
    entityType: REMINDER_ENTITY_TYPE,
    motivo: 'appointment-reminder',
    dedupKey: `appt-reminder:${ctx.entityId}`,
  };
}

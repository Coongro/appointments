/**
 * Detección de turnos superpuestos para un mismo profesional.
 * La usa el scheduler cuando el setting `appointments.allowOverlap` está apagado:
 * antes de guardar, busca si el veterinario ya tiene un turno que se cruza con el
 * horario propuesto y, si lo hay, pide confirmación (no bloquea del todo — una
 * urgencia se puede encajar conscientemente).
 */
import { actions } from '@coongro/plugin-sdk';

import type { Appointment } from '../types/appointment.js';

export interface OverlapQuery {
  staffId: string;
  /** Inicio del día local en UTC (ISO) — acota la consulta a la jornada. */
  dayFromUTC: string;
  /** Fin del día local en UTC (ISO). */
  dayToUTC: string;
  /** Horario propuesto del turno, en UTC (ISO). */
  startAtUTC: string;
  endAtUTC: string;
  /** Turno en edición a excluir del chequeo (no colisiona consigo mismo). */
  excludeAppointmentId?: string | null;
}

/**
 * ¿El turno `a` se cruza con el intervalo propuesto [newStart, newEnd)? Ignora
 * los cancelados / "no asistió" y los que no tienen horario. Dos intervalos
 * [aStart,aEnd) y [bStart,bEnd) se solapan sii `aStart < bEnd && bStart < aEnd`.
 */
function crosses(a: Appointment, newStart: number, newEnd: number): boolean {
  if (a.status === 'cancelled' || a.status === 'no_show') return false;
  if (!a.event_start_at || !a.event_end_at) return false;
  const s = new Date(a.event_start_at).getTime();
  const e = new Date(a.event_end_at).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return false;
  return newStart < e && s < newEnd;
}

/**
 * Devuelve el primer turno del mismo profesional cuyo horario se cruza con el
 * propuesto, o null si no hay cruce. Ante un error de consulta devuelve null: el
 * chequeo es best-effort y nunca debe impedir agendar.
 */
export async function findStaffOverlap(q: OverlapQuery): Promise<Appointment | null> {
  const newStart = new Date(q.startAtUTC).getTime();
  const newEnd = new Date(q.endAtUTC).getTime();
  if (Number.isNaN(newStart) || Number.isNaN(newEnd) || newStart >= newEnd) return null;

  let rows: Appointment[];
  try {
    rows = await actions.execute<Appointment[]>('appointments.listByStaff', {
      staffId: q.staffId,
      from: q.dayFromUTC,
      to: q.dayToUTC,
    });
  } catch {
    return null;
  }

  return rows.find((a) => a.id !== q.excludeAppointmentId && crosses(a, newStart, newEnd)) ?? null;
}

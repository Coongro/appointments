/**
 * AUTO-GENERADO por Coongro Builder — NO editar a mano.
 * Se regenera al guardar la página de settings desde /dev/builder.
 * La lógica de negocio va en un hook de dominio que consume esto.
 */
/* eslint-disable */

import { useSettings } from '@coongro/plugin-sdk';

function toNum(v: unknown, fallback: number): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return fallback;
}

function toEnum<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : fallback;
}

function toBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

export const REMINDERS = {
  off: 'off',
  _1: '1',
  _3: '3',
  _24: '24',
} as const;

/** Tipo de cada setting por su key punteada (para getSetting). */
export interface AppointmentsSettingsByKey {
  'appointments.agenda.startHour': number;
  'appointments.agenda.endHour': number;
  'appointments.agenda.slotMinutes': number;
  'appointments.reminders': 'off' | '1' | '3' | '24';
  'appointments.allowOverlap': boolean;
}

/** Settings del plugin con defaults aplicados y coerción por tipo. */
export interface AppointmentsSettings {
  /** Hora de apertura — Primera hora que muestra la agenda del día (0–23). · `appointments.agenda.startHour` · default: `7` */
  readonly agendaStartHour: number;
  /** Hora de cierre — Última hora que muestra la agenda del día (1–24). · `appointments.agenda.endHour` · default: `21` */
  readonly agendaEndHour: number;
  /** Duración de la franja (min) — Tamaño de cada franja de la agenda, en minutos (ej. 15, 20, 30). · `appointments.agenda.slotMinutes` · default: `30` */
  readonly agendaSlotMinutes: number;
  /** Recordatorio de turno — Avisar en la campana de Coongro antes de cada turno, para que la clínica lo tenga presente y pueda contactar al tutor. El aviso llega al equipo (no al tutor). Default: sin recordatorio. · `appointments.reminders` · default: `"off"` */
  readonly reminders: 'off' | '1' | '3' | '24';
  /** Permitir turnos superpuestos — Si está activado, un mismo profesional puede tener dos turnos en el mismo horario sin avisos. Si lo desactivás, al agendar un turno que se cruza con otro del mismo profesional el sistema pide confirmación antes de guardar (útil para clínicas con un solo consultorio por veterinario). Default: permitido. · `appointments.allowOverlap` · default: `true` */
  readonly allowOverlap: boolean;
}

/** Nombre de prop → key punteada del manifest. */
export const SETTING_KEYS = {
  agendaStartHour: 'appointments.agenda.startHour',
  agendaEndHour: 'appointments.agenda.endHour',
  agendaSlotMinutes: 'appointments.agenda.slotMinutes',
  reminders: 'appointments.reminders',
  allowOverlap: 'appointments.allowOverlap',
} as const;

/** Valores por defecto (los mismos del manifest). */
export const SETTING_DEFAULTS = {
  'appointments.agenda.startHour': 7,
  'appointments.agenda.endHour': 21,
  'appointments.agenda.slotMinutes': 30,
  'appointments.reminders': 'off',
  'appointments.allowOverlap': true,
} as const;

const COERCE: {
  [K in keyof AppointmentsSettingsByKey]: (
    values: Record<string, unknown>
  ) => AppointmentsSettingsByKey[K];
} = {
  'appointments.agenda.startHour': (values) => toNum(values['appointments.agenda.startHour'], 7),
  'appointments.agenda.endHour': (values) => toNum(values['appointments.agenda.endHour'], 21),
  'appointments.agenda.slotMinutes': (values) =>
    toNum(values['appointments.agenda.slotMinutes'], 30),
  'appointments.reminders': (values) =>
    toEnum(values['appointments.reminders'], ['off', '1', '3', '24'], 'off'),
  'appointments.allowOverlap': (values) => toBool(values['appointments.allowOverlap'], true),
};

/** Lee UNA setting tipada desde los valores crudos del tenant (para handlers). */
export function getSetting<K extends keyof AppointmentsSettingsByKey>(
  values: Record<string, unknown>,
  key: K
): AppointmentsSettingsByKey[K] {
  return COERCE[key](values);
}

/** Construye el objeto tipado desde los valores crudos (sin hook: handlers/tests). */
export function readAppointmentsSettings(values: Record<string, unknown>): AppointmentsSettings {
  return {
    agendaStartHour: COERCE['appointments.agenda.startHour'](values),
    agendaEndHour: COERCE['appointments.agenda.endHour'](values),
    agendaSlotMinutes: COERCE['appointments.agenda.slotMinutes'](values),
    reminders: COERCE['appointments.reminders'](values),
    allowOverlap: COERCE['appointments.allowOverlap'](values),
  };
}

/**
 * Hook reactivo: settings tipadas del plugin con defaults aplicados.
 * Envolvé esto en un hook de dominio si necesitás lógica de negocio.
 */
export function useAppointmentsSettings(): { settings: AppointmentsSettings; loading: boolean } {
  const { values, loading } = useSettings('appointments.');
  return { settings: readAppointmentsSettings(values), loading };
}

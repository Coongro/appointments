import type { AppointmentStatus } from '../types/appointment.js';

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Agendado',
  completed: 'Completado',
  cancelled: 'Cancelado',
  no_show: 'No asistió',
};

export const STATUS_BLOCK_STYLES: Record<
  AppointmentStatus,
  { background: string; borderLeftColor: string }
> = {
  scheduled: {
    background: 'color-mix(in srgb, var(--cg-accent) 20%, transparent)',
    borderLeftColor: 'var(--cg-accent)',
  },
  completed: {
    background: 'var(--cg-green-bg)',
    borderLeftColor: 'var(--cg-green)',
  },
  cancelled: {
    background: 'color-mix(in srgb, var(--cg-text-muted) 10%, transparent)',
    borderLeftColor: 'var(--cg-text-muted)',
  },
  no_show: {
    background: 'var(--cg-danger-bg)',
    borderLeftColor: 'var(--cg-danger)',
  },
};

export const STATUS_BADGE_STYLES: Record<AppointmentStatus, { background: string; color: string }> =
  {
    scheduled: {
      background: 'color-mix(in srgb, var(--cg-accent) 15%, transparent)',
      color: 'var(--cg-warning-text)',
    },
    completed: {
      background: 'color-mix(in srgb, var(--cg-green) 15%, transparent)',
      color: 'var(--cg-green)',
    },
    cancelled: {
      background: 'color-mix(in srgb, var(--cg-text-muted) 15%, transparent)',
      color: 'var(--cg-text-subtle)',
    },
    no_show: {
      background: 'color-mix(in srgb, var(--cg-danger) 15%, transparent)',
      color: 'var(--cg-danger)',
    },
  };

export const STATUS_DOT_STYLES: Record<AppointmentStatus, { background: string }> = {
  scheduled: { background: 'var(--cg-accent)' },
  completed: { background: 'var(--cg-green)' },
  cancelled: { background: 'var(--cg-text-muted)' },
  no_show: { background: 'var(--cg-danger)' },
};

/** Mapeo de AppointmentStatus a color para CalendarEvent */
export const STATUS_EVENT_COLORS: Record<AppointmentStatus, string> = {
  scheduled: 'var(--cg-accent)',
  completed: 'var(--cg-green)',
  cancelled: 'var(--cg-text-muted)',
  no_show: 'var(--cg-danger)',
};

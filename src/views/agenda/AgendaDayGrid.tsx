/**
 * AgendaDayGrid — Vista de dia para la agenda de turnos.
 * Reutiliza DayColumn de @coongro/calendar con renderEvent custom
 * para mostrar las cards de appointment con info veterinaria.
 */
import { DayColumn, toDateString, formatEventTime, useTenantTimezone } from '@coongro/calendar';
import type { CalendarEvent } from '@coongro/calendar';
import { getHostReact } from '@coongro/plugin-sdk';

import type { Appointment } from '../../types/appointment.js';
import { toCalendarEvents, buildAppointmentMap } from '../../utils/helpers.js';
import {
  STATUS_LABELS,
  STATUS_BADGE_STYLES,
  STATUS_BLOCK_STYLES,
  STATUS_DOT_STYLES,
} from '../../utils/status.js';

const React = getHostReact();
const { useMemo, useCallback } = React;

interface AgendaDayGridProps {
  date: Date;
  appointments: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
  onSlotClick?: (hour: number) => void;
  selectedId?: string | null;
}

export function AgendaDayGrid({
  date,
  appointments,
  onAppointmentClick,
  onSlotClick,
  selectedId,
}: AgendaDayGridProps) {
  const tz = useTenantTimezone();
  const events = useMemo(() => toCalendarEvents(appointments), [appointments]);
  const appointmentMap = useMemo(() => buildAppointmentMap(appointments), [appointments]);

  // Cuando DayColumn dispara onEventClick, buscamos el appointment original
  const handleEventClick = useCallback(
    (evt: CalendarEvent) => {
      const appt = appointmentMap.get(evt.id);
      if (appt && onAppointmentClick) onAppointmentClick(appt);
    },
    [appointmentMap, onAppointmentClick]
  );

  // Render custom de cada evento — card con info veterinaria
  const renderEvent = useCallback(
    (evt: CalendarEvent) => {
      const appt = appointmentMap.get(evt.id);
      if (!appt) return null;

      const status = appt.status;
      const isSelected = selectedId === appt.id;
      const startTime = appt.event_start_at ? formatEventTime(appt.event_start_at, tz) : '';
      const endTime = appt.event_end_at ? formatEventTime(appt.event_end_at, tz) : '';
      const blockStyle = STATUS_BLOCK_STYLES[status];

      return React.createElement(
        'div',
        {
          style: {
            width: '100%',
            height: '100%',
            borderRadius: '7px',
            padding: '7px 10px',
            cursor: 'pointer',
            overflow: 'hidden',
            borderLeft: `3px solid ${blockStyle.borderLeftColor}`,
            background: blockStyle.background,
            boxShadow: isSelected ? '0 0 0 2px var(--cg-accent)' : 'none',
          },
          onClick: onAppointmentClick ? () => onAppointmentClick(appt) : undefined,
        },

        // Fila 1: hora + badge estado
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
          },
          React.createElement(
            'span',
            { style: { fontSize: '10px', fontWeight: '700', color: 'var(--cg-text-secondary)' } },
            `${startTime} – ${endTime}`
          ),
          React.createElement(
            'span',
            {
              style: {
                fontSize: '9px',
                fontWeight: '600',
                padding: '1px 6px',
                borderRadius: '10px',
                letterSpacing: '0.2px',
                ...STATUS_BADGE_STYLES[status],
              },
            },
            STATUS_LABELS[status]
          )
        ),

        // Fila 2: mascota + raza
        React.createElement(
          'div',
          {
            style: {
              fontSize: '13px',
              fontWeight: '500',
              marginTop: '1px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--cg-text)',
            },
          },
          appt.pet_name ?? '—',
          appt.pet_breed ? ` — ${appt.pet_breed}` : ''
        ),

        // Fila 3: veterinario + motivo
        (appt.staff_name || appt.reason) &&
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                color: 'var(--cg-text-tertiary)',
                marginTop: '2px',
              },
            },
            appt.staff_name &&
              React.createElement('div', {
                style: {
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: STATUS_DOT_STYLES[status]?.background ?? 'var(--cg-text-muted)',
                  flexShrink: '0',
                },
              }),
            [appt.staff_name, appt.reason].filter(Boolean).join(' · ')
          )
      );
    },
    [appointmentMap, selectedId, onAppointmentClick, tz]
  );

  const dateStr = toDateString(date);

  return React.createElement(DayColumn, {
    date: dateStr,
    events,
    startHour: 0,
    endHour: 24,
    slotDuration: 30,
    renderEvent,
    onEventClick: handleEventClick,
    onSlotClick,
  });
}

/**
 * AgendaTimeline — Vista mobile de la agenda de turnos.
 * Cards apilados por grupo horario con time markers sticky.
 * Referencia: design/agenda-day-mobile.html
 */
import { formatEventTime, useTenantTimezone } from '@coongro/calendar';
import { utcToLocal } from '@coongro/datetime';
import { getHostReact } from '@coongro/plugin-sdk';

import type { Appointment } from '../../types/appointment.js';
import { getInitials } from '../../utils/helpers.js';
import {
  STATUS_LABELS,
  STATUS_BLOCK_STYLES,
  STATUS_BADGE_STYLES,
  STATUS_DOT_STYLES,
} from '../../utils/status.js';

const React = getHostReact();
const { useMemo } = React;

const T = {
  gold: 'var(--cg-accent)',
  ink2: 'var(--cg-text-secondary)',
  ink3: 'var(--cg-text-tertiary)',
  ink4: 'var(--cg-text-muted)',
  bg: 'var(--cg-bg)',
  surface: 'var(--cg-surface)',
  border: 'var(--cg-border)',
  borderMd: 'var(--cg-border-md)',
  red: 'var(--cg-danger)',
};

interface TimeGroup {
  time: string;
  isNow: boolean;
  appointments: Appointment[];
  isEmpty: boolean;
}

interface AgendaTimelineProps {
  appointments: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
  onAttend?: (appointment: Appointment) => void;
  onSlotClick?: (hour: number) => void;
}

export function AgendaTimeline({
  appointments,
  onAppointmentClick,
  onAttend,
  onSlotClick,
}: AgendaTimelineProps) {
  const tz = useTenantTimezone();
  const nowLocal = utcToLocal(new Date(), tz);
  const nowHour = nowLocal.hour;
  const nowMin = nowLocal.minute;

  // Agrupar appointments por hora y detectar huecos
  const groups: TimeGroup[] = useMemo(() => {
    // Mapa hora → appointments
    const byHour = new Map<number, Appointment[]>();
    for (const a of appointments) {
      if (!a.event_start_at) continue;
      const h = utcToLocal(a.event_start_at, tz).hour;
      if (!byHour.has(h)) byHour.set(h, []);
      byHour.get(h).push(a);
    }

    // Generar grupos para horas 7-21 (horario típico) + cualquier hora con turnos
    const hours = new Set<number>();
    for (let h = 7; h <= 21; h++) hours.add(h);
    for (const h of byHour.keys()) hours.add(h);

    const sorted = Array.from(hours).sort((a, b) => a - b);
    const result: TimeGroup[] = [];

    for (const h of sorted) {
      const appts = byHour.get(h) ?? [];
      const timeStr = `${String(h).padStart(2, '0')}:00`;
      const isNow = h === nowHour;

      if (appts.length > 0) {
        result.push({ time: timeStr, isNow, appointments: appts, isEmpty: false });
      } else {
        // Solo mostrar empty slots en horario laboral
        if (h >= 8 && h <= 18) {
          result.push({ time: timeStr, isNow, appointments: [], isEmpty: true });
        }
      }
    }

    // Insertar "now" marker si la hora actual no coincide con ningún grupo
    const hasNowGroup = result.some((g) => g.isNow);
    if (!hasNowGroup && nowHour >= 7 && nowHour <= 21) {
      const nowTime = `${String(nowHour).padStart(2, '0')}:${String(nowMin).padStart(2, '0')}`;
      const idx = result.findIndex((g) => parseInt(g.time.split(':')[0], 10) > nowHour);
      const nowGroup: TimeGroup = {
        time: nowTime,
        isNow: true,
        appointments: [],
        isEmpty: true,
      };
      if (idx === -1) result.push(nowGroup);
      else result.splice(idx, 0, nowGroup);
    }

    return result;
  }, [appointments, nowHour, nowMin, tz]);

  // Paw icon SVG string
  const pawIcon = React.createElement(
    'svg',
    {
      width: 16,
      height: 16,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'var(--cg-text-tertiary)',
      strokeWidth: 2,
      strokeLinecap: 'round',
    },
    React.createElement('path', {
      d: 'M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .137 1.217 1.5 2.5 3 2.5s2.529-.272 3.5-1.5M14 5.172C14 3.782 15.577 2.679 17.5 3c2.823.47 4.113 6.006 4 7-.137 1.217-1.5 2.5-3 2.5s-2.529-.272-3.5-1.5',
    })
  );

  return React.createElement(
    'div',
    { style: { padding: '8px 16px 100px' } },

    ...groups.map((group) =>
      React.createElement(
        'div',
        { key: group.time, style: { marginBottom: '2px' } },

        // Time marker
        React.createElement(
          'div',
          {
            style: {
              fontSize: '11px',
              fontWeight: 700,
              color: group.isNow ? T.red : T.ink4,
              padding: '10px 0 6px',
              position: 'sticky',
              top: '82px',
              background: T.bg,
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            },
          },
          group.isNow ? `${group.time} — Ahora` : group.time,
          React.createElement('div', {
            style: {
              flex: 1,
              height: group.isNow ? '2px' : '1px',
              background: group.isNow ? T.red : T.border,
            },
          })
        ),

        // Empty slot
        group.isEmpty &&
          React.createElement(
            'div',
            {
              style: {
                padding: '14px',
                border: `1px dashed ${T.borderMd}`,
                borderRadius: '18px',
                textAlign: 'center',
                fontSize: '12px',
                color: T.ink4,
                cursor: 'pointer',
                marginBottom: '8px',
              },
              onClick: onSlotClick
                ? () => onSlotClick(parseInt(group.time.split(':')[0], 10))
                : undefined,
            },
            '+ Agendar turno'
          ),

        // Appointment cards
        ...group.appointments.map((appt) => {
          const status = appt.status;
          const badgeStyle = STATUS_BADGE_STYLES[status];
          const dotStyle = STATUS_DOT_STYLES[status];
          const startTime = appt.event_start_at ? formatEventTime(appt.event_start_at, tz) : '';
          const endTime = appt.event_end_at ? formatEventTime(appt.event_end_at, tz) : '';
          const isCurrentSlot = group.isNow && status === 'scheduled';
          const vetInitials = appt.staff_name ? getInitials(appt.staff_name) : '';

          return React.createElement(
            'div',
            {
              key: appt.id,
              style: {
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: '18px',
                borderLeft: `3px solid ${STATUS_BLOCK_STYLES[status].borderLeftColor}`,
                marginBottom: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
              },
              onClick: onAppointmentClick ? () => onAppointmentClick(appt) : undefined,
            },

            // Card body
            React.createElement(
              'div',
              { style: { padding: '12px 14px' } },

              // Top: time + badge
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  },
                },
                React.createElement(
                  'span',
                  { style: { fontSize: '13px', fontWeight: 700 } },
                  startTime,
                  React.createElement(
                    'span',
                    { style: { fontWeight: 400, color: T.ink4 } },
                    ` – ${endTime}`
                  )
                ),
                React.createElement(
                  'span',
                  {
                    style: {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      fontSize: '10px',
                      fontWeight: 600,
                      ...badgeStyle,
                    },
                  },
                  React.createElement('span', {
                    style: {
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      ...dotStyle,
                    },
                  }),
                  STATUS_LABELS[status]
                )
              ),

              // Main: icon + patient info
              React.createElement(
                'div',
                { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
                React.createElement(
                  'div',
                  {
                    style: {
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: T.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    },
                  },
                  pawIcon
                ),
                React.createElement(
                  'div',
                  { style: { flex: 1, minWidth: 0 } },
                  React.createElement(
                    'div',
                    { style: { fontSize: '14px', fontWeight: 500 } },
                    appt.pet_name ?? '—'
                  ),
                  React.createElement(
                    'div',
                    {
                      style: {
                        fontSize: '11px',
                        color: T.ink3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      },
                    },
                    [appt.pet_breed ?? appt.pet_species, appt.contact_name]
                      .filter(Boolean)
                      .join(' · ')
                  )
                )
              ),

              // Footer: reason + vet
              (appt.reason || appt.staff_name) &&
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: `1px solid ${T.border}`,
                    },
                  },
                  appt.reason &&
                    React.createElement(
                      'span',
                      {
                        style: {
                          fontSize: '11px',
                          color: T.ink2,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        },
                      },
                      appt.reason
                    ),
                  appt.staff_name &&
                    React.createElement(
                      'span',
                      {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: T.ink3,
                          flexShrink: 0,
                        },
                      },
                      React.createElement(
                        'span',
                        {
                          style: {
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '8px',
                            fontWeight: 700,
                            background: 'var(--cg-green-bg)',
                            color: 'var(--cg-green)',
                          },
                        },
                        vetInitials
                      ),
                      appt.staff_name
                    )
                )
            ),

            // Action buttons (solo para el turno actual si está agendado)
            isCurrentSlot &&
              React.createElement(
                'div',
                {
                  style: {
                    padding: '0 14px 12px',
                    display: 'flex',
                    gap: '8px',
                  },
                },
                React.createElement(
                  'button',
                  {
                    style: {
                      flex: 1,
                      padding: '8px',
                      fontFamily: "'Roboto', sans-serif",
                      fontWeight: 700,
                      fontSize: '12px',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      background: T.gold,
                      color: 'white',
                      border: `1px solid ${T.gold}`,
                    },
                    onClick: (e: any) => {
                      e.stopPropagation();
                      onAttend?.(appt);
                    },
                  },
                  React.createElement(
                    'svg',
                    {
                      width: 13,
                      height: 13,
                      viewBox: '0 0 24 24',
                      fill: 'none',
                      stroke: 'currentColor',
                      strokeWidth: 2,
                      strokeLinecap: 'round',
                    },
                    React.createElement('path', {
                      d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
                    }),
                    React.createElement('path', { d: 'M14 2v6h6' })
                  ),
                  'Atender'
                ),
                React.createElement(
                  'button',
                  {
                    style: {
                      flex: 1,
                      padding: '8px',
                      fontFamily: "'Roboto', sans-serif",
                      fontWeight: 700,
                      fontSize: '12px',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      background: 'transparent',
                      color: T.ink2,
                      border: `1px solid ${T.border}`,
                    },
                    onClick: (e: any) => {
                      e.stopPropagation();
                      onAppointmentClick?.(appt);
                    },
                  },
                  'Ver detalle'
                )
              )
          );
        })
      )
    )
  );
}

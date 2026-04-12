import type { CalendarEvent } from '@coongro/calendar';
import { getHostReact } from '@coongro/plugin-sdk';

import type { Appointment, AppointmentStatus } from '../../types/appointment.js';
import {
  STATUS_LABELS,
  STATUS_BADGE_STYLES,
  STATUS_BLOCK_STYLES,
  STATUS_DOT_STYLES,
} from '../../utils/status.js';

const React = getHostReact();

interface AppointmentEventCardProps {
  event: CalendarEvent;
  appointment: Appointment | undefined;
}

export function AppointmentEventCard({ event, appointment }: AppointmentEventCardProps) {
  const status: AppointmentStatus = appointment?.status ?? 'scheduled';
  const blockStyle = STATUS_BLOCK_STYLES[status];
  const badgeStyle = STATUS_BADGE_STYLES[status];
  const dotStyle = STATUS_DOT_STYLES[status];

  const petName = appointment?.pet_name ?? event.title;
  const petBreed = appointment?.pet_breed ?? appointment?.pet_species ?? '';
  const vetName = appointment?.staff_name;
  const reason = appointment?.reason ?? event.description;

  return (
    <div
      style={{
        height: '100%',
        borderRadius: '7px',
        padding: '6px 10px',
        overflow: 'hidden',
        borderLeft: `3px solid ${blockStyle.borderLeftColor}`,
        background: blockStyle.background,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      {/* Badge */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span
          style={{
            fontSize: '9px',
            fontWeight: 600,
            padding: '1px 6px',
            borderRadius: '10px',
            ...badgeStyle,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              marginRight: '3px',
              verticalAlign: 'middle',
              ...dotStyle,
            }}
          />
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Paciente */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'var(--cg-text)',
        }}
      >
        {petName}
        {petBreed ? ` — ${petBreed}` : ''}
      </div>

      {/* Vet + motivo */}
      {(vetName || reason) && (
        <div
          style={{
            fontSize: '10px',
            color: 'var(--cg-text-tertiary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {vetName}
          {vetName && reason ? ' · ' : ''}
          {reason}
        </div>
      )}
    </div>
  );
}

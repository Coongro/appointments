import { formatEventTime, getDayName, getMonthName, useTenantTimezone } from '@coongro/calendar';
import { CreateConsultationButton } from '@coongro/consultations';
import type { ServiceLineInput } from '@coongro/consultations';
import { utcToLocal } from '@coongro/datetime';
import { SPECIES_ICON } from '@coongro/patients';
import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

import type { Appointment } from '../../types/appointment.js';
import { getInitials } from '../../utils/helpers.js';
import { CloseIcon, PersonIcon, ClockIcon } from '../../utils/icons.js';
import { STATUS_LABELS, STATUS_BADGE_STYLES, STATUS_DOT_STYLES } from '../../utils/status.js';

const React = getHostReact();

interface AppointmentSidebarProps {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onEdit: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onNoShow: (appointment: Appointment) => void;
  onAttendSuccess: (appointment: Appointment, consultationId: string) => void;
  onReschedule: (appointment: Appointment) => void;
}

export function AppointmentSidebar({
  open,
  appointment,
  onClose,
  onEdit,
  onCancel,
  onNoShow,
  onAttendSuccess,
  onReschedule,
}: AppointmentSidebarProps) {
  const UI = getHostUI();
  const tz = useTenantTimezone();

  const [consultationOpen, setConsultationOpen] = React.useState(false);

  if (!appointment) return null;

  const status = appointment.status;
  const pillStyle = STATUS_BADGE_STYLES[status] ?? STATUS_BADGE_STYLES.scheduled;
  const dotStyle = STATUS_DOT_STYLES[status] ?? STATUS_DOT_STYLES.scheduled;

  const startLocal = appointment.event_start_at ? utcToLocal(appointment.event_start_at, tz) : null;
  const startTime = appointment.event_start_at
    ? formatEventTime(appointment.event_start_at, tz)
    : '—';
  const endTime = appointment.event_end_at ? formatEventTime(appointment.event_end_at, tz) : '—';

  const dateLabel = startLocal
    ? `${getDayName(startLocal.toJSDate()).slice(0, 3)} ${String(startLocal.day).padStart(2, '0')} ${getMonthName(startLocal.month - 1)} ${startLocal.year}`
    : '—';

  const initials = appointment.staff_name ? getInitials(appointment.staff_name) : '??';

  return (
    <UI.Sheet
      open={open}
      onOpenChange={(v: boolean) => {
        if (!v) onClose();
      }}
    >
      <UI.SheetContent
        side="right"
        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <UI.SheetHeader>
          <UI.SheetTitle>Detalle del turno</UI.SheetTitle>
          <button
            onClick={onClose}
            style={{
              width: '24px',
              height: '24px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--cg-text-muted)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {CloseIcon}
          </button>
        </UI.SheetHeader>

        <UI.SheetBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Status pill */}
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 500,
                  ...pillStyle,
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', ...dotStyle }} />
                {STATUS_LABELS[status]}
              </span>
            </div>

            {/* Grupo: Paciente + Dueño */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SidebarSection label="Paciente">
                <SidebarRow
                  icon={
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--cg-teal-lt)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: 'var(--cg-teal-dk)',
                      }}
                    >
                      {React.createElement(UI.DynamicIcon, {
                        icon: SPECIES_ICON[appointment.pet_species ?? ''] ?? 'PawPrint',
                        size: 16,
                      })}
                    </div>
                  }
                  primary={appointment.pet_name ?? '—'}
                  secondary={
                    [appointment.pet_species, appointment.pet_breed].filter(Boolean).join(' · ') ||
                    undefined
                  }
                />
              </SidebarSection>

              <SidebarSection label="Dueño">
                <SidebarRow
                  icon={<SbIcon>{PersonIcon}</SbIcon>}
                  primary={appointment.contact_name}
                  secondary={
                    [appointment.contact_phone, appointment.contact_email]
                      .filter(Boolean)
                      .join(' · ') || undefined
                  }
                />
              </SidebarSection>
            </div>

            <div style={{ height: '1px', background: 'var(--cg-border)' }} />

            {/* Grupo: Horario + Veterinario */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SidebarSection label="Horario">
                <SidebarRow
                  icon={<SbIcon>{ClockIcon}</SbIcon>}
                  primary={`${startTime} – ${endTime}`}
                  secondary={dateLabel}
                />
              </SidebarSection>

              <SidebarSection label="Veterinario">
                <SidebarRow
                  icon={
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--cg-green-bg)',
                        color: 'var(--cg-green)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                  }
                  primary={appointment.staff_name ?? '—'}
                  secondary={appointment.staff_role ?? undefined}
                />
              </SidebarSection>
            </div>

            {/* Motivo + Notas */}
            {(appointment.reason || appointment.notes) && (
              <>
                <div style={{ height: '1px', background: 'var(--cg-border)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {appointment.reason && (
                    <SidebarSection label="Motivo">
                      <div
                        style={{
                          marginTop: '4px',
                          fontSize: '13px',
                          color: 'var(--cg-text-secondary)',
                          lineHeight: 1.5,
                        }}
                      >
                        {appointment.reason}
                      </div>
                    </SidebarSection>
                  )}

                  {appointment.notes && (
                    <SidebarSection label="Notas">
                      <div
                        style={{
                          marginTop: '4px',
                          padding: '10px 12px',
                          background: 'var(--cg-bg)',
                          borderRadius: '7px',
                          fontSize: '12px',
                          color: 'var(--cg-text-secondary)',
                          lineHeight: 1.5,
                        }}
                      >
                        {appointment.notes}
                      </div>
                    </SidebarSection>
                  )}
                </div>
              </>
            )}
          </div>
        </UI.SheetBody>

        {/* Footer: acciones */}
        {status === 'scheduled' && (
          <div
            style={{
              marginTop: 'auto',
              padding: '14px 20px',
              borderTop: '1px solid var(--cg-border)',
              background: 'var(--cg-bg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <button
              onClick={() => setConsultationOpen(true)}
              style={{
                width: '100%',
                padding: '12px',
                fontFamily: 'var(--cg-font-body)',
                fontWeight: 700,
                fontSize: '14px',
                borderRadius: '7px',
                cursor: 'pointer',
                textAlign: 'center',
                background: 'var(--cg-accent)',
                color: '#fff',
                border: 'none',
              }}
            >
              Atender — Abrir consulta
            </button>
            {React.createElement(CreateConsultationButton, {
              petId: appointment.pet_id ?? undefined,
              defaults: {
                staff_id: appointment.staff_id ?? undefined,
                vet_name: appointment.staff_name ?? '',
                reason: appointment.reason ?? '',
                services: (appointment.metadata as { services?: ServiceLineInput[] })?.services,
              },
              open: consultationOpen,
              onOpenChange: setConsultationOpen,
              onSuccess: (c: { id: string }) => {
                setConsultationOpen(false);
                onAttendSuccess(appointment, c.id);
                onClose();
              },
              onCancel: () => setConsultationOpen(false),
            })}
            <button
              onClick={() => onEdit(appointment)}
              style={{
                width: '100%',
                padding: '10px',
                fontFamily: 'var(--cg-font-body)',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '7px',
                cursor: 'pointer',
                textAlign: 'center',
                background: 'transparent',
                color: 'var(--cg-text-secondary)',
                border: '1px solid var(--cg-border)',
              }}
            >
              Editar turno
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onNoShow(appointment)}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontFamily: 'var(--cg-font-body)',
                  fontWeight: 500,
                  fontSize: '13px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  background: 'transparent',
                  color: 'var(--cg-text-muted)',
                  border: '1px solid var(--cg-border)',
                }}
              >
                No asistió
              </button>
              <button
                onClick={() => onCancel(appointment)}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontFamily: 'var(--cg-font-body)',
                  fontWeight: 500,
                  fontSize: '13px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  background: 'transparent',
                  color: 'var(--cg-danger)',
                  border: '1px solid transparent',
                }}
              >
                Cancelar turno
              </button>
            </div>
          </div>
        )}
        {status === 'no_show' && (
          <div
            style={{
              marginTop: 'auto',
              padding: '14px 20px',
              borderTop: '1px solid var(--cg-border)',
              background: 'var(--cg-bg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <button
              onClick={() => onReschedule(appointment)}
              style={{
                width: '100%',
                padding: '10px',
                fontFamily: 'var(--cg-font-body)',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '7px',
                cursor: 'pointer',
                textAlign: 'center',
                background: 'var(--cg-accent)',
                color: 'var(--cg-brand-text)',
                border: '1px solid var(--cg-accent)',
              }}
            >
              Reactivar turno
            </button>
          </div>
        )}
      </UI.SheetContent>
    </UI.Sheet>
  );
}

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: 'var(--cg-text-muted)',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function SidebarRow({
  icon,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
      {icon}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--cg-text)' }}>
          {primary}
        </span>
        {secondary && (
          <span style={{ fontSize: '11px', color: 'var(--cg-text-tertiary)' }}>{secondary}</span>
        )}
      </div>
    </div>
  );
}

function SbIcon({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: 'var(--cg-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: 'var(--cg-text-tertiary)',
      }}
    >
      {children}
    </div>
  );
}

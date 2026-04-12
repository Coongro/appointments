/**
 * AgendaView — Vista principal de la agenda de turnos.
 * Reutiliza CalendarView de @coongro/calendar con renderEvent custom
 * para mostrar cards de appointment con info veterinaria.
 * Referencia: design/agenda-day-desktop.html + design/agenda-day-mobile.html
 */
import { CalendarView, EventCard } from '@coongro/calendar';
import type { CalendarEvent, EventRenderContext } from '@coongro/calendar';
import { getHostReact, getHostUI, actions } from '@coongro/plugin-sdk';

import { useAppointmentMutations } from '../../hooks/useAppointmentMutations.js';
import { useAppointments } from '../../hooks/useAppointments.js';
import type { Appointment } from '../../types/appointment.js';
import { toCalendarEvents, buildAppointmentMap } from '../../utils/helpers.js';
import { STATUS_LABELS, STATUS_BADGE_STYLES } from '../../utils/status.js';

import { AppointmentScheduler } from './AppointmentScheduler.js';
import { AppointmentSidebar } from './AppointmentSidebar.js';

const React = getHostReact();
const { useState, useCallback, useMemo } = React;

export function AgendaView() {
  const UI = getHostUI();

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [schedulerDefaults, setSchedulerDefaults] = useState<{ date?: string; hour?: number }>({});
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});
  const { updateStatus, update } = useAppointmentMutations();

  // Cargar appointments del rango visible
  const { data: appointments, refetch } = useAppointments({
    orderBy: 'date',
    orderDir: 'asc',
    pageSize: 200,
    ...dateRange,
  });

  const handleDateRangeChange = useCallback((from: string, to: string) => {
    setDateRange({ from, to });
  }, []);

  // Lookup rapido de appointment por id (usamos el appointment.id como event.id)
  const appointmentMap = useMemo(() => buildAppointmentMap(appointments), [appointments]);

  // Handlers
  const handleEventClick = useCallback(
    (evt: CalendarEvent) => {
      const appt = appointmentMap.get(evt.id);
      if (appt) {
        setSelectedAppointment((prev) => (prev?.id === appt.id ? null : appt));
      }
    },
    [appointmentMap]
  );

  const handleCloseSidebar = useCallback(() => {
    setSelectedAppointment(null);
  }, []);

  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const handleEditAppointment = useCallback((appt: Appointment) => {
    setSelectedAppointment(null);
    setEditingAppointment(appt);
    setSchedulerOpen(true);
  }, []);

  const [confirmCancel, setConfirmCancel] = useState<Appointment | null>(null);

  const handleCancelAppointment = useCallback((appt: Appointment) => {
    setConfirmCancel(appt);
  }, []);

  const handleConfirmCancel = useCallback(async () => {
    if (!confirmCancel) return;
    const result = await updateStatus(confirmCancel.id, 'cancelled');
    if (result && confirmCancel.calendar_event_id) {
      // Cancelar también el evento de calendario
      await actions
        .execute('calendar.events.update', {
          id: confirmCancel.calendar_event_id,
          data: { status: 'cancelled' },
        })
        .catch(() => {});
    }
    if (result) {
      setSelectedAppointment(null);
      setConfirmCancel(null);
      void refetch();
    }
  }, [confirmCancel, updateStatus, refetch]);

  const [confirmNoShow, setConfirmNoShow] = useState<Appointment | null>(null);

  const handleNoShow = useCallback((appt: Appointment) => {
    setConfirmNoShow(appt);
  }, []);

  const handleConfirmNoShow = useCallback(async () => {
    if (!confirmNoShow) return;
    const result = await updateStatus(confirmNoShow.id, 'no_show');
    if (result) {
      setSelectedAppointment(null);
      setConfirmNoShow(null);
      void refetch();
    }
  }, [confirmNoShow, updateStatus, refetch]);

  const handleAttendSuccess = useCallback(
    (appt: Appointment, consultationId: string) => {
      void update(appt.id, { status: 'completed', consultation_id: consultationId }).then(() => {
        void refetch();
      });
    },
    [update, refetch]
  );

  const handleReschedule = useCallback(
    (appt: Appointment) => {
      void updateStatus(appt.id, 'scheduled').then((result) => {
        if (result) {
          setSelectedAppointment(null);
          void refetch();
        }
      });
    },
    [updateStatus, refetch]
  );

  const handleNewAppointment = useCallback(() => {
    setEditingAppointment(null);
    setSchedulerDefaults({});
    setSchedulerOpen(true);
  }, []);

  const handleSchedulerSuccess = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Render custom de cada evento — reutiliza EventCard de calendar
  // con subtitle (veterinario + motivo) y badge (estado del turno)
  const renderEvent = useCallback(
    (evt: CalendarEvent, context?: EventRenderContext) => {
      const appt = appointmentMap.get(evt.id);
      if (!appt) return null;

      const status = appt.status;

      const subtitle =
        appt.staff_name || appt.reason
          ? React.createElement(
              'div',
              {
                style: {
                  fontSize: '10px',
                  color: 'var(--cg-text-tertiary)',
                  marginTop: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              },
              [appt.staff_name, appt.reason].filter(Boolean).join(' · ')
            )
          : undefined;

      const badge = React.createElement(
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
      );

      const variant = context?.variant ?? 'standard';
      const isSmall = variant === 'compact' || variant === 'week';

      return React.createElement(EventCard, {
        event: evt,
        variant,
        showTime: true,
        showStatus: false,
        subtitle: isSmall ? undefined : subtitle,
        badge: isSmall ? undefined : badge,
        onClick: handleEventClick,
      });
    },
    [appointmentMap, handleEventClick]
  );

  // Boton "Nuevo turno" como extraToolbarAction
  const newAppointmentButton = React.createElement(
    UI.Button,
    {
      variant: 'brand',
      size: 'sm',
      onClick: handleNewAppointment,
    },
    '+ Nuevo turno'
  );

  // Mapear appointments a CalendarEvent[] para CalendarView
  const events = useMemo(() => toCalendarEvents(appointments), [appointments]);

  return React.createElement(
    'div',
    { style: { height: '100%', display: 'flex', overflow: 'hidden' } },

    // CalendarView con renderEvent custom
    React.createElement(
      'div',
      { style: { flex: 1, minWidth: 0 } },
      React.createElement(CalendarView, {
        enabledViews: ['day', 'week', 'agenda'],
        defaultView: 'day',
        title: 'Agenda',
        daySlotHeight: 40,
        events,
        skipInternalEvents: true,
        renderEvent,
        extraToolbarActions: newAppointmentButton,
        onEventClick: handleEventClick,
        onDateRangeChange: handleDateRangeChange,
      })
    ),

    // Sidebar Sheet
    React.createElement(AppointmentSidebar, {
      open: selectedAppointment !== null,
      appointment: selectedAppointment,
      onClose: handleCloseSidebar,
      onEdit: handleEditAppointment,
      onCancel: handleCancelAppointment,
      onNoShow: handleNoShow,
      onAttendSuccess: handleAttendSuccess,
      onReschedule: handleReschedule,
    }),

    // Diálogo de confirmación para cancelar
    confirmCancel &&
      React.createElement(UI.FormDialog, {
        open: true,
        onOpenChange: (v: boolean) => {
          if (!v) setConfirmCancel(null);
        },
        title: 'Cancelar turno',
        size: 'sm',
        children: React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
          React.createElement(
            'p',
            { style: { fontSize: '14px', color: 'var(--cg-text-secondary)' } },
            `¿Estás seguro de cancelar el turno de ${confirmCancel.pet_name ?? '—'} (${confirmCancel.event_start_at ? new Date(confirmCancel.event_start_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '—'})?`
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
            React.createElement(
              UI.Button,
              { variant: 'ghost', onClick: () => setConfirmCancel(null) },
              'No, volver'
            ),
            React.createElement(
              UI.Button,
              { variant: 'destructive', onClick: () => void handleConfirmCancel() },
              'Sí, cancelar turno'
            )
          )
        ),
      }),

    // Diálogo de confirmación para no asistió
    confirmNoShow &&
      React.createElement(UI.FormDialog, {
        open: true,
        onOpenChange: (v: boolean) => {
          if (!v) setConfirmNoShow(null);
        },
        title: 'Marcar como no asistió',
        size: 'sm',
        children: React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
          React.createElement(
            'p',
            { style: { fontSize: '14px', color: 'var(--cg-text-secondary)' } },
            `¿Marcar el turno de ${confirmNoShow.pet_name ?? '—'} (${confirmNoShow.event_start_at ? new Date(confirmNoShow.event_start_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '—'}) como no asistió?`
          ),
          React.createElement(
            'div',
            { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
            React.createElement(
              UI.Button,
              { variant: 'ghost', onClick: () => setConfirmNoShow(null) },
              'No, volver'
            ),
            React.createElement(
              UI.Button,
              { variant: 'destructive', onClick: () => void handleConfirmNoShow() },
              'Sí, no asistió'
            )
          )
        ),
      }),

    // Scheduler dialog
    React.createElement(AppointmentScheduler, {
      open: schedulerOpen,
      onClose: () => {
        setSchedulerOpen(false);
        setEditingAppointment(null);
      },
      onSuccess: handleSchedulerSuccess,
      defaultDate: schedulerDefaults.date,
      defaultHour: schedulerDefaults.hour,
      editAppointment: editingAppointment,
    })
  );
}

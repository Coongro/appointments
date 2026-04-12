/**
 * AppointmentScheduler — FormDialog para agendar/editar turnos.
 * Reutiliza PetPicker (@coongro/patients), StaffPicker (@coongro/staff),
 * DatePicker y TimePicker (@coongro/calendar).
 * Referencia: design/scheduler-desktop.html
 */
import { DatePicker, TimePicker, toDateString } from '@coongro/calendar';
import { useContact } from '@coongro/contacts';
import { PetPicker, SPECIES_ICON, formatSpecies } from '@coongro/patients';
import type { Pet } from '@coongro/patients';
import { getHostReact, getHostUI, usePlugin, actions } from '@coongro/plugin-sdk';
import { StaffPicker } from '@coongro/staff';
import type { StaffMember } from '@coongro/staff';

import { useAppointmentMutations } from '../../hooks/useAppointmentMutations.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import type { Appointment } from '../../types/appointment.js';
import { getInitials } from '../../utils/helpers.js';

const React = getHostReact();
const { useState, useCallback, useEffect } = React;

// Categorias de motivo de consulta (veterinaria)
const REASON_CATEGORIES = [
  { value: 'vaccination', label: 'Vacunacion' },
  { value: 'checkup', label: 'Control' },
  { value: 'surgery', label: 'Cirugia' },
  { value: 'grooming', label: 'Peluqueria' },
  { value: 'emergency', label: 'Urgencia' },
  { value: 'deworming', label: 'Desparasitacion' },
  { value: 'dental', label: 'Odontologia' },
  { value: 'imaging', label: 'Estudios' },
  { value: 'other', label: 'Otro' },
];

interface SchedulerProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultDate?: string;
  defaultHour?: number;
  /** Appointment existente para modo edición */
  editAppointment?: Appointment | null;
}

export function AppointmentScheduler({
  open,
  onClose,
  onSuccess,
  defaultDate,
  defaultHour,
  editAppointment,
}: SchedulerProps) {
  const UI = getHostUI();
  const { toast } = usePlugin();
  const isMobile = useIsMobile();
  const { create, update, creating, updating } = useAppointmentMutations();
  const isEditing = !!editAppointment;

  // Form state
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [ownerContactId, setOwnerContactId] = useState<string | null>(null);
  const [date, setDate] = useState(defaultDate ?? toDateString(new Date()));
  const [startTime, setStartTime] = useState(
    defaultHour !== null ? `${String(defaultHour).padStart(2, '0')}:00` : '09:00'
  );
  const [endTime, setEndTime] = useState(
    defaultHour !== null ? `${String(defaultHour).padStart(2, '0')}:30` : '09:30'
  );
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Resolver dueno: Pet.owner_id → VetOwner.contact_id → Contact
  useEffect(() => {
    if (!selectedPet?.owner_id) {
      setOwnerContactId(null);
      return;
    }
    // VetOwner tiene contact_id que apunta a Contact
    void actions
      .execute<{ contact_id?: string }>('patients.owners.getById', { id: selectedPet.owner_id })
      .then((vetOwner) => {
        if (vetOwner?.contact_id) setOwnerContactId(vetOwner.contact_id);
      })
      .catch(() => setOwnerContactId(null));
  }, [selectedPet?.owner_id]);

  // Hook de contacts para obtener nombre/telefono del dueno
  const { contact: ownerContact } = useContact(ownerContactId);

  // Reset cuando se abre — precargar datos en modo edición
  useEffect(() => {
    if (!open) return;
    if (editAppointment) {
      // Modo edición: precargar datos del appointment
      const startAt = editAppointment.event_start_at;
      const endAt = editAppointment.event_end_at;
      if (startAt) {
        const d = new Date(startAt);
        setDate(toDateString(d));
        setStartTime(
          `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        );
      }
      if (endAt) {
        const d = new Date(endAt);
        setEndTime(
          `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        );
      }
      // reason puede ser "Categoria: detalle" — separar
      const parts = editAppointment.reason?.split(': ') ?? [];
      const matchedCat = REASON_CATEGORIES.find((c) => c.label === parts[0]);
      setCategory(matchedCat?.value ?? '');
      setReason(matchedCat ? parts.slice(1).join(': ') : (editAppointment.reason ?? ''));
      setNotes(editAppointment.notes ?? '');

      // Fetchear pet y staff completos para mostrar las cards visuales
      if (editAppointment.pet_id) {
        void actions
          .execute<Pet>('patients.pets.getById', { id: editAppointment.pet_id })
          .then((pet) => {
            if (pet) setSelectedPet(pet);
          })
          .catch(() => {});
      }
      if (editAppointment.staff_id) {
        void actions
          .execute<StaffMember>('staff.members.getById', { id: editAppointment.staff_id })
          .then((member) => {
            if (member) setSelectedStaff(member);
          })
          .catch(() => {});
      }
      if (editAppointment.contact_id) {
        setOwnerContactId(editAppointment.contact_id);
      }
    } else {
      // Modo creación: limpiar todo
      setSelectedPet(null);
      setSelectedStaff(null);
      setOwnerContactId(null);
      setCategory('');
      setReason('');
      setNotes('');
      setDate(defaultDate ?? toDateString(new Date()));
      if (defaultHour !== null) {
        setStartTime(`${String(defaultHour).padStart(2, '0')}:00`);
        setEndTime(`${String(defaultHour).padStart(2, '0')}:30`);
      }
    }
  }, [open, defaultDate, defaultHour, editAppointment]);

  const handlePetChange = useCallback((pet: Pet | null) => {
    setSelectedPet(pet);
    if (!pet) setOwnerContactId(null);
  }, []);

  const handleStaffChange = useCallback((member: StaffMember | null) => {
    setSelectedStaff(member);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedPet) return;

    const fullReason = [
      category ? REASON_CATEGORIES.find((c) => c.value === category)?.label : null,
      reason,
    ]
      .filter(Boolean)
      .join(': ');

    const eventTitle = [selectedPet.name, fullReason].filter(Boolean).join(' — ') || 'Turno';
    const startAt = new Date(`${date}T${startTime}:00`).toISOString();
    const endAt = new Date(`${date}T${endTime}:00`).toISOString();

    if (isEditing && editAppointment) {
      // Modo edición: actualizar evento de calendario + appointment
      if (editAppointment.calendar_event_id) {
        try {
          await actions.execute('calendar.events.update', {
            id: editAppointment.calendar_event_id,
            data: { title: eventTitle, start_at: startAt, end_at: endAt },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'No se pudo actualizar el evento';
          toast.error('Error', msg);
          return;
        }
      }

      const result = await update(editAppointment.id, {
        contact_id: ownerContactId ?? selectedPet.owner_id,
        pet_id: selectedPet.id,
        staff_id: selectedStaff?.id ?? null,
        reason: fullReason || null,
        notes: notes || null,
      });

      if (result) {
        onSuccess?.();
        onClose();
      }
    } else {
      // Modo creación: crear evento de calendario + appointment
      let calendarEventId: string | null = null;
      try {
        const eventResult = await actions.execute<{ id: string }[]>('calendar.events.create', {
          data: {
            title: eventTitle,
            start_at: startAt,
            end_at: endAt,
            status: 'confirmed',
          },
        });
        calendarEventId = eventResult?.[0]?.id ?? null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo crear el evento';
        toast.error('Error', msg);
        return;
      }

      const result = await create({
        contact_id: ownerContactId ?? selectedPet.owner_id,
        pet_id: selectedPet.id,
        staff_id: selectedStaff?.id ?? null,
        reason: fullReason || null,
        notes: notes || null,
        calendar_event_id: calendarEventId,
      });

      if (result) {
        setSelectedPet(null);
        setSelectedStaff(null);
        setOwnerContactId(null);
        setCategory('');
        setReason('');
        setNotes('');
        onSuccess?.();
        onClose();
      }
    }
  }, [
    selectedPet,
    ownerContactId,
    selectedStaff,
    category,
    reason,
    notes,
    date,
    startTime,
    endTime,
    create,
    update,
    isEditing,
    editAppointment,
    onSuccess,
    onClose,
  ]);

  // ── Helpers ──

  const sectionLabel = (iconName: string, text: string) =>
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '10px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          color: 'var(--cg-text-muted)',
        },
      },
      React.createElement(UI.DynamicIcon, { icon: iconName, size: 12 }),
      text
    );

  const floatingField = (label: string, content: ReturnType<typeof React.createElement>) =>
    React.createElement(
      'div',
      { style: { position: 'relative' } },
      React.createElement(
        'label',
        {
          style: {
            position: 'absolute',
            top: '8px',
            left: '13px',
            fontSize: '10px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--cg-text-muted)',
            zIndex: 1,
            pointerEvents: 'none',
          },
        },
        label
      ),
      content
    );

  const pickerCard = (
    avatar: ReturnType<typeof React.createElement>,
    name: string,
    subtitle: string,
    onClear: () => void
  ) =>
    React.createElement(
      'div',
      {
        style: {
          width: '100%',
          padding: '26px 13px 10px',
          background: 'var(--cg-surface)',
          border: '1px solid var(--cg-border)',
          borderRadius: '7px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minHeight: '56px',
        },
      },
      avatar,
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 } },
        React.createElement(
          'span',
          {
            style: {
              fontSize: '14px',
              fontWeight: '500',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--cg-text)',
            },
          },
          name
        ),
        subtitle &&
          React.createElement(
            'span',
            {
              style: { fontSize: '11px', color: 'var(--cg-text-tertiary)' },
            },
            subtitle
          )
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          style: {
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: 'none',
            background: 'var(--cg-bg)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cg-text-muted)',
            fontSize: '12px',
            flexShrink: 0,
          },
          onClick: (e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            onClear();
          },
        },
        '\u00D7'
      )
    );

  const petAvatar = (species: string) =>
    React.createElement(
      'div',
      {
        style: {
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--cg-teal-lt)',
          color: 'var(--cg-teal-dk)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        },
      },
      React.createElement(UI.DynamicIcon, { icon: SPECIES_ICON[species] ?? 'PawPrint', size: 16 })
    );

  const staffAvatar = (name: string) => {
    const initials = getInitials(name);
    return React.createElement(
      'div',
      {
        style: {
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--cg-green-bg)',
          color: 'var(--cg-green)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: '700',
          flexShrink: 0,
        },
      },
      initials
    );
  };

  const petSubtitle = (pet: Pet) =>
    [formatSpecies(pet.species), pet.breed, pet.birth_date ? `${pet.birth_date}` : null]
      .filter(Boolean)
      .join(' · ');

  const staffSubtitle = (member: StaffMember) =>
    [member.specialty ?? member.role].filter(Boolean).join(' · ') || '';

  const dateTimeGrid = isMobile ? '1fr' : '1fr 1fr 1fr';
  const reasonGrid = isMobile ? '1fr' : '1fr 1fr';

  // ── Body ──
  const body = React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: '18px' } },

    // ── 1. Paciente ──
    sectionLabel('PawPrint', 'Paciente'),
    selectedPet
      ? floatingField(
          'Mascota',
          pickerCard(
            petAvatar(selectedPet.species),
            selectedPet.name,
            petSubtitle(selectedPet),
            () => handlePetChange(null)
          )
        )
      : floatingField(
          'Mascota',
          React.createElement(
            'div',
            { style: { paddingTop: '22px' } },
            React.createElement(PetPicker, {
              value: selectedPet?.id ?? editAppointment?.pet_id ?? null,
              onChange: handlePetChange,
              placeholder: 'Buscar mascota...',
            })
          )
        ),

    // Auto-fill del dueno
    ownerContact &&
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: 'var(--cg-bg)',
            borderRadius: '7px',
            fontSize: '12px',
            color: 'var(--cg-text-tertiary)',
          },
        },
        React.createElement(UI.DynamicIcon, { icon: 'User', size: 13 }),
        'Dueno: ',
        React.createElement(
          'strong',
          {
            style: { color: 'var(--cg-text-secondary)', fontWeight: '500' },
          },
          ownerContact.name
        ),
        ownerContact.phone && ` · ${ownerContact.phone}`
      ),

    // ── 2. Veterinario ──
    sectionLabel('Stethoscope', 'Veterinario'),
    selectedStaff
      ? floatingField(
          'Profesional',
          pickerCard(
            staffAvatar(selectedStaff.contact_name),
            selectedStaff.contact_name,
            staffSubtitle(selectedStaff),
            () => handleStaffChange(null)
          )
        )
      : floatingField(
          'Profesional',
          React.createElement(
            'div',
            { style: { paddingTop: '22px' } },
            React.createElement(StaffPicker, {
              value: selectedStaff?.id ?? editAppointment?.staff_id ?? null,
              onChange: handleStaffChange,
              placeholder: 'Buscar profesional...',
            })
          )
        ),

    // ── 3. Fecha y hora ──
    sectionLabel('Clock', 'Fecha y hora'),
    React.createElement(
      'div',
      { style: { display: 'grid', gridTemplateColumns: dateTimeGrid, gap: '12px' } },
      floatingField(
        'Fecha',
        React.createElement(
          'div',
          { style: { paddingTop: '22px' } },
          React.createElement(DatePicker, { value: date, onChange: (d: string) => setDate(d) })
        )
      ),
      floatingField(
        'Inicio',
        React.createElement(
          'div',
          { style: { paddingTop: '22px' } },
          React.createElement(TimePicker, {
            value: startTime,
            onChange: (t: string) => {
              setStartTime(t);
              const [h, m] = t.split(':').map(Number);
              const endMin = h * 60 + m + 30;
              setEndTime(
                `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
              );
            },
          })
        )
      ),
      floatingField(
        'Fin',
        React.createElement(
          'div',
          { style: { paddingTop: '22px' } },
          React.createElement(TimePicker, {
            value: endTime,
            onChange: (t: string) => setEndTime(t),
          })
        )
      )
    ),

    // ── 4. Motivo ──
    sectionLabel('FileText', 'Motivo'),
    React.createElement(
      'div',
      { style: { display: 'grid', gridTemplateColumns: reasonGrid, gap: '12px' } },
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          {
            style: {
              fontSize: '12px',
              fontWeight: '500',
              color: 'var(--cg-text-secondary)',
              display: 'block',
              marginBottom: '4px',
            },
          },
          'Categoria'
        ),
        React.createElement(
          UI.Select,
          {
            value: category,
            onValueChange: (v: string) => setCategory(v),
            placeholder: 'Seleccionar',
          },
          ...REASON_CATEGORIES.map((c) =>
            React.createElement(UI.SelectItem, { key: c.value, value: c.value }, c.label)
          )
        )
      ),
      React.createElement(
        'div',
        null,
        React.createElement(
          'label',
          {
            style: {
              fontSize: '12px',
              fontWeight: '500',
              color: 'var(--cg-text-secondary)',
              display: 'block',
              marginBottom: '4px',
            },
          },
          'Detalle (opcional)'
        ),
        React.createElement(UI.Input, {
          value: reason,
          onChange: (e: { target: { value: string } }) => setReason(e.target.value),
          placeholder: 'Ej: Triple felina',
        })
      )
    ),

    // ── 5. Notas ──
    sectionLabel('StickyNote', 'Notas'),
    React.createElement(
      'div',
      null,
      React.createElement(
        'label',
        {
          style: {
            fontSize: '12px',
            fontWeight: '500',
            color: 'var(--cg-text-secondary)',
            display: 'block',
            marginBottom: '4px',
          },
        },
        'Notas (opcional)'
      ),
      React.createElement(UI.Textarea, {
        value: notes,
        onChange: (e: { target: { value: string } }) => setNotes(e.target.value),
        placeholder: 'Observaciones para el dia del turno...',
        rows: 3,
      })
    )
  );

  const footer = React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: isMobile ? 'column-reverse' : 'row',
        justifyContent: 'flex-end',
        gap: '8px',
      },
    },
    React.createElement(
      UI.Button,
      { variant: 'ghost', onClick: onClose, disabled: creating || updating },
      'Cancelar'
    ),
    React.createElement(
      UI.Button,
      {
        variant: 'brand',
        onClick: () => void handleSubmit(),
        disabled: creating || updating || !selectedPet,
      },
      creating || updating
        ? isEditing
          ? 'Guardando...'
          : 'Agendando...'
        : isEditing
          ? 'Guardar cambios'
          : 'Agendar turno'
    )
  );

  return React.createElement(UI.FormDialog, {
    open,
    onOpenChange: (isOpen: boolean) => {
      if (!isOpen) onClose();
    },
    title: isEditing ? 'Editar turno' : 'Agendar turno',
    children: body,
    footer,
    size: 'md',
  });
}

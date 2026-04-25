/**
 * AppointmentScheduler — FormDialog para agendar/editar turnos.
 * Reutiliza PetPicker (@coongro/patients), StaffPicker (@coongro/staff),
 * DatePicker y TimePicker (@coongro/calendar).
 * Referencia: design/scheduler-desktop.html
 */
import { DatePicker, TimePicker, toDateString, useTenantTimezone } from '@coongro/calendar';
import { ServiceLineForm, ROOT_SERVICE_CATEGORY_SLUG } from '@coongro/consultations';
import type { ServiceLineInput } from '@coongro/consultations';
import { useContact } from '@coongro/contacts';
import { formatLocalTime, localToUTC, toDateKey } from '@coongro/datetime';
import { PetPicker, SPECIES_ICON, formatSpecies } from '@coongro/patients';
import type { Pet } from '@coongro/patients';
import { getHostReact, getHostUI, usePlugin, actions, settings } from '@coongro/plugin-sdk';
import type { Product, Category } from '@coongro/products';
import { StaffPicker } from '@coongro/staff';
import type { StaffMember } from '@coongro/staff';

import { useAppointmentMutations } from '../../hooks/useAppointmentMutations.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import type { Appointment } from '../../types/appointment.js';
import { getInitials } from '../../utils/helpers.js';

const React = getHostReact();
const { useState, useCallback, useEffect, useRef, useMemo } = React;

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
  const tz = useTenantTimezone();
  const { create, update, creating, updating } = useAppointmentMutations();
  const isEditing = !!editAppointment;

  // Form state
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [ownerContactId, setOwnerContactId] = useState<string | null>(null);
  const [date, setDate] = useState(defaultDate ?? toDateString(new Date()));
  const [startTime, setStartTime] = useState(
    defaultHour !== null && defaultHour !== undefined
      ? `${String(defaultHour).padStart(2, '0')}:00`
      : '09:00'
  );
  const [endTime, setEndTime] = useState(
    defaultHour !== null && defaultHour !== undefined
      ? `${String(defaultHour).padStart(2, '0')}:30`
      : '09:30'
  );
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [serviceLines, setServiceLines] = useState<ServiceLineInput[]>([]);
  const [serviceCatalog, setServiceCatalog] = useState<Product[]>([]);
  const [serviceCategories, setServiceCategories] = useState<Category[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const catalogLoadedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-rellenar motivo desde servicios seleccionados
  const reasonAutoRef = useRef(true);
  useEffect(() => {
    if (!reasonAutoRef.current) return;
    const names = serviceLines
      .filter((s) => s.product_name.trim())
      .map((s) => s.product_name.trim());
    setReason(names.join(', '));
  }, [serviceLines]);

  const handleReasonChange = useCallback((e: { target: { value: string } }) => {
    reasonAutoRef.current = false;
    setReason(e.target.value);
  }, []);

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

  // Cargar catalogo de servicios
  useEffect(() => {
    if (catalogLoadedRef.current) return;
    catalogLoadedRef.current = true;
    void (async () => {
      try {
        const cats = await actions.execute<Category[]>('products.categories.listTree');
        setServiceCategories(cats);
        const root = cats.find((c: Category) => c.slug === ROOT_SERVICE_CATEGORY_SLUG);
        if (!root) {
          setCatalogLoading(false);
          return;
        }
        const serviceIds = new Set<string>([
          root.id,
          ...cats.filter((c: Category) => c.parent_id === root.id).map((c: Category) => c.id),
        ]);
        const all = await actions.execute<Product[]>('products.items.search', {
          limit: 300,
          isActive: true,
        });
        setServiceCatalog(all.filter((p: Product) => serviceIds.has(p.category_id ?? '')));
      } catch {
        /* Sin catalogo */
      } finally {
        setCatalogLoading(false);
      }
    })();
  }, []);

  const serviceSubcategories = useMemo(() => {
    const root = serviceCategories.find((c: Category) => c.slug === ROOT_SERVICE_CATEGORY_SLUG);
    if (!root) return [];
    return serviceCategories.filter((c: Category) => c.parent_id === root.id);
  }, [serviceCategories]);

  const handleProductCreated = useCallback((product: Product) => {
    setServiceCatalog((prev) => [...prev, product]);
  }, []);

  // Reset cuando se abre — precargar datos en modo edición
  useEffect(() => {
    if (!open) return;
    if (editAppointment) {
      // Modo edición: precargar datos del appointment
      const startAt = editAppointment.event_start_at;
      const endAt = editAppointment.event_end_at;
      if (startAt) {
        setDate(toDateKey(startAt, tz));
        setStartTime(formatLocalTime(startAt, tz));
      }
      if (endAt) {
        setEndTime(formatLocalTime(endAt, tz));
      }
      setReason(editAppointment.reason ?? '');
      // Cargar servicios desde metadata
      const meta = editAppointment.metadata as { services?: ServiceLineInput[] } | null;
      setServiceLines(meta?.services ?? []);
      reasonAutoRef.current = false;
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
      setReason('');
      setNotes('');
      setServiceLines([]);
      reasonAutoRef.current = true;
      setDate(defaultDate ?? toDateString(new Date()));
      if (defaultHour !== null && defaultHour !== undefined) {
        setStartTime(`${String(defaultHour).padStart(2, '0')}:00`);
        setEndTime(`${String(defaultHour).padStart(2, '0')}:30`);
      }
      // Preseleccionar veterinario predeterminado desde el setting
      let cancelled = false;
      void (async () => {
        try {
          const raw = await settings.getAll('consultations.');
          const defaultStaffId = (raw['consultations.defaultStaffId'] as string) || '';
          if (cancelled || !defaultStaffId) return;
          const member = await actions.execute<StaffMember>('staff.members.getById', {
            id: defaultStaffId,
          });
          if (cancelled || !member) return;
          setSelectedStaff(member);
        } catch {
          // Setting no disponible o staff inexistente
        }
      })();
      return () => {
        cancelled = true;
      };
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
    // Validación nativa: dispara tooltip apuntando al primer campo requerido vacío
    if (!formRef.current?.reportValidity()) return;
    if (!selectedPet || !selectedStaff) return;

    const eventTitle = [selectedPet.name, reason].filter(Boolean).join(' — ') || 'Turno';
    const validServices = serviceLines.filter((s) => s.product_name.trim());
    const startAt = localToUTC(date, startTime, tz);
    const endAt = localToUTC(date, endTime, tz);

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
        staff_id: selectedStaff.id,
        reason: reason || null,
        notes: notes || null,
        metadata: validServices.length > 0 ? { services: validServices } : null,
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
        staff_id: selectedStaff.id,
        reason: reason || null,
        notes: notes || null,
        calendar_event_id: calendarEventId,
        metadata: validServices.length > 0 ? { services: validServices } : null,
      });

      if (result) {
        setSelectedPet(null);
        setSelectedStaff(null);
        setOwnerContactId(null);
        setReason('');
        setNotes('');
        setServiceLines([]);
        onSuccess?.();
        onClose();
      }
    }
  }, [
    selectedPet,
    ownerContactId,
    selectedStaff,
    reason,
    serviceLines,
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

  // Input espejo invisible para validación nativa "required" sobre pickers
  const requiredMirror = (value: string, label: string) =>
    React.createElement('input', {
      type: 'text',
      tabIndex: -1,
      required: true,
      'aria-label': label,
      value,
      onChange: () => {},
      style: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '1px',
        opacity: 0,
        pointerEvents: 'none',
      },
    });

  // ── Body ──
  const body = React.createElement(
    'form',
    {
      ref: formRef,
      onSubmit: (e: React.FormEvent) => e.preventDefault(),
      style: { display: 'flex', flexDirection: 'column', gap: '18px' },
    },

    // ── 1. Paciente ──
    sectionLabel('PawPrint', 'Paciente'),
    React.createElement(
      'div',
      { style: { position: 'relative' } },
      selectedPet
        ? floatingField(
            'Mascota *',
            pickerCard(
              petAvatar(selectedPet.species),
              selectedPet.name,
              petSubtitle(selectedPet),
              () => handlePetChange(null)
            )
          )
        : floatingField(
            'Mascota *',
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
      requiredMirror(selectedPet?.id ?? '', 'Mascota')
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
    React.createElement(
      'div',
      { style: { position: 'relative' } },
      selectedStaff
        ? floatingField(
            'Profesional *',
            pickerCard(
              staffAvatar(selectedStaff.contact_name),
              selectedStaff.contact_name,
              staffSubtitle(selectedStaff),
              () => handleStaffChange(null)
            )
          )
        : floatingField(
            'Profesional *',
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
      requiredMirror(selectedStaff?.id ?? '', 'Profesional')
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
        'Motivo de la consulta'
      ),
      React.createElement(UI.Input, {
        value: reason,
        onChange: handleReasonChange,
        placeholder: 'Ej: Control anual, vacunacion, urgencia...',
      })
    ),

    // ── 4b. Servicios ──
    sectionLabel('Receipt', 'Servicios'),
    React.createElement(
      'div',
      {
        style: {
          border: '1px solid var(--cg-border)',
          borderRadius: '7px',
          padding: '12px',
          background: 'var(--cg-surface)',
        },
      },
      React.createElement(ServiceLineForm, {
        services: serviceLines,
        onChange: setServiceLines,
        catalog: serviceCatalog,
        categories: serviceSubcategories,
        catalogLoading,
        onProductCreated: handleProductCreated,
        showPrices: true,
      })
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
        disabled: creating || updating,
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

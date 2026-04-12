/**
 * Tipos de dominio para appointments.
 * Los datos de contacto y staff vienen de los plugins vinculados.
 */

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  calendar_event_id: string | null;
  contact_id: string;
  pet_id: string | null;
  staff_id: string | null;
  consultation_id: string | null;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Datos resueltos del contacto (dueño)
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  // Datos resueltos del paciente (mascota)
  pet_name: string | null;
  pet_species: string | null;
  pet_breed: string | null;
  // Datos resueltos del staff (profesional)
  staff_name: string | null;
  staff_role: string | null;
  // Datos resueltos del evento de calendario
  event_start_at: string | null;
  event_end_at: string | null;
  event_title: string | null;
}

export interface AppointmentCreateData {
  calendar_event_id?: string | null;
  consultation_id?: string | null;
  contact_id: string;
  pet_id?: string | null;
  staff_id?: string | null;
  status?: AppointmentStatus;
  reason?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type AppointmentUpdateData = Partial<AppointmentCreateData>;

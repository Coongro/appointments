/**
 * Tipos de dominio para appointments.
 * Los datos de contacto y staff vienen de los plugins vinculados.
 */
import type { UTCTimestamp } from '@coongro/datetime';

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
  created_at: UTCTimestamp;
  updated_at: UTCTimestamp;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  pet_name: string | null;
  pet_species: string | null;
  pet_breed: string | null;
  staff_name: string | null;
  staff_role: string | null;
  event_start_at: UTCTimestamp | null;
  event_end_at: UTCTimestamp | null;
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

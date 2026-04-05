/**
 * Hook para operaciones de mutación de turnos (crear, editar, cambiar estado, eliminar).
 */
import { getHostReact, actions, usePlugin } from '@coongro/plugin-sdk';

import type {
  Appointment,
  AppointmentCreateData,
  AppointmentUpdateData,
  AppointmentStatus,
} from '../types/appointment.js';

const React = getHostReact();
const { useState, useCallback } = React;

export interface UseAppointmentMutationsResult {
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  create: (data: AppointmentCreateData) => Promise<Appointment | null>;
  update: (id: string, data: AppointmentUpdateData) => Promise<Appointment | null>;
  updateStatus: (id: string, status: AppointmentStatus) => Promise<Appointment | null>;
  remove: (id: string) => Promise<boolean>;
}

export function useAppointmentMutations(): UseAppointmentMutationsResult {
  const { toast } = usePlugin();
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const create = useCallback(
    async (data: AppointmentCreateData): Promise<Appointment | null> => {
      setCreating(true);
      try {
        const result = await actions.execute<Appointment[]>('appointments.create', { data });
        toast.success('Turno agendado', '');
        return result[0] ?? null;
      } catch (err) {
        toast.error('Error', err instanceof Error ? err.message : 'No se pudo agendar');
        return null;
      } finally {
        setCreating(false);
      }
    },
    [toast]
  );

  const update = useCallback(
    async (id: string, data: AppointmentUpdateData): Promise<Appointment | null> => {
      setUpdating(true);
      try {
        const result = await actions.execute<Appointment[]>('appointments.update', { id, data });
        toast.success('Turno actualizado', '');
        return result[0] ?? null;
      } catch (err) {
        toast.error('Error', err instanceof Error ? err.message : 'No se pudo actualizar');
        return null;
      } finally {
        setUpdating(false);
      }
    },
    [toast]
  );

  const updateStatus = useCallback(
    async (id: string, status: AppointmentStatus): Promise<Appointment | null> => {
      setUpdating(true);
      try {
        const result = await actions.execute<Appointment[]>('appointments.updateStatus', {
          id,
          status,
        });
        toast.success('Estado actualizado', '');
        return result[0] ?? null;
      } catch (err) {
        toast.error('Error', err instanceof Error ? err.message : 'No se pudo cambiar estado');
        return null;
      } finally {
        setUpdating(false);
      }
    },
    [toast]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setDeleting(true);
      try {
        await actions.execute('appointments.delete', { id });
        toast.success('Turno eliminado', '');
        return true;
      } catch (err) {
        toast.error('Error', err instanceof Error ? err.message : 'No se pudo eliminar');
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [toast]
  );

  return { creating, updating, deleting, create, update, updateStatus, remove };
}

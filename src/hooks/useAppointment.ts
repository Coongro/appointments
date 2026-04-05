/**
 * Hook para obtener un turno individual por ID (enriquecido con contacto, staff, evento).
 */
import { getHostReact, actions } from '@coongro/plugin-sdk';

import type { Appointment } from '../types/appointment.js';

const React = getHostReact();
const { useState, useEffect, useCallback, useRef } = React;

export interface UseAppointmentResult {
  appointment: Appointment | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAppointment(id: string | null | undefined): UseAppointmentResult {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetch = useCallback(async () => {
    if (!id) {
      setAppointment(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await actions.execute<Appointment | undefined>('appointments.getById', {
        id,
      });
      if (!mountedRef.current) return;
      setAppointment(result ?? null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Error al cargar turno');
      setAppointment(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { appointment, loading, error, refetch: fetch };
}

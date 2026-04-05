/**
 * Hook para obtener los turnos de hoy, ordenados por hora del evento.
 */
import { getHostReact, actions } from '@coongro/plugin-sdk';

import type { Appointment } from '../types/appointment.js';

const React = getHostReact();
const { useState, useEffect, useCallback, useRef } = React;

export interface UseTodayAppointmentsResult {
  data: Appointment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTodayAppointments(): UseTodayAppointmentsResult {
  const [data, setData] = useState<Appointment[]>([]);
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
    setLoading(true);
    setError(null);
    try {
      const result = await actions.execute<Appointment[]>('appointments.listToday', {});
      if (!mountedRef.current) return;
      setData(result);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Error al cargar turnos de hoy');
      setData([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

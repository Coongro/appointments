/**
 * Hook para obtener turnos de un staff member específico.
 */
import { getHostReact, actions } from '@coongro/plugin-sdk';

import type { Appointment } from '../types/appointment.js';

const React = getHostReact();
const { useState, useEffect, useCallback, useRef } = React;

export interface UseAppointmentsByStaffOptions {
  from?: string;
  to?: string;
}

export interface UseAppointmentsByStaffResult {
  data: Appointment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAppointmentsByStaff(
  staffId: string | null | undefined,
  options: UseAppointmentsByStaffOptions = {}
): UseAppointmentsByStaffResult {
  const { from, to } = options;
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
    if (!staffId) {
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await actions.execute<Appointment[]>('appointments.listByStaff', {
        staffId,
        from,
        to,
      });
      if (!mountedRef.current) return;
      setData(result);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Error al cargar turnos del profesional');
      setData([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [staffId, from, to]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

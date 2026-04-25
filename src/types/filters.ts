/**
 * Filtros para búsqueda de turnos.
 */
export type SortDirection = 'asc' | 'desc';

export interface AppointmentFilters {
  query?: string;
  status?: string;
  staffId?: string;
  contactId?: string;
  petId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: SortDirection;
}

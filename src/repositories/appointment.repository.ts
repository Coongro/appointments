import { eventTable } from '@coongro/calendar/server';
import { contactTable } from '@coongro/contacts/server';
import { dbNow, getTodayRange, toUTCTimestamp } from '@coongro/datetime';
import { petTable } from '@coongro/patients/server';
import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { staffMemberTable } from '@coongro/staff/server';
import { eq, and, or, ilike, asc, desc, gte, lte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { appointmentTable } from '../schema/appointment.js';
import type { AppointmentRow, NewAppointmentRow } from '../schema/appointment.js';
import type { Appointment, AppointmentStatus } from '../types/appointment.js';

/** Alias para la tabla de contactos del staff (segundo join) */
const staffContactTable = alias(contactTable, 'staff_contact');

export interface SearchParams {
  query?: string;
  status?: string;
  staffId?: string;
  contactId?: string;
  petId?: string;
  from?: string | Date;
  to?: string | Date;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

function asDate(v: string | Date | undefined): Date | undefined {
  return typeof v === 'string' ? new Date(v) : v;
}

/** Fila cruda enriquecida — Date sin brand. Convertir con `toAppointment()`. */
interface EnrichedAppointmentRow extends AppointmentRow {
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  pet_name: string | null;
  pet_species: string | null;
  pet_breed: string | null;
  staff_name: string | null;
  staff_role: string | null;
  event_start_at: Date | null;
  event_end_at: Date | null;
  event_title: string | null;
}

/** Mapper boundary: row de DB (strings sin brand) → entidad de dominio (UTCTimestamp). */
function toAppointment(row: EnrichedAppointmentRow): Appointment {
  return {
    ...row,
    status: row.status as AppointmentStatus,
    metadata: row.metadata as Record<string, unknown> | null,
    created_at: toUTCTimestamp(row.created_at),
    updated_at: toUTCTimestamp(row.updated_at),
    event_start_at: row.event_start_at ? toUTCTimestamp(row.event_start_at) : null,
    event_end_at: row.event_end_at ? toUTCTimestamp(row.event_end_at) : null,
  };
}

export class AppointmentRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  // ---------------------------------------------------------------------------
  // Select y joins reutilizables
  // ---------------------------------------------------------------------------

  private get enrichedSelect() {
    return {
      id: appointmentTable.id,
      calendar_event_id: appointmentTable.calendar_event_id,
      contact_id: appointmentTable.contact_id,
      pet_id: appointmentTable.pet_id,
      staff_id: appointmentTable.staff_id,
      consultation_id: appointmentTable.consultation_id,
      status: appointmentTable.status,
      reason: appointmentTable.reason,
      notes: appointmentTable.notes,
      metadata: appointmentTable.metadata,
      created_at: appointmentTable.created_at,
      updated_at: appointmentTable.updated_at,
      contact_name: contactTable.name,
      contact_email: contactTable.email,
      contact_phone: contactTable.phone,
      pet_name: petTable.name,
      pet_species: petTable.species,
      pet_breed: petTable.breed,
      staff_name: staffContactTable.name,
      staff_role: staffMemberTable.role,
      event_start_at: eventTable.start_at,
      event_end_at: eventTable.end_at,
      event_title: eventTable.title,
    } as const;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  private applyJoins<T>(q: T): T {
    return (q as any)
      .leftJoin(contactTable, eq(appointmentTable.contact_id, sql`${contactTable.id}::text`))
      .leftJoin(petTable, eq(appointmentTable.pet_id, sql`${petTable.id}::text`))
      .leftJoin(staffMemberTable, eq(appointmentTable.staff_id, sql`${staffMemberTable.id}::text`))
      .leftJoin(
        staffContactTable,
        eq(staffMemberTable.contact_id, sql`${staffContactTable.id}::text`)
      )
      .leftJoin(
        eventTable,
        eq(appointmentTable.calendar_event_id, sql`${eventTable.id}::text`)
      ) as T;
  }

  // ---------------------------------------------------------------------------
  // CRUD base
  // ---------------------------------------------------------------------------

  async list(): Promise<AppointmentRow[]> {
    return this.db.ormQuery((tx) => tx.select().from(appointmentTable));
  }

  async getById({ id }: { id: string }): Promise<Appointment | undefined> {
    const rows = await this.db.ormQuery((tx) => {
      const q = tx.select(this.enrichedSelect).from(appointmentTable);
      return this.applyJoins(q).where(eq(appointmentTable.id, id)).limit(1);
    });
    const row = rows[0] as EnrichedAppointmentRow | undefined;
    return row ? toAppointment(row) : undefined;
  }

  async create({ data }: { data: NewAppointmentRow }): Promise<AppointmentRow[]> {
    return this.db.ormQuery((tx) => tx.insert(appointmentTable).values(data).returning());
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: Partial<AppointmentRow>;
  }): Promise<AppointmentRow[]> {
    return this.db.ormQuery((tx) =>
      tx
        .update(appointmentTable)
        .set({ ...data, updated_at: dbNow() } as Partial<AppointmentRow>)
        .where(eq(appointmentTable.id, id))
        .returning()
    );
  }

  async delete({ id }: { id: string }): Promise<void> {
    await this.db.ormQuery((tx) => tx.delete(appointmentTable).where(eq(appointmentTable.id, id)));
  }

  // ---------------------------------------------------------------------------
  // Actualizar estado
  // ---------------------------------------------------------------------------

  async updateStatus({ id, status }: { id: string; status: string }): Promise<AppointmentRow[]> {
    return this.update({ id, data: { status } });
  }

  // ---------------------------------------------------------------------------
  // Search (con joins enriquecidos)
  // ---------------------------------------------------------------------------

  async search({
    query,
    status,
    staffId,
    contactId,
    petId,
    from,
    to,
    limit,
    offset,
    orderBy: orderByField,
    orderDir = 'asc',
  }: SearchParams): Promise<Appointment[]> {
    const rows = await this.db.ormQuery((tx) => {
      const conditions = [];

      if (query) {
        const pattern = `%${query}%`;
        conditions.push(
          or(
            ilike(contactTable.name, pattern),
            ilike(petTable.name, pattern),
            ilike(appointmentTable.reason, pattern),
            ilike(appointmentTable.notes, pattern),
            ilike(staffContactTable.name, pattern)
          )
        );
      }

      if (status) {
        conditions.push(eq(appointmentTable.status, status));
      }

      if (staffId) {
        conditions.push(eq(appointmentTable.staff_id, staffId));
      }

      if (contactId) {
        conditions.push(eq(appointmentTable.contact_id, contactId));
      }

      if (petId) {
        conditions.push(eq(appointmentTable.pet_id, petId));
      }

      const fromDate = asDate(from);
      const toDate = asDate(to);
      if (fromDate) {
        conditions.push(gte(eventTable.start_at, fromDate));
      }

      if (toDate) {
        conditions.push(lte(eventTable.start_at, toDate));
      }

      let q = tx.select(this.enrichedSelect).from(appointmentTable);
      q = this.applyJoins(q);

      if (conditions.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        q = q.where(and(...conditions)) as typeof q;
      }

      const dirFn = orderDir === 'desc' ? desc : asc;
      const sortableColumns: Record<string, () => typeof q> = {
        date: () => q.orderBy(dirFn(eventTable.start_at)) as typeof q,
        contact: () => q.orderBy(dirFn(contactTable.name)) as typeof q,
        status: () => q.orderBy(dirFn(appointmentTable.status)) as typeof q,
        created_at: () => q.orderBy(dirFn(appointmentTable.created_at)) as typeof q,
      };

      const applySorting = orderByField ? sortableColumns[orderByField] : undefined;
      if (applySorting) {
        q = applySorting();
      } else {
        q = q.orderBy(asc(eventTable.start_at)) as typeof q;
      }

      if (limit) {
        q = q.limit(limit) as typeof q;
      }

      if (offset) {
        q = q.offset(offset) as typeof q;
      }

      return q;
    });
    return (rows as EnrichedAppointmentRow[]).map(toAppointment);
  }

  // ---------------------------------------------------------------------------
  // Queries especializadas
  // ---------------------------------------------------------------------------

  async listToday({ tz }: { tz: string }): Promise<Appointment[]> {
    const { startUTC, endUTC } = getTodayRange(tz);
    return this.search({ from: startUTC, to: endUTC, orderBy: 'date', orderDir: 'asc' });
  }

  async listByStaff({
    staffId,
    from,
    to,
  }: {
    staffId: string;
    from?: string;
    to?: string;
  }): Promise<Appointment[]> {
    return this.search({ staffId, from, to, orderBy: 'date', orderDir: 'asc' });
  }

  async listByContact({ contactId }: { contactId: string }): Promise<Appointment[]> {
    return this.search({ contactId, orderBy: 'date', orderDir: 'desc' });
  }
}

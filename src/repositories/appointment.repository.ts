import { eventTable } from '@coongro/calendar/server';
import { contactTable } from '@coongro/contacts/server';
import { petTable } from '@coongro/patients/server';
import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { staffMemberTable } from '@coongro/staff/server';
import { eq, and, or, ilike, asc, desc, gte, lte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { appointmentTable } from '../schema/appointment.js';
import type { AppointmentRow, NewAppointmentRow } from '../schema/appointment.js';

/** Alias para la tabla de contactos del staff (segundo join) */
const staffContactTable = alias(contactTable, 'staff_contact');

export interface SearchParams {
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
  orderDir?: 'asc' | 'desc';
}

/** Fila enriquecida con datos del contacto, paciente, staff y evento */
export interface EnrichedAppointmentRow extends AppointmentRow {
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  pet_name: string | null;
  pet_species: string | null;
  pet_breed: string | null;
  staff_name: string | null;
  staff_role: string | null;
  event_start_at: string | null;
  event_end_at: string | null;
  event_title: string | null;
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

  async getById({ id }: { id: string }): Promise<EnrichedAppointmentRow | undefined> {
    const rows = await this.db.ormQuery((tx) => {
      const q = tx.select(this.enrichedSelect).from(appointmentTable);
      return this.applyJoins(q).where(eq(appointmentTable.id, id)).limit(1);
    });
    return rows[0] as EnrichedAppointmentRow | undefined;
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
        .set({ ...data, updated_at: new Date().toISOString() } as Partial<AppointmentRow>)
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
  }: SearchParams): Promise<EnrichedAppointmentRow[]> {
    return this.db.ormQuery((tx) => {
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

      if (from) {
        conditions.push(gte(eventTable.start_at, from));
      }

      if (to) {
        conditions.push(lte(eventTable.start_at, to));
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
    }) as Promise<EnrichedAppointmentRow[]>;
  }

  // ---------------------------------------------------------------------------
  // Queries especializadas
  // ---------------------------------------------------------------------------

  async listToday(): Promise<EnrichedAppointmentRow[]> {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).toISOString();
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59
    ).toISOString();

    return this.search({ from: startOfDay, to: endOfDay, orderBy: 'date', orderDir: 'asc' });
  }

  async listByStaff({
    staffId,
    from,
    to,
  }: {
    staffId: string;
    from?: string;
    to?: string;
  }): Promise<EnrichedAppointmentRow[]> {
    return this.search({ staffId, from, to, orderBy: 'date', orderDir: 'asc' });
  }

  async listByContact({ contactId }: { contactId: string }): Promise<EnrichedAppointmentRow[]> {
    return this.search({ contactId, orderBy: 'date', orderDir: 'desc' });
  }
}

# @coongro/appointments

## 0.4.1

### Patch Changes

- af9f88e: fix: hacer Mascota y Profesional obligatorios al agendar turno y aplicar veterinario predeterminado (COONG-113)
  - Validación nativa de HTML5 (`required` via inputs espejo) sobre los pickers de Mascota y Profesional, consistente con el form de consulta. El botón "Agendar turno" siempre está habilitado y al click muestra el tooltip apuntando al campo faltante.
  - Al abrir el scheduler en modo creación, ahora se lee el setting `consultations.defaultStaffId` y se preselecciona el veterinario predeterminado vía `staff.members.getById`. Antes el setting nunca se aplicaba a turnos.

## 0.4.0

### Minor Changes

- 2e7a67c: Expose status styling and calendar-event conversion helpers so other plugins can render appointment lists consistently. New public exports: `STATUS_LABELS`, `STATUS_BLOCK_STYLES`, `STATUS_BADGE_STYLES`, `STATUS_DOT_STYLES`, `STATUS_EVENT_COLORS`, `toCalendarEvents`, `buildAppointmentMap`, `getInitials`.

## 0.3.0

### Minor Changes

- 58f664e: Migrate to strict `@coongro/datetime` API and Drizzle `mode: 'date'`.
  - `Appointment` entity uses branded `UTCTimestamp` for `event_start_at`, `event_end_at`, `created_at`, `updated_at`.
  - Schema migration `0001_strict_datetime`: timestamps switched to `timestamp with time zone` + Drizzle `mode: 'date'`.
  - Repository mapper converts `Date` rows to `UTCTimestamp` via `toUTCTimestamp()`; search accepts `string | Date` for `from/to` and normalizes at the boundary.
  - `listToday()` consumes the new `getTodayRange()` that returns `Date` objects.
  - `EnrichedAppointmentRow` is now internal; callers use the `Appointment` domain type.
  - Forms use `localToUTC()` for building event timestamps from user input.

  Fixes the timezone bug: appointments at 22:30 ART (= 01:30 UTC next day) are now listed by `listToday(tz)` and rendered at 22:30 in the Agenda.

## 0.2.1

### Patch Changes

- 0ab5012: fix: sidebar UX, ServiceLineForm, undefined time, species icon

## 0.2.0

### Minor Changes

- 9f39804: Initial implementation of appointments plugin with agenda view, scheduler dialog, appointment sidebar, and status-based event cards

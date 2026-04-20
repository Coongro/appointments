---
"@coongro/appointments": minor
---

Migrate to strict `@coongro/datetime` API and Drizzle `mode: 'date'`.

- `Appointment` entity uses branded `UTCTimestamp` for `event_start_at`, `event_end_at`, `created_at`, `updated_at`.
- Schema migration `0001_strict_datetime`: timestamps switched to `timestamp with time zone` + Drizzle `mode: 'date'`.
- Repository mapper converts `Date` rows to `UTCTimestamp` via `toUTCTimestamp()`; search accepts `string | Date` for `from/to` and normalizes at the boundary.
- `listToday()` consumes the new `getTodayRange()` that returns `Date` objects.
- `EnrichedAppointmentRow` is now internal; callers use the `Appointment` domain type.
- Forms use `localToUTC()` for building event timestamps from user input.

Fixes the timezone bug: appointments at 22:30 ART (= 01:30 UTC next day) are now listed by `listToday(tz)` and rendered at 22:30 in the Agenda.

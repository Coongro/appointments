---
'@coongro/appointments': minor
---

feat(agenda): horario de agenda configurable + creación de turnos transaccional

- Nuevas settings `appointments.agenda.startHour` / `endHour` / `slotMinutes`: cada clínica configura el rango horario y la duración de franja de la agenda del día (antes hardcodeado).
- Creación de turnos transaccional: si falla la creación del turno, se borra (best-effort) el evento de calendario recién creado para no dejarlo huérfano en la agenda.
- Página de settings "Horario" con ícono de calendario.
- Accesibilidad: la selección (mascota/profesional) se expone como combobox colapsado para lectores de pantalla y el copiloto.

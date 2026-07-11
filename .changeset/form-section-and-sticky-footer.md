---
'@coongro/appointments': minor
---

refactor(ui): adopt FormSection + FormDialogSubmit from `@coongro/ui-components` 0.28.0 (COONG-112)

- Cada sección del scheduler (Paciente, Veterinario, Fecha y hora, Motivo, Servicios, Notas) ahora va envuelta en `UI.FormSection` con su ícono + título, en lugar del helper local `sectionLabel` (uppercase pequeño) que rompía la consistencia visual con el resto del kit.
- `AppointmentScheduler` ahora usa `UI.FormDialogSubmit` (footer sticky con botones Cancelar/Agendar turno siempre visibles) en lugar del split body/footer manual de `FormDialog`.
- Simplifica handleSubmit: la validación nativa de campos requeridos ya la dispara `requestSubmit()` del wrapper.

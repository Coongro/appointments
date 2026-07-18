---
'@coongro/appointments': minor
---

feat(turnos): recordatorio de turno in-app para el equipo (COONG-251)

Nueva setting `appointments.reminders` (sin recordatorio / 1h / 3h / 24h antes). Al crear un turno se agenda un aviso en la campana de Coongro para el equipo de la clínica (por-tenant, no llega al tutor); al reprogramarlo se reagenda y al cancelarlo se cancela. Usa el motor de notificaciones agendadas (COONG-166) y `cancelScheduledByEntity` (COONG-252) para no guardar ids: el recordatorio se keyea al `calendar_event_id` del turno. Default: sin recordatorio (opt-in, sin carga nueva de DB).

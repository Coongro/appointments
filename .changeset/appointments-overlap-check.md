---
'@coongro/appointments': minor
---

feat(agenda): aviso de turnos superpuestos por profesional (COONG-248)

Nueva setting `appointments.allowOverlap` (default: permitido — comportamiento actual). Si se desactiva, al agendar un turno que se cruza con otro del mismo profesional el scheduler muestra un aviso dentro del formulario con la opción "Agendar de todos modos" (no bloquea del todo: una urgencia se encaja conscientemente). El chequeo es por veterinario y por día, e ignora turnos cancelados o marcados como no asistió.

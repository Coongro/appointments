---
'@coongro/appointments': patch
---

fix: hacer Mascota y Profesional obligatorios al agendar turno y aplicar veterinario predeterminado (COONG-113)

- Validación nativa de HTML5 (`required` via inputs espejo) sobre los pickers de Mascota y Profesional, consistente con el form de consulta. El botón "Agendar turno" siempre está habilitado y al click muestra el tooltip apuntando al campo faltante.
- Al abrir el scheduler en modo creación, ahora se lee el setting `consultations.defaultStaffId` y se preselecciona el veterinario predeterminado vía `staff.members.getById`. Antes el setting nunca se aplicaba a turnos.

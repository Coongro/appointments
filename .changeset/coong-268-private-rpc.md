---
'@coongro/appointments': patch
---

Saca `applyJoins` de la superficie RPC renombrándolo a `_applyJoins`.

El auto-wire del runtime registra como acción todo método del prototipo salvo el
constructor y los prefijados con `_`. El `private` de TypeScript se borra al
compilar, así que no dejaba al helper fuera: era invocable como
`appointments.applyJoins` vía `actions.execute`.

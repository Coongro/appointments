# @coongro/appointments

Plugin genérico de gestión de turnos para Coongro. Permite agendar, cancelar y reprogramar turnos asociados a un contacto. Diseñado para ser reutilizable por cualquier kit (veterinario, educación, estética, etc.) que necesite funcionalidad de agenda.

## Idea

Este plugin gestiona **turnos**: alguien reserva un horario para algo. No sabe si es una consulta veterinaria, una clase particular o un corte de pelo — eso lo define cada kit que lo extienda via view contributions.

Un turno es: **un contacto, en una fecha y hora, con una duración y un estado.**

## Dependencias

```
@coongro/calendar       ← Componentes visuales de calendario
@coongro/contacts       ← Gestión de contactos/clientes
  ↑ dependencias
@coongro/appointments   ← Este plugin
```

- `calendar` — para renderizar la vista de agenda
- `contacts` — para asociar cada turno a un cliente/contacto

## Componentes

### 1. Agenda

Vista calendario con los turnos del día/semana. Usa componentes de `calendar`.

```
┌─────────────────────────────────────────────┐
│  Turnos > Agenda                            │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─ Hoy: 24 Mar 2026 ────────────────────┐ │
│  │                                        │ │
│  │  09:00  Juan Pérez                     │ │
│  │  09:30  ─────────                      │ │
│  │  10:00  María López                    │ │
│  │  10:30  ─────────                      │ │
│  │  11:00  Carlos Ruiz                    │ │
│  │  11:30  ─────────                      │ │
│  │                                        │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  [+ Nuevo turno]                            │
│                                             │
└─────────────────────────────────────────────┘
```

### 2. Lista de turnos

Vista tabla con filtros por fecha y estado.

```
┌─────────────────────────────────────────────┐
│  Turnos > Lista                             │
├─────────────────────────────────────────────┤
│                                             │
│  Filtros: [Fecha ▼] [Estado ▼]              │
│                                             │
│  │ Fecha  │ Hora  │ Contacto     │ Estado   │
│  │ 24/03  │ 09:00 │ Juan Pérez   │ Confirm. │
│  │ 24/03  │ 10:00 │ María López  │ Pend.    │
│  │ 24/03  │ 11:00 │ Carlos Ruiz  │ Pend.    │
│  │ 25/03  │ 09:00 │ Ana García   │ Cancel.  │
│                                             │
└─────────────────────────────────────────────┘
```

### 3. Formulario de turno

Crear o editar un turno. El contacto se selecciona desde `contacts`.

```
┌─────────────────────────────────────────────┐
│  Nuevo turno                                │
├─────────────────────────────────────────────┤
│                                             │
│  Contacto:  [Buscar contacto...        ▼]  │
│  Fecha:     [24/03/2026               📅]  │
│  Hora:      [09:00                     ▼]  │
│  Duración:  [30 min                    ▼]  │
│  Notas:     [                            ]  │
│                                             │
│  [Cancelar]              [Guardar turno]    │
│                                             │
└─────────────────────────────────────────────┘
```

### 4. Settings

Configuración de horarios de atención y duración por defecto.

```
┌─────────────────────────────────────────────┐
│  Configuración > Turnos                     │
├─────────────────────────────────────────────┤
│                                             │
│  Horario de atención:                       │
│  Lunes a Viernes:  [09:00] a [18:00]       │
│  Sábado:           [09:00] a [13:00]       │
│  Domingo:          Cerrado                  │
│                                             │
│  Duración por defecto: [30 min ▼]           │
│                                             │
└─────────────────────────────────────────────┘
```

## Base de datos

### Tabla `appointments`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `contact_id` | UUID | FK al contacto (de `contacts`) |
| `date` | DATE | Fecha del turno |
| `start_time` | TIME | Hora de inicio |
| `duration` | INTEGER | Duración en minutos |
| `status` | ENUM | `pending`, `confirmed`, `cancelled`, `completed` |
| `notes` | TEXT | Notas opcionales |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Última actualización |

### Tabla `appointment_settings`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK |
| `day_of_week` | INTEGER | 0-6 (domingo-sábado) |
| `open_time` | TIME | Hora de apertura |
| `close_time` | TIME | Hora de cierre |
| `is_closed` | BOOLEAN | Si está cerrado ese día |
| `default_duration` | INTEGER | Duración por defecto en minutos |

## Extensibilidad

Cada kit extiende `appointments` via **view contributions** para agregar campos específicos:

| Kit | Extiende con |
|-----|-------------|
| Veterinario | Paciente (mascota), motivo de consulta, tipo de servicio (consulta, peluquería, vacunación) |
| Educación | Alumno, materia, tipo de clase |
| Estética | Servicio, profesional, duración variable por servicio |

El plugin de turnos no necesita saber nada de esto — los kits inyectan sus campos en el formulario y sus columnas en la lista.

## Estado

🚧 En diseño — este README documenta la idea y arquitectura planificada.

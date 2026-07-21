# Módulo: Tareas y Calendario — Documentación Técnica

## Rutas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/tareas` | `Tareas.tsx` | Gestión de tareas con Kanban |
| `/calendario` | `Calendario.tsx` | Calendario unificado |
| `/agendamientos` | `Agendamientos.tsx` | Agendamientos con calendario/tabla |
| `/solicitudes` | `Solicitudes.tsx` | Solicitudes de vehículos |

## Tareas

### Componentes
- **TaskKanban** — Tablero con columnas por estado
- **TaskKanbanCard** — Card de tarea con prioridad, asignado, descripción
- **TaskDetailPanel** — Panel lateral con detalle completo
- **CreateTaskSheet** — Formulario de creación
- **TaskMobileCard** — Card optimizada para móvil

### Estados
- `pending` — Pendiente
- `in_progress` — En progreso
- `pending_approval` — Marcada como completada por un usuario no-admin, esperando validación de un admin
- `completed` — Completada
- `cancelled` — Cancelada

### Tipos de Fuente
- `manual` — Creada manualmente
- `checklist` — Generada desde checklist de vehículo

### Aprobación configurable por cliente
- Columna `clients.tasks_require_approval` (boolean, default false). Migración `20260426224742_add_tasks_require_approval.sql`.
- Toggle en Configuración → Tareas (`TaskApprovalSettings.tsx`).
- Cuando está activo, `useTasks.updateTaskStatus` fuerza a `pending_approval` cualquier `completed` originado por usuarios sin permiso `TASKS_MANAGE`.
- `useTasks` expone `approveTask(id)` y `rejectTask(id)` que solo funcionan para usuarios con `TASKS_MANAGE` (la guardia es de aplicación, no de RLS — el patrón es consistente con `require_sale_approval`).
- Trazabilidad: columnas `tasks.approved_by` y `tasks.approved_at` se setean al aprobar; `completed_by`/`completed_at` registran quién hizo el primer intento de cierre.
- UI: `TaskDetailPanel` muestra el bloque "Aprobación pendiente" con botones Aprobar/Rechazar cuando `task.status === 'pending_approval'` y `canManageTasks`.

### Hooks
- `useTasks` — CRUD con filtros, asignación y aprobación. Devuelve `tasksRequireApproval` (lectura del cliente actual), `approveTask`, `rejectTask` además de las operaciones existentes.
- `usePendingTasksCount` — Contador para badge en sidebar

## Calendario

### Componentes
- **CalendarMonthView** — Vista mensual con eventos
- **CreateCalendarEventDrawer** — Crear evento
- **CalendarEventDetailDrawer** — Detalle del evento

### Hooks
- `useCalendarEvents` — CRUD de eventos
- `useUnifiedCalendar` — Vista unificada (eventos + tareas + vencimientos)

### Adjuntos de fotos
- Columna `calendar_events.photo_urls TEXT[]` (migración `20260407100000_add_photo_urls_to_calendar_events.sql`).
- Las fotos se suben a `vehicle-images/calendar-events/` via `uploadImage()` desde `CreateCalendarEventDrawer`.
- `CalendarMonthView` muestra la primera foto como thumbnail (con badge `+N` si hay más) en la preview del día.
- `CalendarEventDetailDrawer` muestra galería tipo collage (1/2/3/4+) con lightbox y navegación.
- `useUnifiedCalendar` propaga el array como `metadata.photoUrls` para los eventos manuales (`source: 'event'`).

## Agendamientos

### Componentes
- **AppointmentsCalendarGrid** — Grilla de calendario para citas
- **AppointmentsViewToggle** — Toggle entre vista calendario y tabla

## Solicitudes de Vehículos

### Componentes
- **RequestKanban** — Tablero Kanban de solicitudes
- **RequestDetailPanel** — Detalle de solicitud
- **CreateRequestDialog** — Crear solicitud
- **RequestMobileCard** — Card para móvil

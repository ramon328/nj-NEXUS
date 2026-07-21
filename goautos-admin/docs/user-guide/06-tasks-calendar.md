# Tareas y Calendario — Guía de Usuario

## Tareas

### Acceso
Menú lateral → **Tareas**

### Vista Kanban
Las tareas se organizan en un tablero con columnas:
- **Pendiente** — Tareas por hacer
- **En progreso** — Tareas en las que se está trabajando
- **Pendiente de aprobación** — Tareas que un usuario no-admin marcó como completadas y esperan validación de un administrador (solo se usa cuando el toggle de aprobación está activo en la configuración)
- **Completada** — Tareas terminadas
- **Cancelada**

Arrastra las tareas entre columnas para cambiar su estado.

### Aprobación de tareas (configurable)
Cada automotora puede activar el modo "Requerir aprobación del administrador" desde **Configuración → Tareas**. Cuando está activo:
- Si un vendedor o cualquier usuario no-admin marca una tarea como completada, esa tarea pasa primero a **Pendiente de aprobación** en lugar de quedar cerrada.
- Un admin/superadmin abre la tarea desde el panel de detalle y ve dos botones: **Aprobar** (queda como completada) o **Rechazar** (vuelve a "En progreso").
- Los administradores que completan tareas se autoaprueban: la tarea queda en **Completada** sin paso intermedio.
- Cada aprobación queda registrada con el admin que aprobó y la fecha (campos `approved_by`, `approved_at`).

Cuando el toggle está desactivado, todas las tareas se completan directo (comportamiento por defecto).

### Crear una tarea
1. Click en **"+ Nueva tarea"**
2. Define:
   - Título y descripción
   - Prioridad
   - Asignado a (quién la hará)
   - Fecha límite

### Tipos de tareas
- **Manuales** — Las creas tú mismo
- **De checklist** — Se generan automáticamente desde el checklist de preparación de un vehículo

---

## Calendario

### Acceso
Menú lateral → **Calendario**

### ¿Qué muestra?
El calendario unifica:
- **Eventos** que tú creas
- **Tareas** con fecha límite
- **Agendamientos** de clientes
- **Vencimientos** de documentos de vehículos

### Crear un evento
Click en una fecha o en **"+ Nuevo evento"** y completa título, fecha, hora y descripción.

---

## Agendamientos

### Acceso
Menú lateral → **Agendamientos**

### ¿Para qué sirve?
Para gestionar citas con clientes (test drives, visitas, entrega de vehículos). Puedes ver las citas en formato calendario o tabla.

---

## Solicitudes de Vehículos

### Acceso
Menú lateral → **Solicitudes**

### ¿Para qué sirve?
Cuando un cliente busca un vehículo específico que no tienes en stock, puedes crear una solicitud. Se gestionan con un tablero Kanban similar al de tareas.

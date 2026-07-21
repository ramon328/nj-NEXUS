# Forja · 06 — Apartado Ramón: Calendario + Avance (Ramón)

| Module | Phase | Status | Build wave |
|---|---|---|---|
| Privado / Productividad | Calendario + Kanban | ✅ En producción | 5 |

Source: `src/components/ramon/{RamonSection,RamonCalendar,ProjectsBoard,KanbanBoard}.jsx` + `supabase/setup_ramon_avance.sql`. Part of portal **La Forja · Nicojuri**.

## 1. Overview & context

Apartado privado restringido a Nicolás y Ramón. Tiene dos pestañas:
1. **Calendario** — el horario universitario de Ramón, hardcodeado en una grilla días × bloques horarios (read-only).
2. **Avance de Proyectos** — una grilla de proyectos; al abrir uno se entra a un tablero Kanban estilo Trello (Por hacer / En progreso / Hecho) con drag & drop, persistido en Supabase.

- **Ruta lógica:** `view === 'ramon'` y `canAccessRamon(email)` (`src/App.jsx:24-26`).
- **Quién la usa:** solo `njuri@dropout.cl` y `ramon@dropout.cl`.
- **Job-to-be-done:** "Quiero ver mi horario y gestionar el avance de mis proyectos en un Trello propio".
- **Muta datos:** Calendario read-only; Avance crea/edita/borra proyectos y tarjetas.

## 2. Goals / Non-goals

**Goals**
- Mostrar el horario universitario claro y legible.
- Gestionar proyectos y tarjetas Kanban con persistencia y drag & drop.
- Restringir el acceso por email (UI) y por RLS (BD).

**Non-goals**
- El calendario no es editable ni se sincroniza con ninguna fuente.
- No hay asignación de tarjetas a personas ni fechas/labels.
- No comparte tableros con otros usuarios fuera de njuri/ramon.

## 3. Entry points & navigation

- **Entrada:** botón "Ramón" del header (visible si `canAccessRamon`) → `setView('ramon')` (`src/App.jsx:41`; `Header.jsx:13-20`). Doble gate en `App.jsx:24`.
- **Tabs:** "Calendario" / "Avance de Proyectos" (`RamonSection.jsx:22-31`).
- **Drill-in:** click en un proyecto → `KanbanBoard` (`ProjectsBoard.jsx:61-63,82`).
- **Salidas:** "← Volver al hub" (`RamonSection.jsx:32-34`); dentro del Kanban "← Proyectos" vuelve a la grilla (`KanbanBoard.jsx:95`).

## 4. Screen anatomy

**RamonSection (`RamonSection.jsx:15-43`):** overlay → topbar (logo "Ramón · Calendario / Avance", tabs, volver) → body `wide` con `RamonCalendar` o `ProjectsBoard`.

**RamonCalendar (`RamonCalendar.jsx:65-104`):** tabla; columnas = `DAYS` (lun–vie), filas = `SLOTS` (12 bloques, incl. recreos). Cada celda con clase pinta nombre del ramo, profesor y sala, con color por ramo.

**ProjectsBoard (`ProjectsBoard.jsx:65-125`):** header + "+ Nuevo proyecto"; grid `pj-grid` de `pj-card` (nombre, descripción, "Abrir tablero →", botón ✕ eliminar); modal de creación.

**KanbanBoard (`KanbanBoard.jsx:91-199`):** 3 columnas `COLUMNS`; cada tarjeta arrastrable con título/descripción y botones rápidos "mover a"; formulario inline para agregar; modal de edición (título, descripción/avance, eliminar).

## 5. User flows & use cases

**Use case 1 — Ver el horario.**
As a Ramón, I want ver mi calendario, so that sepa mis clases.
1. Tab "Calendario" → tabla estática desde `HORARIO`/`RAMOS`/`SLOTS` (`RamonCalendar.jsx:80-99`). Recreos (`isBreak`) y celdas sin clase se renderizan vacías.

**Use case 2 — Crear proyecto.**
As a usuario, I want crear un proyecto, so that organizar su avance.
1. "+ Nuevo proyecto" → modal → `handleCreate` inserta en `forja_projects` `{name, description, created_by: user.id}` (`ProjectsBoard.jsx:34-52`).

**Use case 3 — Gestionar tarjetas Kanban.**
As a usuario, I want mover tarjetas entre columnas, so that refleje el progreso.
1. Abrir proyecto → `KanbanBoard` carga `forja_cards` por `project_id`, ordenadas por `position` y `created_at` (`KanbanBoard.jsx:22-31`).
2. Agregar: form inline por columna → insert con `position = nº de tarjetas en la columna` (`KanbanBoard.jsx:37-51`).
3. Mover: drag & drop o botones "mover a"; **update optimista** en UI y luego update de `column_key`/`position` (`KanbanBoard.jsx:53-63`).
4. Editar/Borrar: modal → update título/descripción o delete (`KanbanBoard.jsx:71-89`).

**Use case 4 — Borrar proyecto.** Confirm + delete (cascade borra sus tarjetas vía FK) (`ProjectsBoard.jsx:54-59`; `setup_ramon_avance.sql:19`).

**Estados vacíos:** sin proyectos → CTA "Crear el primero" (`ProjectsBoard.jsx:74-78`). Columna vacía → solo botón "+ Agregar tarjeta".

## 6. Business rules, constants & formulas

| Rule | Definition | Source |
|---|---|---|
| Acceso UI | `RAMON_ACCESS_EMAILS = ['njuri@dropout.cl','ramon@dropout.cl']` | `RamonSection.jsx:6` |
| Check de acceso | `canAccessRamon(email)` (lowercased) | `RamonSection.jsx:8-10` |
| Columnas Kanban | `todo` (Por hacer), `doing` (En progreso), `done` (Hecho) | `KanbanBoard.jsx:4-8` |
| Posición nueva tarjeta | = nº de tarjetas en la columna destino | `KanbanBoard.jsx:40,61` |
| Orden de tarjetas | `position` asc, luego `created_at` asc | `KanbanBoard.jsx:27-28` |
| Orden de proyectos | `created_at` asc | `ProjectsBoard.jsx:22` |
| Días del calendario | lun, mar, mié, jue, vie | `RamonCalendar.jsx:28` |
| Bloques horarios | 12 slots (con 3 recreos) | `RamonCalendar.jsx:13-26` |

**Stub flags / hardcodes:**
- **`RAMON_ACCESS_EMAILS`** hardcodeado (`RamonSection.jsx:6`) — gate de UI; el de verdad lo impone RLS.
- **Horario completo hardcodeado** en `RAMOS`, `SLOTS`, `HORARIO` (`RamonCalendar.jsx:3-63`): 7 ramos (Cálculo II, IA, Inglés, IoT, Redes, Cloud, Ética) con profesor, color y sala. Editarlo requiere cambiar código + deploy.

## 7. Data model

**`forja_projects`** (`setup_ramon_avance.sql:8-14`):
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| name | text NOT NULL | |
| description | text | default '' |
| created_by | uuid | FK `auth.users(id)` |
| created_at | timestamptz | `now()` |

**`forja_cards`** (`setup_ramon_avance.sql:17-25`):
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| project_id | uuid NOT NULL | FK `forja_projects` `ON DELETE CASCADE` |
| column_key | text | `'todo' \| 'doing' \| 'done'`, default `todo` |
| title | text NOT NULL | |
| description | text | default '' |
| position | int | default 0 |
| created_at | timestamptz | |

**RLS (`setup_ramon_avance.sql:27-41`):** ambas tablas con policy `for all to authenticated` cuyo `using`/`with check` exige `auth.jwt()->>'email' in ('njuri@dropout.cl','ramon@dropout.cl')`.

**Setup obligatorio:** ejecutar `supabase/setup_ramon_avance.sql` en el SQL Editor del proyecto Forja (`ydcpsihovvaefyobnhws.supabase.co`) — si no, `ProjectsBoard` muestra error de tablas inexistentes (`ProjectsBoard.jsx:24`).

## 8. State management

- `RamonSection`: `tab` (`'calendario'|'avance'`) (`RamonSection.jsx:13`).
- `RamonCalendar`: sin estado (datos const a nivel módulo).
- `ProjectsBoard`: `projects, selected, loading, error, showNew, newName, newDesc, saving`; `loadProjects` (`useCallback`) (`ProjectsBoard.jsx:8-32`).
- `KanbanBoard`: `cards, error, addingTo, newTitle, editCard, editTitle, editDesc, dragId, dragOver`; `loadCards` (`useCallback` por `project.id`); `cardsIn(col)` deriva columnas; movimiento **optimista** con rollback vía `loadCards()` en error (`KanbanBoard.jsx:13-89`).

## 9. Edge cases & empty/error states

- **Acceso directo a la vista sin permiso:** `App.jsx:24` exige `canAccessRamon`; si no, cae al hub.
- **Tablas no creadas:** mensaje guía a `setup_ramon_avance.sql` (`ProjectsBoard.jsx:24`).
- **RLS sin coincidencia de email:** lecturas/escrituras devuelven error y se muestran en `ap-msg err`.
- **Drag falla en BD:** rollback recargando desde Supabase (`KanbanBoard.jsx:62`).
- **Nombre de proyecto vacío:** botón deshabilitado / no crea (`ProjectsBoard.jsx:36,116`).

## 10. Open items / future work

- Calendario hardcodeado: migrar a datos editables si cambia el semestre.
- Kanban sin reordenamiento dentro de una columna (solo `position` al final).
- No hay labels, fechas límite ni asignados en las tarjetas.
- Acceso por lista de emails duplicado entre UI (`RamonSection.jsx:6`) y RLS (`setup_ramon_avance.sql:34`); mantener sincronizados.

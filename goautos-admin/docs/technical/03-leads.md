# Módulo: Leads — Documentación Técnica

## Rutas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/leads` | `Leads.tsx` | Gestión de leads con Kanban y tabla |

## Tipos de Lead

Los leads pueden originarse de múltiples fuentes:

- `buy-direct` — Compra directa
- `consignment` — Consignación
- `search-request` — Búsqueda de vehículo
- `sell` — Venta
- `financing` — Financiamiento
- `transfer` — Transferencia
- `contact` — Contacto general

## Vistas

- **Kanban** — Tablero con columnas por estado, drag-and-drop
- **Tabla** — Vista lista con filtros avanzados

## Componentes

- **LeadKanban** — Tablero Kanban multi-columna
- **LeadTable** — Tabla con paginación
- **LeadDetailSheet** — Panel lateral con detalle completo del lead
- **LeadStatusCards** — KPIs de conversión
- **LeadFilters** — Filtros por tipo, fecha, vendedor, estado
- **CreateLeadDialog** — Crear lead manualmente

## Hooks

- `useLeads` — CRUD de leads con filtros
- `usePendingLeadsCount` — Contador de leads sin procesar (para badge en sidebar)
- `usePotentialCustomers` — Identificación de clientes potenciales

## Asignación por vendedor

Cada lead puede tener un vendedor dueño en `leads.assigned_to` (FK a `users.id`).

- **Al crear** un lead, queda asignado automáticamente a quien lo crea (`userData.id`).
- **Visibilidad**: controlada por el toggle `clients.sellers_see_all_leads` (default `true`).
  - `true` → los vendedores ven todos los leads del cliente (comportamiento histórico).
  - `false` → los vendedores (rol `seller`/`vendedor`) ven **solo** los leads asignados a ellos. Admins y gerentes comerciales siguen viendo todos.
- El filtrado se aplica en `useLeads` (capa de app; la tabla `leads` no tiene RLS), igual que con `vehicles.seller_id` + `clients.sellers_see_all_vehicles`.
- **Reasignar**: quienes ven todos los leads (`canAssignLeads = !isSeller`) pueden cambiar el vendedor desde el selector en `LeadDetailSheet`. Hook: `assignLead(leadId, assignedTo | null)`.
- El toggle se administra en **Configuración → Permisos de vendedores** (`SellerPermissionsConfig`).

## Notificaciones

Cuando llega un nuevo lead, se puede notificar por:
- Notificación push en la app
- WhatsApp (si configurado)

## Exportar a Excel (T1)

Botón "Exportar" en `LeadViewToggle` (desktop + mobile), gateado por `LEADS_VIEW`. Exporta la **vista actual** (`filteredLeads`: tab + filtros activos; nunca `paginatedLeads`), respetando la visibilidad por vendedor. Espeja las columnas del export de Contactos de ChileAutos (Nombre, RUT, Tipo, Estado, Email, Contacto, Marca, Modelo, Año, Precio, Patente, Fecha) y agrega **Vendedor Asignado** y **Origen**. Función `exportLeadsToExcel()` en `utils/excelExport.ts`; para leads de ChileAutos (que no guardan el vehículo en campos estructurados) enriquece Marca/Modelo/Año/Precio/Patente desde `chileautos_leads.raw_payload` con una sola consulta.

## Modo "pool" + tomar/soltar leads (T2)

Tercer modo de visibilidad, vía `clients.sellers_can_claim_leads` (default `false`, solo aplica cuando `sellers_see_all_leads=false`):
- `false` → el vendedor ve solo los suyos (igual que antes).
- `true` → **pool**: ve sus leads asignados **+ los sin asignar**, y puede "tomarlos". No ve los asignados a otros.
- Filtro en `useLeads`: `canClaim` → `.or('assigned_to.eq.<me>,assigned_to.is.null')`.

Tomar/soltar van por **RPC SECURITY DEFINER** (la tabla `leads` no tiene RLS; un UPDATE crudo permitiría robar leads ajenos):
- `claim_lead(p_lead_id)` — toma un lead sin asignar (`WHERE assigned_to IS NULL` resuelve la carrera); `status pending→assigned`; sincroniza `vehicle_requests`; marca `last_seen_at`.
- `release_lead(p_lead_id)` — el vendedor suelta un lead **suyo** (`assigned→pending`, `assigned_to=null`).
- Hooks: `useLeads.claimLead/releaseLead`; UI: botones "Tomar este lead"/"Soltar lead" en `LeadDetailSheet`.
- **Importante**: la detección de "vendedor" usa el rol legacy crudo (`userRole`), no `usePermissions.isSeller` (en prod muchos vendedores tienen además un rol custom y serían mal clasificados).

## Historial / Logs del lead (T4)

Tabla `lead_activity_log` (lead_id, client_id, event_type, actor_user_id, source, metadata, created_at), alimentada por el trigger `trg_log_lead_activity` (AFTER INSERT/UPDATE en `leads`). Captura desde un único punto **todas** las rutas (web, ChileAutos, admin). Eventos: `created`, `assigned`, `reassigned`, `unassigned`, `status_changed`, `notes_changed`. El trigger lleva `EXCEPTION WHEN OTHERS THEN RETURN COALESCE(NEW,OLD)`: **nunca** aborta la creación/edición de un lead. RLS por `client_id`; sin policy de INSERT (solo escribe el trigger). UI: `LeadTimeline` (solo lectura) en `LeadDetailSheet`; hook `useLeadActivityLog`.

- **`notes_changed`** (migración `20260625120000_lead_notes_activity.sql`): se registra cuando `NEW.notes IS DISTINCT FROM OLD.notes`. `metadata` va vacío a propósito (`{}`): el timeline solo muestra "Notas actualizadas" + actor + fecha, no el texto viejo/nuevo. Como corre a nivel trigger, cubre **todas** las vías de edición (panel y `EditNotesDialog`). El timeline se refresca en caliente vía `useLeadActivityLog().refetch()`, que `LeadDetailSheet` llama tras guardar la nota (el evento ya está committeado porque el trigger corre en la misma transacción del `UPDATE`).

## Reglas de seguimiento: aviso + liberación por inactividad (T3 + T5)

Configurables por marca en `clients.lead_rules` (jsonb, **default todo OFF**):
`{ nag_enabled, nag_hours=48, release_enabled, release_hours=72, active_since }`.
- **`nag_hours` / `release_hours`** son **configurables por marca desde la UI** (inputs en `SellerPermissionsConfig`, se guardan al salir del campo). Se clampan a `[1, 8760]` horas; `release_hours` se fuerza a `≥ nag_hours` (no se puede liberar antes de avisar). Los textos de las notificaciones interpolan estos valores.
- **`active_since`** = cutoff: se fija a `now()` al activar; las reglas solo aplican a leads creados desde entonces (evita avalancha sobre el backlog histórico).
- **Actividad** = `leads.last_seen_at`, seteado por `touch_lead_seen(p_lead_id)` cuando el **dueño** abre el detalle (con fallback a `created_at`; `leads` no tiene `updated_at`). `notified_stale_at` deduplica el aviso.
- **Sweep diario** `run_lead_followup_sweep()` (cron `leads-followup-sweep-daily`, 13:00 UTC): avisa por leads sin seguimiento > `nag_hours` (al dueño; los sin asignar → admin vía `target_role`) y, si `release_enabled`, libera (`assigned_to=null`, `status=pending`) los que siguen botados > `release_hours`. Tiene `EXCEPTION` por-lead. Mientras todas las marcas estén OFF, el job es no-op.
- Config UI: **Configuración → Permisos de vendedores** (`SellerPermissionsConfig`).

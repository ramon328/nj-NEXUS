# Sistema de Permisos — Documentación Técnica

## Arquitectura

El sistema usa **RBAC (Role-Based Access Control)** con permisos granulares.

### Estructura
```
users → roles → role_permissions → permissions
```

Cada usuario tiene un rol. Cada rol tiene N permisos. Los permisos controlan acceso a rutas, módulos y widgets específicos.

## Roles Base

- **admin** — Acceso completo
- **seller** — Acceso limitado (sin ventas, sin configuración)
- **client** — Similar a admin (dueño de la automotora)
- **superadmin** — Acceso cross-tenant (plataforma)

## Permisos (112+)

### Dashboard
- `DASHBOARD_VIEW` — Ver dashboard básico
- `DASHBOARD_SELLER_VIEW` — Dashboard de vendedor
- `DASHBOARD_FULL` — Dashboard completo
- `DASHBOARD_COMERCIAL_*` — Widgets del tab comercial (ventas, gastos, margen, inventario, rendimiento, alertas, resumen)
- `DASHBOARD_INVENTARIO_*` — Widgets del tab inventario
- `DASHBOARD_WEB_*` — Widgets del tab web
- `DASHBOARD_VENDEDORES_*` — Widgets del tab vendedores

### Módulos
- `VEHICLES_VIEW/CREATE/EDIT/DELETE` — Vehículos
- `VEHICLES_VIEW_PURCHASE_PRICE` — Ver precio de compra/acordado en el detalle del vehículo (requiere `VEHICLES_VIEW`)
- `VEHICLES_VIEW_FINANCIAL_SUMMARY` — Ver el bloque "Resumen financiero" en el detalle del vehículo (requiere `VEHICLES_VIEW`)
- `SALES_VIEW/CREATE/EDIT` — Ventas
- `CLIENTS_VIEW/CREATE/EDIT` — Clientes
- `LEADS_VIEW/MANAGE` — Leads
- `FINANCING_VIEW` — Financiamiento
- `DOCUMENTS_VIEW/CREATE/DELETE` — Documentos
- `TASKS_VIEW/CREATE/MANAGE` — Tareas
- `CALENDAR_VIEW/CREATE/MANAGE` — Calendario
- `VEHICLE_REQUESTS_VIEW/CREATE/MANAGE` — Solicitudes
- `APPOINTMENTS_VIEW` — Agendamientos
- `MARKETING_VIEW` — Marketing
- `NOTIFICATIONS_VIEW/CREATE` — Notificaciones
- `TEAM_VIEW/MANAGE` — Equipo
- `ROLES_MANAGE` — Gestión de roles
- `CONFIGURATION_VIEW/EDIT` — Configuración
- `BUILDER_VIEW` — Website builder
- `UPDATES_VIEW` — Novedades
- `TASADOR_VIEW` — Tasador AI
- `AI_ASSISTANT_VIEW` — Asistente IA

### Integraciones
- `INSTAGRAM_VIEW`, `MERCADOLIBRE_VIEW`, `FACEBOOK_VIEW`, `CHILEAUTOS_VIEW`

## Dependencias de Permisos

Algunos permisos dependen de otros. Ejemplo:
- `SALES_EDIT` requiere `SALES_VIEW`
- `TASKS_MANAGE` requiere `TASKS_VIEW`
- `DASHBOARD_COMERCIAL_*` requiere `DASHBOARD_FULL`

El componente `PermissionSelector` maneja estas cascadas automáticamente.

## Verificación en Frontend

```typescript
const { userPermissions } = useAuth();
// Verificar permiso
const canEdit = userPermissions?.includes('VEHICLES_EDIT');
```

Las rutas protegidas verifican permisos en `ProtectedRoute`.

## Roles Personalizados

Los admins pueden crear roles custom con combinaciones de permisos específicas desde `/equipo` > pestaña Roles.

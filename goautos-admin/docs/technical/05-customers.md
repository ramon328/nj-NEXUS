# Módulo: Clientes — Documentación Técnica

## Rutas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/clientes` | `Clientes.tsx` | Gestión de clientes |

## Modelo de Datos

```typescript
interface Customer {
  id: number;
  customer_type: 'person' | 'company'; // default 'person'
  first_name: string;                  // persona
  last_name: string;                   // persona
  company_name: string;                // empresa (razón social)
  email: string;
  phone: string;
  rut: string;                         // RUT persona o RUT empresa
  birth_date: string;
  client_id: number;
  created_at: string;
}
```

### Tipo de cliente: persona vs empresa

Un cliente puede ser **persona natural** (`customer_type = 'person'`, usa `first_name` + `last_name`) o **empresa / persona jurídica** (`customer_type = 'company'`, usa `company_name` como razón social). En ambos casos el RUT se guarda en `rut`. El default es `'person'`, por lo que los clientes existentes no se ven afectados.

`CustomerForm` muestra un toggle Persona/Empresa que cambia los campos requeridos (`first_name`+`last_name` para persona; `company_name` para empresa). Migración: `20260616160000_add_customer_type_company_name.sql`.

**Nombre a mostrar**: usar siempre los helpers de `src/utils/customerName.ts` (`getCustomerDisplayName`, `getCustomerDisplayNameWithRut`, `getCustomerInitials`, `getCustomerSearchText`) en vez de concatenar `first_name + last_name` a mano — así las empresas muestran su razón social en selectores, tablas y documentos.

## Componentes

- **CustomersTable** — Tabla desktop + cards móvil con búsqueda y filtros
- **CustomerForm** — Formulario de creación/edición
- **ExcelUploadDrawer** — Importación masiva desde Excel

## Hooks

- `useCustomers` — CRUD de clientes
- `useCustomerSelection` — Selector de cliente para ventas/financiamiento
- `useCustomerTransactions` — Historial de transacciones
- `useCustomerVehicleHistory` — Historial de vehículos
- `useBulkCustomerImport` — Importación masiva

## Funcionalidades

- Búsqueda por nombre, RUT, email, teléfono
- Importación masiva desde Excel
- Historial de compras y transacciones
- Selección rápida en formularios de venta/financiamiento

## Vista superadmin: tabla de automotoras

Cuando un superadmin entra a `/clientes` sin tenant override, la página muestra la tabla de **automotoras** (tabla `clients`), no de customers. Componente: `ClientsTable`. Hook: `useClients`.

### Tabs Activos / Inactivos

Sobre la tabla de automotoras hay dos pills "Activos" / "Inactivos" controladas por `useClients(..., statusFilter)` que filtra por `clients.is_active`:

- `'active'` (default) — `is_active = true`. Vista de hoy.
- `'inactive'` — `is_active = false`. Lista de automotoras retiradas.

### Inactivar / reactivar (solo superadmin)

Cada fila tiene un botón Power/PowerOff que cambia `clients.is_active`. El handler `handleToggleActive` en `Clientes.tsx` está gateado por `usePermissions().isSuperadmin`; no se renderiza para admins de automotora ni vendedores.

Una automotora inactiva:
- Desaparece de la tab "Activos" en `/clientes`.
- Se excluye de **todas** las métricas globales del dashboard superadmin (ver `docs/technical/10-dashboard.md`).
- **No se elimina nada**: la data histórica se conserva, los vehículos siguen en sus tablas, los usuarios siguen pudiendo loguearse. Es solo una marca de visibilidad para el superadmin.

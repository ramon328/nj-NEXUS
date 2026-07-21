# Módulo: Vehículos — Documentación Técnica

## Rutas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/vehiculos` | `Vehiculos.tsx` | Lista/tablero de inventario |
| `/vehiculos/agregar` | `AgregarVehiculo.tsx` | Formulario multi-paso para agregar vehículo |
| `/vehiculos/editar/:id` | `EditarVehiculo.tsx` | Editar vehículo existente |
| `/vehiculos/:id` | `VehiculoDetalle.tsx` | Detalle completo del vehículo |

## Componentes Principales

### Vista de Inventario (`/vehiculos`)
- **VehiculosTable** — Tabla desktop con columnas configurables
- **VehiculosBoardView** — Vista tablero drag-and-drop por estados
- **VehiculosMobileCards** — Cards para móvil
- **VehicleStatusCards** — KPIs por estado (publicados, vendidos, etc.)
- **TableColumnSelector** — Configurador de columnas visibles
- **VehiculosFilter** — Filtros avanzados (marca, modelo, año, precio, estado). El estado (búsqueda, status, vendedor, consignación, etc.) lo persiste el store `vehiclesListStateStore` (zustand + sessionStorage), junto con `sortField`/`sortDirection`, `currentPage` y `activeStatusId`. Sobrevive a la navegación dentro de la sesión: ir a un vehículo y volver mantiene página, filtros y orden.

### Creación de Vehículo (`/vehiculos/agregar`)
- **VehicleBasicInfoForm** — Info básica (marca, modelo, año, patente, color, etc.)
- **VehicleMediaForm** — Fotos y galería con compresión automática
- **VehicleAcquisitionForm** — Datos de adquisición (costo, proveedor, consignación, fecha de adquisición)
- **VehicleSalesForm** — Precio de venta, datos comerciales
- **VehicleSummary** — Resumen antes de confirmar

### Detalle de Vehículo (`/vehiculos/:id`)
- **VehicleDetailHeader** — Cabecera con foto, nombre, estado, acciones rápidas
- **VehicleResume** — Resumen con KPIs (precio, costo, margen, días publicado)
- **VehicleTimeline** — Historial de cambios del vehículo
- **VehicleDetails** — Todas las especificaciones técnicas
- **VehicleDocuments** — Documentos asociados (compra, venta, consignación)
- **VehiclePricing** — Precios (publicado, mínimo, costo). El icono de lápiz abre `VehiclePriceEditModal` que permite editar **precio publicado, precio mínimo, precio de compra/acuerdo y precio de venta** en un solo lugar.
- **VehicleChecklist** — Checklist de preparación configurable

## Precio mínimo (`vehicles.min_price`)

Campo numérico en la tabla `vehicles`. **Obligatorio** desde la UI tanto al crear como al editar:

- En `VehicleSalesForm` (creación): validación zod `min(1) + > 0` — el formulario no avanza si está vacío.
- En `VehiclePriceEditModal` (edición): validación inline en `handleSubmit` — bloquea el guardado si es 0 o vacío.
- En DB: la columna sigue siendo nullable para no romper los vehículos legacy creados antes de esta validación. La obligatoriedad se aplica en la UI; cualquier vehículo legacy queda en estado "necesita actualización" que se resuelve al editar precios.

**Uso del campo en otros flujos:** ver `docs/technical/02-sales.md` (sección "Precio mínimo y override").

## Servicios

- **vehicleService.ts** — CRUD de vehículos, queries, status
- **vehicleCreation.ts** — Flujo de creación con upload de imágenes y auto-publish a ChileAutos
- **vehicleChecklistService.ts** — Checklists configurables por automotora. Incluye CRUD de comentarios por item (`vehicle_checklist_comments`): `getVehicleChecklistComments`, `createVehicleChecklistComment`, `deleteVehicleChecklistComment`, `getChecklistCommentCounts`. La tabla `vehicle_checklist_comments` está protegida por RLS (SELECT/INSERT por client_id, DELETE solo autor o admin).
- **vehicleConsignmentService.ts** — Vehículos en consignación
- **vehiclePurchaseService.ts** — Compras de vehículos
- **vehicleReservationService.ts** — Reservaciones
- **vehicleDocumentService.ts** — Generación de documentos
- **vehicleExtrasService.ts** — Costos adicionales (reparaciones, gastos)
- **vehicleFinesService.ts** — Multas asociadas

## Hooks Clave

- `useVehiclesPaginated` — Query paginada con filtros. Detecta `sortField` "sintéticos" (joins/calculados: `consignment_seller`, `acquired_from`, `total_expenses`, `net_profit_after_commission`, `checklist_status`) y delega a `utils/vehicleSyntheticSort.ts`: trae todos los vehículos del filtro, calcula la clave de orden con queries auxiliares y pagina client-side.
- `useVehicleCreation` — Lógica del formulario de creación
- `useVehicleImport` — Importación masiva desde Excel
- `useVehicleChecklist` — Estado del checklist
- `useVehicleFinancialData` — Datos financieros del vehículo
- `useVehicleDragDrop` — Reordenamiento en vista tablero
- `useRequiredVehicleFields` — Campos obligatorios configurables por automotora

## Lookup por Patente

El componente `GetVehicleInfoByPatent` usa la integración **GetAPI** para buscar datos de un vehículo por su patente chilena. El flujo:

1. Usuario ingresa patente
2. Se llama a edge function de Supabase → GetAPI
3. Se recibe: marca, modelo, año, combustible, color, VIN, motor, transmisión
4. Se mapean a los catálogos internos mediante algoritmo de scoring
5. Se autocompletan los campos del formulario

## Patentes duplicadas y recompra

`checkDuplicateVehicle` (`vehicleService.ts`) valida al crear un vehículo que la patente no exista ya para el cliente. Trae **todas** las coincidencias y decide por estado:

- Si hay al menos una coincidencia **no vendida** → `useVehicleCreation.saveVehicle` bloquea la creación (evita el "consignado fantasma": el mismo auto dos veces, el segundo sin compra/consignación).
- Si **todas** las coincidencias están Vendidas (`sold_only: true`) → es una **recompra** (el auto se vendió y volvió a entrar): la creación se permite y los banners de `BasicInfoSection` / `GetVehicleInfoByPatent` solo informan. No se revive el vehículo vendido porque su venta es historial real y `vehicles_sales.vehicle_id` es UNIQUE (una venta por vehículo); la recompra es siempre una fila nueva en `vehicles`.

"Vendido" se detecta por nombre de estado (`isSoldStatusName`, regex `/vendido|sold/i`), mismo criterio laxo que `get_sold_status_id` en la BD (los clientes pueden renombrar estados). `useVehicleImport` aplica la misma regla: los vehículos vendidos no cuentan como duplicado de patente/chasis al importar por Excel. No hay UNIQUE de patente en la BD; la barrera es solo de aplicación.

## Estados de Vehículo

Cada automotora configura sus propios estados en `clients_vehicles_states`. Típicamente:
- Publicado → En preparación → Reservado → Vendido → Archivado

El estado "Vendido" se asigna automáticamente por trigger de DB al aprobar una venta.

## Utilidad / resultado neto y comisiones

- **Cálculo unificado**: `src/utils/vehicleNetProfit.ts` (`calculateVehicleNetProfit`), alimentado por `src/hooks/useVehicleFinancialData.ts`. `netProfit` es la utilidad **bruta** (antes de comisión vendedor); la comisión (`sale_commission_splits`) se expone aparte y se resta en las vistas que muestran el neto "con comisión" (`VehicleFinancialSummary`, columna "Utilidad Neta c/ Comisión").
- **Override de consignación**: para consignados con "Cierre de negocio", el override de utilidad bruta solo aplica si `dealershipCommission > 0`. Un 0 se trata como "no seteado" y cae a la fórmula del método (precio garantizado: `venta − acordado`; comisión: `venta×% + fijo`). Antes el 0 forzaba utilidad bruta 0 (consignados que aparecían con utilidad cero, ej. "RAM").
- **Reajuste de precio garantizado**: `vehicles_consignments.agreed_price_final` (migración `20260610130000`) guarda el precio garantizado renegociado, preservando `agreed_price` original. El cálculo usa `agreed_price_final ?? agreed_price`. Se captura en `VehiclePriceEditModal` (campo visible solo para consignados con venta).
- **Comisión solo admin**: configurar comisión está gateado por rol (`isAdmin/isSuperadmin` de `usePermissions`) en `VehicleFinancialSummary` y `ApprovalDialog`.
- **Método de consignación obligatorio**: el alta de un consignado obliga a elegir método (`precio_garantizado` vs `comision`) en `ConsignmentForm` — ya no se asume `precio_garantizado` por default. Importa porque garantizado resta el precio acordado como costo (`venta − acordado`) y comisión solo cuenta `venta×% + fijo`; elegir mal hacía aparecer margen negativo.
- **Gastos del vehículo**: registrar gastos/ingresos con monto va por el formulario de transacción del detalle (`TransactionForm` → `vehicles_extras`, con `assumed_by` 'dealership'/'customer'). El tab "Documentos adicionales" ya **no** permite tipo gasto/ingreso (no tiene campo de monto → quedaban en `amount=NULL` y no restaban de la utilidad). Solo los `assumed_by='dealership'` restan del neto.
- **Línea de tiempo**: `useTimelineEvents` inyecta eventos `type='commission'` (solo lectura) leyendo `getCommissionSplitsWithUsers(saleId)`, para que los movimientos de comisión aparezcan junto a compra/gastos/estado/venta.
- **Errores**: `src/lib/handleError.ts#notifyError` mapea errores de Supabase/Postgres (RLS `42501`, único `23505`, red) a un único toast en español, con dedupe; conectado global vía el `MutationCache` del QueryClient (`App.tsx`).

## Importación/Exportación

- **Importar**: Excel → `useVehicleImport` → bulk insert con validación
- **Exportar**: `useVehiclesPaginated` → genera Excel con todas las columnas visibles. Las columnas de checklist (`checklist_status` con resumen y `checklist_pending` con detalle de items no completados) se generan llamando a `getMultipleVehicleChecklistSummaries` en `vehicleChecklistService.ts`, que ahora incluye `pendingItemLabels` para listar los nombres de los items pendientes.

# Módulo: Ventas — Documentación Técnica

## Rutas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/ventas` | `Ventas.tsx` | Lista de ventas con aprobación |

## Flujo de Venta

### 1. Creación de Venta

La venta se crea desde el detalle del vehículo mediante `VehicleSaleCreateEditDialog`, un formulario de **4 pasos** (`SaleStep`: `customer-selection` → `sale-info` → `trade-in` → `summary`):

1. **Cliente** (`customer-selection`) — Buscar o crear cliente (opcional)
2. **Venta** (`sale-info`) — Precio, **fecha de la venta**, método de pago, financiera, notas y **desglose de pagos** (pagos ya recibidos + **cuotas/letras a plazo** pendientes con vencimiento). El `sellerId` se auto-asigna (vehículo o usuario actual) sin campo en UI; no se piden vendedor ni comisión
3. **Permuta y extras** (`trade-in`) — Vehículo en parte de pago (opcional) + adicionales (ingreso/gasto). Reemplaza al antiguo "valor de transferencia"
4. **Resumen** (`summary`) — Confirmación final

> Rediseño del flujo: se eliminó el paso dedicado `payments` y se removieron del wizard los campos **valor de transferencia**, **vendedor** y **% comisión vendedor**. La comisión se asigna post-venta vía `sale_commission_splits`. En `executeSubmit` se envía `commissionPercentage: 0` y se omite `transferValue` (para no pisar el `transfer_value` del vehículo).

> **Cuotas / letras a plazo (plan de pago):** el componente huérfano `PaymentsStep.tsx` fue **eliminado**; su capacidad de cuotas a plazo se integró al **"Desglose de pagos"** del paso `sale-info`. Cada pago puede marcarse como cuota/letra a plazo (`PaymentItem.paid = false` + `dueDate`); se serializa en `vehicles_sales.payment_breakdown` (junto a `title`/`amount`) y aparece en la nota de venta como sección **"Plan de Pago (cuotas a plazo)"** con su vencimiento y el "Saldo a pagar" (`SaleNotePDF` + `useSaleNoteData`). `totalPaid`/`getPendingPayments` distinguen recibido de pendiente. **Bug que arregló (Benjamin/El Álamo):** tras el rediseño solo se podían agregar pagos recibidos, así que toda cuota se registraba como pagada.

#### Fecha de la venta editable (`sale_date`)

`SaleInfo.saleDate` (string `YYYY-MM-DD`) en `vehicleSaleStore` se propaga al servicio:

- **Crear:** `createSaleRecord` recibe `saleDate` opcional; si no llega usa `new Date().toISOString()` (back-compat). Si llega, se convierte a ISO fijando hora local 12:00 para evitar saltos de día por timezone al pasar a UTC (`buildSaleDateISO` en `vehicleSaleService.ts`).
- **Editar:** `updateVehicleSale` agrega `sale_date` al update **solo** cuando viene `saleData.saleDate`, así flujos que no editan fecha no la sobreescriben accidentalmente.
- **Adicionales:** `createSaleAdditionals` y `syncSaleAdditionals` reciben la misma fecha para mantener coherencia (`vehicles_extras.created_at` queda alineado con la venta retroactiva).
- **Edición de nota existente:** `loadSaleDataToStore` levanta `sale_data.sale_date` al abrir el diálogo en modo edit. El input expone `max={today}` (no acepta fechas futuras).

Justificación: la contadora necesita registrar ventas históricas (planilla Excel anterior al sistema) y corregir notas que se cargaron con la fecha de hoy. `useSaleNoteData` ya leía `sale_date` para la documentDate del PDF, así que no requiere cambios para que el cambio se vea en la nota generada.

### 2. Status Inicial

El status depende de **quién crea la venta**:

```typescript
status: registeredByAdmin ? 'approved' : 'pending'
```

- **Admin crea venta** → `approved` → vehículo se marca como vendido inmediatamente
- **Vendedor crea venta** → `pending` → vehículo sigue disponible → requiere aprobación

### 3. Aprobación (solo ventas `pending`)

Página `/ventas` (acceso: admin y client solamente):

- **Aprobar** → status cambia a `approved` → trigger DB marca vehículo como "Vendido"
- **Rechazar** → status cambia a `rejected` → trigger DB devuelve vehículo a "Publicado"
- **Actualizar** → modifica comisión/notas sin cambiar status

### 3.1 Devolver venta aprobada a pendiente

Botón **"Devolver a pendiente"** en `ApprovalDialog`, visible cuando `status === 'approved'` o `'completed'`.

Caso de uso: contabilidad detecta que faltó información (financiera, comisión, doc) en una venta ya aprobada y necesita reabrirla para corregir, sin perder el registro.

**Por qué reabrir y no anular:** `vehicles_sales.vehicle_id` es `UNIQUE`, así que no se puede crear una venta nueva mientras exista una para el mismo vehículo. Reabrir y volver a aprobar la misma venta es el flujo natural.

**Flujo:**
1. Usuario abre venta aprobada → click "Devolver a pendiente" → confirma con motivo opcional
2. `useSaleApproval.handleRevert(reason)` actualiza `vehicles_sales`: `status='pending'`, `reverted_at`, `reverted_by`, `revert_reason`
3. Trigger `trg_sale_status_changed` detecta `approved → pending` y llama a `restore_vehicle_status` → vehículo vuelve a "Publicado"
4. Venta queda visible en pestaña "Pendientes" para corrección y re-aprobación

**Columnas de auditoría (migración `20260502120000_allow_revert_approved_sale.sql`):**

| Columna | Tipo | Significado |
|---------|------|-------------|
| `reverted_at` | `TIMESTAMPTZ` | Última vez que la venta volvió de aprobada a pendiente |
| `reverted_by` | `BIGINT FK users(id)` | Usuario que ejecutó la devolución |
| `revert_reason` | `TEXT` | Motivo (opcional) |

`approval_date` y `approved_by` se mantienen y se sobrescriben en la próxima aprobación. La comisión y splits se preservan.

### 4. Triggers de Base de Datos

```sql
-- Al insertar: solo marca vendido si ya viene approved
trg_auto_sold_on_insert → IF status IN ('approved','completed') THEN mark_vehicle_as_sold()

-- Al cambiar status:
trg_sale_status_changed:
  IF NEW.status IN ('approved','completed')          THEN mark_vehicle_as_sold()
  IF NEW.status = 'rejected' AND OLD.status IN (...) THEN restore_vehicle_status()
  IF NEW.status = 'pending'  AND OLD.status IN
     ('approved','completed')                        THEN restore_vehicle_status()
```

## Comisiones

- Se calculan automáticamente basadas en `seller_commission_tiers`
- Soportan tipo de base: `total` (sobre precio venta) o `margin` (sobre margen)
- Soportan **monto fijo o porcentaje** por vendedor (`commission_type` = `'fixed'` | `'percentage'`, columna `fixed_amount`). El cálculo automático (edge `calculate_commission`), la aprobación (`useSaleApproval`), la proyección del vendedor (`useSellerSaleBreakdown`) y `calculateSellerBreakdown` honran el monto fijo; antes asumían siempre porcentaje.
- Soportan split entre múltiples vendedores/admins
- El admin puede modificar comisión al aprobar

### IVA en la comisión del vendedor (régimen del margen)

Por defecto se descuenta IVA 19/119 del margen al calcular la comisión/neto del vendedor (`sellerCalculation`, `useSellerDashboard`). Para automotoras que venden **autos usados (exentos de IVA)** existe el toggle por cliente **`clients.ventas_exentas_iva`** (Configuración → Permisos de vendedores): cuando está activo, IVA = 0 en esos cálculos. No afecta la utilidad del helper `vehicleNetProfit` (que nunca aplicó IVA).

### Historial / auditoría de comisión (línea de tiempo)

Cada alta/edición/baja de `sale_commission_splits` se registra en
`sale_commission_splits_history` vía un trigger `AFTER INSERT/UPDATE/DELETE`
(`log_sale_commission_split_change`, `SECURITY DEFINER`). Captura el movimiento
sin importar el call site (drawer del vehículo, cierre de venta, SQL manual) y
guarda monto, monto anterior, vendedor (snapshot del nombre) y actor.

El drawer `VehicleCommissionAssignDrawer` guarda con **diff** (update/insert/delete
solo lo que cambió, no "borrar todo + reinsertar"), para que el historial quede
limpio. La línea de tiempo (`useTimelineEvents`) muestra el estado actual de los
splits **más** los movimientos `updated`/`deleted` del historial. RLS de solo
lectura con el mismo patrón superadmin que `sale_commission_splits`.

## Cálculo automático de IVA y comisión proyectada (vista vendedor)

Funcionalidad informativa para que el vendedor vea, antes de la aprobación, cuánto IVA paga la operación y cuál es su comisión neta estimada.

**Régimen del margen (Chile)**: el margen bruto incluye IVA, por eso:

```
margen bruto    = precio_venta − costo_adquisición
IVA (19%)       = margen_bruto × 19/119
margen neto     = margen_bruto − IVA
comisión        = margen_neto × % del tier (o precio_venta × % si commission_base_type = 'total')
```

`costo_adquisición` se obtiene de `vehicles_purchases.purchase_price` o, si el vehículo es consignado, de `vehicles_consignments.agreed_price`.

**Dónde se muestra:**

- `SellerDashboardContent.tsx`: dos tarjetas adicionales — "IVA estimado retenido" y "Comisión neta estimada (post-IVA)" — agregadas a partir de las ventas aprobadas del vendedor.

> El bloque informativo "Cálculo del vendedor" se removió de `SummaryStep` al rediseñar el flujo (la comisión ya no se ingresa en el wizard; se asigna después con `sale_commission_splits`). `useSellerSaleBreakdown` ya no se consume desde el wizard.

**Archivos:**

- `src/utils/sellerCalculation.ts` — función pura `calculateSellerBreakdown` y constante `DEFAULT_IVA_PERCENTAGE` (19).
- `src/hooks/useSellerSaleBreakdown.ts` — fetch del costo de adquisición + tier del vendedor + cálculo (disponible; ya no usado por `SummaryStep`).
- `useSellerDashboard.ts` — extiende stats con `totalIvaWithheld` y `totalNetCommission`.

**Importante:** este cálculo es informativo. El flujo de aprobación (`useSaleApproval.ts`) no cambia: la comisión persistida sigue calculándose sobre margen bruto cuando `commission_base_type = 'margin'`. Para alinear ambas fórmulas se requiere validación con el tenant antes de modificar el flujo de aprobación.

## Precio mínimo y override

Para evitar cierres bajo costo (escenario reportado por Movek donde varias ventas dieron margen bruto = 0), tanto el wizard de venta como el cierre de negocio validan `vehicles.min_price` y bloquean salvo confirmación con motivo.

**Wizard de venta — `VehicleSaleCreateEditDialog`:**
- En `handleSubmit`, si `storeVehicle.min_price && saleInfo.salePrice < min_price` → abre `AlertDialog` rojo.
- El dialog pide un **motivo obligatorio** (textarea, max 500 chars). El botón "Vender igual" queda disabled hasta que el motivo tenga contenido.
- Al confirmar dispara evento PostHog `vehicle_sale_below_min_price_override` con `{vehicle_id, sale_price, min_price, diff, reason}` y ejecuta el submit normal.

**Cierre de negocio — `CloseBusinessDealDrawer`:**
- Misma lógica aplicada sobre `dealDetails.finalSalePrice` vs `effectiveVehicle.min_price`.
- Evento PostHog: `close_deal_below_min_price_override`.

**Auditoría inicial:** vía PostHog. No se persiste el override en DB para no agregar columnas hasta que se valide el reporting que necesita Movek; si después se quiere reporte por automotora, agregar columnas `below_min_price_override`, `below_min_reason`, `min_price_at_sale` en `vehicles_sales` y `vehicles_close_deal`.

## Servicios

- **vehicleSaleService.ts** — Creación de venta, cálculo de comisión, trade-in, actualización de estado
- **sale/saleAdditionalService.ts** — Accesorios y servicios adicionales en la venta
- **closeBusinessDealService.ts** — Cierre formal del negocio

## Cierre de venta — Gastos e Ingresos adicionales

El paso `DealDetailsStep` del flujo de cierre permite registrar dos tipos de movimientos en la tabla `vehicles_extras`:

- **Gastos Adicionales** (`type='sale_additional'`): cargos como gestoría, traspaso, etc.
- **Ingresos Adicionales** (`type='sale_income'`): venta cruzada al comprador (accesorios, seguros, paquetes).

Cada movimiento tiene además un campo **`assumed_by`** que define quién lo paga:

| `assumed_by` | UI label | Comportamiento |
|---|---|---|
| `'customer'` | "Cliente final" | Suma al total que paga el comprador en la nota de venta. La plata queda como ingreso de la automotora. **No afecta** "Para el Cliente". |
| `'dealership'` | "Consignador" | **No** aparece en la nota de venta (el comprador no lo paga). Se descuenta del monto que recibe el consignador en "Para el Cliente". |

**Defaults al crear:**
- Gastos → `'dealership'` (mantiene comportamiento histórico).
- Ingresos → `'customer'`.

**Datos antiguos (retrocompatibilidad):** filas con `assumed_by` null se interpretan según su tipo (gastos como `'dealership'`, ingresos como `'customer'`).

**Cálculo "Para el Cliente":**
```
finalSalePrice − discount − dealershipCommission − SUM(extras donde assumed_by='dealership')
```

**Cálculo total de la nota de venta (lo que paga el comprador):**
```
sale_price + transfer_value + SUM(extras donde assumed_by='customer')
```

> **Nota:** `vehicles_extras.type` es VARCHAR sin CHECK constraint, por lo que agregar `sale_income` no requirió migración SQL. La columna `assumed_by` (con CHECK constraint `IN ('dealership', 'customer')`) ya existía. Otros tipos en uso: `reservation_additional`, `reservation_payment`, `expense`, `income`. Los reportes generales (`useSalesSummary`, `useTotalNetProfit`) hoy filtran por `'expense'`/`'income'` y **no** incluyen `sale_income` — si en el futuro se quiere contabilizarlo en el profit, basta extender ese filtro y considerar `assumed_by` para distinguir ingresos reales de la automotora vs descontados al consignador.

## Nota de venta — Ajuste de precio

Cuando el `vehicles.price` (precio publicado) es mayor que `vehicles_sales.sale_price` (precio efectivamente pagado), la nota de venta y el PDF muestran:

```
Precio publicado del vehículo   $X
- Ajuste de precio              -$Y
```

en lugar de la línea única "Precio de venta del vehículo". El cálculo se hace en `useSaleNoteData.ts` (campos `originalVehiclePrice` y `priceAdjustment`) y se pasa a `SaleNote.tsx`/`SaleNotePDF.tsx`.

## Documentos PDF — Campos y secciones custom del editor

El editor visual de documentos (`GenericDocumentHTMLPreview` + `AddRowButton`/`AddSectionButton`) permite agregar filas ("+ Agregar campo") y secciones custom. Se persisten dentro de `layout_config.contentOverrides` en `vehicles_documents` con las claves `_customRows_<sectionId>` (JSON de filas por sección) y `_customSections` (JSON de secciones con `afterSectionId`).

Los 6 componentes PDF (`SaleNotePDF`, `ReservationNotePDF`, `PurchaseNotePDF`, `ConsignmentNotePDF`, `QuotationPDF`, `CloseBusinessDealPDF`) renderizan ese contenido con los helpers de `src/components/documents/pdf/helpers/customContent.tsx` (`renderCustomGridRows`, `renderCustomFinancialRows`, `renderCustomSections`). Al agregar una sección nueva a un schema (`src/config/document-editor/*Config.ts`) hay que conectar los helpers en el PDF correspondiente con el mismo `sectionId`; si no, lo agregado se ve en el preview pero desaparece del PDF impreso/descargado.

## Hooks

- `useSalesData` — Query paginada de ventas con filtro por status
- `useSaleApproval` — Lógica de aprobación/rechazo/actualización
- `useCommissions` — Gestión de comisiones
- `useTotalNetProfit` — Cálculo de utilidad neta

## Componentes

- **SalesTable** — Tabla/cards con thumbnail del vehículo, status dot, info del vendedor
- **SalesStatusCards** — Contadores por estado (pendientes, aprobadas, rechazadas)
- **ApprovalDialog** — Modal de revisión con campos de comisión y notas

## Integración ChileAutos

Al aprobar una venta, si la integración ChileAutos está activa con `sync_on_sold`, el vehículo se marca como vendido también en ChileAutos automáticamente (fire-and-forget).

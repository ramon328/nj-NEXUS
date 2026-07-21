# Guía operativa — Portal Aliace (admin.aliace.cl)

> Para obtener datos:
> 1) navega a la URL exacta de la sección,
> 2) ESPERA el selector indicado en "Esperar" (no leas antes),
> 3) recién entonces lee/extrae la tabla.

## Reglas generales (LEER PRIMERO)
- Base de todas las URLs: `https://admin.aliace.cl` — es una **SPA (React)**. Tras navegar, la app monta, valida sesión y dispara los fetch. La tabla aparece VACÍA por unos segundos.
- **Señal universal de "datos cargados"**: que existan filas reales `table tbody tr` (count > 0) Y que NO haya texto "Cargando" / "Cargando...". Mientras carga suele mostrar `Skeleton`, un spinner (icono `Loader2`, clase `animate-spin`) o "Cargando...".
- Si tras ~10 s no hay filas y no hay "Cargando", probablemente: (a) la vista es Kanban/cards (no `<table>`), (b) hay un filtro que dejó 0 resultados, o (c) el rol no tiene acceso.
- Estructura típica de tabla: shadcn `<Table>` = `<table>` real → encabezados en `thead th`, datos en `tbody tr > td`.
- Buscadores: `input[placeholder*="Buscar"]`. Filtros: botones/Selects shadcn (`[role="combobox"]`, `button` con texto del filtro).
- Para datos masivos y confiables, mejor consultar Supabase directo (project `mdrvhekhimhcwydrpueo`) que raspar el DOM.

---

## SECCIONES

### Pagos — Resumen
- **URL**: `https://admin.aliace.cl/payments-summary`
- **Qué hay**: totales de pagos por rango de fecha, método y banco; gráfico de distribución; tablas de pagos pendientes, atrasados e historial. Export Excel/BI.
- **Esperar**: que desaparezca el spinner (`.animate-spin` / `Loader2`) y aparezcan filas en `table tbody tr`. Las StatsCards con montos también indican carga lista.
- **Selectores útiles**: rango de fecha = botones preset ("Hoy", "Ayer", "Este mes"...); por defecto arranca en "Este mes". Filtro método/banco = Selects. Tablas: "Historial de pagos", "Pagos pendientes".
- **Tabla Supabase**: `payments`.

### Pagos — No identificados
- **URL**: `https://admin.aliace.cl/unidentified-payments`
- **Qué hay**: pagos sin asignar a cliente; resumen (cantidad + monto total) y tabla para asignarlos.
- **Esperar**: `table tbody tr` con filas, o el resumen "Pagos No Identificados" con conteo.
- **Selectores útiles**: header "Pagos No Identificados"; botón "Asignar" por fila.
- **Tabla Supabase**: `payments` (sin cliente), `sales_request`.

### Pagos — Cheques
- **URL**: `https://admin.aliace.cl/cheques`
- **Qué hay**: cheques con estado (en cartera/depositado/cobrado), fechas de cobro y depósito, montos.
- **Esperar**: `table tbody tr`. Mientras carga: toast/estado loading.
- **Selectores útiles**: filtro de estado (Select "all"), filtros de fecha (`collection_date`), buscador `input[placeholder*="Buscar"]`, paginación (15 por página).
- **Tabla Supabase**: `payments` (campo `check_status`), `sales_request_documents`.

### Pagos — Atrasados
- **URL**: `https://admin.aliace.cl/late-payments`
- **Qué hay**: pagos vencidos agrupados por tramo de atraso (<30, 30-60, >60 días) + intereses proporcionales.
- **Esperar**: que desaparezca el texto "Cargando pagos atrasados..." y aparezcan las Cards de resumen + `table tbody tr`.
- **Selectores útiles**: h1 "Pagos Atrasados"; Cards "Resumen de Pagos Atrasados" e "Intereses por recaudar".
- **Tabla Supabase**: `sales_request`, `manual_facturas`, `payments`, `payment_config`.

### Pagos — Manual
- **URL**: `https://admin.aliace.cl/manual-payments`
- **Qué hay**: formulario "Registro de Pago Manual" (no es tabla; es para ingresar).
- **Esperar**: que aparezca el formulario (CardTitle "Registro de Pago Manual").
- **Tabla Supabase**: `payments`.

### Ventas — Notas de Venta
- **URL**: `https://admin.aliace.cl/sales-notes`
- **Qué hay**: notas de venta con estado, estado de pago y factura asociada. Vista central del flujo.
- **OJO**: por defecto está en **Kanban** (columnas de cards, NO una `<table>`). Para extraer en formato tabla, cambiar el toggle de vista a tabla (botones de vista "kanban/table" en la barra superior). En Kanban, cada nota es una card dentro de columnas por estado.
- **Esperar**: que desaparezca "Cargando más notas de venta..." y haya cards/filas; el h2 dice "Notas de Venta".
- **Selectores útiles**: buscador `input[placeholder="Buscar por ID, cliente o factura..."]`; Selects "Estado" y "Pago"; tabs de vista.
- **Tabla Supabase**: `sales_request`, `sales_request_items`, `sales_request_documents`, `payments`.

### Ventas — Metas de venta
- **URL**: `https://admin.aliace.cl/metas-de-venta`
- **Qué hay**: meta vs venta real del mes. Tabs: "Por Vendedor", "Por Vendedor-Cliente", "Por Canal".
- **Esperar**: que `isLoading` termine → aparezcan filas en la tabla del tab activo (`table tbody tr`).
- **Selectores útiles**: `[role="tab"]` con textos "Por Vendedor" / "Por Canal".
- **Tabla Supabase**: RPC `get_sales_goals_vs_actual`, `get_sales_without_goals` (sobre `sales_request`).

### Ventas — Dashboard por cliente
- **URL**: `https://admin.aliace.cl/ventas/clientes-dashboard`
- **Qué hay**: ventas agregadas por cliente, gráfico de torta, tabla.
- **Esperar**: que termine `isLoading` y aparezca `table tbody tr` (o el gráfico).
- **Selectores útiles**: buscador `input[placeholder="Buscar cliente o RUT..."]`.
- **Tabla Supabase**: `sales_request`, `clients`.

### Facturas — Visualizar
- **URL**: `https://admin.aliace.cl/facturas/visualizar`  (nota: `/facturas` redirige aquí)
- **Qué hay**: facturas con pagos asociados, estadísticas y export.
- **Esperar**: que desaparezcan los `Skeleton` y aparezca `table tbody tr`; bloque "FacturasStatistics" cargado.
- **Selectores útiles**: barra de filtros (FacturasFilterBar) con rango de fecha; botón "Download".
- **Tabla Supabase**: `sales_request_documents` (document_type='factura'), `payments`, `sales_request`.

### Facturas — BSale
- **URL**: `https://admin.aliace.cl/facturas/bsale`
- **Qué hay**: DTEs directos desde BSale (número, estado SII, montos, PDF).
- **Esperar**: `table tbody tr` (los datos vienen de la API BSale, puede tardar más). Buscar icono `RefreshCw` / estado loading.
- **Selectores útiles**: buscador `input[placeholder*="Buscar"]`, Select de tipo de documento, paginación.
- **Tabla Supabase**: API BSale + `sales_request_documents`.

### Facturas — Cuentas por cobrar
- **URL**: `https://admin.aliace.cl/facturas/cuentas-por-cobrar`
- **Qué hay**: cuentas por cobrar de facturas manuales.
- **Esperar**: h2 "Cuentas por Cobrar" presente + `table tbody tr`.
- **Tabla Supabase**: `manual_facturas`, `payments`.

### Deudas
- **URL**: `https://admin.aliace.cl/deudas`
- **Qué hay**: deuda por cliente a fecha de corte; tabs vencida / por vencer / sana; export Excel.
- **Esperar**: que desaparezcan los `Skeleton`; aparezcan DebtSummaryCards con montos y `table tbody tr`.
- **Selectores útiles**: CutoffDateSelector (fecha de corte, por defecto hoy); DebtTabSelector (tabs sales_requests / manual_facturas); buscador; filtros monto mín/máx.
- **Tabla Supabase**: RPC `get_*_debt_at_cutoff_fixed`, `daily_debt_summary`, `daily_client_debt_details`.

### Clientes
- **URL**: `https://admin.aliace.cl/clients`
- **Qué hay**: listado de clientes (nombre, RUT, vendedor, condición de venta, canal). Import/export Excel.
- **Esperar**: `table tbody tr` con filas (ClientsTable); paginación visible.
- **Selectores útiles**: ClientSearchBar `input[placeholder*="Buscar"]`; SellerFilter (Select de vendedor); tabs (activos/inactivos).
- **Tabla Supabase**: `clients`, `profiles`, `sales_conditions`, `addresses`.
- **Detalle**: `https://admin.aliace.cl/clients/{clientId}` → direcciones, deuda, condiciones.

### Compras — Órdenes de compra
- **URL**: `https://admin.aliace.cl/purchasing/orders`
- **Qué hay**: órdenes de compra con filtros de estado/tipo/proveedor.
- **Esperar**: que termine `isLoading` → `table tbody tr`. h1 "Órdenes de Compra".
- **Selectores útiles**: Selects `placeholder="Todos los estados"`, `"Todos los tipos"`, `"Todos los proveedores"`.
- **Tabla Supabase**: `purchase_orders`, `purchase_order_items`, `suppliers`.

### Compras — Proveedores
- **URL**: `https://admin.aliace.cl/purchasing/suppliers`
- **Qué hay**: proveedores (nombre, RUT).
- **Esperar**: `table tbody tr`. h1 "Proveedores".
- **Selectores útiles**: buscador `input[placeholder="Buscar por nombre o RUT..."]`.
- **Tabla Supabase**: `suppliers`.

### Compras — Stock de ingredientes
- **URL**: `https://admin.aliace.cl/purchasing/stock`
- **Qué hay**: stock de aceites y materias primas (tabs), por planta.
- **Esperar**: que terminen `isLoadingOil`/`isLoadingMaterials` → `table tbody tr`. h1 "Stock de Ingredientes".
- **Selectores útiles**: tabs (aceites / materias primas); buscador `input[placeholder="Buscar por código o nombre..."]`.
- **Tabla Supabase**: `oil_types`, `raw_materials`, `oil_type_stock_by_plant`, `raw_material_stock_by_plant`.

### Bodega (WMS) — Landing
- **URL**: `https://admin.aliace.cl/wms`
- **Qué hay**: accesos a las sub-secciones (Ingreso, Transición, Pedidos Picking, Reubicación, Bodegas, Ubicaciones, Consulta Stock, Stock Consolidado, Devoluciones, Ajustes). h1 "Bodega". NO es tabla.
- **Esperar**: que aparezcan las cards de sección (h3 con los títulos).

### Bodega — Consulta de stock
- **URL**: `https://admin.aliace.cl/wms/stock-consultation`
- **Qué hay**: buscar stock por SKU / nombre / código de barras / lote / posición; muestra resumen, inventario, historial de pallets.
- **Esperar**: escribir en el buscador y esperar a que `isLoading` termine (spinner) y aparezcan resultados (h2 con nombre del producto).
- **Selectores útiles**: `input[placeholder="Buscar por SKU, nombre, código de barras, lote, posición..."]`.
- **Tabla Supabase**: `wms_inventory`, `wms_pallets`, `wms_positions`.

### Bodega — Stock consolidado
- **URL**: `https://admin.aliace.cl/wms/consolidated-stock`
- **Qué hay**: stock por producto/insumo y por planta (tabs Productos / Insumos; sub-tabs Todas las plantas / P1 / P2).
- **Esperar**: que terminen los loadings → `table tbody tr`. h1 "Stock Consolidado".
- **Selectores útiles**: buscador `input[placeholder="Buscar por nombre, código o SKU..."]`; tabs "products"/"insumos" y "P1"/"P2".
- **Tabla Supabase**: `wms_inventory`, `oil_types`, `raw_materials`, `products`.

### Bodega — Ubicaciones
- **URL**: `https://admin.aliace.cl/wms/ubicaciones`  (`/wms/inventory` redirige aquí)
- **Qué hay**: grilla de inventario por bodega; selector de bodega.
- **Esperar**: que termine `isLoadingInventory` → la grilla/tabla con datos. h1 "Ubicaciones".
- **Selectores útiles**: Select `placeholder="Seleccionar bodega"`.
- **Tabla Supabase**: `wms_warehouses`, `wms_hallways`, `wms_racks`, `wms_positions`, `wms_inventory`.

### Contabilidad — Plan de cuentas
- **URL**: `https://admin.aliace.cl/contabilidad/cuentas`
- **Qué hay**: plan de cuentas (código, nombre, tipo, empresa).
- **Esperar**: que termine `isLoading` → `table tbody tr`. h1 "Cuentas".
- **Selectores útiles**: buscador `input[placeholder="Buscar por código o nombre..."]`; Selects empresa/tipo/estado.
- **Tabla Supabase**: `account`.

### Contabilidad — Movimientos
- **URL**: `https://admin.aliace.cl/contabilidad/movimientos`
- **Qué hay**: movimientos contables (filtros empresa/diario/estado).
- **Esperar**: que termine `isLoading` → `table tbody tr`.
- **Selectores útiles**: buscador `input[placeholder="Buscar por referencia, diario o empresa..."]`; Selects "Todas las empresas" / "Todos los diarios" / "Todos los estados".
- **Tabla Supabase**: `account_movements`, `account_move_line`.

### Contabilidad — Reportes (índice)
- **URL**: `https://admin.aliace.cl/contabilidad/reportes`
  - Libro diario: `/contabilidad/reportes/libro-diario` (`account_move_line`)
  - Libro mayor: `/contabilidad/reportes/libro-mayor` (`account_move_line`)
  - Balance 8 columnas: `/contabilidad/reportes/balance-8-columnas` (`account`)
  - Estado de situación: `/contabilidad/reportes/estado-situacion` (`account`)
  - Estado de resultados: `/contabilidad/reportes/estado-resultados` (`account`)
- **Esperar**: `table tbody tr` (estos reportes suelen pedir rango de fechas/empresa antes de cargar).

---

## Otras secciones (más breves)
- **Productos** `/products` → `products`, `active_products`. Esperar `table tbody tr`.
- **Costos unitarios** `/unit-costs` → `unit_costs`.
- **Tipos de cambio** `/exchange-rates` → `exchange_rates`.
- **Guías de despacho** `/guias-despacho` → `sales_request_documents` (guia). Esperar `table tbody tr`.
- **Despachos / operaciones** `/despachos` → `sales_request`, `sales_request_documents`.
- **Presupuestos** `/quotations` → `quotations`. Detalle `/quotations/{id}`.
- **Cotizaciones (legacy)** `/cotizaciones` → `quotations`, `contact_attempts`.
- **Riesgo de clientes** `/client-risk-management` → `clients`.
- **Equipo comercial** `/commercial-team` / Vendedores `/vendedores` → `profiles`.
- **Producción**: `/production/batches` (`production_batches`), `/production/recipes` (`sku_recipes`).
- **Maquila**: `/maquila/inventory`, `/maquila/items` → `maquila_items`.
- **Tótems**: `/totems` (`totems`, `totem_pickup_orders`), `/totems/cleaning` (`totem_cleaning_queue`).
- **WMS extra**: `/wms/pallets` (`wms_pallets`), `/wms/picking-orders` (`wms_pick_tasks`), `/wms/returns` (`wms_return_requests`), `/wms/movements` (`wms_movements`, solo superadmin).

## Avisos
- `/payment-dashboard` y `/payment-requests` usan **datos mock** parciales — NO confiables como fuente.
- El acceso a cada sección depende del **rol** del usuario logueado (ej. WMS requiere logistica/bodega/admin/superadmin; contabilidad requiere admin/superadmin). Si una URL redirige a `/` o `/sales-notes`, el rol actual no tiene acceso.

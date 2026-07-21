# Dashboard — Documentación Técnica

## Ruta

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/` | `Index.tsx` | Dashboard principal |

## Tabs del Dashboard

### 1. Comercial
Métricas de negocio:
- **Ventas** — Total vendido en periodo
- **Gastos** — Total de gastos
- **Margen bruto** — Diferencia ventas - costos
- **Valor inventario** — Valor total del stock
- **Rendimiento** — Métricas de eficiencia
- **Alertas inteligentes** — Alertas de negocio automáticas
- **Resumen comercial** — Métricas por unidad vendida
- **Resumen de ventas** — Detalle de ventas del periodo
- **Resumen de costos** — Desglose de costos

### 2. Inventario
- Métricas de inventario (stock, valor, rotación)
- Performance de inventario (gráficos)
- Métricas de preparación de vehículos
- Recomendaciones de stock
- Vehículos críticos (mucho tiempo publicados)

### 3. Web
- Analytics del sitio web
- Gráfico de visitas
- Páginas más vistas

### 4. Vendedores
- Ventas por vendedor
- Performance individual
- Comisiones

## Hooks de Dashboard

- `useAdminDashboardData` — Datos generales
- `useBusinessKpis` — KPIs de negocio
- `useCostsSummary` — Resumen de costos
- `useInventoryKpis` — KPIs de inventario
- `useInventoryPerformance` — Performance de inventario
- `useInventoryValue` — Valor del inventario
- `useMonthlyInventoryValue` — Tendencia mensual
- `useSalesAnalytics` — Analytics de ventas
- `useSalesStats` — Estadísticas de ventas
- `usePreparationMetrics` — Métricas de preparación
- `usePublicationDays` — Días hasta publicación
- `useBrandDistribution` — Distribución por marca

## Permisos por Widget

Cada widget del dashboard tiene su propio permiso (`DASHBOARD_COMERCIAL_VENTAS`, etc.), permitiendo personalizar qué ve cada rol.

## Dashboard Superadmin

Para superadmins, dashboard cross-tenant con:
- Análisis de precios promedio
- Eficiencia de ventas
- Top vehículos vendidos/vistos
- Top automotoras
- Estadísticas de financiamiento
- Adopción del builder
- Métricas de usabilidad

### Exclusión de automotoras inactivas

Las automotoras marcadas con `clients.is_active = false` se excluyen automáticamente de **todas** las métricas globales (Dashboard y Usabilidad). El patrón vive en `useSuperadminStats` y `useUsabilityStats`:

1. Constante `BASE_EXCLUDED_CLIENT_IDS = [1, 24, 174]` — IDs internos/de test.
2. `useEffect` inicial trae los IDs con `is_active = false` y los suma a la base.
3. `excludedClientIdsString` (memoizado) se usa en todas las queries vía `.not('client_id', 'in', ...)`.
4. Los demás `useEffect` que disparan fetches están gateados con `if (!excludedClientIdsString) return;` para evitar correr antes de tener la lista.

Marcar/desmarcar automotoras inactivas se hace desde `/clientes` (tab "Inactivos"), solo visible para superadmin. Ver el módulo de Clientes/Automotoras para detalles del flujo de UI.

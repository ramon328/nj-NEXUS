import type { QueryClient } from '@tanstack/react-query';

/**
 * Claves (prefijos) de queries que dependen de los datos de ventas y que deben
 * refrescarse cuando se crea / edita / aprueba / revierte una venta.
 *
 * Bug reportado (Mallorca): "al editar una nota de venta, el monto no se
 * actualiza en el resumen del mes". La causa es que estas queries no se
 * invalidaban tras mutar una venta. `invalidateQueries` matchea por prefijo
 * (exact:false por defecto en react-query v5), así que basta el primer elemento.
 */
const SALE_AFFECTED_QUERY_PREFIXES = [
  // Resúmenes / dashboard de ventas y márgenes
  'salesSummary',
  'soldVehicles',
  'salesChart',
  'totalNetProfit',
  'sellerPerformance',
  'vehicle-net-profits-by-period',
  // Dashboard general (incluye autos vendidos / estados / costos)
  'dashboard-vehicles',
  'dashboard-sold-ids',
  'dashboard-costs',
  'dashboard-states',
  'dashboard-status-history',
  // Valor de inventario (una venta saca el auto del stock)
  'inventoryValue-extras',
  'inventoryKpis-extras',
  'monthlyInventory-extras',
  'monthlyInventory-sales',
  'monthlyInventory-purchaseDates',
  'oldestVehicles',
  // Conteos pendientes
  'pendingSales',
  'pendingSalesCount',
];

/**
 * Invalida todas las queries afectadas por una venta para que dashboards,
 * resúmenes mensuales y valor de inventario reflejen el cambio al instante.
 */
export const invalidateSalesQueries = (queryClient: QueryClient): void => {
  SALE_AFFECTED_QUERY_PREFIXES.forEach((prefix) => {
    queryClient.invalidateQueries({ queryKey: [prefix] });
  });
};

import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SalesStats } from './types/salesStats';
import { useSoldVehicles } from './useSoldVehicles';
import { useOperationalExpenses } from './useOperationalExpenses';
import { DateRangeFilter } from './utils/salesDataFetchers';
import {
  generateMonthlyData,
  generateWeeklyData,
  generateDailyData,
} from './utils/salesCalculations';
import { supabase } from '@/integrations/supabase/client';

export const useSalesStats = (
  clientId: number | undefined,
  dateFilter?: DateRangeFilter,
  groupByWeek?: boolean,
  groupByDay?: boolean
) => {
  // PRD §5 canonical totals derived from the single source of truth.
  const { rows: soldVehicles, loading: loadingSold } = useSoldVehicles(
    clientId,
    dateFilter
  );
  const operational = useOperationalExpenses(clientId, dateFilter);

  const totals = useMemo(() => {
    const totalSales = soldVehicles.reduce((s, r) => s + r.netSalePrice, 0);
    const totalDiscount = soldVehicles.reduce((s, r) => s + r.discount, 0);
    const totalCogs = soldVehicles.reduce((s, r) => s + r.cogs, 0);
    const totalDirectExpenses = soldVehicles.reduce((s, r) => s + r.directExpenses, 0);
    const totalSellerCommissions = soldVehicles.reduce((s, r) => s + r.sellerCommission, 0);

    const costOfSales = totalCogs + totalDirectExpenses;
    // grossMargin CANÓNICO = Σ utilidad bruta por auto (incluye comisión financiera,
    // excluye transferencia). Por construcción == Σ del detalle/resumen por vehículo.
    const grossMargin = soldVehicles.reduce((s, r) => s + r.grossProfit, 0);
    const grossMarginPct = totalSales > 0 ? (grossMargin / totalSales) * 100 : 0;

    const operationalExpenses = operational.total;
    // netMargin = "Resultado de la empresa" = Σ neta c/comisión − gastos operativos.
    const netMargin = grossMargin - totalSellerCommissions - operationalExpenses;
    const netMarginPct = totalSales > 0 ? (netMargin / totalSales) * 100 : 0;

    const vehiclesSoldCount = soldVehicles.length;
    const vehiclesWithoutCost = soldVehicles.filter((r) => !r.hasCostRegistered).length;

    // IVA agregado del período: Σ por-auto (== detalle por construcción; el neto se
    // recalcula como débito − crédito para no arrastrar redondeos de la resta por auto).
    const ivaDebito = soldVehicles.reduce((s, r) => s + r.ivaDebito, 0);
    const ivaCredito = soldVehicles.reduce((s, r) => s + r.ivaCredito, 0);
    const ivaNeto = ivaDebito - ivaCredito;

    return {
      totalSales,
      totalDiscount,
      totalCogs,
      totalDirectExpenses,
      costOfSales,
      grossMargin,
      grossMarginPct,
      totalSellerCommissions,
      operationalExpenses,
      netMargin,
      netMarginPct,
      vehiclesSoldCount,
      vehiclesWithoutCost,
      ivaDebito,
      ivaCredito,
      ivaNeto,
    };
  }, [soldVehicles, operational.total]);

  // Gastos fijos mensuales (sólo para la línea commonExpenses de los charts).
  const { data: fixedExpenses = [], isLoading: loadingFixed } = useQuery({
    queryKey: ['fixedExpenses', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from('fixed_monthly_expenses')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!clientId,
    placeholderData: keepPreviousData,
  });

  // Series de charts derivadas de las MISMAS filas canónicas (soldVehicles) que
  // los KPIs → el chart cuadra con el dashboard. Antes usaba fetchers legacy.
  const monthlyData = useMemo(() => {
    if (groupByDay && dateFilter?.startDate && dateFilter?.endDate) {
      return generateDailyData(soldVehicles, dateFilter.startDate, dateFilter.endDate, fixedExpenses);
    }
    if (groupByWeek && dateFilter?.startDate && dateFilter?.endDate) {
      return generateWeeklyData(soldVehicles, dateFilter.startDate, dateFilter.endDate, fixedExpenses);
    }
    return generateMonthlyData(soldVehicles, fixedExpenses, dateFilter?.startDate, dateFilter?.endDate);
  }, [soldVehicles, fixedExpenses, groupByDay, groupByWeek, dateFilter?.startDate, dateFilter?.endDate]);

  const stats: SalesStats & { soldVehicles: typeof soldVehicles } = {
    // PRD §5 canonical
    totalSales: totals.totalSales,
    totalDiscount: totals.totalDiscount,
    totalCogs: totals.totalCogs,
    totalDirectExpenses: totals.totalDirectExpenses,
    costOfSales: totals.costOfSales,
    grossMargin: totals.grossMargin,
    grossMarginPct: totals.grossMarginPct,
    totalSellerCommissions: totals.totalSellerCommissions,
    operationalExpenses: totals.operationalExpenses,
    netMargin: totals.netMargin,
    netMarginPct: totals.netMarginPct,
    vehiclesSoldCount: totals.vehiclesSoldCount,
    vehiclesWithoutCost: totals.vehiclesWithoutCost,
    ivaDebito: totals.ivaDebito,
    ivaCredito: totals.ivaCredito,
    ivaNeto: totals.ivaNeto,

    // Legacy back-compat
    totalExpenses: totals.costOfSales,
    totalCommissions: totals.totalSellerCommissions,
    totalExtras: totals.totalDirectExpenses,

    monthlyData,
    soldVehicles,
  };

  return {
    ...stats,
    loading: loadingSold || operational.loading || loadingFixed,
  };
};

/**
 * Hook que devuelve la utilidad neta (c/comisión vendedor) agregada por período
 * (mensual / semanal / diaria). Fuente para los charts de "Ganancia Mensual" /
 * "Utilidad Neta".
 *
 * Consume EXACTAMENTE las mismas filas que el dashboard y el KPI
 * (fetchSoldVehicleRows): población status='approved', comisión vendedor canónica
 * (splits), financiera dentro, transferencia fuera. Antes tenía su propio fetch
 * (sin filtro de status, sin financiera/splits) y divergía.
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { DateRangeFilter } from './utils/salesDataFetchers';
import { fetchSoldVehicleRows } from './useSoldVehicles';

export type GroupBy = 'day' | 'week' | 'month';

export interface NetProfitByPeriod {
  /** Key de período: "Ene 26" / "Semana 1" / "15/05" */
  key: string;
  netProfit: number;
  /** Cantidad de vehículos vendidos en el período */
  count: number;
}

const MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const monthKey = (d: Date) =>
  `${MONTH_ABBR[d.getMonth()]} ${String(d.getFullYear() % 100).padStart(2, '0')}`;

const dayKey = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

const weekKey = (d: Date, startDate: Date) => {
  const diffDays = Math.floor(
    (d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const week = Math.floor(diffDays / 7) + 1;
  return `Semana ${week}`;
};

const computeKey = (d: Date, groupBy: GroupBy, startDate?: Date): string => {
  if (groupBy === 'day') return dayKey(d);
  if (groupBy === 'week' && startDate) return weekKey(d, startDate);
  return monthKey(d);
};

export const useVehicleNetProfitsByPeriod = (
  groupBy: GroupBy = 'month',
  dateFilter?: DateRangeFilter
) => {
  const { clientId, client } = useAuth();
  const clientExempt = !!(client as any)?.ventas_exentas_iva;

  return useQuery({
    queryKey: ['vehicle-net-profits-by-period', clientId, groupBy, dateFilter, clientExempt],
    queryFn: async (): Promise<NetProfitByPeriod[]> => {
      if (!clientId) return [];

      const rows = await fetchSoldVehicleRows(clientId, dateFilter, clientExempt);
      if (rows.length === 0) return [];

      const result = new Map<string, { netProfit: number; count: number }>();
      for (const r of rows) {
        if (!r.saleDate) continue;
        const date = new Date(r.saleDate);
        const key = computeKey(date, groupBy, dateFilter?.startDate);
        const bucket = result.get(key) || { netProfit: 0, count: 0 };
        bucket.netProfit += r.netProfitAfterSellerCommission;
        bucket.count += 1;
        result.set(key, bucket);
      }

      return Array.from(result.entries()).map(([key, v]) => ({
        key,
        netProfit: v.netProfit,
        count: v.count,
      }));
    },
    enabled: !!clientId,
    placeholderData: keepPreviousData,
  });
};

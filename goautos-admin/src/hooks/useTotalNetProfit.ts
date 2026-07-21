import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ConsignmentFilter } from '@/hooks/admin/useSellerPerformance';
import { fetchSoldVehicleRows } from '@/hooks/admin/useSoldVehicles';

/**
 * KPI "Utilidad Neta" = Σ utilidad neta c/comisión del vendedor, sobre EXACTAMENTE
 * las mismas filas que el dashboard (fetchSoldVehicleRows). Antes tenía su propio
 * fetch/cálculo y divergía. Ahora reconcilia por construcción con useSalesStats.
 */
export const useTotalNetProfit = (dateFilter?: {
  startDate?: Date;
  endDate?: Date;
  consignmentFilter?: ConsignmentFilter;
  sellerIds?: string[];
  dealershipIds?: number[] | null;
}) => {
  const { clientId, client } = useAuth();
  const clientExempt = !!(client as any)?.ventas_exentas_iva;

  const { data: totalNetProfit = 0, isLoading: loading } = useQuery({
    queryKey: [
      'totalNetProfit',
      clientId,
      dateFilter?.startDate?.getTime(),
      dateFilter?.endDate?.getTime(),
      dateFilter?.consignmentFilter,
      // Sin esto el KPI no se recalcula al filtrar por vendedor (rompía el invariante
      // Σ por-auto == dashboard, que SÍ filtra por sellerIds en useSoldVehicles).
      dateFilter?.sellerIds?.slice().sort().join(','),
      // Sede activa (Slice 4): alinear el cache con useSoldVehicles al cambiar de sede.
      dateFilter?.dealershipIds?.slice().sort().join(','),
      // Mismo motivo para el flag de exención: mantener el cache alineado con useSoldVehicles.
      clientExempt,
    ],
    enabled: !!clientId,
    queryFn: async (): Promise<number> => {
      const rows = await fetchSoldVehicleRows(clientId as number, dateFilter, clientExempt);
      return rows.reduce((s, r) => s + r.netProfitAfterSellerCommission, 0);
    },
  });

  return { totalNetProfit, loading };
};

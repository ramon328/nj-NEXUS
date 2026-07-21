import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SaleSummaryRow } from './types/salesSummary';
import { DateFilter } from './useSellerPerformance';
import { fetchSoldVehicleRows } from './useSoldVehicles';

/**
 * "Resumen de Ventas" (tabla por auto). Los NÚMEROS de plata salen de
 * fetchSoldVehicleRows (la fuente única que también alimenta el dashboard), así
 * la utilidad por fila == su aporte al total. Sólo los datos de DISPLAY
 * (cliente / vendedor / marca / foto) se traen aparte y se unen por saleId.
 */
// Fetch reutilizable (lo usan el hook y el export por rango). Trae las filas del
// "Resumen de Ventas" para el clientId + dateFilter dados, independiente del hook.
export async function fetchSalesSummaryRows(
  clientId: number,
  dateFilter?: DateFilter,
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<SaleSummaryRow[]> {
  try {
    const rows = await fetchSoldVehicleRows(clientId, dateFilter);
    if (rows.length === 0) return [];

    const saleIds = rows.map((r) => r.saleId);
    const { data: displayRaw } = await supabase
      .from('vehicles_sales')
      .select(`
        id,
        customer_id,
        customers:customer_id ( first_name, last_name, email, phone ),
        sellers:seller_id ( first_name, last_name ),
        vehicles!inner!vehicles_sales_vehicle_id_fkey (
          license_plate, year, main_image,
          brands:brand_id ( name ),
          models:model_id ( name )
        )
      `)
      .in('id', saleIds);

    const displayBySale = new Map<number, any>();
    for (const d of displayRaw || []) {
      displayBySale.set((d as any).id, d);
    }

    const mapped: SaleSummaryRow[] = rows.map((r) => {
      const d = displayBySale.get(r.saleId);
      const customer = d?.customers;
      const seller = d?.sellers;
      const vehicle = d?.vehicles;
      const brand = vehicle?.brands;
      const model = vehicle?.models;

      const name = (first?: string, last?: string) =>
        first && last ? `${first} ${last}` : first || last || 'N/A';

      return {
        saleId: r.saleId,
        vehicleId: r.vehicleId,
        customerName: name(customer?.first_name, customer?.last_name),
        customerEmail: customer?.email || 'N/A',
        customerPhone: customer?.phone || 'N/A',
        customerId: d?.customer_id ?? 0,
        sellerName: name(seller?.first_name, seller?.last_name),
        saleDate: r.saleDate || '',
        vehiclePatent: vehicle?.license_plate || 'N/A',
        vehicleBrand: brand?.name || 'N/A',
        vehicleModel: model?.name || 'N/A',
        vehicleVersion: '',
        vehicleYear: vehicle?.year || 0,
        acquisitionType: r.isConsigned ? 'Consignado' : 'Comprado',
        acquisitionPrice: r.hasCostRegistered ? r.cogs : null,
        extrasCost: r.directExpenses,
        salePrice: r.salePrice,
        commission: r.isConsigned ? r.grossProfit : r.sellerCommission,
        grossProfit: r.grossProfit,
        profit: r.netProfitAfterSellerCommission,
        vehicleMainImage: vehicle?.main_image || null,
      };
    });

    mapped.sort((a, b) => {
      const da = new Date(a.saleDate).getTime();
      const db = new Date(b.saleDate).getTime();
      return sortOrder === 'asc' ? da - db : db - da;
    });

    return mapped;
  } catch (error) {
    console.error('Error in fetchSalesSummaryRows:', error);
    return [];
  }
}

export const useSalesSummary = (
  clientId: number | undefined,
  dateFilter?: DateFilter
) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: sales = [], isLoading: loading } = useQuery({
    queryKey: [
      'salesSummary',
      clientId,
      dateFilter?.startDate?.getTime(),
      dateFilter?.endDate?.getTime(),
      dateFilter?.consignmentFilter,
      dateFilter?.sellerIds?.slice().sort().join(','),
      // Sede activa (Slice 4): recalcular el resumen al cambiar de sede.
      dateFilter?.dealershipIds?.slice().sort().join(','),
      sortOrder,
    ],
    enabled: !!clientId,
    queryFn: () =>
      fetchSalesSummaryRows(clientId as number, dateFilter, sortOrder),
  });

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return {
    sales,
    loading,
    sortOrder,
    toggleSortOrder,
  };
};

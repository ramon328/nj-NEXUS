import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerPerformance } from './types';

export type ConsignmentFilter = 'all' | 'consigned' | 'not_consigned';

export type DateFilter = {
  startDate?: Date;
  endDate?: Date;
  consignmentFilter?: ConsignmentFilter;
  sellerIds?: string[];
  /**
   * División de sedes (Slice 4): sedes visibles del usuario. Filtra los reportes
   * por la sede del VEHÍCULO. `null`/`undefined` = sin filtro (retrocompatible).
   */
  dealershipIds?: number[] | null;
};

export const useSellerPerformance = (
  clientId: number | undefined,
  dateFilter?: DateFilter
) => {
  const { data: sellerPerformance = [], isLoading: loading } = useQuery({
    queryKey: ['sellerPerformance', clientId, dateFilter?.startDate?.getTime(), dateFilter?.endDate?.getTime(), dateFilter?.consignmentFilter],
    queryFn: async () => {
      // First, get all sellers for this client
      const { data: sellersData, error: sellersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('client_id', clientId!)
        .in('rol', ['seller', 'vendedor']);

      if (sellersError) throw sellersError;

      if (!sellersData || sellersData.length === 0) {
        return [] as SellerPerformance[];
      }

      // Then get sales data for each seller
      const sellerIds = sellersData.map((seller) => seller.id);

      let query = supabase
        .from('vehicles_sales')
        .select('seller_id, sale_price, commission_amount, sale_date, vehicles!inner!vehicles_sales_vehicle_id_fkey(is_consigned)')
        .in('seller_id', sellerIds)
        .eq('status', 'approved');

      if (dateFilter?.startDate) {
        query = query.gte('sale_date', dateFilter.startDate.toISOString());
      }
      if (dateFilter?.endDate) {
        query = query.lte('sale_date', dateFilter.endDate.toISOString());
      }
      if (dateFilter?.consignmentFilter === 'consigned') {
        query = query.eq('vehicles.is_consigned', true);
      } else if (dateFilter?.consignmentFilter === 'not_consigned') {
        query = query.eq('vehicles.is_consigned', false);
      }

      const { data: salesData, error: salesError } = await query;
      if (salesError) throw salesError;

      // Process data for chart
      const performanceData = sellersData.map((seller) => {
        const sellerSales =
          salesData?.filter((sale) => sale.seller_id === seller.id) || [];
        const totalSales = sellerSales.reduce(
          (sum, sale) => sum + (Number(sale.sale_price) || 0),
          0
        );
        const totalCommissions = sellerSales.reduce(
          (sum, sale) => sum + (Number(sale.commission_amount) || 0),
          0
        );
        const vehiclesSold = sellerSales.length;

        return {
          id: seller.id,
          name:
            `${seller.first_name || ''} ${seller.last_name || ''}`.trim() ||
            `Vendedor ${seller.id}`,
          sales: totalSales,
          commissions: totalCommissions,
          vehiclesSold,
        };
      });

      // Sort by vehicles sold
      return performanceData.sort((a, b) => b.vehiclesSold - a.vehiclesSold) as SellerPerformance[];
    },
    enabled: !!clientId,
    placeholderData: keepPreviousData,
  });

  return { sellerPerformance, loading };
};

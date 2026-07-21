
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useActiveDealership } from '@/hooks/useActiveDealership';

export const useSalesData = (clientId: number | null, activeTab: string, pageSize = 10) => {
  const [sales, setSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  // División de sedes (Slice 4, decisión 4): la venta pertenece a la sede del AUTO.
  // Filtramos las ventas por la sede del vehículo en la pre-query de vehicles.
  // `null` = sin filtro (retrocompatible).
  const { visibleDealershipIds } = useActiveDealership();

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (clientId) {
      fetchSales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, activeTab, currentPage, visibleDealershipIds]);

  const fetchSales = async () => {
    if (!clientId) return;

    try {
      setIsLoading(true);

      // First, get vehicle IDs that belong to this client. Filtro de sede: solo
      // los autos de las sedes visibles O visibles-para-todas (dealership_id NULL).
      // Al acotar los vehicle_ids acá, las ventas quedan limitadas a la sede del auto
      // sin tocar vehicles_sales.
      let clientVehiclesQuery = supabase
        .from('vehicles')
        .select('id')
        .eq('client_id', clientId);

      if (visibleDealershipIds && visibleDealershipIds.length > 0) {
        clientVehiclesQuery = clientVehiclesQuery.or(
          `dealership_id.in.(${visibleDealershipIds.join(',')}),dealership_id.is.null`
        );
      }

      const { data: clientVehicles, error: vehiclesError } = await clientVehiclesQuery;

      if (vehiclesError) {
        console.error('Error fetching client vehicles:', vehiclesError);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los vehículos',
          variant: 'destructive',
        });
        return;
      }

      // If no vehicles found, return empty sales
      if (!clientVehicles || clientVehicles.length === 0) {
        setSales([]);
        setTotalCount(0);
        setTotalPages(1);
        setIsLoading(false);
        return;
      }

      // Get the vehicle IDs
      const vehicleIds = clientVehicles.map(v => v.id);

      // Now fetch sales for these vehicles
      let query = supabase
        .from('vehicles_sales')
        .select(`
          id,
          vehicle_id,
          customer_id,
          sale_price,
          payment_method,
          financiera,
          sale_date,
          status,
          seller_id,
          commission_amount,
          commission_percentage,
          commission_base_type,
          commission_status,
          approval_date,
          approved_by,
          approval_notes,
          customer:customer_id(id, first_name, last_name, email),
          vehicle:vehicle_id(id, year, brand_id, model_id, license_plate, main_image, is_consigned, brand:brand_id(name), model:model_id(name)),
          seller:seller_id(id, first_name, last_name, email)
        `, { count: 'exact' })
        .in('vehicle_id', vehicleIds);

      // If not showing all, filter by status
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      query = query
        .order('sale_date', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching sales:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las ventas',
          variant: 'destructive',
        });
        return;
      }

      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));

      // financing_settled: fetch DEFENSIVO (la columna puede no existir aún si la
      // migración 20260616140000 no se aplicó). Si falla, las ventas quedan sin el
      // flag y se muestran como "pendiente" — la lista NUNCA se rompe por esto.
      if (data && data.length > 0) {
        try {
          const ids = data.map((s) => s.id);
          const { data: finRows, error: finErr } = await supabase
            .from('vehicles_sales')
            .select('id, financing_settled, financing_settled_at')
            .in('id', ids);
          if (!finErr && finRows) {
            const finMap = new Map(finRows.map((f: any) => [f.id, f]));
            data.forEach((s: any) => {
              const f: any = finMap.get(s.id);
              if (f) {
                s.financing_settled = f.financing_settled;
                s.financing_settled_at = f.financing_settled_at;
              }
            });
          }
        } catch {
          /* columna aún no existe — se ignora */
        }
      }

      // Batch-fetch acquisition costs (2 queries instead of N)
      if (data && data.length > 0) {
        const saleVehicleIds = data.map(s => s.vehicle_id);

        const [purchasesResult, consignmentsResult] = await Promise.all([
          supabase.from('vehicles_purchases').select('vehicle_id, purchase_price').in('vehicle_id', saleVehicleIds),
          supabase.from('vehicles_consignments').select('vehicle_id, agreed_price').in('vehicle_id', saleVehicleIds),
        ]);

        const purchaseMap = new Map((purchasesResult.data || []).map(p => [p.vehicle_id, p.purchase_price]));
        const consignmentMap = new Map((consignmentsResult.data || []).map(c => [c.vehicle_id, c.agreed_price]));

        const salesWithAcquisitionCost = data.map(sale => ({
          ...sale,
          acquisition_cost: sale.vehicle?.is_consigned
            ? (consignmentMap.get(sale.vehicle_id) || 0)
            : (purchaseMap.get(sale.vehicle_id) || 0),
        }));

        setSales(salesWithAcquisitionCost);
      } else {
        setSales(data || []);
      }
    } catch (error) {
      console.error('Error in fetchSales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sales,
    isLoading,
    fetchSales,
    currentPage,
    setCurrentPage,
    totalCount,
    totalPages,
  };
};

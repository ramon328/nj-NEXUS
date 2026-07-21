import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateFilter } from './useSellerPerformance';

export interface SellerData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface SellerVehicle {
  id: number;
  year: number;
  price: number;
  created_at: string;
  brand: { name: string } | null;
  model: { name: string } | null;
  status: { name: string } | null;
}

export interface SellerSale {
  id: number;
  sale_date: string;
  sale_price: number;
  commission_amount: number;
  vehicle: {
    year: number;
    brand: { name: string } | null;
    model: { name: string } | null;
  } | null;
}

export interface SellerStats {
  seller: SellerData;
  totalSales: number;
  totalCommissions: number;
  vehiclesSold: number;
  assignedVehicles: number;
  consignmentsCaptured: number;
  vehicles: SellerVehicle[];
  sales: SellerSale[];
}

export const useSellersData = (
  clientId: number | undefined,
  dateFilter?: DateFilter
) => {
  const [loading, setLoading] = useState(true);
  const [sellersStats, setSellersStats] = useState<SellerStats[]>([]);

  useEffect(() => {
    if (!clientId) return;

    const fetchSellersData = async () => {
      try {
        setLoading(true);

        // 1. Obtener todos los vendedores del cliente (legacy rol + multi-role via user_roles)
        const { data: sellersData, error: sellersError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .eq('client_id', clientId)
          .in('rol', ['seller', 'vendedor']);

        if (sellersError) throw sellersError;
        if (!sellersData || sellersData.length === 0) {
          setSellersStats([]);
          setLoading(false);
          return;
        }

        const sellerIds = sellersData.map((seller) => seller.id);

        // 2. Primero obtener los IDs de estados vendido/reservado/archivado
        const { data: statesData } = await supabase
          .from('clients_vehicles_states')
          .select('id, name')
          .eq('client_id', clientId);

        const excludedStateIds = statesData
          ?.filter((s) => {
            const name = s.name.toLowerCase();
            return name.includes('vendido') || name.includes('reservado') || name.includes('archivado');
          })
          .map((s) => s.id) || [];

        // 3. Obtener vehículos asignados a cada vendedor (excluyendo vendidos/reservados/archivados)
        let vehiclesQuery = supabase
          .from('vehicles')
          .select(`
            id,
            year,
            price,
            created_at,
            seller_id,
            brand:brand_id(name),
            model:model_id(name),
            status:status_id(name)
          `)
          .in('seller_id', sellerIds)
          .eq('client_id', clientId);

        if (excludedStateIds.length > 0) {
          vehiclesQuery = vehiclesQuery.not('status_id', 'in', `(${excludedStateIds.join(',')})`);
        }

        const { data: vehiclesData, error: vehiclesError } = await vehiclesQuery;

        if (vehiclesError) throw vehiclesError;

        // 4. Obtener ventas de cada vendedor con filtro de fecha
        let salesQuery = supabase
          .from('vehicles_sales')
          .select(`
            id,
            sale_date,
            sale_price,
            commission_amount,
            seller_id,
            vehicle:vehicle_id(
              year,
              is_consigned,
              brand:brand_id(name),
              model:model_id(name)
            )
          `)
          .in('seller_id', sellerIds)
          .eq('status', 'approved');

        if (dateFilter?.startDate) {
          salesQuery = salesQuery.gte('sale_date', dateFilter.startDate.toISOString());
        }
        if (dateFilter?.endDate) {
          salesQuery = salesQuery.lte('sale_date', dateFilter.endDate.toISOString());
        }

        const { data: salesData, error: salesError } = await salesQuery;

        // Filtrar por consignación después de obtener los datos
        let filteredSalesData = salesData || [];
        if (dateFilter?.consignmentFilter === 'consigned') {
          filteredSalesData = filteredSalesData.filter((s: any) => s.vehicle?.is_consigned === true);
        } else if (dateFilter?.consignmentFilter === 'not_consigned') {
          filteredSalesData = filteredSalesData.filter((s: any) => s.vehicle?.is_consigned === false);
        }
        if (salesError) throw salesError;

        // 4b. Obtener consignaciones captadas por cada vendedor
        const { data: consignmentCaptures } = await supabase
          .from('vehicles_consignments')
          .select('consignment_seller_id')
          .in('consignment_seller_id', sellerIds);

        // 5. Procesar datos para cada vendedor
        const stats: SellerStats[] = sellersData.map((seller) => {
          // Vehículos asignados
          const sellerVehicles = (vehiclesData || []).filter(
            (v) => v.seller_id === seller.id
          ) as SellerVehicle[];

          // Ventas del vendedor (filtradas por fecha y consignación)
          const sellerSales = filteredSalesData.filter(
            (s) => s.seller_id === seller.id
          ) as SellerSale[];

          const totalSales = sellerSales.reduce(
            (sum, sale) => sum + (Number(sale.sale_price) || 0),
            0
          );
          const totalCommissions = sellerSales.reduce(
            (sum, sale) => sum + (Number(sale.commission_amount) || 0),
            0
          );

          return {
            seller: {
              id: seller.id,
              first_name: seller.first_name || '',
              last_name: seller.last_name || '',
              email: seller.email || '',
            },
            totalSales,
            totalCommissions,
            vehiclesSold: sellerSales.length,
            assignedVehicles: sellerVehicles.length,
            consignmentsCaptured: (consignmentCaptures || []).filter(
              (c: any) => c.consignment_seller_id === seller.id
            ).length,
            vehicles: sellerVehicles,
            sales: sellerSales,
          };
        });

        // Ordenar por total de ventas descendente
        setSellersStats(stats.sort((a, b) => b.totalSales - a.totalSales));
      } catch (error) {
        console.error('Error fetching sellers data:', error);
        setSellersStats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSellersData();
  }, [clientId, dateFilter]);

  // Calcular el mejor vendedor (por ventas en el rango de fechas)
  const bestSeller = sellersStats.length > 0 ? sellersStats[0] : null;

  return {
    sellersStats,
    bestSeller,
    loading,
  };
};

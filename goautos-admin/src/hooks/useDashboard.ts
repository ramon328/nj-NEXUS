
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveDealership } from '@/hooks/useActiveDealership';
import { toast } from '@/hooks/use-toast';

export interface DashboardData {
  totalSales: number;
  totalVehiclesSold: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export const useDashboard = () => {
  const { clientId } = useAuth();
  // División de sedes (Slice 4): filtra las métricas por la sede del vehículo.
  // `null` = sin filtro (retrocompatible).
  const { visibleDealershipIds } = useActiveDealership();
  const [stats, setStats] = useState<DashboardData>({
    totalSales: 0,
    totalVehiclesSold: 0,
    totalRevenue: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, visibleDealershipIds]);

  const fetchDashboardData = async () => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      
      // First, get all valid vehicle IDs for this client. Filtro de sede: solo los
      // autos de las sedes visibles O visibles-para-todas (dealership_id NULL). Todo
      // lo demás (ventas, gastos) cuelga de estos ids, así que hereda el filtro.
      let vehiclesQuery = supabase
        .from('vehicles')
        .select('id')
        .eq('client_id', clientId);

      if (visibleDealershipIds && visibleDealershipIds.length > 0) {
        vehiclesQuery = vehiclesQuery.or(
          `dealership_id.in.(${visibleDealershipIds.join(',')}),dealership_id.is.null`
        );
      }

      const { data: vehicleIds, error: vehicleError } = await vehiclesQuery;

      if (vehicleError) {
        console.error('Error fetching vehicles:', vehicleError);
        throw vehicleError;
      }
      
      if (!vehicleIds || vehicleIds.length === 0) {
        // No vehicles found, set default stats
        setStats({
          totalSales: 0,
          totalVehiclesSold: 0,
          totalRevenue: 0,
          monthlyRevenue: 0
        });
        setLoading(false);
        return;
      }
      
      // Extract just the IDs into an array
      const ids = vehicleIds.map(v => v.id);
      
      // Fetch sales data using IN operator instead of join
      const { data: salesData, error: salesError } = await supabase
        .from('vehicles_sales')
        .select('id, sale_price, sale_date')
        .in('vehicle_id', ids);
        
      if (salesError) {
        console.error('Error fetching sales data:', salesError);
        throw salesError;
      }
      
      // Calculate total sales
      const totalSales = salesData?.reduce((sum, sale) => sum + (Number(sale.sale_price) || 0), 0) || 0;
      
      // Calculate total vehicles sold
      const totalVehiclesSold = salesData?.length || 0;
      
      // Calculate monthly revenue
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      const monthlySales = salesData?.filter(sale => {
        if (!sale.sale_date) return false;
        const saleDate = new Date(sale.sale_date);
        return saleDate >= firstDayOfMonth;
      }) || [];
      
      const monthlyRevenue = monthlySales.reduce((sum, sale) => sum + (Number(sale.sale_price) || 0), 0);
      
      // Fetch expenses data
      const { data: expensesData, error: expensesError } = await supabase
        .from('vehicles_extras')
        .select('amount, type')
        .eq('type', 'expense')
        .in('vehicle_id', ids);
        
      if (expensesError) {
        console.error('Error fetching expenses data:', expensesError);
        // Continue with 0 expenses instead of throwing
      }
      
      // Calculate total expenses
      const totalExpenses = expensesData
        ?.reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0) || 0;
      
      // Calculate total revenue (sales minus expenses)
      const totalRevenue = totalSales - totalExpenses;
      
      setStats({
        totalSales,
        totalVehiclesSold,
        totalRevenue,
        monthlyRevenue
      });
      
    } catch (error) {
      console.error('Error in fetchDashboardData:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar los datos del dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return { stats, loading };
};

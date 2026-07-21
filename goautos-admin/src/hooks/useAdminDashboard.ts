
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useActiveDealership } from '@/hooks/useActiveDealership';
import { toast } from '@/hooks/use-toast';

interface DashboardStats {
  totalVehicles: number;
  publishedVehicles: number;
  soldVehicles: number;
  totalVisits: number;
  totalSales: number;
  byStatusCount: Record<string, number>;
}

export const useAdminDashboard = () => {
  const { clientId } = useAuth();
  // División de sedes (Slice 4): sedes visibles del usuario. `null` = sin filtro.
  const { visibleDealershipIds } = useActiveDealership();
  // Cadena OR reutilizable: auto visible si su sede está en las visibles O es NULL
  // (visible para todas). Se aplica a la tabla `vehicles` (directa) y a `vehicles`
  // embebida en `vehicles_sales` (aliaseada como `veh` vía referencedTable: como
  // `vehicles_sales` tiene DOS FKs a `vehicles`, el embed lleva FK hint + alias).
  const sedeOr =
    visibleDealershipIds && visibleDealershipIds.length > 0
      ? `dealership_id.in.(${visibleDealershipIds.join(',')}),dealership_id.is.null`
      : null;
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    publishedVehicles: 0,
    soldVehicles: 0,
    totalVisits: 0,
    totalSales: 0,
    byStatusCount: {},
  });
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<{ month: string; visits: number; sales: number }[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (!clientId) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch total vehicles
        let totalVehiclesQuery = supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId);
        if (sedeOr) totalVehiclesQuery = totalVehiclesQuery.or(sedeOr);
        const { count: totalVehicles, error: vehiclesError } = await totalVehiclesQuery;

        if (vehiclesError) throw vehiclesError;

        // Try to get published vehicles by status first (more accurate)
        let publishedVehicles = 0;
        let statusVehiclesQuery = supabase
          .from('vehicles')
          .select('id, status:clients_vehicles_states!inner(name)')
          .eq('client_id', clientId);
        if (sedeOr) statusVehiclesQuery = statusVehiclesQuery.or(sedeOr);
        const { data: statusVehicles, error: statusError } = await statusVehiclesQuery;

        if (!statusError && statusVehicles) {
          publishedVehicles = statusVehicles.filter(v =>
            v.status?.name === 'Publicado'
          ).length;
        } else {
          // Fallback to published flag
          let pubQuery = supabase
            .from('vehicles')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', clientId)
            .eq('is_published', true);
          if (sedeOr) pubQuery = pubQuery.or(sedeOr);
          const { count: pubCount, error: publishedError } = await pubQuery;

          if (!publishedError) {
            publishedVehicles = pubCount || 0;
          }
        }

        // Fetch sold vehicles
        let salesQuery = supabase
          .from('vehicles_sales')
          .select('id, sale_price, vehicle_id, veh:vehicles!inner!vehicles_sales_vehicle_id_fkey(client_id)')
          .eq('veh.client_id', clientId);
        if (sedeOr) salesQuery = salesQuery.or(sedeOr, { referencedTable: 'veh' });
        const { data: salesData, error: salesError } = await salesQuery;

        if (salesError) throw salesError;

        // Fetch total visits
        const { count: totalVisits, error: visitsError } = await supabase
          .from('page_visits')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId);

        if (visitsError) throw visitsError;

        // Fetch vehicles by status
        let statusDataQuery = supabase
          .from('vehicles')
          .select('status_id, status:clients_vehicles_states!inner(id, name)')
          .eq('client_id', clientId);
        if (sedeOr) statusDataQuery = statusDataQuery.or(sedeOr);
        const { data: statusData, error: statusError2 } = await statusDataQuery;

        if (statusError2) throw statusError2;

        // Fetch vehicles by category
        let categoryDataQuery = supabase
          .from('vehicles')
          .select('category_id, category:categories!inner(id, name)')
          .eq('client_id', clientId);
        if (sedeOr) categoryDataQuery = categoryDataQuery.or(sedeOr);
        const { data: categoryData, error: categoryError } = await categoryDataQuery;

        if (categoryError) throw categoryError;

        // Calculate counts by status
        const byStatusCount: Record<string, number> = {};
        statusData?.forEach(item => {
          const statusName = item.status?.name || 'Sin estado';
          byStatusCount[statusName] = (byStatusCount[statusName] || 0) + 1;
        });

        // Calculate counts by category
        const categoryCount: Record<string, number> = {};
        categoryData?.forEach(item => {
          const categoryName = item.category?.name || 'Sin categoría';
          categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
        });

        // Prepare vehicle types for the chart
        const vehicleTypeArray = Object.entries(categoryCount).map(([name, value]) => ({ name, value }));

        // Calculate total sales amount
        const totalSales = salesData?.reduce((sum, sale) => sum + (Number(sale.sale_price) || 0), 0) || 0;

        // Generate monthly data (this would ideally be from real data, but we'll simulate for now)
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
        const monthlyVisitsData = await generateMonthlyData(clientId, months);

        setStats({
          totalVehicles: totalVehicles || 0,
          publishedVehicles,
          soldVehicles: salesData?.length || 0,
          totalVisits: totalVisits || 0,
          totalSales,
          byStatusCount,
        });

        setVehicleTypes(vehicleTypeArray);
        setMonthlyData(monthlyVisitsData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error",
          description: "No se pudo cargar los datos del dashboard",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, sedeOr]);

  // Helper function to generate monthly data
  const generateMonthlyData = async (clientId: number, months: string[]) => {
    // In a real implementation, we'd query the database for monthly visits and sales
    // For now, we'll use the real total counts and distribute them across months
    
    try {
      // Get visits distribution by month (limited to last 6 months)
      const { data: visitsData } = await supabase
        .from('page_visits')
        .select('created_at')
        .eq('client_id', clientId)
        .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString());

      // Get sales distribution by month
      let monthlySalesQuery = supabase
        .from('vehicles_sales')
        .select('sale_date, sale_price, veh:vehicles!inner!vehicles_sales_vehicle_id_fkey(client_id)')
        .eq('veh.client_id', clientId)
        .gte('sale_date', new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString());
      if (sedeOr) monthlySalesQuery = monthlySalesQuery.or(sedeOr, { referencedTable: 'veh' });
      const { data: salesData } = await monthlySalesQuery;

      // Group visits by month
      const visitsByMonth: Record<string, number> = {};
      visitsData?.forEach(visit => {
        const monthIndex = new Date(visit.created_at).getMonth();
        const monthName = months[monthIndex % months.length];
        visitsByMonth[monthName] = (visitsByMonth[monthName] || 0) + 1;
      });

      // Group sales by month
      const salesByMonth: Record<string, number> = {};
      salesData?.forEach(sale => {
        if (sale.sale_date) {
          const monthIndex = new Date(sale.sale_date).getMonth();
          const monthName = months[monthIndex % months.length];
          salesByMonth[monthName] = (salesByMonth[monthName] || 0) + (Number(sale.sale_price) || 0);
        }
      });

      // Create combined dataset
      return months.map(month => ({
        month,
        visits: visitsByMonth[month] || 0,
        sales: salesByMonth[month] || 0
      }));
    } catch (error) {
      console.error('Error generating monthly data:', error);
      return months.map(month => ({
        month,
        visits: 0,
        sales: 0
      }));
    }
  };

  return { stats, loading, monthlyData, vehicleTypes };
};

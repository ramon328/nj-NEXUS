
import { supabase } from '@/integrations/supabase/client';
import { DashboardStats, MonthlyData, VehicleTypeData } from './types';

export async function fetchDashboardStats(clientId: number): Promise<DashboardStats> {
  // Fetch total vehicles
  const { count: totalVehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId);

  if (vehiclesError) throw vehiclesError;

  // Try to get published vehicles by status first (more accurate)
  let publishedVehicles = 0;
  const { data: statusVehicles, error: statusError } = await supabase
    .from('vehicles')
    .select('id, status:clients_vehicles_states!inner(name)')
    .eq('client_id', clientId);
    
  if (!statusError && statusVehicles) {
    publishedVehicles = statusVehicles.filter(v => 
      v.status?.name === 'Publicado'
    ).length;
  } else {
    // Fallback to published flag
    const { count: pubCount, error: publishedError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('is_published', true);

    if (!publishedError) {
      publishedVehicles = pubCount || 0;
    }
  }

  // Fetch sold vehicles
  const { data: salesData, error: salesError } = await supabase
    .from('vehicles_sales')
    .select('id, sale_price, vehicle_id, vehicles!inner(client_id)')
    .eq('vehicles.client_id', clientId);

  if (salesError) throw salesError;

  // Fetch total visits
  const { count: totalVisits, error: visitsError } = await supabase
    .from('page_visits')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId);

  if (visitsError) throw visitsError;

  // Fetch vehicles by status
  const { data: statusData, error: statusError2 } = await supabase
    .from('vehicles')
    .select('status_id, status:clients_vehicles_states!inner(id, name)')
    .eq('client_id', clientId);

  if (statusError2) throw statusError2;

  // Calculate counts by status
  const byStatusCount: Record<string, number> = {};
  statusData?.forEach(item => {
    const statusName = item.status?.name || 'Sin estado';
    byStatusCount[statusName] = (byStatusCount[statusName] || 0) + 1;
  });

  // Calculate total sales amount
  const totalSales = salesData?.reduce((sum, sale) => sum + (Number(sale.sale_price) || 0), 0) || 0;

  return {
    totalVehicles: totalVehicles || 0,
    publishedVehicles,
    soldVehicles: salesData?.length || 0,
    totalVisits: totalVisits || 0,
    totalSales,
    byStatusCount,
  };
}

export async function fetchVehicleTypes(clientId: number): Promise<VehicleTypeData[]> {
  // Fetch vehicles by category
  const { data: categoryData, error: categoryError } = await supabase
    .from('vehicles')
    .select('category_id, category:categories!inner(id, name)')
    .eq('client_id', clientId);

  if (categoryError) throw categoryError;

  // Calculate counts by category
  const categoryCount: Record<string, number> = {};
  categoryData?.forEach(item => {
    const categoryName = item.category?.name || 'Sin categoría';
    categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
  });

  // Prepare vehicle types for the chart
  return Object.entries(categoryCount).map(([name, value]) => ({ name, value }));
}

export async function generateMonthlyData(clientId: number, months: string[]): Promise<MonthlyData[]> {
  try {
    // Get visits distribution by month (limited to last 6 months)
    const { data: visitsData } = await supabase
      .from('page_visits')
      .select('created_at')
      .eq('client_id', clientId)
      .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString());

    // Get sales distribution by month
    const { data: salesData } = await supabase
      .from('vehicles_sales')
      .select('sale_date, sale_price, vehicles!inner(client_id)')
      .eq('vehicles.client_id', clientId)
      .gte('sale_date', new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString());

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
}

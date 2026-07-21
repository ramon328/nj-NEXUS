import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TimeRange } from '@/components/superadmin/TimeRangeSelector';

type DashboardStats = {
  totalVisits: number;
  totalVehicles: number;
  publishedVehicles: number;
  soldVehicles: number;
  totalSales: number;
  vehiclesInPeriod: number;
  totalDealers: number;
  totalPayingDealers: number;
  activeDealers: number;
  ghostDealers: number;
};

type MonthlyData = {
  month: string;
  vehiclesAdded: number;
  salesGenerated: number;
};

type WeeklyData = {
  week: string;
  vehiclesAdded: number;
};

// Nuevos tipos para los análisis avanzados
type TopViewedItem = {
  name: string;
  visits: number;
};

type TopViewedDealer = {
  id: number;
  name: string;
  total_visits: number;
  total_vehicles: number;
  avg_visits_per_vehicle: number;
};

type TopSellingDealer = {
  name: string;
  total_sold: number;
};

type TopSoldVehicle = {
  id: number;
  brand: string;
  model: string;
  vehicle_type: string;
  total_sold: number;
  avg_price: number;
  total_clients: number;
};

type TopSoldCategory = {
  name: string;
  total_sold: number;
};

type PriceAnalysis = {
  total_sales: number;
  avg_price: number;
  median_price: number;
  price_range: {
    min: number;
    max: number;
  };
  price_distribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  price_trend: {
    period: string;
    avg_price: number;
    change_percentage: number;
  }[];
  concentration_insight: string;
};

type SalesEfficiency = {
  id: number;
  name: string;
  total_vehicles: number;
  sold_vehicles: number;
  conversion_rate: number;
  avg_days_to_sell: number;
  total_revenue: number;
  avg_price_per_vehicle: number;
  stock_turnover: number;
};

type FinancingStats = {
  id: number;
  name: string;
  total: number;
};

// IDs base de clientes internos/test excluidos de estadísticas globales.
// A estos se les suman dinámicamente los clientes con is_active = false.
const BASE_EXCLUDED_CLIENT_IDS = [1, 24, 174];

export const useSuperadminStats = (
  selectedClientId: number | null = null,
  timeRange: TimeRange = '30days'
) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalVisits: 0,
    totalVehicles: 0,
    publishedVehicles: 0,
    soldVehicles: 0,
    totalSales: 0,
    vehiclesInPeriod: 0,
    totalDealers: 0,
    totalPayingDealers: 0,
    activeDealers: 0,
    ghostDealers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [dailyData, setDailyData] = useState<MonthlyData[]>([]);

  // Nuevos estados para los análisis avanzados
  const [topViewedBrands, setTopViewedBrands] = useState<TopViewedItem[]>([]);
  const [topViewedCategories, setTopViewedCategories] = useState<
    TopViewedItem[]
  >([]);
  const [topViewedDealers, setTopViewedDealers] = useState<TopViewedDealer[]>(
    []
  );
  const [topSellingDealers, setTopSellingDealers] = useState<
    TopSellingDealer[]
  >([]);
  const [topSoldVehicles, setTopSoldVehicles] = useState<TopSoldVehicle[]>([]);
  const [topSoldCategories, setTopSoldCategories] = useState<TopSoldCategory[]>(
    []
  );
  const [priceAnalysis, setPriceAnalysis] = useState<PriceAnalysis | null>(
    null
  );
  const [salesEfficiency, setSalesEfficiency] = useState<SalesEfficiency[]>([]);
  const [financingStats, setFinancingStats] = useState<FinancingStats[]>([]);
  const [vehiclesByDealerData, setVehiclesByDealerData] = useState<
    { name: string; vehiclesAdded: number }[]
  >([]);
  const [vehiclesByDateData, setVehiclesByDateData] = useState<
    { date: string; vehiclesAdded: number }[]
  >([]);

  // null = aún no cargado. Una vez cargado, contiene los IDs de clientes inactivos.
  const [inactiveClientIds, setInactiveClientIds] = useState<number[] | null>(
    null
  );

  // String '(1,24,174,...)' listo para usar en queries .not('id', 'in', ...).
  // Combina los IDs base (internos/test) con los marcados como inactivos.
  const excludedClientIdsString = useMemo(() => {
    if (inactiveClientIds === null) return null;
    const all = [...BASE_EXCLUDED_CLIENT_IDS, ...inactiveClientIds];
    return `(${all.join(',')})`;
  }, [inactiveClientIds]);

  const applyClientFilter = (query: any, selectedClientId: number | null) => {
    if (selectedClientId) {
      return query.eq('client_id', selectedClientId);
    }
    return query.not('client_id', 'in', excludedClientIdsString);
  };

  const applyVehicleClientFilter = (
    query: any,
    selectedClientId: number | null
  ) => {
    if (selectedClientId) {
      return query.eq('vehicles.client_id', selectedClientId);
    }
    return query.not('vehicles.client_id', 'in', excludedClientIdsString);
  };

  const { toast } = useToast();

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .not('id', 'in', excludedClientIdsString)
        .order('name');

      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Error in fetchClients:', error);
    }
  };

  const getStartDateFromTimeRange = (range: TimeRange): Date => {
    const startDate = new Date();
    switch (range) {
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;

      case '6months':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
      default:
        startDate.setFullYear(2000);
        break;
    }
    return startDate;
  };

  // Función para obtener autos más vistos
  const fetchTopViewedVehicles = async () => {
    try {
      const startDate = getStartDateFromTimeRange(timeRange);

      let pageVisitsQuery = supabase
        .from('page_visits')
        .select('pathname, client_id')
        .like('pathname', '/vehicles/%')
        .gte('created_at', startDate.toISOString());

      pageVisitsQuery = applyClientFilter(pageVisitsQuery, selectedClientId);

      const { data: visitsData, error: visitsError } = await pageVisitsQuery;

      if (visitsError) {
        console.error('Error fetching page visits for brands:', visitsError);
        return;
      }

      const vehicleVisits = new Map<number, number>();
      visitsData?.forEach((visit) => {
        if (visit.pathname) {
          const vehicleId = parseInt(
            visit.pathname.replace('/vehicles/', ''),
            10
          );
          if (!isNaN(vehicleId)) {
            vehicleVisits.set(
              vehicleId,
              (vehicleVisits.get(vehicleId) || 0) + 1
            );
          }
        }
      });

      const vehicleIds = Array.from(vehicleVisits.keys());
      if (vehicleIds.length === 0) {
        setTopViewedBrands([]);
        setTopViewedCategories([]);
        return;
      }

      const { data: vehiclesData, error: vehiclesError2 } = await supabase
        .from('vehicles')
        .select('id, brands(name), categories(name)')
        .in('id', vehicleIds);

      if (vehiclesError2) {
        console.error('Error fetching vehicle details:', vehiclesError2);
        return;
      }

      const brandVisits = new Map<string, number>();
      const categoryVisits = new Map<string, number>();

      vehiclesData?.forEach((vehicle) => {
        const visits = vehicleVisits.get(vehicle.id) || 0;

        if (vehicle.brands?.name) {
          const brandName = vehicle.brands.name;
          brandVisits.set(
            brandName,
            (brandVisits.get(brandName) || 0) + visits
          );
        }

        if (vehicle.categories?.name) {
          const categoryName = vehicle.categories.name;
          categoryVisits.set(
            categoryName,
            (categoryVisits.get(categoryName) || 0) + visits
          );
        }
      });

      const topBrands = Array.from(brandVisits.entries())
        .map(([name, visits]) => ({ name, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10);

      const topCategories = Array.from(categoryVisits.entries())
        .map(([name, visits]) => ({ name, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10);

      setTopViewedBrands(topBrands);
      setTopViewedCategories(topCategories);
    } catch (error) {
      console.error('Error in fetchTopViewedVehicles:', error);
    }
  };

  // Función para obtener automotoras con más vistas
  const fetchTopViewedDealers = async () => {
    try {
      const startDate = getStartDateFromTimeRange(timeRange);

      // Obtener visitas agrupadas por cliente
      let query = supabase
        .from('page_visits')
        .select('client_id, created_at, clients!inner(id, name)')
        .gte('created_at', startDate.toISOString());

      query = applyClientFilter(query, selectedClientId);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching top viewed dealers:', error);
        return;
      }

      // Agrupar por cliente y contar visitas
      const dealerVisits = new Map();
      data?.forEach((visit) => {
        const clientId = visit.client_id;
        if (clientId && visit.clients) {
          if (!dealerVisits.has(clientId)) {
            dealerVisits.set(clientId, {
              id: clientId,
              name: visit.clients.name,
              total_visits: 0,
              total_vehicles: 0,
              avg_visits_per_vehicle: 0,
            });
          }
          dealerVisits.get(clientId).total_visits++;
        }
      });

      // Obtener total de vehículos por cliente
      let vehiclesQuery = supabase
        .from('vehicles')
        .select('id, clients!inner(id, name)', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .not('client_id', 'in', excludedClientIdsString);

      vehiclesQuery = applyClientFilter(vehiclesQuery, selectedClientId);

      const { data: vehiclesData } = await vehiclesQuery;

      vehiclesData?.forEach((vehicle) => {
        const clientId = vehicle.client_id;
        if (dealerVisits.has(clientId)) {
          dealerVisits.get(clientId).total_vehicles++;
        }
      });

      // Calcular promedio de visitas por vehículo
      dealerVisits.forEach((dealer) => {
        dealer.avg_visits_per_vehicle =
          dealer.total_vehicles > 0
            ? dealer.total_visits / dealer.total_vehicles
            : 0;
      });

      const topDealers = Array.from(dealerVisits.values())
        .sort((a, b) => b.total_visits - a.total_visits)
        .slice(0, 10);

      setTopViewedDealers(topDealers);
    } catch (error) {
      console.error('Error in fetchTopViewedDealers:', error);
    }
  };

  const fetchTopSellingDealers = async () => {
    try {
      const startDate = getStartDateFromTimeRange(timeRange);

      let query = supabase
        .from('vehicles_sales')
        .select(
          `
          vehicles!vehicles_sales_vehicle_id_fkey!inner(
            clients!inner(id, name)
          )
        `
        )
        .gte('created_at', startDate.toISOString());

      query = applyVehicleClientFilter(query, selectedClientId);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching top selling dealers:', error);
        return;
      }

      if (!data) {
        setTopSellingDealers([]);
        return;
      }

      const salesByDealer = new Map<string, number>();
      data.forEach((sale) => {
        if (sale.vehicles && sale.vehicles.clients) {
          const dealerName = sale.vehicles.clients.name;
          salesByDealer.set(
            dealerName,
            (salesByDealer.get(dealerName) || 0) + 1
          );
        }
      });

      const sortedDealers = Array.from(salesByDealer.entries())
        .map(([name, total_sold]) => ({ name, total_sold }))
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 10);

      setTopSellingDealers(sortedDealers);
    } catch (error) {
      console.error('Error in fetchTopSellingDealers:', error);
    }
  };

  // Función para obtener autos más vendidos
  const fetchTopSoldVehicles = async () => {
    try {
      const startDate = getStartDateFromTimeRange(timeRange);

      // Obtener ventas con información de vehículos
      let query = supabase
        .from('vehicles_sales')
        .select(
          `
          vehicle_id,
          sale_price,
          vehicles:vehicles!vehicles_sales_vehicle_id_fkey!inner(
            id,
            brands!left(name),
            models!left(name),
            categories!left(name),
            clients!inner(id, name)
          )
        `
        )
        .gte('created_at', startDate.toISOString());

      query = applyVehicleClientFilter(query, selectedClientId);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching top sold vehicles:', error);
        return;
      }

      if (!data) {
        setTopSoldVehicles([]);
        setTopSoldCategories([]);
        return;
      }

      // Agrupar por vehículo y calcular métricas
      const vehicleSales = new Map();
      const categorySales = new Map<string, number>();

      data?.forEach((sale) => {
        // Skip if vehicle data is missing
        if (!sale.vehicles) return;

        const brandName = sale.vehicles.brands?.name || 'N/A';
        const modelName = sale.vehicles.models?.name || 'N/A';
        const categoryName = sale.vehicles.categories?.name || 'N/A';

        // Acumular ventas por categoría
        if (categoryName !== 'N/A') {
          categorySales.set(
            categoryName,
            (categorySales.get(categoryName) || 0) + 1
          );
        }

        // Normalizar los nombres para una agrupación consistente
        const vehicleKey = `${brandName.trim().toUpperCase()}-${modelName
          .trim()
          .toUpperCase()}`;

        const clientId = sale.vehicles.clients.id;

        if (!vehicleSales.has(vehicleKey)) {
          vehicleSales.set(vehicleKey, {
            id: sale.vehicle_id,
            brand: brandName,
            model: modelName,
            vehicle_type: categoryName,
            total_sold: 0,
            total_price: 0,
            client_ids: new Set(),
          });
        }

        const vehicle = vehicleSales.get(vehicleKey);
        if (vehicle) {
          vehicle.total_sold++;
          vehicle.total_price += sale.sale_price;
          vehicle.client_ids.add(clientId);
        }
      });

      // Calcular precio promedio y total de clientes
      vehicleSales.forEach((vehicle) => {
        vehicle.avg_price =
          vehicle.total_sold > 0 ? vehicle.total_price / vehicle.total_sold : 0;
        vehicle.total_clients = vehicle.client_ids.size;
        delete vehicle.client_ids; // Limpiar el Set
        delete vehicle.total_price; // Limpiar el precio total
      });

      const topSold = Array.from(vehicleSales.values())
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 10);

      const topCategories = Array.from(categorySales.entries())
        .map(([name, total_sold]) => ({ name, total_sold }))
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 10);

      setTopSoldVehicles(topSold);
      setTopSoldCategories(topCategories);
    } catch (error) {
      console.error('Error in fetchTopSoldVehicles:', error);
    }
  };

  // Función para obtener análisis de precios
  const fetchPriceAnalysis = async () => {
    try {
      const startDate = getStartDateFromTimeRange(timeRange);

      let query = supabase
        .from('vehicles_sales')
        .select(
          `
          sale_price,
          created_at,
          vehicles!vehicles_sales_vehicle_id_fkey!inner(client_id)
        `
        )
        .gte('created_at', startDate.toISOString());

      query = applyVehicleClientFilter(query, selectedClientId);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching price analysis:', error);
        return;
      }

      if (!data || data.length === 0) {
        setPriceAnalysis({
          total_sales: 0,
          avg_price: 0,
          median_price: 0,
          price_range: { min: 0, max: 0 },
          price_distribution: [],
          price_trend: [],
          concentration_insight:
            'No hay ventas en el período seleccionado para analizar la concentración.',
        });
        return;
      }

      const prices = data.map((sale) => sale.sale_price).sort((a, b) => a - b);
      const totalSales = prices.length;
      const avgPrice =
        prices.reduce((sum, price) => sum + price, 0) / totalSales;
      const medianPrice = prices[Math.floor(totalSales / 2)];
      const minPrice = prices[0];
      const maxPrice = prices[prices.length - 1];

      // Distribución de precios
      const priceRanges = [
        { min: 0, max: 10000000, label: 'Hasta $10M' },
        { min: 10000000, max: 20000000, label: '$10M - $20M' },
        { min: 20000000, max: 30000000, label: '$20M - $30M' },
        { min: 30000000, max: 50000000, label: '$30M - $50M' },
        { min: 50000000, max: Infinity, label: 'Más de $50M' },
      ];

      const distribution = priceRanges.map((range) => {
        const count = prices.filter(
          (price) => price >= range.min && price < range.max
        ).length;
        return {
          range: range.label,
          count,
          percentage: totalSales > 0 ? (count / totalSales) * 100 : 0,
        };
      });

      // Encontrar el rango con el mayor porcentaje para generar el insight
      let insight =
        'No hay datos suficientes para determinar una tendencia de precios.';
      if (distribution.length > 0) {
        const topRange = distribution.reduce((max, range) =>
          range.percentage > max.percentage ? range : max
        );

        if (topRange && topRange.percentage > 0) {
          insight = `La mayor concentración de ventas (${topRange.percentage.toFixed(
            1
          )}%) se encuentra en el rango de ${topRange.range}.`;
        }
      }

      // Tendencia de precios (últimos 3 meses)
      const trend = [];
      for (let i = 2; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        const monthPrices = data
          .filter((sale) => {
            const saleDate = new Date(sale.created_at);
            return saleDate >= monthStart && saleDate < monthEnd;
          })
          .map((sale) => sale.sale_price);

        const monthAvg =
          monthPrices.length > 0
            ? monthPrices.reduce((sum, price) => sum + price, 0) /
              monthPrices.length
            : 0;

        const monthName = monthStart.toLocaleDateString('es-ES', {
          month: 'long',
        });

        trend.push({
          period: monthName,
          avg_price: monthAvg,
          change_percentage: i === 2 ? 0 : 0, // Simplificado por ahora
        });
      }

      setPriceAnalysis({
        total_sales: totalSales,
        avg_price: avgPrice,
        median_price: medianPrice,
        price_range: { min: minPrice, max: maxPrice },
        price_distribution: distribution,
        price_trend: trend,
        concentration_insight: insight,
      });
    } catch (error) {
      console.error('Error in fetchPriceAnalysis:', error);
    }
  };

  // Función para obtener eficiencia de ventas
  const fetchSalesEfficiency = async () => {
    try {
      const startDate = getStartDateFromTimeRange(timeRange);

      // Paso 1: Obtener vehículos agregados en el período para calcular total_vehicles
      let vehiclesQuery = supabase
        .from('vehicles')
        .select('client_id, clients!inner(id, name)')
        .gte('created_at', startDate.toISOString());

      vehiclesQuery = applyClientFilter(vehiclesQuery, selectedClientId);

      const { data: vehiclesData, error: vehiclesError } = await vehiclesQuery;

      if (vehiclesError) {
        console.error('Error fetching vehicles for efficiency:', vehiclesError);
        return;
      }

      const clientMetrics = new Map();

      // Inicializar métricas con el total de vehículos agregados en el período
      vehiclesData?.forEach((vehicle) => {
        const clientId = vehicle.client_id;
        const clientName = vehicle.clients!.name;
        if (!clientMetrics.has(clientId)) {
          clientMetrics.set(clientId, {
            id: clientId,
            name: clientName,
            total_vehicles: 0,
            sold_vehicles: 0,
            total_revenue: 0,
            total_days_to_sell: 0,
          });
        }
        clientMetrics.get(clientId).total_vehicles++;
      });

      // Paso 2: Obtener las ventas en el período
      let salesQuery = supabase
        .from('vehicles_sales')
        .select(
          `
        vehicle_id,
        sale_price,
        created_at,
        vehicles:vehicles!vehicles_sales_vehicle_id_fkey!inner(
          client_id,
          created_at,
          clients!inner(id, name)
        )
      `
        )
        .gte('created_at', startDate.toISOString());

      salesQuery = applyVehicleClientFilter(salesQuery, selectedClientId);

      const { data: salesData, error: salesError } = await salesQuery;

      if (salesError) {
        console.error('Error fetching sales for efficiency:', salesError);
        return;
      }

      // Paso 3: Procesar los datos de ventas
      salesData?.forEach((sale) => {
        if (!sale.vehicles) return;

        const clientId = sale.vehicles.client_id;

        // Si el cliente no está en el mapa, es porque vendió un auto agregado fuera del período
        if (!clientMetrics.has(clientId)) {
          clientMetrics.set(clientId, {
            id: clientId,
            name: sale.vehicles.clients.name,
            total_vehicles: 0, // No se agregaron vehículos en el período
            sold_vehicles: 0,
            total_revenue: 0,
            total_days_to_sell: 0,
          });
        }

        const client = clientMetrics.get(clientId);
        const creationDate = sale.vehicles.created_at;

        if (creationDate) {
          const saleDate = new Date(sale.created_at);
          const daysDiff =
            (saleDate.getTime() - new Date(creationDate).getTime()) /
            (1000 * 60 * 60 * 24);

          client.sold_vehicles++;
          client.total_revenue += sale.sale_price;
          client.total_days_to_sell += daysDiff > 0 ? daysDiff : 0;
        }
      });

      // Calcular métricas finales
      const efficiency = Array.from(clientMetrics.values()).map((client) => {
        const conversion_rate =
          client.total_vehicles > 0
            ? (client.sold_vehicles / client.total_vehicles) * 100
            : 0;

        const avg_days_to_sell =
          client.sold_vehicles > 0
            ? client.total_days_to_sell / client.sold_vehicles
            : 0;

        const avg_price_per_vehicle =
          client.sold_vehicles > 0
            ? client.total_revenue / client.sold_vehicles
            : 0;

        const stock_turnover =
          client.total_vehicles > 0
            ? client.sold_vehicles / client.total_vehicles
            : 0;

        return {
          id: client.id,
          name: client.name,
          total_vehicles: client.total_vehicles,
          sold_vehicles: client.sold_vehicles,
          conversion_rate,
          avg_days_to_sell,
          total_revenue: client.total_revenue,
          avg_price_per_vehicle,
          stock_turnover,
        };
      });

      setSalesEfficiency(efficiency);
    } catch (error) {
      console.error('Error in fetchSalesEfficiency:', error);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Obtener la fecha de inicio según el rango de tiempo seleccionado
      const startDate = getStartDateFromTimeRange(timeRange);

      // Total visits (page_visits table)
      let visitsQuery = supabase
        .from('page_visits')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      visitsQuery = applyClientFilter(visitsQuery, selectedClientId);

      const { count: totalVisits, error: visitsError } = await visitsQuery;

      if (visitsError) {
        console.error('Error fetching visits:', visitsError);
      }

      // Total vehicles dentro del rango de tiempo
      let vehiclesQuery = supabase
        .from('vehicles')
        .select('id, clients!inner(id, name)', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .not('client_id', 'in', excludedClientIdsString);

      vehiclesQuery = applyClientFilter(vehiclesQuery, selectedClientId);

      const { count: totalVehicles, error: vehiclesError } =
        await vehiclesQuery;

      if (vehiclesError) {
        console.error('Error fetching vehicles:', vehiclesError);
      }

      // Published vehicles - usando el rango de tiempo
      let publishedQuery = supabase
        .from('vehicles')
        .select('id, status:clients_vehicles_states!inner(name)')
        .eq('status.name', 'Publicado')
        .gte('created_at', startDate.toISOString());

      publishedQuery = applyClientFilter(publishedQuery, selectedClientId);

      const { data: publishedData, error: publishedError } =
        await publishedQuery;

      if (publishedError) {
        console.error('Error fetching published vehicles:', publishedError);
      }

      // Query sales directly, and filter by client_id on the joined vehicle
      let salesQuery = supabase.from('vehicles_sales').select(
        `
        id, 
        sale_price,
        vehicle_id,
        vehicles!vehicles_sales_vehicle_id_fkey!inner(client_id)
      `,
        { count: 'exact' }
      );

      salesQuery = salesQuery.gte('created_at', startDate.toISOString());
      salesQuery = applyVehicleClientFilter(salesQuery, selectedClientId);

      const {
        data: salesData,
        count: soldVehicles,
        error: salesError,
      } = await salesQuery;

      if (salesError) {
        console.error('Error fetching sales data:', salesError);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos de ventas',
          variant: 'destructive',
        });
        return;
      }

      const totalSalesAmount =
        salesData?.reduce((sum, sale) => sum + sale.sale_price, 0) || 0;

      // Obtener el total de automotoras
      const { count: totalDealersCount, error: totalDealersError } =
        await supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .not('id', 'in', excludedClientIdsString);

      if (totalDealersError) {
        console.error('Error fetching total dealers:', totalDealersError);
      }

      // Obtener el total de automotoras pagando (solo subscription activa, trial no es pagando)
      const { count: totalPayingDealersCount, error: totalPayingDealersError } =
        await supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .not('id', 'in', excludedClientIdsString)
          .eq('subscription_status', 'active');

      if (totalPayingDealersError) {
        console.error(
          'Error fetching total paying dealers:',
          totalPayingDealersError
        );
      }

      // Ghost detection: clients with 0 vehicles, no activity in 90 days, older than 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const ninetyDaysAgoISO = ninetyDaysAgo.toISOString();

      // Get all non-excluded client IDs with their created_at
      const { data: allClients } = await supabase
        .from('clients')
        .select('id, created_at')
        .not('id', 'in', excludedClientIdsString);

      // Get client IDs that have at least 1 vehicle
      const { data: clientsWithVehicles } = await supabase
        .from('vehicles')
        .select('client_id')
        .not('client_id', 'in', excludedClientIdsString);
      const vehicleClientIds = new Set((clientsWithVehicles || []).map(v => v.client_id));

      // Get client IDs with page visits in last 90 days
      const { data: recentVisits } = await supabase
        .from('page_visits')
        .select('client_id')
        .gte('created_at', ninetyDaysAgoISO);
      const recentVisitClientIds = new Set((recentVisits || []).map(v => v.client_id));

      // Get client IDs with vehicles created in last 90 days
      const { data: recentVehicles } = await supabase
        .from('vehicles')
        .select('client_id')
        .gte('created_at', ninetyDaysAgoISO)
        .not('client_id', 'in', excludedClientIdsString);
      const recentVehicleClientIds = new Set((recentVehicles || []).map(v => v.client_id));

      // Calculate ghost count — ghost = old account with NO recent activity (visits or vehicle creation)
      // Even if they have vehicles, if they haven't done anything in 90 days they're ghost
      let ghostCount = 0;
      for (const client of (allClients || [])) {
        const isOldEnough = new Date(client.created_at) < ninetyDaysAgo;
        const hasRecentVisits = recentVisitClientIds.has(client.id);
        const hasRecentVehicles = recentVehicleClientIds.has(client.id);

        if (isOldEnough && !hasRecentVisits && !hasRecentVehicles) {
          ghostCount++;
        }
      }

      const totalDealers = totalDealersCount || 0;
      const activeDealers = totalDealers - ghostCount;

      setStats({
        totalVisits: totalVisits || 0,
        totalVehicles: totalVehicles || 0,
        publishedVehicles: publishedData?.length || 0,
        soldVehicles: soldVehicles || 0,
        totalSales: totalSalesAmount,
        vehiclesInPeriod: totalVehicles || 0,
        totalDealers,
        totalPayingDealers: totalPayingDealersCount || 0,
        activeDealers,
        ghostDealers: ghostCount,
      });
    } catch (error) {
      console.error('Error in fetchStats:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las estadísticas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function para consultas de vehículos y ventas en fetchChartData
  const getVehiclesCount = async (startDate: Date, endDate: Date) => {
    let vehiclesQuery = supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    vehiclesQuery = applyClientFilter(vehiclesQuery, selectedClientId);
    const { count } = await vehiclesQuery;
    return count || 0;
  };

  const getSalesCount = async (startDate: Date, endDate: Date) => {
    let salesQuery = supabase
      .from('vehicles_sales')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (selectedClientId) {
      // Filtrar por vehículos del cliente
      const { data: clientVehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('client_id', selectedClientId);
      if (clientVehicles && clientVehicles.length > 0) {
        const vehicleIds = clientVehicles.map((v) => v.id);
        salesQuery = salesQuery.in('vehicle_id', vehicleIds);
      } else {
        salesQuery = salesQuery.eq('vehicle_id', -1);
      }
    } else {
      const { data: allVehicles } = await supabase
        .from('vehicles')
        .select('id')
        .not('client_id', 'in', excludedClientIdsString);
      if (allVehicles && allVehicles.length > 0) {
        const vehicleIds = allVehicles.map((v) => v.id);
        salesQuery = salesQuery.in('vehicle_id', vehicleIds);
      } else {
        salesQuery = salesQuery.eq('vehicle_id', -1);
      }
    }
    const { count } = await salesQuery;
    return count || 0;
  };

  const fetchChartData = async () => {
    try {
      const startDate = getStartDateFromTimeRange(timeRange);
      const endDate = new Date();

      // Si el rango es 7 días, obtener datos diarios reales
      if (timeRange === '7days') {
        const days = 7;
        const dailyArray: MonthlyData[] = [];
        for (let i = 0; i < days; i++) {
          const day = new Date(endDate);
          day.setDate(endDate.getDate() - (days - 1 - i));
          const dayStart = new Date(day);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);

          const vehiclesAdded = await getVehiclesCount(dayStart, dayEnd);
          const salesGenerated = await getSalesCount(dayStart, dayEnd);

          dailyArray.push({
            month: `${day.getDate().toString().padStart(2, '0')}/${(
              day.getMonth() + 1
            )
              .toString()
              .padStart(2, '0')}`,
            vehiclesAdded,
            salesGenerated,
          });
        }
        setDailyData(dailyArray);
      }

      // Generar datos mensuales
      const monthlyDataArray: MonthlyData[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const monthStart = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        const monthEnd = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        );

        const vehiclesAdded = await getVehiclesCount(monthStart, monthEnd);
        const salesGenerated = await getSalesCount(monthStart, monthEnd);

        monthlyDataArray.push({
          month: currentDate.toLocaleDateString('es-ES', { month: 'short' }),
          vehiclesAdded,
          salesGenerated,
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      setMonthlyData(monthlyDataArray);

      // Generar datos semanales (últimas 8 semanas)
      const weeklyDataArray: WeeklyData[] = [];
      const weekStart = new Date(endDate);
      weekStart.setDate(weekStart.getDate() - 56); // 8 semanas atrás

      for (let i = 0; i < 8; i++) {
        const weekStartDate = new Date(weekStart);
        weekStartDate.setDate(weekStartDate.getDate() + i * 7);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        const vehiclesAdded = await getVehiclesCount(
          weekStartDate,
          weekEndDate
        );

        weeklyDataArray.push({
          week: `Sem ${i + 1}`,
          vehiclesAdded,
        });
      }

      setWeeklyData(weeklyDataArray);

      // Datos por automotora para el período seleccionado
      const { data: vehiclesDealers, error: vehiclesDealersError } =
        await supabase
          .from('vehicles')
          .select('client_id, clients!inner(id, name), created_at')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .not('client_id', 'in', excludedClientIdsString);

      if (vehiclesDealersError) {
        setVehiclesByDealerData([]);
        setVehiclesByDateData([]);
      } else {
        // Agrupar por automotora, solo si tiene nombre
        const dealerMap = new Map();
        vehiclesDealers.forEach((v) => {
          const name = v.clients?.name;
          if (!name) return; // Solo contar si hay nombre de automotora
          if (!dealerMap.has(name)) dealerMap.set(name, 0);
          dealerMap.set(name, dealerMap.get(name) + 1);
        });
        const arr = Array.from(dealerMap.entries()).map(
          ([name, vehiclesAdded]) => ({ name, vehiclesAdded })
        );
        arr.sort((a, b) => b.vehiclesAdded - a.vehiclesAdded);
        setVehiclesByDealerData(arr);

        // Agrupar por fecha (día, semana o mes según el rango)
        const dateMap = new Map();
        vehiclesDealers.forEach((v) => {
          if (!v.created_at) return;
          let key = '';
          const date = new Date(v.created_at);
          if (timeRange === '7days') {
            key = date.toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
            });
          } else if (timeRange === '30days') {
            // Agrupar por semana: año-semana
            const firstDayOfWeek = new Date(date);
            firstDayOfWeek.setDate(date.getDate() - date.getDay());
            key = `Semana ${getWeekNumber(date)}`;
          } else {
            // Agrupar por mes
            key = date.toLocaleDateString('es-ES', {
              month: 'short',
              year: '2-digit',
            });
          }
          if (!dateMap.has(key)) dateMap.set(key, 0);
          dateMap.set(key, dateMap.get(key) + 1);
        });
        // Helper para semana del año
        function getWeekNumber(d) {
          d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          const yearStart = new Date(Date.UTC(d.getFullYear(), 0, 1));
          const weekNo = Math.ceil(
            ((d - yearStart) / 86400000 + yearStart.getDay() + 1) / 7
          );
          return weekNo;
        }
        const dateArr = Array.from(dateMap.entries()).map(
          ([date, vehiclesAdded]) => ({ date, vehiclesAdded })
        );
        // Ordenar por fecha (intentar parsear DD/MM o mes)
        if (timeRange === '7days') {
          dateArr.sort((a, b) => {
            const [d1, m1] = a.date.split('/').map(Number);
            const [d2, m2] = b.date.split('/').map(Number);
            return m1 !== m2 ? m1 - m2 : d1 - d2;
          });
        }
        setVehiclesByDateData(dateArr);
      }
    } catch (error) {
      console.error('Error in fetchChartData:', error);
      setVehiclesByDealerData([]);
      setVehiclesByDateData([]);
    }
  };

  // Carga inicial: traer IDs de clientes marcados como inactivos. Hasta que esto
  // termine, los demás fetches no corren para que la exclusión sea consistente.
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id')
        .eq('is_active', false);
      if (error) {
        console.error('Error fetching inactive client ids:', error);
        setInactiveClientIds([]);
        return;
      }
      setInactiveClientIds((data || []).map((c) => c.id));
    })();
  }, []);

  useEffect(() => {
    if (!excludedClientIdsString) return;
    fetchClients();
  }, [excludedClientIdsString]);

  useEffect(() => {
    if (!excludedClientIdsString) return;
    fetchStats();
    fetchChartData();
    fetchTopViewedVehicles();
    fetchTopViewedDealers();
    fetchTopSellingDealers();
    fetchTopSoldVehicles();
    fetchPriceAnalysis();
    fetchSalesEfficiency();
  }, [selectedClientId, timeRange, excludedClientIdsString]);

  return {
    stats,
    loading,
    clients,
    monthlyData,
    weeklyData,
    dailyData,
    topViewedBrands,
    topViewedCategories,
    topViewedDealers,
    topSellingDealers,
    topSoldVehicles,
    topSoldCategories,
    priceAnalysis,
    salesEfficiency,
    vehiclesByDealerData,
    vehiclesByDateData,
  };
};


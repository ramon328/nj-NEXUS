import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TimeRange } from '@/components/superadmin/TimeRangeSelector';

// Tipos para breakdown temporal
export interface UsabilityStats {
  // KPIs históricos
  leadsDealersAll: number;
  tasadorDealersAll: number;
  instagramDealersAll: number;
  builderDealersAll: number;
  // Breakdown temporal
  usabilityKpiTrendsData: UsabilityKpiTrendsData[];
  // Builder web
  builderPieData: BuilderPieData[];
  builderActiveNames: string[];
  builderInactiveNames: string[];
  // Instagram
  instagramDealers: number;
  instagramDealersNames: string[];
  instagramDealersFrequency: {
    client_id: number;
    name: string;
    count: number;
  }[];
  instagramDealersAvgPostTime: {
    client_id: number;
    name: string;
    avgDays: number | null;
  }[];
  instagramActiveDealers: number;
  // Tasador
  tasadorDealers: number;
  tasadorDealersFrequency: { client_id: number; name: string; count: number }[];
  // Consignación y compra directa
  allBuyConsignmentStats: { id: number; name: string; total: number }[];
  buyDirectStats: { id: number; name: string; total: number }[];
  // Otros
  totalDealers: number;
  loading: boolean;
  financingStats: { id: number; name: string; total: number }[];
}

export interface BuilderPieData {
  name: string;
  value: number;
}

export type UsabilityKpiTrendsData = {
  label: string; // mes, semana o día
  leads: number;
  tasador: number;
  instagram: number;
  builder: number;
};

// Tipos para datos internos
interface LeadData {
  client_id: number;
  created_at: string;
}

interface AppraisalData {
  client_id: number;
  created_at: string;
}

interface InstagramData {
  client_id: number;
  created_at: string;
  ig_account_id: string;
}

interface BuilderData {
  client_id: number;
  created_at: string;
  is_enabled: boolean;
}

// Función para obtener la fecha de inicio según el rango de tiempo
function getStartDateFromTimeRange(range: TimeRange): Date {
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
}

// IDs base de clientes internos/test excluidos de estadísticas globales.
// A estos se les suman dinámicamente los clientes con is_active = false.
const BASE_EXCLUDED_CLIENT_IDS = [1, 24, 174];

export function useUsabilityStats(
  timeRange: TimeRange,
  selectedClientId: number | null = null
): UsabilityStats {
  const [loading, setLoading] = useState(true);
  const [tasadorDealers, setTasadorDealers] = useState(0);
  const [tasadorDealersFrequency, setTasadorDealersFrequency] = useState<
    { client_id: number; name: string; count: number }[]
  >([]);
  const [instagramDealers, setInstagramDealers] = useState(0);
  const [instagramDealersNames, setInstagramDealersNames] = useState<string[]>(
    []
  );
  const [instagramDealersFrequency, setInstagramDealersFrequency] = useState<
    { client_id: number; name: string; count: number }[]
  >([]);
  const [builderPieData, setBuilderPieData] = useState<BuilderPieData[]>([]);
  const [builderActiveNames, setBuilderActiveNames] = useState<string[]>([]);
  const [builderInactiveNames, setBuilderInactiveNames] = useState<string[]>(
    []
  );
  const [totalDealers, setTotalDealers] = useState(0);
  const [instagramDealersAvgPostTime, setInstagramDealersAvgPostTime] =
    useState<{ client_id: number; name: string; avgDays: number | null }[]>([]);
  const [instagramActiveDealers, setInstagramActiveDealers] = useState(0);
  const [allBuyConsignmentStats, setAllBuyConsignmentStats] = useState<
    { id: number; name: string; total: number }[]
  >([]);
  const [buyDirectStats, setBuyDirectStats] = useState<
    { id: number; name: string; total: number }[]
  >([]);
  const [leadsDealersAll, setLeadsDealersAll] = useState(0);
  const [tasadorDealersAll, setTasadorDealersAll] = useState(0);
  const [instagramDealersAll, setInstagramDealersAll] = useState(0);
  const [builderDealersAll, setBuilderDealersAll] = useState(0);
  const [usabilityKpiTrendsData, setUsabilityKpiTrendsData] = useState<
    UsabilityKpiTrendsData[]
  >([]);
  const [financingStats, setFinancingStats] = useState<
    { id: number; name: string; total: number }[]
  >([]);

  // Estados internos para cálculos (no se exponen en el return)
  const [allLeads, setAllLeads] = useState<LeadData[]>([]);
  const [allAppraisals, setAllAppraisals] = useState<AppraisalData[]>([]);
  const [allInstagram, setAllInstagram] = useState<InstagramData[]>([]);
  const [allBuilder, setAllBuilder] = useState<BuilderData[]>([]);

  // null = aún no cargado. Una vez cargado, contiene IDs de clientes inactivos.
  const [inactiveClientIds, setInactiveClientIds] = useState<number[] | null>(
    null
  );

  const excludedClientIdsString = useMemo(() => {
    if (inactiveClientIds === null) return null;
    const all = [...BASE_EXCLUDED_CLIENT_IDS, ...inactiveClientIds];
    return `(${all.join(',')})`;
  }, [inactiveClientIds]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id')
        .eq('is_active', false);
      if (error) {
        console.error('Error fetching inactive client ids (usability):', error);
        setInactiveClientIds([]);
        return;
      }
      setInactiveClientIds((data || []).map((c) => c.id));
    })();
  }, []);

  useEffect(() => {
    if (!excludedClientIdsString) return;
    setLoading(true);
    const startDate = getStartDateFromTimeRange(timeRange);

    // Pie chart de adopción actual
    const fetchBuilderPieData = async () => {
      let query = supabase
        .from('client_website_config')
        .select('client_id, is_enabled, clients(name)');
      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      } else {
        query = query.not('client_id', 'in', excludedClientIdsString);
      }
      const { data, error } = await query;
      if (error) {
        console.error('Error al obtener builder pie:', error);
        setBuilderPieData([]);
        setBuilderActiveNames([]);
        setBuilderInactiveNames([]);
        return;
      }
      // Agrupar por client_id para evitar duplicados
      const clientMap = new Map();
      data.forEach((row) => {
        if (!clientMap.has(row.client_id)) {
          clientMap.set(row.client_id, row);
        }
      });
      const all = Array.from(clientMap.values());
      const active = all.filter((row) => row.is_enabled);
      const inactive = all.filter((row) => !row.is_enabled);
      setBuilderPieData([
        { name: 'Con builder web', value: active.length },
        { name: 'Sin builder web', value: inactive.length },
      ]);
      setBuilderActiveNames(active.map((row) => row.clients?.name || ''));
      setBuilderInactiveNames(inactive.map((row) => row.clients?.name || ''));
    };
    fetchBuilderPieData();

    // Tasador: cuántas automotoras han usado el tasador y frecuencia
    const fetchTasadorDealers = async () => {
      let query = supabase
        .from('appraisals')
        .select('client_id, clients(name)')
        .gte('created_at', startDate.toISOString());
      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      } else {
        query = query.not('client_id', 'in', excludedClientIdsString);
      }
      const { data, error } = await query;
      if (error) {
        console.error('Error al obtener uso del tasador:', error);
        setTasadorDealers(0);
        setTasadorDealersFrequency([]);
        return;
      }
      // Agrupar por client_id y contar frecuencia
      const freqMap = new Map();
      data.forEach((row) => {
        if (!freqMap.has(row.client_id)) {
          freqMap.set(row.client_id, {
            client_id: row.client_id,
            name: row.clients?.name || '',
            count: 1,
          });
        } else {
          freqMap.get(row.client_id).count++;
        }
      });
      const freqArr = Array.from(freqMap.values());
      setTasadorDealers(freqArr.length);
      setTasadorDealersFrequency(freqArr);
    };
    fetchTasadorDealers();

    // Instagram: cuántas automotoras tienen Instagram vinculado y sus nombres
    const fetchInstagramDealers = async () => {
      let query = supabase
        .from('instagram_integrations')
        .select('client_id, clients(name)')
        .not('ig_account_id', 'is', null);
      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      } else {
        query = query.not('client_id', 'in', excludedClientIdsString);
      }
      const { data, error } = await query;
      if (error) {
        console.error('Error al obtener uso de Instagram:', error);
        setInstagramDealers(0);
        setInstagramDealersNames([]);
        setInstagramDealersFrequency([]);
        setInstagramDealersAvgPostTime([]);
        setInstagramActiveDealers(0);
        return;
      }
      // Agrupar por client_id para evitar duplicados
      const clientMap = new Map();
      data.forEach((row) => {
        if (!clientMap.has(row.client_id)) {
          clientMap.set(row.client_id, row);
        }
      });
      const all = Array.from(clientMap.values());
      setInstagramDealers(all.length);
      setInstagramDealersNames(all.map((row) => row.clients?.name || ''));

      // Obtener vehículos con post en Instagram
      let vehiclesQuery = supabase
        .from('vehicles')
        .select('client_id, instagram_post_id, created_at');
      if (selectedClientId) {
        vehiclesQuery = vehiclesQuery.eq('client_id', selectedClientId);
      } else {
        vehiclesQuery = vehiclesQuery.not('client_id', 'in', excludedClientIdsString);
      }
      const { data: vehicles, error: errorVehicles } = await vehiclesQuery;
      if (errorVehicles) {
        setInstagramDealersFrequency([]);
        setInstagramDealersAvgPostTime([]);
        setInstagramActiveDealers(0);
        return;
      }
      // Contar publicaciones por automotora y calcular tiempo promedio entre publicaciones
      const freqArr = all.map((integration) => {
        const posts = vehicles
          .filter(
            (v) => v.client_id === integration.client_id && v.instagram_post_id
          )
          .map((v) => v.created_at)
          .sort();
        let avgDays: number | null = null;
        if (posts.length > 1) {
          let totalDiff = 0;
          for (let i = 1; i < posts.length; i++) {
            const prev = new Date(posts[i - 1]);
            const curr = new Date(posts[i]);
            totalDiff +=
              (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
          }
          avgDays = totalDiff / (posts.length - 1);
        }
        return {
          client_id: integration.client_id,
          name: integration.clients?.name || '',
          count: posts.length,
          avgDays,
          hasRecent: posts.some((date) => {
            const d = new Date(date);
            const now = new Date();
            const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
            return diff <= 30;
          }),
        };
      });
      setInstagramDealersFrequency(
        freqArr.map(({ client_id, name, count }) => ({
          client_id,
          name,
          count,
        }))
      );
      setInstagramDealersAvgPostTime(
        freqArr.map(({ client_id, name, avgDays }) => ({
          client_id,
          name,
          avgDays,
        }))
      );
      setInstagramActiveDealers(freqArr.filter((f) => f.hasRecent).length);
    };
    fetchInstagramDealers();

    // Obtener el total de automotoras (clientes)
    const fetchTotalDealers = async () => {
      let query = supabase.from('clients').select('id', { count: 'exact' });
      if (selectedClientId) {
        query = query.eq('id', selectedClientId);
      } else {
        query = query.not('id', 'in', excludedClientIdsString);
      }
      const { data, error } = await query;
      if (error) {
        console.error('Error al obtener el total de automotoras:', error);
        setTotalDealers(0);
        return;
      }
      setTotalDealers(data.length);
    };
    fetchTotalDealers();
  }, [timeRange, selectedClientId, excludedClientIdsString]);

  useEffect(() => {
    if (!excludedClientIdsString) return;
    // Solo dejamos la métrica de todos los leads de consignación
    const fetchConsignmentStats = async () => {
      let clientsQuery = supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (selectedClientId) {
        clientsQuery = clientsQuery.eq('id', selectedClientId);
      } else {
        clientsQuery = clientsQuery.not('id', 'in', excludedClientIdsString);
      }
      const { data: clientsData, error: clientsError } = await clientsQuery;
      if (clientsError) return [];

      let leadsQuery = supabase
        .from('leads')
        .select('client_id, clients!inner(id, name), created_at')
        .eq('type', 'buy-consignment');
      if (selectedClientId) {
        leadsQuery = leadsQuery.eq('client_id', selectedClientId);
      } else {
        leadsQuery = leadsQuery.not('client_id', 'in', excludedClientIdsString);
      }
      // Filtrar por rango de fechas
      const startDate = getStartDateFromTimeRange(timeRange);
      leadsQuery = leadsQuery.gte('created_at', startDate.toISOString());
      const { data, error } = await leadsQuery;
      if (error) return [];

      // 3. Mapear leads por automotora
      const statsMap = new Map();
      data?.forEach((lead) => {
        const clientId = lead.client_id;
        const clientName = lead.clients?.name || 'Desconocido';
        if (!statsMap.has(clientId)) {
          statsMap.set(clientId, {
            id: clientId,
            name: clientName,
            total: 0,
          });
        }
        statsMap.get(clientId).total++;
      });
      // 4. Crear array con todas las automotoras (rellenar con 0 si no tienen leads)
      const allStats = clientsData.map((client) => {
        if (statsMap.has(client.id)) {
          return statsMap.get(client.id);
        } else {
          return {
            id: client.id,
            name: client.name,
            total: 0,
          };
        }
      });
      // 5. Ordenar por total y tomar top 10
      return allStats.sort((a, b) => b.total - a.total).slice(0, 10);
    };

    // Nueva función para buy-direct
    const fetchBuyDirectStats = async () => {
      let clientsQuery = supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (selectedClientId) {
        clientsQuery = clientsQuery.eq('id', selectedClientId);
      } else {
        clientsQuery = clientsQuery.not('id', 'in', excludedClientIdsString);
      }
      const { data: clientsData, error: clientsError } = await clientsQuery;
      if (clientsError) return [];

      let leadsQuery = supabase
        .from('leads')
        .select('client_id, clients!inner(id, name), created_at')
        .eq('type', 'buy-direct');
      if (selectedClientId) {
        leadsQuery = leadsQuery.eq('client_id', selectedClientId);
      } else {
        leadsQuery = leadsQuery.not('client_id', 'in', excludedClientIdsString);
      }
      // Filtrar por rango de fechas
      const startDate = getStartDateFromTimeRange(timeRange);
      leadsQuery = leadsQuery.gte('created_at', startDate.toISOString());
      const { data, error } = await leadsQuery;
      if (error) return [];

      const statsMap = new Map();
      data?.forEach((lead) => {
        const clientId = lead.client_id;
        const clientName = lead.clients?.name || 'Desconocido';
        if (!statsMap.has(clientId)) {
          statsMap.set(clientId, {
            id: clientId,
            name: clientName,
            total: 0,
          });
        }
        statsMap.get(clientId).total++;
      });
      const allStats = clientsData.map((client) => {
        if (statsMap.has(client.id)) {
          return statsMap.get(client.id);
        } else {
          return {
            id: client.id,
            name: client.name,
            total: 0,
          };
        }
      });
      return allStats.sort((a, b) => b.total - a.total).slice(0, 10);
    };

    const fetchFinancingStats = async () => {
      try {
        const startDate = getStartDateFromTimeRange(timeRange);
        const endDate = new Date();
        // Solo considerar leads de tipo 'sell-financing' y con customer_id no nulo
        const { data, error } = await supabase
          .from('leads')
          .select('client_id, clients!inner(id, name), created_at')
          .eq('type', 'sell-financing')
          .not('customer_id', 'is', null)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .not('client_id', 'in', excludedClientIdsString);

        if (error) {
          console.error('Error fetching financing leads:', error);
          setFinancingStats([]);
          return;
        }

        // Agrupar por client_id y contar
        const statsMap = new Map();
        data?.forEach((lead) => {
          const clientId = lead.client_id;
          const clientName = lead.clients?.name || 'Desconocido';
          if (!statsMap.has(clientId)) {
            statsMap.set(clientId, {
              id: clientId,
              name: clientName,
              total: 0,
            });
          }
          statsMap.get(clientId).total++;
        });

        // Top 10 automotoras con más leads de financiamiento
        const topFinancing = Array.from(statsMap.values())
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);
        setFinancingStats(topFinancing);
      } catch (error) {
        console.error('Error in fetchFinancingStats:', error);
        setFinancingStats([]);
      }
    };

    fetchConsignmentStats().then(setAllBuyConsignmentStats);
    fetchBuyDirectStats().then(setBuyDirectStats);
    fetchFinancingStats();
    setLoading(false);
  }, [timeRange, selectedClientId, excludedClientIdsString]);

  useEffect(() => {
    if (!excludedClientIdsString) return;
    // Fetch de KPIs históricos
    const startDate = getStartDateFromTimeRange('all');
    // Leads
    const fetchLeadsDealersAll = async () => {
      let query = supabase
        .from('leads')
        .select('client_id, created_at', { count: 'exact', head: false })
        .not('client_id', 'in', excludedClientIdsString);
      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }
      const { data, error } = await query;
      if (error) return setLeadsDealersAll(0);
      setAllLeads(data || []);
      // Contar automotoras únicas
      setLeadsDealersAll(
        new Set((data || []).map((row) => row.client_id)).size
      );
    };
    fetchLeadsDealersAll();

    // Tasador
    const fetchTasadorDealersAll = async () => {
      let query = supabase
        .from('appraisals')
        .select('client_id, created_at', { count: 'exact', head: false })
        .not('client_id', 'in', excludedClientIdsString);
      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }
      const { data, error } = await query;
      if (error) return setTasadorDealersAll(0);
      setAllAppraisals(data || []);
      setTasadorDealersAll(
        new Set((data || []).map((row) => row.client_id)).size
      );
    };
    fetchTasadorDealersAll();
    // Instagram
    const fetchInstagramDealersAll = async () => {
      let query = supabase
        .from('instagram_integrations')
        .select('client_id, created_at, ig_account_id', {
          count: 'exact',
          head: false,
        })
        .not('ig_account_id', 'is', null)
        .not('client_id', 'in', excludedClientIdsString);
      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }
      const { data, error } = await query;
      if (error) return setInstagramDealersAll(0);
      setAllInstagram(data || []);
      setInstagramDealersAll(
        new Set((data || []).map((row) => row.client_id)).size
      );
    };
    fetchInstagramDealersAll();
    // Builder Web
    const fetchBuilderDealersAll = async () => {
      let query = supabase
        .from('client_website_config')
        .select('client_id, is_enabled, created_at', {
          count: 'exact',
          head: false,
        })
        .not('client_id', 'in', excludedClientIdsString);
      if (selectedClientId) {
        query = query.eq('client_id', selectedClientId);
      }
      const { data, error } = await query;
      if (error) return setBuilderDealersAll(0);
      setAllBuilder(data || []);
      // Solo automotoras con builder habilitado
      setBuilderDealersAll(
        new Set(
          (data || [])
            .filter((row) => row.is_enabled)
            .map((row) => row.client_id)
        ).size
      );
    };
    fetchBuilderDealersAll();
  }, [selectedClientId, excludedClientIdsString]);

  useEffect(() => {
    // Generar breakdown dinámico según timeRange
    let labels: string[] = [];
    const now = new Date();
    let getStart: (i: number) => Date;
    let getEnd: (i: number) => Date;
    let count = 0;
    if (timeRange === '7days') {
      // Diario (7 días)
      count = 7;
      getStart = (i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        return d;
      };
      getEnd = (i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - i));
        d.setHours(23, 59, 59, 999);
        return d;
      };
      labels = Array.from({ length: 7 }, (_, i) => {
        const d = getStart(i);
        return d.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
        });
      });
    } else if (timeRange === '30days') {
      // Diario (30 días)
      count = 30;
      getStart = (i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (29 - i));
        d.setHours(0, 0, 0, 0);
        return d;
      };
      getEnd = (i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (29 - i));
        d.setHours(23, 59, 59, 999);
        return d;
      };
      labels = Array.from({ length: 30 }, (_, i) => {
        const d = getStart(i);
        return d.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
        });
      });
    } else {
      // Mensual (6m, 1y, all)
      count = timeRange === '6months' ? 6 : 12;
      getStart = (i) => {
        const d = new Date(
          now.getFullYear(),
          now.getMonth() - (count - 1 - i),
          1
        );
        d.setHours(0, 0, 0, 0);
        return d;
      };
      getEnd = (i) => {
        const d = new Date(
          now.getFullYear(),
          now.getMonth() - (count - 1 - i) + 1,
          0
        );
        d.setHours(23, 59, 59, 999);
        return d;
      };
      labels = Array.from({ length: count }, (_, i) => {
        const d = getStart(i);
        return d.toLocaleDateString('es-ES', {
          month: 'short',
          year: '2-digit',
        });
      });
    }
    const results: UsabilityKpiTrendsData[] = labels.map((label, idx) => {
      const start = getStart(idx);
      const end = getEnd(idx);
      // Leads
      const leadsSet = new Set(
        allLeads
          .filter((row) => {
            const date = new Date(row.created_at);
            return date >= start && date <= end;
          })
          .map((row) => row.client_id)
      );
      // Tasador
      const tasadorSet = new Set(
        allAppraisals
          .filter((row) => {
            const date = new Date(row.created_at);
            return date >= start && date <= end;
          })
          .map((row) => row.client_id)
      );
      // Instagram
      const instagramSet = new Set(
        allInstagram
          .filter((row) => {
            const date = new Date(row.created_at);
            return date >= start && date <= end;
          })
          .map((row) => row.client_id)
      );
      // Builder
      const builderSet = new Set(
        allBuilder
          .filter((row) => {
            const date = new Date(row.created_at);
            return row.is_enabled && date >= start && date <= end;
          })
          .map((row) => row.client_id)
      );
      return {
        label,
        leads: leadsSet.size,
        tasador: tasadorSet.size,
        instagram: instagramSet.size,
        builder: builderSet.size,
      };
    });
    setUsabilityKpiTrendsData(results);
  }, [allLeads, allAppraisals, allInstagram, allBuilder, timeRange]);

  return {
    // KPIs históricos
    leadsDealersAll,
    tasadorDealersAll,
    instagramDealersAll,
    builderDealersAll,
    // Breakdown temporal
    usabilityKpiTrendsData,
    // Builder web
    builderPieData,
    builderActiveNames,
    builderInactiveNames,
    // Instagram
    instagramDealers,
    instagramDealersNames,
    instagramDealersFrequency,
    instagramDealersAvgPostTime,
    instagramActiveDealers,
    // Tasador
    tasadorDealers,
    tasadorDealersFrequency,
    // Consignación y compra directa
    allBuyConsignmentStats,
    buyDirectStats,
    // Otros
    totalDealers,
    loading,
    financingStats,
  };
}


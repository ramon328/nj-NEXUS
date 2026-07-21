import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

export interface TopVehicle {
  vehicleId: number;
  visits: number;
}

interface VisitStatsResult {
  totalVisits: number;
  monthlyVisits: { month: string; visits: number; leads: number }[];
  topVehicles: TopVehicle[];
}

const defaultResult: VisitStatsResult = { totalVisits: 0, monthlyVisits: [], topVehicles: [] };

export const useVisitStats = (
  clientId: number | undefined,
  dateFilter?: DateRangeFilter
) => {
  const { data = defaultResult, isLoading: loading } = useQuery({
    queryKey: ['visitStats', clientId, dateFilter?.startDate?.getTime(), dateFilter?.endDate?.getTime()],
    queryFn: async (): Promise<VisitStatsResult> => {
      // Shared query base
      let query = supabase
        .from('page_visits')
        .select('created_at, visitor_id, pathname')
        .eq('client_id', clientId!);

      if (dateFilter?.startDate) {
        query = query.gte('created_at', dateFilter.startDate.toISOString());
      }
      if (dateFilter?.endDate) {
        query = query.lte('created_at', dateFilter.endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch leads for the same period
      let leadsQuery = supabase
        .from('leads')
        .select('created_at')
        .eq('client_id', clientId!)
        .not('customer_id', 'is', null);

      if (dateFilter?.startDate) {
        leadsQuery = leadsQuery.gte('created_at', dateFilter.startDate.toISOString());
      }
      if (dateFilter?.endDate) {
        leadsQuery = leadsQuery.lte('created_at', dateFilter.endDate.toISOString());
      }

      const { data: leadsData } = await leadsQuery;

      // Calculate total visits
      const totalVisits = data.length;

      // Calculate top 12 vehicles
      const vehicleVisits: Record<string, number> = {};
      data
        .filter((v) => v.pathname && v.pathname.startsWith('/vehicles/'))
        .forEach((v) => {
          if (v.pathname) {
            vehicleVisits[v.pathname] = (vehicleVisits[v.pathname] || 0) + 1;
          }
        });

      const topVehicles = Object.entries(vehicleVisits)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 12)
        .map(([pathname, visits]) => {
          const vehicleId = parseInt(pathname.replace('/vehicles/', ''), 10);
          return { vehicleId, visits };
        })
        .filter((item) => !isNaN(item.vehicleId));

      // Group leads helpers
      const groupLeadsByDay = (leads: typeof leadsData, days: { date: Date; label: string }[]) => {
        const counts: Record<string, number> = {};
        (leads || []).forEach((row) => {
          const date = new Date(row.created_at);
          const day = days.find((d) => date.toDateString() === d.date.toDateString());
          if (day) {
            counts[day.label] = (counts[day.label] || 0) + 1;
          }
        });
        return counts;
      };

      const groupLeadsByMonth = (leads: typeof leadsData, monthAbbr: string[]) => {
        const counts: Record<string, number> = {};
        (leads || []).forEach((row) => {
          const date = new Date(row.created_at);
          const key = `${monthAbbr[date.getMonth()]} ${String(date.getFullYear() % 100).padStart(2, '0')}`;
          counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
      };

      // Group visits logic
      let monthlyVisits: { month: string; visits: number; leads: number }[] = [];
      if (
        dateFilter?.startDate &&
        dateFilter?.endDate &&
        (dateFilter.endDate.getTime() - dateFilter.startDate.getTime()) /
          (1000 * 60 * 60 * 24) <=
          30
      ) {
        // Group by day for date ranges up to 30 days
        const days: { date: Date; label: string }[] = [];
        for (
          let d = new Date(dateFilter.startDate);
          d <= dateFilter.endDate;
          d.setDate(d.getDate() + 1)
        ) {
          days.push({
            date: new Date(d),
            label: d.toLocaleDateString('es-CL', {
              day: '2-digit',
              month: '2-digit',
            }),
          });
        }

        const grouped: Record<string, { visitors: Set<string>; count: number }> = {};
        data.forEach((row) => {
          const date = new Date(row.created_at);
          const day = days.find((d) => date.toDateString() === d.date.toDateString());
          if (day) {
            if (!grouped[day.label]) {
              grouped[day.label] = { visitors: new Set(), count: 0 };
            }
            if (row.visitor_id && !grouped[day.label].visitors.has(row.visitor_id)) {
              grouped[day.label].visitors.add(row.visitor_id);
              grouped[day.label].count++;
            }
          }
        });
        const leadsByDay = groupLeadsByDay(leadsData, days);
        monthlyVisits = days.map((d) => ({
          month: d.label,
          visits: grouped[d.label] ? grouped[d.label].count : 0,
          leads: leadsByDay[d.label] || 0,
        }));
      } else {
        // Group by month for larger ranges or no filter
        const monthAbbr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const grouped: Record<string, { visitors: Set<string>; count: number }> = {};
        data.forEach((row) => {
          const date = new Date(row.created_at);
          const key = `${monthAbbr[date.getMonth()]} ${String(date.getFullYear() % 100).padStart(2, '0')}`;
          if (!grouped[key]) {
            grouped[key] = { visitors: new Set(), count: 0 };
          }
          if (row.visitor_id && !grouped[key].visitors.has(row.visitor_id)) {
            const dayKey = date.toDateString();
            const visitorDayKey = `${row.visitor_id}-${dayKey}`;
            if (!grouped[key].visitors.has(visitorDayKey)) {
              grouped[key].visitors.add(visitorDayKey);
              grouped[key].count++;
            }
          }
        });
        const leadsByMonth = groupLeadsByMonth(leadsData, monthAbbr);
        monthlyVisits = Object.entries(grouped).map(([month, data]) => ({
          month,
          visits: data.count,
          leads: leadsByMonth[month] || 0,
        }));
      }

      return { totalVisits, monthlyVisits, topVehicles };
    },
    enabled: !!clientId,
    placeholderData: keepPreviousData,
  });

  return { ...data, loading };
};

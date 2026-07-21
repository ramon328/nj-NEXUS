import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateFilter } from './useSellerPerformance';

export interface LatestLead {
  id: number;
  client_id: number;
  customer_id?: number;
  type: string;
  status: string;
  notes?: string;
  search_params: any;
  search_text?: string;
  created_at: string;
  customer?: {
    id: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  vehicle?: {
    id: number;
    year: number;
    brand: { name: string } | null;
    model: { name: string } | null;
  };
  search_brand?: {
    name: string;
  };
  search_model?: {
    name: string;
  };
}

export const useLatestLeads = (
  clientId: number | undefined,
  dateFilter?: DateFilter,
  limit: number = 10
) => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LatestLead[]>([]);

  useEffect(() => {
    if (!clientId) return;

    const fetchLatestLeads = async () => {
      try {
        setLoading(true);

        let query = supabase
          .from('leads')
          .select(`
            *,
            customer:customer_id(
              id,
              first_name,
              last_name,
              email,
              phone
            ),
            vehicle:vehicle_id(
              id,
              year,
              brand:brand_id(name),
              model:model_id(name)
            ),
            search_brand:brand_id(name),
            search_model:model_id(name)
          `)
          .eq('client_id', clientId)
          .not('customer_id', 'is', null)
          .order('created_at', { ascending: false });

        // Aplicar filtro de fecha si existe
        if (dateFilter?.startDate) {
          query = query.gte('created_at', dateFilter.startDate.toISOString());
        }
        if (dateFilter?.endDate) {
          query = query.lte('created_at', dateFilter.endDate.toISOString());
        }

        // Aplicar límite
        query = query.limit(limit);

        const { data, error } = await query;

        if (error) throw error;

        setLeads((data as LatestLead[]) || []);
      } catch (error) {
        console.error('Error fetching latest leads:', error);
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestLeads();
  }, [clientId, dateFilter, limit]);

  return {
    leads,
    loading,
  };
};

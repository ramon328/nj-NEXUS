import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClientConfig {
  id: number;
  name: string;
  sellers_see_all_vehicles: boolean;
  sellers_see_all_leads: boolean;
  sellers_can_claim_leads: boolean;
}

/**
 * Cached client configuration (sellers_see_all_vehicles, etc.).
 * Shared across useVehicles and useVehiclesPaginated to avoid
 * duplicate permission-check queries.
 *
 * staleTime: 10 min — this data rarely changes.
 */
export function useClientConfig() {
  const { clientId } = useAuth();

  return useQuery<ClientConfig | null>({
    queryKey: ['clientConfig', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, sellers_see_all_vehicles, sellers_see_all_leads, sellers_can_claim_leads')
        .eq('id', clientId)
        .single();

      if (error) {
        console.error('Error fetching client config:', error);
        return null;
      }
      return data;
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!clientId,
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AssignableSeller {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

/**
 * Vendedores del cliente disponibles para asignar leads.
 * Incluye rol legacy ('seller'/'vendedor'). Cacheado 5 min.
 */
export function useAssignableSellers(clientId: number | undefined, enabled = true) {
  return useQuery<AssignableSeller[]>({
    queryKey: ['assignableSellers', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('client_id', clientId)
        .in('rol', ['seller', 'vendedor'])
        .order('first_name');

      if (error) {
        console.error('Error fetching assignable sellers:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!clientId && enabled,
  });
}

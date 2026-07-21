import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SellerListItem {
  id: string;
  label: string;
}

/**
 * Light-weight list of sellers for the dashboard's seller filter dropdown.
 * Heavier per-seller analytics live in useSellersData / useSellerPerformance.
 */
export const useSellersList = (clientId: number | undefined) => {
  const { data = [], isLoading } = useQuery({
    queryKey: ['sellersList', clientId],
    queryFn: async (): Promise<SellerListItem[]> => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('client_id', clientId)
        .in('rol', ['seller', 'vendedor']);
      if (error) throw error;
      type UserRow = {
        id: number | string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      };
      return ((data || []) as UserRow[])
        .map((u) => {
          const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
          return {
            id: String(u.id),
            label: name || u.email || `#${u.id}`,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label));
    },
    enabled: !!clientId,
    placeholderData: keepPreviousData,
  });

  return { sellers: data, loading: isLoading };
};

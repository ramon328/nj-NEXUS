import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveDealership } from '@/hooks/useActiveDealership';

async function fetchPendingTasksCount(
  clientId: number | string,
  // División de sedes (Slice 4): sedes visibles. `null` = sin filtro (retrocompatible).
  visibleDealershipIds?: number[] | null
): Promise<number> {
  let query = supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .in('status', ['pending', 'in_progress', 'pending_approval']);

  // Filtro de sede vía el vehículo (mismo criterio que useTasks): tareas de autos
  // en sedes visibles O sin vehículo (manuales). Pre-fetch de los vehicle_ids visibles.
  if (visibleDealershipIds && visibleDealershipIds.length > 0) {
    const { data: visibleVehicles } = await supabase
      .from('vehicles')
      .select('id')
      .eq('client_id', clientId)
      .or(`dealership_id.in.(${visibleDealershipIds.join(',')}),dealership_id.is.null`);
    const visibleIds = (visibleVehicles || []).map((v) => v.id);
    query =
      visibleIds.length > 0
        ? query.or(`vehicle_id.in.(${visibleIds.join(',')}),vehicle_id.is.null`)
        : query.is('vehicle_id', null);
  }

  const { count, error } = await query;

  if (error) return 0;
  return count || 0;
}

export function usePendingTasksCount() {
  const { clientId } = useAuth();
  const { visibleDealershipIds } = useActiveDealership();
  const queryClient = useQueryClient();

  const { data: count = 0 } = useQuery({
    queryKey: ['pendingTasksCount', clientId, visibleDealershipIds?.slice().sort().join(',')],
    queryFn: () => fetchPendingTasksCount(clientId!, visibleDealershipIds),
    staleTime: 5 * 60 * 1000,
    enabled: !!clientId,
  });

  // Real-time subscription invalidates cache instead of direct fetch
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel('tasks-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pendingTasksCount', clientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, queryClient]);

  return count;
}

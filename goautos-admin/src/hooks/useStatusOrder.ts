
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Status } from '@/hooks/useStatuses';
import { toast } from '@/hooks/use-toast';

export const useStatusOrder = (fetchStatuses: () => void) => {
  const reorderStatuses = useCallback(async (newOrder: Status[]) => {
    try {
      const updates = newOrder.map((status, index) => ({
        id: status.id,
        order: index + 1,
      }));

      const { error } = await supabase
        .from('clients_vehicles_states')
        .upsert(updates);

      if (error) throw error;

      fetchStatuses();
    } catch (error) {
      console.error('Error reordering statuses:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el orden de los estados',
        variant: 'destructive',
      });
    }
  }, [fetchStatuses]);

  return { reorderStatuses };
};

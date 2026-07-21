import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { FbMarketplacePost } from '@/types/facebookMarketplace';
import posthog from '@/utils/posthog';

export const useFbMarketplacePublications = (integrationId?: number) => {
  const { clientId } = useAuth();
  const queryClient = useQueryClient();

  // Fetch publications
  const {
    data: publications,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['fb-marketplace-publications', clientId, integrationId],
    queryFn: async () => {
      if (!clientId) return [];

      // Get vehicles for this client first
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('client_id', clientId);

      const vehicleIds = vehicles?.map(v => v.id) || [];

      if (vehicleIds.length === 0) return [];

      let query = supabase
        .from('fb_marketplace_post')
        .select(`
          *,
          vehicle:vehicle_id(
            id,
            brand:brand_id(name),
            model:model_id(name),
            year,
            price,
            main_image,
            mileage
          )
        `)
        .in('vehicle_id', vehicleIds)
        .order('created_at', { ascending: false });

      if (integrationId) {
        query = query.eq('integration_id', integrationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as FbMarketplacePost[];
    },
    enabled: !!clientId,
  });

  // Sync publications with Facebook
  const syncMutation = useMutation({
    mutationFn: async (integrationIdToSync: number) => {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke(
        'sync-fb-marketplace-publications',
        {
          body: { integrationId: integrationIdToSync },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fb-marketplace-publications'] });

      posthog.capture({
        distinctId: String(clientId),
        event: 'facebook_listing_synced',
        properties: {},
      });

      toast({
        title: 'Sincronización completada',
        description: `${data.data?.synced || 0} publicaciones sincronizadas.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error de sincronización',
        description: error.message || 'No se pudieron sincronizar las publicaciones.',
        variant: 'destructive',
      });
    },
  });

  // Update publication status (pause, activate, delete)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ postId, action }: { postId: number; action: 'pause' | 'activate' | 'delete' }) => {
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke(
        'update-fb-marketplace-status',
        {
          body: { postId, action },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fb-marketplace-publications'] });

      const actionLabels = {
        pause: 'pausada',
        activate: 'activada',
        delete: 'eliminada',
      };

      toast({
        title: 'Estado actualizado',
        description: `Publicación ${actionLabels[variables.action]}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el estado.',
        variant: 'destructive',
      });
    },
  });

  // Get stats
  const activeCount = publications?.filter(p => p.status === 'active').length || 0;
  const pausedCount = publications?.filter(p => p.status === 'paused').length || 0;
  const totalCount = publications?.length || 0;

  return {
    publications: publications || [],
    isLoading,
    error,
    refetch,
    stats: {
      active: activeCount,
      paused: pausedCount,
      total: totalCount,
    },
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
};

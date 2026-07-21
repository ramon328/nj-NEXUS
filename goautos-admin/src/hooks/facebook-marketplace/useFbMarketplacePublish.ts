import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import posthog from '@/utils/posthog';

interface PublishSingleParams {
  vehicleId: number;
  integrationId: number;
  landingUrl?: string;
}

interface PublishBatchParams {
  vehicleIds: number[];
  integrationId: number;
}

export const useFbMarketplacePublish = () => {
  const { clientId } = useAuth();
  const queryClient = useQueryClient();

  // Publish single vehicle
  const publishSingleMutation = useMutation({
    mutationFn: async ({ vehicleId, integrationId, landingUrl }: PublishSingleParams) => {
      if (!clientId) throw new Error('Client ID is required');

      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke(
        'publish-fb-marketplace-vehicle',
        {
          body: { vehicleId, integrationId, clientId, landingUrl },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fb-marketplace-publications'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Publicado exitosamente',
        description: 'El vehículo ha sido publicado en Facebook Marketplace.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al publicar',
        description: error.message || 'No se pudo publicar el vehículo.',
        variant: 'destructive',
      });
    },
  });

  // Publish multiple vehicles (batch)
  const publishBatchMutation = useMutation({
    mutationFn: async ({ vehicleIds, integrationId }: PublishBatchParams) => {
      if (!clientId) throw new Error('Client ID is required');
      if (vehicleIds.length === 0) throw new Error('No vehicles selected');

      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke(
        'publish-fb-marketplace-batch',
        {
          body: { vehicleIds, integrationId, clientId },
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
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      const { published, errors, skipped } = data;

      if (published > 0) {
        posthog.capture({
          distinctId: String(clientId),
          event: 'facebook_batch_published',
          properties: { vehicle_count: published },
        });

        toast({
          title: 'Publicación completada',
          description: `${published} vehículos publicados${skipped > 0 ? `, ${skipped} ya publicados` : ''}${errors > 0 ? `, ${errors} con errores` : ''}.`,
        });
      } else if (skipped > 0) {
        toast({
          title: 'Sin cambios',
          description: 'Todos los vehículos seleccionados ya están publicados.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo publicar ningún vehículo.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al publicar',
        description: error.message || 'No se pudieron publicar los vehículos.',
        variant: 'destructive',
      });
    },
  });

  return {
    publishSingle: publishSingleMutation.mutate,
    isPublishingSingle: publishSingleMutation.isPending,
    publishBatch: publishBatchMutation.mutate,
    isPublishingBatch: publishBatchMutation.isPending,
    isPublishing: publishSingleMutation.isPending || publishBatchMutation.isPending,
  };
};

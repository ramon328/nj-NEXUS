import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  getChileautosListings,
  getChileautosListingByVehicle,
  publishToChileautos,
  updateInChileautos,
  removeFromChileautos,
  markSoldInChileautos,
  bulkSyncToChileautos,
  autoPublishToChileautos,
  AutoPublishResult,
} from '@/services/chileautosService';
import { ChileautosListing } from '@/types/chileautos';

/**
 * Parsea errores de la API de ChileAutos y retorna un mensaje legible
 */
function parseChileautosError(errorMessage: string): string {
  // Try to extract JSON from "Error 400: {...}" format
  const jsonMatch = errorMessage.match(/Error \d+:\s*(.+)/s);
  if (!jsonMatch) return errorMessage;

  try {
    const errorData = JSON.parse(jsonMatch[1]);
    if (errorData.errors && Array.isArray(errorData.errors)) {
      const issues = errorData.errors.map((e: any) => {
        const field = e.propertyName?.split('.').pop() || e.propertyName;
        const value = e.attemptedValue;
        if (field === 'Make') return `Marca "${value}" no válida en ChileAutos`;
        if (field === 'Model') return `Modelo "${value}" no válido en ChileAutos`;
        return `${field}: ${e.errorMessage} (${value})`;
      });
      return issues.join('. ') + '.';
    }
  } catch {
    // Not JSON, return as-is
  }

  return errorMessage;
}

export const useChileautosListings = () => {
  const { clientId } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all listings
  const {
    data: listings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['chileautos-listings', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return await getChileautosListings(clientId);
    },
    enabled: !!clientId,
  });

  // Publish vehicle mutation
  const publishMutation = useMutation({
    mutationFn: async (vehicleId: number) => {
      if (!clientId) throw new Error('Client ID es requerido');
      const result = await publishToChileautos(vehicleId, clientId);
      if (!result.success) {
        throw new Error(result.error || 'Error al publicar');
      }
      return result;
    },
    onSuccess: (_, vehicleId) => {
      queryClient.invalidateQueries({ queryKey: ['chileautos-listings'] });
      queryClient.invalidateQueries({
        queryKey: ['chileautos-listing', vehicleId],
      });
      toast({
        title: 'Publicado en ChileAutos',
        description:
          'El vehículo ha sido enviado a ChileAutos. Los cambios pueden tardar hasta 4 horas en reflejarse.',
      });
    },
    onError: (error: Error) => {
      const cleanMessage = parseChileautosError(error.message);
      toast({
        title: 'Error al publicar en ChileAutos',
        description: cleanMessage,
        variant: 'destructive',
      });
    },
  });

  // Update vehicle mutation
  const updateMutation = useMutation({
    mutationFn: async (vehicleId: number) => {
      if (!clientId) throw new Error('Client ID es requerido');
      const result = await updateInChileautos(vehicleId, clientId);
      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar');
      }
      return result;
    },
    onSuccess: (_, vehicleId) => {
      queryClient.invalidateQueries({ queryKey: ['chileautos-listings'] });
      queryClient.invalidateQueries({
        queryKey: ['chileautos-listing', vehicleId],
      });
      toast({
        title: 'Actualizado en ChileAutos',
        description: 'Los cambios han sido enviados a ChileAutos.',
      });
    },
    onError: (error: Error) => {
      const cleanMessage = parseChileautosError(error.message);
      toast({
        title: 'Error al actualizar en ChileAutos',
        description: cleanMessage,
        variant: 'destructive',
      });
    },
  });

  // Remove vehicle mutation
  const removeMutation = useMutation({
    mutationFn: async (vehicleId: number) => {
      if (!clientId) throw new Error('Client ID es requerido');
      const result = await removeFromChileautos(vehicleId, clientId);
      if (!result.success) {
        throw new Error(result.error || 'Error al despublicar');
      }
      return result;
    },
    onSuccess: (_, vehicleId) => {
      queryClient.invalidateQueries({ queryKey: ['chileautos-listings'] });
      queryClient.invalidateQueries({
        queryKey: ['chileautos-listing', vehicleId],
      });
      toast({
        title: 'Despublicado de ChileAutos',
        description: 'El vehículo ha sido removido de ChileAutos.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al despublicar',
        description: error.message || 'No se pudo despublicar el vehículo.',
        variant: 'destructive',
      });
    },
  });

  // Mark as sold mutation
  const markSoldMutation = useMutation({
    mutationFn: async (vehicleId: number) => {
      if (!clientId) throw new Error('Client ID es requerido');
      const result = await markSoldInChileautos(vehicleId, clientId);
      if (!result.success) {
        throw new Error(result.error || 'Error al marcar como vendido');
      }
      return result;
    },
    onSuccess: (_, vehicleId) => {
      queryClient.invalidateQueries({ queryKey: ['chileautos-listings'] });
      queryClient.invalidateQueries({
        queryKey: ['chileautos-listing', vehicleId],
      });
      toast({
        title: 'Marcado como vendido',
        description: 'El vehículo ha sido marcado como vendido en ChileAutos.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo marcar como vendido.',
        variant: 'destructive',
      });
    },
  });

  // Bulk sync mutation
  const bulkSyncMutation = useMutation({
    mutationFn: async (vehicleIds?: number[]) => {
      if (!clientId) throw new Error('Client ID es requerido');
      return await bulkSyncToChileautos(clientId, vehicleIds);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['chileautos-listings'] });
      // Los avisos vendidos/reservados se saltan a propósito (no se re-publican para no
      // revivirlos), así que los mostramos aparte y NO los contamos como fallos.
      const skipped = result.skipped ?? 0;
      const description = skipped > 0
        ? `${result.successful} de ${result.total} sincronizados. ${skipped} saltados (vendidos/reservados, no se re-publican).`
        : `${result.successful} de ${result.total} vehículos sincronizados correctamente.`;
      toast({
        title: 'Sincronización completada',
        description,
        variant: result.failed > 0 ? 'destructive' : 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error de sincronización',
        description: error.message || 'No se pudo completar la sincronización.',
        variant: 'destructive',
      });
    },
  });

  // Batch publish mutation - publishes multiple vehicles at once
  const batchPublishMutation = useMutation({
    mutationFn: async (vehicleIds: number[]) => {
      if (!clientId) throw new Error('Client ID es requerido');
      if (!vehicleIds.length) throw new Error('Selecciona al menos un vehículo');

      const results = {
        successful: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Publish vehicles sequentially to avoid rate limits
      for (const vehicleId of vehicleIds) {
        try {
          const result = await publishToChileautos(vehicleId, clientId);
          if (result.success) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(result.error || `Error con vehículo ${vehicleId}`);
          }
        } catch (err: any) {
          results.failed++;
          results.errors.push(err.message || `Error con vehículo ${vehicleId}`);
        }
      }

      return results;
    },
    onSuccess: (result, vehicleIds) => {
      queryClient.invalidateQueries({ queryKey: ['chileautos-listings'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-for-chileautos-publish'] });

      if (result.failed === 0) {
        toast({
          title: 'Vehículos publicados',
          description: `${result.successful} vehículo${result.successful !== 1 ? 's' : ''} publicado${result.successful !== 1 ? 's' : ''} en ChileAutos.`,
        });
      } else if (result.successful > 0) {
        toast({
          title: 'Publicación parcial',
          description: `${result.successful} publicado${result.successful !== 1 ? 's' : ''}, ${result.failed} con errores.`,
          variant: 'destructive',
        });
      } else {
        const cleanMessage = parseChileautosError(result.errors[0] || 'No se pudieron publicar los vehículos.');
        toast({
          title: 'Error al publicar en ChileAutos',
          description: cleanMessage,
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      const cleanMessage = parseChileautosError(error.message);
      toast({
        title: 'Error al publicar en ChileAutos',
        description: cleanMessage,
        variant: 'destructive',
      });
    },
  });

  // Auto-publish mutation - tries to auto-match make/model, returns vehicles that need manual selection
  const autoPublishMutation = useMutation({
    mutationFn: async (vehicleIds: number[]): Promise<AutoPublishResult> => {
      if (!clientId) throw new Error('Client ID es requerido');
      if (!vehicleIds.length) throw new Error('Selecciona al menos un vehículo');
      return await autoPublishToChileautos(vehicleIds, clientId);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['chileautos-listings'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-for-chileautos-publish'] });

      const { summary } = result;

      if (summary.published > 0 && summary.needsManualSelection === 0) {
        toast({
          title: 'Vehículos publicados',
          description: `${summary.published} vehículo${summary.published !== 1 ? 's' : ''} publicado${summary.published !== 1 ? 's' : ''} en ChileAutos.`,
        });
      } else if (summary.published > 0 && summary.needsManualSelection > 0) {
        toast({
          title: 'Publicación parcial',
          description: `${summary.published} publicado${summary.published !== 1 ? 's' : ''}, ${summary.needsManualSelection} requiere${summary.needsManualSelection !== 1 ? 'n' : ''} selección manual de marca/modelo.`,
        });
      }
      // If all need manual selection, we don't show a toast - the UI will show the modal
    },
    onError: (error: Error) => {
      const cleanMessage = parseChileautosError(error.message);
      toast({
        title: 'Error al publicar en ChileAutos',
        description: cleanMessage,
        variant: 'destructive',
      });
    },
  });

  // Get listing status for a specific vehicle
  const getListingForVehicle = (vehicleId: number): ChileautosListing | undefined => {
    return listings?.find((l) => l.vehicle_id === vehicleId);
  };

  // Check if vehicle is published
  const isVehiclePublished = (vehicleId: number): boolean => {
    const listing = getListingForVehicle(vehicleId);
    return listing?.status === 'published';
  };

  // Stats
  const publishedCount = listings?.filter((l) => l.status === 'published').length || 0;
  const pendingCount = listings?.filter((l) => l.status === 'pending').length || 0;
  const errorCount = listings?.filter((l) => l.status === 'error').length || 0;
  const totalCount = listings?.length || 0;

  // Get IDs of vehicles that are already published (for filtering in selector)
  const publishedVehicleIds = (listings || [])
    .filter((l) => l.status === 'published' || l.status === 'pending')
    .map((l) => l.vehicle_id);

  return {
    listings: listings || [],
    isLoading,
    error,
    refetch,
    // Stats
    publishedCount,
    pendingCount,
    errorCount,
    totalCount,
    publishedVehicleIds,
    // Helpers
    getListingForVehicle,
    isVehiclePublished,
    // Mutations
    publish: publishMutation.mutate,
    publishAsync: publishMutation.mutateAsync,
    isPublishing: publishMutation.isPending,
    update: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    remove: removeMutation.mutate,
    isRemoving: removeMutation.isPending,
    markSold: markSoldMutation.mutate,
    isMarkingSold: markSoldMutation.isPending,
    bulkSync: bulkSyncMutation.mutate,
    isBulkSyncing: bulkSyncMutation.isPending,
    batchPublish: batchPublishMutation.mutate,
    isBatchPublishing: batchPublishMutation.isPending,
    autoPublish: autoPublishMutation.mutateAsync,
    isAutoPublishing: autoPublishMutation.isPending,
  };
};

/**
 * Hook para obtener el estado de un vehículo específico en ChileAutos
 */
export const useChileautosVehicleListing = (vehicleId: number | undefined) => {
  const { data: listing, isLoading } = useQuery({
    queryKey: ['chileautos-listing', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      return await getChileautosListingByVehicle(vehicleId);
    },
    enabled: !!vehicleId,
  });

  return {
    listing,
    isLoading,
    isPublished: listing?.status === 'published',
    isPending: listing?.status === 'pending',
    hasError: listing?.status === 'error',
    isSold: listing?.status === 'sold',
  };
};

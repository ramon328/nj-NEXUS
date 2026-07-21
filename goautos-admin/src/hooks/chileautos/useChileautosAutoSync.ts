import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChileautosIntegration } from './useChileautosIntegration';
import {
  updateInChileautos,
  getChileautosListingByVehicle,
} from '@/services/chileautosService';
import { toast } from '@/hooks/use-toast';

/**
 * Hook para auto-sincronizar vehículos con ChileAutos cuando se editan.
 * Verifica si el tenant tiene la integración activa con sync_on_update,
 * y si el vehículo tiene un listing publicado, dispara la actualización en background.
 */
export const useChileautosAutoSync = () => {
  const { clientId } = useAuth();
  const { integration } = useChileautosIntegration();

  const triggerUpdateSync = useCallback(
    async (vehicleId: number, vehicleType?: string) => {
      if (!clientId || !integration) return;
      // Only sync car-type vehicles to ChileAutos
      if (vehicleType && vehicleType !== 'car' && vehicleType !== 'truck') {
        console.log('[ChileAutos AutoSync] Skipping non-car vehicle type:', vehicleType);
        return;
      }
      if (!integration.sync_on_update) {
        console.log('[ChileAutos AutoSync] sync_on_update is disabled');
        return;
      }
      if (integration.status !== 'active') {
        console.log('[ChileAutos AutoSync] integration status:', integration.status);
        return;
      }

      try {
        const listing = await getChileautosListingByVehicle(vehicleId);
        if (!listing || listing.status !== 'published') {
          console.log('[ChileAutos AutoSync] No published listing for vehicle', vehicleId);
          return;
        }

        updateInChileautos(vehicleId, clientId).then((result) => {
          if (!result.success) {
            console.warn('[ChileAutos AutoSync] Update failed:', result.error);
            toast({
              title: 'Error al sincronizar con ChileAutos',
              description: result.error || 'No se pudo actualizar el vehículo en ChileAutos.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'ChileAutos actualizado',
              description: 'El vehículo se sincronizó correctamente con ChileAutos.',
            });
          }
        });
      } catch (err) {
        console.warn('[ChileAutos AutoSync] Error checking listing:', err);
        toast({
          title: 'Error al sincronizar con ChileAutos',
          description: 'No se pudo verificar el estado de publicación.',
          variant: 'destructive',
        });
      }
    },
    [clientId, integration]
  );

  return { triggerUpdateSync };
};

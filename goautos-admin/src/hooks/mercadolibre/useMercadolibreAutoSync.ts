import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Auto-sincroniza el PRECIO de un vehículo con sus publicaciones activas de
 * MercadoLibre. GoAuto es la fuente de verdad: al cambiar el precio en el
 * panel, se empuja a ML (PUT /items/{id}). Fire-and-forget: si el tenant no
 * tiene integración o avisos activos, la edge function responde no-op.
 */
export const useMercadolibreAutoSync = () => {
  const triggerPriceSync = useCallback(async (vehicleId: number) => {
    if (!vehicleId) return;
    try {
      const { data, error } = await supabase.functions.invoke(
        'update-mercadolibre-publication-price',
        { body: { vehicleId } }
      );

      if (error) {
        console.warn('[MeLi AutoSync] price push failed:', error);
        return;
      }
      if (data?.tokenExpired) {
        toast({
          title: 'MercadoLibre: token expirado',
          description:
            'El precio no se actualizó en MercadoLibre. Renueva la conexión en la página de MercadoLibre.',
          variant: 'destructive',
        });
        return;
      }
      if (data?.updated > 0) {
        toast({
          title: 'MercadoLibre actualizado',
          description: `Se actualizó el precio en ${data.updated} publicación(es) de MercadoLibre.`,
        });
      } else if (data?.errors?.length) {
        toast({
          title: 'MercadoLibre: no se pudo actualizar el precio',
          description: 'Revisa que la publicación esté activa en MercadoLibre.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.warn('[MeLi AutoSync] error:', err);
    }
  }, []);

  return { triggerPriceSync };
};

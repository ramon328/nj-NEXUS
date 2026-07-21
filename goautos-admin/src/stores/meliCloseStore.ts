import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

// Estado global para "ofrecer cerrar avisos de MercadoLibre al vender un auto".
// Cuando un vehículo se marca como Vendido (board/tabla o registro de venta),
// se llama requestClose(vehicleId): si tiene publicaciones VIGENTES en ML
// (activas o pausadas), abre un diálogo (montado una sola vez en App) que
// pregunta antes de cerrarlas. Se incluyen las pausadas porque un aviso pausado
// sigue ocupando el vehículo en ML y, si el auto ya se vendió, también conviene
// cerrarlo (los 'closed' quedan fuera porque ya están cerrados).

interface MeliClosePending {
  vehicleId: number;
  postIds: number[];
  title?: string;
}

interface MeliCloseState {
  pending: MeliClosePending | null;
  requestClose: (vehicleId: number) => Promise<void>;
  dismiss: () => void;
}

export const useMeliCloseStore = create<MeliCloseState>((set) => ({
  pending: null,
  requestClose: async (vehicleId: number) => {
    if (!vehicleId) return;
    try {
      const { data } = await supabase
        .from('meli_post')
        .select('id, title')
        .eq('vehicle_id', vehicleId)
        .in('status', ['active', 'paused']);
      if (data && data.length > 0) {
        set({
          pending: {
            vehicleId,
            postIds: data.map((p: { id: number }) => p.id),
            title: (data[0] as { title?: string }).title,
          },
        });
      }
    } catch (e) {
      console.warn('[MeLi close] requestClose error', e);
    }
  },
  dismiss: () => set({ pending: null }),
}));

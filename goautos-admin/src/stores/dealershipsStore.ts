import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Dealership {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  client_id: number | null;
}

interface DealershipsState {
  dealerships: Dealership[];
  isLoading: boolean;
  loadedClientId: number | null;
  inFlight: Promise<void> | null;
  fetch: (clientId: number, force?: boolean) => Promise<void>;
}

// Shared cache for `dealerships`. Several components (VehiculosFilter,
// vehicle forms, settings) used to each call useDealerships and trigger
// a separate fetch — now they all share the same store and the request
// is deduped via `inFlight`.
export const useDealershipsStore = create<DealershipsState>((set, get) => ({
  dealerships: [],
  isLoading: false,
  loadedClientId: null,
  inFlight: null,

  fetch: async (clientId, force = false) => {
    const state = get();

    if (
      !force &&
      state.loadedClientId === clientId &&
      state.dealerships.length > 0
    ) {
      return;
    }

    if (state.inFlight) {
      return state.inFlight;
    }

    set({ isLoading: state.loadedClientId !== clientId });

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('dealerships')
          .select('id, name, address, phone, email, client_id')
          .eq('client_id', clientId)
          .order('address');

        if (error) {
          console.error('Error fetching dealerships:', error);
          toast({
            title: 'Error',
            description: 'No se pudieron cargar las sucursales',
            variant: 'destructive',
          });
          set({ isLoading: false, inFlight: null });
          return;
        }

        set({
          dealerships: data || [],
          loadedClientId: clientId,
          isLoading: false,
          inFlight: null,
        });
      } catch (e) {
        console.error('Error fetching dealerships:', e);
        set({ isLoading: false, inFlight: null });
      }
    })();

    set({ inFlight: promise });
    return promise;
  },
}));

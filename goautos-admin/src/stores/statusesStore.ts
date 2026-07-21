import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface Status {
  id: number;
  name: string | null;
  color: string | null;
  order: number | null;
  description: string | null;
  is_disabled: boolean;
  show_in_web?: boolean;
}

interface StatusesState {
  statuses: Status[];
  isLoading: boolean;
  loadedClientId: number | null;
  inFlight: Promise<void> | null;
  fetch: (clientId: number, force?: boolean) => Promise<void>;
}

// Shared cache for clients_vehicles_states. Multiple components (Vehiculos
// page, table, board view, filter, etc.) used to each fetch this list
// independently — now they all subscribe to the same store and the network
// request is deduped via `inFlight`.
export const useStatusesStore = create<StatusesState>((set, get) => ({
  statuses: [],
  isLoading: false,
  loadedClientId: null,
  inFlight: null,

  fetch: async (clientId, force = false) => {
    const state = get();

    // Already loaded for this client and not forcing — nothing to do
    if (
      !force &&
      state.loadedClientId === clientId &&
      state.statuses.length > 0
    ) {
      return;
    }

    // Coalesce concurrent callers
    if (state.inFlight) {
      return state.inFlight;
    }

    // Only show loading on first load; refreshes update silently
    set({ isLoading: state.loadedClientId !== clientId });

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('clients_vehicles_states')
          .select('id, name, color, order, description, is_disabled, show_in_web')
          .eq('client_id', clientId)
          .order('order');

        if (error) {
          console.error('Error fetching statuses:', error);
          set({ isLoading: false, inFlight: null });
          return;
        }

        set({
          statuses: data || [],
          loadedClientId: clientId,
          isLoading: false,
          inFlight: null,
        });
      } catch (e) {
        console.error('Error fetching statuses:', e);
        set({ isLoading: false, inFlight: null });
      }
    })();

    set({ inFlight: promise });
    return promise;
  },
}));

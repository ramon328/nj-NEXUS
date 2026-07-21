import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { VehiculosFilters } from '@/components/vehiculos/VehiculosFilter';

export type VehiclesListView = 'board' | 'table' | 'cards';

interface VehiclesListStateStore {
  view: VehiclesListView;
  filters: VehiculosFilters;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  currentPage: number;
  activeStatusId: number | null;

  setView: (view: VehiclesListView) => void;
  setFilters: (
    filters: VehiculosFilters | ((prev: VehiculosFilters) => VehiculosFilters)
  ) => void;
  setSort: (field: string, direction: 'asc' | 'desc') => void;
  setCurrentPage: (page: number) => void;
  setActiveStatusId: (id: number | null) => void;
  reset: () => void;
}

const defaultFilters: VehiculosFilters = {
  search: '',
  status: [],
  seller: 'all',
  consigned: 'all',
  stockType: 'all',
  dealershipId: 'all',
};

const initialState = {
  view: 'table' as VehiclesListView,
  filters: defaultFilters,
  sortField: 'created_at',
  sortDirection: 'desc' as const,
  currentPage: 1,
  activeStatusId: null,
};

export const useVehiclesListStateStore = create<VehiclesListStateStore>()(
  persist(
    (set) => ({
      ...initialState,

      setView: (view) => set({ view }),
      setFilters: (filters) =>
        set((state) => ({
          filters:
            typeof filters === 'function' ? filters(state.filters) : filters,
        })),
      setSort: (sortField, sortDirection) => set({ sortField, sortDirection }),
      setCurrentPage: (currentPage) => set({ currentPage }),
      setActiveStatusId: (activeStatusId) => set({ activeStatusId }),
      reset: () => set(initialState),
    }),
    {
      // localStorage (no sessionStorage) para que los filtros, orden y vista
      // se mantengan aunque el usuario cierre la pestaña o el navegador.
      name: 'vehicles-list-state',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

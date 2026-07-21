import { create } from 'zustand';

interface VehicleFiltersState {
  filters: Record<string, any>;
  priceRange: [number, number];
  sortOrder: string;
  searchQuery: string;
  setFilters: (filters: Record<string, any>) => void;
  setPriceRange: (range: [number, number]) => void;
  setSortOrder: (order: string) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: (maxPrice: number) => void;
}

const useVehicleFiltersStore = create<VehicleFiltersState>((set) => ({
  filters: {},
  priceRange: [0, 0],
  sortOrder: 'date_desc',
  searchQuery: '',
  setFilters: (filters) => set({ filters }),
  setPriceRange: (priceRange) => set({ priceRange }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  clearFilters: (maxPrice) =>
    set({
      filters: {},
      priceRange: [0, maxPrice],
      sortOrder: 'date_desc',
      searchQuery: '',
    }),
}));

export default useVehicleFiltersStore;

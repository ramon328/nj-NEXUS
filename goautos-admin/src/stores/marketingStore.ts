import { create } from 'zustand';
import { Vehicle } from '@/types/vehicle';

interface RecommendedCustomer {
  id: number;
  full_name: string;
  email: string;
  rut: string;
  similarity: number;
  transaction_type?: 'compra' | 'venta';
  last_purchase: {
    brand: string;
    model: string;
    year: number;
    price: number;
    category?: string;
  };
  /** Which vehicle this customer was matched against */
  matched_vehicle?: string;
}

interface TargetAudience {
  buyers: boolean;
  sellers: boolean;
}

interface PriceFilter {
  enabled: boolean;
  min: number;
  max: number;
}

interface YearFilter {
  enabled: boolean;
  min: number;
  max: number;
}

interface CategoryFilter {
  enabled: boolean;
  selected: string;
}

interface CampaignFilters {
  similarityThreshold: number;
  targetAudience: TargetAudience;
  priceFilter: PriceFilter;
  yearFilter: YearFilter;
  categoryFilter: CategoryFilter;
}

interface MarketingState {
  // Vehicle selection
  selectedVehicle: Vehicle | null; // primary vehicle (first selected)
  selectedVehicles: Vehicle[];
  vehicleSearch: string;

  // Campaign results
  allRecommendations: RecommendedCustomer[];
  filteredRecommendations: RecommendedCustomer[];
  selectedCustomers: number[];

  // UI state
  loading: boolean;
  isEmailModalOpen: boolean;
  currentView: 'campaign' | 'history';

  // Customer data state
  hasCustomerTransactions: boolean | null;
  checkingTransactions: boolean;

  // Search progress
  searchProgress: { current: number; total: number; currentVehicle: string };
  setSearchProgress: (progress: { current: number; total: number; currentVehicle: string }) => void;

  // Campaign filters
  filters: CampaignFilters;

  // Actions
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  setSelectedVehicles: (vehicles: Vehicle[]) => void;
  toggleVehicleSelection: (vehicle: Vehicle) => void;
  setVehicleSearch: (search: string) => void;
  setAllRecommendations: (recommendations: RecommendedCustomer[]) => void;
  setFilteredRecommendations: (recommendations: RecommendedCustomer[]) => void;
  setSelectedCustomers: (customerIds: number[]) => void;
  setLoading: (loading: boolean) => void;
  setIsEmailModalOpen: (open: boolean) => void;
  setCurrentView: (view: 'campaign' | 'history') => void;
  setHasCustomerTransactions: (has: boolean | null) => void;
  setCheckingTransactions: (checking: boolean) => void;

  // Filter actions
  setSimilarityThreshold: (threshold: number) => void;
  setTargetAudience: (audience: TargetAudience) => void;
  setPriceFilter: (filter: PriceFilter) => void;
  setYearFilter: (filter: YearFilter) => void;
  setCategoryFilter: (filter: CategoryFilter) => void;
  resetFilters: (vehicle?: Vehicle | null) => void;

  // Status filter for vehicles
  selectedStatuses: string[];
  setSelectedStatuses: (statuses: string[]) => void;

  // Extra emails
  extraEmails: string[];
  setExtraEmails: (emails: string[]) => void;
  addManualCustomer: (customer: RecommendedCustomer) => void;
  removeManualCustomer: (customerId: number) => void;

  // Computed values
  getSelectedCustomers: () => RecommendedCustomer[];
}

export const useMarketingStore = create<MarketingState>((set, get) => ({
  // Initial state
  selectedVehicle: null,
  selectedVehicles: [],
  vehicleSearch: '',
  allRecommendations: [],
  filteredRecommendations: [],
  selectedCustomers: [],
  loading: false,
  isEmailModalOpen: false,
  currentView: 'campaign',
  hasCustomerTransactions: null,
  checkingTransactions: true,
  searchProgress: { current: 0, total: 0, currentVehicle: '' },
  setSearchProgress: (progress) => set({ searchProgress: progress }),

  filters: {
    similarityThreshold: 70,
    targetAudience: {
      buyers: true,
      sellers: false,
    },
    priceFilter: {
      enabled: false,
      min: 0,
      max: 100000000,
    },
    yearFilter: {
      enabled: false,
      min: 2000,
      max: new Date().getFullYear(),
    },
    categoryFilter: {
      enabled: false,
      selected: '',
    },
  },

  // Actions
  setSelectedVehicle: (vehicle) => {
    set({ selectedVehicle: vehicle });

    // Auto-configure filters when vehicle is selected
    if (vehicle) {
      const state = get();
      const vehiclePrice = vehicle.price;
      const priceMargin = vehiclePrice * 0.3;
      const vehicleYear = vehicle.year;

      set({
        filters: {
          ...state.filters,
          priceFilter: {
            enabled: true,
            min: Math.max(0, Math.round(vehiclePrice - priceMargin)),
            max: Math.round(vehiclePrice + priceMargin),
          },
          yearFilter: {
            enabled: true,
            min: Math.max(2000, vehicleYear - 3),
            max: Math.min(new Date().getFullYear(), vehicleYear + 3),
          },
          categoryFilter: {
            enabled: !!vehicle.category?.name,
            selected: vehicle.category?.name || '',
          },
        },
      });
    } else {
      // Reset filters when no vehicle selected
      const state = get();
      set({
        filters: {
          ...state.filters,
          priceFilter: { enabled: false, min: 0, max: 100000000 },
          yearFilter: {
            enabled: false,
            min: 2000,
            max: new Date().getFullYear(),
          },
          categoryFilter: { enabled: false, selected: '' },
        },
      });
    }
  },

  setSelectedVehicles: (vehicles) => set({ selectedVehicles: vehicles, selectedVehicle: vehicles[0] || null }),

  toggleVehicleSelection: (vehicle) => {
    const state = get();
    const isSelected = state.selectedVehicles.some((v) => v.id === vehicle.id);
    let next: Vehicle[];
    if (isSelected) {
      next = state.selectedVehicles.filter((v) => v.id !== vehicle.id);
    } else {
      next = [...state.selectedVehicles, vehicle];
    }
    const primary = next[0] || null;
    set({ selectedVehicles: next, selectedVehicle: primary });

    // Auto-configure filters based on first selected vehicle
    if (primary) {
      const vehiclePrice = primary.price;
      const priceMargin = vehiclePrice * 0.3;
      const vehicleYear = primary.year;
      set({
        filters: {
          ...state.filters,
          priceFilter: {
            enabled: true,
            min: Math.max(0, Math.round(vehiclePrice - priceMargin)),
            max: Math.round(vehiclePrice + priceMargin),
          },
          yearFilter: {
            enabled: true,
            min: Math.max(2000, vehicleYear - 3),
            max: Math.min(new Date().getFullYear(), vehicleYear + 3),
          },
          categoryFilter: {
            enabled: !!primary.category?.name,
            selected: primary.category?.name || '',
          },
        },
      });
    } else {
      set({
        filters: {
          ...state.filters,
          priceFilter: { enabled: false, min: 0, max: 100000000 },
          yearFilter: { enabled: false, min: 2000, max: new Date().getFullYear() },
          categoryFilter: { enabled: false, selected: '' },
        },
      });
    }
  },

  setVehicleSearch: (search) => set({ vehicleSearch: search }),

  setAllRecommendations: (recommendations) => {
    set({
      allRecommendations: recommendations,
      selectedCustomers: recommendations.map((c) => c.id), // Auto-select all initially
    });
  },

  setFilteredRecommendations: (recommendations) => {
    set({
      filteredRecommendations: recommendations,
      selectedCustomers: recommendations.map((c) => c.id), // Update selection to match filtered results
    });
  },

  setSelectedCustomers: (customerIds) =>
    set({ selectedCustomers: customerIds }),
  setLoading: (loading) => set({ loading }),
  setIsEmailModalOpen: (open) => set({ isEmailModalOpen: open }),
  setCurrentView: (view) => set({ currentView: view }),
  setHasCustomerTransactions: (has) => set({ hasCustomerTransactions: has }),
  setCheckingTransactions: (checking) =>
    set({ checkingTransactions: checking }),

  // Filter actions
  setSimilarityThreshold: (threshold) => {
    const state = get();
    set({
      filters: {
        ...state.filters,
        similarityThreshold: threshold,
      },
    });
  },

  setTargetAudience: (audience) => {
    const state = get();
    set({
      filters: {
        ...state.filters,
        targetAudience: audience,
      },
    });
  },

  setPriceFilter: (filter) => {
    const state = get();
    set({
      filters: {
        ...state.filters,
        priceFilter: filter,
      },
    });
  },

  setYearFilter: (filter) => {
    const state = get();
    set({
      filters: {
        ...state.filters,
        yearFilter: filter,
      },
    });
  },

  setCategoryFilter: (filter) => {
    const state = get();
    set({
      filters: {
        ...state.filters,
        categoryFilter: filter,
      },
    });
  },

  resetFilters: (vehicle) => {
    const state = get();

    if (vehicle) {
      // Reset to vehicle-based pre-filled values
      const vehiclePrice = vehicle.price;
      const priceMargin = vehiclePrice * 0.3;
      const vehicleYear = vehicle.year;

      set({
        filters: {
          ...state.filters,
          priceFilter: {
            enabled: true,
            min: Math.max(0, Math.round(vehiclePrice - priceMargin)),
            max: Math.round(vehiclePrice + priceMargin),
          },
          yearFilter: {
            enabled: true,
            min: Math.max(2000, vehicleYear - 3),
            max: Math.min(new Date().getFullYear(), vehicleYear + 3),
          },
          categoryFilter: {
            enabled: !!vehicle.category?.name,
            selected: vehicle.category?.name || '',
          },
        },
      });
    } else {
      set({
        filters: {
          ...state.filters,
          priceFilter: { enabled: false, min: 0, max: 100000000 },
          yearFilter: {
            enabled: false,
            min: 2000,
            max: new Date().getFullYear(),
          },
          categoryFilter: { enabled: false, selected: '' },
        },
      });
    }
  },

  // Status filter
  selectedStatuses: ['Publicado'],
  setSelectedStatuses: (statuses) => set({ selectedStatuses: statuses }),

  // Extra emails
  extraEmails: [],
  setExtraEmails: (emails) => set({ extraEmails: emails }),
  addManualCustomer: (customer) => {
    const state = get();
    // Don't add duplicates
    if (state.filteredRecommendations.some((c) => c.id === customer.id)) return;
    set({
      filteredRecommendations: [...state.filteredRecommendations, customer],
      allRecommendations: [...state.allRecommendations, customer],
      selectedCustomers: [...state.selectedCustomers, customer.id],
    });
  },
  removeManualCustomer: (customerId) => {
    const state = get();
    set({
      filteredRecommendations: state.filteredRecommendations.filter((c) => c.id !== customerId),
      allRecommendations: state.allRecommendations.filter((c) => c.id !== customerId),
      selectedCustomers: state.selectedCustomers.filter((id) => id !== customerId),
    });
  },

  // Computed values
  getSelectedCustomers: () => {
    const state = get();
    return state.filteredRecommendations.filter((c) =>
      state.selectedCustomers.includes(c.id)
    );
  },
}));

export type {
  RecommendedCustomer,
  CampaignFilters,
  TargetAudience,
  PriceFilter,
  YearFilter,
  CategoryFilter,
};

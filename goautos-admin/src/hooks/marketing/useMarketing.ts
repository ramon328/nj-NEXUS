import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVehicles } from '@/hooks/useVehicles';
import {
  useMarketingStore,
  RecommendedCustomer,
} from '@/stores/marketingStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useMarketing = () => {
  const { clientId } = useAuth();
  const { vehicles, isLoading: vehiclesLoading } = useVehicles();

  const {
    // State
    selectedVehicle,
    selectedVehicles,
    vehicleSearch,
    allRecommendations,
    filteredRecommendations,
    selectedCustomers,
    loading,
    isEmailModalOpen,
    currentView,
    hasCustomerTransactions,
    checkingTransactions,
    filters,

    // Actions
    setSelectedVehicle,
    toggleVehicleSelection,
    setSearchProgress,
    setVehicleSearch,
    setAllRecommendations,
    setFilteredRecommendations,
    setSelectedCustomers,
    setLoading,
    setIsEmailModalOpen,
    setCurrentView,
    setHasCustomerTransactions,
    setCheckingTransactions,
    resetFilters,
    getSelectedCustomers,
  } = useMarketingStore();

  // On mount: sync internal sales → customers_transactions, then check (runs once)
  useEffect(() => {
    let cancelled = false;

    const initMarketing = async () => {
      if (!clientId) return;

      try {
        setCheckingTransactions(true);

        // 1. Try to sync internal sales (non-blocking if edge function is down)
        try {
          const { data: syncResult, error: syncError } = await supabase.functions.invoke(
            'sync-sales-to-marketing',
            { body: { client_id: clientId } }
          );
          if (!syncError) {
            console.log(`Sync: ${syncResult?.synced ?? 0} new, ${syncResult?.skipped ?? 0} skipped`);
            // 2. Generate embeddings only if sync succeeded
            await supabase.functions.invoke('generate-embeddings-batch', {
              body: { client_id: clientId, batch_size: 50 },
            });
          }
        } catch (e) {
          console.warn('Sync/embeddings unavailable, continuing with existing data');
        }

        if (cancelled) return;

        // 3. Check if there are any transactions
        const { data, error } = await supabase
          .from('customers_transactions')
          .select('id')
          .eq('client_id', clientId)
          .limit(1);

        if (cancelled) return;

        if (error) {
          console.error('Error checking customer transactions:', error);
          setHasCustomerTransactions(false);
          return;
        }

        setHasCustomerTransactions(data && data.length > 0);
      } catch (error) {
        console.error('Error:', error);
        if (!cancelled) setHasCustomerTransactions(false);
      } finally {
        if (!cancelled) setCheckingTransactions(false);
      }
    };

    initMarketing();
    return () => { cancelled = true; };
  }, [clientId]); // minimal deps to avoid re-runs

  // Allows re-checking after a manual import
  const recheckTransactions = async () => {
    if (!clientId) return;
    setCheckingTransactions(true);

    // Also re-sync + re-embed in case new sales were added
    await supabase.functions.invoke('sync-sales-to-marketing', {
      body: { client_id: clientId },
    });
    await supabase.functions.invoke('generate-embeddings-batch', {
      body: { client_id: clientId, batch_size: 50 },
    });

    const { data } = await supabase
      .from('customers_transactions')
      .select('id')
      .eq('client_id', clientId)
      .limit(1);
    setHasCustomerTransactions(data && data.length > 0);
    setCheckingTransactions(false);
  };

  // Apply frontend filters
  useEffect(() => {
    let filtered = [...allRecommendations];

    if (filters.priceFilter.enabled) {
      filtered = filtered.filter(
        (customer) =>
          customer.last_purchase.price >= filters.priceFilter.min &&
          customer.last_purchase.price <= filters.priceFilter.max
      );
    }

    if (filters.yearFilter.enabled) {
      filtered = filtered.filter(
        (customer) =>
          customer.last_purchase.year >= filters.yearFilter.min &&
          customer.last_purchase.year <= filters.yearFilter.max
      );
    }

    if (filters.categoryFilter.enabled && selectedVehicle?.category?.name) {
      filtered = filtered.filter(
        (customer) =>
          customer.last_purchase.category?.toLowerCase() ===
          selectedVehicle.category.name.toLowerCase()
      );
    }

    setFilteredRecommendations(filtered);
  }, [
    allRecommendations,
    filters.priceFilter,
    filters.yearFilter,
    filters.categoryFilter,
    selectedVehicle?.category?.name,
    setFilteredRecommendations,
  ]);

  // Get all unique statuses from vehicles, "Publicado" first
  const allStatuses = Array.from(
    new Map(
      vehicles
        .filter((v) => v.status?.name)
        .map((v) => [v.status.name, v.status])
    ).values()
  ).sort((a, b) => {
    if (a.name === 'Publicado') return -1;
    if (b.name === 'Publicado') return 1;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  // Get selected status filters from store
  const { selectedStatuses, setSelectedStatuses } = useMarketingStore();

  // Filter vehicles by selected statuses (default: only Publicado)
  const availableVehicles = vehicles.filter((vehicle) => {
    if (selectedStatuses.length === 0) return vehicle.status?.name === 'Publicado';
    return selectedStatuses.includes(vehicle.status?.name || '');
  });

  // Filter vehicles by search
  const filteredVehicles = availableVehicles.filter((vehicle) =>
    `${vehicle.brand?.name} ${vehicle.model?.name} ${vehicle.year}`
      .toLowerCase()
      .includes(vehicleSearch.toLowerCase())
  );

  // Find similar customers using GAIA (searches across all selected vehicles)
  const findSimilarCustomers = async () => {
    if (!clientId || selectedVehicles.length === 0) return;

    try {
      setLoading(true);
      const total = selectedVehicles.length;

      const allCustomers: RecommendedCustomer[] = [];

      for (let i = 0; i < selectedVehicles.length; i++) {
        const vehicle = selectedVehicles[i];
        const vehicleLabel = `${vehicle.brand?.name} ${vehicle.model?.name}`;
        setSearchProgress({ current: i + 1, total, currentVehicle: vehicleLabel });

        const searchParams = {
          brand: vehicle.brand?.name,
          model: vehicle.model?.name,
          category: vehicle.category?.name || null,
          client_id: clientId,
          limit: 200,
          similarity_threshold: filters.similarityThreshold / 100,
          target_audience: filters.targetAudience,
        };

        const { data, error } = await supabase.functions.invoke(
          'find-similar-customers',
          { body: searchParams }
        );

        if (error) {
          console.error(`Error searching for ${vehicleLabel}:`, error);
          continue;
        }

        const customers: RecommendedCustomer[] = (data.customers || []).map(
          (c: RecommendedCustomer) => ({
            ...c,
            matched_vehicle: vehicleLabel,
          })
        );
        allCustomers.push(...customers);
      }

      // Deduplicate by customer id, keeping highest similarity
      // Also collect all matched vehicles per customer
      const matchedVehiclesMap = new Map<number, Set<string>>();
      const deduped = new Map<number, RecommendedCustomer>();
      for (const c of allCustomers) {
        // Track all vehicles this customer matched
        if (c.matched_vehicle) {
          if (!matchedVehiclesMap.has(c.id)) matchedVehiclesMap.set(c.id, new Set());
          matchedVehiclesMap.get(c.id)!.add(c.matched_vehicle);
        }
        const existing = deduped.get(c.id);
        if (!existing || c.similarity > existing.similarity) {
          deduped.set(c.id, c);
        }
      }
      // Store all matched vehicles as comma-separated string
      for (const [id, vehicles] of matchedVehiclesMap) {
        const customer = deduped.get(id);
        if (customer) {
          customer.matched_vehicle = Array.from(vehicles).join('|||');
        }
      }

      const uniqueCustomers = Array.from(deduped.values()).sort(
        (a, b) => b.similarity - a.similarity
      );

      // Disable frontend filters so all results are visible initially
      const state = useMarketingStore.getState();
      useMarketingStore.setState({
        filters: {
          ...state.filters,
          priceFilter: { ...state.filters.priceFilter, enabled: false },
          yearFilter: { ...state.filters.yearFilter, enabled: false },
          categoryFilter: { ...state.filters.categoryFilter, enabled: false },
        },
      });

      setAllRecommendations(uniqueCustomers);
      setSearchProgress({ current: total, total, currentVehicle: '' });

      toast.success(
        `Se encontraron ${uniqueCustomers.length} clientes similares`
      );
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  // Handle vehicle selection (toggle)
  const handleVehicleSelect = (vehicle: any) => {
    toggleVehicleSelection(vehicle);
  };

  // Handle reset filters
  const handleResetFilters = () => {
    resetFilters(selectedVehicle);
  };

  // Handle customer selection toggle
  const toggleCustomerSelection = (customerId: number) => {
    setSelectedCustomers(
      selectedCustomers.includes(customerId)
        ? selectedCustomers.filter((id) => id !== customerId)
        : [...selectedCustomers, customerId]
    );
  };

  // Get selected customers data
  const selectedCustomersData = getSelectedCustomers();

  // Utility functions
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'bg-green-500';
    if (similarity >= 0.8) return 'bg-blue-500';
    if (similarity >= 0.7) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  return {
    // State
    selectedVehicle,
    selectedVehicles,
    vehicleSearch,
    allRecommendations,
    filteredRecommendations,
    selectedCustomers,
    selectedCustomersData,
    loading,
    isEmailModalOpen,
    currentView,
    hasCustomerTransactions,
    checkingTransactions,
    filters,

    // Computed
    availableVehicles,
    filteredVehicles,
    vehiclesLoading,
    allStatuses,
    selectedStatuses,
    setSelectedStatuses,

    // Actions
    setVehicleSearch,
    setIsEmailModalOpen,
    setCurrentView,
    handleVehicleSelect,
    handleResetFilters,
    toggleCustomerSelection,
    findSimilarCustomers,
    recheckTransactions,

    // Utilities
    formatPrice,
    getSimilarityColor,
  };
};

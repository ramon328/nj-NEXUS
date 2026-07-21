import { useMarketingStore } from '@/stores/marketingStore';

export const useMarketingFilters = () => {
  const {
    filters,
    selectedVehicle,
    setSimilarityThreshold,
    setTargetAudience,
    setPriceFilter,
    setYearFilter,
    setCategoryFilter,
    resetFilters,
  } = useMarketingStore();

  // Get available category for filter (only from selected vehicle)
  const availableCategory = selectedVehicle?.category?.name || null;

  // Handle similarity threshold change
  const handleSimilarityThresholdChange = (value: number[]) => {
    setSimilarityThreshold(value[0]);
  };

  // Handle target audience change
  const handleTargetAudienceChange = (
    type: 'buyers' | 'sellers',
    checked: boolean
  ) => {
    setTargetAudience({
      ...filters.targetAudience,
      [type]: checked,
    });
  };

  // Handle price filter changes
  const handlePriceFilterToggle = (enabled: boolean) => {
    setPriceFilter({
      ...filters.priceFilter,
      enabled,
    });
  };

  const handlePriceFilterChange = (type: 'min' | 'max', value: number) => {
    setPriceFilter({
      ...filters.priceFilter,
      [type]: value,
    });
  };

  // Handle year filter changes
  const handleYearFilterToggle = (enabled: boolean) => {
    setYearFilter({
      ...filters.yearFilter,
      enabled,
    });
  };

  const handleYearFilterChange = (type: 'min' | 'max', value: number) => {
    setYearFilter({
      ...filters.yearFilter,
      [type]: value,
    });
  };

  // Handle category filter changes
  const handleCategoryFilterToggle = (enabled: boolean) => {
    setCategoryFilter({
      ...filters.categoryFilter,
      enabled,
    });
  };

  // Handle reset filters
  const handleResetFilters = () => {
    resetFilters(selectedVehicle);
  };

  // Check if any filters are enabled
  const hasActiveFilters =
    filters.priceFilter.enabled ||
    filters.yearFilter.enabled ||
    filters.categoryFilter.enabled;

  return {
    // State
    filters,
    availableCategory,
    hasActiveFilters,

    // Similarity threshold
    handleSimilarityThresholdChange,

    // Target audience
    handleTargetAudienceChange,

    // Price filter
    handlePriceFilterToggle,
    handlePriceFilterChange,

    // Year filter
    handleYearFilterToggle,
    handleYearFilterChange,

    // Category filter
    handleCategoryFilterToggle,

    // Reset
    handleResetFilters,
  };
};

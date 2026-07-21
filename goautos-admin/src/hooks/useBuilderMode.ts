import { useEditor } from '@craftjs/core';

/**
 * Hook to detect if the builder is in edit mode.
 * Replaces the repeated pattern: useEditor((state) => ({ isEnabled: state.options.enabled }))
 */
export const useBuilderMode = () => {
  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));
  return { isEnabled, isViewMode: !isEnabled };
};

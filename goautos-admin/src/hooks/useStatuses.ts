import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStatusesStore, Status } from '@/stores/statusesStore';

// Re-export the Status type for consumers that imported it from here
export type { Status };

export const useStatuses = () => {
  const { clientId } = useAuth();
  const statuses = useStatusesStore((s) => s.statuses);
  const isLoading = useStatusesStore((s) => s.isLoading);
  const loadedClientId = useStatusesStore((s) => s.loadedClientId);
  const fetchFromStore = useStatusesStore((s) => s.fetch);

  useEffect(() => {
    if (clientId) {
      fetchFromStore(clientId);
    }
  }, [clientId, fetchFromStore]);

  const fetchStatuses = useCallback(async () => {
    if (!clientId) return;
    // Force refresh from callers that want fresh data (e.g. after editing states)
    await fetchFromStore(clientId, true);
  }, [clientId, fetchFromStore]);

  // While the store is loading for a different client, expose an empty list
  // so consumers don't accidentally render the previous client's statuses.
  const visibleStatuses = loadedClientId === clientId ? statuses : [];

  return { statuses: visibleStatuses, isLoading, fetchStatuses };
};

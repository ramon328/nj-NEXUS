import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDealershipsStore,
  Dealership,
} from '@/stores/dealershipsStore';

// Re-export the type for consumers that imported it from here
export type { Dealership };

export const useDealerships = () => {
  const { clientId } = useAuth();
  const dealerships = useDealershipsStore((s) => s.dealerships);
  const isLoading = useDealershipsStore((s) => s.isLoading);
  const loadedClientId = useDealershipsStore((s) => s.loadedClientId);
  const fetchFromStore = useDealershipsStore((s) => s.fetch);

  useEffect(() => {
    if (clientId) {
      fetchFromStore(clientId);
    }
  }, [clientId, fetchFromStore]);

  // While loading for a different client, hide the previous client's list
  const visible = loadedClientId === clientId ? dealerships : [];

  return { dealerships: visible, isLoading };
};

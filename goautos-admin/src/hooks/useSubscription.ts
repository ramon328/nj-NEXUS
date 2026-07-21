import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from '@/services/subscriptionService';
import { SubscriptionStatusResponse } from '@/types/subscription';

/**
 * Hook to fetch and cache subscription status for a client
 * Uses React Query for caching and automatic refetching
 */
export const useSubscription = (clientId: number | undefined) => {
  return useQuery<SubscriptionStatusResponse>({
    queryKey: ['subscription', clientId],
    queryFn: () => {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      return subscriptionService.getSubscriptionStatus(clientId);
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 10, // Consider data fresh for 10 minutes (increased)
    cacheTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 1, // Only retry once on failure
  });
};

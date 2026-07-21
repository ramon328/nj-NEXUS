import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';

const STORAGE_KEY = 'badge-sales-dismissed';
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

async function fetchPendingSalesCount(clientId: number | string): Promise<number> {
  const { data, error } = await supabase.rpc('get_pending_sales_count', {
    p_client_id: Number(clientId),
  });

  if (error) {
    console.error('Error fetching pending sales count:', error);
    return 0;
  }
  return data || 0;
}

/**
 * Lightweight hook that returns the count of pending (unapproved) sales.
 * Used in the sidebar to show a notification badge.
 *
 * Uses React Query for caching (5 min staleTime) so navigating between
 * pages doesn't re-fetch. Real-time subscription invalidates the cache.
 *
 * The badge hides when the user visits /ventas and stays hidden for 30 min.
 */
export function usePendingSalesCount() {
  const { clientId } = useAuth();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    const ts = localStorage.getItem(STORAGE_KEY);
    return ts ? Date.now() - Number(ts) < COOLDOWN_MS : false;
  });

  // When user visits /ventas, dismiss the badge
  useEffect(() => {
    if (location === '/ventas' || location.startsWith('/ventas/')) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      setDismissed(true);
      const timer = setTimeout(() => setDismissed(false), COOLDOWN_MS);
      return () => clearTimeout(timer);
    }
  }, [location]);

  // On mount: if already dismissed, schedule re-show
  useEffect(() => {
    const ts = localStorage.getItem(STORAGE_KEY);
    if (ts && Date.now() - Number(ts) < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (Date.now() - Number(ts));
      const timer = setTimeout(() => setDismissed(false), remaining);
      return () => clearTimeout(timer);
    }
  }, []);

  const { data: count = 0 } = useQuery({
    queryKey: ['pendingSalesCount', clientId],
    queryFn: () => fetchPendingSalesCount(clientId!),
    staleTime: 5 * 60 * 1000,
    enabled: !!clientId,
  });

  // Real-time subscription invalidates cache instead of direct fetch
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel('pending-sales-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles_sales',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pendingSalesCount', clientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, queryClient]);

  return dismissed ? 0 : count;
}

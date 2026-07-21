import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClientConfig } from '@/hooks/useClientConfig';
import { useLocation } from 'wouter';

const STORAGE_KEY = 'badge-leads-dismissed';
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

interface PendingCountVisibility {
  restrictToOwn: boolean;
  canClaim: boolean;
  userId?: number | null;
}

async function fetchPendingLeadsCount(
  clientId: number | string,
  vis: PendingCountVisibility
): Promise<number> {
  // Si el vendedor está restringido pero aún no sabemos su id, no contar nada
  // (evita mostrar el total global por un instante). Coherente con useLeads.
  if (vis.restrictToOwn && !vis.userId) return 0;

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .not('customer_id', 'is', null);

  if (vis.restrictToOwn && vis.userId) {
    if (vis.canClaim) {
      // Pool: pendientes propios + sin asignar (los que puede tomar).
      query = query.or(`assigned_to.eq.${vis.userId},assigned_to.is.null`);
    } else {
      query = query.eq('assigned_to', vis.userId);
    }
  }

  const { count, error } = await query;
  if (error) return 0;
  return count || 0;
}

/**
 * Lightweight hook that returns the count of pending (unattended) leads.
 * Used in the sidebar to show a notification badge.
 *
 * Uses React Query for caching (5 min staleTime) so navigating between
 * pages doesn't re-fetch. Real-time subscription invalidates the cache.
 *
 * The badge hides when the user visits /leads and stays hidden for 30 min.
 */
export function usePendingLeadsCount() {
  const { clientId, userRole, userData } = useAuth();
  const { data: clientConfig } = useClientConfig();
  // Misma lógica de visibilidad que useLeads (rol legacy crudo, no usePermissions).
  const isSeller = userRole === 'seller' || userRole === 'vendedor';
  // Fail-closed, igual que useLeads: restringir salvo que la config cargó y dice === true.
  const restrictToOwn = isSeller && clientConfig?.sellers_see_all_leads !== true;
  const canClaim = restrictToOwn && clientConfig?.sellers_can_claim_leads === true;
  const userId = userData?.id ?? null;
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    const ts = localStorage.getItem(STORAGE_KEY);
    return ts ? Date.now() - Number(ts) < COOLDOWN_MS : false;
  });

  // When user visits /leads, dismiss the badge
  useEffect(() => {
    if (location === '/leads' || location.startsWith('/leads/')) {
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
    queryKey: ['pendingLeadsCount', clientId, restrictToOwn, canClaim, userId],
    queryFn: () => fetchPendingLeadsCount(clientId!, { restrictToOwn, canClaim, userId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!clientId,
  });

  // Real-time subscription invalidates cache instead of direct fetch
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel('pending-leads-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pendingLeadsCount', clientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, queryClient]);

  return dismissed ? 0 : count;
}

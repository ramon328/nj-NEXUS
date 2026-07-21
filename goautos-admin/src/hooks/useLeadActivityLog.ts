import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Historial de actividad de un lead (tabla lead_activity_log, alimentada por el
 * trigger trg_log_lead_activity). Solo lectura. La RLS de la tabla scopea por
 * client_id; además solo se consulta al abrir el detalle de un lead que el
 * usuario ya puede ver, así que hereda la visibilidad por vendedor.
 */
export interface LeadActivityEntry {
  id: number;
  event_type: 'created' | 'assigned' | 'reassigned' | 'unassigned' | 'status_changed' | 'notes_changed' | string;
  source: 'admin' | 'web' | 'chileautos' | 'system' | null;
  actor_user_id: number | null;
  actor?: { first_name?: string | null; last_name?: string | null } | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useLeadActivityLog(leadId?: string | null, enabled = true) {
  const [entries, setEntries] = useState<LeadActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Se incrementa para forzar una recarga manual (p.ej. tras editar las notas,
  // que generan un evento notes_changed vía el trigger de la BD).
  const [refreshTick, setRefreshTick] = useState(0);
  const refetch = useCallback(() => setRefreshTick((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !leadId) {
      setEntries([]);
      return;
    }
    const id = parseInt(leadId);
    if (!Number.isFinite(id)) {
      setEntries([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lead_activity_log')
        .select(
          'id, event_type, source, actor_user_id, metadata, created_at, actor:actor_user_id(first_name, last_name)'
        )
        .eq('lead_id', id)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });

      if (cancelled) return;
      if (!error) setEntries((data as unknown as LeadActivityEntry[]) || []);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [leadId, enabled, refreshTick]);

  return { entries, isLoading, refetch };
}

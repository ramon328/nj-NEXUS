import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import posthog from '@/utils/posthog';

export interface VehicleRequest {
  id: string;
  client_id: number;
  brand_name: string | null;
  model_name: string | null;
  year_min: number | null;
  year_max: number | null;
  budget_min: number | null;
  budget_max: number | null;
  notes: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  status: 'open' | 'in_progress' | 'fulfilled' | 'expired' | 'cancelled';
  assigned_to: string | null;
  fulfilled_vehicle_id: number | null;
  lead_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  status_history: Array<{
    from: string;
    to: string;
    note: string | null;
    changed_by: string;
    changed_at: string;
  }>;
  // Joined data
  assigned_user_name?: string;
}

export interface CreateVehicleRequestData {
  brand_name?: string;
  model_name?: string;
  year_min?: number;
  year_max?: number;
  budget_min?: number;
  budget_max?: number;
  notes?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  lead_id?: string;
}

export function useVehicleRequests() {
  const { clientId, user } = useAuth();
  const [requests, setRequests] = useState<VehicleRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!clientId) return;

    const { data, error } = await supabase
      .from('vehicle_requests')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vehicle requests:', error);
      setIsLoading(false);
      return;
    }

    // Fetch assigned user names
    const assignedIds = [...new Set((data || []).filter(r => r.assigned_to).map(r => r.assigned_to))];
    let userMap = new Map<string, string>();
    if (assignedIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('auth_id, first_name, last_name')
        .in('auth_id', assignedIds);
      if (users) {
        userMap = new Map(users.map(u => [u.auth_id, `${u.first_name} ${u.last_name}`.trim()]));
      }
    }

    const enriched = (data || []).map(r => ({
      ...r,
      assigned_user_name: r.assigned_to ? userMap.get(r.assigned_to) || undefined : undefined,
    }));

    setRequests(enriched);
    setIsLoading(false);
  }, [clientId]);

  const createRequest = useCallback(async (data: CreateVehicleRequestData) => {
    if (!clientId || !user?.id) return { error: 'No client/user' };

    const insertData: Record<string, unknown> = {
      client_id: clientId,
      created_by: user.id,
      ...data,
    };

    // Try with lead_id first; if column doesn't exist, retry without it
    const { error } = await supabase
      .from('vehicle_requests')
      .insert(insertData);

    if (error) {
      if (data.lead_id && (error.message?.includes('lead_id') || error.code === '42703')) {
        delete insertData.lead_id;
        const { error: retryError } = await supabase
          .from('vehicle_requests')
          .insert(insertData);
        if (retryError) {
          console.error('Error creating vehicle request:', retryError);
          return { error: 'No pudimos guardar la solicitud. Verifica los datos e intenta de nuevo.' };
        }
      } else {
        console.error('Error creating vehicle request:', error);
        return { error: 'No pudimos guardar la solicitud. Verifica los datos e intenta de nuevo.' };
      }
    }

    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'vehicle_request_created',
      properties: {
        client_id: clientId,
        customer_name: data.customer_name,
        brand_name: data.brand_name,
        model_name: data.model_name,
      },
    });

    await fetchRequests();
    return { error: null };
  }, [clientId, user?.id, fetchRequests]);

  const updateStatus = useCallback(async (
    requestId: string,
    status: VehicleRequest['status'],
    assignedTo?: string,
    fulfilledVehicleId?: number,
    statusNote?: string,
  ) => {
    // 1. Get current state
    const { data: current } = await supabase
      .from('vehicle_requests')
      .select('status, client_id, lead_id')
      .eq('id', requestId)
      .single();

    // Auto-assign to current user when taking a request
    const effectiveAssignedTo = status === 'in_progress' && !assignedTo ? user?.id : assignedTo;

    // 2. Optimistic local update
    setRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, status, ...(effectiveAssignedTo ? { assigned_to: effectiveAssignedTo } : {}) } : r
    ));

    // 3. Core update
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (effectiveAssignedTo !== undefined) updates.assigned_to = effectiveAssignedTo;
    if (fulfilledVehicleId !== undefined) updates.fulfilled_vehicle_id = fulfilledVehicleId;

    // 4. Try to include status_history (best-effort)
    const { data: withHistory, error: historyErr } = await supabase
      .from('vehicle_requests')
      .select('status_history')
      .eq('id', requestId)
      .single();

    if (!historyErr) {
      const historyEntry = {
        from: current?.status ?? 'unknown',
        to: status,
        note: statusNote || null,
        changed_by: user?.id ?? 'unknown',
        changed_at: new Date().toISOString(),
      };
      const prevHistory = (withHistory?.status_history as VehicleRequest['status_history']) || [];
      updates.status_history = [...prevHistory, historyEntry];
    }

    const { error } = await supabase
      .from('vehicle_requests')
      .update(updates)
      .eq('id', requestId);

    if (error) {
      if (error.message?.includes('status_history') || error.code === '42703') {
        delete updates.status_history;
        const { error: retryError } = await supabase
          .from('vehicle_requests')
          .update(updates)
          .eq('id', requestId);

        if (retryError) {
          console.error('Error updating vehicle request:', retryError);
          await fetchRequests();
          return { error: 'No pudimos actualizar la solicitud. Intenta de nuevo.' };
        }
      } else {
        console.error('Error updating vehicle request:', error);
        await fetchRequests();
        return { error: 'No pudimos actualizar la solicitud. Intenta de nuevo.' };
      }
    }

    // 5. Sync linked lead status
    const leadId = current?.lead_id;
    if (leadId) {
      const leadStatusMap: Record<string, string> = {
        open: 'pending',
        in_progress: 'assigned',
        fulfilled: 'completed',
        cancelled: 'cancelled',
      };
      const newLeadStatus = leadStatusMap[status];
      if (newLeadStatus) {
        await supabase
          .from('leads')
          .update({ status: newLeadStatus })
          .eq('id', parseInt(leadId))
          .then(({ error: leadErr }) => {
            if (leadErr) console.error('Error syncing lead status:', leadErr);
          });
      }
    }

    // 6. Create notification
    const notifClientId = current?.client_id || clientId;
    if (notifClientId) {
      const statusLabels: Record<string, string> = {
        open: 'Abierta',
        in_progress: 'En Progreso',
        fulfilled: 'Cumplida',
        cancelled: 'Cancelada',
        expired: 'Expirada',
      };
      const fromLabel = statusLabels[current?.status ?? ''] ?? current?.status ?? '?';
      const toLabel = statusLabels[status] ?? status;
      const body = `${fromLabel} → ${toLabel}` + (statusNote ? `: ${statusNote}` : '');
      await supabase.from('notifications').insert({
        client_id: notifClientId,
        type: 'vehicle_request_status',
        title: 'Solicitud actualizada',
        body,
        icon: 'search',
        url: '/solicitudes',
        data: { request_id: requestId, from: current?.status, to: status },
        created_by: user?.id || null,
        target_user_id: null,
        target_role: null,
      }).then(({ error: nErr }) => {
        if (nErr) console.error('Error creating notification:', nErr);
      });
    }

    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'vehicle_request_status_updated',
      properties: {
        request_id: requestId,
        from_status: current?.status,
        to_status: status,
        client_id: clientId,
      },
    });

    // Track assignment
    if (effectiveAssignedTo) {
      posthog.capture({
        distinctId: user?.id || 'anonymous',
        event: 'vehicle_request_assigned',
        properties: {
          request_id: requestId,
          assigned_to: effectiveAssignedTo,
          client_id: clientId,
        },
      });
    }

    // Track fulfillment
    if (status === 'fulfilled' && fulfilledVehicleId) {
      posthog.capture({
        distinctId: user?.id || 'anonymous',
        event: 'vehicle_request_fulfilled',
        properties: {
          request_id: requestId,
          vehicle_id: fulfilledVehicleId,
          client_id: clientId,
        },
      });
    }

    // 7. Refetch to get fresh data (assigned user name, etc.)
    await fetchRequests();
    return { error: null };
  }, [clientId, user?.id, fetchRequests]);

  // Initial fetch
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Realtime subscription
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel('vehicle-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle_requests',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, fetchRequests]);

  const openCount = requests.filter((r) => r.status === 'open').length;

  return {
    requests,
    isLoading,
    openCount,
    createRequest,
    updateStatus,
    refetch: fetchRequests,
  };
}

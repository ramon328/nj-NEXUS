import { useState, useEffect } from 'react';
import { Lead, LeadTypes } from '@/types/leads';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClientConfig } from '@/hooks/useClientConfig';
import { useActiveDealership } from '@/hooks/useActiveDealership';
import posthog from '@/utils/posthog';

interface UseLeadsProps {
  clientId: number;
}

interface GroupedLeads {
  buyLeads: Lead[];
  sellLeads: Lead[];
}

interface SupabaseLead {
  id: number;
  client_id: number;
  customer_id?: number;
  type: string;
  status: string;
  notes?: string;
  search_params: any;
  search_text?: string;
  brand_id?: string;
  model_id?: number;
  created_at: string;
  updated_at?: string;
  assigned_to?: number | null;
  assigned_user?: any;
  customer?: any;
  search_brand?: any;
  search_model?: any;
}

type LeadStatus = 'pending' | 'assigned' | 'completed' | 'cancelled';

interface CreateLeadInput {
  customer_id: number;
  type: LeadTypes;
  notes?: string;
}

export const useLeads = ({ clientId }: UseLeadsProps) => {
  const { userRole, userData } = useAuth();
  // Config de visibilidad desde useClientConfig (query mínima cacheada por react-query),
  // NO desde el `client` de useAuth: ese se carga con un select('*, legal_info(*), logo')
  // que llega tarde/puede no resolver, y dejaba a los vendedores viendo TODO. Misma
  // fuente robusta que usa la restricción de vehículos.
  const { data: clientConfig } = useClientConfig();
  // División de sedes (Slice 4, decisión 5): los leads heredan la sede del VENDEDOR
  // asignado. `visibleDealershipIds` null = sin filtro (retrocompatible).
  const { visibleDealershipIds } = useActiveDealership();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [groupedLeads, setGroupedLeads] = useState<GroupedLeads>({
    buyLeads: [],
    sellLeads: [],
  });

  // Los vendedores ven solo sus leads asignados, salvo que el cliente tenga
  // activado "ver todos los leads". Admins/gerentes ven todos.
  // OJO: usamos el rol legacy crudo (userRole = users.rol), NO usePermissions.isSeller:
  // en prod 96/99 vendedores tienen además un rol custom "Vendedor", y isSeller los
  // excluiría (los dejaría viendo todo). El rol crudo es la señal fiable y probada.
  const isSeller = userRole === 'seller' || userRole === 'vendedor';
  // Fail-closed: si es vendedor, RESTRINGIR salvo que la config ya haya cargado y
  // diga explícitamente sellers_see_all_leads === true. Mientras clientConfig está
  // cargando (undefined) restringimos. Antes era `=== false` (fail-open) sobre el
  // `client` de useAuth: mientras ese client era null, `undefined === false` daba
  // false y el vendedor veía TODOS los leads.
  const restrictToOwn = isSeller && clientConfig?.sellers_see_all_leads !== true;
  // Modo "pool": vendedor restringido que además puede ver leads sin asignar y tomarlos.
  // === true estricto para no activarse por undefined mientras carga la config.
  const canClaim = restrictToOwn && clientConfig?.sellers_can_claim_leads === true;

  const fetchLeads = async (options?: { silent?: boolean }) => {
    if (!clientId) return;

    // Si el vendedor está restringido pero aún no sabemos su id, no traer nada
    // (evita mostrarle todos los leads por un instante mientras carga el perfil).
    if (restrictToOwn && !userData?.id) {
      setLeads([]);
      setIsLoading(false);
      return;
    }

    const silent = options?.silent ?? false;
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      let query = supabase
        .from('leads')
        .select(
          `
          *,
          customer:customer_id(*),
          vehicle:vehicle_id(
            *,
            brand:brand_id(*),
            model:model_id(*)
          ),
          search_brand:brand_id(*),
          search_model:model_id(*),
          assigned_user:assigned_to(id, first_name, last_name)
        `
        )
        .eq('client_id', clientId)
        // Filtrar para incluir solo leads con customer_id no nulo
        .not('customer_id', 'is', null);

      if (restrictToOwn && userData?.id) {
        if (canClaim) {
          // Pool: ve los suyos + los sin asignar (puede tomarlos), pero NO los de otros.
          query = query.or(`assigned_to.eq.${userData.id},assigned_to.is.null`);
        } else {
          // Estricto: solo los suyos.
          query = query.eq('assigned_to', userData.id);
        }
      }

      // Filtro de sede (decisión 5): el lead hereda la sede de su vendedor asignado.
      // Solo aplica a usuarios restringidos por sede que NO son vendedores acotados a
      // sus propios leads (esos ya ven solo lo suyo → el filtro es redundante y su
      // .or() de pool no debe componerse con otro .or()). Un lead es visible si su
      // vendedor comparte alguna sede visible, o si está sin asignar (pool sin sede).
      // Clientes (customers) NO tienen vendedor asignado → quedan como Fase 2.
      if (!restrictToOwn && visibleDealershipIds && visibleDealershipIds.length > 0) {
        const { data: sedeUsers } = await supabase
          .from('user_dealerships')
          .select('user_id')
          .in('dealership_id', visibleDealershipIds);
        const sellerIds = Array.from(
          new Set((sedeUsers || []).map((r) => r.user_id as number))
        );
        query =
          sellerIds.length > 0
            ? query.or(`assigned_to.in.(${sellerIds.join(',')}),assigned_to.is.null`)
            : query.is('assigned_to', null);
      }

      // Ordenar por fecha de creación descendente (más nuevo primero)
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Convert data to Lead[] type
      const formattedLeads = data?.map((item: SupabaseLead) => ({
        ...item,
        id: String(item.id),
        client_id: String(item.client_id),
        customer_id: item.customer_id ? String(item.customer_id) : undefined,
        type: item.type as LeadTypes,
        updated_at: item.updated_at || item.created_at,
        search_brand: item.search_brand,
        search_model: item.search_model,
        assigned_to: item.assigned_to ?? null,
        assigned_user: item.assigned_user ?? null,
      })) as Lead[];

      setLeads(formattedLeads || []);
    } catch (err) {
      setError('No pudimos cargar los leads. Recarga la página e intenta de nuevo.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Función para actualizar el estado de un lead
  const updateLeadStatus = async (
    leadId: string,
    newStatus: LeadStatus
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', parseInt(leadId));

      if (error) throw error;

      posthog.capture({
        distinctId: String(clientId),
        event: 'lead_status_updated',
        properties: { lead_id: leadId, new_status: newStatus, client_id: clientId },
      });

      // Actualizar el estado en el cliente
      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                status: newStatus,
              }
            : lead
        )
      );

      // Sincronizar solicitud vinculada (si existe)
      const requestStatusMap: Record<string, string> = {
        pending: 'open',
        assigned: 'in_progress',
        completed: 'fulfilled',
        cancelled: 'cancelled',
      };
      const newRequestStatus = requestStatusMap[newStatus];
      if (newRequestStatus) {
        const { data: linked } = await supabase
          .from('vehicle_requests')
          .select('id, status')
          .eq('lead_id', parseInt(leadId))
          .maybeSingle();

        if (linked && linked.status !== newRequestStatus) {
          await supabase
            .from('vehicle_requests')
            .update({ status: newRequestStatus, updated_at: new Date().toISOString() })
            .eq('id', linked.id);
        }
      }

      return true;
    } catch (err) {
      console.error('Error actualizando el estado del lead:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Error actualizando el estado del lead'
      );
      return false;
    }
  };

  const createLead = async (input: CreateLeadInput): Promise<boolean> => {
    try {
      const { error } = await supabase.from('leads').insert({
        client_id: clientId,
        customer_id: input.customer_id,
        type: input.type,
        notes: input.notes || null,
        status: 'pending',
        search_params: {},
        // El lead queda asignado a quien lo crea (su dueño). Así el vendedor
        // ve sus propios leads y los admins pueden reasignarlo después.
        assigned_to: userData?.id ?? null,
      });

      if (error) throw error;

      posthog.capture({
        distinctId: String(clientId),
        event: 'lead_created',
        properties: { customer_id: input.customer_id, type: input.type, client_id: clientId },
      });

      await fetchLeads({ silent: true });
      return true;
    } catch (err) {
      posthog.captureException(err);
      console.error('Error creando lead:', err);
      return false;
    }
  };

  const deleteLead = async (leadId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', parseInt(leadId));

      if (error) throw error;

      await fetchLeads({ silent: true });
      return true;
    } catch (err) {
      console.error('Error eliminando lead:', err);
      return false;
    }
  };

  // Reasignar un lead a un vendedor (o desasignar con null). Solo lo usan
  // quienes ven todos los leads (admins/gerentes).
  const assignLead = async (
    leadId: string,
    assignedTo: number | null
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ assigned_to: assignedTo })
        .eq('id', parseInt(leadId));

      if (error) throw error;

      posthog.capture({
        distinctId: String(clientId),
        event: 'lead_assigned',
        properties: { lead_id: leadId, assigned_to: assignedTo, client_id: clientId },
      });

      await fetchLeads({ silent: true });
      return true;
    } catch (err) {
      console.error('Error asignando el lead:', err);
      return false;
    }
  };

  // Tomar ("agarrar") un lead del pool. Va por RPC SECURITY DEFINER: el UPDATE
  // crudo permitiría robar leads ajenos (leads no tiene RLS). La RPC valida tenant
  // y que el lead siga sin asignar (resuelve la carrera entre dos vendedores).
  const claimLead = async (leadId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('claim_lead', { p_lead_id: parseInt(leadId) });
      if (error) throw error;
      if (data !== true) return false; // ya lo tomó otro / sin permiso

      posthog.capture({
        distinctId: String(clientId),
        event: 'lead_claimed',
        properties: { lead_id: leadId, client_id: clientId },
      });

      await fetchLeads({ silent: true });
      return true;
    } catch (err) {
      console.error('Error tomando el lead:', err);
      return false;
    }
  };

  // Soltar un lead PROPIO (vuelve al pool). La RPC solo permite soltar los del actor.
  const releaseLead = async (leadId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('release_lead', { p_lead_id: parseInt(leadId) });
      if (error) throw error;
      if (data !== true) return false;

      posthog.capture({
        distinctId: String(clientId),
        event: 'lead_released',
        properties: { lead_id: leadId, client_id: clientId },
      });

      await fetchLeads({ silent: true });
      return true;
    } catch (err) {
      console.error('Error soltando el lead:', err);
      return false;
    }
  };

  const updateLeadNotes = async (
    leadId: string,
    notes: string
  ): Promise<boolean> => {
    try {
      // Normalizamos vacío a NULL: así guardar un textarea vacío sobre un lead
      // que ya tenía notes NULL es un no-op real y no dispara un evento
      // notes_changed espurio en el historial ('' IS DISTINCT FROM NULL = true).
      const normalized = notes.trim() || null;
      const { error } = await supabase
        .from('leads')
        .update({ notes: normalized })
        .eq('id', parseInt(leadId));

      if (error) throw error;

      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead.id === leadId ? { ...lead, notes: normalized ?? undefined } : lead
        )
      );

      return true;
    } catch (err) {
      console.error('Error actualizando notas del lead:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchLeads();
    // Re-fetch cuando se resuelve el rol/usuario/config, para aplicar el
    // filtrado por vendedor recién cuando ya conocemos esos datos. También al
    // cambiar de sede activa (Slice 4).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, restrictToOwn, canClaim, userData?.id, visibleDealershipIds]);

  useEffect(() => {
    const buyLeads = leads.filter(
      (lead) =>
        lead.type === LeadTypes.BUY_DIRECT ||
        lead.type === LeadTypes.BUY_CONSIGNMENT ||
        lead.type === LeadTypes.SEARCH_REQUEST
    );

    const sellLeads = leads.filter(
      (lead) =>
        lead.type === LeadTypes.SELL_VEHICLE ||
        lead.type === LeadTypes.SELL_FINANCING ||
        lead.type === LeadTypes.SELL_TRANSFER ||
        lead.type === LeadTypes.CONTACT_GENERAL
    );

    setGroupedLeads({ buyLeads, sellLeads });
  }, [leads]);

  return {
    isLoading,
    error,
    leads,
    groupedLeads,
    updateLeadStatus,
    createLead,
    deleteLead,
    updateLeadNotes,
    assignLead,
    claimLead,
    releaseLead,
    canAssignLeads: !isSeller,
    /** El vendedor (modo pool) puede tomar/soltar leads. */
    canClaim,
    refetch: fetchLeads,
  };
};

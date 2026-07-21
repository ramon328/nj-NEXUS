import { supabase } from '@/integrations/supabase/client';
import { ClientFormData, Client } from './types';
import { DEFAULT_VEHICLE_STATES } from '@/utils/defaultVehicleStates';

// Fix the re-export issue by using 'export type'
export type { ClientFormData, Client };

export const createClient = async (clientData: ClientFormData) => {
  const clientRecord = {
    name: clientData.name,
    domain: clientData.domain,
    favicon: clientData.favicon || null,
    logo: clientData.logo || null,
    logo_dark: clientData.logo_dark || null,
    theme: {
      light: {
        primary: clientData.theme?.light?.primary || '#facc14',
        secondary: clientData.theme?.light?.secondary || '#ffffff',
      },
      dark: {
        primary: clientData.theme?.dark?.primary || '#facc14',
        secondary: clientData.theme?.dark?.secondary || '#ffffff',
      },
    },
    seo: {
      title: clientData.seo?.title || null,
      description: clientData.seo?.description || null,
      keywords: clientData.seo?.keywords || [],
      google_site_verification:
        clientData.seo?.google_site_verification || null,
      social_links: clientData.seo?.social_links || null,
    },
    contact: {
      email: clientData.contact?.email || null,
      phone: clientData.contact?.phone || null,
      address: clientData.contact?.address || null,
    },
    location: {
      lat: clientData.location?.lat || null,
      lng: clientData.location?.lng || null,
    },
    has_demo: clientData.has_demo || false,
    currency: clientData.currency || 'CLP',
    default_language: clientData.default_language || 'es',
  };

  const { data, error } = await supabase
    .from('clients')
    .insert(clientRecord)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Error creating client');
  }

  if (data && data.id) {
    await createDefaultVehicleStates(data.id);
  }

  return data;
};

export const createDefaultVehicleStates = async (clientId: number) => {
  // First check if states already exist (the DB trigger may have created them)
  const { count } = await supabase
    .from('clients_vehicles_states')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId);

  if (count && count > 0) {
    // States already created by the DB trigger — nothing to do
    return;
  }

  // Fallback: insert manually if trigger didn't fire (e.g. RLS or timing issue)
  const vehicleStates = DEFAULT_VEHICLE_STATES.map((state) => ({
    ...state,
    client_id: clientId,
  }));

  const { error } = await supabase
    .from('clients_vehicles_states')
    .insert(vehicleStates);

  if (error) {
    // If it's a duplicate error, the trigger beat us — that's fine
    if (error.code === '23505') return;
    throw new Error('Error creando estados de vehículos: ' + error.message);
  }
};

export const updateClient = async (
  clientId: number,
  clientData: ClientFormData
) => {
  const clientRecord = {
    name: clientData.name,
    domain: clientData.domain,
    favicon: clientData.favicon || null,
    logo: clientData.logo || null,
    logo_dark: clientData.logo_dark || null,
    theme: {
      light: {
        primary: clientData.theme?.light?.primary || '#facc14',
        secondary: clientData.theme?.light?.secondary || '#ffffff',
      },
      dark: {
        primary: clientData.theme?.dark?.primary || '#facc14',
        secondary: clientData.theme?.dark?.secondary || '#ffffff',
      },
    },
    seo: {
      title: clientData.seo?.title || null,
      description: clientData.seo?.description || null,
      keywords: clientData.seo?.keywords || [],
      google_site_verification:
        clientData.seo?.google_site_verification || null,
      social_links: clientData.seo?.social_links || null,
    },
    contact: {
      email: clientData.contact?.email || null,
      phone: clientData.contact?.phone || null,
      address: clientData.contact?.address || null,
      finance_emails: clientData.contact?.finance_emails || null,
      consignments_emails: clientData.contact?.consignments_emails || null,
      buy_emails: clientData.contact?.buy_emails || null,
      search_emails: clientData.contact?.search_emails || null,
    },
    location: {
      lat: clientData.location?.lat || null,
      lng: clientData.location?.lng || null,
    },
    has_demo: clientData.has_demo || false,
    has_dark_mode: clientData.has_dark_mode ?? false,
    currency: clientData.currency || 'CLP',
    default_language: clientData.default_language || 'es',
  };

  const { data, error } = await supabase
    .from('clients')
    .update(clientRecord)
    .eq('id', clientId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Error updating client');
  }

  return data;
};

export const deleteClient = async (clientId: number) => {
  const { error } = await supabase.from('clients').delete().eq('id', clientId);

  if (error) {
    throw new Error(error.message || 'Error deleting client');
  }

  return { success: true };
};

export const getClients = async () => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name');

  if (error) {
    throw new Error(error.message || 'Error fetching clients');
  }

  return data || [];
};

export const getClientById = async (clientId: number) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (error) {
    throw new Error(error.message || 'Error fetching client');
  }

  return data;
};

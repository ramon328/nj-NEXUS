import { supabase } from '@/integrations/supabase/client';
import {
  ChileautosIntegration,
  ChileautosListing,
  ChileautosVehiclePayload,
  ChileautosSyncResult,
  ChileautosBulkSyncResult,
  ChileautosProduct,
} from '@/types/chileautos';

// ==================== INTEGRATION CRUD ====================

/**
 * Obtiene la integración de ChileAutos del cliente
 */
export const getChileautosIntegration = async (
  clientId: number
): Promise<ChileautosIntegration | null> => {
  const { data, error } = await supabase
    .from('chileautos_integration')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();

  if (error) {
    console.error('Error al obtener integración de ChileAutos:', error);
    return null;
  }

  return data as ChileautosIntegration | null;
};

/**
 * Crea o actualiza la integración de ChileAutos.
 * Only seller_identifier is needed per tenant — OAuth credentials are shared.
 */
export const saveChileautosIntegration = async (
  clientId: number,
  credentials: {
    seller_identifier: string;
  },
  config?: {
    auto_sync?: boolean;
    sync_on_publish?: boolean;
    sync_on_update?: boolean;
    sync_on_sold?: boolean;
    default_products?: ChileautosProduct[];
    whatsapp_number?: string;
  }
): Promise<ChileautosIntegration | null> => {
  const existingIntegration = await getChileautosIntegration(clientId);

  if (existingIntegration) {
    const { data, error } = await supabase
      .from('chileautos_integration')
      .update({
        ...credentials,
        ...config,
        status: 'pending', // Reset status to validate credentials
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingIntegration.id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar integración de ChileAutos:', error);
      return null;
    }

    return data as ChileautosIntegration;
  } else {
    const { data, error } = await supabase
      .from('chileautos_integration')
      .insert({
        client_id: clientId,
        ...credentials,
        // Sincronización OFF por defecto: el cliente activa lo que quiera desde la pestaña
        // "Sincronización". Si viene `config` explícito, puede sobreescribir estos valores.
        auto_sync: false,
        sync_on_publish: false,
        sync_on_update: false,
        sync_on_sold: false,
        ...config,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error al crear integración de ChileAutos:', error);
      return null;
    }

    return data as ChileautosIntegration;
  }
};

/**
 * Actualiza la configuración de la integración
 */
export const updateChileautosConfig = async (
  integrationId: number,
  config: {
    auto_sync?: boolean;
    sync_on_publish?: boolean;
    sync_on_update?: boolean;
    sync_on_sold?: boolean;
    default_products?: ChileautosProduct[];
    whatsapp_number?: string;
  }
): Promise<ChileautosIntegration | null> => {
  const { data, error } = await supabase
    .from('chileautos_integration')
    .update({
      ...config,
      updated_at: new Date().toISOString(),
    })
    .eq('id', integrationId)
    .select()
    .single();

  if (error) {
    console.error('Error al actualizar configuración de ChileAutos:', error);
    return null;
  }

  return data as ChileautosIntegration;
};

/**
 * Actualiza el token de acceso de la integración
 */
export const updateChileautosToken = async (
  integrationId: number,
  accessToken: string,
  expiresAt: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('chileautos_integration')
    .update({
      access_token: accessToken,
      token_expires_at: expiresAt,
      status: 'active',
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', integrationId);

  if (error) {
    console.error('Error al actualizar token de ChileAutos:', error);
    return false;
  }

  return true;
};

/**
 * Marca la integración como error
 */
export const setChileautosError = async (
  integrationId: number,
  errorMessage: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('chileautos_integration')
    .update({
      status: 'error',
      last_error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', integrationId);

  if (error) {
    console.error('Error al actualizar estado de ChileAutos:', error);
    return false;
  }

  return true;
};

/**
 * Elimina la integración de ChileAutos
 */
export const deleteChileautosIntegration = async (
  integrationId: number
): Promise<boolean> => {
  const { error } = await supabase
    .from('chileautos_integration')
    .delete()
    .eq('id', integrationId);

  if (error) {
    console.error('Error al eliminar integración de ChileAutos:', error);
    return false;
  }

  return true;
};

// ==================== LISTINGS CRUD ====================

/**
 * Obtiene todos los listings de ChileAutos del cliente
 */
export const getChileautosListings = async (
  clientId: number
): Promise<ChileautosListing[]> => {
  const { data, error } = await supabase
    .from('chileautos_listing')
    .select(
      `
      *,
      vehicle:vehicles (
        id,
        brand:brands (name),
        model:models (name),
        year,
        price,
        main_image,
        mileage,
        license_plate
      )
    `
    )
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al obtener listings de ChileAutos:', error);
    return [];
  }

  return data as ChileautosListing[];
};

/**
 * Obtiene un listing específico por vehicle_id
 */
export const getChileautosListingByVehicle = async (
  vehicleId: number
): Promise<ChileautosListing | null> => {
  const { data, error } = await supabase
    .from('chileautos_listing')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .maybeSingle();

  if (error) {
    console.error('Error al obtener listing de ChileAutos:', error);
    return null;
  }

  return data as ChileautosListing | null;
};

/**
 * Crea un nuevo listing en la base de datos local
 */
export const createChileautosListing = async (
  clientId: number,
  integrationId: number,
  vehicleId: number,
  chileautosIdentifier: string,
  title: string,
  price: number,
  currency: 'CLP' | 'USD' = 'CLP'
): Promise<ChileautosListing | null> => {
  const { data, error } = await supabase
    .from('chileautos_listing')
    .insert({
      client_id: clientId,
      integration_id: integrationId,
      vehicle_id: vehicleId,
      chileautos_identifier: chileautosIdentifier,
      title,
      price,
      currency,
      status: 'pending',
      sale_status: 'In Stock',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error al crear listing de ChileAutos:', error);
    return null;
  }

  return data as ChileautosListing;
};

/**
 * Actualiza el estado de un listing
 */
export const updateChileautosListingStatus = async (
  listingId: number,
  status: ChileautosListing['status'],
  syncError?: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('chileautos_listing')
    .update({
      status,
      sync_error: syncError || null,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId);

  if (error) {
    console.error('Error al actualizar listing de ChileAutos:', error);
    return false;
  }

  return true;
};

/**
 * Marca un listing como vendido
 */
export const markChileautosListingAsSold = async (
  listingId: number
): Promise<boolean> => {
  const { error } = await supabase
    .from('chileautos_listing')
    .update({
      sale_status: 'Sold',
      status: 'sold',
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId);

  if (error) {
    console.error('Error al marcar listing como vendido:', error);
    return false;
  }

  return true;
};

/**
 * Elimina un listing
 */
export const deleteChileautosListing = async (
  listingId: number
): Promise<boolean> => {
  const { error } = await supabase
    .from('chileautos_listing')
    .delete()
    .eq('id', listingId);

  if (error) {
    console.error('Error al eliminar listing de ChileAutos:', error);
    return false;
  }

  return true;
};

// ==================== SYNC OPERATIONS ====================

/**
 * Publica un vehículo en ChileAutos via Edge Function
 */
export const publishToChileautos = async (
  vehicleId: number,
  clientId: number
): Promise<ChileautosSyncResult> => {
  console.log('[ChileAutos] Publishing vehicle:', vehicleId, 'with clientId:', clientId);
  try {
    const { data, error } = await supabase.functions.invoke('chileautos-sync', {
      body: {
        operation: 'create',
        vehicleId,
        clientId,
      },
    });
    console.log('[ChileAutos] Response:', { data, error });

    if (error) {
      return {
        success: false,
        operation: 'create',
        vehicleId,
        error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
      };
    }

    if (data?.error || data?.success === false) {
      return {
        success: false,
        operation: 'create',
        vehicleId,
        error: data.error || 'La operación falló',
      };
    }

    return data as ChileautosSyncResult;
  } catch (err) {
    return {
      success: false,
      operation: 'create',
      vehicleId,
      error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
    };
  }
};

/**
 * Actualiza un vehículo en ChileAutos
 */
export const updateInChileautos = async (
  vehicleId: number,
  clientId: number
): Promise<ChileautosSyncResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('chileautos-sync', {
      body: {
        operation: 'update',
        vehicleId,
        clientId,
      },
    });

    if (error) {
      return {
        success: false,
        operation: 'update',
        vehicleId,
        error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
      };
    }

    if (data?.error || data?.success === false) {
      return {
        success: false,
        operation: 'update',
        vehicleId,
        error: data.error || 'La operación falló',
      };
    }

    return data as ChileautosSyncResult;
  } catch (err) {
    return {
      success: false,
      operation: 'update',
      vehicleId,
      error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
    };
  }
};

/**
 * Elimina un vehículo de ChileAutos
 */
export const removeFromChileautos = async (
  vehicleId: number,
  clientId: number
): Promise<ChileautosSyncResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('chileautos-sync', {
      body: {
        operation: 'delete',
        vehicleId,
        clientId,
      },
    });

    if (error) {
      return {
        success: false,
        operation: 'delete',
        vehicleId,
        error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
      };
    }

    if (data?.error || data?.success === false) {
      return {
        success: false,
        operation: 'delete',
        vehicleId,
        error: data.error || 'La operación falló',
      };
    }

    return data as ChileautosSyncResult;
  } catch (err) {
    return {
      success: false,
      operation: 'delete',
      vehicleId,
      error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
    };
  }
};

/**
 * Marca un vehículo como vendido en ChileAutos
 */
export const markSoldInChileautos = async (
  vehicleId: number,
  clientId: number
): Promise<ChileautosSyncResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('chileautos-sync', {
      body: {
        operation: 'mark_sold',
        vehicleId,
        clientId,
      },
    });

    if (error) {
      return {
        success: false,
        operation: 'mark_sold',
        vehicleId,
        error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
      };
    }

    if (data?.error || data?.success === false) {
      return {
        success: false,
        operation: 'mark_sold',
        vehicleId,
        error: data.error || 'La operación falló',
      };
    }

    return data as ChileautosSyncResult;
  } catch (err) {
    return {
      success: false,
      operation: 'mark_sold',
      vehicleId,
      error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
    };
  }
};

/**
 * Sincroniza todos los vehículos publicables con ChileAutos
 */
export const bulkSyncToChileautos = async (
  clientId: number,
  vehicleIds?: number[]
): Promise<ChileautosBulkSyncResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('chileautos-sync', {
      body: {
        operation: 'bulk_sync',
        clientId,
        vehicleIds,
      },
    });

    if (error) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        results: [],
      };
    }

    if (data?.error || data?.success === false) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        results: [],
      };
    }

    return data as ChileautosBulkSyncResult;
  } catch (err) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      results: [],
    };
  }
};

// ==================== AUTH OPERATIONS ====================

/**
 * Valida las credenciales de ChileAutos y obtiene token
 */
export const validateChileautosCredentials = async (
  clientId: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('chileautos-auth', {
      body: { clientId },
    });

    if (error) {
      return { success: false, error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.' };
    }

    if (data?.error || data?.success === false) {
      return { success: false, error: data.error || 'La operación falló' };
    }

    return data as { success: boolean; error?: string };
  } catch (err) {
    return {
      success: false,
      error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
    };
  }
};

/**
 * Refresca el token de ChileAutos si está por expirar
 */
export const refreshChileautosToken = async (
  clientId: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('chileautos-auth', {
      body: { clientId, refresh: true },
    });

    if (error) {
      return { success: false, error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.' };
    }

    if (data?.error || data?.success === false) {
      return { success: false, error: data.error || 'La operación falló' };
    }

    return data as { success: boolean; error?: string };
  } catch (err) {
    return {
      success: false,
      error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
    };
  }
};

// ==================== CATALOG OPERATIONS ====================

/**
 * Obtiene las marcas disponibles del catálogo de ChileAutos
 */
export const getChileautosMakes = async (
  clientId: number
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('chileautos-sync', {
      body: {
        operation: 'get_specs',
        specType: 'makes',
        clientId,
      },
    });

    if (error) {
      return { success: false, error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.' };
    }

    if (data?.error || data?.success === false) {
      return { success: false, error: data.error || 'La operación falló' };
    }

    // API returns { success: true, data: { results: [...] } } or { success: true, data: [...] }
    return data as { success: boolean; data?: any; error?: string };
  } catch (err) {
    return {
      success: false,
      error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
    };
  }
};

/**
 * Obtiene los modelos disponibles para una marca en ChileAutos
 */
export const getChileautosModels = async (
  clientId: number,
  makeName: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('chileautos-sync', {
      body: {
        operation: 'get_specs',
        specType: 'models',
        makeName,
        clientId,
      },
    });

    if (error) {
      return { success: false, error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.' };
    }

    if (data?.error || data?.success === false) {
      return { success: false, error: data.error || 'La operación falló' };
    }

    // API returns { success: true, data: { results: [...] } } or { success: true, data: [...] }
    return data as { success: boolean; data?: any; error?: string };
  } catch (err) {
    return {
      success: false,
      error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
    };
  }
};

/**
 * Resultado de auto-publish
 */
export interface AutoPublishResult {
  success: boolean;
  results: ChileautosSyncResult[];
  needsManualSelection: {
    vehicleId: number;
    brand_name: string;
    model_name: string;
    year?: number;
    price?: number;
    mileage?: number;
    main_image?: string;
  }[];
  summary: {
    total: number;
    published: number;
    failed: number;
    needsManualSelection: number;
  };
}

/**
 * Publica vehículos en ChileAutos con auto-match de marca/modelo
 * Retorna los que se publicaron exitosamente y los que necesitan selección manual
 */
export const autoPublishToChileautos = async (
  vehicleIds: number[],
  clientId: number
): Promise<AutoPublishResult> => {
  console.log('[ChileAutos] Auto-publishing vehicles:', vehicleIds);
  try {
    const { data, error } = await supabase.functions.invoke('chileautos-sync', {
      body: {
        operation: 'auto_publish',
        vehicleIds,
        clientId,
      },
    });
    console.log('[ChileAutos] Auto-publish response:', { data, error });

    if (error) {
      return {
        success: false,
        results: [],
        needsManualSelection: [],
        summary: { total: vehicleIds.length, published: 0, failed: vehicleIds.length, needsManualSelection: 0 },
      };
    }

    if (data?.error || data?.success === false) {
      return {
        success: false,
        results: [],
        needsManualSelection: [],
        summary: { total: vehicleIds.length, published: 0, failed: vehicleIds.length, needsManualSelection: 0 },
      };
    }

    return data as AutoPublishResult;
  } catch (err) {
    console.error('[ChileAutos] Auto-publish error:', err);
    return {
      success: false,
      results: [],
      needsManualSelection: [],
      summary: { total: vehicleIds.length, published: 0, failed: vehicleIds.length, needsManualSelection: 0 },
    };
  }
};

/**
 * Publica un vehículo en ChileAutos con marca/modelo personalizados
 */
export const publishToChileautosWithOverrides = async (
  vehicleId: number,
  clientId: number,
  overrides: {
    make?: string;
    model?: string;
    title?: string;
    description?: string;
    badge?: string;
    price?: number;
  }
): Promise<ChileautosSyncResult> => {
  console.log('[ChileAutos] Publishing vehicle with overrides:', vehicleId, overrides);
  try {
    const { data, error } = await supabase.functions.invoke('chileautos-sync', {
      body: {
        operation: 'create',
        vehicleId,
        clientId,
        overrides,
      },
    });
    console.log('[ChileAutos] Response:', { data, error });

    if (error) {
      return {
        success: false,
        operation: 'create',
        vehicleId,
        error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
      };
    }

    if (data?.error || data?.success === false) {
      return {
        success: false,
        operation: 'create',
        vehicleId,
        error: data.error || 'La operación falló',
      };
    }

    return data as ChileautosSyncResult;
  } catch (err) {
    return {
      success: false,
      operation: 'create',
      vehicleId,
      error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
    };
  }
};

/**
 * Edita un aviso YA publicado en ChileAutos con campos personalizados,
 * SIN re-enviar las fotos (skipPhotos: true). Pensado para corregir
 * título, versión/badge, precio o descripción sin perder fotos/datos.
 *
 * Contrato (Parte B): la edge function 'chileautos-sync' acepta
 *   body { operation:'update', vehicleId, clientId, overrides, skipPhotos:true }
 * y con skipPhotos:true NUNCA re-envía fotos.
 */
export const updateChileautosListingWithOverrides = async (
  vehicleId: number,
  clientId: number,
  overrides: {
    title?: string;
    description?: string;
    badge?: string;
    price?: number;
  }
): Promise<ChileautosSyncResult> => {
  console.log('[ChileAutos] Updating listing with overrides:', vehicleId, overrides);
  try {
    const { data, error } = await supabase.functions.invoke('chileautos-sync', {
      body: {
        operation: 'update',
        vehicleId,
        clientId,
        overrides,
        skipPhotos: true,
      },
    });
    console.log('[ChileAutos] Response:', { data, error });

    if (error) {
      return {
        success: false,
        operation: 'update',
        vehicleId,
        error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
      };
    }

    if (data?.error || data?.success === false) {
      return {
        success: false,
        operation: 'update',
        vehicleId,
        error: data.error || 'La operación falló',
      };
    }

    return data as ChileautosSyncResult;
  } catch (err) {
    return {
      success: false,
      operation: 'update',
      vehicleId,
      error: 'No pudimos conectar con ChileAutos. Reintenta en unos momentos.',
    };
  }
};

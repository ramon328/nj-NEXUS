import { supabase } from '@/integrations/supabase/client';
import { LegalInfo } from '@/types/legalInfo';

/**
 * Get legal information for a specific dealership with fallback to client-level legal_info
 *
 * Logic:
 * 1. If dealership_id is provided, try to get legal_info for that dealership
 * 2. If not found, fallback to client-level legal_info (where dealership_id IS NULL)
 * 3. Return null if no legal_info is found
 *
 * @param clientId - The client ID
 * @param dealershipId - Optional dealership ID
 * @returns LegalInfo or null
 */
export async function getLegalInfoForDealership(
  clientId: number,
  dealershipId?: number | null
): Promise<LegalInfo | null> {
  try {
    // If dealership_id is provided, try to get dealership-specific legal_info first
    if (dealershipId) {
      const { data: dealershipLegalInfo, error: dealershipError } = await supabase
        .from('legal_info')
        .select('*')
        .eq('client_id', clientId)
        .eq('dealership_id', dealershipId)
        .maybeSingle();

      if (dealershipError) {
        console.error('Error fetching dealership legal_info:', dealershipError);
      }

      // If found dealership-specific legal_info, return it
      if (dealershipLegalInfo) {
        return dealershipLegalInfo;
      }
    }

    // Fallback: Get client-level legal_info (where dealership_id IS NULL)
    const { data: clientLegalInfo, error: clientError } = await supabase
      .from('legal_info')
      .select('*')
      .eq('client_id', clientId)
      .is('dealership_id', null)
      .maybeSingle();

    if (clientError) {
      console.error('Error fetching client legal_info:', clientError);
      return null;
    }

    return clientLegalInfo;
  } catch (error) {
    console.error('Error in getLegalInfoForDealership:', error);
    return null;
  }
}

/**
 * Get all legal_info entries for a client (both client-level and dealership-specific)
 *
 * @param clientId - The client ID
 * @returns Array of LegalInfo
 */
export async function getAllLegalInfoForClient(clientId: number): Promise<LegalInfo[]> {
  try {
    const { data, error } = await supabase
      .from('legal_info')
      .select('*')
      .eq('client_id', clientId)
      .order('dealership_id', { ascending: true, nullsFirst: true });

    if (error) {
      console.error('Error fetching all legal_info:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllLegalInfoForClient:', error);
    return [];
  }
}

/**
 * Create or update legal_info for a dealership or client
 *
 * @param legalInfo - The legal_info data
 * @returns The created/updated LegalInfo
 */
export async function upsertLegalInfo(legalInfo: Partial<LegalInfo>): Promise<LegalInfo | null> {
  try {
    const { data, error } = await supabase
      .from('legal_info')
      .upsert(legalInfo)
      .select()
      .single();

    if (error) {
      console.error('Error upserting legal_info:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in upsertLegalInfo:', error);
    throw error;
  }
}

/**
 * Delete legal_info
 *
 * @param id - The legal_info ID to delete
 */
export async function deleteLegalInfo(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('legal_info')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting legal_info:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteLegalInfo:', error);
    throw error;
  }
}

/**
 * Get legal_info for a vehicle based on its dealership
 *
 * @param vehicleId - The vehicle ID
 * @param clientId - The client ID
 * @returns LegalInfo or null
 */
export async function getLegalInfoForVehicle(
  vehicleId: number,
  clientId: number
): Promise<LegalInfo | null> {
  try {
    // First, get the vehicle's dealership_id
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('dealership_id')
      .eq('id', vehicleId)
      .single();

    if (vehicleError) {
      console.error('Error fetching vehicle for legal info:', vehicleError);
      return null;
    }

    // Get legal_info using the dealership_id (with fallback to client-level)
    return await getLegalInfoForDealership(clientId, vehicle.dealership_id);
  } catch (error) {
    console.error('Error in getLegalInfoForVehicle:', error);
    return null;
  }
}

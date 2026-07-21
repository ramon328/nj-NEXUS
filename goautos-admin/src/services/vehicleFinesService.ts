import { supabase } from '@/integrations/supabase/client';
import type { VehicleFinesData, CheckFinesResponse } from '@/types/vehicleFines';

/**
 * Consultar multas de un vehículo vía edge function (Boostr.cl API)
 */
export const checkVehicleFines = async (
  patent: string,
  vehicleId?: number,
  userId?: number
): Promise<CheckFinesResponse> => {
  const { data, error } = await supabase.functions.invoke('check-vehicle-fines', {
    body: { patent, vehicle_id: vehicleId, user_id: userId },
  });

  if (error) {
    console.error('Error checking vehicle fines:', error);
    return { success: false, error: error.message };
  }

  return data as CheckFinesResponse;
};

/**
 * Obtener último registro de multas guardado para un vehículo
 */
export const getVehicleFines = async (
  vehicleId: number
): Promise<VehicleFinesData | null> => {
  const { data, error } = await supabase
    .from('vehicle_fines')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching vehicle fines:', error);
    throw error;
  }

  return data as VehicleFinesData | null;
};

/**
 * Obtener resúmenes de multas para múltiples vehículos (para board view)
 */
export const getMultipleVehicleFinesSummaries = async (
  vehicleIds: number[]
): Promise<Map<number, { fines_count: number; has_fines: boolean }>> => {
  const summariesMap = new Map<number, { fines_count: number; has_fines: boolean }>();

  if (vehicleIds.length === 0) {
    return summariesMap;
  }

  // Las columnas desnormalizadas en vehicles ya tienen la info,
  // pero si se necesita data fresca se puede consultar vehicle_fines
  // Por ahora, el board view usa vehicle.fines_count directamente
  return summariesMap;
};

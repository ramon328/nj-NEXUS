import { supabase } from '@/integrations/supabase/client';
import { insertVehicleExtra } from './vehicleService';

export type AssumedBy = 'dealership' | 'customer' | 'consignor';

export interface VehicleExtra {
  id?: number;
  vehicle_id: number;
  title: string;
  amount: number;
  description?: string;
  type: string;
  docs_urls?: string;
  created_at?: string;
  assumed_by?: AssumedBy | null;
  /** Pass-through: dinero solo traspasado → informativo, fuera del margen. */
  is_passthrough?: boolean | null;
}

// Crear un gasto adicional en vehicles_extras
export const createVehicleExtra = async (
  extra: Omit<VehicleExtra, 'id' | 'created_at'>
) => {
  try {
    console.log('Creando vehicle extra:', extra);

    // Usar la función existente insertVehicleExtra
    const result = await insertVehicleExtra({
      vehicle_id: extra.vehicle_id,
      title: extra.title,
      description: extra.description || '',
      type: extra.type,
      docs_urls: extra.docs_urls || '',
      assumed_by: extra.assumed_by || null,
    });

    // Crear un objeto que coincida con la interfaz VehicleExtra
    const createdExtra: VehicleExtra = {
      id: result?.[0]?.id || Date.now(),
      vehicle_id: extra.vehicle_id,
      title: extra.title,
      amount: extra.amount || 0,
      description: extra.description || '',
      type: extra.type,
      docs_urls: extra.docs_urls || '',
      created_at: new Date().toISOString(),
      assumed_by: extra.assumed_by || null,
    };

    console.log('Vehicle extra creado:', createdExtra);
    return createdExtra;
  } catch (error) {
    console.error('Error en createVehicleExtra:', error);
    throw error;
  }
};

// Obtener gastos adicionales de un vehículo
export const getVehicleExtras = async (vehicleId: number, type?: string) => {
  try {
    console.log('Buscando extras para vehicle_id:', vehicleId, 'type:', type);

    // Consulta simple sin filtros complejos
    const { data, error } = await supabase
      .from('vehicles_extras')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo vehicle extras:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      // En caso de error, devolver array vacío para evitar crashes
      return [];
    }

    // Filtrar por tipo si se especifica
    let filteredData = data || [];
    if (type) {
      filteredData = filteredData.filter((extra) => extra.type === type);
    }

    console.log('Extras encontrados:', filteredData);
    return filteredData;
  } catch (error) {
    console.error('Error en getVehicleExtras:', error);
    // En caso de error, devolver array vacío para evitar crashes
    return [];
  }
};

// Eliminar un gasto adicional
export const deleteVehicleExtra = async (id: number) => {
  try {
    const { error } = await supabase
      .from('vehicles_extras')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando vehicle extra:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error en deleteVehicleExtra:', error);
    throw error;
  }
};

// Actualizar un gasto adicional
export const updateVehicleExtra = async (
  id: number,
  updates: Partial<VehicleExtra>
) => {
  try {
    const { data, error } = await supabase
      .from('vehicles_extras')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando vehicle extra:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en updateVehicleExtra:', error);
    throw error;
  }
};

import { supabase } from '@/integrations/supabase/client';

/**
 * Format date for database storage
 */
const formatDateForDatabase = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString();
};

/**
 * Create an additional for a sale
 */
export const createSaleAdditional = async (
  saleId: number,
  amount: number,
  additionalDate: Date | string,
  title: string,
  description: string | null = null,
  kind: 'income' | 'expense' = 'income',
  // Pass-through: dinero solo traspasado → informativo, fuera del margen.
  isPassthrough = false
) => {
  try {
    const formattedDate = formatDateForDatabase(additionalDate);

    // Get vehicle_id from the sale
    const { data: saleData, error: saleError } = await supabase
      .from('vehicles_sales')
      .select('vehicle_id')
      .eq('id', saleId)
      .single();

    if (saleError) throw saleError;

    const vehicleId = saleData.vehicle_id;

    const { data, error } = await supabase
      .from('vehicles_extras')
      .insert({
        vehicle_id: vehicleId,
        amount,
        title,
        description,
        type: 'sale_additional',
        // kind 'income' (cliente paga) → assumed_by 'customer'.
        // kind 'expense' (automotora absorbe) → assumed_by 'dealership'.
        assumed_by: kind === 'expense' ? 'dealership' : 'customer',
        is_passthrough: isPassthrough,
        created_at: formattedDate,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating sale additional:', error);
      throw error;
    }

    return data.id;
  } catch (error) {
    console.error('Error creating sale additional:', error);
    throw error;
  }
};

/**
 * Update an additional for a sale
 */
export const updateSaleAdditional = async (
  additionalId: number,
  amount: number,
  additionalDate: Date | string,
  title: string,
  description: string | null = null,
  kind?: 'income' | 'expense',
  // assumed_by explícito a preservar (ej. 'consignor'). Si viene, gana sobre la
  // derivación binaria desde `kind`. Sirve para que editar una venta por el wizard
  // no aplaste un valor que su toggle income/expense no puede representar.
  assumedByOverride?: 'dealership' | 'customer' | 'consignor' | null,
  // Pass-through: dinero solo traspasado → informativo, fuera del margen. Se escribe
  // siempre para que editar la venta preserve (no resetee) el flag cargado antes.
  isPassthrough?: boolean
) => {
  try {
    const formattedDate = formatDateForDatabase(additionalDate);

    const updatePayload: Record<string, unknown> = {
      amount,
      title,
      description,
      updated_at: formattedDate,
    };
    if (isPassthrough !== undefined) {
      updatePayload.is_passthrough = isPassthrough;
    }
    if (assumedByOverride) {
      updatePayload.assumed_by = assumedByOverride;
    } else if (kind) {
      updatePayload.assumed_by = kind === 'expense' ? 'dealership' : 'customer';
    }

    const { data, error } = await supabase
      .from('vehicles_extras')
      .update(updatePayload)
      .eq('id', additionalId)
      .eq('type', 'sale_additional')
      .select('*')
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating sale additional:', error);
    throw error;
  }
};

/**
 * Delete an additional for a sale
 */
export const deleteSaleAdditional = async (additionalId: number) => {
  try {
    const { error } = await supabase
      .from('vehicles_extras')
      .delete()
      .eq('id', additionalId)
      .eq('type', 'sale_additional');

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting sale additional:', error);
    throw error;
  }
};

/**
 * Get all additionals for a sale by vehicle_id
 */
export const getSaleAdditionals = async (vehicleId: number) => {
  try {
    const { data, error } = await supabase
      .from('vehicles_extras')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('type', 'sale_additional')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching sale additionals:', error);
    throw error;
  }
};

/**
 * Get all additionals for a sale by sale_id
 */
export const getSaleAdditionalsBySaleId = async (saleId: number) => {
  try {
    // First get the vehicle_id from the sale
    const { data: saleData, error: saleError } = await supabase
      .from('vehicles_sales')
      .select('vehicle_id')
      .eq('id', saleId)
      .single();

    if (saleError) throw saleError;

    // Then get the additionals for that vehicle
    return await getSaleAdditionals(saleData.vehicle_id);
  } catch (error) {
    console.error('Error fetching sale additionals by sale id:', error);
    throw error;
  }
};

/**
 * Create an additional for a sale using vehicle_id directly
 */
export const createSaleAdditionalByVehicleId = async (
  vehicleId: number,
  amount: number,
  additionalDate: Date | string,
  title: string,
  description: string | null = null,
  kind: 'income' | 'expense' = 'income',
  // Pass-through: dinero solo traspasado → informativo, fuera del margen.
  isPassthrough = false
) => {
  try {
    const formattedDate = formatDateForDatabase(additionalDate);

    const { data, error } = await supabase
      .from('vehicles_extras')
      .insert({
        vehicle_id: vehicleId,
        amount,
        title,
        description,
        type: 'sale_additional',
        assumed_by: kind === 'expense' ? 'dealership' : 'customer',
        is_passthrough: isPassthrough,
        created_at: formattedDate,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating sale additional:', error);
      throw error;
    }

    return data.id;
  } catch (error) {
    console.error('Error creating sale additional:', error);
    throw error;
  }
};

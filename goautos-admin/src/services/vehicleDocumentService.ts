import { supabase } from '@/integrations/supabase/client';

/**
 * Creates a vehicle document record
 */
export const createVehicleDocument = async (
  vehicleId: number,
  documentType: string,
  clientId: number,
  customerId?: number
): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('vehicles_documents')
      .insert({
        vehicle_id: vehicleId,
        type: documentType,
        client_id: clientId,
        customer_id: customerId || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating document:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error in createVehicleDocument:', error);
    return null;
  }
};

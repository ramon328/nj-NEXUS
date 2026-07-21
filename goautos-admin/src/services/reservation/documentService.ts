import { supabase } from '@/integrations/supabase/client';

/**
 * Create a document for a reservation
 */
export const createReservationDocument = async (
  vehicleId: number,
  clientId: number,
  customerId: number | null
) => {
  try {
    const { data, error } = await supabase
      .from('vehicles_documents')
      .insert({
        vehicle_id: vehicleId,
        client_id: clientId,
        customer_id: customerId,
        type: 'reservation',
        status: 'active',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating reservation document:', error);
    throw error;
  }
};

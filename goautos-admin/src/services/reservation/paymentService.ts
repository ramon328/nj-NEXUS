import { supabase } from '@/integrations/supabase/client';
import { formatDateForDatabase } from './utils';

/**
 * Create a payment for a reservation
 */
export const createReservationPayment = async (
  vehicleId: number,
  amount: number,
  paymentDate: Date | string,
  title: string,
  description: string | null = null
) => {
  try {
    console.log('Creating payment:', { vehicleId, amount, title, description });
    const formattedDate = formatDateForDatabase(paymentDate);

    // Create a payment entry as a vehicles_extras record
    const { data, error } = await supabase
      .from('vehicles_extras')
      .insert({
        vehicle_id: vehicleId,
        amount,
        title,
        description,
        type: 'reservation_payment',
        created_at: formattedDate,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      throw error;
    }

    // Update the reservation total amount
    await updateReservationAmount(vehicleId);

    return data.id;
  } catch (error) {
    console.error('Error creating reservation payment:', error);
    throw error;
  }
};

/**
 * Create an additional for a reservation
 */
export const createReservationAdditional = async (
  vehicleId: number,
  amount: number,
  additionalDate: Date | string,
  title: string,
  description: string | null = null
) => {
  try {
    console.log('Creating additional:', {
      vehicleId,
      amount,
      title,
      description,
    });
    const formattedDate = formatDateForDatabase(additionalDate);

    // Create an additional entry as a vehicles_extras record
    const { data, error } = await supabase
      .from('vehicles_extras')
      .insert({
        vehicle_id: vehicleId,
        amount,
        title,
        description,
        type: 'reservation_additional',
        created_at: formattedDate,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating additional:', error);
      throw error;
    }

    // Update the reservation total amount
    await updateReservationAmount(vehicleId);

    return data.id;
  } catch (error) {
    console.error('Error creating reservation additional:', error);
    throw error;
  }
};

/**
 * Update a payment for a reservation
 */
export const updateReservationPayment = async (
  paymentId: number,
  amount: number,
  paymentDate: Date | string,
  title: string,
  description: string | null = null
) => {
  try {
    const formattedDate = formatDateForDatabase(paymentDate);

    const { data, error } = await supabase
      .from('vehicles_extras')
      .update({
        amount,
        title,
        description,
        updated_at: formattedDate,
      })
      .eq('id', paymentId)
      .eq('type', 'reservation_payment')
      .select('*')
      .single();

    if (error) throw error;

    // Get the vehicle_id from the payment
    const vehicleId = data.vehicle_id;

    // Update the reservation total amount
    if (vehicleId) {
      await updateReservationAmount(vehicleId);
    }

    return data;
  } catch (error) {
    console.error('Error updating reservation payment:', error);
    throw error;
  }
};

/**
 * Update an additional for a reservation
 */
export const updateReservationAdditional = async (
  additionalId: number,
  amount: number,
  additionalDate: Date | string,
  title: string,
  description: string | null = null
) => {
  try {
    const formattedDate = formatDateForDatabase(additionalDate);

    const { data, error } = await supabase
      .from('vehicles_extras')
      .update({
        amount,
        title,
        description,
        updated_at: formattedDate,
      })
      .eq('id', additionalId)
      .eq('type', 'reservation_additional')
      .select('*')
      .single();

    if (error) throw error;

    // Get the vehicle_id from the additional
    const vehicleId = data.vehicle_id;

    // Update the reservation total amount
    if (vehicleId) {
      await updateReservationAmount(vehicleId);
    }

    return data;
  } catch (error) {
    console.error('Error updating reservation additional:', error);
    throw error;
  }
};

/**
 * Delete a payment for a reservation
 */
export const deleteReservationPayment = async (paymentId: number) => {
  try {
    // First get the vehicle_id from the payment
    const { data: paymentData, error: fetchError } = await supabase
      .from('vehicles_extras')
      .select('vehicle_id')
      .eq('id', paymentId)
      .single();

    if (fetchError) throw fetchError;

    const vehicleId = paymentData?.vehicle_id;

    const { error } = await supabase
      .from('vehicles_extras')
      .delete()
      .eq('id', paymentId)
      .eq('type', 'reservation_payment');

    if (error) throw error;

    // Update the reservation total amount
    if (vehicleId) {
      await updateReservationAmount(vehicleId);
    }

    return true;
  } catch (error) {
    console.error('Error deleting reservation payment:', error);
    throw error;
  }
};

/**
 * Delete an additional for a reservation
 */
export const deleteReservationAdditional = async (additionalId: number) => {
  try {
    // First get the vehicle_id from the additional
    const { data: additionalData, error: fetchError } = await supabase
      .from('vehicles_extras')
      .select('vehicle_id')
      .eq('id', additionalId)
      .single();

    if (fetchError) throw fetchError;

    const vehicleId = additionalData?.vehicle_id;

    const { error } = await supabase
      .from('vehicles_extras')
      .delete()
      .eq('id', additionalId)
      .eq('type', 'reservation_additional');

    if (error) throw error;

    // Update the reservation total amount
    if (vehicleId) {
      await updateReservationAmount(vehicleId);
    }

    return true;
  } catch (error) {
    console.error('Error deleting reservation additional:', error);
    throw error;
  }
};

/**
 * Get all payments for a reservation
 */
export const getReservationPayments = async (vehicleId: number) => {
  try {
    const { data, error } = await supabase
      .from('vehicles_extras')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('type', 'reservation_payment')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching reservation payments:', error);
    throw error;
  }
};

/**
 * Get all additionals for a reservation
 */
export const getReservationAdditionals = async (vehicleId: number) => {
  try {
    const { data, error } = await supabase
      .from('vehicles_extras')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('type', 'reservation_additional')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching reservation additionals:', error);
    throw error;
  }
};

/**
 * Calculate and update the total amount for a reservation
 */
export const updateReservationAmount = async (vehicleId: number) => {
  try {
    // Get all payments for the vehicle
    const { data: payments, error: paymentsError } = await supabase
      .from('vehicles_extras')
      .select('amount')
      .eq('vehicle_id', vehicleId)
      .eq('type', 'reservation_payment');

    if (paymentsError) throw paymentsError;

    // Get all additionals for the vehicle
    const { data: additionals, error: additionalsError } = await supabase
      .from('vehicles_extras')
      .select('amount')
      .eq('vehicle_id', vehicleId)
      .eq('type', 'reservation_additional');

    if (additionalsError) throw additionalsError;

    // Calculate total payments (what the customer has paid)
    const totalPayments =
      payments?.reduce(
        (sum, payment) => sum + (Number(payment.amount) || 0),
        0
      ) || 0;

    // Calculate total additionals (additional costs)
    const totalAdditionals =
      additionals?.reduce(
        (sum, additional) => sum + (Number(additional.amount) || 0),
        0
      ) || 0;

    console.log('Updating reservation amount:', {
      vehicleId,
      totalPayments,
      totalAdditionals,
    });

    // Update the reservation with payment amount only (additional_amount column doesn't exist yet)
    const { error: updateError } = await supabase
      .from('vehicles_reservations')
      .update({
        reservation_amount: totalPayments,
        // additional_amount: totalAdditionals, // Column doesn't exist yet
      })
      .eq('vehicle_id', vehicleId);

    if (updateError) throw updateError;

    return { totalPayments, totalAdditionals };
  } catch (error) {
    console.error('Error updating reservation amount:', error);
    throw error;
  }
};

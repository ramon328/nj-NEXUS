import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const createReservationTool = createTool({
  id: 'create_reservation',
  description:
    'Crear una reserva para un vehículo. Cambia el estado del vehículo a Reservado.',
  inputSchema: z.object({
    vehicle_id: z.number(),
    customer_id: z.number(),
    reservation_agreed_price: z.number(),
    validity_days: z.number().default(3),
    notes: z.string().optional(),
  }),
  execute: async (params: any) => {
    const input = params.context;
    const clientId = params.runtimeContext.get("clientId");

    // 1. Verify vehicle belongs to client_id, get current info
    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from('vehicles')
      .select('id, brand:brand_id(name), model:model_id(name), year, license_plate, price, status_id')
      .eq('id', input.vehicle_id)
      .eq('client_id', clientId)
      .single();

    if (vehicleError || !vehicle) {
      return JSON.stringify({ error: 'Vehículo no encontrado o no pertenece a este cliente.' });
    }

    // 2. Verify customer belongs to client_id
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id, first_name, last_name')
      .eq('id', input.customer_id)
      .eq('client_id', clientId)
      .single();

    if (customerError || !customer) {
      return JSON.stringify({ error: 'Cliente no encontrado o no pertenece a este cliente.' });
    }

    // 3. Find the "Reservado" status_id from clients_vehicles_states
    const { data: reservadoStatus } = await supabaseAdmin
      .from('clients_vehicles_states')
      .select('id, name')
      .eq('client_id', clientId)
      .ilike('name', '%reservado%')
      .single();

    if (!reservadoStatus) {
      return JSON.stringify({ error: 'No se encontró el estado "Reservado" en la configuración del cliente.' });
    }

    // 4. Insert into vehicles_reservations
    const expirationDate = new Date(Date.now() + input.validity_days * 86400000).toISOString();
    const reservationData = {
      vehicle_id: input.vehicle_id,
      customer_id: input.customer_id,
      reservation_agreed_price: input.reservation_agreed_price,
      validity_days: input.validity_days,
      notes: input.notes || null,
      client_id: clientId,
      status: 'active',
      reservation_date: new Date().toISOString(),
      expiration_date: expirationDate,
    };

    const { data: reservation, error: insertError } = await supabaseAdmin
      .from('vehicles_reservations')
      .insert(reservationData)
      .select()
      .single();

    if (insertError) {
      return JSON.stringify({ error: insertError.message });
    }

    // 5. Update vehicle status to Reservado
    const { error: updateError } = await supabaseAdmin
      .from('vehicles')
      .update({ status_id: reservadoStatus.id })
      .eq('id', input.vehicle_id)
      .eq('client_id', clientId);

    if (updateError) {
      return JSON.stringify({ error: `Reserva creada pero no se pudo actualizar estado del vehículo: ${updateError.message}` });
    }

    // 6. Return success
    return JSON.stringify({
      success: true,
      reservation_id: reservation.id,
      vehicle: `${(vehicle as any).brand?.name} ${(vehicle as any).model?.name} ${vehicle.year} (${vehicle.license_plate})`,
      customer: `${customer.first_name} ${customer.last_name}`,
      reservation_agreed_price: input.reservation_agreed_price,
      expiration_date: expirationDate,
    });
  },
});

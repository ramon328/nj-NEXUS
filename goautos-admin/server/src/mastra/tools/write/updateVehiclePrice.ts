import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const updateVehiclePriceTool = createTool({
  id: 'update_vehicle_price',
  description:
    'Actualizar el precio de un vehículo. IMPORTANTE: Usa el ID exacto del vehículo obtenido de query_vehicles (campo "id" del resultado). NO inventes IDs. Si no tienes el ID, primero consulta con query_vehicles.',
  inputSchema: z.object({
    vehicle_id: z.number(),
    new_price: z.number(),
  }),
  execute: async (params: any) => {
    const input = params.context;
    const clientId = params.runtimeContext.get("clientId");

    // First verify the vehicle belongs to this client
    const { data: vehicle, error: fetchError } = await supabaseAdmin
      .from('vehicles')
      .select('id, price, brand:brand_id(name), model:model_id(name), year, license_plate')
      .eq('id', input.vehicle_id)
      .eq('client_id', clientId)
      .single();

    if (fetchError || !vehicle) return JSON.stringify({ error: 'Vehículo no encontrado' });

    const oldPrice = vehicle.price;
    const { error: updateError } = await supabaseAdmin
      .from('vehicles')
      .update({ price: input.new_price })
      .eq('id', input.vehicle_id)
      .eq('client_id', clientId);

    if (updateError) return JSON.stringify({ error: updateError.message });

    return JSON.stringify({
      success: true,
      message: `Precio actualizado: ${(vehicle as any).brand?.name} ${(vehicle as any).model?.name} ${vehicle.year} (${vehicle.license_plate}) de $${oldPrice?.toLocaleString('es-CL')} a $${input.new_price.toLocaleString('es-CL')}`,
      vehicle_id: vehicle.id,
      old_price: oldPrice,
      new_price: input.new_price,
    });
  },
});

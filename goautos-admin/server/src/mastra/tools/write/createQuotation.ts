import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const createQuotationTool = createTool({
  id: 'create_quotation',
  description:
    'Crear una cotización para un vehículo. Requiere el vehículo, el cliente y el precio estimado.',
  inputSchema: z.object({
    vehicle_id: z.number(),
    customer_id: z.number(),
    estimated_price: z.number(),
    validity_days: z.number().default(30),
    notes: z.string().optional(),
  }),
  execute: async (params: any) => {
    const input = params.context;
    const clientId = params.runtimeContext.get("clientId");

    // 1. Verify vehicle exists and belongs to client_id
    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from('vehicles')
      .select('id, brand:brand_id(name), model:model_id(name), year, license_plate, price')
      .eq('id', input.vehicle_id)
      .eq('client_id', clientId)
      .single();

    if (vehicleError || !vehicle) {
      return JSON.stringify({ error: 'Vehículo no encontrado o no pertenece a este cliente.' });
    }

    // 2. Verify customer exists and belongs to client_id
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id, first_name, last_name')
      .eq('id', input.customer_id)
      .eq('client_id', clientId)
      .single();

    if (customerError || !customer) {
      return JSON.stringify({ error: 'Cliente no encontrado o no pertenece a este cliente.' });
    }

    // 3. Insert into vehicles_quotations
    const quotationData = {
      vehicle_id: input.vehicle_id,
      customer_id: input.customer_id,
      estimated_price: input.estimated_price,
      validity_period: input.validity_days,
      notes: input.notes || null,
      client_id: clientId,
      status: 'active',
      quotation_date: new Date().toISOString(),
    };

    const { data: quotation, error: insertError } = await supabaseAdmin
      .from('vehicles_quotations')
      .insert(quotationData)
      .select()
      .single();

    if (insertError) {
      return JSON.stringify({ error: insertError.message });
    }

    // 4. Return success
    return JSON.stringify({
      success: true,
      quotation_id: quotation.id,
      vehicle: `${(vehicle as any).brand?.name} ${(vehicle as any).model?.name} ${vehicle.year} (${vehicle.license_plate})`,
      customer: `${customer.first_name} ${customer.last_name}`,
      estimated_price: input.estimated_price,
      validity_days: input.validity_days,
    });
  },
});

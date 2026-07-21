import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const updateVehicleStatusTool = createTool({
  id: 'update_vehicle_status',
  description:
    'Cambiar el estado de un vehículo (ej: Preparación, Publicado, Revisión Mecánica, etc.)',
  inputSchema: z.object({
    vehicle_id: z.number(),
    new_status_name: z.string(),
  }),
  execute: async (params: any) => {
    const input = params.context;
    const clientId = params.runtimeContext.get("clientId");

    // 1. Verify vehicle belongs to client_id, get current status
    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from('vehicles')
      .select('id, brand:brand_id(name), model:model_id(name), year, license_plate, status_id, status:status_id(name)')
      .eq('id', input.vehicle_id)
      .eq('client_id', clientId)
      .single();

    if (vehicleError || !vehicle) {
      return JSON.stringify({ error: 'Vehículo no encontrado o no pertenece a este cliente.' });
    }

    // 2. Find new status_id from clients_vehicles_states
    const { data: newStatus } = await supabaseAdmin
      .from('clients_vehicles_states')
      .select('id, name')
      .eq('client_id', clientId)
      .ilike('name', `%${input.new_status_name}%`)
      .single();

    // 3. If not found, return error listing available statuses
    if (!newStatus) {
      const { data: availableStatuses } = await supabaseAdmin
        .from('clients_vehicles_states')
        .select('id, name')
        .eq('client_id', clientId)
        .order('name');

      const statusList = availableStatuses?.map((s: any) => s.name).join(', ') || 'ninguno';
      return JSON.stringify({
        error: `Estado "${input.new_status_name}" no encontrado. Estados disponibles: ${statusList}`,
      });
    }

    // 4. Update vehicle: set status_id, state_updated_at = now()
    const { error: updateError } = await supabaseAdmin
      .from('vehicles')
      .update({ status_id: newStatus.id, state_updated_at: new Date().toISOString() })
      .eq('id', input.vehicle_id)
      .eq('client_id', clientId);

    if (updateError) {
      return JSON.stringify({ error: updateError.message });
    }

    // 5. Return success
    const oldStatus = (vehicle as any).status?.name || 'Sin estado';
    return JSON.stringify({
      success: true,
      vehicle: `${(vehicle as any).brand?.name} ${(vehicle as any).model?.name} ${vehicle.year} (${vehicle.license_plate})`,
      old_status: oldStatus,
      new_status: newStatus.name,
    });
  },
});

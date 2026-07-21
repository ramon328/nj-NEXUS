import type { AuthUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export async function executeWriteAction(
  toolName: string,
  toolArgs: Record<string, any>,
  authUser: AuthUser
): Promise<{ success: boolean; message: string; [key: string]: any }> {
  const clientId = authUser.clientId;

  switch (toolName) {
    case 'update_vehicle_price': {
      const { vehicle_id, new_price } = toolArgs;
      const { data: vehicle } = await supabaseAdmin
        .from('vehicles')
        .select('id, price, brand:brand_id(name), model:model_id(name), year, license_plate')
        .eq('id', vehicle_id)
        .eq('client_id', clientId)
        .single();

      if (!vehicle) return { success: false, message: 'Vehículo no encontrado' };

      const { error } = await supabaseAdmin
        .from('vehicles')
        .update({ price: new_price })
        .eq('id', vehicle_id)
        .eq('client_id', clientId);

      if (error) return { success: false, message: error.message };

      return {
        success: true,
        message: `Precio actualizado: ${(vehicle as any).brand?.name} ${(vehicle as any).model?.name} ${vehicle.year} de $${vehicle.price?.toLocaleString('es-CL')} a $${new_price.toLocaleString('es-CL')}`,
      };
    }

    case 'update_lead_status': {
      const { lead_id, new_status } = toolArgs;
      const { data: lead } = await supabaseAdmin
        .from('leads')
        .select('id, status, customer:customer_id(first_name, last_name)')
        .eq('id', lead_id)
        .eq('client_id', clientId)
        .single();

      if (!lead) return { success: false, message: 'Lead no encontrado' };

      const { error } = await supabaseAdmin
        .from('leads')
        .update({ status: new_status })
        .eq('id', lead_id)
        .eq('client_id', clientId);

      if (error) return { success: false, message: error.message };

      return {
        success: true,
        message: `Lead #${lead.id} actualizado a "${new_status}"`,
      };
    }

    case 'create_quotation': {
      const { vehicle_id, customer_id, estimated_price, validity_days = 30, notes } = toolArgs;

      const { data: vehicle } = await supabaseAdmin
        .from('vehicles')
        .select('id, brand:brand_id(name), model:model_id(name), year, license_plate')
        .eq('id', vehicle_id)
        .eq('client_id', clientId)
        .single();

      if (!vehicle) return { success: false, message: 'Vehículo no encontrado' };

      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('id, first_name, last_name')
        .eq('id', customer_id)
        .eq('client_id', clientId)
        .single();

      if (!customer) return { success: false, message: 'Cliente no encontrado' };

      const { data: quotation, error } = await supabaseAdmin
        .from('vehicles_quotations')
        .insert({
          vehicle_id,
          customer_id,
          estimated_price,
          validity_period: validity_days,
          notes: notes || null,
          client_id: clientId,
          status: 'active',
          quotation_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) return { success: false, message: error.message };

      return {
        success: true,
        message: `Cotización #${quotation.id} creada para ${(vehicle as any).brand?.name} ${(vehicle as any).model?.name} ${vehicle.year} - Cliente: ${customer.first_name} ${customer.last_name} - Precio: $${estimated_price.toLocaleString('es-CL')}`,
        quotation_id: quotation.id,
      };
    }

    case 'create_reservation': {
      const { vehicle_id, customer_id, reservation_agreed_price, validity_days = 3, notes } = toolArgs;

      const { data: vehicle } = await supabaseAdmin
        .from('vehicles')
        .select('id, brand:brand_id(name), model:model_id(name), year, license_plate, status_id')
        .eq('id', vehicle_id)
        .eq('client_id', clientId)
        .single();

      if (!vehicle) return { success: false, message: 'Vehículo no encontrado' };

      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('id, first_name, last_name')
        .eq('id', customer_id)
        .eq('client_id', clientId)
        .single();

      if (!customer) return { success: false, message: 'Cliente no encontrado' };

      const { data: reservadoStatus } = await supabaseAdmin
        .from('clients_vehicles_states')
        .select('id, name')
        .eq('client_id', clientId)
        .ilike('name', '%reservado%')
        .single();

      if (!reservadoStatus) return { success: false, message: 'Estado "Reservado" no encontrado en configuración' };

      const expirationDate = new Date(Date.now() + validity_days * 86400000).toISOString();
      const { data: reservation, error } = await supabaseAdmin
        .from('vehicles_reservations')
        .insert({
          vehicle_id,
          customer_id,
          reservation_agreed_price,
          validity_days,
          notes: notes || null,
          client_id: clientId,
          status: 'active',
          reservation_date: new Date().toISOString(),
          expiration_date: expirationDate,
        })
        .select()
        .single();

      if (error) return { success: false, message: error.message };

      await supabaseAdmin
        .from('vehicles')
        .update({ status_id: reservadoStatus.id })
        .eq('id', vehicle_id)
        .eq('client_id', clientId);

      return {
        success: true,
        message: `Reserva #${reservation.id} creada para ${(vehicle as any).brand?.name} ${(vehicle as any).model?.name} ${vehicle.year} - Cliente: ${customer.first_name} ${customer.last_name} - Precio acordado: $${reservation_agreed_price.toLocaleString('es-CL')} - Vence: ${expirationDate.split('T')[0]}`,
        reservation_id: reservation.id,
      };
    }

    case 'update_vehicle_status': {
      const { vehicle_id, new_status_name } = toolArgs;

      const { data: vehicle } = await supabaseAdmin
        .from('vehicles')
        .select('id, brand:brand_id(name), model:model_id(name), year, license_plate, status:status_id(name)')
        .eq('id', vehicle_id)
        .eq('client_id', clientId)
        .single();

      if (!vehicle) return { success: false, message: 'Vehículo no encontrado' };

      const { data: newStatus } = await supabaseAdmin
        .from('clients_vehicles_states')
        .select('id, name')
        .eq('client_id', clientId)
        .ilike('name', `%${new_status_name}%`)
        .single();

      if (!newStatus) {
        const { data: availableStatuses } = await supabaseAdmin
          .from('clients_vehicles_states')
          .select('id, name')
          .eq('client_id', clientId)
          .order('name');

        const statusList = availableStatuses?.map((s: any) => s.name).join(', ') || 'ninguno';
        return { success: false, message: `Estado "${new_status_name}" no encontrado. Disponibles: ${statusList}` };
      }

      const { error } = await supabaseAdmin
        .from('vehicles')
        .update({ status_id: newStatus.id, state_updated_at: new Date().toISOString() })
        .eq('id', vehicle_id)
        .eq('client_id', clientId);

      if (error) return { success: false, message: error.message };

      const oldStatus = (vehicle as any).status?.name || 'Sin estado';
      return {
        success: true,
        message: `Estado de ${(vehicle as any).brand?.name} ${(vehicle as any).model?.name} ${vehicle.year} cambiado de "${oldStatus}" a "${newStatus.name}"`,
      };
    }

    case 'create_customer': {
      const { first_name, last_name, email, phone, rut, address } = toolArgs;

      if (email) {
        const { data: existing } = await supabaseAdmin
          .from('customers')
          .select('id, first_name, last_name')
          .eq('client_id', clientId)
          .eq('email', email)
          .single();

        if (existing) {
          return {
            success: false,
            message: `Ya existe un cliente con email ${email}: ${existing.first_name} ${existing.last_name} (ID: ${existing.id})`,
            exists: true,
            customer_id: existing.id,
          };
        }
      }

      const { data: customer, error } = await supabaseAdmin
        .from('customers')
        .insert({
          first_name,
          last_name,
          client_id: clientId,
          ...(email && { email }),
          ...(phone && { phone }),
          ...(rut && { rut }),
          ...(address && { address }),
        })
        .select()
        .single();

      if (error) return { success: false, message: error.message };

      return {
        success: true,
        message: `Cliente creado: ${customer.first_name} ${customer.last_name} (ID: ${customer.id})`,
        customer_id: customer.id,
      };
    }

    default:
      return { success: false, message: `Acción desconocida: ${toolName}` };
  }
}

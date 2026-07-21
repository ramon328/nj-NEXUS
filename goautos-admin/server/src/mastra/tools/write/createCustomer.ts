import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const createCustomerTool = createTool({
  id: 'create_customer',
  description: 'Crear un nuevo cliente en el sistema.',
  inputSchema: z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    rut: z.string().optional(),
    address: z.string().optional(),
  }),
  execute: async (params: any) => {
    const input = params.context;
    const clientId = params.runtimeContext.get("clientId");

    // 1. If email provided, check if customer already exists with that email for this client_id
    if (input.email) {
      const { data: existing } = await supabaseAdmin
        .from('customers')
        .select('id, first_name, last_name')
        .eq('client_id', clientId)
        .eq('email', input.email)
        .single();

      if (existing) {
        // 2. If exists, return info so GAIA can ask user what to do
        return JSON.stringify({
          exists: true,
          customer_id: existing.id,
          name: `${existing.first_name} ${existing.last_name}`,
          message: `Ya existe un cliente con el email ${input.email}: ${existing.first_name} ${existing.last_name} (ID: ${existing.id}).`,
        });
      }
    }

    // 3. Insert into customers
    const customerData = {
      first_name: input.first_name,
      last_name: input.last_name,
      client_id: clientId,
      ...(input.email && { email: input.email }),
      ...(input.phone && { phone: input.phone }),
      ...(input.rut && { rut: input.rut }),
      ...(input.address && { address: input.address }),
    };

    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .insert(customerData)
      .select()
      .single();

    if (error) {
      return JSON.stringify({ error: error.message });
    }

    // 4. Return success
    return JSON.stringify({
      success: true,
      customer_id: customer.id,
      name: `${customer.first_name} ${customer.last_name}`,
    });
  },
});

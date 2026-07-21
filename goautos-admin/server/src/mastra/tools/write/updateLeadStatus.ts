import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const updateLeadStatusTool = createTool({
  id: 'update_lead_status',
  description:
    'Cambiar el estado de un lead. IMPORTANTE: Siempre confirma con el usuario antes de ejecutar.',
  inputSchema: z.object({
    lead_id: z.number(),
    new_status: z.enum(['pending', 'assigned', 'completed', 'cancelled']),
  }),
  execute: async (params: any) => {
    const input = params.context;
    const clientId = params.runtimeContext.get("clientId");

    // Verify lead belongs to client
    const { data: lead, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('id, status, type, customer:customer_id(first_name, last_name)')
      .eq('id', input.lead_id)
      .eq('client_id', clientId)
      .single();

    if (fetchError || !lead) return JSON.stringify({ error: 'Lead no encontrado' });

    const oldStatus = lead.status;
    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update({ status: input.new_status })
      .eq('id', input.lead_id)
      .eq('client_id', clientId);

    if (updateError) return JSON.stringify({ error: updateError.message });

    const customerName = (lead as any).customer
      ? `${(lead as any).customer.first_name} ${(lead as any).customer.last_name}`
      : 'Sin cliente';
    return JSON.stringify({
      success: true,
      message: `Lead #${lead.id} (${customerName}) actualizado de "${oldStatus}" a "${input.new_status}"`,
      lead_id: lead.id,
      old_status: oldStatus,
      new_status: input.new_status,
    });
  },
});

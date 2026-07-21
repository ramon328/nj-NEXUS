import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const queryTeamTool = createTool({
  id: 'query_team',
  description:
    'Buscar información del equipo de trabajo: usuarios, roles, permisos y comisiones.',
  inputSchema: z.object({
    id: z.string().optional().describe('ID exacto del usuario'),
    name: z.string().optional().describe('Nombre del usuario'),
    email: z.string().optional().describe('Email del usuario'),
    role: z.string().optional().describe('Rol del usuario'),
    include_permissions: z
      .boolean()
      .optional()
      .describe('Incluir roles y permisos'),
    include_commissions: z
      .boolean()
      .optional()
      .describe('Incluir comisiones'),
    limit: z.number().default(10).describe('Límite de resultados'),
  }),
  execute: async (params: any) => {
    const input = params.context;
    const clientId = params.runtimeContext.get("clientId");

    let query = supabaseAdmin
      .from('users')
      .select('*')
      .eq('client_id', clientId);

    if (input.id) query = query.eq('id', input.id);
    if (input.name)
      query = query.or(
        `first_name.ilike.%${input.name}%,last_name.ilike.%${input.name}%`
      );
    if (input.email) query = query.ilike('email', `%${input.email}%`);
    if (input.role) query = query.ilike('role', `%${input.role}%`);

    query = query.limit(input.limit);

    const { data, error } = await query;

    if (error) return JSON.stringify({ error: error.message });

    const users = data || [];

    const result: any = { count: users.length, users };

    // Fetch roles and permissions if requested
    if (input.include_permissions) {
      const { data: roles } = await supabaseAdmin
        .from('roles')
        .select('*')
        .eq('client_id', clientId);

      const roleIds = (roles || []).map((r: any) => r.id);

      const { data: rolePermissions } = await supabaseAdmin
        .from('role_permissions')
        .select('*, permissions(name, description)')
        .in('role_id', roleIds);

      result.roles = roles;
      result.role_permissions = rolePermissions;
    }

    // Fetch commissions if requested
    if (input.include_commissions) {
      const { data: commissionTiers } = await supabaseAdmin
        .from('seller_commission_tiers')
        .select('*')
        .eq('client_id', clientId);

      const { data: commissionSplits } = await supabaseAdmin
        .from('sale_commission_splits')
        .select('*')
        .eq('client_id', clientId);

      result.commission_tiers = commissionTiers;
      result.commission_splits = commissionSplits;
    }

    return JSON.stringify(result);
  },
});

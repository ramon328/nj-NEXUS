import { Hono } from 'hono';
import type { AuthUser } from '../lib/auth';
import { supabaseAdmin } from '../lib/supabase';

const confirm = new Hono();

confirm.post('/api/confirm', async (c) => {
  const authUser = (c as any).get('authUser') as AuthUser;
  const { actionId, decision } = await c.req.json();

  if (!actionId || !decision) {
    return c.json({ error: 'actionId and decision (confirm|cancel) are required' }, 400);
  }

  const { data: action, error: fetchError } = await supabaseAdmin
    .from('ai_pending_actions')
    .select('*')
    .eq('id', actionId)
    .eq('user_auth_id', authUser.authId)
    .eq('status', 'pending')
    .single();

  if (fetchError || !action) {
    return c.json({ error: 'Action not found or already processed' }, 404);
  }

  if (decision === 'cancel') {
    await supabaseAdmin
      .from('ai_pending_actions')
      .update({ status: 'cancelled' })
      .eq('id', actionId);

    return c.json({ response: 'Acción cancelada.' });
  }

  // Execute the pending action
  try {
    const { executeWriteAction } = await import('../mastra/tools/write/executor.js');
    const result = await executeWriteAction(action.tool_name, action.tool_args, authUser);

    await supabaseAdmin
      .from('ai_pending_actions')
      .update({
        status: 'confirmed',
        executed_at: new Date().toISOString(),
        result,
      })
      .eq('id', actionId);

    return c.json({ response: result.message || 'Acción ejecutada correctamente.', result });
  } catch (err: any) {
    await supabaseAdmin
      .from('ai_pending_actions')
      .update({ status: 'cancelled', result: { error: err.message } })
      .eq('id', actionId);

    return c.json({ error: `Error al ejecutar: ${err.message}` }, 500);
  }
});

export default confirm;

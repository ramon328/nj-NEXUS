import { supabase } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/definitions.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { auth_id, new_password } = await req.json();

    if (!auth_id || !new_password) {
      throw new Error('auth_id and new_password are required');
    }

    // Update the user's password in Supabase Auth
    const { error: authError } = await supabase.auth.admin.updateUserById(
      auth_id,
      { password: new_password }
    );

    if (authError) throw authError;

    return new Response(
      JSON.stringify({
        message: 'Password changed successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

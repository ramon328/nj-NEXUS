import { supabase } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/definitions.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, auth_id } = await req.json();

    if (!auth_id) {
      throw new Error('auth_id es requerido');
    }

    // Delete from users table first (if user_id provided)
    if (user_id) {
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', user_id);

      if (dbError) {
        console.error('Error deleting user record:', dbError.message);
        // Continue to delete auth user even if db delete fails
      }
    }

    // Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(auth_id);

    if (authError) {
      throw new Error('Error eliminando usuario de Auth: ' + authError.message);
    }

    return new Response(
      JSON.stringify({ message: 'Usuario eliminado exitosamente' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

import { supabase } from '../_shared/supabase-client.ts';
import { corsHeaders } from '../_shared/definitions.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, first_name, last_name, rol, client_id, phone, role_id, role_ids } = await req.json();
    const normalizedEmail = email?.toLowerCase()?.trim();

    // Validate required fields
    if (!normalizedEmail || !password) {
      throw new Error('Email y contraseña son requeridos');
    }

    if (!first_name || !last_name) {
      throw new Error('Nombre y apellido son requeridos');
    }

    // Check if user already exists in our database first (faster check)
    const { data: existingDbUser } = await supabase
      .from('users')
      .select('id, auth_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingDbUser) {
      throw new Error('El usuario ya existe en el sistema');
    }

    // Try to create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });

    // Handle case where user already exists in Auth but not in our DB
    if (authError) {
      if (authError.message?.includes('already') || authError.message?.includes('duplicate')) {
        // Use getUserByEmail to reliably find the existing auth user
        const { data: { users: authUsers }, error: listError } = await supabase.auth.admin.listUsers();

        if (!listError) {
          const existingAuthUser = authUsers?.find(
            u => u.email?.toLowerCase() === normalizedEmail
          );

          if (existingAuthUser) {
            const insertPayload: Record<string, unknown> = {
              auth_id: existingAuthUser.id,
              email: normalizedEmail,
              first_name,
              last_name,
              rol: rol || 'admin',
              client_id: client_id || null,
              phone: phone || null,
            };
            if (role_id && role_id > 0) insertPayload.role_id = role_id;

            const { data: newUser, error: dbError } = await supabase
              .from('users')
              .insert(insertPayload)
              .select()
              .single();

            if (dbError) {
              throw new Error('Error vinculando usuario existente: ' + dbError.message);
            }

            return new Response(
              JSON.stringify({ user: newUser, message: 'Usuario vinculado exitosamente' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
          }
        }
      }

      throw new Error('Error creando usuario: ' + authError.message);
    }

    if (!authData?.user) {
      throw new Error('No se pudo crear el usuario en autenticación');
    }

    // Build insert payload, including role_id if provided
    const insertPayload: Record<string, unknown> = {
      auth_id: authData.user.id,
      email: normalizedEmail,
      first_name,
      last_name,
      rol: rol || 'admin',
      client_id: client_id || null,
      phone: phone || null,
    };
    if (role_id && role_id > 0) insertPayload.role_id = role_id;

    // Create user record in our users table
    const { data: newUser, error: dbError } = await supabase
      .from('users')
      .insert(insertPayload)
      .select()
      .single();

    if (dbError) {
      // Rollback: delete the auth user if db insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error('Error creando registro de usuario: ' + dbError.message);
    }

    // Assign multiple roles via user_roles junction table
    const effectiveRoleIds = role_ids && Array.isArray(role_ids) && role_ids.length > 0
      ? role_ids
      : (role_id && role_id > 0 ? [role_id] : []);

    if (effectiveRoleIds.length > 0 && newUser?.id) {
      const roleRows = effectiveRoleIds.map((rid: number) => ({
        user_id: newUser.id,
        role_id: rid,
      }));
      await supabase.from('user_roles').insert(roleRows);
    }

    return new Response(
      JSON.stringify({ user: newUser, message: 'Usuario creado exitosamente' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error en create_user:', error.message);
    return new Response(
      JSON.stringify({ error: error.message, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

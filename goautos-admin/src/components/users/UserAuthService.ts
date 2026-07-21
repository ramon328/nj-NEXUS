import { supabase } from '@/integrations/supabase/client';

export type UserFormData = {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  rol: string;
  client_id?: string | null;
  phone?: string;
  role_id?: number;
  role_ids?: number[];
  /**
   * Sedes (sucursales) asignadas al usuario. `undefined` = no tocar la asignación
   * (ej. tenant con 0-1 sedes, el campo ni se muestra). `[]` = limpiar todas las
   * asignaciones (el usuario pasa a ver todas). Espejo de `role_ids`.
   */
  dealership_ids?: number[];
};

export type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  rol: string;
  client_id: number | null;
  auth_id: string;
};

export const createUser = async (userData: UserFormData) => {
  const { password, ...userRecord } = userData;

  if (!password) {
    throw new Error('La contraseña es requerida para crear un nuevo usuario');
  }

  // Use the create_user edge function instead of direct Supabase calls
  const { data, error } = await supabase.functions.invoke('create_user', {
    body: {
      email: userData.email,
      password: password,
      first_name: userData.first_name,
      last_name: userData.last_name,
      rol: userData.rol,
      client_id: userData.client_id ? parseInt(userData.client_id) : null,
      phone: userData.phone,
      role_id: userData.role_id ?? null,
    },
  });

  if (error) {
    // supabase-js FunctionsHttpError exposes the raw Response on `context`.
    // Body can only be read once, and json() may fail if the body is empty or
    // already consumed, so fall back through text() and finally error.message.
    let errorMessage = '';
    const ctx: any = (error as any).context;
    if (ctx && typeof ctx.clone === 'function') {
      try {
        const body = await ctx.clone().json();
        errorMessage = body?.message || body?.error || '';
      } catch {
        try {
          errorMessage = (await ctx.clone().text())?.trim() || '';
        } catch {
          // nothing
        }
      }
    }
    if (!errorMessage) errorMessage = (error as any).message || '';
    console.error('createUser edge function error:', {
      message: (error as any).message,
      status: ctx?.status,
      url: ctx?.url,
      bodyError: errorMessage,
    });
    throw new Error(
      errorMessage ||
        'No se pudo crear el usuario. Verifica los datos e intenta de nuevo.'
    );
  }

  // Assign multiple roles via user_roles junction table
  if (userData.role_ids && userData.role_ids.length > 0 && data.user?.id) {
    await supabase.rpc('set_user_roles', {
      p_user_id: data.user.id,
      p_role_ids: userData.role_ids,
    });
  }

  // Assign dealerships (sedes) via user_dealerships junction table (espejo de set_user_roles).
  // Se llama con !== undefined (incluye []) para permitir dejar al usuario sin sedes = ve todas.
  if (userData.dealership_ids !== undefined && data.user?.id) {
    await supabase.rpc('set_user_dealerships', {
      p_user_id: data.user.id,
      p_dealership_ids: userData.dealership_ids,
    });
  }

  return data.user;
};

export const updateUser = async (
  userId: number,
  userData: UserFormData,
  authId?: string
) => {
  const { password, ...userRecord } = userData;

  // 1. Update the user record
  const { error } = await supabase
    .from('users')
    .update({
      // Removed email from update
      first_name: userData.first_name,
      last_name: userData.last_name,
      rol: userData.rol,
      client_id:
        userData.client_id && userData.client_id !== 'none'
          ? parseInt(userData.client_id)
          : null,
      phone: userData.phone,
      ...(userData.role_id ? { role_id: userData.role_id } : {}),
    })
    .eq('id', userId);

  if (error) {
    throw new Error('No se pudo actualizar el usuario. Intenta de nuevo.');
  }

  // Update multiple roles via user_roles junction table
  if (userData.role_ids && userData.role_ids.length > 0) {
    await supabase.rpc('set_user_roles', {
      p_user_id: userId,
      p_role_ids: userData.role_ids,
    });
  }

  // Update dealerships (sedes) via user_dealerships junction table (espejo de set_user_roles).
  // Se llama con !== undefined (incluye []) para permitir dejar al usuario sin sedes = ve todas.
  if (userData.dealership_ids !== undefined) {
    await supabase.rpc('set_user_dealerships', {
      p_user_id: userId,
      p_dealership_ids: userData.dealership_ids,
    });
  }

  return { success: true };
};

export const deleteUser = async (userId: number, authId?: string) => {
  if (!authId) {
    throw new Error('Auth ID is required to delete a user');
  }

  // Use the delete_user edge function
  const { data, error } = await supabase.functions.invoke('delete_user', {
    body: {
      user_id: userId,
      auth_id: authId,
    },
  });

  if (error) {
    throw new Error('No se pudo eliminar el usuario. Intenta de nuevo.');
  }

  return { success: true };
};

export const getClients = async () => {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .order('name');

  if (error) {
    throw new Error(error.message || 'Error fetching clients');
  }

  return data || [];
};

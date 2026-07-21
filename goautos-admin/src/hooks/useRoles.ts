import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Role, RoleFormData, PermissionCode, Permission } from '@/types/permissions';
import { useToast } from '@/hooks/use-toast';

export const useRoles = () => {
  const { clientId } = useAuth();
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar todos los permisos disponibles
  const fetchPermissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setPermissions(data || []);
    } catch (err) {
      console.error('Error fetching permissions:', err);
    }
  }, []);

  // Cargar roles del cliente usando función RPC (evita recursión RLS)
  const fetchRoles = useCallback(async () => {
    if (!clientId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: rolesJson, error: rolesError } = await supabase
        .rpc('get_client_roles', { p_client_id: clientId });

      if (rolesError) throw rolesError;

      const formattedRoles: Role[] = (rolesJson || []).map((role: any) => ({
        id: role.id,
        client_id: role.client_id,
        name: role.name,
        description: role.description,
        is_system_role: role.is_system_role,
        parent_role_id: role.parent_role_id || null,
        permissions: (role.permissions || []) as PermissionCode[],
        created_at: role.created_at,
        updated_at: role.updated_at,
      }));

      setRoles(formattedRoles);
    } catch (err: any) {
      console.error('Error fetching roles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // Crear un nuevo rol (via RPC atómico)
  const createRole = useCallback(
    async (data: RoleFormData): Promise<Role | null> => {
      if (!clientId) return null;

      setLoading(true);
      setError(null);

      try {
        const { data: roleJson, error: rpcError } = await supabase
          .rpc('create_role_with_permissions', {
            p_client_id: clientId,
            p_name: data.name,
            p_description: data.description || null,
            p_permission_codes: data.permissions,
            p_parent_role_id: data.parent_role_id || null,
          });

        if (rpcError) throw rpcError;

        const newRole: Role = {
          id: roleJson.id,
          client_id: roleJson.client_id,
          name: roleJson.name,
          description: roleJson.description,
          is_system_role: roleJson.is_system_role,
          parent_role_id: roleJson.parent_role_id || null,
          permissions: (roleJson.permissions || []) as PermissionCode[],
          created_at: roleJson.created_at,
          updated_at: roleJson.updated_at,
        };

        toast({
          title: 'Rol creado',
          description: `El rol "${data.name}" ha sido creado exitosamente.`,
        });

        await fetchRoles();
        return newRole;
      } catch (err: any) {
        console.error('Error creating role:', err);
        setError(err.message);
        toast({
          title: 'Error',
          description: 'No se pudo crear el rol. ' + err.message,
          variant: 'destructive',
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [clientId, fetchRoles, toast]
  );

  // Actualizar un rol existente (via RPC atómico)
  const updateRole = useCallback(
    async (roleId: number, data: RoleFormData): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const { error: rpcError } = await supabase
          .rpc('update_role_permissions', {
            p_role_id: roleId,
            p_name: data.name,
            p_description: data.description || null,
            p_permission_codes: data.permissions,
          });

        if (rpcError) throw rpcError;

        toast({
          title: 'Rol actualizado',
          description: `El rol "${data.name}" ha sido actualizado exitosamente.`,
        });

        await fetchRoles();
        return true;
      } catch (err: any) {
        console.error('Error updating role:', err);
        setError(err.message);
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el rol. ' + err.message,
          variant: 'destructive',
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchRoles, toast]
  );

  // Eliminar un rol
  const deleteRole = useCallback(
    async (roleId: number): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        // Verificar que no sea un rol del sistema
        const role = roles.find((r) => r.id === roleId);
        if (role?.is_system_role) {
          throw new Error('No se pueden eliminar roles del sistema');
        }

        // Verificar que no haya usuarios con este rol
        const { data: usersWithRole, error: usersError } = await supabase
          .from('users')
          .select('id')
          .eq('role_id', roleId)
          .limit(1);

        if (usersError) throw usersError;

        if (usersWithRole && usersWithRole.length > 0) {
          throw new Error(
            'No se puede eliminar el rol porque hay usuarios asignados a él'
          );
        }

        // Eliminar el rol (las relaciones se eliminan por CASCADE)
        const { error: deleteError } = await supabase
          .from('roles')
          .delete()
          .eq('id', roleId);

        if (deleteError) throw deleteError;

        toast({
          title: 'Rol eliminado',
          description: 'El rol ha sido eliminado exitosamente.',
        });

        await fetchRoles();
        return true;
      } catch (err: any) {
        console.error('Error deleting role:', err);
        setError(err.message);
        toast({
          title: 'Error',
          description: 'No se pudo eliminar el rol. ' + err.message,
          variant: 'destructive',
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [roles, fetchRoles, toast]
  );

  // Cargar datos iniciales
  useEffect(() => {
    fetchPermissions();
    fetchRoles();
  }, [fetchPermissions, fetchRoles]);

  return {
    roles,
    permissions,
    loading,
    error,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
  };
};

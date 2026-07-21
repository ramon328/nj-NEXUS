import { supabase } from '@/integrations/supabase/client';
import { User as UserType } from '@/types/user';
import { PermissionCode, Role, getLegacyRolePermissions } from '@/types/permissions';

export const useUserProfile = (
  setUserRole: (role: string) => void,
  setClientId: (id: number) => void,
  setClient: (client: any) => void,
  setIsLoading: (loading: boolean) => void,
  setUserData: (userData: UserType) => void,
  setUserPermissions?: (permissions: PermissionCode[]) => void,
  setUserRoleData?: (roleData: Role | null) => void,
  setUserRoles?: (roles: Role[]) => void
) => {
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: userProfileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        setUserRole('admin');
        setIsLoading(false);
        setUserData(null);
        setUserPermissions?.([]);
        setUserRoleData?.(null);
        return;
      }

      if (userProfileData) {
        setUserRole(userProfileData.rol || 'admin');
        setClientId(userProfileData.client_id || 0);
        setUserData(userProfileData);

        // Cargar permisos — intentar multi-roles primero, fallback a single role_id
        const multiRolesLoaded = await fetchMultiRoles(userProfileData.id);

        if (!multiRolesLoaded) {
          // Fallback: single role_id
          if (userProfileData.role_id) {
            await fetchRolePermissions(userProfileData.role_id);
          } else if (userProfileData.client_id && userProfileData.rol) {
            const matchedRole = await findRoleByName(userProfileData.client_id, userProfileData.rol);
            if (matchedRole) {
              await fetchRolePermissions(matchedRole);
            } else {
              const legacyPermissions = getLegacyRolePermissions(userProfileData.rol || 'admin');
              setUserPermissions?.(legacyPermissions);
              setUserRoleData?.(null);
              setUserRoles?.([]);
            }
          } else {
            const legacyPermissions = getLegacyRolePermissions(userProfileData.rol || 'admin');
            setUserPermissions?.(legacyPermissions);
            setUserRoleData?.(null);
            setUserRoles?.([]);
          }
        }

        if (userProfileData.client_id) {
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('*, legal_info(*), logo')
            .eq('id', userProfileData.client_id)
            .single();

          // No tragar el error en silencio: si la carga del client falla, la lógica
          // de visibilidad de leads (que depende de client) podría abrir de más.
          if (clientError) {
            console.error('Error fetching client profile:', clientError);
          }
          if (clientData) {
            setClient(clientData);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setUserRole('admin');
      setUserPermissions?.([]);
      setUserRoleData?.(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Load all roles for user from user_roles junction table
  const fetchMultiRoles = async (userId: number): Promise<boolean> => {
    try {
      const { data: rolesJson, error } = await supabase
        .rpc('get_user_roles_with_permissions', { p_user_id: userId });

      if (error || !rolesJson || (Array.isArray(rolesJson) && rolesJson.length === 0)) {
        return false;
      }

      const roles: Role[] = (Array.isArray(rolesJson) ? rolesJson : []).map((r: any) => ({
        id: r.id,
        client_id: r.client_id,
        name: r.name,
        description: r.description,
        is_system_role: r.is_system_role,
        parent_role_id: r.parent_role_id || null,
        permissions: (r.permissions || []) as PermissionCode[],
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));

      // Merge permissions from all roles (union)
      const allPermissions = [...new Set(roles.flatMap((r) => r.permissions))];

      setUserRoles?.(roles);
      setUserRoleData?.(roles[0] || null); // backward compat: first role
      setUserPermissions?.(allPermissions);
      return true;
    } catch (error) {
      console.error('Error fetching multi-roles:', error);
      return false;
    }
  };

  // Buscar un rol personalizado por nombre para un client
  // Mapea nombres legacy ('seller'/'vendedor') a nombres de roles del sistema
  const findRoleByName = async (clientId: number, rolName: string): Promise<number | null> => {
    try {
      // Mapear nombres legacy a posibles nombres en la tabla roles
      const namesToSearch: string[] = [];
      const lower = rolName.toLowerCase();
      if (lower === 'seller' || lower === 'vendedor') {
        namesToSearch.push('Vendedor', 'vendedor', 'Seller', 'seller');
      } else if (lower === 'admin') {
        namesToSearch.push('Administrador', 'administrador', 'Admin', 'admin');
      } else {
        namesToSearch.push(rolName);
      }

      const { data, error } = await supabase
        .from('roles')
        .select('id')
        .eq('client_id', clientId)
        .in('name', namesToSearch)
        .limit(1)
        .single();

      if (error || !data) return null;
      return data.id;
    } catch {
      return null;
    }
  };

  const fetchRolePermissions = async (roleId: number) => {
    try {
      // Usar función RPC con SECURITY DEFINER para evitar recursión RLS
      const { data: roleJson, error: roleError } = await supabase
        .rpc('get_role_with_permissions', { p_role_id: roleId });

      if (roleError) {
        console.error('Error fetching role:', roleError);
        // Fallback: si falla la carga del rol, no dejar al usuario sin permisos.
        // No setear userRoleData para que usePermissions use los permisos legacy.
        setUserRoleData?.(null);
        return;
      }

      if (roleJson) {
        const permissions: PermissionCode[] = (roleJson.permissions || []) as PermissionCode[];

        const role: Role = {
          id: roleJson.id,
          client_id: roleJson.client_id,
          name: roleJson.name,
          description: roleJson.description,
          is_system_role: roleJson.is_system_role,
          permissions,
          created_at: roleJson.created_at,
          updated_at: roleJson.updated_at,
        };

        setUserPermissions?.(permissions);
        setUserRoleData?.(role);
      }
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      // Fallback: no dejar al usuario sin permisos si falla la carga del rol.
      // Al poner userRoleData en null, usePermissions usará los permisos legacy del campo 'rol'.
      setUserRoleData?.(null);
    }
  };

  return { fetchUserProfile };
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { useCommissions } from './useCommissions';
import posthog from '@/utils/posthog';

export const useUsers = (
  userRole?: string | null,
  clientIdParam?: string | null
) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { clientId: authClientId, userId } = useAuth();
  const { fetchCommissionTiers } = useCommissions();

  // Use provided clientId or fallback to the one from auth context
  const clientId = clientIdParam || authClientId?.toString();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('fetching users');
      // Convert clientId to number if it's not null
      const numericClientId = clientId ? parseInt(clientId) : null;

      const { data: fetchedUsers, error } = await supabase
        .from('users')
        .select('*, client:clients(name)')
        .eq('client_id', numericClientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los usuarios',
          variant: 'destructive',
        });
        return;
      }

      if (fetchedUsers) {
        // Load user_roles for all users in one query
        const userIds = fetchedUsers.map((u) => u.id);
        const { data: userRolesData } = await supabase
          .from('user_roles')
          .select('user_id, role_id')
          .in('user_id', userIds);

        const userRolesMap: Record<number, number[]> = {};
        (userRolesData || []).forEach((ur: any) => {
          if (!userRolesMap[ur.user_id]) userRolesMap[ur.user_id] = [];
          userRolesMap[ur.user_id].push(ur.role_id);
        });

        // Load user_dealerships (sedes) for all users in one query. Si la tabla no
        // existe (migracion sin aplicar) o falla, el mapa queda vacio => sin badge
        // de sede => comportamiento actual. Retrocompatible.
        const { data: userDealershipsData } = await supabase
          .from('user_dealerships')
          .select('user_id, dealership_id')
          .in('user_id', userIds);

        const userDealershipsMap: Record<number, number[]> = {};
        (userDealershipsData || []).forEach((ud: any) => {
          if (!userDealershipsMap[ud.user_id]) userDealershipsMap[ud.user_id] = [];
          userDealershipsMap[ud.user_id].push(ud.dealership_id);
        });

        // Enhance users with role_ids and commission status
        // Check commissions for ALL users (any user can have commissions with multi-roles)
        const usersWithCommissionStatus = await Promise.all(
          fetchedUsers.map(async (user) => {
            const role_ids = userRolesMap[user.id] || (user.role_id ? [user.role_id] : []);
            const dealership_ids = userDealershipsMap[user.id] || [];
            try {
              const commissionTiers = await fetchCommissionTiers(user.id);
              return {
                ...user,
                role_ids,
                dealership_ids,
                hasAssignedCommissions:
                  commissionTiers && commissionTiers.length > 0,
              };
            } catch (commissionError) {
              return { ...user, role_ids, dealership_ids, hasAssignedCommissions: false };
            }
          })
        );
        setUsers(usersWithCommissionStatus || []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error in fetchUsers:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: number, authId: string) => {
    try {
      const { error } = await supabase.functions.invoke('delete_user', {
        body: { user_id: id, auth_id: authId },
      });

      if (error) throw new Error('No se pudo eliminar el usuario. Intenta de nuevo.');

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

    try {
      const userToDelete = users.find((user) => user.id === id);

      if (!userToDelete || !userToDelete.auth_id) {
        throw new Error(
          'No se pudo encontrar la información completa del usuario'
        );
      }

      await deleteUser(id, userToDelete.auth_id);

      posthog.capture({
        distinctId: userId || 'anonymous',
        event: 'team_member_deleted',
        properties: { deleted_user_id: id },
      });

      toast({
        title: 'Éxito',
        description: 'Usuario eliminado correctamente',
      });

      setUsers(users.filter((user) => user.id !== id));
    } catch (error) {
      console.error('Error in handleDeleteUser:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo eliminar el usuario',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [clientId]);

  return {
    users,
    loading,
    handleDeleteUser,
    fetchUsers,
  };
};

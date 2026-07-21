import React, { useEffect, useState } from 'react';
import SidebarNav from '@/components/SidebarNav';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import UserDialog from '@/components/users/UserDialog';
import UserTable from '@/components/users/UserTable';
import EmptyUsersState from '@/components/users/EmptyUsersState';
import LoadingState from '@/components/users/LoadingState';
import AccessDeniedState from '@/components/users/AccessDeniedState';
import PageHeader from '@/components/users/PageHeader';
import ChangePasswordDialog from '@/components/users/ChangePasswordDialog';
import { deleteUser, getClients } from '@/components/users/UserAuthService';
import DashboardLayout from '@/components/DashboardLayout';
import posthog from '@/utils/posthog';

type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  rol: string;
  client_id: number | null;
  auth_id: string;
  client?: {
    name: string;
  } | null;
};

type Client = {
  id: number;
  name: string;
};

const Personas = () => {
  const { userRole, userId } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] =
    useState(false);
  const [userToChangePassword, setUserToChangePassword] = useState<User | null>(
    null
  );
  const pageSize = 10;
  const { toast } = useToast();

  const fetchClients = async () => {
    try {
      if (userRole !== 'superadmin') return;

      const clientsData = await getClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes',
        variant: 'destructive',
      });
    }
  };

  const fetchUsers = async () => {
    try {
      if (userRole !== 'superadmin') return;

      let query = supabase
        .from('users')
        .select('*, client:clients(name)', { count: 'exact' });

      // Apply client filter if a specific client is selected
      if (selectedClientId !== 'all') {
        query = query.eq('client_id', parseInt(selectedClientId));
      }

      // Apply search filter
      if (debouncedSearch.trim()) {
        const term = `%${debouncedSearch.trim()}%`;
        query = query.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`);
      }

      const { data, error, count } = await query
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
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

      setUsers(data || []);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error) {
      console.error('Error in fetchUsers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
      if (searchTerm.trim()) {
        posthog.capture({
          distinctId: userId || 'anonymous',
          event: 'persona_searched',
          properties: { search_term: searchTerm.trim() },
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (userRole === 'superadmin') {
      fetchClients();
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole === 'superadmin') {
      fetchUsers();
    }
  }, [userRole, currentPage, pageSize, selectedClientId, debouncedSearch, toast]);

  const handleDeleteUser = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

    try {
      // Find the user to get the auth_id
      const userToDelete = users.find((user) => user.id === id);

      if (!userToDelete || !userToDelete.auth_id) {
        throw new Error(
          'No se pudo encontrar la información completa del usuario'
        );
      }

      await deleteUser(id, userToDelete.auth_id);

      posthog.capture({
        distinctId: userId || 'anonymous',
        event: 'persona_deleted',
        properties: { deleted_user_id: id },
      });

      toast({
        title: 'Éxito',
        description: 'Usuario eliminado correctamente',
      });

      // Refresh users list
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

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
  };

  const handleUserSaved = () => {
    fetchUsers();
    setIsDialogOpen(false);
    setSelectedUser(null);
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentPage(1); // Reset to first page when changing filter
  };

  const handleChangePassword = (user: User) => {
    setUserToChangePassword(user);
    setIsChangePasswordDialogOpen(true);
  };

  const handleCloseChangePasswordDialog = () => {
    setIsChangePasswordDialogOpen(false);
    setUserToChangePassword(null);
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingState />;
    }

    if (userRole !== 'superadmin') {
      return <AccessDeniedState />;
    }

    if (users.length === 0) {
      return <EmptyUsersState />;
    }

    return (
      <UserTable
        users={users}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onChangePassword={handleChangePassword}
      />
    );
  };

  return (
    <DashboardLayout>
      <main className='flex-1'>
        <div className='p-6 space-y-6'>
          <PageHeader
            onCreateUser={handleCreateUser}
            clients={clients}
            selectedClientId={selectedClientId}
            onClientChange={handleClientChange}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
          {renderContent()}
        </div>
      </main>

      <UserDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleUserSaved}
        user={selectedUser}
      />

      <ChangePasswordDialog
        open={isChangePasswordDialogOpen}
        onClose={handleCloseChangePasswordDialog}
        user={userToChangePassword}
      />
    </DashboardLayout>
  );
};

export default Personas;

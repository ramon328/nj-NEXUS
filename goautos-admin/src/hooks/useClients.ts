import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Client, deleteClient } from '@/components/clients/ClientService';

type Theme = {
  light?: { primary?: string; secondary?: string };
  dark?: { primary?: string; secondary?: string };
};

type ClientData = {
  id: number;
  name: string;
  domain?: string;
  favicon?: string;
  logo?: string;
  logo_dark?: string;
  theme?: any;
  seo?: any;
  contact?: any;
  location?: any;
  has_demo?: boolean;
  currency?: string;
  default_language?: string;
  created_at: string;
  is_active?: boolean;
};

export type ClientStatusFilter = 'active' | 'inactive' | 'all';

export const useClients = (
  pageSize: number = 10,
  searchTerm: string = '',
  sortBy: string = 'newest',
  fetchAll: boolean = false,
  statusFilter: ClientStatusFilter = 'active'
) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const fetchClients = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' });

      if (statusFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false);
      }

      if (searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(`name.ilike.${term},domain.ilike.${term}`);
      }

      const ascending = sortBy === 'oldest';

      if (!fetchAll) {
        query = query.range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending });

      if (error) {
        console.error('Error fetching clients:', error);

        // Determinar mensaje de error específico
        let errorMessage = 'No se pudieron cargar los clientes.';

        if (error?.message) {
          if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Error de conexión. Verifica tu internet.';
          } else if (error.message.includes('JWT') || error.message.includes('token')) {
            errorMessage = 'Tu sesión ha expirado. Por favor, recarga la página.';
          } else if (error.code === 'PGRST301' || error.message.includes('permission')) {
            errorMessage = 'No tienes permisos para ver los clientes.';
          } else {
            errorMessage = 'No pudimos cargar los clientes. Recarga la página e intenta de nuevo.';
          }
        }

        toast({
          title: 'Error al cargar',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      if (data) {
        const clientsData: Client[] = data.map((client: ClientData) => ({
          id: client.id,
          name: client.name || '',
          domain: client.domain || '',
          favicon: client.favicon || '',
          logo: client.logo || '',
          logo_dark: client.logo_dark || '',
          theme:
            client.theme ||
            ({
              light: { primary: '', secondary: '' },
              dark: { primary: '', secondary: '' },
            } as Theme),
          seo: client.seo || { title: '', description: '', keywords: [] },
          currency: client.currency || 'CLP',
          default_language: client.default_language || 'es',
          contact: client.contact || { email: '', phone: '', address: '' },
          location: client.location || { lat: '', lng: '' },
          has_demo: client.has_demo || false,
          created_at: client.created_at,
          is_active: client.is_active ?? true,
        }));

        setClients(clientsData);
        setTotalPages(Math.ceil((count || 0) / pageSize));
      }
    } catch (error) {
      console.error('Error in fetchClients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [currentPage, pageSize, searchTerm, sortBy, fetchAll, statusFilter, toast]);

  const handleDeleteClient = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente?')) return;

    try {
      await deleteClient(id);

      toast({
        title: 'Éxito',
        description: 'Cliente eliminado correctamente',
      });

      fetchClients();
    } catch (error: any) {
      console.error('Error in handleDeleteClient:', error);

      // Determinar mensaje de error específico
      let errorMessage = 'No se pudo eliminar el cliente.';

      if (error?.message) {
        if (error.message.includes('foreign key') || error.message.includes('violates')) {
          errorMessage = 'No se puede eliminar: el cliente tiene datos asociados (usuarios, vehículos, etc).';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Error de conexión. Verifica tu internet.';
        } else if (error.message.includes('JWT') || error.message.includes('token')) {
          errorMessage = 'Sesión expirada. Recarga la página.';
        } else {
          errorMessage = 'No pudimos eliminar el cliente. Intenta de nuevo y avísanos si el problema persiste.';
        }
      }

      toast({
        title: 'Error al eliminar',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return {
    clients,
    loading,
    currentPage,
    totalPages,
    setCurrentPage,
    fetchClients,
    handleDeleteClient,
  };
};

export default useClients;

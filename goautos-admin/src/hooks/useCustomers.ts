import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types/customer';
import { useToast } from '@/hooks/use-toast';

export const useCustomers = (
  clientId?: string | number | null,
  pageSize?: number,
  searchTerm?: string
) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const fetchCustomers = async () => {
    try {
      if (!clientId) return;

      setLoading(true);
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq(
          'client_id',
          typeof clientId === 'string' ? parseInt(clientId, 10) : clientId
        );

      if (searchTerm) {
        // Buscar por nombre, razón social, email o rut (case-insensitive)
        query = query.or(
          `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,rut.ilike.%${searchTerm}%`
        );
      }

      if (pageSize && !searchTerm) {
        query = query.range(
          (currentPage - 1) * pageSize,
          currentPage * pageSize - 1
        );
      }

      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching customers:', error);

        // Determinar mensaje de error específico
        let errorMessage = 'No se pudieron cargar los clientes.';

        if (error?.message) {
          if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Error de conexión. Verifica tu internet.';
          } else if (error.message.includes('JWT') || error.message.includes('token')) {
            errorMessage = 'Tu sesión ha expirado. Por favor, recarga la página.';
          } else if (error.code === 'PGRST301' || error.message.includes('permission')) {
            errorMessage = 'No tienes permisos para ver estos clientes.';
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

      setCustomers(data || []);
      setTotalCount(count || data?.length || 0);
      if (pageSize && !searchTerm) {
        setTotalPages(Math.ceil((count || 0) / pageSize));
      } else {
        setTotalPages(1);
      }
    } catch (error: any) {
      console.error('Error in fetchCustomers:', error);

      let errorMessage = 'Error inesperado al cargar clientes.';
      if (error?.message) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Error de conexión. Verifica tu internet.';
        } else {
          errorMessage = 'No pudimos cargar los clientes. Recarga la página e intenta de nuevo.';
        }
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchCustomers();
    }
  }, [clientId, currentPage, pageSize, searchTerm]);

  return {
    customers,
    loading,
    currentPage,
    totalPages,
    totalCount,
    setCurrentPage,
    isLoading: loading,
    refetchCustomers: fetchCustomers,
  };
};

export default useCustomers;

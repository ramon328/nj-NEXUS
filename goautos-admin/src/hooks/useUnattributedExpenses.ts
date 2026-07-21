import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  UnattributedExpense,
  CreateUnattributedExpenseRequest,
  UpdateUnattributedExpenseRequest,
} from '@/types/unattributedExpenses';

// Convierte un YYYY-MM-DD a un ISO timestamp al mediodía (evita que el cambio
// de huso horario empuje el gasto al día anterior/siguiente).
const dateToIso = (date?: string): string => {
  if (!date) return new Date().toISOString();
  return new Date(`${date}T12:00:00`).toISOString();
};

/**
 * CRUD de gastos puntuales del mes (no atribuibles a un auto).
 * Filtra SIEMPRE por client_id para no mezclar tenants.
 */
export const useUnattributedExpenses = () => {
  const [expenses, setExpenses] = useState<UnattributedExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { clientId } = useAuth();
  const numericClientId =
    typeof clientId === 'string' ? parseInt(clientId, 10) : clientId;

  const fetchExpenses = async () => {
    if (!numericClientId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('vehicles_extras')
        .select('id, client_id, title, description, amount, created_at')
        .eq('client_id', numericClientId)
        .is('vehicle_id', null)
        .eq('type', 'expense')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching unattributed expenses:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los gastos puntuales',
          variant: 'destructive',
        });
      } else {
        setExpenses((data || []) as UnattributedExpense[]);
      }
    } catch (error) {
      console.error('Error in fetchExpenses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createExpense = async (expense: CreateUnattributedExpenseRequest) => {
    if (!numericClientId) {
      toast({
        title: 'Error',
        description: 'Usuario no autenticado',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('vehicles_extras')
        .insert({
          client_id: numericClientId,
          vehicle_id: null,
          type: 'expense',
          assumed_by: 'dealership',
          title: expense.title,
          description: expense.description ?? '',
          amount: expense.amount,
          created_at: dateToIso(expense.expense_date),
        })
        .select('id, client_id, title, description, amount, created_at')
        .single();

      if (error) {
        console.error('Error creating unattributed expense:', error);
        toast({
          title: 'Error',
          description: 'No se pudo crear el gasto puntual',
          variant: 'destructive',
        });
        return false;
      }

      setExpenses((prev) => [data as UnattributedExpense, ...prev]);
      toast({ title: 'Éxito', description: 'Gasto puntual creado correctamente' });
      return true;
    } catch (error) {
      console.error('Error in createExpense:', error);
      return false;
    }
  };

  const updateExpense = async (
    id: number,
    updates: UpdateUnattributedExpenseRequest
  ) => {
    try {
      const payload: Record<string, unknown> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.amount !== undefined) payload.amount = updates.amount;
      if (updates.expense_date !== undefined) {
        payload.created_at = dateToIso(updates.expense_date);
      }

      const { data, error } = await supabase
        .from('vehicles_extras')
        .update(payload)
        .eq('id', id)
        .select('id, client_id, title, description, amount, created_at')
        .single();

      if (error) {
        console.error('Error updating unattributed expense:', error);
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el gasto puntual',
          variant: 'destructive',
        });
        return false;
      }

      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? (data as UnattributedExpense) : e))
      );
      toast({ title: 'Éxito', description: 'Gasto puntual actualizado' });
      return true;
    } catch (error) {
      console.error('Error in updateExpense:', error);
      return false;
    }
  };

  const deleteExpense = async (id: number) => {
    try {
      const { error } = await supabase
        .from('vehicles_extras')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting unattributed expense:', error);
        toast({
          title: 'Error',
          description: 'No se pudo eliminar el gasto puntual',
          variant: 'destructive',
        });
        return false;
      }

      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast({ title: 'Éxito', description: 'Gasto puntual eliminado' });
      return true;
    } catch (error) {
      console.error('Error in deleteExpense:', error);
      return false;
    }
  };

  const getTotalAmount = () =>
    expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericClientId]);

  return {
    expenses,
    isLoading,
    createExpense,
    updateExpense,
    deleteExpense,
    getTotalAmount,
    refetch: fetchExpenses,
  };
};

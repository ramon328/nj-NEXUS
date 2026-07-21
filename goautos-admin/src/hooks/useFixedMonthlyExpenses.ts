import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  FixedMonthlyExpense,
  CreateFixedMonthlyExpenseRequest,
  UpdateFixedMonthlyExpenseRequest,
} from '@/types/fixedMonthlyExpenses';

export const useFixedMonthlyExpenses = () => {
  const [expenses, setExpenses] = useState<FixedMonthlyExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { clientId } = useAuth();

  const fetchExpenses = async () => {
    if (!clientId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('fixed_monthly_expenses')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching fixed monthly expenses:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los gastos mensuales fijos',
          variant: 'destructive',
        });
      } else {
        setExpenses(data || []);
      }
    } catch (error) {
      console.error('Error in fetchExpenses:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al cargar los gastos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createExpense = async (expense: CreateFixedMonthlyExpenseRequest) => {
    if (!clientId) {
      toast({
        title: 'Error',
        description: 'Usuario no autenticado',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('fixed_monthly_expenses')
        .insert({
          ...expense,
          client_id: clientId,
          is_active: expense.is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating fixed monthly expense:', error);
        toast({
          title: 'Error',
          description: 'No se pudo crear el gasto mensual fijo',
          variant: 'destructive',
        });
        return false;
      }

      setExpenses((prev) => [data, ...prev]);
      toast({
        title: 'Éxito',
        description: 'Gasto mensual fijo creado correctamente',
      });
      return true;
    } catch (error) {
      console.error('Error in createExpense:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al crear el gasto',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateExpense = async (
    id: number,
    updates: UpdateFixedMonthlyExpenseRequest
  ) => {
    try {
      const { data, error } = await supabase
        .from('fixed_monthly_expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating fixed monthly expense:', error);
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el gasto mensual fijo',
          variant: 'destructive',
        });
        return false;
      }

      setExpenses((prev) =>
        prev.map((expense) => (expense.id === id ? data : expense))
      );
      toast({
        title: 'Éxito',
        description: 'Gasto mensual fijo actualizado correctamente',
      });
      return true;
    } catch (error) {
      console.error('Error in updateExpense:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al actualizar el gasto',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteExpense = async (id: number) => {
    try {
      const { error } = await supabase
        .from('fixed_monthly_expenses')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting fixed monthly expense:', error);
        toast({
          title: 'Error',
          description: 'No se pudo eliminar el gasto mensual fijo',
          variant: 'destructive',
        });
        return false;
      }

      setExpenses((prev) => prev.filter((expense) => expense.id !== id));
      toast({
        title: 'Éxito',
        description: 'Gasto mensual fijo eliminado correctamente',
      });
      return true;
    } catch (error) {
      console.error('Error in deleteExpense:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al eliminar el gasto',
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleActiveStatus = async (id: number, isActive: boolean) => {
    return updateExpense(id, { is_active: isActive });
  };

  const getActiveExpenses = () => {
    return expenses.filter((expense) => expense.is_active);
  };

  const getTotalMonthlyAmount = () => {
    return getActiveExpenses().reduce(
      (total, expense) => total + expense.amount,
      0
    );
  };

  useEffect(() => {
    fetchExpenses();
  }, [clientId]);

  return {
    expenses,
    isLoading,
    createExpense,
    updateExpense,
    deleteExpense,
    toggleActiveStatus,
    getActiveExpenses,
    getTotalMonthlyAmount,
    refetch: fetchExpenses,
  };
};

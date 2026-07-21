import { useTransactions as useTransactionsContext } from './TransactionsContext';

// Esta versión se mantiene por compatibilidad con el código existente
export const useTransactions = (vehicle: any) => {
  // Ignoramos el parámetro vehicle ya que ahora viene del contexto
  return useTransactionsContext();
};

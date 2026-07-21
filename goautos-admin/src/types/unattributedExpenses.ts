// Gastos puntuales del mes NO atribuibles a un vehículo.
// Se guardan en vehicles_extras con vehicle_id = NULL, type = 'expense'
// y client_id del tenant. El dashboard (useOperationalExpenses) los suma
// dentro del rango de fechas seleccionado.

export interface UnattributedExpense {
  id?: number;
  client_id?: number;
  title: string;
  description?: string;
  amount: number;
  /** Fecha del gasto — se persiste en la columna created_at. */
  created_at?: string;
}

export interface CreateUnattributedExpenseRequest {
  title: string;
  description?: string;
  amount: number;
  /** ISO date string (YYYY-MM-DD) elegida por el usuario; default hoy. */
  expense_date?: string;
}

export interface UpdateUnattributedExpenseRequest {
  title?: string;
  description?: string;
  amount?: number;
  expense_date?: string;
}

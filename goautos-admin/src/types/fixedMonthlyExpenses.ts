export interface FixedMonthlyExpense {
  id?: number;
  client_id?: number;
  title: string;
  description?: string;
  amount: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateFixedMonthlyExpenseRequest {
  title: string;
  description?: string;
  amount: number;
  is_active?: boolean;
}

export interface UpdateFixedMonthlyExpenseRequest {
  title?: string;
  description?: string;
  amount?: number;
  is_active?: boolean;
}


export type Financing = {
  id: number;
  vehicle_id: number;
  customer_id: number;
  downpayment: number;
  monthly_installment: number;
  payment_day: number;
  total_installments: number;
  notes?: string;
  start_date: string;
  created_at: string;
  updated_at: string;
  customer?: {
    first_name: string;
    last_name: string;
    rut: string;
  };
  vehicle?: {
    brand_id: string;
    model_id: number;
    year: number;
    license_plate: string;
  };
  payments?: FinancingPayment[];
}

export type FinancingPayment = {
  id: number;
  amount: number;
  payment_date: string | null;
  installment_number: number;
  notes: string;
  is_paid: boolean;
  due_date: string;
  interest_amount: number;
  payment_status: 'pending' | 'paid' | 'late';
  financing_id?: number;
  created_at?: string;
  updated_at?: string;
};

export type FinancingDetailType = Omit<Financing, 'payments'> & {
  payments: FinancingPayment[];
};

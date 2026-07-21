export interface Customer {
  id: number;
  /** 'person' (persona natural) | 'company' (empresa / persona jurídica). Default 'person'. */
  customer_type?: 'person' | 'company';
  first_name?: string;
  last_name?: string;
  /** Razón social — se usa cuando customer_type === 'company'. */
  company_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  rut?: string;
  address?: string;
  client_id?: number;
  created_at?: string;
  updated_at?: string;
  birth_date?: Date;
  // Banking information
  bank_name?: string;
  account_type?: 'corriente' | 'ahorro' | 'vista' | 'rut';
  account_number?: string;
  account_holder_name?: string;
  account_holder_rut?: string;
}

export type AccountType = 'corriente' | 'ahorro' | 'vista' | 'rut';

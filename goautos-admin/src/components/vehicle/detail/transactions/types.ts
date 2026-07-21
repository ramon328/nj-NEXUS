export type AssumedBy = 'dealership' | 'customer' | 'consignor';

export type VehicleTransaction = {
  id: number;
  title: string;
  description: string;
  type: string;
  amount: number;
  created_at: string;
  docs_urls?: string[] | null;
  updated_at?: string | null;
  vehicle_id?: number | null;
  category_id?: number | null;
  assumed_by?: AssumedBy | null;
  // Regla 3 (IVA por línea): si true, el gasto carga su NETO (total−IVA recuperable).
  genera_credito_fiscal?: boolean | null;
  // Pass-through: dinero solo traspasado → informativo, no afecta el margen.
  is_passthrough?: boolean | null;
};

export type TransactionFormValues = {
  title: string;
  description: string;
  type: 'expense' | 'income';
  amount: number;
  category_id?: number;
  documents?: FileList;
  assumed_by?: AssumedBy;
  genera_credito_fiscal?: boolean;
  is_passthrough?: boolean;
};

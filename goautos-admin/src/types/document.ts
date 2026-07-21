export interface Document {
  id: number;
  vehicle_id: number;
  type:
    | 'sale'
    | 'purchase'
    | 'consignment'
    | 'reservation'
    | 'close_deal'
    | 'spec_sheet'
    | 'other';
  status: 'pending' | 'completed';
  notes?: string;
  customer_id?: number;
  client_id: number;
  created_at: string;
  updated_at: string;
  terms_and_conditions?: string;
}

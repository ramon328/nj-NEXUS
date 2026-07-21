import { Vehicle } from './vehicle';

export interface MarketingEmailHistory {
  id: number;
  client_id: number;
  vehicle_id: number;
  vehicle: Vehicle;

  // Información básica del email
  subject: string;
  from_email: string;
  from_name: string;

  // Destinatarios
  customer_ids: number[];
  total_recipients: number;

  // Filtros aplicados
  filters_applied: {
    similarity?: number;
    transaction_type?: 'compra' | 'venta' | 'both';
    price_filter?: {
      min: number;
      max: number;
    } | null;
    year_filter?: {
      min: number;
      max: number;
    } | null;
    category_filter?: string | null;
    [key: string]: any;
  };

  // Timestamps
  sent_at: string;
  created_at: string;
}

export interface CreateMarketingEmailHistory {
  client_id: number;
  vehicle_id: number;
  subject: string;
  from_email: string;
  from_name: string;
  customer_ids: number[];
  total_recipients: number;
  filters_applied?: {
    similarity?: number;
    transaction_type?: 'compra' | 'venta' | 'both';
    price_filter?: {
      min: number;
      max: number;
    } | null;
    year_filter?: {
      min: number;
      max: number;
    } | null;
    category_filter?: string | null;
    [key: string]: any;
  };
}

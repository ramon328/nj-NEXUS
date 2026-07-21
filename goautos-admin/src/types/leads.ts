import { Customer } from './customer';
import { Condition, FuelType, Color, Vehicle } from './vehicle';

export enum LeadTypes {
  // Oportunidades donde la automotora COMPRA
  BUY_DIRECT = 'buy-direct',
  BUY_CONSIGNMENT = 'buy-consignment',
  SEARCH_REQUEST = 'search-request',

  // Oportunidades donde la automotora VENDE
  SELL_VEHICLE = 'sell-vehicle',
  SELL_FINANCING = 'sell-financing',
  SELL_TRANSFER = 'sell-transfer',

  // Otros
  CONTACT_GENERAL = 'contact-general',
}

export interface FinancingData {
  down_payment?: number;
  monthly_income?: number;
  employment_type?: string;
}

export interface Lead {
  id: string;
  client_id: string;
  customer_id?: string;
  customer?: Customer;
  vehicle_id?: number;
  vehicle?: Vehicle;
  brand_id?: string;
  model_id?: number;
  search_brand?: any;
  search_model?: any;
  type: LeadTypes;
  search_params: {
    max_owners: any;
    brand?: string;
    model?: string;
    year?: {
      min: number;
      max: number;
    };
    price?: {
      min: number;
      max: number;
    };
    mileage?: {
      min: number;
      max: number;
    };
    color?: Color;
    fuel_type?: FuelType;
    condition?: Condition;
    /** Formularios configurables desde el builder: respuestas como [{label,value}]. */
    custom?: boolean;
    custom_fields?: { label: string; value?: string }[];
  };
  status: 'pending' | 'assigned' | 'completed' | 'cancelled';
  notes?: string;
  vehicles?: Vehicle[];
  financing_data?: FinancingData;
  /** Vendedor dueño del lead (users.id). null = sin asignar. */
  assigned_to?: number | null;
  /** Datos del vendedor asignado (join). */
  assigned_user?: {
    id: number;
    first_name?: string;
    last_name?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

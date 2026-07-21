export interface Client {
  id: number;
  name: string;
  domain: string;
  logo: string;
}
export interface Vehicle {
  id?: number;
  client_id?: number;
  brand_id?: string;
  model_id?: number;
  year?: number;
  price?: number;
  min_price?: number;
  seller_id?: number | null;
  discount_percentage?: number;
  mileage?: number;
  features?: any;
  status_id?: number;
  is_published?: boolean;
  dealership_id?: number;
  is_consigned?: boolean;
  description?: string;
  license_plate?: string;
  category_id?: number;
  color_id?: number;
  condition_id?: number;
  fuel_type_id?: number;
  views?: number;
  main_image?: string;
  gallery?: string[];
  transmission?: string;
  video_url?: string;
  created_at?: string;
  updated_at?: string;
  owners?: number;
  purchase_price?: number;
  instagram_post_id?: string;
  engine_number?: string;
  chassis_number?: string;
  extras?: string;
  keys?: number;
  label?: string;

  // New required fields
  has_lien?: boolean;
  is_billable?: boolean;
  tech_inspection_expiry?: string;
  circulation_permit_expiry?: string;
  emissions_expiry?: string;

  // Add these fields to resolve build errors
  brand?: any;
  model?: any;
  category?: any;
  status?: any;
  seller?: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

export interface VehicleConsignment {
  id: number;
  vehicle_id: number;
  vehicle: Vehicle;
  customer_id: number;
  customer: Customer;
  agreed_price: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  created_at: string;
}

export interface FuelType {
  id: number;
  name: string;
  created_at: string;
}

export interface Condition {
  id: number;
  name: string;
  created_at: string;
}

export interface Color {
  id: number;
  name: string;
  hex: string;
  created_at: string;
}

export interface ClientVehicleStatus {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  color?: string;
  order: number;
  created_at: string;
  is_disabled: boolean;
}

export interface Customer {
  id: number;
  email: string;
  phone: string;
  client_id: number;
  rut: string;
  address: string;
  birth_date: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
}

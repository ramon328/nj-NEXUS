export type VehicleType = 'car' | 'truck' | 'machinery' | 'nautical';

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Auto',
  truck: 'Camión',
  machinery: 'Maquinaria',
  nautical: 'Náutico',
};

export const VEHICLE_TYPE_ICONS: Record<VehicleType, string> = {
  car: '🚗',
  truck: '🚛',
  machinery: '⚙️',
  nautical: '🚤',
};

// Fields that should be hidden for each vehicle type
export const VEHICLE_TYPE_HIDDEN_FIELDS: Record<VehicleType, string[]> = {
  car: [],
  truck: [],
  machinery: [
    'license_plate', 'transmission', 'owners', 'keys',
    'tech_inspection_expiry', 'circulation_permit_expiry',
    'emissions_expiry', 'municipality_permit_expiry',
  ],
  nautical: [
    'license_plate', 'transmission', 'owners', 'keys',
    'tech_inspection_expiry', 'circulation_permit_expiry',
    'emissions_expiry', 'municipality_permit_expiry',
  ],
};

// Label overrides per vehicle type
export const VEHICLE_TYPE_LABEL_OVERRIDES: Record<VehicleType, Record<string, string>> = {
  car: {},
  truck: {},
  machinery: {
    mileage: 'Horas de uso',
    engine_number: 'N° de serie',
    chassis_number: 'N° de chasis/bastidor',
  },
  nautical: {
    mileage: 'Horas de motor',
    engine_number: 'N° de casco',
    chassis_number: 'N° de serie motor',
  },
};

// Categories to show per vehicle type (by lowercase name).
// Categories NOT listed in any type-specific list are shown for ALL types.
export const VEHICLE_TYPE_CATEGORIES: Record<VehicleType, string[]> = {
  car: [
    'city car', 'sedán', 'hatchback', 'suv', 'furgón', 'van', 'minivan',
    'camioneta', 'pickup', 'station wagon', 'crossover', 'coupé', 'coupe', 'convertible',
    'deportivo', 'automóvil', 'limusina', 'buggy', 'motorhome', 'moto',
    'ambulancia', 'cuatriciclo', 'triciclo', 'kart', 'clásico', 'otro',
  ],
  truck: [
    'camión', 'camión rígido', 'tractocamión', 'camión tolva', 'camión pluma',
    'camión cisterna', 'camión frigorífico', 'camión plataforma',
    'camión portacontenedores', 'cabezal', 'bus', 'minibús', 'micro bus',
  ],
  machinery: [
    'maquinaria', 'excavadora', 'retroexcavadora', 'cargador frontal', 'bulldozer',
    'motoniveladora', 'rodillo compactador', 'minicargador', 'mini excavadora',
    'grúa', 'manipulador telescópico', 'tractor agrícola', 'cosechadora',
    'camión articulado', 'generador', 'compresor', 'montacargas',
    'plataforma elevadora',
  ],
  nautical: [
    'lancha', 'lancha de pesca', 'moto de agua', 'velero', 'yate', 'bote',
    'bote inflable', 'semirrígido', 'pontón', 'crucero', 'catamarán', 'kayak',
    'motor fuera de borda', 'jet ski',
  ],
};

export interface Vehicle {
  id?: number;
  client_id?: number;
  vehicle_type?: VehicleType;
  brand_id?: string;
  brand_name?: string;
  model_id?: number;
  model_name?: string;
  version_id?: number | null;
  version_name?: string | null;
  year?: number;
  price?: number;
  label?: string;
  label_color?: string;
  min_price?: number;
  seller_id?: number | null;
  discount_percentage?: number;
  mileage?: number;
  features?: any;
  status_id?: number;
  is_published?: boolean;
  dealership_id?: number;
  stock_type?: 'online' | 'dealership';
  is_consigned?: boolean;
  is_online_consignment?: boolean;
  // Régimen de IVA por vehículo (R2): true=exento, false=afecto, null=hereda cliente.
  iva_exento?: boolean | null;
  description?: string;
  license_plate?: string;
  category_id?: number;
  color_id?: number;
  color?: Color;
  condition_id?: number;
  condition?: Condition;
  fuel_type_id?: number;
  fuel_type?: FuelType;
  views?: number;
  main_image?: string;
  gallery?: string[];
  transmission?: string;
  traction?: string;
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
  state_updated_at?: string;
  transfer_value?: number;

  // Fines (denormalized for board view)
  fines_count?: number | null;
  fines_last_checked?: string | null;

  // New required fields
  has_lien?: boolean;
  is_billable?: boolean;
  tech_inspection_expiry?: string;
  circulation_permit_expiry?: string;
  emissions_expiry?: string;
  municipality_permit_expiry?: string;
  permit_municipality?: string;

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
  show_in_web?: boolean;
}

export interface VehicleStatusHistory {
  id: number;
  vehicle_id: number;
  old_status_id: number | null;
  new_status_id: number;
  changed_by: number;
  changed_at: string;
  // Relations
  old_status?: {
    id: number;
    name: string;
    color?: string;
  };
  new_status?: {
    id: number;
    name: string;
    color?: string;
  };
  user?: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

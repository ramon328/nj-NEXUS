// ChileAutos Integration Types

export type ChileautosIntegrationStatus = 'pending' | 'active' | 'error' | 'disconnected';
export type ChileautosListingStatus = 'pending' | 'published' | 'sold' | 'withdrawn' | 'error';
export type ChileautosVehicleType = 'Car' | 'Bike' | 'Truck';
export type ChileautosRecordType = 'Autos, camionetas y 4x4' | 'Motos' | 'Camiones';
export type ChileautosListingType = 'Nuevo' | 'Usado';
export type ChileautosSaleStatus = 'In Stock' | 'Sold' | 'Withdrawn';
export type ChileautosProduct = 'premium' | 'topspot' | 'showcase' | 'certificado';

// Integration configuration per tenant
// Each tenant provides their own ChileAutos API credentials
export interface ChileautosIntegration {
  id: number;
  client_id: number;

  // ChileAutos OAuth2 Credentials (DEPRECATED: now shared via env vars)
  ca_client_id?: string | null;
  ca_client_secret?: string | null;
  seller_identifier: string; // GUID from ChileAutos - tenant's seller account

  // OAuth2 Token (auto-renewed)
  access_token: string | null;
  token_expires_at: string | null;

  // Configuration
  auto_sync: boolean;
  sync_on_publish: boolean;
  sync_on_update: boolean;
  sync_on_sold: boolean;
  default_products: ChileautosProduct[];
  whatsapp_number: string | null;

  // Status
  status: ChileautosIntegrationStatus;
  last_sync_at: string | null;
  last_error: string | null;
  vehicles_published: number;

  // Metadata
  created_at: string;
  updated_at: string | null;
}

// Individual vehicle listing on ChileAutos
export interface ChileautosListing {
  id: number;
  client_id: number;
  vehicle_id: number;
  integration_id: number;

  // ChileAutos Identifier
  chileautos_identifier: string; // UUID for the listing

  // Listing Data (cached)
  title: string | null;
  price: number | null;
  currency: 'CLP' | 'USD';

  // Status
  status: ChileautosListingStatus;
  sale_status: ChileautosSaleStatus;
  active_products: ChileautosProduct[];

  // ChileAutos URL
  ca_listing_url?: string | null;

  // Sync Information
  last_synced_at: string | null;
  sync_error: string | null;

  // Metadata
  created_at: string;
  updated_at: string | null;

  // Relations (populated by join)
  vehicle?: {
    id: number;
    brand: { name: string } | null;
    model: { name: string } | null;
    year: number | null;
    price: number | null;
    main_image: string | null;
    mileage: number | null;
    patent: string | null;
    license_plate: string | null;
  };
}

// ChileAutos API Request/Response Types

export interface ChileautosAuthRequest {
  client_id: string;
  client_secret: string;
  grant_type: 'client_credentials';
}

export interface ChileautosAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ChileautosVehiclePayload {
  Identifier: string;
  Type: ChileautosVehicleType;
  ListingType: ChileautosListingType;
  PublishingDestinations: { Name: 'ChileAutos' }[];
  Seller: {
    Identifier: string;
  };
  Specification: {
    RecordType: ChileautosRecordType;
    Make: string;
    Model: string;
    ReleaseDate: {
      Year: number;
    };
    Variant?: string;
    Badge?: string;
  };
  Registration: {
    Number: string; // Patent in format XXXX00
  };
  PriceList: {
    Currency: 'CLP' | 'USD';
    Amount: number;
  }[];
  OdometerReadings?: {
    Value: number;
    UnitOfMeasure: 'KM';
  }[];
  Media?: {
    Photos?: {
      Url: string;
      Order: number;
    }[];
    Videos?: {
      Url: string;
    }[];
  };
  Colours?: {
    Exterior?: {
      Generic: string;
      Localised: string;
    };
    Interior?: {
      Generic: string;
      Localised: string;
    };
  };
  Attributes?: {
    Name: string;
    Value: string;
  }[];
  ExtendedProperties?: {
    Name: string;
    Value: string;
  }[];
  SaleStatus?: ChileautosSaleStatus;
  Tags?: string[]; // Products: 'premium', 'topspot', etc.
  Comments?: string; // Description
}

export interface ChileautosApiError {
  error: string;
  error_description?: string;
  message?: string;
  statusCode?: number;
}

// Catalog/Specification Types from ChileAutos API
export interface ChileautosMake {
  Id: string;
  Name: string;
}

export interface ChileautosModel {
  Id: string;
  Name: string;
  MakeId: string;
}

export interface ChileautosBodyType {
  Id: string;
  Name: string;
}

export interface ChileautosFuelType {
  Id: string;
  Name: string;
}

export interface ChileautosGearType {
  Id: string;
  Name: string;
}

export interface ChileautosColour {
  Generic: string;
  Localised: string;
}

// Mapping helpers
export interface ChileautosFieldMapping {
  goautosField: string;
  chileautosField: string;
  transform?: (value: any) => any;
}

// Webhook/Lead types (stored in chileautos_leads table)
export type ChileautosLeadSourceType = 'chileautos' | 'chileautos-whatsapp' | 'chileautos-callconnect';

export interface ChileautosLeadRecord {
  id: number;
  client_id: number;
  integration_id: number;
  lead_id: number | null;
  chileautos_lead_identifier: string;
  prospect_identifier: string | null;
  prospect_name: string | null;
  prospect_email: string | null;
  prospect_phone: string | null;
  source_type: ChileautosLeadSourceType;
  vehicle_identifier: string | null;
  vehicle_title: string | null;
  chileautos_url: string | null;
  raw_payload: any;
  created_at: string;
}

// UI Types
export interface VehicleForChileautos {
  id: number;
  brand_name: string | null;
  model_name: string | null;
  year: number | null;
  price: number | null;
  mileage: number | null;
  main_image: string | null;
  patent: string | null;
  transmission: string | null;
  fuel_type: string | null;
  condition: string | null;
  isPublished?: boolean;
  listingStatus?: ChileautosListingStatus;
  chileautosIdentifier?: string;
}

// Sync operation types
export type ChileautosSyncOperation = 'create' | 'update' | 'delete' | 'mark_sold';

export interface ChileautosSyncResult {
  success: boolean;
  operation: ChileautosSyncOperation;
  vehicleId: number;
  chileautosIdentifier?: string;
  error?: string;
}

export interface ChileautosBulkSyncResult {
  total: number;
  successful: number;
  failed: number;
  /** Avisos saltados a propósito (p.ej. vendidos/reservados, que NO se re-publican). */
  skipped?: number;
  results: ChileautosSyncResult[];
}

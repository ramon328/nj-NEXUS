// Facebook Marketplace Integration Types

export type FbMarketplaceCTA = 'LEARN_MORE' | 'WHATSAPP' | 'MESSENGER';
export type FbMarketplaceStatus = 'active' | 'expired' | 'disconnected';
export type FbMarketplacePostStatus = 'pending' | 'active' | 'paused' | 'deleted' | 'rejected' | 'expired' | 'out_of_stock';
export type FbMarketplaceAvailability = 'available' | 'out_of_stock' | 'discontinued' | 'pending';

export interface FbMarketplaceIntegration {
  id: number;
  client_id: number;

  // Facebook Business Account Data
  fb_business_id: string | null;
  fb_business_name: string | null;
  fb_page_id: string | null;
  fb_page_name: string | null;

  // Catalog Information
  catalog_id: string | null;
  catalog_name: string | null;

  // OAuth Tokens
  access_token: string;
  token_type: string;
  expires_at: string | null;

  // User Info
  fb_user_id: string | null;
  fb_user_name: string | null;
  email: string | null;

  // Configuration
  default_cta: FbMarketplaceCTA;
  whatsapp_number: string | null;
  landing_url: string | null;

  // Status
  status: FbMarketplaceStatus;
  created_at: string;
  updated_at: string | null;
}

export interface FbMarketplacePost {
  id: number;
  vehicle_id: number;
  integration_id: number;
  client_id: number;

  // Facebook Product/Item IDs
  fb_product_id: string;
  fb_catalog_item_id: string | null;
  fb_retailer_id: string | null;

  // Publication Data
  title: string | null;
  price: number | null;
  currency: string;

  // Status
  status: FbMarketplacePostStatus;
  availability: FbMarketplaceAvailability;

  // URLs
  url_landing: string | null;
  fb_product_url: string | null;

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
  };
}

// Facebook API Response Types
export interface FbBusinessAccount {
  id: string;
  name: string;
  created_time?: string;
}

export interface FbCatalog {
  id: string;
  name: string;
  vertical: string;
}

export interface FbProductData {
  retailer_id: string;
  availability: 'in stock' | 'out of stock' | 'discontinued';
  condition: 'new' | 'used' | 'refurbished';
  description: string;
  image_url: string;
  additional_image_urls?: string;
  price: string;
  sale_price?: string;

  // Vehicle-specific fields
  make: string;
  model: string;
  year: number;
  mileage: {
    value: number;
    unit: 'KM' | 'MI';
  };
  vin?: string;
  body_style?: string;
  drivetrain?: string;
  exterior_color?: string;
  fuel_type?: string;
  transmission?: string;
  state_of_vehicle?: 'NEW' | 'USED';

  // Listing info
  title: string;
  url: string;

  // Location
  address?: {
    addr1: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
  };
  latitude?: number;
  longitude?: number;
}

export interface FbUserInfo {
  id: string;
  name: string;
  email?: string;
}

export interface FbOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface FbApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

// UI Types
export interface VehicleForPublish {
  id: number;
  brand_name: string | null;
  model_name: string | null;
  year: number | null;
  price: number | null;
  mileage: number | null;
  main_image: string | null;
  chassis_number: string | null;
  transmission: string | null;
  isPublished?: boolean;
  publishStatus?: FbMarketplacePostStatus;
}

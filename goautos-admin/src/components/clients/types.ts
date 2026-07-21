export type ClientFormData = {
  name: string;
  domain: string;
  custom_domain?: string | null;
  custom_domain_verified?: boolean;
  favicon?: string;
  logo?: string;
  logo_dark?: string;
  theme?: {
    light?: {
      primary?: string;
      secondary?: string;
    };
    dark?: {
      primary?: string;
      secondary?: string;
    };
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    google_site_verification?: string | null;
    social_links?: Record<string, string> | null;
  };
  contact?: {
    email: string;
    phone?: string;
    address?: string;
    finance_emails?: string[];
    consignments_emails?: string[];
    buy_emails?: string[];
    search_emails?: string[];
  };
  location?: {
    lat?: string | null;
    lng?: string | null;
  };
  has_demo?: boolean;
  has_dark_mode?: boolean;
  currency?: string;
  default_language?: string;
};

export type Client = {
  id: number;
  name: string;
  domain: string;
  custom_domain?: string | null;
  custom_domain_verified?: boolean;
  favicon?: string;
  logo?: string;
  logo_dark?: string;
  theme?: {
    light?: {
      primary?: string;
      secondary?: string;
    };
    dark?: {
      primary?: string;
      secondary?: string;
    };
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    google_site_verification?: string | null;
    social_links?: Record<string, string> | null;
  };
  contact?: {
    email: string;
    phone?: string;
    address?: string;
    finance_emails?: string[];
    consignments_emails?: string[];
    buy_emails?: string[];
    search_emails?: string[];
  };
  location?: {
    lat?: string;
    lng?: string;
  };
  has_demo?: boolean;
  currency?: 'CLP' | 'USD';
  default_language?: 'es' | 'en' | 'pt';
  created_at: string;
  is_active?: boolean;
};

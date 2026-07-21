import { LegalInfo } from './legalInfo';

export interface Contact {
  rut?: string;
  phone?: string;
  email?: string;
  address?: string;
  finance_emails?: string[];
  consignments_emails?: string[];
  buy_emails?: string[];
}

export interface Client {
  id?: string | number;
  name: string;
  logo?: string;
  domain?: string;
  contact?: Contact;
  legal_info?: LegalInfo;
  theme: {
    dark: {
      primary: string;
      secondary: string;
    };
    light: {
      primary: string;
      secondary: string;
    };
  };
  created_at: string;
  has_demo: boolean;
  subscription_status?: 'trial' | 'active' | 'past_due' | 'cancelled' | 'none';
  onboarding_status?: string;
}

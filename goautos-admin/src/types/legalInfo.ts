export interface LegalInfo {
  id?: number;
  company_name?: string;
  rut?: string;
  legal_representative?: string;
  legal_address?: string;
  client_id?: number;
  dealership_id?: number | null; // Optional: if set, this legal_info applies only to this dealership
  created_at?: string;
}

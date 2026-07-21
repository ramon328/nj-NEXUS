import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { PermissionCode, Role } from './permissions';

export type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  rol: string;
  role_id?: number | null;
  role_ids?: number[];
  client_id: number | null;
  allowed_client_ids?: number[] | null;
  /** Sedes (sucursales) asignadas al usuario (tabla user_dealerships). Vacío/undefined = sin restricción de sede. */
  dealership_ids?: number[];
  auth_id: string;
  phone?: string;
  hasAssignedCommissions?: boolean;
  client?: {
    name: string;
  } | null;
};

export type Client = {
  id: number;
  name: string;
  domain?: string;
  favicon?: string;
  logo?: string;
  logo_dark?: string;
  theme?: {
    light?: {
      primary?: string;
      secondary?: string;
      fontFamily?: string;
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
  };
  contact?: {
    email: string;
    phone?: string;
    address?: string;
    rut?: string; // Added rut field
  };
  location?: {
    lat?: string;
    lng?: string;
  };
  legal_info?: {
    company_name?: string;
    rut?: string;
    legal_representative?: string;
    legal_address?: string;
  };
  has_demo?: boolean;
  sellers_see_all_vehicles?: boolean;
  sellers_see_all_leads?: boolean;
  /** Solo aplica si sellers_see_all_leads=false: permite a los vendedores ver y "agarrar" leads sin asignar (pool). */
  sellers_can_claim_leads?: boolean;
  /** Reglas de seguimiento de leads (aviso por inactividad + liberación automática). Default todo OFF. */
  lead_rules?: {
    nag_enabled?: boolean;
    nag_hours?: number;
    release_enabled?: boolean;
    release_hours?: number;
    active_since?: string | null;
  };
  require_sale_approval?: boolean;
  tasks_require_approval?: boolean;
  // Cuando es true, las ventas se tratan como exentas de IVA (ej. autos usados):
  // IVA=0 en el cálculo de comisión/neto del vendedor.
  ventas_exentas_iva?: boolean;
  created_at: string;
  currency?: 'CLP' | 'USD';
  default_language?: 'es' | 'en' | 'pt';
  subscription_status?: 'trial' | 'active' | 'past_due' | 'cancelled' | 'none';
  onboarding_status?: string;
  terms_accepted_at?: string | null;
  terms_accepted_by?: string | null;
};

export interface AuthContextProps {
  user: SupabaseUser | null;
  userRole: string;
  userPermissions: PermissionCode[];
  userRoleData: Role | null;
  userRoles: Role[];
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPasswordRequest: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  loading: boolean;
  clientId: number;
  client: Client | null;
  userId: string;
  isLoading: boolean;
  userData: User | null;
  session: Session | null;
  refreshClient: () => Promise<void>;
  clearAuthState: () => void;
  /** Superadmin: override clientId/client to impersonate a tenant */
  setTenantOverride: (tenantClientId: number, tenantClient: Client) => void;
  clearTenantOverride: () => void;
  /** True when superadmin is impersonating a tenant */
  isTenantOverride: boolean;
  /** client_id que este usuario admin multi-automotora puede impersonar (vacio = no aplica) */
  allowedClientIds: number[];
  /** True si el usuario puede cambiar de automotora (superadmin o admin multi-automotora) */
  canSwitchTenant: boolean;
}

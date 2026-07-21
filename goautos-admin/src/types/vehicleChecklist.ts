// Tipos para el sistema de checklist de vehículos

/**
 * Item de checklist configurado por la automotora (client)
 */
export interface ClientChecklistItem {
  id: number;
  client_id: number;
  item_key: string;
  item_label: string;
  is_active: boolean;
  display_order: number;
  category: string;
  assigned_role_id?: number | null;
  assigned_role?: { id: number; name: string } | null;
  created_at?: string;
}

/**
 * Estado de un item del checklist para un vehículo específico
 */
export interface VehicleChecklistItem {
  id: number;
  vehicle_id: number;
  item_id: number;
  is_completed: boolean;
  completed_at?: string | null;
  completed_by?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Campos adicionales cuando se hace join con client_checklist_items
  item_label?: string;
  item_key?: string;
  display_order?: number;
}

/**
 * Item del checklist con información completa (incluye datos del item base)
 */
export interface VehicleChecklistItemWithDetails extends VehicleChecklistItem {
  checklist_item: ClientChecklistItem;
}

/**
 * Resumen del estado del checklist de un vehículo
 */
export interface ChecklistSummary {
  total: number;
  completed: number;
  pending: number;
  percentComplete: number;
  pendingItemLabels?: string[];
}

/**
 * Datos para crear un nuevo item de checklist
 */
export interface CreateChecklistItemData {
  client_id: number;
  item_key: string;
  item_label: string;
  display_order?: number;
  category?: string;
  assigned_role_id?: number | null;
}

/**
 * Datos para actualizar un item de checklist
 */
export interface UpdateChecklistItemData {
  item_label?: string;
  is_active?: boolean;
  display_order?: number;
  category?: string;
  assigned_role_id?: number | null;
}

/**
 * Datos para actualizar el estado de un item del checklist de un vehículo
 */
export interface UpdateVehicleChecklistData {
  is_completed?: boolean;
  notes?: string | null;
  completed_by?: number | null;
}

/**
 * Comentario libre asociado a un item del checklist de un vehículo
 */
export interface VehicleChecklistComment {
  id: number;
  vehicle_checklist_id: number;
  user_id: number | null;
  comment: string;
  created_at: string;
  author_name?: string | null;
}

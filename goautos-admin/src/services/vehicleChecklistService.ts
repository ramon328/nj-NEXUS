import { supabase } from '@/integrations/supabase/client';
import type {
  ClientChecklistItem,
  VehicleChecklistItem,
  ChecklistSummary,
  CreateChecklistItemData,
  UpdateChecklistItemData,
  UpdateVehicleChecklistData,
  VehicleChecklistComment,
} from '@/types/vehicleChecklist';

// =============================================
// FUNCIONES PARA CLIENT CHECKLIST ITEMS
// =============================================

/**
 * Obtener todos los items de checklist configurados para un cliente
 */
export const getClientChecklistItems = async (
  clientId: number
): Promise<ClientChecklistItem[]> => {
  const { data, error } = await supabase
    .from('client_checklist_items')
    .select('*, assigned_role:assigned_role_id(id, name)')
    .eq('client_id', clientId)
    .order('category', { ascending: true })
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching client checklist items:', error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    ...item,
    assigned_role: item.assigned_role || null,
  }));
};

/**
 * Obtener solo los items activos de checklist para un cliente
 */
export const getActiveClientChecklistItems = async (
  clientId: number
): Promise<ClientChecklistItem[]> => {
  const { data, error } = await supabase
    .from('client_checklist_items')
    .select('*, assigned_role:assigned_role_id(id, name)')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching active client checklist items:', error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    ...item,
    assigned_role: item.assigned_role || null,
  }));
};

/**
 * Crear un nuevo item de checklist para un cliente
 */
export const createClientChecklistItem = async (
  itemData: CreateChecklistItemData
): Promise<ClientChecklistItem> => {
  // Obtener el máximo display_order actual
  const { data: existingItems } = await supabase
    .from('client_checklist_items')
    .select('display_order')
    .eq('client_id', itemData.client_id)
    .order('display_order', { ascending: false })
    .limit(1);

  const maxOrder = existingItems?.[0]?.display_order ?? 0;

  const { data, error } = await supabase
    .from('client_checklist_items')
    .insert({
      ...itemData,
      display_order: itemData.display_order ?? maxOrder + 1,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating client checklist item:', error);
    throw error;
  }

  return data;
};

/**
 * Actualizar un item de checklist de cliente
 */
export const updateClientChecklistItem = async (
  itemId: number,
  updateData: UpdateChecklistItemData
): Promise<ClientChecklistItem> => {
  const { data, error } = await supabase
    .from('client_checklist_items')
    .update(updateData)
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error('Error updating client checklist item:', error);
    throw error;
  }

  return data;
};

/**
 * Eliminar (desactivar) un item de checklist de cliente
 */
export const deleteClientChecklistItem = async (
  itemId: number
): Promise<void> => {
  // Soft delete - solo desactivar
  const { error } = await supabase
    .from('client_checklist_items')
    .update({ is_active: false })
    .eq('id', itemId);

  if (error) {
    console.error('Error deleting client checklist item:', error);
    throw error;
  }
};

/**
 * Eliminar permanentemente un item de checklist de cliente
 */
export const hardDeleteClientChecklistItem = async (
  itemId: number
): Promise<void> => {
  const { error } = await supabase
    .from('client_checklist_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('Error hard deleting client checklist item:', error);
    throw error;
  }
};

/**
 * Reordenar items de checklist de cliente
 */
export const reorderClientChecklistItems = async (
  clientId: number,
  itemIds: number[]
): Promise<void> => {
  // Actualizar el orden de cada item
  const updates = itemIds.map((id, index) =>
    supabase
      .from('client_checklist_items')
      .update({ display_order: index + 1 })
      .eq('id', id)
      .eq('client_id', clientId)
  );

  await Promise.all(updates);
};

// =============================================
// FUNCIONES PARA VEHICLE CHECKLIST
// =============================================

/**
 * Obtener el checklist de un vehículo
 */
export const getVehicleChecklist = async (
  vehicleId: number
): Promise<VehicleChecklistItem[]> => {
  const { data, error } = await supabase
    .from('vehicle_checklist')
    .select(`
      *,
      checklist_item:client_checklist_items(
        id,
        item_key,
        item_label,
        display_order,
        category,
        assigned_role_id,
        assigned_role:assigned_role_id(id, name)
      )
    `)
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching vehicle checklist:', error);
    throw error;
  }

  // Transformar los datos para aplanar la estructura
  return (data || []).map((item: any) => ({
    ...item,
    item_label: item.checklist_item?.item_label,
    item_key: item.checklist_item?.item_key,
    display_order: item.checklist_item?.display_order,
    category: item.checklist_item?.category || 'general',
    assigned_role_id: item.checklist_item?.assigned_role_id,
    assigned_role_name: item.checklist_item?.assigned_role?.name,
  })).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
};

/**
 * Inicializar el checklist para un vehículo (llamar función de BD)
 */
export const initializeVehicleChecklist = async (
  vehicleId: number,
  clientId: number
): Promise<void> => {
  const { error } = await supabase.rpc('initialize_vehicle_checklist', {
    p_vehicle_id: vehicleId,
    p_client_id: clientId,
  });

  if (error) {
    console.error('Error initializing vehicle checklist:', error);
    throw error;
  }
};

/**
 * Alternar el estado de un item del checklist
 */
export const toggleVehicleChecklistItem = async (
  itemId: number,
  isCompleted: boolean,
  userId?: number | null
): Promise<VehicleChecklistItem> => {
  const updateData: any = {
    is_completed: isCompleted,
    completed_at: isCompleted ? new Date().toISOString() : null,
    completed_by: isCompleted ? userId : null,
  };

  const { data, error } = await supabase
    .from('vehicle_checklist')
    .update(updateData)
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error('Error toggling vehicle checklist item:', error);
    throw error;
  }

  return data;
};

/**
 * Actualizar un item del checklist de un vehículo
 */
export const updateVehicleChecklistItem = async (
  itemId: number,
  updateData: UpdateVehicleChecklistData,
  userId?: number | null
): Promise<VehicleChecklistItem> => {
  const dataToUpdate: any = { ...updateData };

  // Si se está completando, agregar timestamp y usuario
  if (updateData.is_completed !== undefined) {
    dataToUpdate.completed_at = updateData.is_completed
      ? new Date().toISOString()
      : null;
    dataToUpdate.completed_by = updateData.is_completed ? userId : null;
  }

  const { data, error } = await supabase
    .from('vehicle_checklist')
    .update(dataToUpdate)
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error('Error updating vehicle checklist item:', error);
    throw error;
  }

  return data;
};

/**
 * Obtener resumen del checklist de un vehículo
 */
export const getVehicleChecklistSummary = async (
  vehicleId: number
): Promise<ChecklistSummary> => {
  const { data, error } = await supabase
    .from('vehicle_checklist')
    .select('is_completed')
    .eq('vehicle_id', vehicleId);

  if (error) {
    console.error('Error fetching vehicle checklist summary:', error);
    throw error;
  }

  const items = data || [];
  const total = items.length;
  const completed = items.filter((item) => item.is_completed).length;
  const pending = total - completed;
  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    pending,
    percentComplete,
  };
};

/**
 * Obtener resumen del checklist para múltiples vehículos (para Excel)
 */
export const getMultipleVehicleChecklistSummaries = async (
  vehicleIds: number[]
): Promise<Map<number, ChecklistSummary>> => {
  if (vehicleIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('vehicle_checklist')
    .select(`
      vehicle_id,
      is_completed,
      checklist_item:client_checklist_items(item_label, display_order)
    `)
    .in('vehicle_id', vehicleIds);

  if (error) {
    console.error('Error fetching multiple vehicle checklist summaries:', error);
    throw error;
  }

  // Agrupar por vehicle_id y calcular resúmenes
  const summariesMap = new Map<number, ChecklistSummary>();

  // Inicializar todos los vehículos con resumen vacío
  vehicleIds.forEach((id) => {
    summariesMap.set(id, {
      total: 0,
      completed: 0,
      pending: 0,
      percentComplete: 0,
      pendingItemLabels: [],
    });
  });

  // Procesar los datos
  const vehicleItems = new Map<
    number,
    { total: number; completed: number; pending: Array<{ label: string; order: number }> }
  >();

  (data || []).forEach((item: any) => {
    const current = vehicleItems.get(item.vehicle_id) || {
      total: 0,
      completed: 0,
      pending: [],
    };
    current.total += 1;
    if (item.is_completed) {
      current.completed += 1;
    } else {
      const label = item.checklist_item?.item_label;
      if (label) {
        current.pending.push({
          label,
          order: item.checklist_item?.display_order ?? 0,
        });
      }
    }
    vehicleItems.set(item.vehicle_id, current);
  });

  // Calcular resúmenes finales
  vehicleItems.forEach((stats, vehicleId) => {
    const pending = stats.total - stats.completed;
    const percentComplete =
      stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    const pendingItemLabels = stats.pending
      .sort((a, b) => a.order - b.order)
      .map((p) => p.label);
    summariesMap.set(vehicleId, {
      total: stats.total,
      completed: stats.completed,
      pending,
      percentComplete,
      pendingItemLabels,
    });
  });

  return summariesMap;
};

/**
 * Formatear resumen de checklist para mostrar en Excel
 */
export const formatChecklistSummaryForExcel = (
  summary: ChecklistSummary
): string => {
  if (summary.total === 0) {
    return 'Sin checklist';
  }
  return `${summary.completed}/${summary.total} (${summary.percentComplete}%)`;
};

// =============================================
// COMENTARIOS POR ITEM DEL CHECKLIST
// =============================================

/**
 * Obtener los comentarios de un item del checklist de un vehículo,
 * ordenados del más antiguo al más reciente.
 */
export const getVehicleChecklistComments = async (
  vehicleChecklistId: number
): Promise<VehicleChecklistComment[]> => {
  const { data, error } = await supabase
    .from('vehicle_checklist_comments')
    .select(`
      id,
      vehicle_checklist_id,
      user_id,
      comment,
      created_at,
      author:user_id(first_name, last_name)
    `)
    .eq('vehicle_checklist_id', vehicleChecklistId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching checklist comments:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    vehicle_checklist_id: row.vehicle_checklist_id,
    user_id: row.user_id,
    comment: row.comment,
    created_at: row.created_at,
    author_name: row.author
      ? `${row.author.first_name ?? ''} ${row.author.last_name ?? ''}`.trim() || null
      : null,
  }));
};

/**
 * Obtener el conteo de comentarios para múltiples items de checklist.
 * Sirve para mostrar el badge "💬 N" sin traer los textos completos.
 */
export const getChecklistCommentCounts = async (
  vehicleChecklistIds: number[]
): Promise<Map<number, number>> => {
  const counts = new Map<number, number>();
  if (vehicleChecklistIds.length === 0) return counts;

  vehicleChecklistIds.forEach((id) => counts.set(id, 0));

  const { data, error } = await supabase
    .from('vehicle_checklist_comments')
    .select('vehicle_checklist_id')
    .in('vehicle_checklist_id', vehicleChecklistIds);

  if (error) {
    console.error('Error fetching checklist comment counts:', error);
    return counts;
  }

  (data || []).forEach((row: any) => {
    counts.set(row.vehicle_checklist_id, (counts.get(row.vehicle_checklist_id) || 0) + 1);
  });

  return counts;
};

/**
 * Crear un comentario en un item del checklist.
 */
export const createVehicleChecklistComment = async (
  vehicleChecklistId: number,
  comment: string,
  userId: number | null
): Promise<VehicleChecklistComment> => {
  const trimmed = comment.trim();
  if (!trimmed) {
    throw new Error('El comentario no puede estar vacío');
  }

  const { data, error } = await supabase
    .from('vehicle_checklist_comments')
    .insert({
      vehicle_checklist_id: vehicleChecklistId,
      user_id: userId,
      comment: trimmed,
    })
    .select(`
      id,
      vehicle_checklist_id,
      user_id,
      comment,
      created_at,
      author:user_id(first_name, last_name)
    `)
    .single();

  if (error) {
    console.error('Error creating checklist comment:', error);
    throw error;
  }

  return {
    id: data.id,
    vehicle_checklist_id: data.vehicle_checklist_id,
    user_id: data.user_id,
    comment: data.comment,
    created_at: data.created_at,
    author_name: (data as any).author
      ? `${(data as any).author.first_name ?? ''} ${(data as any).author.last_name ?? ''}`.trim() || null
      : null,
  };
};

/**
 * Eliminar un comentario. La RLS controla quién puede borrarlo
 * (autor o admin/superadmin del mismo cliente).
 */
export const deleteVehicleChecklistComment = async (
  commentId: number
): Promise<void> => {
  const { error } = await supabase
    .from('vehicle_checklist_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting checklist comment:', error);
    throw error;
  }
};

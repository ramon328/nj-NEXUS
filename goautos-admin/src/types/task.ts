export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'pending_approval';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskSourceType = 'checklist' | 'manual' | 'ai';

export interface Task {
  id: string;
  client_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  source_type: TaskSourceType;
  vehicle_checklist_id: number | null;
  vehicle_id: number | null;
  category: string;
  assigned_to_user_id: number | null;
  assigned_to_role_id: number | null;
  created_by: string | null;
  completed_at: string | null;
  completed_by: number | null;
  approved_at: string | null;
  approved_by: number | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  vehicle?: {
    id: number;
    year: number;
    main_image: string | null;
    brand: { name: string } | null;
    model: { name: string } | null;
    license_plate: string | null;
  } | null;
  assigned_user?: { id: number; first_name: string; last_name: string } | null;
  assigned_role?: { id: number; name: string } | null;
  creator_name?: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  priority?: TaskPriority;
  category?: string;
  vehicle_id?: number | null;
  assigned_to_user_id?: number | null;
  assigned_to_role_id?: number | null;
  due_date?: string | null;
}

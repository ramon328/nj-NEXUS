import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const createTaskTool = createTool({
  id: 'create_task',
  description:
    'Crear una tarea en el sistema. Usar cuando el usuario pida crear, agregar o registrar una tarea, recordatorio o pendiente.',
  inputSchema: z.object({
    title: z.string(),
    description: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    due_date: z.string().optional(),
    category: z.string().default('general'),
    vehicle_id: z.number().optional(),
    assigned_to_user_id: z.number().optional(),
  }),
  execute: async (params: any) => {
    const input = params.context;
    const clientId = params.runtimeContext.get("clientId");

    const taskData = {
      client_id: clientId,
      title: input.title,
      status: 'pending',
      priority: input.priority || 'medium',
      source_type: 'ai',
      category: input.category || 'general',
      ...(input.description && { description: input.description }),
      ...(input.due_date && { due_date: input.due_date }),
      ...(input.vehicle_id && { vehicle_id: input.vehicle_id }),
      ...(input.assigned_to_user_id && { assigned_to_user_id: input.assigned_to_user_id }),
    };

    const { data, error } = await supabaseAdmin.from('tasks').insert(taskData).select().single();
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify({
      success: true,
      task_id: data.id,
      title: data.title,
      priority: data.priority,
      due_date: data.due_date,
      category: data.category,
      status: data.status,
    });
  },
});

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveDealership } from '@/hooks/useActiveDealership';
import posthog from '@/utils/posthog';
import type { Task, TaskStatus, CreateTaskData } from '@/types/task';

export function useTasks(canApproveTasks = false) {
  const { clientId, user, client } = useAuth();
  // División de sedes (Slice 4): las tareas se filtran por la sede del VEHÍCULO
  // asociado. Las tareas manuales (sin vehicle_id) son siempre visibles.
  // `null` = sin filtro (retrocompatible).
  const { visibleDealershipIds } = useActiveDealership();
  const tasksRequireApproval = !!client?.tasks_require_approval;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!clientId) return;

    let tasksQuery = supabase
      .from('tasks')
      .select(`
        *,
        vehicle:vehicle_id(
          id, year, main_image, license_plate,
          brand:brand_id(name),
          model:model_id(name)
        ),
        assigned_user:assigned_to_user_id(id, first_name, last_name),
        assigned_role:assigned_to_role_id(id, name)
      `)
      .eq('client_id', clientId);

    // Filtro de sede: tasks no tiene dealership_id, así que se resuelve vía el
    // vehículo. Pre-fetch de los vehicle_ids visibles (sedes del usuario O sin sede)
    // y se filtra `vehicle_id IN (visibles) OR vehicle_id IS NULL` (tareas manuales).
    if (visibleDealershipIds && visibleDealershipIds.length > 0) {
      const { data: visibleVehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('client_id', clientId)
        .or(`dealership_id.in.(${visibleDealershipIds.join(',')}),dealership_id.is.null`);
      const visibleIds = (visibleVehicles || []).map((v) => v.id);
      tasksQuery =
        visibleIds.length > 0
          ? tasksQuery.or(`vehicle_id.in.(${visibleIds.join(',')}),vehicle_id.is.null`)
          : tasksQuery.is('vehicle_id', null);
    }

    const { data, error } = await tasksQuery.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      setIsLoading(false);
      return;
    }

    // Fetch creator names
    const creatorIds = [...new Set((data || []).filter(t => t.created_by).map(t => t.created_by))];
    let creatorMap = new Map<string, string>();
    if (creatorIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('auth_id, first_name, last_name')
        .in('auth_id', creatorIds);
      if (users) {
        creatorMap = new Map(users.map(u => [u.auth_id, `${u.first_name} ${u.last_name}`.trim()]));
      }
    }

    const enriched: Task[] = (data || []).map((t: any) => ({
      ...t,
      vehicle: t.vehicle || null,
      assigned_user: t.assigned_user || null,
      assigned_role: t.assigned_role || null,
      creator_name: t.created_by ? creatorMap.get(t.created_by) : undefined,
    }));

    setTasks(enriched);
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, visibleDealershipIds]);

  const createTask = useCallback(async (data: CreateTaskData) => {
    if (!clientId || !user?.id) return { error: 'No client/user' };

    const insertData = {
      client_id: clientId,
      created_by: user.id,
      title: data.title,
      description: data.description || null,
      priority: data.priority || 'medium',
      category: data.category || 'general',
      source_type: 'manual' as const,
      vehicle_id: data.vehicle_id || null,
      assigned_to_user_id: data.assigned_to_user_id || null,
      assigned_to_role_id: data.assigned_to_role_id || null,
      due_date: data.due_date || null,
    };

    const { error } = await supabase.from('tasks').insert(insertData);

    if (error) {
      console.error('Error creating task:', error);
      return { error: 'No pudimos crear la tarea. Intenta de nuevo.' };
    }

    // Create notification for assigned user/role
    if (data.assigned_to_user_id || data.assigned_to_role_id) {
      const notifData: Record<string, unknown> = {
        client_id: clientId,
        type: 'task_assigned',
        title: 'Nueva tarea asignada',
        body: data.title,
        icon: 'clipboard-check',
        url: '/tareas',
        data: { task_title: data.title },
        created_by: user.id,
      };

      if (data.assigned_to_user_id) {
        // Get auth_id for the user
        const { data: userData } = await supabase
          .from('users')
          .select('auth_id')
          .eq('id', data.assigned_to_user_id)
          .single();
        if (userData?.auth_id) {
          notifData.target_user_id = userData.auth_id;
        }
      } else if (data.assigned_to_role_id) {
        // Get role name for targeting
        const { data: roleData } = await supabase
          .from('roles')
          .select('name')
          .eq('id', data.assigned_to_role_id)
          .single();
        if (roleData?.name) {
          notifData.target_role = roleData.name;
        }
      }

      await supabase.from('notifications').insert(notifData).then(({ error: nErr }) => {
        if (nErr) console.error('Error creating task notification:', nErr);
      });
    }

    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'task_created',
      properties: {
        category: data.category || 'general',
        priority: data.priority || 'medium',
        client_id: clientId,
      },
    });

    await fetchTasks();
    return { error: null };
  }, [clientId, user?.id, fetchTasks]);

  // Editar el CONTENIDO de una tarea (no toca status/source_type/created_by).
  // La RLS de UPDATE ya permite a usuarios del mismo client (no requiere migración).
  const updateTask = useCallback(async (taskId: string, data: CreateTaskData) => {
    if (!clientId) return { error: 'No client' };

    const updateData = {
      title: data.title,
      description: data.description || null,
      priority: data.priority || 'medium',
      category: data.category || 'general',
      vehicle_id: data.vehicle_id || null,
      assigned_to_user_id: data.assigned_to_user_id || null,
      assigned_to_role_id: data.assigned_to_role_id || null,
      due_date: data.due_date || null,
    };

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('client_id', clientId);

    if (error) {
      console.error('Error updating task:', error);
      return { error: 'No pudimos actualizar la tarea. Intenta de nuevo.' };
    }

    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'task_updated',
      properties: { client_id: clientId },
    });

    await fetchTasks();
    return { error: null };
  }, [clientId, user?.id, fetchTasks]);

  const updateTaskStatus = useCallback(async (
    taskId: string,
    status: TaskStatus,
  ) => {
    // Cuando tasks_require_approval esta activo, solo los users con
    // tasks.approve pueden mover a completed o cancelled. El resto:
    //   - completed -> reescribimos a pending_approval (UX silenciosa).
    //   - cancelled -> bloqueamos con error explicito.
    // El trigger enforce_task_approval en DB tambien valida lo mismo
    // como fuente de verdad; este check es solo UX.
    let effectiveStatus = status;
    if (tasksRequireApproval && !canApproveTasks) {
      if (status === 'completed') {
        effectiveStatus = 'pending_approval';
      } else if (status === 'cancelled') {
        return { error: 'Solo los administradores pueden cancelar tareas cuando la aprobación está activa' };
      }
    }

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId ? {
        ...t,
        status: effectiveStatus,
        completed_at: effectiveStatus === 'completed' ? new Date().toISOString() : null,
      } : t
    ));

    const updates: Record<string, unknown> = {
      status: effectiveStatus,
      updated_at: new Date().toISOString(),
    };

    if (effectiveStatus === 'completed' || effectiveStatus === 'pending_approval') {
      // En ambos casos registramos quien inicio la finalizacion (el seller que
      // dio "completada" o el admin que cierra directo). approved_* solo se
      // setea cuando un admin aprueba explicitamente desde pending_approval.
      updates.completed_at = new Date().toISOString();
      if (user?.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .single();
        if (userData) updates.completed_by = userData.id;
      }
    } else {
      updates.completed_at = null;
      updates.completed_by = null;
      updates.approved_at = null;
      updates.approved_by = null;
    }

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task status:', error);
      await fetchTasks();
      return { error: 'No pudimos cambiar el estado de la tarea. Intenta de nuevo.' };
    }

    // Sync with vehicle_checklist if it's a checklist task
    const task = tasks.find(t => t.id === taskId);
    if (task?.source_type === 'checklist' && task.vehicle_checklist_id) {
      await supabase
        .from('vehicle_checklist')
        .update({
          is_completed: effectiveStatus === 'completed',
          completed_at: effectiveStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', task.vehicle_checklist_id);
    }

    // Track task completion
    if (effectiveStatus === 'completed') {
      posthog.capture({
        distinctId: user?.id || 'anonymous',
        event: 'task_completed',
        properties: {
          task_id: taskId,
          client_id: clientId,
        },
      });
    }

    // Create notification on completion
    if (effectiveStatus === 'completed' && clientId) {
      await supabase.from('notifications').insert({
        client_id: clientId,
        type: 'task_completed',
        title: 'Tarea completada',
        body: task?.title || 'Una tarea fue completada',
        icon: 'check-circle',
        url: '/tareas',
        data: { task_id: taskId },
        created_by: user?.id || null,
      }).then(({ error: nErr }) => {
        if (nErr) console.error('Error creating completion notification:', nErr);
      });
    }

    // Create notification for admin when task needs approval
    if (effectiveStatus === 'pending_approval' && clientId) {
      await supabase.from('notifications').insert({
        client_id: clientId,
        type: 'task_pending_approval',
        title: 'Tarea requiere aprobación',
        body: task?.title || 'Una tarea operativa necesita aprobación',
        icon: 'clipboard-check',
        url: '/tareas',
        data: { task_id: taskId },
        target_role: 'admin',
        created_by: user?.id || null,
      }).then(({ error: nErr }) => {
        if (nErr) console.error('Error creating approval notification:', nErr);
      });
    }

    await fetchTasks();
    return { error: null };
  }, [clientId, user?.id, fetchTasks, tasks, canApproveTasks, tasksRequireApproval]);

  const approveTask = useCallback(async (taskId: string) => {
    if (!canApproveTasks) {
      return { error: 'No tienes permiso para aprobar tareas' };
    }

    let approverId: number | null = null;
    if (user?.id) {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();
      if (userData) approverId = userData.id;
    }

    const nowIso = new Date().toISOString();
    const updates = {
      status: 'completed' as TaskStatus,
      approved_at: nowIso,
      approved_by: approverId,
      updated_at: nowIso,
    };

    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, ...updates } : t))
    );

    const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
    if (error) {
      console.error('Error approving task:', error);
      await fetchTasks();
      return { error: 'No pudimos aprobar la tarea. Intenta de nuevo.' };
    }

    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'task_approved',
      properties: { task_id: taskId, client_id: clientId },
    });

    await fetchTasks();
    return { error: null };
  }, [canApproveTasks, user?.id, fetchTasks, clientId]);

  const rejectTask = useCallback(async (taskId: string) => {
    if (!canApproveTasks) {
      return { error: 'No tienes permiso para rechazar tareas' };
    }

    const updates = {
      status: 'in_progress' as TaskStatus,
      completed_at: null,
      completed_by: null,
      approved_at: null,
      approved_by: null,
      updated_at: new Date().toISOString(),
    };

    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, ...updates } : t))
    );

    const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
    if (error) {
      console.error('Error rejecting task:', error);
      await fetchTasks();
      return { error: 'No pudimos rechazar la tarea. Intenta de nuevo.' };
    }

    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'task_rejected',
      properties: { task_id: taskId, client_id: clientId },
    });

    await fetchTasks();
    return { error: null };
  }, [canApproveTasks, user?.id, fetchTasks, clientId]);

  const deleteTask = useCallback(async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
      return { error: 'No pudimos eliminar la tarea. Intenta de nuevo.' };
    }

    await fetchTasks();
    return { error: null };
  }, [fetchTasks]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `client_id=eq.${clientId}`,
        },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, fetchTasks]);

  const pendingCount = useMemo(
    () => tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
    [tasks]
  );

  return {
    tasks,
    isLoading,
    pendingCount,
    tasksRequireApproval,
    createTask,
    updateTask,
    updateTaskStatus,
    approveTask,
    rejectTask,
    deleteTask,
    refetch: fetchTasks,
  };
}

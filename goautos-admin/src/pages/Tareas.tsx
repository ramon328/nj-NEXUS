import { useState, useMemo, useCallback, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useTasks } from '@/hooks/useTasks';
import CreateTaskSheet from '@/components/tasks/CreateTaskSheet';
import TaskDetailPanel from '@/components/tasks/TaskDetailPanel';
import TaskKanban from '@/components/tasks/TaskKanban';
import { TaskMobileCard } from '@/components/tasks/TaskMobileCard';
import { TASK_STATUSES, STATUS_LABELS, formatDueDate } from '@/components/tasks/taskConstants';
import type { TaskStatus } from '@/types/task';
import { Plus, Search, ClipboardCheck, Filter, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import TaskApprovalSettings from '@/components/configuration/general/TaskApprovalSettings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import type { Task } from '@/types/task';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import { toast } from 'sonner';

const Tareas = () => {
  const { hasPermission } = usePermissions();
  const canApproveTasks = hasPermission(PermissionCode.TASKS_APPROVE);
  const { tasks, isLoading, createTask, updateTask, updateTaskStatus, approveTask, rejectTask, deleteTask } = useTasks(canApproveTasks);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [mobileColumn, setMobileColumn] = useState<TaskStatus>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Keep selectedTask in sync
  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find((t) => t.id === selectedTask.id);
      if (updated && updated !== selectedTask) setSelectedTask(updated);
      else if (!updated) setSelectedTask(null);
    }
  }, [tasks, selectedTask]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const searchStr = `${t.title} ${t.description || ''} ${t.vehicle?.brand?.name || ''} ${t.vehicle?.model?.name || ''} ${t.assigned_user?.first_name || ''} ${t.assigned_role?.name || ''}`.toLowerCase();
        if (!searchStr.includes(term)) return false;
      }
      return true;
    });
  }, [tasks, searchTerm, categoryFilter]);

  const grouped = useMemo(() => {
    const result: Record<TaskStatus, Task[]> = {
      pending: [],
      in_progress: [],
      pending_approval: [],
      completed: [],
      cancelled: [],
    };
    for (const t of filteredTasks) {
      if (result[t.status]) result[t.status].push(t);
    }
    return result;
  }, [filteredTasks]);

  // Muestra toast.error si el cambio de status falla (gating de aprobación,
  // error de DB, etc.). Sin esto los errores se perdían silenciosamente.
  const handleStatusChange = useCallback(async (id: string, status: TaskStatus) => {
    const result = await updateTaskStatus(id, status);
    if (result?.error) {
      toast.error(result.error);
    }
    return result;
  }, [updateTaskStatus]);

  return (
    <DashboardLayout>
      <main className="flex flex-col h-full bg-[#f5f5f7]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#f5f5f7] border-b border-slate-200/60">
          <div className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-2 sm:pb-3 space-y-2 sm:space-y-3">
            {/* Toolbar row (desktop) */}
            <div className="hidden sm:flex gap-3 items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar tareas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 rounded-xl bg-white border-slate-200/60 text-[13px] text-slate-500 placeholder:text-slate-400 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px] h-9 rounded-xl bg-white border-slate-200/60 text-[13px] text-slate-500 [&>svg]:text-slate-400 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las áreas</SelectItem>
                  <SelectItem value="operativo">Operativo</SelectItem>
                  <SelectItem value="documentacion">Documentación</SelectItem>
                  <SelectItem value="venta">Venta</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
              {canApproveTasks && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                  className="ml-auto gap-1.5 rounded-xl h-9 text-[12px] font-medium border-slate-200/60 text-slate-600 bg-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]"
                  title="Configuración de tareas"
                >
                  <Settings2 className="h-4 w-4" />
                  Configuración
                </Button>
              )}
              <Button onClick={() => setCreateDialogOpen(true)} size="sm" className={cn('gap-1.5 rounded-xl h-9 text-[12px] font-medium bg-sky-400 hover:bg-sky-500 border-0 shadow-none', !canApproveTasks && 'ml-auto')}>
                <Plus className="h-4 w-4" />
                Nueva Tarea
              </Button>
            </div>

            {/* Mobile column tabs */}
            <div className="flex sm:hidden gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
              {TASK_STATUSES.map((key) => {
                const columnTasks = grouped[key] || [];
                const hasOverdue = columnTasks.some((t) => formatDueDate(t.due_date)?.isOverdue);
                return (
                  <button
                    key={key}
                    onClick={() => setMobileColumn(key)}
                    className={cn(
                      'relative px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors',
                      mobileColumn === key
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {STATUS_LABELS[key]} ({columnTasks.length})
                    {hasOverdue && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 border-2 border-sky-300 border-t-sky-500 rounded-full animate-spin" />
            </div>
          ) : filteredTasks.length === 0 && !searchTerm && categoryFilter === 'all' ? (
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 px-8 flex flex-col items-center text-center w-full">
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 rounded-2xl border border-slate-200/80 bg-slate-50/50 transform rotate-6" />
                  <div className="absolute inset-0 rounded-2xl border border-slate-200/80 bg-slate-50/80 transform -rotate-3" />
                  <div className="absolute inset-0 rounded-2xl border border-slate-200 bg-white flex items-center justify-center shadow-sm">
                    <ClipboardCheck className="h-9 w-9 text-slate-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1.5">Sin tareas</h3>
                <p className="text-[13px] text-slate-400 mb-6 max-w-sm">
                  Crea tu primera tarea para organizar el trabajo de tu equipo
                </p>
                <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-1.5 rounded-xl h-9 text-[12px] font-medium bg-sky-400 hover:bg-sky-500 border-0 shadow-none">
                  <Plus className="h-4 w-4" />
                  Nueva Tarea
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Kanban */}
              <div className="hidden sm:block h-full">
                <TaskKanban
                  tasks={filteredTasks}
                  onSelectTask={setSelectedTask}
                  onStatusChange={handleStatusChange}
                />
              </div>

              {/* Mobile list */}
              <div className="sm:hidden px-4 py-4 overflow-y-auto h-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mobileColumn}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2.5"
                  >
                    {(grouped[mobileColumn] || []).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <ClipboardCheck className="h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">Sin tareas</p>
                      </div>
                    ) : (
                      (grouped[mobileColumn] || []).map((t) => (
                        <TaskMobileCard
                          key={t.id}
                          task={t}
                          onClick={() => setSelectedTask(t)}
                        />
                      ))
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Mobile FAB */}
      <button
        onClick={() => setCreateDialogOpen(true)}
        className="sm:hidden fixed bottom-24 right-4 z-20 h-14 w-14 rounded-full bg-sky-400 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Settings dialog — aprobación de tareas (admins) */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configuración de tareas</DialogTitle>
          </DialogHeader>
          <TaskApprovalSettings />
        </DialogContent>
      </Dialog>

      {/* Create / Edit dialog (mismo sheet; si hay editingTask, modo edición) */}
      <CreateTaskSheet
        open={createDialogOpen || !!editingTask}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingTask(null);
          }
        }}
        task={editingTask}
        onSubmit={(data) =>
          editingTask ? updateTask(editingTask.id, data) : createTask(data)
        }
      />

      {/* Detail panel */}
      <TaskDetailPanel
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
        onStatusChange={handleStatusChange}
        onDelete={deleteTask}
        onEdit={(t) => { setSelectedTask(null); setEditingTask(t); }}
        canApproveTasks={canApproveTasks}
        onApprove={approveTask}
        onReject={rejectTask}
      />
    </DashboardLayout>
  );
};

export default Tareas;

import { useState, useEffect } from 'react';
import { Drawer, DrawerContentRight, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Loader2,
  ClipboardCheck,
  Car,
  User,
  Tag,
  CalendarDays,
  ChevronsUpDown,
  Check,
  X,
} from 'lucide-react';
import { useRoles } from '@/hooks/useRoles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { CreateTaskData, TaskPriority, Task } from '@/types/task';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'operativo', label: 'Operativo' },
  { value: 'documentacion', label: 'Documentación' },
  { value: 'venta', label: 'Venta' },
];

interface CreateTaskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTaskData) => Promise<{ error: string | null }>;
  /** Si viene, el sheet trabaja en modo EDICIÓN (precarga campos). */
  task?: Task | null;
}

export default function CreateTaskSheet({
  open,
  onOpenChange,
  onSubmit,
  task,
}: CreateTaskSheetProps) {
  const isEdit = !!task;
  const { clientId } = useAuth();
  const { roles } = useRoles();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState('general');
  const [assignType, setAssignType] = useState<'none' | 'user' | 'role'>('none');
  const [assignedUserId, setAssignedUserId] = useState<string>('');
  const [assignedRoleId, setAssignedRoleId] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [dueDate, setDueDate] = useState('');

  // Fetch team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-for-tasks', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('client_id', clientId)
        .order('first_name');
      return data || [];
    },
    enabled: !!clientId && open,
  });

  // Fetch vehicles
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-for-tasks', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase
        .from('vehicles')
        .select('id, year, license_plate, brand:brand_id(name), model:model_id(name)')
        .eq('client_id', clientId)
        .eq('show_in_stock', true)
        .order('created_at', { ascending: false })
        .limit(100);
      return (data || []).map((v: any) => ({
        id: v.id,
        label: `${v.year} ${v.brand?.name || ''} ${v.model?.name || ''} ${v.license_plate ? `(${v.license_plate})` : ''}`.trim(),
      }));
    },
    enabled: !!clientId && open,
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setCategory('general');
    setAssignType('none');
    setAssignedUserId('');
    setAssignedRoleId('');
    setVehicleId('');
    setVehicleSearch('');
    setVehicleDropdownOpen(false);
    setDueDate('');
  };

  // Precargar campos en modo edición al abrir; resetear en creación.
  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'medium');
      setCategory(task.category || 'general');
      if (task.assigned_to_user_id) {
        setAssignType('user');
        setAssignedUserId(String(task.assigned_to_user_id));
      } else if (task.assigned_to_role_id) {
        setAssignType('role');
        setAssignedRoleId(String(task.assigned_to_role_id));
      } else {
        setAssignType('none');
      }
      setVehicleId(task.vehicle_id ? String(task.vehicle_id) : '');
      setDueDate(task.due_date ? String(task.due_date).slice(0, 10) : '');
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task]);

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const data: CreateTaskData = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category,
      vehicle_id: vehicleId && vehicleId !== 'none' ? parseInt(vehicleId) : undefined,
      assigned_to_user_id: assignType === 'user' && assignedUserId ? parseInt(assignedUserId) : undefined,
      assigned_to_role_id: assignType === 'role' && assignedRoleId ? parseInt(assignedRoleId) : undefined,
      due_date: dueDate || undefined,
    };

    const result = await onSubmit(data);
    setIsSubmitting(false);

    if (!result.error) {
      toast({ title: isEdit ? 'Tarea actualizada' : 'Tarea creada', description: data.title });
      resetForm();
      onOpenChange(false);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const content = (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col flex-1 min-h-0"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
          e.preventDefault();
        }
      }}
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 shrink-0 bg-white flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-slate-900">
          {isEdit ? 'Editar Tarea' : 'Nueva Tarea'}
        </h2>
        <button
          type="button"
          onClick={handleClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-4">
        <div className="space-y-3">
          {/* Task info section */}
          <div className="bg-white rounded-xl p-3 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-500">
                <ClipboardCheck className="h-3.5 w-3.5" />
              </div>
              <span className="text-[13px] font-semibold text-slate-700">
                Información de la tarea
              </span>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[12px] text-slate-500 font-normal">
                Título <span className="text-red-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Revisar documentos del Corolla 2024"
                className="h-9 rounded-xl border-slate-200/60 text-[13px]"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[12px] text-slate-500 font-normal">
                Descripción
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles adicionales..."
                rows={3}
                className="rounded-xl border-slate-200/60 text-[13px]"
              />
            </div>
          </div>

          {/* Classification section */}
          <div className="bg-white rounded-xl p-3 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-50 text-amber-600">
                <Tag className="h-3.5 w-3.5" />
              </div>
              <span className="text-[13px] font-semibold text-slate-700">
                Clasificación
              </span>
            </div>

            {/* Priority + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[12px] text-slate-500 font-normal">Prioridad</label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger className="h-9 rounded-xl border-slate-200/60 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] text-slate-500 font-normal">Categoría</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 rounded-xl border-slate-200/60 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Vehicle section */}
          <div className="bg-white rounded-xl p-3 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50 text-emerald-600">
                <Car className="h-3.5 w-3.5" />
              </div>
              <span className="text-[13px] font-semibold text-slate-700">
                Vehículo asociado
              </span>
            </div>

            <div className="relative">
              {vehicleId && vehicleId !== 'none' ? (
                <div className="flex items-center justify-between bg-white border border-slate-200/60 rounded-xl px-3 h-9 text-[13px]">
                  <span className="truncate">
                    {vehicles.find((v: any) => v.id.toString() === vehicleId)?.label || 'Vehículo seleccionado'}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setVehicleId(''); setVehicleSearch(''); }}
                    className="ml-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="w-full flex items-center justify-between bg-white border border-slate-200/60 rounded-xl px-3 h-9 text-[13px] cursor-pointer hover:bg-slate-50"
                  onClick={() => setVehicleDropdownOpen(!vehicleDropdownOpen)}
                >
                  <span className="text-slate-500">Buscar vehículo por marca, modelo o patente...</span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </div>
              )}

              {vehicleDropdownOpen && !vehicleId && (
                <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-slate-200/60 shadow-md">
                  <div className="p-2">
                    <input
                      type="text"
                      value={vehicleSearch}
                      onChange={(e) => setVehicleSearch(e.target.value)}
                      placeholder="Buscar vehículo..."
                      className="w-full px-3 py-2 text-[13px] border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300/40"
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {vehicles
                      .filter((v: any) =>
                        !vehicleSearch || v.label.toLowerCase().includes(vehicleSearch.toLowerCase())
                      )
                      .map((v: any) => (
                        <div
                          key={v.id}
                          className="flex items-center gap-2 px-3 py-2 text-[13px] cursor-pointer hover:bg-slate-50"
                          onClick={() => {
                            setVehicleId(v.id.toString());
                            setVehicleSearch('');
                            setVehicleDropdownOpen(false);
                          }}
                        >
                          <Check className={`h-4 w-4 ${vehicleId === v.id.toString() ? 'opacity-100' : 'opacity-0'}`} />
                          <span className="truncate">{v.label}</span>
                        </div>
                      ))}
                    {vehicles.filter((v: any) =>
                      !vehicleSearch || v.label.toLowerCase().includes(vehicleSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-4 text-[13px] text-slate-400 text-center">
                        No se encontraron vehículos
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assignment section */}
          <div className="bg-white rounded-xl p-3 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-cyan-50 text-cyan-600">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="text-[13px] font-semibold text-slate-700">
                Asignación
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[12px] text-slate-500 font-normal">Asignar a</label>
                <Select value={assignType} onValueChange={(v) => { setAssignType(v as any); setAssignedUserId(''); setAssignedRoleId(''); }}>
                  <SelectTrigger className="h-9 rounded-xl border-slate-200/60 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    <SelectItem value="user">Usuario específico</SelectItem>
                    <SelectItem value="role">Rol</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {assignType === 'user' && (
                <div className="space-y-1.5">
                  <label className="text-[12px] text-slate-500 font-normal">Usuario</label>
                  <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                    <SelectTrigger className="h-9 rounded-xl border-slate-200/60 text-[13px]">
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((m: any) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.first_name} {m.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {assignType === 'role' && (
                <div className="space-y-1.5">
                  <label className="text-[12px] text-slate-500 font-normal">Rol</label>
                  <Select value={assignedRoleId} onValueChange={setAssignedRoleId}>
                    <SelectTrigger className="h-9 rounded-xl border-slate-200/60 text-[13px]">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(r => (
                        <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Due date section */}
          <div className="bg-white rounded-xl p-3 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-violet-50 text-violet-600">
                <CalendarDays className="h-3.5 w-3.5" />
              </div>
              <span className="text-[13px] font-semibold text-slate-700">
                Fecha límite
              </span>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`w-full flex items-center justify-between bg-white border border-slate-200/60 rounded-xl px-3 h-9 text-[13px] hover:bg-slate-50 ${dueDate ? 'text-slate-900' : 'text-slate-500'}`}
                >
                  <span>
                    {dueDate
                      ? new Date(dueDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
                      : 'Seleccionar fecha...'}
                  </span>
                  <div className="flex items-center gap-1">
                    {dueDate && (
                      <span
                        onClick={(e) => { e.stopPropagation(); setDueDate(''); }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <CalendarDays className="h-4 w-4 opacity-50" />
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate ? new Date(dueDate + 'T12:00:00') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      setDueDate(`${year}-${month}-${day}`);
                    } else {
                      setDueDate('');
                    }
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 pb-6 sm:pb-3 border-t border-slate-100 shrink-0 flex gap-2 bg-white">
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          disabled={isSubmitting}
          className="flex-1 rounded-xl text-[12px] h-9 border-slate-200/60"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="flex-1 rounded-xl text-[12px] h-9 bg-sky-400 hover:bg-sky-500 border-0 shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              {isEdit ? 'Guardando...' : 'Creando...'}
            </>
          ) : (
            isEdit ? 'Guardar cambios' : 'Crear Tarea'
          )}
        </Button>
      </div>
    </form>
  );

  return (
    <Drawer open={open} onOpenChange={handleClose} direction="right" dismissible={false}>
      <DrawerContentRight className="bg-[#f5f5f7] p-0 md:min-w-[480px]">
        <DrawerTitle className="sr-only">Nueva Tarea</DrawerTitle>
        <DrawerDescription className="sr-only">Formulario para crear una nueva tarea</DrawerDescription>
        <div className="flex flex-col h-full">
          {content}
        </div>
      </DrawerContentRight>
    </Drawer>
  );
}

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useRoles } from '@/hooks/useRoles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { CreateTaskData, TaskPriority } from '@/types/task';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'operativo', label: 'Operativo' },
  { value: 'documentacion', label: 'Documentación' },
  { value: 'venta', label: 'Venta' },
];

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTaskData) => Promise<{ error: string | null }>;
}

export default function CreateTaskDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateTaskDialogProps) {
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

  // Fetch vehicles (simple list)
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
    setDueDate('');
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    const data: CreateTaskData = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category,
      vehicle_id: vehicleId ? parseInt(vehicleId) : undefined,
      assigned_to_user_id: assignType === 'user' && assignedUserId ? parseInt(assignedUserId) : undefined,
      assigned_to_role_id: assignType === 'role' && assignedRoleId ? parseInt(assignedRoleId) : undefined,
      due_date: dueDate || undefined,
    };

    const result = await onSubmit(data);
    setIsSubmitting(false);

    if (!result.error) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Tarea</DialogTitle>
          <DialogDescription>
            Crea una tarea y asígnala a un usuario o rol
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Título *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Revisar documentos del Corolla 2024"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Descripción</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales..."
              rows={3}
            />
          </div>

          {/* Priority + Category row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
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
              <Label>Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
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

          {/* Vehicle */}
          <div className="space-y-1.5">
            <Label>Vehículo asociado (opcional)</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin vehículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin vehículo</SelectItem>
                {vehicles.map((v: any) => (
                  <SelectItem key={v.id} value={v.id.toString()}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignment */}
          <div className="space-y-1.5">
            <Label>Asignar a</Label>
            <Select value={assignType} onValueChange={(v) => { setAssignType(v as any); setAssignedUserId(''); setAssignedRoleId(''); }}>
              <SelectTrigger>
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
              <Label>Usuario</Label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                <SelectTrigger>
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
              <Label>Rol</Label>
              <Select value={assignedRoleId} onValueChange={setAssignedRoleId}>
                <SelectTrigger>
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

          {/* Due date */}
          <div className="space-y-1.5">
            <Label htmlFor="task-due">Fecha límite (opcional)</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Crear Tarea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

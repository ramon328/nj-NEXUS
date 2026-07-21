import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Role, RoleFormData, PermissionCode } from '@/types/permissions';
import PermissionSelector from './PermissionSelector';
import { Loader2, GitBranch } from 'lucide-react';

interface RoleDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: RoleFormData) => Promise<boolean>;
  role?: Role | null;
  parentRole?: Role | null;
  allRoles?: Role[];
  loading?: boolean;
}

const RoleDialog: React.FC<RoleDialogProps> = ({
  open,
  onClose,
  onSave,
  role,
  parentRole,
  allRoles = [],
  loading = false,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionCode[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});

  const isEditing = !!role;
  const isSystemRole = role?.is_system_role ?? false;
  const isAdminSystemRole = isSystemRole && role?.name === 'Administrador';

  // Reset form when dialog opens/closes or role changes
  useEffect(() => {
    if (open) {
      if (role) {
        setName(role.name);
        setDescription(role.description || '');
        setSelectedParentId(role.parent_role_id || null);
        setSelectedPermissions(
          role.is_system_role && role.name === 'Administrador'
            ? Object.values(PermissionCode)
            : role.permissions
        );
      } else if (parentRole) {
        // Creating sub-role: pre-fill permissions from parent
        setName('');
        setDescription('');
        setSelectedParentId(parentRole.id);
        setSelectedPermissions([...parentRole.permissions]);
      } else {
        setName('');
        setDescription('');
        setSelectedParentId(null);
        setSelectedPermissions([]);
      }
      setErrors({});
    }
  }, [open, role, parentRole]);

  const validate = (): boolean => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (name.length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    } else if (name.length > 50) {
      newErrors.name = 'El nombre no puede tener mas de 50 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    try {
      const success = await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        parent_role_id: selectedParentId,
        permissions: selectedPermissions,
      });

      if (success) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 gap-4">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Rol' : selectedParentId ? 'Crear Sub-rol' : 'Crear Nuevo Rol'}
            </DialogTitle>
            <DialogDescription>
              {isAdminSystemRole
                ? 'El rol Administrador tiene acceso completo y no puede ser modificado.'
                : isSystemRole
                  ? 'Puedes personalizar los permisos de este rol del sistema.'
                  : isEditing
                    ? 'Modifica los detalles y permisos del rol.'
                    : selectedParentId
                      ? 'Crea un sub-rol basado en los permisos del rol seleccionado.'
                      : 'Crea un nuevo rol personalizado con permisos específicos.'}
            </DialogDescription>
          </DialogHeader>

          {/* Fixed fields at top */}
          <div className="space-y-4 shrink-0">
            {/* Rol base (solo para nuevos roles) */}
            {!isEditing && !isSystemRole && (
              <div className="space-y-2">
                <Label htmlFor="parent-role">
                  <span className="flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5" />
                    Rol base
                  </span>
                </Label>
                <Select
                  value={selectedParentId ? String(selectedParentId) : '_none'}
                  onValueChange={(val) => {
                    const newParentId = val === '_none' ? null : parseInt(val);
                    setSelectedParentId(newParentId);
                    // Pre-fill permissions from selected parent
                    if (newParentId) {
                      const parent = allRoles.find((r) => r.id === newParentId);
                      if (parent) setSelectedPermissions([...parent.permissions]);
                    }
                  }}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin rol base (rol independiente)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sin rol base (rol independiente)</SelectItem>
                    {allRoles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedParentId && (
                  <p className="text-xs text-blue-600">
                    Los permisos del rol base se han pre-cargado. Puedes ajustarlos abajo.
                  </p>
                )}
              </div>
            )}

            {/* Nombre del rol */}
            <div className="space-y-2">
              <Label htmlFor="role-name">
                Nombre del Rol <span className="text-red-500">*</span>
              </Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Gerente de Ventas"
                disabled={saving || isSystemRole}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
              {isSystemRole && (
                <p className="text-sm text-amber-600">
                  Los roles del sistema no pueden ser renombrados.
                </p>
              )}
            </div>

            {/* Descripcion */}
            <div className="space-y-2">
              <Label htmlFor="role-description">Descripcion</Label>
              <Textarea
                id="role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe las responsabilidades de este rol..."
                disabled={saving}
                rows={2}
              />
            </div>
          </div>

          {/* Permisos — single scrollable area */}
          <div className="flex flex-col min-h-0 flex-1 gap-2">
            <div className="flex items-center justify-between shrink-0">
              <Label>Permisos</Label>
              <span className="text-xs text-slate-400">
                {selectedPermissions.length} de {Object.values(PermissionCode).length} seleccionados
              </span>
            </div>
            {isAdminSystemRole ? (
              <div className="border rounded-xl p-4 bg-emerald-50/50 text-sm text-emerald-700">
                Este rol del sistema tiene acceso completo a todas las funcionalidades.
                Los permisos no pueden ser modificados.
              </div>
            ) : (
              <div className="border rounded-xl p-4 bg-slate-50/50 overflow-y-auto min-h-0 flex-1">
                <PermissionSelector
                  selectedPermissions={selectedPermissions}
                  onChange={setSelectedPermissions}
                  disabled={saving}
                />
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving}
            >
              {isAdminSystemRole ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!isAdminSystemRole && (
              <Button type="submit" disabled={saving || loading}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : isEditing ? (
                  'Guardar Cambios'
                ) : (
                  'Crear Rol'
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoleDialog;

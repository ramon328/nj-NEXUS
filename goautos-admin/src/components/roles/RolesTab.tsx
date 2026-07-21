import React, { useState } from 'react';
import { useRoles } from '@/hooks/useRoles';
import { usePermissions } from '@/hooks/usePermissions';
import { Role, RoleFormData, PermissionCode, PERMISSION_LABELS } from '@/types/permissions';
import RoleDialog from './RoleDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreVertical, Pencil, Trash2, Shield, Users, Loader2, GitBranch } from 'lucide-react';

interface RolesTabProps {
  createDialogOpen?: boolean;
  onCreateDialogOpenChange?: (open: boolean) => void;
}

const RolesTab: React.FC<RolesTabProps> = ({ createDialogOpen, onCreateDialogOpenChange } = {}) => {
  const { roles, loading, createRole, updateRole, deleteRole } = useRoles();
  const { hasPermission } = usePermissions();
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const dialogOpen = createDialogOpen ?? internalDialogOpen;
  const setDialogOpen = onCreateDialogOpenChange ?? setInternalDialogOpen;
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [parentRoleForCreate, setParentRoleForCreate] = useState<Role | null>(null);

  const canManageRoles = hasPermission(PermissionCode.ROLES_MANAGE);

  // Group roles: top-level (no parent) and their sub-roles
  const topLevelRoles = roles.filter((r) => !r.parent_role_id);
  const getSubRoles = (parentId: number) => roles.filter((r) => r.parent_role_id === parentId);

  const handleCreateRole = () => {
    setSelectedRole(null);
    setParentRoleForCreate(null);
    setDialogOpen(true);
  };

  const handleCreateSubRole = (parentRole: Role) => {
    setSelectedRole(null);
    setParentRoleForCreate(parentRole);
    setDialogOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setDialogOpen(true);
  };

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (roleToDelete) {
      await deleteRole(roleToDelete.id);
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const handleSaveRole = async (data: RoleFormData): Promise<boolean> => {
    if (selectedRole) {
      return await updateRole(selectedRole.id, data);
    } else {
      const result = await createRole(data);
      return result !== null;
    }
  };

  const getPermissionSummary = (permissions: PermissionCode[]): string => {
    if (permissions.length === 0) return 'Sin permisos';
    if (permissions.length <= 3) {
      return permissions.map((p) => PERMISSION_LABELS[p]).join(', ');
    }
    return `${permissions.length} permisos`;
  };

  const renderRoleCard = (role: Role, parentRole?: Role) => (
    <Card key={role.id} className="relative rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border-slate-200/60 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)] transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${parentRole ? 'text-slate-400' : 'text-primary'}`} />
            <CardTitle className="text-[14px] font-semibold text-slate-900">{role.name}</CardTitle>
          </div>
          {canManageRoles && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditRole(role)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                {!parentRole && (
                  <DropdownMenuItem onClick={() => handleCreateSubRole(role)}>
                    <GitBranch className="w-4 h-4 mr-2" />
                    Crear sub-rol
                  </DropdownMenuItem>
                )}
                {!role.is_system_role && (
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(role)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {role.is_system_role && (
            <Badge variant="secondary" className="w-fit text-xs">
              Rol del sistema
            </Badge>
          )}
          {parentRole && (
            <Badge variant="outline" className="w-fit text-xs text-slate-500">
              Sub-rol de {parentRole.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {role.description && (
          <CardDescription className="mb-3">
            {role.description}
          </CardDescription>
        )}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            <Users className="w-4 h-4" />
            <span>{getPermissionSummary(role.permissions)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4">
      {roles.length === 0 ? (
        <Card className="rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border-slate-200/60">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="w-12 h-12 text-slate-300 mb-4" />
            <h4 className="text-[15px] font-semibold text-slate-700 mb-2">
              No hay roles configurados
            </h4>
            <p className="text-[13px] text-slate-500 text-center mb-4">
              Crea roles personalizados para controlar el acceso de los usuarios.
            </p>
            {canManageRoles && (
              <Button className="h-9 rounded-xl text-[13px] font-medium" onClick={handleCreateRole}>
                <Plus className="w-4 h-4 mr-2" />
                Crear primer rol
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {topLevelRoles.map((role) => {
            const subRoles = getSubRoles(role.id);
            return (
              <div key={role.id}>
                {renderRoleCard(role)}
                {subRoles.length > 0 && (
                  <div className="ml-6 mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
                    {subRoles.map((subRole) => renderRoleCard(subRole, role))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog para crear/editar rol */}
      <RoleDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setParentRoleForCreate(null); }}
        onSave={handleSaveRole}
        role={selectedRole}
        parentRole={parentRoleForCreate}
        allRoles={topLevelRoles}
        loading={loading}
      />

      {/* Dialog de confirmacion para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar rol</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estas seguro de que deseas eliminar el rol "{roleToDelete?.name}"?
              Esta accion no se puede deshacer. Asegúrate de que no haya usuarios
              asignados a este rol antes de eliminarlo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RolesTab;

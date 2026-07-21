import { Button } from '@/components/ui/button';
import { User } from '@/types/user';
import { Edit, Trash2, Key, Mail, Building2, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (id: number) => Promise<void>;
  onChangePassword?: (user: User) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: Dispatch<SetStateAction<number>>;
}

// Role badge colors
const getRoleBadgeClass = (rol: string) => {
  switch (rol) {
    case 'superadmin':
      return 'bg-purple-100 text-purple-700 hover:bg-purple-100';
    case 'admin':
      return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
    case 'vendedor':
      return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
    default:
      return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
  }
};

// Mobile Card Component
const UserCard = ({
  user,
  onEdit,
  onDelete,
  onChangePassword,
  isSuperAdmin,
}: {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (id: number) => Promise<void>;
  onChangePassword?: (user: User) => void;
  isSuperAdmin: boolean;
}) => {
  const initials = `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`.toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)] transition-all duration-200 overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary text-[13px] font-medium">
              {initials || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-medium text-slate-900 truncate capitalize">
              {user.first_name} {user.last_name}
            </h3>
            <Badge className={`text-[11px] mt-1 ${getRoleBadgeClass(user.rol)}`}>
              {user.rol}
            </Badge>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onEdit(user)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            {isSuperAdmin && onChangePassword && (
              <DropdownMenuItem onClick={() => onChangePassword(user)}>
                <Key className="h-4 w-4 mr-2" />
                Contraseña
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onDelete(user.id)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-4 pb-4 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <span className="text-[13px] text-slate-600 truncate flex-1">{user.email}</span>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <span className="text-[13px] text-slate-600 truncate flex-1">
              {user.client?.name || 'Sin cliente asignado'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const UserTable = ({
  users,
  onEdit,
  onDelete,
  onChangePassword,
  currentPage,
  totalPages,
  onPageChange,
}: UserTableProps) => {
  const { isSuperadmin: isSuperAdmin, isAdmin, hasPermission } = usePermissions();
  const canManageTeam = isSuperAdmin || isAdmin || hasPermission(PermissionCode.TEAM_MANAGE);
  const { t } = useTranslation('team');

  const Pagination = () => {
    if (!totalPages || totalPages <= 1 || !onPageChange) return null;

    return (
      <div className="flex items-center justify-between p-4 border-t border-slate-100">
        <Button
          onClick={() => onPageChange(currentPage ? currentPage - 1 : 1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
          className="gap-1 h-8 rounded-lg text-[13px] border-slate-200/60"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('userTable.pagination.prev')}</span>
        </Button>
        <span className="text-[13px] text-slate-400">
          {currentPage} / {totalPages}
        </span>
        <Button
          onClick={() => onPageChange(currentPage ? currentPage + 1 : 2)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
          className="gap-1 h-8 rounded-lg text-[13px] border-slate-200/60"
        >
          <span className="hidden sm:inline">{t('userTable.pagination.next')}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 px-4 sm:px-6 pt-3">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            onEdit={onEdit}
            onDelete={onDelete}
            onChangePassword={onChangePassword}
            isSuperAdmin={isSuperAdmin}
          />
        ))}
        {users.length === 0 && (
          <div className="text-center py-8 text-[13px] text-slate-400">
            {t('userTable.empty')}
          </div>
        )}
        <Pagination />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden mx-4 sm:mx-6 lg:mx-8 mt-3 sm:mt-4 rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 hover:bg-transparent">
              <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3">
                {t('userTable.headers.name')}
              </TableHead>
              <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3">
                {t('userTable.headers.email')}
              </TableHead>
              <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3">
                {t('userTable.headers.role')}
              </TableHead>
              {isSuperAdmin && (
                <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3">
                  {t('userTable.headers.client')}
                </TableHead>
              )}
              {canManageTeam && (
                <TableHead className="text-right bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3">
                  {t('userTable.headers.actions')}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const initials = `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`.toUpperCase();

              return (
                <TableRow
                  key={user.id}
                  className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0"
                >
                  <TableCell className="px-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-[12px]">
                          {initials || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[13px] font-medium text-slate-900 capitalize">
                        {user.first_name} {user.last_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3">
                    <span className="text-[13px] text-slate-600">{user.email}</span>
                  </TableCell>
                  <TableCell className="px-3">
                    <Badge className={`text-[11px] ${getRoleBadgeClass(user.rol)}`}>
                      {user.rol}
                    </Badge>
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell className="px-3">
                      <span className="text-[13px] text-slate-600">
                        {user.client?.name || (
                          <span className="text-slate-400">{t('userTable.noClient')}</span>
                        )}
                      </span>
                    </TableCell>
                  )}
                  {canManageTeam && (
                    <TableCell className="py-2 px-3 align-middle text-right">
                      <div className="flex justify-end gap-1">
                        {isSuperAdmin && onChangePassword && (
                          <button
                            onClick={() => onChangePassword(user)}
                            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors duration-150"
                            title={t('userTable.tooltips.changePassword')}
                            type="button"
                          >
                            <Key className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(user)}
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-150"
                          title={t('userTable.tooltips.edit')}
                          type="button"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(user.id)}
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
                          title={t('userTable.tooltips.delete')}
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {users.length === 0 && (
          <div className="text-center py-8 text-[13px] text-slate-400">
            {t('userTable.empty')}
          </div>
        )}
        <Pagination />
      </div>
    </>
  );
};

export default UserTable;

import React from 'react';
import { User } from '@/types/user';
import { Edit, Trash2 } from 'lucide-react';
import { useDealerships } from '@/hooks/useDealerships';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface GenericRoleTabProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (id: number) => Promise<void>;
  onCreateUser?: () => void;
  roleName: string;
}

const GenericRoleTab: React.FC<GenericRoleTabProps> = ({
  users,
  onEdit,
  onDelete,
  roleName,
}) => {
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null);
  const { dealerships } = useDealerships();
  // La columna de sede solo aparece si el tenant tiene mas de una sede.
  const showDealershipCol = dealerships.length > 1;
  const dealershipsById = React.useMemo(
    () => new Map(dealerships.map((d) => [d.id, d])),
    [dealerships]
  );
  const dealershipLabel = (id: number) => {
    const d = dealershipsById.get(id);
    return d ? d.name || d.address || `Sede ${id}` : `Sede ${id}`;
  };

  const handleDeleteClick = (user: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setUserToDelete(user);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      onDelete(userToDelete.id);
    }
    setUserToDelete(null);
  };

  return (
    <>
      <div className='mx-4 sm:mx-6 lg:mx-8 mt-3 sm:mt-4 rounded-2xl overflow-hidden shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60'>
        {users.length === 0 ? (
          <div className='p-8 text-center'>
            <p className='text-[13px] text-slate-400'>
              No hay usuarios con el rol "{roleName}"
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className='border-b border-slate-100'>
                <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3'>
                  Nombre
                </TableHead>
                <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3'>
                  Email
                </TableHead>
                <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3'>
                  Teléfono
                </TableHead>
                <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3'>
                  Rol
                </TableHead>
                {showDealershipCol && (
                  <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3'>
                    Sede(s)
                  </TableHead>
                )}
                <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3 text-right'>
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className='border-b border-slate-100 hover:bg-slate-50/50 transition-colors'
                >
                  <TableCell className='text-[13px] font-medium text-slate-900'>
                    {`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Sin nombre'}
                  </TableCell>
                  <TableCell className='text-[13px] text-slate-600'>
                    {user.email}
                  </TableCell>
                  <TableCell className='text-[13px] text-slate-600'>
                    {user.phone || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className='text-[11px] bg-slate-100 text-slate-700 hover:bg-slate-100'>
                      {user.rol}
                    </Badge>
                  </TableCell>
                  {showDealershipCol && (
                    <TableCell>
                      {user.dealership_ids && user.dealership_ids.length > 0 ? (
                        <div className='flex flex-wrap gap-1'>
                          {user.dealership_ids.map((id) => (
                            <Badge
                              key={id}
                              className='text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-50 font-normal'
                            >
                              {dealershipLabel(id)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className='text-[12px] text-slate-400'>Todas</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className='py-2 px-3 align-middle text-right'>
                    <div className='flex justify-end gap-1'>
                      <button
                        onClick={() => onEdit(user)}
                        className='flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-150'
                        title='Editar'
                        type='button'
                      >
                        <Edit className='h-3.5 w-3.5' />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(user, e)}
                        className='flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-150'
                        title='Eliminar'
                        type='button'
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AlertDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a {userToDelete ? `${userToDelete.first_name || ''} ${userToDelete.last_name || ''}`.trim() : ''}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={confirmDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GenericRoleTab;

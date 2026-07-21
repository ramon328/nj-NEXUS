import React, { useState } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Edit, Eye, Trash2, MoreVertical, TrendingDown, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import TransactionForm from '@/components/vehicle/detail/transactions/TransactionForm';
import { TransactionFormValues } from '@/components/vehicle/detail/transactions/types';
import { addVehicleTransaction } from '@/components/vehicle/detail/transactions/api/transactionService';
import { uploadVehicleDocuments } from '@/components/vehicle/detail/transactions/api/documentUploadService';
import { toast } from 'sonner';
import StatusBadge from './StatusBadge';
import { Icon } from '@iconify/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Vehicle } from '@/types/vehicle';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import VehicleSellerEditDialog from './VehicleSellerEditDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VehicleTableRowProps {
  vehicle: Vehicle;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  hideColumns?: boolean;
  daysInStock: number;
}

const VehicleTableRow = ({
  vehicle: initialVehicle,
  onView,
  onEdit,
  onDelete,
  hideColumns = false,
  daysInStock,
}: VehicleTableRowProps) => {
  const { hasPermission } = usePermissions();
  const canEditAdvanced = hasPermission(PermissionCode.VEHICLES_EDIT);
  const [showSellerDialog, setShowSellerDialog] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle>(initialVehicle);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpenseSheetOpen, setIsExpenseSheetOpen] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const formRef = React.useRef<HTMLFormElement>(null);

  const isExpenseDisabled = isSubmittingExpense || uploadingFiles;

  // Check if vehicle is sold
  const isVehicleSold = vehicle.status_id === 3 ||
    vehicle.status?.name?.toLowerCase() === 'vendido' ||
    vehicle.status?.name?.toLowerCase() === 'sold';

  const handleSellerEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canEditAdvanced) {
      setShowSellerDialog(true);
    }
  };

  const handleSellerUpdate = (updatedVehicle: Vehicle) => {
    // Actualizar el vehículo con los datos del vendedor actualizados
    setVehicle(updatedVehicle);
    setShowSellerDialog(false);
  };

  // Handler para submit de gasto
  const handleExpenseSubmit = async (values: TransactionFormValues) => {
    if (isSubmittingExpense) return;

    try {
      setIsSubmittingExpense(true);
      setUploadingFiles(true);
      const docUrls = await uploadVehicleDocuments(vehicle.id, values.documents || null);
      const success = await addVehicleTransaction(vehicle.id, values, docUrls);

      if (success) {
        setIsExpenseSheetOpen(false);
        toast.success('Gasto agregado exitosamente');
      } else {
        toast.error('Error al agregar gasto');
      }
    } catch (error) {
      toast.error('Error al agregar gasto');
    } finally {
      setUploadingFiles(false);
      setIsSubmittingExpense(false);
    }
  };

  const handleExpenseFormSubmit = () => {
    if (isSubmittingExpense) return;
    setIsSubmittingExpense(true);
    if (formRef.current) {
      formRef.current.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    }
  };

  const handleExpenseSheetOpenChange = (open: boolean) => {
    if (!isExpenseDisabled) {
      setIsExpenseSheetOpen(open);
    }
  };

  return (
    <>
      <TableRow
        className='hover:bg-muted/50 transition-colors cursor-pointer py-1 text-xs sm:text-sm border-b border-b-transparent'
        onClick={() => onView(vehicle.id)}
      >
        {!hideColumns && (
          <TableCell className='font-medium hidden sm:table-cell'>
            {vehicle.id}
          </TableCell>
        )}
        <TableCell>
          <div className='flex items-center gap-2 py-1'>
            {vehicle.main_image && (
              <img
                src={vehicle.main_image}
                alt={`${vehicle.brand?.name || ''} ${
                  vehicle.model?.name || ''
                }`}
                className='w-7 h-7 sm:w-12 sm:h-12 rounded-md object-cover'
              />
            )}
            <div>
              <div className='font-medium text-xs sm:text-sm'>
                {[vehicle.brand?.name, vehicle.model?.name]
                  .filter(Boolean)
                  .join(' ')}
              </div>
              <div className='text-[10px] sm:text-xs text-muted-foreground'>
                {vehicle.year}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <span className='text-xs sm:text-sm text-muted-foreground py-1'>
            {vehicle.license_plate || '—'}
          </span>
        </TableCell>
        <TableCell className='font-medium'>
          <span className='py-1 text-xs sm:text-sm'>
            ${vehicle.price?.toLocaleString() || '—'}
          </span>
        </TableCell>
        {!hideColumns && (
          <TableCell className='hidden sm:table-cell'>
            <span className='text-xs sm:text-sm text-muted-foreground'>
              {vehicle.category?.name || '—'}
            </span>
          </TableCell>
        )}
        <TableCell>
          <div className='py-1'>
            {vehicle.status?.name === 'Revisión Mecánica' ? (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <StatusBadge
                        status='Revisión'
                        color={vehicle.status?.color}
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side='top' className='text-xs'>
                    Revisión Mecánica
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <StatusBadge
                status={vehicle.status?.name || 'Desconocido'}
                color={vehicle.status?.color}
              />
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className='py-1'>
            {canEditAdvanced ? (
              <button
                onClick={handleSellerEdit}
                className='text-xs sm:text-sm hover:text-primary/80 hover:underline transition-colors text-muted-foreground'
                title='Cambiar vendedor'
              >
                {vehicle.seller_id
                  ? vehicle.seller
                    ? `${vehicle.seller.first_name} ${vehicle.seller.last_name}`
                    : `ID: ${vehicle.seller_id}`
                  : 'No Asignado'}
              </button>
            ) : (
              <span className='text-xs sm:text-sm text-muted-foreground'>
                {vehicle.seller_id
                  ? vehicle.seller
                    ? `${vehicle.seller.first_name} ${vehicle.seller.last_name}`
                    : `ID: ${vehicle.seller_id}`
                  : 'No Asignado'}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <span
            className={`text-xs sm:text-sm ${
              vehicle.is_consigned
                ? 'text-muted-foreground font-medium'
                : 'text-muted-foreground'
            } py-1`}
          >
            {vehicle.is_consigned ? 'Sí' : 'No'}
          </span>
        </TableCell>
        <TableCell className='whitespace-nowrap hidden sm:table-cell'>
          <span className='text-xs sm:text-sm text-muted-foreground py-1'>
            {daysInStock}
          </span>
        </TableCell>
        {!hideColumns && (
          <>
            <TableCell className='hidden sm:table-cell'>
              <span className='text-xs sm:text-sm text-muted-foreground'>
                {vehicle.views || 0}
              </span>
            </TableCell>
          </>
        )}
        <TableCell>
          <div
            className='flex justify-end gap-0.5'
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant='ghost'
              size='icon'
              onClick={() => onView(vehicle.id)}
              className='hover:text-primary p-1'
            >
              <Eye className='h-3 w-3 sm:h-4 sm:w-4' />
            </Button>

            {canEditAdvanced && (
              <>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => onEdit(vehicle.id)}
                  className='hover:text-primary p-1'
                >
                  <Edit className='h-3 w-3 sm:h-4 sm:w-4' />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='hover:text-destructive p-1'
                    >
                      <Trash2 className='h-3 w-3 sm:h-4 sm:w-4' />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará
                        permanentemente el vehículo de la base de datos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(vehicle.id)}
                        className='bg-destructive text-destructive-foreground'
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {/* Quick Actions Dropdown - only show if not sold */}
            {!isVehicleSold && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='hover:text-primary p-1'
                  >
                    <MoreVertical className='h-3 w-3 sm:h-4 sm:w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-48'>
                  <DropdownMenuItem
                    onClick={() => setIsExpenseSheetOpen(true)}
                    className='gap-2 py-2'
                  >
                    <TrendingDown className='h-4 w-4 text-red-600' />
                    <span>Añadir Gasto</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Diálogo para editar el vendedor */}
      {showSellerDialog && canEditAdvanced && (
        <VehicleSellerEditDialog
          open={showSellerDialog}
          onClose={() => setShowSellerDialog(false)}
          vehicle={vehicle}
          onSuccess={handleSellerUpdate}
        />
      )}

      {/* Expense Sheet */}
      <Sheet open={isExpenseSheetOpen} onOpenChange={handleExpenseSheetOpenChange}>
        <SheetContent className="flex w-full flex-col sm:max-w-md md:max-w-lg">
          <div className="absolute right-4 top-4">
            {isExpenseDisabled ? (
              <button
                className="rounded-sm opacity-50 ring-offset-background transition-opacity disabled:pointer-events-none cursor-not-allowed"
                disabled={true}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            ) : (
              <button
                onClick={() => setIsExpenseSheetOpen(false)}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            )}
          </div>

          <SheetHeader className="mb-5">
            <SheetTitle className="text-2xl">Añadir Gasto</SheetTitle>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <TransactionForm
              formRef={formRef}
              onSubmit={handleExpenseSubmit}
              onCancel={() => !isExpenseDisabled && setIsExpenseSheetOpen(false)}
              isUploading={isExpenseDisabled}
              initialType="expense"
            />
          </div>

          <div className="mt-6 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsExpenseSheetOpen(false)}
              disabled={isExpenseDisabled}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExpenseFormSubmit}
              disabled={isExpenseDisabled}
              className="flex-1"
            >
              {isExpenseDisabled ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default VehicleTableRow;

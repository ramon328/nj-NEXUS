import React, { useState, useEffect } from 'react';
import { TableCell } from '@/components/ui/table';
import {
  Edit,
  Eye,
  Trash2,
  MoreVertical,
  TrendingDown,
  X,
  Loader2,
  Calendar,
  FileText,
  DollarSign,
  FileDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Vehicle } from '@/types/vehicle';
import { useI18n } from '@/hooks/useI18n';
import TransactionForm from '@/components/vehicle/detail/transactions/TransactionForm';
import { TransactionFormValues } from '@/components/vehicle/detail/transactions/types';
import { addVehicleTransaction } from '@/components/vehicle/detail/transactions/api/transactionService';
import { uploadVehicleDocuments } from '@/components/vehicle/detail/transactions/api/documentUploadService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import QuotationForm from '@/components/vehicle/QuotationForm';
import VehicleReservationDialog from '@/components/vehicle/detail/reservations/VehicleReservationDialog';
import VehicleSaleCreateEditDialog from '@/components/vehicle/detail/sales-2/VehicleSaleCreateEditDialog';
import { useAuth } from '@/contexts/AuthContext';
import { downloadVehicleSpecSheet } from '@/utils/vehicleSpecSheet';

interface VehicleTableActionsProps {
  vehicle: Vehicle;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const VehicleTableActions: React.FC<VehicleTableActionsProps> = ({
  vehicle,
  onView,
  onEdit,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpenseSheetOpen, setIsExpenseSheetOpen] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [hasActiveReservation, setHasActiveReservation] = useState(false);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);
  const { tCommon } = useI18n();
  const { clientId } = useAuth();

  const handleDownloadSpecSheet = async () => {
    if (!vehicle.id || isGeneratingSheet) return;
    setIsGeneratingSheet(true);
    const toastId = toast.loading('Generando ficha técnica...');
    try {
      await downloadVehicleSpecSheet(vehicle.id, clientId);
      toast.success('Ficha técnica descargada', { id: toastId });
    } catch (error) {
      console.error('Error generando ficha técnica:', error);
      toast.error('No se pudo generar la ficha técnica', { id: toastId });
    } finally {
      setIsGeneratingSheet(false);
    }
  };

  const formRef = React.useRef<HTMLFormElement>(null);
  const isExpenseDisabled = isSubmittingExpense || uploadingFiles;

  // Check if vehicle is sold
  const isVehicleSold = vehicle.status_id === 3 ||
    vehicle.status?.name?.toLowerCase() === 'vendido' ||
    vehicle.status?.name?.toLowerCase() === 'sold';

  // Check for active reservation
  useEffect(() => {
    const checkActiveReservation = async () => {
      if (!vehicle?.id) return;

      try {
        const { data: reservationData, error } = await supabase
          .from('vehicles_reservations')
          .select('id, status')
          .eq('vehicle_id', vehicle.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!error && reservationData) {
          setHasActiveReservation(true);
        }
      } catch (error) {
        console.error('Error checking active reservation:', error);
      }
    };

    checkActiveReservation();
  }, [vehicle?.id]);

  const handleDelete = async () => {
    if (!vehicle.id) return;

    setIsDeleting(true);
    try {
      await onDelete(vehicle.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (vehicle.id) {
      onEdit(vehicle.id);
    }
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (vehicle.id) {
      onView(vehicle.id);
    }
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
    <TableCell
      className='text-right px-4 py-2.5'
      onClick={(e) => e.stopPropagation()}
    >
      <div className='flex items-center justify-end gap-0.5'>
        <button
          onClick={handleView}
          className='w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-colors'
        >
          <Eye className='h-3.5 w-3.5' />
        </button>
        <button
          onClick={handleEdit}
          className='w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors'
        >
          <Edit className='h-3.5 w-3.5' />
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className='w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors'
              onClick={(e) => e.stopPropagation()}
            >
              <Trash2 className='h-3.5 w-3.5' />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {tCommon('vehicles.actions.deleteConfirmTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {tCommon('vehicles.actions.deleteConfirmDescription').replace(
                  '{{vehicle}}',
                  [vehicle.brand?.name, vehicle.model?.name, vehicle.year]
                    .filter(Boolean)
                    .join(' ')
                )}
              </AlertDialogDescription>
              <p className='text-[13px] text-amber-600 font-medium mt-1'>
                {tCommon('vehicles.actions.deleteMarketplaceWarning')}
              </p>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tCommon('buttons.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className='bg-red-600 hover:bg-red-700'
              >
                {isDeleting
                  ? tCommon('actions.deleting')
                  : tCommon('buttons.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Quick Actions Dropdown */}
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className='w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors'
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className='h-3.5 w-3.5' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-48 p-1.5' onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={() => setIsReservationDialogOpen(true)}
                className='gap-2.5 py-2 px-3 rounded-lg text-[13px] cursor-pointer'
              >
                <Calendar className='h-4 w-4 text-slate-400' />
                <span>
                  {hasActiveReservation
                    ? tCommon('vehicles.detail.viewReservation')
                    : tCommon('vehicles.detail.generateReservation')}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsQuoteModalOpen(true)}
                className='gap-2.5 py-2 px-3 rounded-lg text-[13px] cursor-pointer'
              >
                <FileText className='h-4 w-4 text-slate-400' />
                <span>{tCommon('vehicles.detail.generateQuotation')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDownloadSpecSheet}
                disabled={isGeneratingSheet}
                className='gap-2.5 py-2 px-3 rounded-lg text-[13px] cursor-pointer'
              >
                {isGeneratingSheet ? (
                  <Loader2 className='h-4 w-4 text-slate-400 animate-spin' />
                ) : (
                  <FileDown className='h-4 w-4 text-slate-400' />
                )}
                <span>Descargar ficha técnica</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsExpenseSheetOpen(true)}
                className='gap-2.5 py-2 px-3 rounded-lg text-[13px] cursor-pointer'
              >
                <TrendingDown className='h-4 w-4 text-slate-400' />
                <span>{tCommon('vehicles.detail.addExpense')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className='my-1' />
              <DropdownMenuItem
                onClick={() => setIsSaleDialogOpen(true)}
                className='gap-2.5 py-2 px-3 rounded-lg text-[13px] cursor-pointer'
              >
                <DollarSign className='h-4 w-4 text-slate-400' />
                <span>{tCommon('vehicles.detail.sellVehicle')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>

      {/* Expense Sheet */}
      <Sheet open={isExpenseSheetOpen} onOpenChange={handleExpenseSheetOpenChange}>
        <SheetContent
          className="flex w-full flex-col sm:max-w-md md:max-w-lg"
          onClick={(e) => e.stopPropagation()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
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
            <SheetTitle className="text-2xl">{tCommon('vehicles.detail.addExpense')}</SheetTitle>
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
              {tCommon('buttons.cancel')}
            </Button>
            <Button
              onClick={handleExpenseFormSubmit}
              disabled={isExpenseDisabled}
              className="flex-1"
            >
              {isExpenseDisabled ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tCommon('actions.saving')}
                </>
              ) : (
                tCommon('buttons.save')
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Quotation Modal */}
      <Dialog open={isQuoteModalOpen} onOpenChange={setIsQuoteModalOpen}>
        <DialogContent className="sm:max-w-[500px]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{tCommon('vehicles.detail.generateQuotation')}</DialogTitle>
          </DialogHeader>
          <QuotationForm
            vehicleId={vehicle.id}
            onSuccess={() => setIsQuoteModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Reservation Dialog */}
      <VehicleReservationDialog
        isOpen={isReservationDialogOpen}
        onClose={() => setIsReservationDialogOpen(false)}
        vehicle={vehicle}
        onSuccess={() => setIsReservationDialogOpen(false)}
      />

      {/* Sale Dialog */}
      <VehicleSaleCreateEditDialog
        isOpen={isSaleDialogOpen}
        onClose={() => setIsSaleDialogOpen(false)}
        vehicle={vehicle}
        onSuccess={() => {
          setIsSaleDialogOpen(false);
          window.location.reload();
        }}
      />
    </TableCell>
  );
};

export default VehicleTableActions;

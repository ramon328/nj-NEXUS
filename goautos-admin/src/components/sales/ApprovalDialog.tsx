import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { getStatusBadge } from './dialog/SaleStatus';
import { SaleInfo } from './dialog/SaleInfo';
import { DialogActions } from './dialog/DialogActions';
import CommissionFields from './CommissionFields';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import { useI18n } from '@/hooks/useI18n';
import { CommissionSplitInput } from '@/types/sales';
import { X, Car } from 'lucide-react';

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSale: any;
  commissionAmount: number;
  setCommissionAmount: (amount: number) => void;
  commissionPercentage: number;
  setCommissionPercentage: (percentage: number) => void;
  approvalNotes: string;
  setApprovalNotes: (notes: string) => void;
  handleApprove: (approved: boolean, isUpdateOnly?: boolean) => Promise<boolean>;
  handleRevert?: (reason: string) => Promise<boolean>;
  handleToggleFinancingSettled?: (settled: boolean) => Promise<boolean>;
  commissionBaseType: 'total' | 'margin';
  setCommissionBaseType: (type: 'total' | 'margin') => void;
  // Commission splits
  commissionSplits?: CommissionSplitInput[];
  onCommissionSplitsChange?: (splits: CommissionSplitInput[]) => void;
}

const ApprovalDialog = ({
  open,
  onOpenChange,
  selectedSale,
  commissionAmount,
  setCommissionAmount,
  commissionPercentage,
  setCommissionPercentage,
  approvalNotes,
  setApprovalNotes,
  handleApprove,
  handleRevert,
  handleToggleFinancingSettled,
  commissionBaseType,
  setCommissionBaseType,
  commissionSplits = [],
  onCommissionSplitsChange,
}: ApprovalDialogProps) => {
  const { tCommon } = useI18n();
  const { userRole, clientId } = useAuth();
  const { isAdmin, isSuperadmin, hasPermission } = usePermissions();
  const { users } = useUsers(userRole, clientId?.toString());
  // Include users with seller/vendedor rol OR any user with role_ids assigned (multi-role)
  const sellerUsers = users.filter((user) =>
    user.rol === 'seller' || user.rol === 'vendedor' || (user.role_ids && user.role_ids.length > 0)
  );
  // All users are eligible for commission splits
  const splitEligibleUsers = users;
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasSellerChanged, setHasSellerChanged] = useState(false);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const [revertReason, setRevertReason] = useState('');
  const [isReverting, setIsReverting] = useState(false);

  useEffect(() => {
    if (selectedSale?.seller_id) {
      setSelectedSellerId(selectedSale.seller_id.toString());
    } else {
      setSelectedSellerId('_none');
    }
    setHasSellerChanged(false);
  }, [selectedSale]);

  useEffect(() => {
    if (selectedSale && selectedSellerId) {
      const newSellerId =
        selectedSellerId === '_none' ? null : parseInt(selectedSellerId);
      if (selectedSale.seller_id !== newSellerId) {
        selectedSale.seller_id = newSellerId;
        setHasSellerChanged(true);
      }
    }
  }, [selectedSellerId, selectedSale]);

  const handleUpdateSale = async () => {
    if (!selectedSale) return;

    setIsUpdating(true);

    try {
      // Solo actualizar la información de la venta, NO cambiar el estado
      const updateData: any = {
        seller_id:
          selectedSellerId === '_none' ? null : parseInt(selectedSellerId),
        commission_amount: commissionAmount,
        commission_percentage: commissionPercentage,
      };

      // Si hay observaciones, también las guardamos
      if (approvalNotes) {
        updateData.approval_notes = approvalNotes;
      }

      // Llamar a la función de actualización (no de aprobación)
      const success = await handleApprove(true, true); // true, true = es aprobación pero solo actualización
      setIsUpdating(false);

      if (success) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error updating sale:', error);
      setIsUpdating(false);
    }
  };

  if (!selectedSale) return null;

  // Configura comisión: admin/superadmin legacy, o cualquier rol con permiso de
  // editar ventas. El isAdmin legacy es false para un admin que además tiene un
  // rol personalizado asignado (multi-rol), así que sumamos el fallback por
  // permiso para no bloquearlo en la aprobación de venta.
  const showCommission =
    (isAdmin || isSuperadmin || hasPermission(PermissionCode.SALES_EDIT)) &&
    ((selectedSellerId && selectedSellerId !== '_none') ||
      selectedSale?.status === 'approved');

  const vehicle = selectedSale.vehicle;
  const customer = selectedSale.customer;
  const brandName = vehicle?.brand?.name || vehicle?.brand || '';
  const modelName = vehicle?.model?.name || vehicle?.model || '';
  const vehicleName = vehicle
    ? `${brandName} ${modelName} (${vehicle.year || ''})`.trim()
    : 'Vehículo';
  const licensePlate = vehicle?.license_plate || vehicle?.patent || '';
  const customerName = customer
    ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
    : '';

  const onRevertClick = () => {
    setRevertReason('');
    setRevertConfirmOpen(true);
  };

  const confirmRevert = async () => {
    if (!handleRevert) return;
    setIsReverting(true);
    const success = await handleRevert(revertReason.trim());
    setIsReverting(false);
    if (success) {
      setRevertConfirmOpen(false);
      onOpenChange(false);
    }
  };

  return (
    <>
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContentRight className="bg-[#f5f5f7] p-0 md:min-w-[560px]">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          {/* Header */}
          <div className="bg-white px-5 py-4 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                <Car className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h2 className="text-[16px] font-semibold text-slate-900 tracking-tight truncate leading-tight">
                  {vehicleName}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {licensePlate && (
                    <span className="text-[11px] text-slate-400">{licensePlate}</span>
                  )}
                  {licensePlate && customerName && (
                    <span className="text-slate-200">·</span>
                  )}
                  {customerName && (
                    <span className="text-[11px] text-slate-400">{customerName}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {getStatusBadge(selectedSale.status, tCommon)}
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            <SaleInfo
              vehicle={vehicle}
              customer={customer}
              salePrice={selectedSale.sale_price}
              paymentMethod={selectedSale.payment_method}
              financiera={selectedSale.financiera}
              selectedSellerId={selectedSellerId}
              onSellerChange={setSelectedSellerId}
              sellerUsers={sellerUsers}
            />

            {/* Cuenta por cobrar de la financiera (ventas a crédito). */}
            {selectedSale.payment_method === 'credit' && handleToggleFinancingSettled && (
              <div className='rounded-xl border border-slate-200/60 bg-white p-3 flex items-center justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='text-[12px] font-medium text-slate-700'>Pago de la financiera</p>
                  <p className='text-[11px] text-slate-500'>
                    {selectedSale.financiera ? `${selectedSale.financiera} · ` : ''}
                    {selectedSale.financing_settled ? '✅ Recibido' : '⏳ Pendiente de cobro'}
                  </p>
                </div>
                {(isAdmin || isSuperadmin || hasPermission(PermissionCode.SALES_EDIT)) && (
                  <Button
                    variant={selectedSale.financing_settled ? 'outline' : 'default'}
                    size='sm'
                    className='shrink-0 h-8 text-xs'
                    onClick={() =>
                      handleToggleFinancingSettled(!selectedSale.financing_settled)
                    }
                  >
                    {selectedSale.financing_settled ? 'Marcar pendiente' : 'Marcar cobrado'}
                  </Button>
                )}
              </div>
            )}

            <CommissionFields
              showCommission={showCommission}
              commissionAmount={commissionAmount}
              setCommissionAmount={setCommissionAmount}
              commissionPercentage={commissionPercentage}
              setCommissionPercentage={setCommissionPercentage}
              salePrice={selectedSale?.sale_price || 0}
              acquisitionCost={selectedSale?.acquisition_cost || 0}
              isConsigned={!!vehicle?.is_consigned}
              commissionBaseType={commissionBaseType}
              setCommissionBaseType={setCommissionBaseType}
              enableSplits={!!onCommissionSplitsChange}
              splits={commissionSplits}
              onSplitsChange={onCommissionSplitsChange}
              availableUsers={splitEligibleUsers}
            />

            {/* Notes input (pending) */}
            {selectedSale.status === 'pending' && (
              <div className="bg-white rounded-xl p-4 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60">
                <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-3">
                  {tCommon('sales.dialog.notesLabel')}
                </h4>
                <Input
                  placeholder={tCommon('sales.dialog.notesPlaceholder')}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className='h-9 text-[13px] rounded-xl border-slate-200/60'
                />
              </div>
            )}

            {/* Existing notes (non-pending) */}
            {selectedSale.approval_notes && selectedSale.status !== 'pending' && (
              <div className="bg-white rounded-xl p-4 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60">
                <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-3">
                  {tCommon('sales.dialog.notesLabel')}
                </h4>
                <p className='text-[12px] text-slate-700'>
                  {selectedSale.approval_notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 pb-6 sm:pb-3 border-t border-slate-100 bg-white">
          <DialogActions
            status={selectedSale.status}
            isUpdating={isUpdating}
            onClose={() => onOpenChange(false)}
            onReject={async () => {
              const success = await handleApprove(false);
              if (success) onOpenChange(false);
            }}
            onApprove={async () => {
              const success = await handleApprove(true);
              if (success) onOpenChange(false);
            }}
            onSave={handleUpdateSale}
            onRevert={handleRevert ? onRevertClick : undefined}
          />
        </div>
      </DrawerContentRight>
    </Drawer>

    <AlertDialog open={revertConfirmOpen} onOpenChange={setRevertConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Devolver venta a pendiente</AlertDialogTitle>
          <AlertDialogDescription>
            La venta volverá al estado <strong>pendiente</strong> y el vehículo
            quedará nuevamente <strong>publicado</strong>. Vas a poder corregir
            lo que falta y aprobarla de nuevo. ¿Quieres continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
            Motivo (opcional)
          </label>
          <Textarea
            placeholder="Ej: faltó cargar la financiera"
            value={revertReason}
            onChange={(e) => setRevertReason(e.target.value)}
            rows={3}
            maxLength={500}
            className="mt-1.5 text-[13px] rounded-xl border-slate-200/60"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isReverting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isReverting}
            onClick={(e) => {
              e.preventDefault();
              confirmRevert();
            }}
            className="bg-red-500 hover:bg-red-600"
          >
            {isReverting ? 'Devolviendo…' : 'Devolver a pendiente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default ApprovalDialog;

import React, { useState, useEffect } from 'react';
import { TableCell } from '@/components/ui/table';
import { Vehicle } from '@/types/vehicle';
import { VehicleColumn } from './TableColumnSelector';
import StatusBadge from './StatusBadge';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import { getVehicleRegimen, REGIMEN_LABELS } from '@/utils/vehicleRegimen';
import { useCurrency } from '@/hooks/useCurrency';
import VehicleSellerEditDialog from './VehicleSellerEditDialog';
import { useVehicleFinancialData } from '@/hooks/useVehicleFinancialData';
import { useI18n } from '@/hooks/useI18n';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Car, Check, X, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ChecklistSummary } from '@/types/vehicleChecklist';

interface DynamicTableCellProps {
  vehicle: Vehicle;
  column: VehicleColumn;
  daysInStock?: number;
  onVehicleUpdate?: (updatedVehicle: Vehicle) => void;
  checklistSummary?: ChecklistSummary;
}

const DynamicTableCell: React.FC<DynamicTableCellProps> = ({
  vehicle,
  column,
  daysInStock,
  onVehicleUpdate,
  checklistSummary,
}) => {
  const { clientId, client } = useAuth();
  const { hasPermission } = usePermissions();
  const { formatPrice } = useCurrency();
  const { tCommon } = useI18n();
  const { toast } = useToast();
  const canEditAdvanced = hasPermission(PermissionCode.VEHICLES_EDIT);
  const [showSellerDialog, setShowSellerDialog] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle>(vehicle);
  const [salePrice, setSalePrice] = useState<number | null>(null);
  const [purchasePrice, setPurchasePrice] = useState<number | null>(null);
  const [commissionAmount, setCommissionAmount] = useState<number | null>(null);
  const [acquiredFromName, setAcquiredFromName] = useState<string | null>(null);
  const [consignmentSellerName, setConsignmentSellerName] = useState<string | null>(null);

  // Estados para edición de días en stock
  const [isEditingDaysInStock, setIsEditingDaysInStock] = useState(false);
  const [editingDaysValue, setEditingDaysValue] = useState<string>('');
  const [isUpdatingDays, setIsUpdatingDays] = useState(false);

  // Sincronizar currentVehicle cuando cambie el prop vehicle
  useEffect(() => {
    setCurrentVehicle(vehicle);
  }, [vehicle]);

  // Hook para calcular utilidad neta (solo si es necesario)
  const {
    totalExpenses,
    totalIncome,
    netResult,
    saleData,
    commissionSplits,
    isLoading: profitLoading,
  } = useVehicleFinancialData(
    column.field === 'net_profit' || column.field === 'net_profit_after_commission' || column.field === 'total_expenses' ? currentVehicle.id || 0 : 0,
    currentVehicle.is_consigned || false
  );

  const handleSellerEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canEditAdvanced) {
      setShowSellerDialog(true);
    }
  };

  const handleSellerUpdate = (updatedVehicle: Vehicle) => {
    setCurrentVehicle(updatedVehicle);
    setShowSellerDialog(false);
    onVehicleUpdate?.(updatedVehicle);
  };

  const handleSellerDialogClose = () => {
    setShowSellerDialog(false);
  };

  // Funciones para edición de días en stock
  const handleEditDaysInStock = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEditAdvanced) return;

    setIsEditingDaysInStock(true);
    setEditingDaysValue(String(daysInStock || 0));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveDaysInStock();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEditDays();
    }
  };

  const handleSaveDaysInStock = async () => {
    if (!currentVehicle.id || !clientId) {
      toast({
        title: 'Error',
        description: 'Faltan datos para la actualización.',
        variant: 'destructive',
      });
      return;
    }

    const newDays = parseInt(editingDaysValue);
    if (isNaN(newDays) || newDays < 0) {
      toast({
        title: 'Error',
        description: 'Por favor ingrese un número válido de días.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingDays(true);
    try {
      // Calcular la nueva fecha de creación basada en los días deseados
      const currentDate = new Date();
      const newCreatedAt = new Date(
        currentDate.getTime() - newDays * 24 * 60 * 60 * 1000
      );

      const { data, error } = await supabase
        .from('vehicles')
        .update({
          created_at: newCreatedAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentVehicle.id)
        .eq('client_id', clientId)
        .select(
          `
          *,
          brand:brand_id(id, name),
          model:model_id(id, name),
          status:status_id(id, name, color),
          seller:seller_id(id, first_name, last_name)
        `
        )
        .single();

      if (error) {
        throw error;
      }

      // Actualizar el vehículo local
      setCurrentVehicle(data);
      onVehicleUpdate?.(data);

      setIsEditingDaysInStock(false);
      setEditingDaysValue('');

      toast({
        title: 'Éxito',
        description: 'Días en stock actualizados correctamente',
      });
    } catch (error: unknown) {
      console.error('Error updating days in stock:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar los días en stock',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingDays(false);
    }
  };

  const handleCancelEditDays = () => {
    setIsEditingDaysInStock(false);
    setEditingDaysValue('');
  };

  // Obtener sale_price si el vehículo está vendido (solo si la celda lo
  // muestra; sin este guard CADA celda renderizada disparaba el fetch).
  useEffect(() => {
    if (column.field !== 'sale_price') return;
    const fetchSalePrice = async () => {
      const statusName = currentVehicle.status?.name?.toLowerCase() || '';
      const isSoldByStatus =
        statusName.includes('vendido') || statusName.includes('sold');

      if (isSoldByStatus && currentVehicle.id) {
        try {
          const { data: saleData, error } = await supabase
            .from('vehicles_sales')
            .select('sale_price')
            .eq('vehicle_id', currentVehicle.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!error && saleData) {
            setSalePrice(saleData.sale_price);
          }
        } catch (error) {
          console.error('Error fetching sale price:', error);
        }
      }
    };

    fetchSalePrice();
  }, [column.field, currentVehicle.id, currentVehicle.status?.name]);

  // Obtener purchase_price o consignación (solo si la celda lo muestra).
  useEffect(() => {
    if (column.field !== 'purchase_price') return;
    const fetchPurchaseOrConsignmentPrice = async () => {
      if (currentVehicle.id) {
        try {
          if (currentVehicle.is_consigned) {
            // Si es consignado, obtener agreed_price de vehicles_consignments
            const { data: consignmentData, error } = await supabase
              .from('vehicles_consignments')
              .select('agreed_price')
              .eq('vehicle_id', currentVehicle.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!error && consignmentData) {
              setPurchasePrice(consignmentData.agreed_price);
            }
          } else {
            // Si no es consignado, obtener purchase_price de vehicles_purchases
            const { data: purchaseData, error } = await supabase
              .from('vehicles_purchases')
              .select('purchase_price')
              .eq('vehicle_id', currentVehicle.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!error && purchaseData) {
              setPurchasePrice(purchaseData.purchase_price);
            }
          }
        } catch (error) {
          console.error('Error fetching purchase/consignment price:', error);
        }
      }
    };

    fetchPurchaseOrConsignmentPrice();
  }, [column.field, currentVehicle.id, currentVehicle.is_consigned]);

  // Obtener commission_amount para utilidad neta con comisión
  useEffect(() => {
    if (column.field !== 'net_profit_after_commission' || !currentVehicle.id) return;
    const fetchCommission = async () => {
      const { data, error } = await supabase
        .from('vehicles_sales')
        .select('commission_amount')
        .eq('vehicle_id', currentVehicle.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        setCommissionAmount(data.commission_amount || 0);
      }
    };
    fetchCommission();
  }, [column.field, currentVehicle.id]);

  // Obtener nombre de quien compró o consignó el vehículo
  useEffect(() => {
    if (column.field !== 'acquired_from' || !currentVehicle.id) return;
    const fetchAcquiredFrom = async () => {
      if (currentVehicle.is_consigned) {
        const { data, error } = await supabase
          .from('vehicles_consignments')
          .select('customer_id, customers:customer_id(first_name, last_name)')
          .eq('vehicle_id', currentVehicle.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data?.customers) {
          const c = data.customers as { first_name: string; last_name: string };
          setAcquiredFromName(`${c.first_name} ${c.last_name}`.trim());
        }
      } else {
        const { data, error } = await supabase
          .from('vehicles_purchases')
          .select('customer_id, customers:customer_id(first_name, last_name)')
          .eq('vehicle_id', currentVehicle.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data?.customers) {
          const c = data.customers as { first_name: string; last_name: string };
          setAcquiredFromName(`${c.first_name} ${c.last_name}`.trim());
        }
      }
    };
    fetchAcquiredFrom();
  }, [column.field, currentVehicle.id, currentVehicle.is_consigned]);

  // Obtener vendedor que captó la consigna
  useEffect(() => {
    if (column.field !== 'consignment_seller' || !currentVehicle.id || !currentVehicle.is_consigned) return;
    const fetchConsignmentSeller = async () => {
      const { data } = await supabase
        .from('vehicles_consignments')
        .select('consignment_seller_id, seller:consignment_seller_id(first_name, last_name)')
        .eq('vehicle_id', currentVehicle.id)
        .maybeSingle();
      if (data?.seller) {
        const s = data.seller as { first_name: string; last_name: string };
        setConsignmentSellerName(`${s.first_name} ${s.last_name}`.trim());
      }
    };
    fetchConsignmentSeller();
  }, [column.field, currentVehicle.id, currentVehicle.is_consigned]);

  const renderCellContent = () => {
    const { field, format } = column;

    // Handle special cases first
    if (field === 'vehicle') {
      return (
        <div className='flex items-center gap-3'>
          <div className='w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0'>
            {currentVehicle.main_image ? (
              <img
                src={currentVehicle.main_image}
                alt={`${currentVehicle.brand?.name || ''} ${currentVehicle.model?.name || ''}`}
                className='w-full h-full object-cover'
              />
            ) : (
              <div className='w-full h-full flex items-center justify-center'>
                <Car className='h-4 w-4 text-slate-300' />
              </div>
            )}
          </div>
          <div className='min-w-0'>
            <div className='text-[13px] font-medium text-slate-900 truncate'>
              {[currentVehicle.brand?.name, currentVehicle.model?.name, currentVehicle.year]
                .filter(Boolean)
                .join(' ')}
            </div>
            <div className='text-[11px] text-slate-400 mt-0.5'>
              {currentVehicle.license_plate || '—'}
            </div>
          </div>
        </div>
      );
    }

    if (field === 'days_in_stock' && format === 'number') {
      // Days in stock calculation - editable for admins
      if (isEditingDaysInStock) {
        return (
          <div
            className='flex items-center gap-1 py-1'
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              type='number'
              value={editingDaysValue}
              onChange={(e) => setEditingDaysValue(e.target.value)}
              onKeyDown={handleKeyPress}
              className='h-6 w-16 text-xs'
              min='0'
              autoFocus
            />
            <Button
              size='sm'
              variant='ghost'
              className='h-6 w-6 p-0'
              onClick={(e) => {
                e.stopPropagation();
                handleSaveDaysInStock();
              }}
              disabled={isUpdatingDays}
            >
              <Check className='h-3 w-3 text-green-600' />
            </Button>
            <Button
              size='sm'
              variant='ghost'
              className='h-6 w-6 p-0'
              onClick={(e) => {
                e.stopPropagation();
                handleCancelEditDays();
              }}
              disabled={isUpdatingDays}
            >
              <X className='h-3 w-3 text-red-600' />
            </Button>
          </div>
        );
      }

      return (
        <div className='flex items-center gap-1 py-1'>
          <span className='text-xs sm:text-sm text-muted-foreground'>
            {daysInStock || 0}
          </span>
          {canEditAdvanced && (
            <Button
              size='sm'
              variant='ghost'
              className='h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity'
              onClick={handleEditDaysInStock}
              title='Editar días en stock'
            >
              <Edit2 className='h-3 w-3' />
            </Button>
          )}
        </div>
      );
    }

    if (field === 'checklist_status') {
      if (!checklistSummary || checklistSummary.total === 0) {
        return (
          <span className='text-xs sm:text-sm text-gray-400'>—</span>
        );
      }
      const { completed, total, percentComplete } = checklistSummary;
      const barColor =
        percentComplete >= 100
          ? 'bg-green-500'
          : percentComplete >= 50
          ? 'bg-blue-500'
          : 'bg-orange-500';
      const textColor =
        percentComplete >= 100
          ? 'text-green-600'
          : percentComplete >= 50
          ? 'text-blue-600'
          : 'text-orange-600';
      return (
        <div className='flex items-center gap-2 py-1'>
          <div className='w-16 h-2 bg-gray-200 rounded-full overflow-hidden'>
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${textColor}`}>
            {completed}/{total}
          </span>
        </div>
      );
    }

    if (field === 'stock_type') {
      const stockType = currentVehicle.stock_type || 'online';
      if (stockType === 'online') {
        return (
          <span className='text-[11px] font-medium px-2 py-0.5 rounded-full text-blue-700 bg-blue-50'>
            Online
          </span>
        );
      }
      // Dealership — show name if available
      const dealershipName = currentVehicle.dealership_id
        ? (currentVehicle as any).dealership?.name || (currentVehicle as any).dealership?.address || 'Sucursal'
        : 'Sucursal';
      return (
        <span className='text-[11px] font-medium px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50'>
          {dealershipName}
        </span>
      );
    }

    if (field === 'consignment_seller') {
      if (!currentVehicle.is_consigned || !consignmentSellerName) {
        return <span className='text-xs sm:text-sm text-gray-400'>—</span>;
      }
      return (
        <span className='text-xs sm:text-sm text-muted-foreground'>
          {consignmentSellerName}
        </span>
      );
    }

    if (field === 'acquired_from') {
      if (acquiredFromName === null) {
        return <span className='text-xs sm:text-sm text-gray-400'>—</span>;
      }
      return (
        <span className='text-xs sm:text-sm text-muted-foreground'>
          {acquiredFromName || '—'}
        </span>
      );
    }

    if (field === 'seller') {
      const sellerName = currentVehicle.seller_id
        ? currentVehicle.seller
          ? `${currentVehicle.seller.first_name} ${currentVehicle.seller.last_name}`
          : `ID: ${currentVehicle.seller_id}`
        : tCommon('vehicles.table.noSeller');

      return (
        <div className='py-1'>
          {canEditAdvanced ? (
            <button
              onClick={handleSellerEdit}
              className='text-xs sm:text-sm hover:text-primary/80 hover:underline transition-colors text-muted-foreground'
              title={tCommon('vehicles.table.changeSeller')}
            >
              {sellerName}
            </button>
          ) : (
            <span className='text-xs sm:text-sm text-muted-foreground'>
              {sellerName}
            </span>
          )}
        </div>
      );
    }

    // Get the value from the vehicle object
    let value: unknown;
    if (field.includes('.')) {
      // Handle nested properties
      const parts = field.split('.');
      value = parts.reduce((obj, part) => obj?.[part], currentVehicle);
    } else {
      value = currentVehicle[field as keyof Vehicle];
    }

    // Régimen IVA (afecto/exento/consignación): derivado, no es columna de la tabla.
    if (field === 'regimen') {
      const r = getVehicleRegimen(
        {
          is_consigned: currentVehicle.is_consigned,
          iva_exento: (currentVehicle as any).iva_exento,
        },
        !!(client as any)?.ventas_exentas_iva
      );
      return (
        <span
          className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            r === 'afecto'
              ? 'border-sky-200 bg-sky-50 text-sky-700'
              : r === 'exento'
              ? 'border-slate-200 bg-slate-50 text-slate-600'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}
        >
          {REGIMEN_LABELS[r]}
        </span>
      );
    }

    // Handle different formats
    switch (format) {
      case 'price':
        if (field === 'net_profit') {
          if (profitLoading) {
            return (
              <span className='text-xs sm:text-sm text-gray-400'>
                Cargando...
              </span>
            );
          }

          // Verificar si el vehículo está vendido por estado
          const statusName = currentVehicle.status?.name?.toLowerCase() || '';
          const isSoldByStatus =
            statusName.includes('vendido') || statusName.includes('sold');
          const isSold = isSoldByStatus && !!saleData;

          if (!isSold) {
            return (
              <span className='text-xs sm:text-sm text-gray-400'>
                No vendido
              </span>
            );
          }

          // netResult ya viene del helper unificado (filtra assumed_by, aplica
          // override de close_deal). CRT NO se suma en ambos lados porque se anula.
          const profitValue = netResult;
          const isPositive = profitValue >= 0;

          return (
            <span
              className={`font-medium text-xs sm:text-sm ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {profitValue ? formatPrice(profitValue) : '—'}
            </span>
          );
        }

        if (field === 'net_profit_after_commission') {
          if (profitLoading) {
            return (
              <span className='text-xs sm:text-sm text-gray-400'>
                Cargando...
              </span>
            );
          }

          const statusName = currentVehicle.status?.name?.toLowerCase() || '';
          const isSoldByStatus =
            statusName.includes('vendido') || statusName.includes('sold');
          const isSold = isSoldByStatus && !!saleData;

          if (!isSold) {
            return (
              <span className='text-xs sm:text-sm text-gray-400'>
                No vendido
              </span>
            );
          }

          // netResult del helper unificado, menos la comisión del vendedor.
          // Sistema nuevo: sale_commission_splits (commissionSplits) tiene
          // precedencia. Fallback al campo legacy commission_amount para ventas
          // viejas que no usan splits.
          const splitsCommission = commissionSplits?.totalAmount || 0;
          const commission =
            splitsCommission > 0 ? splitsCommission : commissionAmount || 0;
          const profitAfterCommission = netResult - commission;
          const isPositive = profitAfterCommission >= 0;

          return (
            <span
              className={`font-medium text-xs sm:text-sm ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatPrice(profitAfterCommission)}
            </span>
          );
        }

        if (field === 'transfer_value') {
          return (
            <span className='font-medium text-xs sm:text-sm'>
              {value || value === 0 ? formatPrice(Number(value)) : '—'}
            </span>
          );
        }

        if (field === 'total_expenses') {
          if (profitLoading) {
            return (
              <span className='text-xs sm:text-sm text-gray-400'>
                Cargando...
              </span>
            );
          }

          return (
            <span className='font-medium text-xs sm:text-sm'>
              {totalExpenses
                ? formatPrice(totalExpenses)
                : '—'}
            </span>
          );
        }

        if (field === 'purchase_price') {
          // Mostrar purchase_price desde vehicles_purchases
          return (
            <span className='font-medium text-xs sm:text-sm'>
              {purchasePrice ? formatPrice(purchasePrice) : '—'}
            </span>
          );
        }

        if (field === 'min_price') {
          // Mostrar min_price desde el vehículo (precio mínimo de venta)
          return (
            <span className='font-medium text-xs sm:text-sm'>
              {value ? formatPrice(Number(value)) : '—'}
            </span>
          );
        }

        if (field === 'price') {
          // Mostrar price desde el vehículo (precio publicado)
          return (
            <span className='font-medium text-xs sm:text-sm'>
              {value ? formatPrice(Number(value)) : '—'}
            </span>
          );
        }

        if (field === 'sale_price') {
          // Verificar si el vehículo está vendido y tiene sale_price
          const statusName = currentVehicle.status?.name?.toLowerCase() || '';
          const isSoldByStatus =
            statusName.includes('vendido') || statusName.includes('sold');

          if (isSoldByStatus && salePrice) {
            // Mostrar precio de venta final si está vendido
            return (
              <span className='font-medium text-xs sm:text-sm text-green-600'>
                {formatPrice(salePrice)}
              </span>
            );
          }

          // Si NO está vendido, mostrar vacío
          return (
            <span className='font-medium text-xs sm:text-sm text-gray-400'>
              —
            </span>
          );
        }
        return (
          <span className='font-medium text-xs sm:text-sm'>
            {value ? formatPrice(Number(value)) : '—'}
          </span>
        );

      case 'number':
        return (
          <span className='text-xs sm:text-sm'>
            {value ? Number(value).toLocaleString() : '—'}
          </span>
        );

      case 'boolean':
        return (
          <span className='text-xs sm:text-sm'>
            {value === true
              ? tCommon('general.yes')
              : value === false
              ? tCommon('general.no')
              : '—'}
          </span>
        );

      case 'date':
        return (
          <span className='text-xs sm:text-sm'>
            {value ? formatDate(String(value)) : '—'}
          </span>
        );

      case 'datetime':
        return (
          <span className='text-xs sm:text-sm whitespace-nowrap'>
            {value ? formatDateTime(String(value)) : '—'}
          </span>
        );

      case 'badge':
        if (field === 'status') {
          return (
            <div className='py-1'>
              <StatusBadge
                status={
                  currentVehicle.status?.name ||
                  tCommon('vehicles.labels.unknown')
                }
                color={currentVehicle.status?.color}
              />
            </div>
          );
        }
        return (
          <span className='text-xs sm:text-sm'>
            {value && typeof value === 'object' && 'name' in value
              ? (value as { name: string }).name
              : String(value || '—')}
          </span>
        );

      case 'text':
      default:
        // Handle objects with name property (like category, color, etc.)
        if (value && typeof value === 'object' && 'name' in value) {
          return (
            <span className='text-xs sm:text-sm text-muted-foreground'>
              {(value as { name: string }).name}
            </span>
          );
        }

        return (
          <span className='text-xs sm:text-sm text-muted-foreground'>
            {String(value || '—')}
          </span>
        );
    }
  };

  return (
    <>
      <TableCell style={{ width: column.width }} className='px-4 py-2.5 group whitespace-nowrap'>
        {renderCellContent()}
      </TableCell>

      {/* Seller Edit Dialog */}
      {showSellerDialog && (
        <VehicleSellerEditDialog
          open={showSellerDialog}
          onClose={handleSellerDialogClose}
          vehicle={currentVehicle}
          onSuccess={handleSellerUpdate}
        />
      )}
    </>
  );
};

export default DynamicTableCell;

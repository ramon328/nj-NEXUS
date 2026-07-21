import { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/vehiculos/StatusBadge';
import { Vehicle } from '@/types/vehicle';
import { Edit, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useI18n } from '@/hooks/useI18n';
import VehiclePriceEditModal from './VehiclePriceEditModal';
import StatusEditControl from './StatusEditControl';

type VehicleHeaderProps = {
  daysInInventory?: number;
  vehicle?: Vehicle;
  isConsigned?: boolean;
  acquisitionData?: {
    id?: number;
    agreed_price?: number;
    purchase_price?: number;
    reservation_agreed_price?: number;
  } | null;
  vehiclePrice?: number;
  discountPercentage?: number;
  vehicleLabel?: string;
  minPrice?: number | null;
  saleData?: { id?: number; sale_price?: number } | null;
  formatCurrency?: (amount: number | null | undefined) => string;
  vehicleId?: number;
  onUpdate?: () => void;
};

const VehicleHeader = ({
  daysInInventory = 2,
  vehicle,
  isConsigned = false,
  acquisitionData,
  vehiclePrice,
  discountPercentage,
  vehicleLabel,
  minPrice,
  saleData,
  formatCurrency = (v) => v?.toString() || '-',
  vehicleId,
  onUpdate,
}: VehicleHeaderProps) => {
  const { tCommon } = useI18n();
  const { hasPermission } = usePermissions();
  const isSeller = !hasPermission(PermissionCode.SALES_VIEW);
  // Permiso granular: ver el precio de compra/acordado en el detalle del vehículo
  const canSeePurchasePrice = hasPermission(PermissionCode.VEHICLES_VIEW_PURCHASE_PRICE);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showPurchasePrice, setShowPurchasePrice] = useState(false);

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    onUpdate?.();
  };

  const renderHiddenPrice = () => (
    <span className='text-slate-900 font-medium font-mono tracking-wider'>
      ••••••••
    </span>
  );

  return (
    <div className='w-full h-full bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col gap-3 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)]'>
      {/* General Info */}
      <h2 className='text-base font-semibold text-slate-900'>
        {tCommon('vehicles.detail.titles.generalInfo')}
      </h2>
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4'>
        <div className='flex flex-col gap-0.5'>
          <span className='text-[13px] text-slate-500 font-medium'>
            {tCommon('vehicles.detail.labels.model')}
          </span>
          <span className='text-[13px] text-slate-900 font-semibold'>
            {vehicle?.model?.name || '-'}
          </span>
        </div>
        <div className='flex flex-col gap-0.5'>
          <span className='text-[13px] text-slate-500 font-medium'>
            {tCommon('vehicles.detail.labels.mileage')}
          </span>
          <span className='text-[13px] text-slate-900 font-semibold'>
            {vehicle?.mileage
              ? `${vehicle.mileage.toLocaleString()} ${tCommon('vehicles.detail.kmSuffix')}`
              : '-'}
          </span>
        </div>
        <div className='flex flex-col gap-0.5'>
          <span className='text-[13px] text-slate-500 font-medium'>
            {tCommon('vehicles.detail.labels.year')}
          </span>
          <span className='text-[13px] text-slate-900 font-semibold'>
            {vehicle?.year || '-'}
          </span>
        </div>
        <div className='flex flex-col gap-0.5'>
          <span className='text-[13px] text-slate-500 font-medium'>
            {tCommon('vehicles.detail.labels.daysInStock')}
          </span>
          <span className='text-[13px] text-slate-900 font-semibold'>
            {daysInInventory === 1
              ? `1 ${tCommon('vehicles.board.days')}`
              : `${daysInInventory} ${tCommon('vehicles.board.days')}`}
          </span>
        </div>
        <div className='flex flex-col gap-0.5'>
          <span className='text-[13px] text-slate-500 font-medium'>
            {tCommon('vehicles.detail.labels.status')}
          </span>
          <span className='mt-0.5'>
            {vehicle?.status &&
              (vehicleId ? (
                <StatusEditControl
                  vehicleId={vehicleId}
                  currentStatusId={vehicle.status_id}
                  currentStatusName={
                    vehicle.status?.name || tCommon('vehicles.labels.unknown')
                  }
                  currentStatusColor={vehicle.status?.color}
                  onUpdated={onUpdate}
                />
              ) : (
                <StatusBadge
                  status={vehicle.status?.name || tCommon('vehicles.labels.unknown')}
                  color={vehicle.status?.color}
                />
              ))}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className='border-t border-slate-100' />

      {/* Pricing */}
      <div className='flex items-center gap-2'>
        <h2 className='text-base font-semibold text-slate-900'>Precios</h2>
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
            isConsigned
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-sky-50 text-sky-700 border-sky-200'
          }`}
          title={
            isConsigned
              ? 'Este vehículo está en consignación'
              : 'Este vehículo es stock propio'
          }
        >
          {isConsigned ? 'Consignado' : 'Stock propio'}
        </span>
      </div>
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
        {canSeePurchasePrice &&
          (isConsigned ? (
            <div className='flex flex-col'>
              <div className='flex items-center gap-2 mb-1'>
                <span className='text-[13px] text-slate-500 font-medium'>
                  Precio acordado
                </span>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setShowPurchasePrice(!showPurchasePrice)}
                  className='h-5 w-5 p-0 hover:bg-slate-100 rounded-full'
                >
                  {showPurchasePrice ? (
                    <EyeOff className='h-3 w-3 text-slate-400' />
                  ) : (
                    <Eye className='h-3 w-3 text-slate-400' />
                  )}
                </Button>
              </div>
              <span className='text-slate-900 font-medium'>
                {showPurchasePrice
                  ? acquisitionData?.agreed_price
                    ? formatCurrency(acquisitionData.agreed_price)
                    : '-'
                  : acquisitionData?.agreed_price
                  ? renderHiddenPrice()
                  : '-'}
              </span>
            </div>
          ) : (
            <div className='flex flex-col'>
              <div className='flex items-center gap-2 mb-1'>
                <span className='text-[13px] text-slate-500 font-medium'>Precio compra</span>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setShowPurchasePrice(!showPurchasePrice)}
                  className='h-5 w-5 p-0 hover:bg-slate-100 rounded-full'
                >
                  {showPurchasePrice ? (
                    <EyeOff className='h-3 w-3 text-slate-400' />
                  ) : (
                    <Eye className='h-3 w-3 text-slate-400' />
                  )}
                </Button>
              </div>
              <span className='text-slate-900 font-medium'>
                {showPurchasePrice
                  ? acquisitionData?.purchase_price
                    ? formatCurrency(acquisitionData.purchase_price)
                    : '-'
                  : acquisitionData?.purchase_price
                  ? renderHiddenPrice()
                  : '-'}
              </span>
            </div>
          ))}

        {/* Precio Mínimo - Solo visible para admin */}
        {!isSeller && minPrice && (
          <div className='flex flex-col'>
            <div className='flex items-center gap-2 mb-0.5'>
              <span className='text-[13px] text-slate-500 font-medium'>Precio mínimo</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className='h-3 w-3 text-amber-500' />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className='text-xs max-w-[200px]'>
                      Precio mínimo aceptable. Se mostrará una alerta si se intenta vender o reservar por debajo de este valor.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className='text-amber-600 font-medium'>
              {showPurchasePrice ? formatCurrency(minPrice) : renderHiddenPrice()}
            </span>
          </div>
        )}

        <div
          className={
            canSeePurchasePrice || (!isSeller && minPrice)
              ? ''
              : 'col-span-full md:col-span-2 flex flex-col'
          }
        >
          <div className='flex items-center gap-2 mb-1'>
            <span className='text-[13px] text-slate-500 font-medium'>
              Precio publicado
            </span>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setIsEditModalOpen(true)}
              className='h-5 w-5 p-0 hover:bg-slate-100 rounded-full'
            >
              <Edit className='h-3 w-3 text-slate-400' />
            </Button>
          </div>
          <div className='flex flex-col'>
            {discountPercentage && vehiclePrice ? (
              <>
                <span className='text-slate-900 font-medium text-sm line-through'>
                  {formatCurrency(vehiclePrice)}
                </span>
                <span className='text-primary font-semibold text-sm'>
                  {formatCurrency(
                    vehiclePrice * (1 - discountPercentage / 100)
                  )}
                  <span className='ml-1 text-[10px] font-normal text-slate-400'>
                    con {(+discountPercentage).toLocaleString('es-CL', { maximumFractionDigits: 1 })}% dto
                  </span>
                </span>
              </>
            ) : (
              <span className='text-slate-900 font-medium text-md'>
                {formatCurrency(vehiclePrice)}
              </span>
            )}
          </div>
        </div>
        <div className='flex flex-col'>
          <span className='text-[13px] text-slate-500 font-medium mb-1'>Precio venta</span>
          <div className='flex items-center gap-2'>
            <span className='text-slate-900 font-medium'>
              {saleData?.sale_price ? formatCurrency(saleData.sale_price) : '-'}
            </span>
            {saleData?.sale_price && minPrice && saleData.sale_price < minPrice && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className='h-4 w-4 text-red-500' />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className='text-xs text-red-600 font-medium'>
                      ¡Precio de venta por debajo del mínimo!
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      {vehicleId && (
        <VehiclePriceEditModal
          isOpen={isEditModalOpen}
          onClose={handleCloseModal}
          vehicleId={vehicleId}
          isConsigned={isConsigned}
          acquisitionData={acquisitionData || null}
          vehiclePrice={vehiclePrice || 0}
          minPrice={minPrice}
          discountPercentage={discountPercentage}
          saleData={saleData || null}
          onUpdate={onUpdate || (() => {})}
        />
      )}
    </div>
  );
};

export default VehicleHeader;

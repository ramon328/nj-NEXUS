import React, { useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import { Button } from '@/components/ui/button';
import { Edit, Eye, EyeOff, AlertTriangle, DollarSign } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import VehiclePriceEditModal from './VehiclePriceEditModal';

type VehiclePricingProps = {
  isConsigned: boolean;
  acquisitionData: {
    id?: number;
    agreed_price?: number;
    purchase_price?: number;
    reservation_agreed_price?: number;
  } | null;
  vehiclePrice?: number;
  discountPercentage?: number;
  vehicleLabel?: string;
  minPrice?: number | null;
  saleData: {
    id?: number;
    sale_price?: number;
  } | null;
  formatCurrency: (amount: number | null | undefined) => string;
  vehicleId: number;
  onUpdate: () => void;
};

const VehiclePricing = ({
  isConsigned,
  acquisitionData,
  vehiclePrice,
  discountPercentage,
  vehicleLabel,
  minPrice,
  saleData,
  formatCurrency,
  vehicleId,
  onUpdate,
}: VehiclePricingProps) => {
  const { hasPermission } = usePermissions();
  const isSeller = !hasPermission(PermissionCode.SALES_VIEW);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showPurchasePrice, setShowPurchasePrice] = useState(false);

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    onUpdate();
  };

  const togglePurchasePriceVisibility = () => {
    setShowPurchasePrice(!showPurchasePrice);
  };

  const renderHiddenPrice = () => {
    return (
      <span className='text-slate-900 font-medium font-mono tracking-wider'>
        ••••••••
      </span>
    );
  };

  return (
    <div className='rounded-2xl border border-slate-200/60 bg-white p-4 overflow-hidden shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)]'>
      <div className='flex justify-between items-center mb-3'>
        <div className='flex items-center gap-2.5'>
          <div className='h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0'>
            <DollarSign className='h-4 w-4 text-emerald-600' />
          </div>
          <h2 className='text-base font-semibold text-slate-900'>Precios</h2>
        </div>
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
        {!isSeller &&
          (isConsigned ? (
            <div className='flex flex-col'>
              <div className='flex items-center gap-2 mb-1'>
                <span className='text-[13px] text-slate-500 font-medium'>
                  Precio acordado
                </span>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={togglePurchasePriceVisibility}
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
                  onClick={togglePurchasePriceVisibility}
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
              {formatCurrency(minPrice)}
            </span>
          </div>
        )}

        <div
          className={
            !isSeller ? '' : 'col-span-full md:col-span-2 flex flex-col'
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
            {/* Alerta si el precio de venta es menor al precio mínimo */}
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

      <VehiclePriceEditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        vehicleId={vehicleId}
        isConsigned={isConsigned}
        acquisitionData={acquisitionData}
        vehiclePrice={vehiclePrice || 0}
        minPrice={minPrice}
        saleData={saleData}
        onUpdate={onUpdate}
      />
    </div>
  );
};

export default VehiclePricing;

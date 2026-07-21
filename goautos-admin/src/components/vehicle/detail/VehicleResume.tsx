import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import VehicleImageGallery from './VehicleImageGallery';
import VehicleHeader from './VehicleHeader';
import VehicleFinancialSummary from './VehicleFinancialSummary';
import VehicleChecklist from './VehicleChecklist';
import VehicleFinesSection from './VehicleFinesSection';
import { useVehicleFinancialData } from '@/hooks/useVehicleFinancialData';
import { useTransactions } from './transactions/TransactionsContext';
import ConsignmentCustomerInfo from './ConsignmentCustomerInfo';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

type VehicleResumeProps = {
  vehicle: any;
  onUpdate?: () => void;
};

const VehicleResume = ({ vehicle, onUpdate }: VehicleResumeProps) => {
  const { clientId } = useAuth();
  const { hasPermission } = usePermissions();
  // Permiso granular: ver el resumen financiero en el detalle del vehículo
  const canSeeFinancials = hasPermission(PermissionCode.VEHICLES_VIEW_FINANCIAL_SUMMARY);
  const {
    acquisitionData,
    saleData,
    isLoading,
    totalExpenses,
    totalIncome,
    netResult,
    regimen,
    ivaDebitoFiscal,
    additionalExpenses,
    additionalIncome,
    expenseExtras,
    incomeExtras,
    dealershipIncomeExtras,
    dealershipExpenseExtras,
    passthroughExtras,
    formatCurrency,
    refetchData,
    vehicleData,
    profitResult,
    profitInput,
    saleSeller,
    commissionSplits,
  } = useVehicleFinancialData(vehicle.id, vehicle.is_consigned);

  // Recalcula el Resumen Financiero al instante cuando se agrega o elimina un
  // gasto/ingreso desde el contexto (sin recargar la página). Se omite el primer
  // render para no duplicar el fetch inicial.
  const { transactions } = useTransactions();
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    refetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.length]);

  const handleUpdate = () => {
    refetchData();
    onUpdate?.();
  };

  if (isLoading) {
    return (
      <div className='space-y-4 animate-pulse'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='h-[220px] sm:h-[280px] md:h-[320px] bg-slate-100 rounded-2xl'></div>
          <div className='bg-white rounded-2xl border border-slate-200/60 p-4 space-y-3'>
            <div className='h-5 bg-slate-100 rounded w-32'></div>
            <div className='grid grid-cols-2 gap-3'>
              {[1,2,3,4,5].map(i => (
                <div key={i} className='space-y-1.5'>
                  <div className='h-3 bg-slate-100 rounded w-16'></div>
                  <div className='h-4 bg-slate-100 rounded w-20'></div>
                </div>
              ))}
            </div>
            <div className='border-t border-slate-100 pt-3'></div>
            <div className='h-5 bg-slate-100 rounded w-24'></div>
            <div className='grid grid-cols-2 gap-3'>
              {[1,2,3].map(i => (
                <div key={i} className='space-y-1.5'>
                  <div className='h-3 bg-slate-100 rounded w-20'></div>
                  <div className='h-5 bg-slate-100 rounded w-24'></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {canSeeFinancials && (
          <div className='bg-white rounded-2xl border border-slate-200/60 p-4 space-y-3'>
            <div className='flex items-center gap-2.5'>
              <div className='h-8 w-8 bg-slate-100 rounded-xl'></div>
              <div className='h-5 bg-slate-100 rounded w-40'></div>
            </div>
            <div className='space-y-2'>
              {[1,2,3].map(i => <div key={i} className='h-4 bg-slate-100 rounded'></div>)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      className='space-y-4'
      variants={stagger}
      initial='hidden'
      animate='show'
    >
      {/* Top: Gallery + Info/Pricing side by side on desktop (only if image exists) */}
      <div className={`grid grid-cols-1 ${vehicle.main_image ? 'md:grid-cols-2' : ''} gap-4`}>
        {vehicle.main_image && (
          <motion.div variants={fadeUp} className='h-full'>
            <VehicleImageGallery
              mainImage={vehicle.main_image}
              gallery={vehicle.gallery}
              brandName={vehicle.brand?.name}
              modelName={vehicle.model?.name}
              year={vehicle.year}
            />
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <VehicleHeader
            daysInInventory={
              vehicle.created_at
                ? Math.floor(
                    (new Date().getTime() -
                      new Date(vehicle.created_at).getTime()) /
                      (1000 * 3600 * 24)
                  )
                : 0
            }
            vehicle={vehicle}
            isConsigned={vehicle.is_consigned}
            acquisitionData={acquisitionData}
            vehiclePrice={vehicle.price}
            discountPercentage={vehicle.discount_percentage}
            vehicleLabel={vehicle.label}
            minPrice={vehicle.min_price}
            saleData={saleData}
            formatCurrency={formatCurrency}
            vehicleId={vehicle.id}
            onUpdate={handleUpdate}
          />
        </motion.div>
      </div>

      {/* Consignment info */}
      <motion.div variants={fadeUp}>
        <ConsignmentCustomerInfo vehicleId={vehicle.id} isOpen={true} />
      </motion.div>

      {/* Financial summary — full width */}
      {canSeeFinancials && (
        <motion.div variants={fadeUp}>
          <VehicleFinancialSummary
            isConsigned={vehicle.is_consigned}
            acquisitionData={acquisitionData}
            saleData={saleData}
            netResult={netResult}
            regimen={regimen}
            ivaDebitoFiscal={ivaDebitoFiscal}
            expenseExtras={expenseExtras}
            incomeExtras={incomeExtras}
            dealershipIncomeExtras={dealershipIncomeExtras}
            dealershipExpenseExtras={dealershipExpenseExtras}
            passthroughExtras={passthroughExtras}
            formatCurrency={formatCurrency}
            transferValue={vehicle.transfer_value}
            profitResult={profitResult}
            profitInput={profitInput}
            saleSeller={saleSeller}
            commissionSplits={commissionSplits}
            vehicleId={vehicle.id}
            defaultSellerId={vehicle.assigned_seller_id ?? vehicle.seller_id ?? null}
            onCommissionUpdated={handleUpdate}
          />
        </motion.div>
      )}

      {/* Checklist */}
      <motion.div variants={fadeUp}>
        <VehicleChecklist vehicleId={vehicle.id} isOpen={true} />
      </motion.div>

      {/* TODO: Multas — oculto temporalmente, aún no funciona */}
      {/* <motion.div variants={fadeUp}>
        <VehicleFinesSection vehicleId={vehicle.id} licensePlate={vehicle.license_plate} />
      </motion.div> */}
    </motion.div>
  );
};

export default VehicleResume;

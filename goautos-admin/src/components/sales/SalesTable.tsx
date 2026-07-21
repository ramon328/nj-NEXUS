import React from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { formatDateShort } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useI18n } from '@/hooks/useI18n';
import { useTranslation } from 'react-i18next';
import { Car, Check, X, Eye, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';

interface SalesTableProps {
  sales: any[];
  isLoading: boolean;
  activeTab: string;
  openApprovalDialog: (sale: any) => void;
}

const STATUS_DOT_COLORS: Record<string, string> = {
  pending: 'bg-amber-400',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
};

const SalesTable = ({
  sales,
  isLoading,
  activeTab,
  openApprovalDialog,
}: SalesTableProps) => {
  const { tCommon } = useI18n();
  const { t } = useTranslation('vehicleSales');

  const getPaymentMethodLabel = (method: string) => {
    return t(`steps.saleInfo.saleDetails.methods.${method}`, method);
  };

  const STATUS_LABELS: Record<string, () => string> = {
    pending: () => tCommon('sales.status.pending'),
    approved: () => tCommon('sales.status.approved'),
    rejected: () => tCommon('sales.status.rejected'),
  };

  const renderStatusDot = (status: string) => (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${STATUS_DOT_COLORS[status] || 'bg-slate-400'}`} />
        </TooltipTrigger>
        <TooltipContent side='top' className='text-xs'>
          {STATUS_LABELS[status] ? STATUS_LABELS[status]() : status}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const VehicleThumbnail = ({ sale }: { sale: any }) => {
    const img = sale.vehicle?.main_image;
    if (img) {
      return <img src={img} alt="" className="h-full w-full object-cover" />;
    }
    return <Car className="h-4 w-4 text-slate-300" />;
  };

  const getMargin = (sale: any) => {
    const salePrice = sale.sale_price || 0;
    const purchasePrice = sale.purchase_price || sale.vehicle?.purchase_price || 0;
    if (!purchasePrice) return null;
    return salePrice - purchasePrice;
  };

  if (isLoading) {
    return (
      <div className='flex justify-center items-center h-40'>
        <div className='animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent' />
      </div>
    );
  }

  if (sales.length === 0) {
    const statusLabel =
      activeTab === 'pending'
        ? tCommon('sales.table.pendingLower')
        : activeTab === 'approved'
        ? tCommon('sales.table.approvedLower')
        : activeTab === 'rejected'
        ? tCommon('sales.table.rejectedLower')
        : '';

    return (
      <div className='flex flex-col items-center justify-center py-20'>
        <div className='h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4'>
          <Car className='h-7 w-7 text-slate-300' />
        </div>
        <h3 className='text-[15px] font-semibold text-slate-700 mb-1'>
          {tCommon('sales.table.emptyPrefix')} {statusLabel} {tCommon('sales.table.emptySuffix')}
        </h3>
        <p className='text-[13px] text-slate-400 max-w-xs text-center'>
          {tCommon('sales.table.emptyHint', 'Las ventas se crean desde la ficha de cada vehículo')}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className='md:hidden space-y-2'>
        {sales.map((sale, index) => {
          const margin = getMargin(sale);
          return (
            <motion.div
              key={sale.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              className='bg-white rounded-2xl border border-slate-200/60 p-3.5'
            >
              {/* Top: vehicle + status */}
              <div className='flex items-start justify-between gap-2'>
                <div className='flex items-center gap-2.5 min-w-0'>
                  <div className='flex-shrink-0 h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center'>
                    <VehicleThumbnail sale={sale} />
                  </div>
                  <div className='min-w-0'>
                    <div className='flex items-center gap-1.5'>
                      {renderStatusDot(sale.status)}
                      <h3 className='text-[14px] font-semibold text-slate-900 truncate'>
                        {sale.vehicle?.brand?.name} {sale.vehicle?.model?.name}
                      </h3>
                    </div>
                    <p className='text-[12px] text-slate-500'>
                      {sale.vehicle?.year} · {sale.vehicle?.license_plate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Middle: key info grid */}
              <div className='grid grid-cols-2 gap-x-4 gap-y-2 mt-3'>
                <div>
                  <p className='text-[11px] text-slate-400 uppercase tracking-wider'>P. Compra</p>
                  <p className='text-[13px] text-slate-600'>
                    {formatCurrency(sale.purchase_price || sale.vehicle?.purchase_price || 0)}
                  </p>
                </div>
                <div>
                  <p className='text-[11px] text-slate-400 uppercase tracking-wider'>P. Venta</p>
                  <p className='text-[14px] font-semibold text-slate-900'>
                    {formatCurrency(sale.sale_price)}
                  </p>
                </div>
                <div>
                  <p className='text-[11px] text-slate-400 uppercase tracking-wider'>Margen</p>
                  {margin !== null ? (
                    <p className={`text-[13px] font-medium ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(margin)}
                    </p>
                  ) : (
                    <p className='text-[13px] text-slate-400'>-</p>
                  )}
                </div>
                <div>
                  <p className='text-[11px] text-slate-400 uppercase tracking-wider'>Método</p>
                  <p className='text-[13px] text-slate-600'>
                    {getPaymentMethodLabel(sale.payment_method)}
                  </p>
                </div>
              </div>

              {/* Bottom: actions */}
              <div className='flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-slate-100'>
                {sale.status === 'pending' ? (
                  <>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => openApprovalDialog({ ...sale, _action: 'reject' })}
                      className='h-7 px-2.5 rounded-lg text-[12px] font-semibold text-red-500 hover:text-red-600 hover:bg-red-50'
                    >
                      <X className='h-3.5 w-3.5 mr-1' />
                      Rechazar
                    </Button>
                    <Button
                      size='sm'
                      onClick={() => openApprovalDialog(sale)}
                      className='h-7 px-3 rounded-lg text-[12px] font-semibold bg-sky-400 hover:bg-sky-500 text-white'
                    >
                      <Check className='h-3.5 w-3.5 mr-1' />
                      Aprobar
                    </Button>
                  </>
                ) : (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => openApprovalDialog(sale)}
                    className='h-7 px-2.5 rounded-lg text-[12px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  >
                    <Eye className='h-3.5 w-3.5 mr-1' />
                    {tCommon('sales.table.buttons.details')}
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className='hidden md:block bg-white rounded-2xl border border-slate-200/60 overflow-hidden'>
        <Table className='table-fixed'>
          <TableHeader>
            <TableRow className='hover:bg-transparent border-b border-slate-100'>
              <TableHead className='w-[28%] text-[11px] uppercase tracking-wider text-slate-400 font-medium bg-slate-50/80 h-9 px-3'>
                Vehículo
              </TableHead>
              <TableHead className='w-[14%] text-[11px] uppercase tracking-wider text-slate-400 font-medium bg-slate-50/80 h-9 px-3'>
                P. Compra
              </TableHead>
              <TableHead className='w-[14%] text-[11px] uppercase tracking-wider text-slate-400 font-medium bg-slate-50/80 h-9 px-3'>
                P. Venta
              </TableHead>
              <TableHead className='w-[14%] text-[11px] uppercase tracking-wider text-slate-400 font-medium bg-slate-50/80 h-9 px-3'>
                Margen
              </TableHead>
              <TableHead className='w-[12%] text-[11px] uppercase tracking-wider text-slate-400 font-medium bg-slate-50/80 h-9 px-3'>
                Método
              </TableHead>
              <TableHead className='w-[18%] text-right text-[11px] uppercase tracking-wider text-slate-400 font-medium bg-slate-50/80 h-9 px-3'>
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => {
              const margin = getMargin(sale);
              return (
                <TableRow
                  key={sale.id}
                  className='hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0'
                >
                  {/* Vehículo */}
                  <TableCell className='px-3 py-3'>
                    <div className='flex items-center gap-2.5'>
                      <div className='flex-shrink-0 h-9 w-9 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center'>
                        <VehicleThumbnail sale={sale} />
                      </div>
                      <div>
                        <div className='flex items-center gap-1.5'>
                          {renderStatusDot(sale.status)}
                          <p className='text-[13px] font-medium text-slate-700'>
                            {sale.vehicle?.brand?.name} {sale.vehicle?.model?.name}
                          </p>
                        </div>
                        <p className='text-[11px] text-slate-400'>
                          {sale.vehicle?.year} · {sale.vehicle?.license_plate}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Precio Compra */}
                  <TableCell className='px-3 py-3 text-[13px] text-slate-500'>
                    {formatCurrency(sale.purchase_price || sale.vehicle?.purchase_price || 0)}
                  </TableCell>

                  {/* Precio Venta */}
                  <TableCell className='px-3 py-3 text-[13px] font-medium text-slate-800'>
                    {formatCurrency(sale.sale_price)}
                  </TableCell>

                  {/* Margen */}
                  <TableCell className='px-3 py-3'>
                    {margin !== null ? (
                      <div className='flex items-center gap-1'>
                        {margin >= 0 ? (
                          <TrendingUp className='h-3 w-3 text-emerald-500' />
                        ) : (
                          <TrendingDown className='h-3 w-3 text-red-500' />
                        )}
                        <span className={`text-[13px] font-medium ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(margin))}
                        </span>
                      </div>
                    ) : (
                      <span className='text-[13px] text-slate-400'>-</span>
                    )}
                  </TableCell>

                  {/* Método */}
                  <TableCell className='px-3 py-3 text-[13px] text-slate-600'>
                    <div>
                      <span>{getPaymentMethodLabel(sale.payment_method)}</span>
                      {sale.payment_method === 'credit' && sale.financiera && (
                        <p className='text-[11px] text-slate-400'>{sale.financiera}</p>
                      )}
                    </div>
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className='px-3 py-3 text-right'>
                    {sale.status === 'pending' ? (
                      <div className='flex items-center justify-end gap-1.5'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => openApprovalDialog({ ...sale, _action: 'reject' })}
                          className='h-8 px-2.5 rounded-lg text-[12px] font-semibold text-red-500 hover:text-red-600 hover:bg-red-50'
                        >
                          <X className='h-3.5 w-3.5 mr-1' />
                          Rechazar
                        </Button>
                        <Button
                          size='sm'
                          onClick={() => openApprovalDialog(sale)}
                          className='h-8 px-3 rounded-lg text-[12px] font-semibold bg-sky-400 hover:bg-sky-500 text-white'
                        >
                          <Check className='h-3.5 w-3.5 mr-1' />
                          Aprobar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => openApprovalDialog(sale)}
                        className='h-8 px-3 rounded-lg text-[12px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      >
                        <Eye className='h-3.5 w-3.5 mr-1.5' />
                        {tCommon('sales.table.buttons.details')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default SalesTable;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  useVehicleSaleStore,
  VehicleExtra,
  isCustomerIncomeAdditional,
} from '@/stores/vehicleSaleStore';
import { formatCurrency } from '@/utils/functions';
import { useAuth } from '@/contexts/AuthContext';
import { getVehicleRegimen, REGIMEN_LABELS } from '@/utils/vehicleRegimen';

const SummaryStep = () => {
  const { t } = useTranslation('vehicleSales');
  const { client } = useAuth();
  const {
    vehicle,
    saleInfo,
    tradeInInfo,
    additionals,
    getTotalSalePrice,
    getRemainingAmount,
    getCustomerCredit,
    getTotalPayments,
    getReceivedRemaining,
    getTotalAdditionals,
    reservationExtras,
  } = useVehicleSaleStore();

  // Régimen IVA del auto que se vende (R2: se hereda de la entrada).
  const saleRegimen = getVehicleRegimen(
    { is_consigned: (vehicle as any)?.is_consigned, iva_exento: (vehicle as any)?.iva_exento },
    !!(client as any)?.ventas_exentas_iva
  );

  const selectedCustomer = saleInfo.customer;

  // Separar adicionales por tipo (mismo criterio que getTotalSalePrice()):
  //  - ingreso del cliente → suma al precio de venta;
  //  - gasto de la automotora → NO afecta el precio (sólo el margen);
  //  - cargo al consignador → NEUTRO: no lo paga el comprador ni afecta el precio.
  const incomeAdditionals = additionals.filter(isCustomerIncomeAdditional);
  const consignorAdditionals = additionals.filter(
    (a) => a.assumedBy === 'consignor'
  );
  const expenseAdditionals = additionals.filter(
    (a) => (a.kind ?? 'income') === 'expense' && a.assumedBy !== 'consignor'
  );

  const getPaymentMethodLabel = (method: string) => {
    return t(`steps.saleInfo.saleDetails.methods.${method}`);
  };

  return (
    <div className='space-y-3'>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
        {/* Customer Information */}
        <div className='p-2 rounded-lg border'>
          <p className='text-xs font-semibold text-slate-700 mb-1.5'>{t('steps.summary.sections.customer.title')}</p>
          {selectedCustomer ? (
            <div className='space-y-1 text-xs'>
              <div className='flex justify-between'>
                <span className='text-slate-500'>{t('steps.summary.sections.customer.name')}:</span>
                <span className='font-medium'>{selectedCustomer.first_name} {selectedCustomer.last_name}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-slate-500'>{t('steps.summary.sections.customer.rut')}:</span>
                <span className='font-medium'>{selectedCustomer.rut}</span>
              </div>
              {selectedCustomer.email && (
                <div className='flex justify-between'>
                  <span className='text-slate-500'>{t('steps.summary.sections.customer.email')}:</span>
                  <span className='font-medium truncate ml-2'>{selectedCustomer.email}</span>
                </div>
              )}
              {selectedCustomer.phone && (
                <div className='flex justify-between'>
                  <span className='text-slate-500'>{t('steps.summary.sections.customer.phone')}:</span>
                  <span className='font-medium'>{selectedCustomer.phone}</span>
                </div>
              )}
            </div>
          ) : (
            <div className='text-xs text-slate-400'>{t('steps.summary.sections.customer.empty')}</div>
          )}
        </div>

        {/* Vehicle Information */}
        <div className='p-2 rounded-lg border'>
          <p className='text-xs font-semibold text-slate-700 mb-1.5'>{t('steps.summary.sections.vehicle.title')}</p>
          <div className='space-y-1 text-xs'>
            <div className='flex justify-between'>
              <span className='text-slate-500'>{t('steps.saleInfo.vehicleInfo.brandModel')}:</span>
              <span className='font-medium'>{vehicle?.brand?.name} {vehicle?.model?.name}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-slate-500'>{t('steps.saleInfo.vehicleInfo.year')}:</span>
              <span className='font-medium'>{vehicle?.year}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-slate-500'>{t('steps.saleInfo.vehicleInfo.licensePlate')}:</span>
              <span className='font-medium'>{vehicle?.license_plate}</span>
            </div>
            {vehicle?.mileage && (
              <div className='flex justify-between'>
                <span className='text-slate-500'>{t('steps.summary.sections.vehicle.mileage')}:</span>
                <span className='font-medium'>{vehicle.mileage.toLocaleString()} km</span>
              </div>
            )}
            {/* Régimen IVA: visible al vender para que quede claro si la venta es afecta. */}
            <div className='flex justify-between'>
              <span className='text-slate-500'>Régimen IVA:</span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  saleRegimen === 'afecto'
                    ? 'border-sky-200 bg-sky-50 text-sky-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {REGIMEN_LABELS[saleRegimen]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trade-in Information */}
      {tradeInInfo.hasTradeIn && tradeInInfo.vehicles.length > 0 && (
        <div className='p-2 rounded-lg border'>
          <p className='text-xs font-semibold text-slate-700 mb-1.5'>
            {t('steps.summary.sections.tradeIn.title')} ({tradeInInfo.vehicles.length})
          </p>
          <div className='space-y-2'>
            {tradeInInfo.vehicles.map((v, i) => (
              <div key={v.id} className={`grid grid-cols-2 gap-x-3 gap-y-1 text-xs ${i > 0 ? 'pt-2 border-t' : ''}`}>
                <div>
                  <span className='text-slate-500'>{t('steps.saleInfo.vehicleInfo.brandModel')}:</span>
                  <p className='font-medium'>{v.brand} {v.model}</p>
                </div>
                <div>
                  <span className='text-slate-500'>{t('steps.saleInfo.vehicleInfo.year')}:</span>
                  <p className='font-medium'>{v.year}</p>
                </div>
                <div>
                  <span className='text-slate-500'>{t('steps.saleInfo.vehicleInfo.licensePlate')}:</span>
                  <p className='font-medium'>{v.license_plate}</p>
                </div>
                <div>
                  <span className='text-slate-500'>{t('steps.tradeIn.summary.tradeInValue')}:</span>
                  <p className='font-medium text-sky-600'>{formatCurrency(v.trade_in_value)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reservation Additionals */}
      {reservationExtras.filter((extra) => extra.type === 'reservation_additional').length > 0 && (
        <div className='p-2 rounded-lg border'>
          <p className='text-xs font-semibold text-sky-600 mb-1.5'>
            {t('steps.saleInfo.priceSummary.reservationAdditionals')} ({reservationExtras.filter((extra) => extra.type === 'reservation_additional').length})
          </p>
          <div className='space-y-1'>
            {reservationExtras
              .filter((extra) => extra.type === 'reservation_additional')
              .map((additional) => (
                <div key={additional.id} className='flex justify-between items-center py-1 px-2 bg-sky-50 rounded text-xs'>
                  <span className='font-medium'>{additional.title}</span>
                  <span className='text-blue-700 font-medium'>{formatCurrency(additional.amount)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Sale Additionals */}
      {additionals.length > 0 && (
        <div className='p-2 rounded-lg border'>
          <p className='text-xs font-semibold text-slate-700 mb-1.5'>
            {t('steps.saleInfo.priceSummary.saleAdditionals', { count: additionals.length })}
          </p>
          <div className='space-y-1'>
            {additionals.map((additional) => {
              const isConsignor = additional.assumedBy === 'consignor';
              const isExpense =
                !isConsignor && (additional.kind ?? 'income') === 'expense';
              const badgeLabel = isConsignor
                ? 'Consignador'
                : isExpense
                ? 'Gasto'
                : 'Ingreso';
              const badgeClass = isConsignor
                ? 'bg-slate-100 text-slate-500'
                : isExpense
                ? 'bg-rose-100 text-rose-700'
                : 'bg-sky-100 text-sky-700';
              return (
                <div key={additional.id} className='flex justify-between items-center py-1 px-2 bg-slate-50 rounded text-xs'>
                  <span className='font-medium flex items-center gap-1.5'>
                    {additional.title}
                    <span className={`text-[9px] px-1 py-px rounded ${badgeClass}`}>
                      {badgeLabel}
                    </span>
                  </span>
                  <span
                    className={`font-medium ${
                      isConsignor
                        ? 'text-slate-500'
                        : isExpense
                        ? 'text-rose-600'
                        : ''
                    }`}
                  >
                    {isExpense ? '−' : ''}{formatCurrency(additional.price)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Information */}
      <div className='p-2 rounded-lg border'>
        <p className='text-xs font-semibold text-slate-700 mb-1.5'>{t('steps.summary.sections.payment.title')}</p>
        <div className='space-y-1.5 text-xs'>
          {saleInfo.saleDate && (
            <div className='flex justify-between'>
              <span className='text-slate-500'>Fecha de la venta:</span>
              <span className='font-medium'>
                {new Date(`${saleInfo.saleDate}T12:00:00`).toLocaleDateString('es-CL')}
              </span>
            </div>
          )}
          {saleInfo.paymentMethod === 'credit' && (
            <div className='flex justify-between'>
              <span className='text-slate-500'>Forma de pago:</span>
              <Badge variant='outline' className='text-[10px] h-5'>
                Financiada
              </Badge>
            </div>
          )}

          {saleInfo.paymentMethod === 'credit' && saleInfo.financiera && (
            <div className='flex justify-between'>
              <span className='text-slate-500'>Financiera:</span>
              <span className='font-medium text-xs'>{saleInfo.financiera}</span>
            </div>
          )}

          {/* Reservation Payments */}
          {reservationExtras.filter((extra) => extra.type === 'reservation_payment').length > 0 && (
            <div>
              <span className='text-sky-600 text-[11px] font-medium'>
                {t('steps.summary.sections.payment.reservationPayments')}:
              </span>
              <div className='space-y-0.5 mt-1'>
                {reservationExtras
                  .filter((extra) => extra.type === 'reservation_payment')
                  .map((payment) => (
                    <div key={payment.id} className='flex justify-between items-center bg-sky-50 p-1.5 rounded'>
                      <span>{payment.title}</span>
                      <span className='font-medium text-sky-600'>{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Sale Payments */}
          {saleInfo.payments.length > 0 && (
            <div>
              <span className='text-slate-500 text-[11px] font-medium'>
                {t('steps.summary.sections.payment.salePayments')}:
              </span>
              <div className='space-y-0.5 mt-1'>
                {saleInfo.payments.map((payment) => {
                  const isPending = payment.paid === false;
                  return (
                    <div key={payment.id} className='flex justify-between items-center'>
                      <span>
                        {payment.title}
                        {isPending && (
                          <span className='ml-1 text-amber-700'>
                            · cuota a plazo
                            {payment.dueDate
                              ? ` · vence ${new Date(payment.dueDate + 'T00:00:00').toLocaleDateString('es-CL')}`
                              : ''}
                          </span>
                        )}
                      </span>
                      <span className={`font-medium ${isPending ? 'text-amber-700' : ''}`}>
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {saleInfo.notes && (
            <div>
              <span className='text-slate-500 text-[11px]'>{t('steps.saleInfo.saleDetails.notes')}:</span>
              <p className='mt-0.5 p-1.5 bg-slate-50 rounded text-[11px]'>{saleInfo.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Price Summary */}
      <div className='p-2 rounded-lg border bg-slate-50/60'>
        <p className='text-xs font-semibold text-slate-700 mb-1.5'>{t('steps.saleInfo.priceSummary.title')}</p>
        <div className='space-y-1.5 text-xs'>
          <div className='flex justify-between items-center'>
            <span className='text-slate-600'>{t('steps.saleInfo.priceSummary.baseVehiclePrice')}</span>
            <span className='font-medium'>{formatCurrency(saleInfo.salePrice)}</span>
          </div>

          {reservationExtras.filter((extra) => extra.type === 'reservation_additional').length > 0 && (
            <div className='flex justify-between items-center'>
              <span className='text-slate-600'>{t('steps.saleInfo.priceSummary.reservationAdditionals')}</span>
              <span className='font-medium text-sky-600'>
                +{formatCurrency(
                  reservationExtras
                    .filter((extra) => extra.type === 'reservation_additional')
                    .reduce((sum, extra) => sum + extra.amount, 0)
                )}
              </span>
            </div>
          )}

          {incomeAdditionals.length > 0 && (
            <div className='flex justify-between items-center'>
              <span className='text-slate-600'>{t('steps.saleInfo.priceSummary.saleAdditionals', { count: incomeAdditionals.length })}</span>
              <span className='font-medium text-sky-600'>
                +{formatCurrency(incomeAdditionals.reduce((sum, add) => sum + add.price, 0))}
              </span>
            </div>
          )}

          {expenseAdditionals.length > 0 && (
            <div className='flex justify-between items-center'>
              <span className='text-slate-600'>
                Gastos ({expenseAdditionals.length}){' '}
                <span className='text-[10px] text-slate-400'>(no afectan el precio de venta)</span>
              </span>
              <span className='font-medium text-rose-600'>
                −{formatCurrency(expenseAdditionals.reduce((sum, add) => sum + add.price, 0))}
              </span>
            </div>
          )}

          {/* Cargos al consignador: neutros para el comprador (los paga el
              consignador de su liquidación) → no suman al total a pagar. */}
          {consignorAdditionals.length > 0 && (
            <div className='flex justify-between items-center'>
              <span className='text-slate-600'>
                Cargos al consignador ({consignorAdditionals.length}){' '}
                <span className='text-[10px] text-slate-400'>(no los paga el cliente)</span>
              </span>
              <span className='font-medium text-slate-500'>
                {formatCurrency(consignorAdditionals.reduce((sum, add) => sum + add.price, 0))}
              </span>
            </div>
          )}

          {/* Valor de transferencia (CRT): se muestra solo cuando se le cobra al
              cliente, para que las partidas cuadren con el Total venta. */}
          {saleInfo.transferValueCharged && (saleInfo.transferValue || 0) > 0 && (
            <div className='flex justify-between items-center'>
              <span className='text-slate-600'>Valor de transferencia</span>
              <span className='font-medium text-sky-600'>
                +{formatCurrency(saleInfo.transferValue || 0)}
              </span>
            </div>
          )}

          <Separator />

          <div className='flex justify-between items-center font-semibold'>
            <span className='text-slate-800'>{t('steps.saleInfo.priceSummary.totalSalePrice')}</span>
            <Badge variant='secondary' className='text-xs'>
              {formatCurrency(getTotalSalePrice())}
            </Badge>
          </div>

          {tradeInInfo.hasTradeIn && tradeInInfo.vehicles.length > 0 && (
            <>
              <div className='flex justify-between items-center'>
                <span className='text-slate-600'>
                  {t('steps.tradeIn.summary.tradeInValue')} ({tradeInInfo.vehicles.length})
                </span>
                <span className='font-medium text-sky-600'>
                  -{formatCurrency(tradeInInfo.vehicles.reduce((sum, v) => sum + (v.trade_in_value || 0), 0))}
                </span>
              </div>

              <Separator />

              <div className='flex justify-between items-center font-bold'>
                <span className='text-slate-800'>{t('steps.tradeIn.summary.totalToPay')}</span>
                <Badge variant='secondary' className='text-xs'>
                  {formatCurrency(getRemainingAmount())}
                </Badge>
              </div>

              {/* La parte de pago supera lo que debe pagar → saldo a favor del cliente. */}
              {getCustomerCredit() > 0 && (
                <div className='flex justify-between items-center font-bold'>
                  <span className='text-emerald-700'>Saldo a favor del cliente</span>
                  <Badge className='bg-emerald-100 text-emerald-800 text-xs hover:bg-emerald-100'>
                    {formatCurrency(getCustomerCredit())}
                  </Badge>
                </div>
              )}
            </>
          )}

          {(saleInfo.payments.length > 0 ||
            reservationExtras.filter((extra) => extra.type === 'reservation_payment').length > 0) && (
            <div className='mt-1 p-2 bg-sky-50 rounded text-[11px]'>
              <div className='flex justify-between items-center'>
                <span>{t('steps.payments.summary.totalPaymentsRegistered')}</span>
                <span className='font-medium'>{formatCurrency(getTotalPayments())}</span>
              </div>
              <div className='flex justify-between items-center mt-0.5'>
                <span>{t('steps.summary.price.pendingBalance')}</span>
                <span
                  className={`font-medium ${
                    getReceivedRemaining() < 0 ? 'text-amber-700' : ''
                  }`}
                >
                  {formatCurrency(getRemainingAmount() - getTotalPayments())}
                </span>
              </div>
              {/* Sobrepago real: sólo cuando lo COBRADO supera el total. Las cuotas/
                  letras a plazo (con interés) no lo disparan → venta financiada válida. */}
              {getReceivedRemaining() < 0 && (
                <div className='flex items-start gap-1.5 rounded bg-amber-50 border border-amber-200 px-2 py-1.5 mt-1'>
                  <AlertTriangle className='w-3 h-3 text-amber-600 mt-px shrink-0' />
                  <p className='text-[10px] text-amber-800 leading-tight'>
                    Los pagos registrados superan el total a pagar. Revisa los montos
                    o los adicionales antes de confirmar la venta.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Message */}
      <div className='p-2 rounded-lg bg-gradient-to-br from-sky-50 to-sky-100/40 border border-sky-200'>
        <div className='flex items-start gap-2'>
          <CheckCircle className='w-4 h-4 text-sky-600 mt-0.5 shrink-0' />
          <div>
            <p className='text-xs font-semibold text-sky-800'>
              {t('steps.summary.confirmation.title')}
            </p>
            <p className='text-[11px] text-sky-700 mt-0.5'>
              {t('steps.summary.confirmation.description')}
            </p>
            <ul className='text-[11px] text-sky-700 mt-1 ml-3 list-disc'>
              <li>{t('steps.summary.confirmation.items.saleRecord')}</li>
              <li>{t('steps.summary.confirmation.items.saleDocument')}</li>
              {tradeInInfo.hasTradeIn && (
                <li>{t('steps.summary.confirmation.items.tradeInRecord')}</li>
              )}
              {additionals.length > 0 && (
                <li>{t('steps.summary.confirmation.items.additionalsRecord')}</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryStep;

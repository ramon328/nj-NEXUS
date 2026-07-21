import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Plus, Trash2, Minus } from 'lucide-react';
import { useVehicleSaleStore } from '@/stores/vehicleSaleStore';
import AdditionalsCard from '../components/AdditionalsCard';
import PriceInput from '@/components/ui/inputs/price-input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/functions';

const CARD = 'rounded-xl border border-slate-200 bg-white p-3 space-y-3';
const LABEL = 'text-xs font-medium text-slate-600';
const FIELD = 'h-9 text-[13px]';

// Financieras frecuentes. Si la de ellos no está, eligen "Otra" y escriben el nombre.
const FINANCIERAS = [
  'Santander', 'BCI', 'BancoEstado', 'Scotiabank', 'Itaú', 'BICE', 'Security',
  'Falabella', 'Ripley', 'CMR', 'GMAC', 'Volksbank', 'Cooperativa Coopeuch',
  'Global', 'Forum', 'Tanner', 'Autofin',
];

const SaleInfoStep = () => {
  const { user, userRole } = useAuth();
  const { t } = useTranslation('vehicleSales');
  const {
    saleInfo,
    vehicle,
    updateSaleInfo,
    addPayment,
    removePayment,
    getTotalPayments,
    getPendingPayments,
    getRemainingAmount,
    getRemainingToAllocate,
    getReceivedRemaining,
    reservationExtras,
  } = useVehicleSaleStore();

  // ── Desglose de pagos (lo que el cliente YA pagó + cuotas/letras a plazo) ──
  const [newPaymentTitle, setNewPaymentTitle] = useState('');
  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
  // Cuota / letra a plazo: pendiente de pago, con vencimiento.
  const [isInstallment, setIsInstallment] = useState(false);
  const [newPaymentDueDate, setNewPaymentDueDate] = useState('');

  const fmtDate = (d?: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CL') : '';

  const reservationPayments = reservationExtras.filter(
    (e) => e.type === 'reservation_payment'
  );

  const handleAddPayment = () => {
    if (!newPaymentTitle.trim() || newPaymentAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Ingresa un concepto y un monto válido para el pago.',
        variant: 'destructive',
      });
      return;
    }
    if (isInstallment && !newPaymentDueDate) {
      toast({
        title: 'Error',
        description: 'La cuota a plazo necesita una fecha de vencimiento.',
        variant: 'destructive',
      });
      return;
    }
    addPayment({
      id: Date.now().toString(),
      title: newPaymentTitle.trim(),
      amount: newPaymentAmount,
      // Cuota/letra a plazo → pendiente de pago, con vencimiento.
      ...(isInstallment ? { paid: false, dueDate: newPaymentDueDate } : {}),
    });
    setNewPaymentTitle('');
    setNewPaymentAmount(0);
    setIsInstallment(false);
    setNewPaymentDueDate('');
  };

  // "Otra" financiera: si la guardada no está en la lista, mostrar campo libre.
  const [financieraOtra, setFinancieraOtra] = useState<boolean>(
    () => !!saleInfo.financiera && !FINANCIERAS.includes(saleInfo.financiera)
  );

  // El vendedor se auto-asigna por detrás (vehículo asignado o usuario actual
  // si es vendedor) — sin campo en el formulario. La comisión se gestiona aparte
  // con splits, por eso acá no se pide vendedor ni porcentaje.
  useEffect(() => {
    let cancelled = false;
    const autoAssignSeller = async () => {
      if (vehicle?.seller_id) {
        updateSaleInfo({ sellerId: vehicle.seller_id });
        return;
      }
      if ((userRole === 'seller' || userRole === 'vendedor') && user?.id) {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();
        if (!cancelled && data) updateSaleInfo({ sellerId: data.id });
      }
    };
    autoAssignSeller();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle?.seller_id]);

  const belowMin =
    !!vehicle?.min_price &&
    saleInfo.salePrice > 0 &&
    saleInfo.salePrice < vehicle.min_price;

  return (
    <div className='space-y-3'>
      {/* Vehículo */}
      <div className='rounded-xl border border-slate-200 bg-slate-50/70 p-3'>
        <p className='text-xs font-medium text-slate-500 mb-2'>
          {t('steps.saleInfo.vehicleInfo.title')}
        </p>
        <div className='grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]'>
          <div className='flex justify-between'>
            <span className='text-slate-500'>{t('steps.saleInfo.vehicleInfo.brandModel')}</span>
            <span className='font-medium text-slate-900'>
              {vehicle?.brand?.name} {vehicle?.model?.name}
            </span>
          </div>
          <div className='flex justify-between'>
            <span className='text-slate-500'>{t('steps.saleInfo.vehicleInfo.year')}</span>
            <span className='font-medium text-slate-900'>{vehicle?.year}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-slate-500'>{t('steps.saleInfo.vehicleInfo.licensePlate')}</span>
            <span className='font-medium text-slate-900'>{vehicle?.license_plate}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-slate-500'>{t('steps.saleInfo.vehicleInfo.basePrice')}</span>
            <span className='font-medium text-slate-900'>{formatCurrency(vehicle?.price || 0)}</span>
          </div>
        </div>
      </div>

      {/* Datos de la venta */}
      <div className={CARD}>
        <p className='text-[13px] font-semibold text-slate-900'>
          {t('steps.saleInfo.saleDetails.title')}
        </p>

        {/* Precio final */}
        <div className='space-y-1.5'>
          <Label htmlFor='salePrice' className={LABEL}>
            {t('steps.saleInfo.saleDetails.finalPrice')}
          </Label>
          <PriceInput
            id='salePrice'
            value={saleInfo.salePrice}
            onChange={(value) => updateSaleInfo({ salePrice: value })}
            placeholder={t('steps.saleInfo.saleDetails.finalPricePlaceholder')}
            className={`w-full ${FIELD}`}
          />
          {vehicle?.min_price && (
            <div
              className={`flex items-center gap-1.5 text-[11px] ${
                belowMin ? 'text-red-600' : 'text-slate-400'
              }`}
            >
              <AlertTriangle className='h-3 w-3 shrink-0' />
              <span>
                Mínimo: <strong>{formatCurrency(vehicle.min_price)}</strong>
                {belowMin && (
                  <span className='ml-1 font-medium'>— estás bajo el mínimo</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Fecha + Método de pago */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <div className='space-y-1.5'>
            <Label htmlFor='saleDate' className={LABEL}>
              Fecha de la venta
            </Label>
            <Input
              id='saleDate'
              type='date'
              value={saleInfo.saleDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => updateSaleInfo({ saleDate: e.target.value })}
              className={FIELD}
            />
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='financiada' className={LABEL}>
              Forma de pago
            </Label>
            <label
              htmlFor='financiada'
              className={`flex items-center gap-2 px-3 rounded-md border border-slate-200 cursor-pointer ${FIELD}`}
            >
              <input
                id='financiada'
                type='checkbox'
                checked={saleInfo.paymentMethod === 'credit'}
                onChange={(e) =>
                  updateSaleInfo({
                    paymentMethod: e.target.checked ? 'credit' : 'cash',
                  })
                }
                className='h-4 w-4 accent-sky-600'
              />
              <span className='text-sm text-slate-700'>
                Venta financiada (crédito)
              </span>
            </label>
          </div>
        </div>

        {/* Financiera + comisión financiera (sólo crédito) */}
        {saleInfo.paymentMethod === 'credit' && (
          <>
            <div className='space-y-1.5'>
              <Label htmlFor='financiera' className={LABEL}>
                Financiera
              </Label>
              <Select
                value={financieraOtra ? 'Otra' : saleInfo.financiera || ''}
                onValueChange={(value) => {
                  if (value === 'Otra') {
                    setFinancieraOtra(true);
                    updateSaleInfo({ financiera: '' });
                  } else {
                    setFinancieraOtra(false);
                    updateSaleInfo({ financiera: value });
                  }
                }}
              >
                <SelectTrigger id='financiera' className={FIELD}>
                  <SelectValue placeholder='Seleccionar financiera' />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIERAS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                  <SelectItem value='Otra'>Otra</SelectItem>
                </SelectContent>
              </Select>
              {financieraOtra && (
                <Input
                  value={saleInfo.financiera}
                  onChange={(e) => updateSaleInfo({ financiera: e.target.value })}
                  placeholder='Nombre de la financiera'
                  className={`mt-1.5 ${FIELD}`}
                />
              )}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='financingCommission' className={LABEL}>
                Comisión financiera ($)
              </Label>
              <PriceInput
                id='financingCommission'
                value={saleInfo.financingCommission}
                onChange={(value) => updateSaleInfo({ financingCommission: value })}
                placeholder='0'
                className={`w-full ${FIELD}`}
              />
              <p className='text-[11px] text-slate-400 leading-tight'>
                Comisión que te paga la financiera. Se suma a la utilidad de este
                auto. Uso interno — no aparece en la nota de venta.
              </p>
            </div>
          </>
        )}

        {/* Valor de transferencia (CRT) — costo de transferencia del auto.
            Editable acá (único punto para un auto ya vendido). El check decide si
            se le cobra al cliente: si está activo suma al total y aparece en la
            nota de venta. Nunca es utilidad de la automotora (es pass-through). */}
        <div className='space-y-1.5'>
          <Label htmlFor='transferValue' className={LABEL}>
            Valor de transferencia
          </Label>
          <PriceInput
            id='transferValue'
            value={saleInfo.transferValue || 0}
            onChange={(value) => updateSaleInfo({ transferValue: value })}
            placeholder='0'
            className={`w-full ${FIELD}`}
          />
          <label
            htmlFor='transferCharged'
            className='flex items-center gap-2 cursor-pointer pt-0.5'
          >
            <input
              id='transferCharged'
              type='checkbox'
              checked={saleInfo.transferValueCharged}
              onChange={(e) =>
                updateSaleInfo({ transferValueCharged: e.target.checked })
              }
              className='h-4 w-4 accent-sky-600'
            />
            <span className='text-[13px] text-slate-700'>
              Cobrar la transferencia al cliente
            </span>
          </label>
          <p className='text-[11px] text-slate-400 leading-tight'>
            {saleInfo.transferValueCharged
              ? 'Se suma al total a pagar y aparece en la nota de venta. No es utilidad de la automotora (es pass-through).'
              : 'Solo informativo: se guarda en el auto pero no se le cobra al cliente ni suma al total.'}
          </p>
        </div>

        {/* Notas */}
        <div className='space-y-1.5'>
          <Label htmlFor='notes' className={LABEL}>
            {t('steps.saleInfo.saleDetails.notes')}
          </Label>
          <Textarea
            id='notes'
            value={saleInfo.notes}
            onChange={(e) => updateSaleInfo({ notes: e.target.value })}
            placeholder={t('steps.saleInfo.saleDetails.notesPlaceholder')}
            rows={2}
            className='text-[13px] resize-none'
          />
        </div>
      </div>

      {/* Adicionales (tarjeta compartida — también vive en el paso Permuta).
          Va ANTES del desglose para que los extras (transferencia, accesorios)
          ya estén ingresados cuando se registran los pagos y el "Total a pagar"
          los incluya — así el saldo no queda negativo por diseño. */}
      <AdditionalsCard />

      {/* Desglose de pagos — lo que el cliente ya pagó */}
      <div className={CARD}>
        <div>
          <p className='text-[13px] font-semibold text-slate-900'>
            Desglose de pagos y cuotas
          </p>
          <p className='text-[11px] text-slate-400'>
            Registra lo que el cliente ya pagó (pie, abono, transferencia) y/o las
            cuotas / letras a plazo que quedan pendientes. Las cuotas a plazo salen
            en la nota de venta con su vencimiento.
          </p>
        </div>

        {/* Nuevo pago */}
        <div className='rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 space-y-2'>
          <Input
            value={newPaymentTitle}
            onChange={(e) => setNewPaymentTitle(e.target.value)}
            placeholder={
              isInstallment
                ? 'Concepto (ej: Letra 1/6)'
                : 'Concepto (ej: Pie, Abono, Transferencia)'
            }
            className={FIELD}
          />
          <PriceInput
            value={newPaymentAmount}
            onChange={setNewPaymentAmount}
            placeholder={isInstallment ? 'Monto de la cuota' : 'Monto pagado'}
            className={`w-full ${FIELD}`}
          />

          {/* Cuota / letra a plazo (pendiente de pago, con vencimiento) */}
          <label htmlFor='isInstallment' className='flex items-center gap-2 cursor-pointer'>
            <input
              id='isInstallment'
              type='checkbox'
              checked={isInstallment}
              onChange={(e) => setIsInstallment(e.target.checked)}
              className='h-4 w-4 accent-sky-600'
            />
            <span className='text-[13px] text-slate-700'>
              Es cuota / letra a plazo (pendiente de pago)
            </span>
          </label>
          {isInstallment && (
            <div className='space-y-1.5'>
              <Label htmlFor='paymentDueDate' className={LABEL}>
                Vencimiento
              </Label>
              <Input
                id='paymentDueDate'
                type='date'
                value={newPaymentDueDate}
                onChange={(e) => setNewPaymentDueDate(e.target.value)}
                className={FIELD}
              />
            </div>
          )}

          <Button onClick={handleAddPayment} size='sm' className='w-full h-9 text-[13px]'>
            <Plus className='w-3.5 h-3.5 mr-1' />
            {isInstallment ? 'Agregar cuota' : 'Agregar pago'}
          </Button>
        </div>

        {/* Pagos de reserva (sólo lectura) */}
        {reservationPayments.length > 0 && (
          <div className='space-y-1'>
            <p className='text-[11px] font-medium text-slate-500'>Pagos de reserva</p>
            {reservationPayments.map((payment) => (
              <div
                key={payment.id}
                className='flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-[13px]'
              >
                <span className='font-medium text-slate-700'>{payment.title}</span>
                <span className='font-medium text-sky-700'>{formatCurrency(payment.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pagos de la venta */}
        {saleInfo.payments.length > 0 && (
          <div className='space-y-1.5'>
            {saleInfo.payments.map((payment) => {
              const isPending = payment.paid === false;
              return (
                <div
                  key={payment.id}
                  className='flex justify-between items-center rounded-lg border border-slate-200 p-2.5 text-[13px]'
                >
                  <div className='min-w-0'>
                    <span className='font-medium text-slate-800 truncate'>{payment.title}</span>
                    <div className={isPending ? 'text-amber-600' : 'text-emerald-600'}>
                      {formatCurrency(payment.amount)}
                    </div>
                    {isPending && (
                      <div className='text-[11px] text-amber-700 font-medium'>
                        Cuota a plazo{payment.dueDate ? ` · vence ${fmtDate(payment.dueDate)}` : ''}
                      </div>
                    )}
                  </div>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={() => removePayment(payment.id)}
                    className='h-7 w-7 p-0 text-slate-400 hover:text-red-600 shrink-0'
                  >
                    <Trash2 className='w-3.5 h-3.5' />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Saldo */}
        {getTotalPayments() > 0 && (
          <div className='rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 space-y-1.5 text-[13px]'>
            <div className='flex justify-between'>
              <span className='text-slate-500'>Total a pagar</span>
              <span className='font-medium text-slate-900'>{formatCurrency(getRemainingAmount())}</span>
            </div>
            <div className='flex justify-between'>
              <span className='flex items-center gap-1 text-slate-500'>
                <Minus className='w-3 h-3' />
                Pagos recibidos
              </span>
              <span className='font-medium text-emerald-600'>
                −{formatCurrency(getTotalPayments() - getPendingPayments())}
              </span>
            </div>
            {getPendingPayments() > 0 && (
              <div className='flex justify-between'>
                <span className='text-amber-700'>Cuotas a plazo (pendientes)</span>
                <span className='font-medium text-amber-700'>{formatCurrency(getPendingPayments())}</span>
              </div>
            )}
            <div className='flex justify-between pt-1.5 border-t border-slate-200'>
              <span className='font-semibold text-slate-900'>Saldo pendiente</span>
              {/* El valor muestra el neto del plan (puede ser negativo con letras a
                  plazo); se pinta en ámbar sólo si hay sobrepago REAL (lo cobrado
                  supera el total), no por las cuotas a plazo con interés. */}
              <span
                className={`font-semibold ${
                  getReceivedRemaining() < 0 ? 'text-amber-700' : 'text-slate-900'
                }`}
              >
                {formatCurrency(getRemainingToAllocate())}
              </span>
            </div>
            {/* Sobrepago real: sólo cuando lo COBRADO (sin cuotas a plazo) supera el
                total. Una venta financiada con letras con interés no lo dispara. */}
            {getReceivedRemaining() < 0 && (
              <div className='flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-2'>
                <AlertTriangle className='w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0' />
                <p className='text-[11px] text-amber-800 leading-tight'>
                  Los pagos registrados superan el total a pagar. Revisa los montos
                  o agrega los adicionales que faltan (transferencia, accesorios)
                  antes de continuar.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SaleInfoStep;

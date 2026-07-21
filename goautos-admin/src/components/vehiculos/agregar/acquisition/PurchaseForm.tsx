import React, { useState, useEffect, useRef } from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerInput } from '@/components/ui/inputs/DatePickerInput';
import { FieldInfoTooltip } from '@/components/ui/inputs/FieldInfoTooltip';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Control, UseFormReturn } from 'react-hook-form';
import { AcquisitionFormValues } from './AcquisitionFormSchema';
import CustomerSelect from './CustomerSelect';
import NumberInputField from '@/components/vehiculos/agregar/form/NumberInputField';
import { useTranslation } from 'react-i18next';
import { ChevronDown, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PurchaseFormProps {
  control: Control<AcquisitionFormValues>;
  customers: any[];
  isLoading: boolean;
  onNewCustomer: () => void;
  form: UseFormReturn<AcquisitionFormValues>;
  onRefreshCustomers?: () => void | Promise<void>;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({
  control,
  customers,
  isLoading,
  onNewCustomer,
  form,
  onRefreshCustomers,
}) => {
  const { t } = useTranslation('common');
  const [showBankingInfo, setShowBankingInfo] = useState(false);

  // Autocompletar datos bancarios desde el dueño/cliente seleccionado, si ya los tiene.
  // Solo al cambiar de dueño (no en la carga inicial, para no pisar datos ya guardados en edición).
  const selectedCustomerId = form.watch('purchaseCustomerId');
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (!selectedCustomerId) return;
    const customer = customers.find((c) => String(c?.id) === String(selectedCustomerId));
    if (!customer) return;
    if (customer.bank_name) form.setValue('purchaseBankName', customer.bank_name);
    if (customer.account_type) form.setValue('purchaseAccountType', customer.account_type);
    if (customer.account_number) form.setValue('purchaseAccountNumber', customer.account_number);
    if (customer.account_holder_name) form.setValue('purchaseAccountHolderName', customer.account_holder_name);
    if (customer.account_holder_rut) form.setValue('purchaseAccountHolderRut', customer.account_holder_rut);
    if (customer.bank_name || customer.account_number) setShowBankingInfo(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId]);

  return (
    <div className='space-y-3'>
      {/* Main card — all fields */}
      <div className='bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden'>
        {/* Proveedor */}
        <div className='p-4'>
          <span className='text-xs font-medium text-slate-700 mb-0.5 block'>
            {t('addVehicle.acquisition.form.purchase.customerLabel', 'Dueño al momento de la compra')}
            <span className='text-red-500 ml-0.5'>*</span>
          </span>
          <span className='text-[11px] text-slate-400 mb-2 block leading-snug'>
            {t('addVehicle.acquisition.form.purchase.customerDescription', 'A quién le compraste el auto (su dueño anterior). Puede ser persona o empresa.')}
          </span>
          <CustomerSelect
            control={control}
            name='purchaseCustomerId'
            label=''
            description=''
            customers={customers}
            isLoading={isLoading}
            onNewCustomer={onNewCustomer}
            form={form}
            onRefresh={onRefreshCustomers}
          />
        </div>

        {/* Divider */}
        <div className='border-t border-slate-100 mx-4' />

        {/* Fecha de compra */}
        <div className='p-4'>
          <div className='flex items-center gap-2 mb-1.5'>
            <CalendarDays className='w-4 h-4 text-blue-500' />
            <span className='text-xs font-medium text-slate-700'>
              Fecha de compra
              <span className='text-slate-400 text-xs ml-1'>(opcional)</span>
            </span>
          </div>
          <FormField
            control={control}
            name='acquisitionDate'
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <DatePickerInput
                    value={field.value}
                    onChange={field.onChange}
                    className='bg-white border-slate-200'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Divider */}
        <div className='border-t border-slate-100 mx-4' />

        {/* Precio + Notas */}
        <div className='p-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <span className='text-xs font-medium text-slate-700 mb-1.5 block'>
                {t('addVehicle.acquisition.form.purchase.priceLabel', 'Precio de compra')}
                <span className='text-red-500 ml-0.5'>*</span>
              </span>
              <NumberInputField
                control={control}
                name='purchasePrice'
                label=''
                prefix='$'
                formatWithSeparator={true}
              />
            </div>
            <div>
              <span className='text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1'>
                {t('addVehicle.acquisition.form.notesLabel', 'Notas')}
                <span className='text-slate-400 text-xs'>(opcional)</span>
                <FieldInfoTooltip text="Se imprime en la Nota de Compra del vehículo (y aparece en el resumen de la adquisición). No se publica en el sitio web." />
              </span>
              <FormField
                control={control}
                name='documentNotes'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        rows={1}
                        placeholder={t('addVehicle.acquisition.form.notesPlaceholder', 'Ej: Incluye dos juegos de llaves...')}
                        className='resize-none bg-white border-slate-200 text-sm h-9 min-h-0 py-2'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className='border-t border-slate-100 mx-4' />

        {/* Régimen de IVA de la VENTA — define el débito fiscal, se hereda a la salida (R2).
            El IVA de la COMPRA es independiente y se marca en el toggle de abajo. */}
        <div className='p-4'>
          <span className='text-xs font-medium text-slate-700 mb-1.5 block'>
            Régimen de IVA de la venta
          </span>
          <span className='text-[11px] text-slate-400 mb-2 block leading-snug'>
            Define si la VENTA lleva IVA (débito fiscal) y se hereda a la salida.
            "Afecto" = venta con IVA. "Exento" = venta sin IVA. "Hereda" usa el default
            de la automotora. El IVA de la compra se marca aparte, abajo.
          </span>
          <FormField
            control={control}
            name='purchaseIvaMode'
            render={({ field }) => (
              <FormItem className='space-y-0'>
                <FormControl>
                  <div className='inline-flex rounded-lg bg-slate-100 p-0.5'>
                    {[
                      { v: 'inherit', l: 'Hereda' },
                      { v: 'afecto', l: 'Afecto' },
                      { v: 'exento', l: 'Exento' },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        type='button'
                        onClick={() => field.onChange(opt.v)}
                        className={cn(
                          'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                          (field.value ?? 'inherit') === opt.v
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        )}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Divider */}
        <div className='border-t border-slate-100 mx-4' />

        {/* IVA de la COMPRA — independiente del régimen de venta. Si la compra tiene
            factura afecta, el costo entra por su NETO al margen. */}
        <div className='p-4'>
          <FormField
            control={control}
            name='purchaseGeneraCreditoFiscal'
            render={({ field }) => {
              const price = Number(form.watch('purchasePrice')) || 0;
              const neto = Math.round(price / 1.19);
              const iva = price - neto;
              const fmt = (n: number) =>
                new Intl.NumberFormat('es-CL', {
                  style: 'currency',
                  currency: 'CLP',
                  maximumFractionDigits: 0,
                }).format(n);
              return (
                <FormItem className='space-y-2'>
                  <div className='flex items-center justify-between rounded-lg border border-slate-200 p-3'>
                    <div className='space-y-0.5 pr-3'>
                      <FormLabel className='text-xs font-medium text-slate-700'>
                        ¿La compra tiene factura afecta con IVA recuperable?
                      </FormLabel>
                      <span className='text-[11px] text-slate-400 block leading-snug'>
                        Actívalo si compraste con factura afecta (recuperas el IVA): el
                        costo entra por su NETO. Déjalo apagado si es compra a particular,
                        sin factura. Es independiente del régimen de venta.
                      </span>
                    </div>
                    <FormControl>
                      <Switch
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>

                  {field.value && price > 0 && (
                    <div className='rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-[12px]'>
                      <div className='mb-1.5 font-medium text-emerald-800'>
                        Cómo entra al costo (IVA 19%)
                      </div>
                      <div className='flex items-center justify-between text-slate-600'>
                        <span>Precio de compra (con IVA)</span>
                        <span className='tabular-nums'>{fmt(price)}</span>
                      </div>
                      <div className='flex items-center justify-between text-slate-600'>
                        <span>IVA recuperable (no es costo)</span>
                        <span className='tabular-nums text-red-600'>− {fmt(iva)}</span>
                      </div>
                      <div className='mt-1.5 flex items-center justify-between border-t border-emerald-200 pt-1.5 font-semibold text-emerald-900'>
                        <span>Costo neto que entra al margen</span>
                        <span className='tabular-nums'>{fmt(neto)}</span>
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>
      </div>

      {/* Banking Information Section (Collapsible) */}
      <Collapsible open={showBankingInfo} onOpenChange={setShowBankingInfo}>
        <CollapsibleTrigger asChild>
          <button
            type='button'
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all duration-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)]',
              showBankingInfo
                ? 'border-slate-300 bg-white'
                : 'border-slate-200/60 bg-white hover:bg-slate-50/50'
            )}
          >
            <span className={cn(
              'text-xs font-medium',
              showBankingInfo ? 'text-slate-800' : 'text-slate-700'
            )}>
              {t('addVehicle.acquisition.form.purchase.bankingInfo.title', 'Datos bancarios para pago')}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                showBankingInfo ? 'rotate-180 text-slate-600' : 'text-slate-400'
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className='mt-2'>
          <div className='bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 p-4 space-y-3'>
            {/* Row 1: Banco, Tipo, Número */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
              <FormField
                control={control}
                name='purchaseBankName'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='text-xs font-medium text-slate-600'>
                      {t('addVehicle.acquisition.form.purchase.bankingInfo.bankName', 'Banco')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Ej: Banco Estado'
                        className='bg-white border-slate-200 h-9 text-sm'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name='purchaseAccountType'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='text-xs font-medium text-slate-600'>
                      {t('addVehicle.acquisition.form.purchase.bankingInfo.accountType', 'Tipo')}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger className='bg-white border-slate-200 h-9'>
                          <SelectValue placeholder='Seleccionar' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='corriente'>Corriente</SelectItem>
                        <SelectItem value='ahorro'>Ahorro</SelectItem>
                        <SelectItem value='vista'>Vista</SelectItem>
                        <SelectItem value='rut'>RUT</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name='purchaseAccountNumber'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='text-xs font-medium text-slate-600'>
                      {t('addVehicle.acquisition.form.purchase.bankingInfo.accountNumber', 'N° cuenta')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='1234567890'
                        className='bg-white border-slate-200 font-mono h-9 text-sm'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Titular y RUT */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              <FormField
                control={control}
                name='purchaseAccountHolderName'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='text-xs font-medium text-slate-600'>
                      {t('addVehicle.acquisition.form.purchase.bankingInfo.holderName', 'Titular')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Ej: Juan Pérez'
                        className='bg-white border-slate-200 h-9 text-sm'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name='purchaseAccountHolderRut'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='text-xs font-medium text-slate-600'>
                      {t('addVehicle.acquisition.form.purchase.bankingInfo.holderRut', 'RUT titular')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='12.345.678-9'
                        className='bg-white border-slate-200 h-9 text-sm'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default PurchaseForm;

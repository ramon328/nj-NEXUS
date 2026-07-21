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
import { FieldInfoTooltip } from '@/components/ui/inputs/FieldInfoTooltip';
import { formatCurrency } from '@/utils/functions';
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
import { ChevronDown, CalendarDays } from 'lucide-react';
import { Control, UseFormReturn } from 'react-hook-form';
import { AcquisitionFormValues } from './AcquisitionFormSchema';
import CustomerSelect from './CustomerSelect';
import NumberInputField from '@/components/vehiculos/agregar/form/NumberInputField';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useDealerships } from '@/hooks/useDealerships';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ConsignmentFormProps {
  control: Control<AcquisitionFormValues>;
  customers: any[];
  isLoading: boolean;
  onNewCustomer: () => void;
  form: UseFormReturn<AcquisitionFormValues>;
  onRefreshCustomers?: () => void | Promise<void>;
}

const ConsignmentForm: React.FC<ConsignmentFormProps> = ({
  control,
  customers,
  isLoading,
  onNewCustomer,
  form,
  onRefreshCustomers,
}) => {
  const { t } = useTranslation('common');
  const [showBankingInfo, setShowBankingInfo] = useState(false);
  const { dealerships } = useDealerships();
  const { clientId } = useAuth();
  const saleType = form.watch('consignmentSaleType');
  // Sin fallback: hasta que el usuario elija, ningún método queda pre-seleccionado
  // (evita que quede 'precio_garantizado' por descuido y reste el auto como costo).
  const consignmentMetodo = form.watch('consignmentMetodo');
  // Para mostrar el pago estimado al consignante en el método comisión.
  const comisionPct = form.watch('consignmentComisionPercentage');
  const comisionFijo = form.watch('consignmentComisionFixed');
  const precioVentaEsperada = form.watch('consignmentAgreedPrice');
  const comisionAutomotora =
    (Number(precioVentaEsperada || 0) * Number(comisionPct || 0)) / 100 +
    Number(comisionFijo || 0);
  const pagoConsignante = Math.max(
    0,
    Number(precioVentaEsperada || 0) - comisionAutomotora
  );

  // Pre-rellenar fecha de consignación con HOY al cargar el form si está
  // vacío. El campo es opcional pero la UX esperada por QA es que el default
  // sea la fecha actual (evita que tengan que ingresarla manualmente al crear).
  const dateInitializedRef = useRef(false);
  useEffect(() => {
    if (dateInitializedRef.current) return;
    const current = form.getValues('acquisitionDate');
    if (!current) {
      const today = new Date().toISOString().slice(0, 10);
      form.setValue('acquisitionDate', today, { shouldDirty: false });
    }
    dateInitializedRef.current = true;
  }, [form]);

  // Fetch sellers for "vendedor que trajo la consigna"
  const [sellers, setSellers] = useState<{ id: number; first_name: string; last_name: string }[]>([]);
  useEffect(() => {
    if (!clientId) return;
    supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('client_id', clientId)
      .in('rol', ['seller', 'vendedor', 'admin'])
      .order('first_name')
      .then(({ data }) => setSellers(data || []));
  }, [clientId]);

  return (
    <div className='space-y-3'>
      {/* Main card — all fields */}
      <div className='bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden'>
        {/* Consignatario */}
        <div className='p-4'>
          <span className='text-xs font-medium text-slate-700 mb-2 block'>
            {t('addVehicle.acquisition.form.consignment.customerLabel', 'Consignatario')}
            <span className='text-red-500 ml-0.5'>*</span>
          </span>
          <CustomerSelect
            control={control}
            name='consignmentCustomerId'
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

        {/* Método de consignación */}
        <div className='p-4'>
          <span className='text-xs font-medium text-slate-700 mb-2 block'>
            Método de consignación
            <span className='text-red-500 ml-0.5'>*</span>
          </span>
          <FormField
            control={control}
            name='consignmentMetodo'
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                    <button
                      type='button'
                      onClick={() => field.onChange('precio_garantizado')}
                      className={cn(
                        'text-left p-3 rounded-xl border-2 transition-all',
                        field.value === 'precio_garantizado'
                          ? 'border-emerald-500 bg-emerald-50/40'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <div className='text-[13px] font-semibold text-slate-900 mb-0.5'>
                        Precio garantizado
                      </div>
                      <div className='text-[11px] text-slate-500 leading-snug'>
                        Le pagas un precio acordado al consignante. Tu utilidad
                        es la diferencia entre la venta y ese precio.
                      </div>
                    </button>
                    <button
                      type='button'
                      onClick={() => field.onChange('comision')}
                      className={cn(
                        'text-left p-3 rounded-xl border-2 transition-all',
                        field.value === 'comision'
                          ? 'border-emerald-500 bg-emerald-50/40'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <div className='text-[13px] font-semibold text-slate-900 mb-0.5'>
                        Por comisión
                      </div>
                      <div className='text-[11px] text-slate-500 leading-snug'>
                        Cobras % sobre el precio de venta y/o un monto fijo.
                        El resto va para el consignante.
                      </div>
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Inputs específicos del método comisión */}
          {consignmentMetodo === 'comision' && (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 rounded-xl bg-emerald-50/30 border border-emerald-100'>
              <div>
                <span className='text-xs font-medium text-slate-700 mb-1.5 block'>
                  Porcentaje (%)
                  <span className='text-slate-400 text-xs ml-1'>(opcional si hay fijo)</span>
                </span>
                <NumberInputField
                  control={control}
                  name='consignmentComisionPercentage'
                  label=''
                  prefix=''
                  formatWithSeparator={false}
                />
              </div>
              <div>
                <span className='text-xs font-medium text-slate-700 mb-1.5 block'>
                  Monto fijo
                  <span className='text-slate-400 text-xs ml-1'>(opcional si hay %)</span>
                </span>
                <NumberInputField
                  control={control}
                  name='consignmentComisionFixed'
                  label=''
                  prefix='$'
                  formatWithSeparator={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className='border-t border-slate-100 mx-4' />

        {/* Precios */}
        <div className='p-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <span className='text-xs font-medium text-slate-700 mb-1.5 block'>
                {t('addVehicle.acquisition.form.consignment.suggestedPriceLabel', 'Precio sugerido')}
                <span className='text-slate-400 text-xs ml-1'>(opcional)</span>
              </span>
              <NumberInputField
                control={control}
                name='consignmentSuggestedPrice'
                label=''
                prefix='$'
                formatWithSeparator={true}
              />
            </div>
            <div>
              <span className='text-xs font-medium text-slate-700 mb-1.5 block'>
                {consignmentMetodo === 'comision'
                  ? 'Precio publicación / venta esperada'
                  : t('addVehicle.acquisition.form.consignment.agreedPriceLabel', 'Precio garantizado de consignación')}
                {consignmentMetodo === 'precio_garantizado' && (
                  <span className='text-red-500 ml-0.5'>*</span>
                )}
              </span>
              <NumberInputField
                control={control}
                name='consignmentAgreedPrice'
                label=''
                prefix='$'
                formatWithSeparator={true}
              />
            </div>
          </div>

          {/* Pago estimado al consignante (método comisión): venta esperada − comisión. */}
          {consignmentMetodo === 'comision' && Number(precioVentaEsperada || 0) > 0 && (
            <div className='mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3'>
              <div className='min-w-0'>
                <p className='text-xs font-medium text-slate-700'>Pago estimado al consignante</p>
                <p className='text-[11px] text-slate-500'>
                  Venta esperada − tu comisión ({formatCurrency(comisionAutomotora)})
                </p>
              </div>
              <span className='text-sm font-semibold text-slate-900 shrink-0'>
                {formatCurrency(pagoConsignante)}
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className='border-t border-slate-100 mx-4' />

        {/* Fecha de consignación */}
        <div className='p-4'>
          <div className='flex items-center gap-2 mb-1.5'>
            <CalendarDays className='w-4 h-4 text-emerald-500' />
            <span className='text-xs font-medium text-slate-700'>
              Fecha de consignación
              <span className='text-slate-400 text-xs ml-1'>(opcional)</span>
            </span>
          </div>
          <FormField
            control={control}
            name='acquisitionDate'
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type='date'
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)}
                    className='bg-white border-slate-200 h-9 text-sm'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Divider */}
        <div className='border-t border-slate-100 mx-4' />

        {/* Tipo de venta + Sucursal */}
        <div className='p-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <span className='text-xs font-medium text-slate-700 mb-1.5 block'>
                Tipo de venta
                <span className='text-slate-400 text-xs ml-1'>(opcional)</span>
              </span>
              <FormField
                control={control}
                name='consignmentSaleType'
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={(val) => field.onChange(val === '__none__' ? undefined : val)}
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger className='bg-white border-slate-200 h-9'>
                          <SelectValue placeholder='Seleccionar' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='__none__'>— Sin especificar —</SelectItem>
                        <SelectItem value='contado'>Contado</SelectItem>
                        <SelectItem value='credito'>Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div>
              <span className='text-xs font-medium text-slate-700 mb-1.5 block'>
                Sucursal
                <span className='text-slate-400 text-xs ml-1'>(opcional)</span>
              </span>
              <FormField
                control={control}
                name='consignmentDealershipId'
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={(val) => field.onChange(val === '_none' ? undefined : val)}
                      value={field.value ? String(field.value) : '_none'}
                    >
                      <FormControl>
                        <SelectTrigger className='bg-white border-slate-200 h-9'>
                          <SelectValue placeholder='Sin sucursal' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='_none'>Sin sucursal</SelectItem>
                        {dealerships.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.address || `Sucursal ${d.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Financiera (solo si tipo = crédito) */}
          {saleType === 'credito' && (
            <div className='mt-3'>
              <span className='text-xs font-medium text-slate-700 mb-1.5 block'>
                Financiera
                <span className='text-slate-400 text-xs ml-1'>(opcional)</span>
              </span>
              <FormField
                control={control}
                name='consignmentFinanciera'
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger className='bg-white border-slate-200 h-9'>
                          <SelectValue placeholder='Seleccionar financiera' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='Santander'>Santander</SelectItem>
                        <SelectItem value='BCI'>BCI</SelectItem>
                        <SelectItem value='BancoEstado'>BancoEstado</SelectItem>
                        <SelectItem value='Scotiabank'>Scotiabank</SelectItem>
                        <SelectItem value='Itaú'>Itaú</SelectItem>
                        <SelectItem value='BICE'>BICE</SelectItem>
                        <SelectItem value='Security'>Security</SelectItem>
                        <SelectItem value='Falabella'>Falabella</SelectItem>
                        <SelectItem value='Ripley'>Ripley</SelectItem>
                        <SelectItem value='CMR'>CMR</SelectItem>
                        <SelectItem value='GMAC'>GMAC</SelectItem>
                        <SelectItem value='Volksbank'>Volksbank</SelectItem>
                        <SelectItem value='Cooperativa Coopeuch'>Cooperativa Coopeuch</SelectItem>
                        <SelectItem value='Otra'>Otra</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className='border-t border-slate-100 mx-4' />

        {/* Vendedor que trajo la consigna */}
        <div className='p-4'>
          <span className='text-xs font-medium text-slate-700 mb-1.5 block'>
            Vendedor que trajo la consigna
            <span className='text-slate-400 text-xs ml-1'>(opcional)</span>
          </span>
          <FormField
            control={control}
            name='consignmentSellerId'
            render={({ field }) => (
              <FormItem>
                <Select
                  onValueChange={(val) => field.onChange(val === '_none' ? undefined : val)}
                  value={field.value ? String(field.value) : '_none'}
                >
                  <FormControl>
                    <SelectTrigger className='bg-white border-slate-200 h-9'>
                      <SelectValue placeholder='Sin vendedor asignado' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='_none'>Sin vendedor asignado</SelectItem>
                    {sellers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.first_name} {s.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Divider */}
        <div className='border-t border-slate-100 mx-4' />

        {/* Notas */}
        <div className='p-4'>
          <span className='text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1'>
            {t('addVehicle.acquisition.form.notesLabel', 'Notas')}
            <span className='text-slate-400 text-xs'>(opcional)</span>
            <FieldInfoTooltip text="Se imprime en el documento de consignación (y aparece en el resumen de la adquisición). No se publica en el sitio web." />
          </span>
          <FormField
            control={control}
            name='documentNotes'
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    rows={1}
                    placeholder={t('addVehicle.acquisition.form.notesPlaceholder', 'Ej: Contrato firmado el 15/01, vigencia 3 meses...')}
                    className='resize-none bg-white border-slate-200 text-sm h-9'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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
              {t('addVehicle.acquisition.form.consignment.bankingInfo.title', 'Datos bancarios para pago')}
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
                name='consignmentBankName'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='text-xs font-medium text-slate-600'>
                      {t('addVehicle.acquisition.form.consignment.bankingInfo.bankName', 'Banco')}
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
                name='consignmentAccountType'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='text-xs font-medium text-slate-600'>
                      {t('addVehicle.acquisition.form.consignment.bankingInfo.accountType', 'Tipo')}
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
                name='consignmentAccountNumber'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='text-xs font-medium text-slate-600'>
                      {t('addVehicle.acquisition.form.consignment.bankingInfo.accountNumber', 'N° cuenta')}
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
                name='consignmentAccountHolderName'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='text-xs font-medium text-slate-600'>
                      {t('addVehicle.acquisition.form.consignment.bankingInfo.holderName', 'Titular')}
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
                name='consignmentAccountHolderRut'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='text-xs font-medium text-slate-600'>
                      {t('addVehicle.acquisition.form.consignment.bankingInfo.holderRut', 'RUT titular')}
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

export default ConsignmentForm;

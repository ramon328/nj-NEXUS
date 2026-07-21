import { useForm } from 'react-hook-form';
import { RefObject, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import PriceInput from '@/components/ui/inputs/price-input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Paperclip, File } from 'lucide-react';
import { TransactionFormValues, AssumedBy } from './types';
import { useTranslation } from 'react-i18next';
import { useTransactionCategories } from '@/hooks/useTransactionCategories';
import { lineCostBasis } from '@/utils/fiscalCredit';

const IVA_PCT = 19;
const fmtCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n || 0);

interface TransactionFormProps {
  formRef?: RefObject<HTMLFormElement>;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  onCancel: () => void;
  isUploading: boolean;
  initialType?: 'expense' | 'income';
  mode?: 'edit' | 'add';
  initialValues?: Partial<TransactionFormValues>;
  /** ¿El vehículo es consignado? Habilita la opción "Consignador" en "Asumido por". */
  isConsigned?: boolean;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  formRef,
  onSubmit,
  onCancel,
  isUploading,
  initialType = 'expense',
  mode = 'add',
  initialValues,
  isConsigned = false,
}) => {
  const { t, i18n } = useTranslation('vehicleTransactions');

  const form = useForm<TransactionFormValues>({
    defaultValues: {
      title: initialValues?.title ?? '',
      description: initialValues?.description ?? '',
      type: initialValues?.type ?? initialType,
      amount: initialValues?.amount ?? undefined,
      category_id: initialValues?.category_id ?? undefined,
      documents: undefined,
      assumed_by: initialValues?.assumed_by ?? 'dealership',
      genera_credito_fiscal: (initialValues as any)?.genera_credito_fiscal ?? false,
      is_passthrough: (initialValues as any)?.is_passthrough ?? false,
    },
  });

  useEffect(() => {
    if (initialValues) {
      form.reset({
        title: initialValues.title ?? '',
        description: initialValues.description ?? '',
        type: initialValues.type ?? initialType,
        amount: initialValues.amount ?? undefined,
        category_id: initialValues.category_id ?? undefined,
        documents: undefined,
        assumed_by: initialValues.assumed_by ?? 'dealership',
        genera_credito_fiscal: (initialValues as any).genera_credito_fiscal ?? false,
        is_passthrough: (initialValues as any).is_passthrough ?? false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  // Desglose de IVA en vivo (Regla 3): mostramos explícitamente bruto → IVA → neto.
  // En GASTO = crédito fiscal recuperable; en INGRESO = débito fiscal (IVA que se
  // debe). En ambos el neto = monto / 1,19.
  const watchedType = form.watch('type');
  const watchedAmount = form.watch('amount');
  const watchedGeneraCF = form.watch('genera_credito_fiscal');
  const hasAmount = typeof watchedAmount === 'number' && watchedAmount > 0;
  const isExpense = watchedType === 'expense';
  const isIncome = watchedType === 'income';
  const showIvaToggle = isExpense || isIncome;
  const showIvaBreakdown = showIvaToggle && !!watchedGeneraCF && hasAmount;
  const ivaNeto = showIvaBreakdown ? lineCostBasis(watchedAmount as number, true, IVA_PCT) : 0;
  const ivaMonto = showIvaBreakdown ? (watchedAmount as number) - ivaNeto : 0;

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-5'
      >
        <FormField
          control={form.control}
          name='title'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.fields.title.label')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('form.fields.title.placeholder')}
                  {...field}
                  disabled={isUploading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <FormField
          control={form.control}
          name='type'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.fields.type.label')}</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  // Reset category when type changes
                  form.setValue('category_id', undefined);
                }}
                value={field.value}
                disabled={isUploading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.fields.type.placeholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='expense'>{t('form.fields.type.options.expense')}</SelectItem>
                  <SelectItem value='income'>{t('form.fields.type.options.income')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='category_id'
          render={({ field }) => {
            const currentType = form.watch('type');
            const { flatCategories, loading: loadingCategories } = useTransactionCategories(currentType);
            const currentLanguage = i18n.language as 'es' | 'en';

            return (
              <FormItem>
                <FormLabel>{t('form.fields.category.label')}</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString()}
                  disabled={isUploading || loadingCategories}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingCategories ? 'Cargando...' : t('form.fields.category.placeholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {flatCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        <span style={{ paddingLeft: `${category.indent * 16}px` }}>
                          {category.indent > 0 && '└ '}
                          {currentLanguage === 'es' ? category.label_es : category.label_en}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        </div>

        {/* Campo de quién asume el gasto - solo para gastos */}
        {form.watch('type') === 'expense' && (
          <FormField
            control={form.control}
            name='assumed_by'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('form.fields.assumedBy.label')}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || 'dealership'}
                  disabled={isUploading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('form.fields.assumedBy.placeholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='dealership'>{t('form.fields.assumedBy.options.dealership')}</SelectItem>
                    {isConsigned && (
                      <SelectItem value='consignor'>{t('form.fields.assumedBy.options.consignor')}</SelectItem>
                    )}
                    <SelectItem value='customer'>{t('form.fields.assumedBy.options.customer')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>{t('form.fields.assumedBy.hint')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name='amount'
          render={({ field: { value, onChange } }) => (
            <FormItem>
              <FormLabel>{t('form.fields.amount.label')}</FormLabel>
              <FormControl>
                <PriceInput
                  value={typeof value === 'number' ? value : 0}
                  onChange={(v) => onChange(v === 0 ? undefined : v)}
                  placeholder={t('form.fields.amount.placeholder')}
                  disabled={isUploading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {showIvaToggle && (
          <FormField
            control={form.control}
            name='genera_credito_fiscal'
            render={({ field }) => (
              <FormItem className='space-y-2'>
                <div className='flex items-center justify-between rounded-lg border border-slate-200 p-3'>
                  <div className='space-y-0.5 pr-3'>
                    <FormLabel>
                      {isIncome
                        ? '¿Ingreso afecto a IVA?'
                        : '¿Genera crédito fiscal? (IVA recuperable)'}
                    </FormLabel>
                    <FormDescription className='text-[11px] leading-snug'>
                      {isIncome
                        ? 'Actívalo si el ingreso lleva IVA (débito fiscal). Se mostrará el neto. Déjalo apagado si el ingreso es exento.'
                        : 'Actívalo si el gasto tiene factura afecta con IVA recuperable. Déjalo apagado para contrato, boleta o derechos de transferencia.'}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                      disabled={isUploading}
                    />
                  </FormControl>
                </div>

                {/* Desglose explícito del IVA: bruto → IVA → neto que carga al costo */}
                {showIvaBreakdown && (
                  <div className='rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-[12px]'>
                    <div className='mb-1.5 font-medium text-emerald-800'>
                      Cómo se calcula (IVA {IVA_PCT}%)
                    </div>
                    <div className='flex items-center justify-between text-slate-600'>
                      <span>Monto ingresado (con IVA)</span>
                      <span className='tabular-nums'>{fmtCLP(watchedAmount as number)}</span>
                    </div>
                    <div className='flex items-center justify-between text-slate-600'>
                      <span>
                        {isIncome
                          ? 'IVA débito fiscal (se debe)'
                          : 'IVA recuperable (no es costo)'}
                      </span>
                      <span className='tabular-nums text-red-600'>− {fmtCLP(ivaMonto)}</span>
                    </div>
                    <div className='mt-1.5 flex items-center justify-between border-t border-emerald-200 pt-1.5 font-semibold text-emerald-900'>
                      <span>{isIncome ? 'Neto del ingreso' : 'Neto que carga al costo'}</span>
                      <span className='tabular-nums'>{fmtCLP(ivaNeto)}</span>
                    </div>
                  </div>
                )}

                {/* Estado apagado: dejamos claro el tratamiento del monto completo */}
                {showIvaToggle && !watchedGeneraCF && hasAmount && (
                  <p className='text-[11px] text-slate-500'>
                    {isIncome
                      ? `Ingreso exento: el monto completo (${fmtCLP(
                          watchedAmount as number
                        )}) entra sin IVA.`
                      : `Sin IVA recuperable: se carga el monto completo (${fmtCLP(
                          watchedAmount as number
                        )}) al costo del vehículo.`}
                  </p>
                )}
              </FormItem>
            )}
          />
        )}

        {/* Pass-through: dinero que la automotora solo traspasa (ej. transferencia de
            dominio / comisión de tarjeta cobrada al cliente y pagada a un tercero). No
            es gasto ni ingreso real → no afecta el margen. */}
        {(isExpense || isIncome) && (
          <FormField
            control={form.control}
            name='is_passthrough'
            render={({ field }) => (
              <FormItem>
                <div className='flex items-center justify-between rounded-lg border border-slate-200 p-3'>
                  <div className='space-y-0.5 pr-3'>
                    <FormLabel>Pass-through (no afecta el margen)</FormLabel>
                    <FormDescription className='text-[11px] leading-snug'>
                      Actívalo si es dinero que la automotora solo traspasa: se cobra al
                      cliente y se paga a un tercero (ej. transferencia de dominio,
                      comisión de tarjeta). Queda informativo, sin sumar ni restar a la
                      utilidad.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                      disabled={isUploading}
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.fields.description.label')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('form.fields.description.placeholder')}
                  {...field}
                  disabled={isUploading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {mode === 'add' ? (
          <FormField
            control={form.control}
            name='documents'
            render={({ field: { onChange, value, ...rest } }) => (
              <FormItem>
                <FormLabel>{t('form.fields.documents.label')}</FormLabel>
                <FormControl>
                  <div className='border border-input rounded-md p-2'>
                    <label
                      className={`flex items-center gap-2 ${
                        !isUploading
                          ? 'cursor-pointer hover:bg-muted'
                          : 'cursor-not-allowed opacity-70'
                      } p-2 rounded`}
                      htmlFor='documents-upload'
                    >
                      <Paperclip className='h-4 w-4' />
                      <span>{t('form.fields.documents.attach')}</span>
                      <Input
                        id='documents-upload'
                        type='file'
                        className='hidden'
                        multiple
                        onChange={(e) =>
                          !isUploading && onChange(e.target.files)
                        }
                        disabled={isUploading}
                        {...rest}
                      />
                    </label>
                    {value && value.length > 0 && (
                      <div className='mt-2 space-y-1'>
                        {Array.from(value).map((file, i) => (
                          <div
                            key={i}
                            className='flex items-center gap-2 text-sm'
                          >
                            <File className='h-4 w-4' />
                            <span className='truncate'>{file.name}</span>
                            <Badge variant='outline' className='ml-2 text-xs'>
                              {(file.size / 1024).toFixed(0)} KB
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormDescription>
                  {t('form.fields.documents.hint')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className='text-muted-foreground text-sm'>
            {t('form.fields.documents.editingNotAvailable')}
          </div>
        )}
      </form>
    </Form>
  );
};

export default TransactionForm;

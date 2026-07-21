import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { UserPlus, ArrowLeft, ArrowRight } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useUsers } from '@/hooks/useUsers';
import { useDealerships } from '@/hooks/useDealerships';
import { useStatuses } from '@/hooks/useStatuses';
import { useAuth } from '@/contexts/AuthContext';
import { VehicleSales } from '@/types/vehicleCreation';
import { formatDisplayNumber } from './form/formatter';
import { useTranslation } from 'react-i18next';
import ClientUserDialog from '@/components/users/ClientUserDialog';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  sellerId: z.string().optional(),
  dealershipId: z.string().optional(),
  price: z.string().optional(),
  minPrice: z.string()
    .min(1, 'El precio mínimo es obligatorio')
    .refine(
      (v) => parseFloat(v.replace(/\./g, '')) > 0,
      { message: 'El precio mínimo debe ser mayor a 0' }
    ),
  discountPercentage: z.string().optional(),
  statusId: z.string().optional(),
  commission: z.string().optional(),
});

interface VehicleSalesFormProps {
  initialData: any;
  onSave: (data: VehicleSales) => boolean;
  onNext: (data?: VehicleSales) => void;
  onPrevious: () => void;
}

const VehicleSalesForm = ({
  initialData,
  onSave,
  onNext,
  onPrevious,
}: VehicleSalesFormProps) => {
  const { userRole, clientId } = useAuth();
  const { users, fetchUsers } = useUsers(userRole, clientId?.toString());
  const { dealerships } = useDealerships();
  const { statuses } = useStatuses();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayPrice, setDisplayPrice] = useState('');
  const [displayMinPrice, setDisplayMinPrice] = useState('');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const { t, i18n } = useTranslation('common');
  const { toast } = useToast();

  const sellerUsers = users.filter((user) =>
    user.rol === 'seller' || user.rol === 'vendedor' || (user.role_ids && user.role_ids.length > 0)
  );

  const handleUserDialogSave = () => {
    setShowUserDialog(false);
    fetchUsers();
  };

  const getInitialPrice = () => {
    if (initialData?.sales?.price) return initialData.sales.price.toString();
    if (initialData?.basicInfo?.price) return initialData.basicInfo.price.toString();
    return '';
  };

  const getInitialStatusId = () => {
    if (initialData?.sales?.statusId) return initialData.sales.statusId.toString();
    if (initialData?.basicInfo?.status_id) return initialData.basicInfo.status_id.toString();
    return '';
  };

  const getInitialDiscountPercentage = () => {
    if (initialData?.sales?.discountPercentage) return initialData.sales.discountPercentage.toString();
    if (initialData?.basicInfo?.discount_percentage) return initialData.basicInfo.discount_percentage.toString();
    return '0';
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sellerId: initialData?.sales?.sellerId?.toString() || '_none',
      dealershipId: initialData?.sales?.dealershipId?.toString() || initialData?.basicInfo?.dealership_id?.toString() || '_none',
      price: getInitialPrice(),
      minPrice: initialData?.sales?.minPrice?.toString() || '',
      discountPercentage: getInitialDiscountPercentage(),
      statusId: getInitialStatusId(),
      commission: initialData?.sales?.commission?.toString() || '',
    },
  });

  useEffect(() => {
    const priceVal = form.getValues('price');
    if (priceVal) {
      setDisplayPrice(formatDisplayNumber(priceVal));
    }
    const minPriceVal = form.getValues('minPrice');
    if (minPriceVal) {
      setDisplayMinPrice(formatDisplayNumber(minPriceVal));
    }
  }, [form]);

  const finalPrice = useMemo(() => {
    const priceStr = form.watch('price');
    const discountStr = form.watch('discountPercentage');

    const price = priceStr ? parseFloat(priceStr.replace(/\./g, '')) : null;
    const discount = discountStr ? parseFloat(discountStr) : 0;

    if (price == null || !Number.isFinite(price)) return null;
    if (!discount || discount <= 0) return price;

    const discountAmount = (price * discount) / 100;
    return Math.round(price - discountAmount);
  }, [form.watch('price'), form.watch('discountPercentage')]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(
      i18n.language?.startsWith('es') ? 'es-CL' : 'en-US'
    ).format(n);

  const formatSalesData = (data: z.infer<typeof formSchema>): VehicleSales => ({
    sellerId: data.sellerId === '_none' ? null : data.sellerId ? parseInt(data.sellerId) : null,
    dealershipId: data.dealershipId === '_none' ? null : data.dealershipId ? parseInt(data.dealershipId) : null,
    price: data.price ? parseFloat(data.price.replace(/\./g, '')) : null,
    minPrice: data.minPrice ? parseFloat(data.minPrice.replace(/\./g, '')) : null,
    discountPercentage: data.discountPercentage ? parseFloat(data.discountPercentage) : null,
    statusId: data.statusId ? parseInt(data.statusId) : null,
    commission: data.commission ? parseFloat(data.commission.replace(/\./g, '')) : null,
  });

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    const subscription = form.watch((values) => {
      try {
        onSaveRef.current(formatSalesData(values as z.infer<typeof formSchema>));
      } catch {
        // Silently ignore errors on partial data
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const handleSaveAndContinue = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const salesData = formatSalesData(data);
      const success = onSave(salesData);
      if (success) onNext(salesData);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Si la validación falla (p. ej. "Precio mínimo" vacío), avisar con un toast
  // y hacer scroll al primer campo con error. Sin esto el botón "Continuar"
  // simplemente no avanzaba y el único aviso era un mensaje inline que en
  // celular queda fuera de pantalla (reportado por VDT: "no me deja guardar").
  const handleFormError = (errors: any) => {
    const labels: Record<string, string> = {
      price: t('addVehicle.sales.price', { defaultValue: 'Precio de venta' }),
      minPrice: t('addVehicle.sales.minPrice', { defaultValue: 'Precio mínimo' }),
      statusId: t('addVehicle.sales.status', { defaultValue: 'Estado inicial' }),
    };
    const missing = Object.keys(errors)
      .map((k) => labels[k])
      .filter(Boolean);
    if (missing.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Campos requeridos',
        description: `Completa: ${missing.join(', ')}`,
      });
    }
    const firstKey = Object.keys(errors)[0];
    if (firstKey) {
      const el = document.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => el.focus(), 300);
      }
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    form.setValue('price', value);
    setDisplayPrice(formatDisplayNumber(value));
    // En creación no se pide precio en el paso "Info básica", así que "Precio
    // mínimo" (obligatorio) llega vacío y bloquea el avance. Lo autocompletamos
    // con el precio de venta cuando aún está vacío; el usuario puede bajarlo.
    if (value && !form.getValues('minPrice')) {
      form.setValue('minPrice', value, { shouldValidate: true });
      setDisplayMinPrice(formatDisplayNumber(value));
    }
  };

  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    form.setValue('minPrice', value);
    setDisplayMinPrice(formatDisplayNumber(value));
  };

  return (
    <Form {...form}>
      <div className='space-y-4 max-w-3xl mx-auto'>
        {/* One big card */}
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">
          {/* Section: Precios */}
          <div className="p-4 pb-0">
            <h3 className="text-sm font-medium text-slate-700 mb-3">
              {t('addVehicle.sales.pricingSection', { defaultValue: 'Precios' })}
            </h3>
          </div>
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Precio de venta */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  {t('addVehicle.sales.price', { defaultValue: 'Precio de venta' })}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <FormField
                  control={form.control}
                  name='price'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className='relative'>
                          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm'>$</span>
                          <Input
                            {...field}
                            className='pl-7 h-9 bg-white'
                            value={displayPrice}
                            onChange={handlePriceChange}
                            placeholder="12.990.000"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Precio mínimo */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  {t('addVehicle.sales.minPrice', { defaultValue: 'Precio mínimo' })}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <FormField
                  control={form.control}
                  name='minPrice'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className='relative'>
                          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm'>$</span>
                          <Input
                            {...field}
                            className='pl-7 h-9 bg-white'
                            value={displayMinPrice}
                            onChange={handleMinPriceChange}
                            placeholder="11.500.000"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Descuento */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  {t('addVehicle.sales.discount', { defaultValue: 'Descuento' })}
                  <span className="text-slate-400 text-[10px] ml-1">(opcional)</span>
                </label>
                <FormField
                  control={form.control}
                  name='discountPercentage'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className='relative'>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            className='pr-7 h-9 bg-white'
                            placeholder="0"
                            value={field.value || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 100)) {
                                field.onChange(val);
                              }
                            }}
                          />
                          <span className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm'>%</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Estado inicial */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  {t('addVehicle.sales.status', { defaultValue: 'Estado inicial' })}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <FormField
                  control={form.control}
                  name='statusId'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <SelectTrigger className="h-9 bg-white">
                            <SelectValue placeholder={t('addVehicle.sales.selectStatus', { defaultValue: 'Seleccionar estado' })} />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map((s) => (
                              <SelectItem key={String(s.id)} value={String(s.id)}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Precio final */}
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-xs font-medium text-slate-700">
                  {t('addVehicle.sales.finalPrice', { defaultValue: 'Precio final a mostrar' })}
                </label>
                <div className={`h-9 px-3 rounded-md border flex items-center justify-between ${
                  finalPrice != null
                    ? 'bg-slate-100 border-slate-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-sm font-bold ${
                    finalPrice != null ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                    {finalPrice != null ? `$ ${fmt(finalPrice)}` : '-'}
                  </span>
                  <div className="flex items-center gap-2">
                    {form.watch('discountPercentage') && parseFloat(form.watch('discountPercentage') || '0') > 0 && (
                      <span className="text-xs font-semibold text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded">
                        -{form.watch('discountPercentage')}%
                      </span>
                    )}
                    {form.watch('discountPercentage') && parseFloat(form.watch('discountPercentage') || '0') > 0 && finalPrice != null && (
                      <span className="text-xs text-slate-500">
                        (Ahorro: ${fmt((parseFloat(form.watch('price')?.replace(/\./g, '') || '0')) - finalPrice)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 mx-4" />

          {/* Section: Asignación */}
          <div className="p-4 pb-0">
            <h3 className="text-sm font-medium text-slate-700 mb-3">
              {t('addVehicle.sales.assignmentSection', { defaultValue: 'Asignación' })}
            </h3>
          </div>
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Vendedor asignado */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  {t('addVehicle.sales.assignedSeller', { defaultValue: 'Vendedor asignado' })}
                  <span className="text-slate-400 text-[10px] ml-1">(opcional)</span>
                </label>
                <FormField
                  control={form.control}
                  name='sellerId'
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex gap-2">
                        <FormControl className="flex-1">
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder={t('addVehicle.sales.selectSeller', { defaultValue: 'Seleccionar' })} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='_none'>
                                {t('addVehicle.sales.noSeller', { defaultValue: 'Sin vendedor' })}
                              </SelectItem>
                              {sellerUsers.map((seller) => (
                                <SelectItem key={seller.id} value={seller.id.toString()}>
                                  {`${seller.first_name} ${seller.last_name}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setShowUserDialog(true)}
                          title={t('addVehicle.sales.addSeller', { defaultValue: 'Agregar' })}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sucursal */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">
                  {t('addVehicle.sales.dealership', { defaultValue: 'Sucursal' })}
                  <span className="text-slate-400 text-[10px] ml-1">(opcional)</span>
                </label>
                <FormField
                  control={form.control}
                  name='dealershipId'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={t('addVehicle.sales.selectDealership', { defaultValue: 'Seleccionar' })} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='_none'>
                              {t('addVehicle.sales.noDealership', { defaultValue: 'Sin sucursal' })}
                            </SelectItem>
                            {dealerships.map((dealership) => (
                              <SelectItem key={dealership.id} value={dealership.id.toString()}>
                                {dealership.address}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className='flex items-center justify-between gap-3 pt-3 border-t border-slate-100'>
          <Button
            type='button'
            variant='ghost'
            onClick={onPrevious}
            className="gap-2 text-slate-600 hover:text-slate-900 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('buttons.previous', { defaultValue: 'Anterior' })}
          </Button>

          <div className="flex gap-2">
            <Button
              type='button'
              onClick={form.handleSubmit(handleSaveAndContinue, handleFormError)}
              disabled={isSubmitting}
              className="gap-2 bg-sky-400 hover:bg-sky-500 text-white shadow-sm rounded-xl"
            >
              {isSubmitting ? t('actions.saving', { defaultValue: 'Guardando...' }) : t('buttons.continue', { defaultValue: 'Continuar' })}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Diálogo para agregar vendedor */}
        <ClientUserDialog
          open={showUserDialog}
          onClose={() => setShowUserDialog(false)}
          onSave={handleUserDialogSave}
          user={null}
          clientId={clientId}
        />
      </div>
    </Form>
  );
};

export default VehicleSalesForm;

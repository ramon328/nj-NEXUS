// src/components/vehiculos/agregar/VehicleBasicInfoForm.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Vehicle, VehicleType, VEHICLE_TYPE_LABELS, VEHICLE_TYPE_ICONS, VEHICLE_TYPE_HIDDEN_FIELDS, VEHICLE_TYPE_LABEL_OVERRIDES, VEHICLE_TYPE_CATEGORIES } from '@/types/vehicle';
import { MappedVehicleData } from '@/types/getapi';
import { useBrands } from '@/hooks/useBrands';
import { useModels } from '@/hooks/useModels';
import { useVersions } from '@/hooks/useVersions';
import { useCategories } from '@/hooks/useCategories';
import { useFuelTypes } from '@/hooks/useFuelTypes';
import { useDealerships } from '@/hooks/useDealerships';
import { useColors } from '@/hooks/useColors';
import { useConditions } from '@/hooks/useConditions';
import { useRequiredVehicleFields } from '@/hooks/useRequiredVehicleFields';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Form,
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import AutocompleteSelect from './form/selects/AutocompleteSelect';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { VehicleFormProvider } from './form/context/VehicleFormContext';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import {
  Car,
  Gauge,
  Palette,
  FileText,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  X,
  Calendar,
  Key,
  Shield,
  Hash,
  Truck,
  Cog,
  Ship,
  MapPin,
  Globe,
  Lock,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface VehicleBasicInfoFormProps {
  initialData: any;
  prefilledData?: MappedVehicleData | null;
  onSave: (data: Partial<Vehicle>) => boolean | Promise<boolean>;
  onNext: (data?: any) => void;
  isEditMode?: boolean;
  submitButtonText?: string;
  showNavigationButtons?: boolean;
  onCancel?: () => void;
}

// === Esquema SOLO con los campos mínimos requeridos ===
const formSchema = z.object({
  // Tipo de vehículo
  vehicle_type: z.enum(['car', 'truck', 'machinery', 'nautical']).default('car'),
  // Identificación
  license_plate: z.string().optional().default(''),
  brand_id: z.string().min(1, { message: 'La marca es requerida' }),
  model_id: z.string().min(1, { message: 'El modelo es requerido' }),
  version_id: z.string().optional().default(''),
  year: z.string().min(4, { message: 'El año es requerido' }),
  // Características generales
  mileage: z.string().min(1, { message: 'El kilometraje es requerido' }),
  fuel_type_id: z.string().min(1, { message: 'El combustible es requerido' }),
  transmission: z.string().optional().default(''),
  traction: z.string().optional().default(''),
  category_id: z.string().min(1, { message: 'La categoría es requerida' }),

  // === CAMPOS OBLIGATORIOS ADICIONALES ===
  color_id: z.string().min(1, { message: 'El color es requerido' }),
  condition_id: z.string().min(1, { message: 'La condición es requerida' }),
  keys: z.string().optional().default(''),

  // === DOCUMENTACIÓN (opcionales) ===
  tech_inspection_expiry: z.string().optional(),
  circulation_permit_expiry: z.string().optional(),
  emissions_expiry: z.string().optional(),
  municipality_permit_expiry: z.string().optional(),
  permit_municipality: z.string().optional(),

  // === OPCIONALES (compatibilidad con tu flujo; NO se renderizan aquí) ===
  price: z.string().optional(),
  discount_percentage: z.string().optional().default('0'),
  status_id: z.string().optional(),
  stock_type: z.enum(['online', 'dealership']).optional(),
  dealership_id: z.string().optional(),
  // Control de visibilidad por sede (NO es columna de la DB): si está activo, el
  // vehículo se guarda con dealership_id = NULL => visible para todas las sedes.
  visible_all_dealerships: z.boolean().optional().default(false),
  description: z.string().optional(),
  label: z.string().optional(),
  label_color: z.string().optional(),
  owners: z.string().optional(),
  engine_number: z.string().optional(),
  chassis_number: z.string().optional(),
  extras: z.string().optional(),
  has_lien: z.boolean().optional().default(false),
  is_billable: z.boolean().optional().default(false),
  transfer_value: z.string().optional().default('0'),
});

// Indicador visual de visibilidad de un campo: "Público" (se muestra en el sitio
// web del cliente / publicaciones) vs "Privado" (solo uso interno). Es SOLO
// informativo: no cambia qué se guarda ni la lógica del formulario. Sigue el
// mismo patrón que FieldInfoTooltip (ícono lucide + tooltip).
const FieldVisibility = ({ scope }: { scope: 'public' | 'private' }) => {
  const isPublic = scope === 'public';
  const Icon = isPublic ? Globe : Lock;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            aria-label={isPublic ? 'Campo público' : 'Campo privado'}
            className="inline-flex items-center"
          >
            <Icon
              className={cn(
                'h-3 w-3 shrink-0',
                isPublic ? 'text-emerald-500' : 'text-slate-400'
              )}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs leading-snug">
          <p>
            {isPublic
              ? 'Público: se muestra en tu sitio web y publicaciones.'
              : 'Privado: solo uso interno, no se publica.'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Leyenda que explica los dos íconos de visibilidad. Se muestra una sola vez,
// arriba del formulario, para que el usuario entienda los badges de cada campo.
const FieldVisibilityLegend = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
    <span className="text-[11px] font-medium text-slate-600">
      Visibilidad de los campos:
    </span>
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
      <Globe className="h-3 w-3 text-emerald-500" />
      Público (se muestra en tu sitio web)
    </span>
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
      <Lock className="h-3 w-3 text-slate-400" />
      Privado (solo uso interno)
    </span>
  </div>
);

// Input de descuento (%) — unificado con el alta y "Editar Precios". Se guarda el %
// limpio (antes pedía el "precio con descuento" y back-calculaba el % con 6 decimales,
// lo que generaba descuentos feos tipo "-3.923139%" en el sitio público).
const DiscountPriceField = ({ control }: { control: any }) => {
  return (
    <FormField
      control={control}
      name="discount_percentage"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs text-slate-500 inline-flex items-center gap-1">
            Descuento (%)
            <FieldVisibility scope="public" />
          </FormLabel>
          <FormControl>
            <Input
              value={field.value && field.value !== '0' ? field.value : ''}
              onChange={(e) => {
                let v = e.target.value.replace(/[^\d.]/g, '');
                if (parseFloat(v) > 100) v = '100';
                field.onChange(v === '' ? '0' : v);
              }}
              inputMode="decimal"
              placeholder="0"
              className="h-9"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

const VehicleBasicInfoForm = ({
  initialData,
  prefilledData,
  onSave,
  onNext,
  isEditMode = false,
  submitButtonText,
  showNavigationButtons = true,
  onCancel,
}: VehicleBasicInfoFormProps) => {
  const { t, i18n } = useTranslation('common');

  // Datos maestros
  const { brands } = useBrands();
  const [brandId, setBrandId] = useState<string | null>(
    prefilledData?.brand_id || initialData?.basicInfo?.brand_id || null
  );
  const { models } = useModels(brandId);
  const [modelId, setModelId] = useState<number | null>(
    prefilledData?.model_id ? parseInt(String(prefilledData.model_id)) :
    initialData?.basicInfo?.model_id ? parseInt(String(initialData.basicInfo.model_id)) : null
  );
  const { versions } = useVersions(modelId);
  const { categories } = useCategories();
  const { fuelTypes } = useFuelTypes();
  const { dealerships } = useDealerships();
  const { colors } = useColors();
  const { conditions } = useConditions();
  const requiredVehicleFields = useRequiredVehicleFields();

  const [showPrefilledMessage, setShowPrefilledMessage] = useState(!!prefilledData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentErrorFields, setCurrentErrorFields] = useState<string[]>([]);

  // Captura el nombre de la versión seleccionada/creada en el AutocompleteSelect.
  // Necesario porque una versión recién creada inline puede no estar todavía en
  // la lista `versions` de este form (cada AutocompleteSelect tiene su propio
  // useVersions), y `version_name` se deriva al hacer submit. La key es el
  // version_id para no usar un name de una versión distinta si cambia la selección.
  const versionNameRef = useRef<{ id: string; name: string | null } | null>(null);

  // Helpers i18n con fallback para evitar mostrar claves crudas
  const tt = (key: string, es: string, en: string) =>
    t(key, { defaultValue: i18n.language?.startsWith('es') ? es : en });
  const tp = (key: string, es: string, en: string) =>
    t(key, { defaultValue: i18n.language?.startsWith('es') ? es : en });

  // ====== React Hook Form ======
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      // Tipo de vehículo
      vehicle_type: initialData?.basicInfo?.vehicle_type || 'car',
      // Identificación
      license_plate:
        prefilledData?.license_plate || initialData?.basicInfo?.license_plate || '',
      brand_id: prefilledData?.brand_id || initialData?.basicInfo?.brand_id || '',
      model_id:
        prefilledData?.model_id ||
        initialData?.basicInfo?.model_id?.toString() ||
        '',
      version_id:
        initialData?.basicInfo?.version_id?.toString() ||
        '',
      year:
        prefilledData?.year?.toString() ||
        initialData?.basicInfo?.year?.toString() ||
        '',

      // Generales
      mileage:
        prefilledData?.mileage?.toString() ||
        initialData?.basicInfo?.mileage?.toString() ||
        '',
      fuel_type_id:
        prefilledData?.fuel_type_id ||
        initialData?.basicInfo?.fuel_type_id?.toString() ||
        '',
      transmission:
        prefilledData?.transmission || initialData?.basicInfo?.transmission || '',
      traction:
        prefilledData?.traction || initialData?.basicInfo?.traction || '',
      category_id:
        prefilledData?.category_id ||
        initialData?.basicInfo?.category_id?.toString() ||
        '',

      // Opcionales (compat)
      price: initialData?.basicInfo?.price?.toString() || '',
      discount_percentage: initialData?.basicInfo?.discount_percentage?.toString() || '0',
      status_id: initialData?.basicInfo?.status_id?.toString() || '',
      color_id: prefilledData?.color_id || initialData?.basicInfo?.color_id?.toString() || '',
      condition_id:
        prefilledData?.condition_id ||
        initialData?.basicInfo?.condition_id?.toString() ||
        '',
      stock_type: initialData?.basicInfo?.stock_type || undefined,
      dealership_id:
        initialData?.basicInfo?.dealership_id?.toString() || '_none',
      // Un auto "En sucursal" sin sede concreta (dealership_id NULL) ya está
      // guardado como visible para todas las sedes.
      visible_all_dealerships:
        initialData?.basicInfo?.stock_type === 'dealership' &&
        !initialData?.basicInfo?.dealership_id,
      description: initialData?.basicInfo?.description || '',
      label: initialData?.basicInfo?.label || '',
      label_color: initialData?.basicInfo?.label_color || '',
      owners: prefilledData?.owners?.toString() || initialData?.basicInfo?.owners?.toString() || '',
      engine_number: prefilledData?.engine_number || initialData?.basicInfo?.engine_number || '',
      chassis_number: prefilledData?.chassis_number || initialData?.basicInfo?.chassis_number || '',
      extras: initialData?.basicInfo?.extras || '',
      keys: initialData?.basicInfo?.keys?.toString() || '',
      has_lien: initialData?.basicInfo?.has_lien || false,
      is_billable: initialData?.basicInfo?.is_billable || false,
      tech_inspection_expiry: initialData?.basicInfo?.tech_inspection_expiry || '',
      circulation_permit_expiry: initialData?.basicInfo?.circulation_permit_expiry || '',
      emissions_expiry: initialData?.basicInfo?.emissions_expiry || '',
      municipality_permit_expiry: initialData?.basicInfo?.municipality_permit_expiry || '',
      permit_municipality: initialData?.basicInfo?.permit_municipality || '',
      transfer_value: initialData?.basicInfo?.transfer_value?.toString() || '',
    },
  });

  // No auto-select dealership - user should choose explicitly

  const validateNumeric = useCallback((name: string, val: string) => {
    if (name === 'year') {
      const n = parseInt(val, 10);
      return n > 1900 && n <= new Date().getFullYear() + 1;
    }
    if (name === 'mileage') {
      const n = parseInt(val.replace(/\./g, ''), 10);
      return n > 0;
    }
    return true;
  }, []);

  const formatFormData = (data: z.infer<typeof formSchema>) => {
    const brand = brands.find((b) => b.id === data.brand_id);
    const brandName = brand?.name || null;
    const model = models.find((m) => m.id === parseInt(data.model_id));
    const modelName = model?.name || null;
    const version = versions.find((v) => v.id === parseInt(data.version_id || '0'));
    // Fallback al nombre capturado en el onChange (versionNameRef): cubre el caso
    // de una versión recién creada inline que aún no está en la lista `versions`
    // de este form. Solo se usa si la key (version_id) coincide con la selección.
    // OJO: si no logramos resolver el nombre de la versión, devolvemos `undefined`
    // (NO null) para que el update lo IGNORE y conserve el version_name que ya está en
    // la DB. Si devolviéramos null, el autosave (que corre en cada cambio de campo)
    // borraría la versión del vehículo —dato compartido por web/MeLi/IG/FB/ficha—.
    const versionName =
      version?.name ||
      (data.version_id && versionNameRef.current?.id === data.version_id
        ? versionNameRef.current.name
        : undefined);

    return {
      // Tipo de vehículo
      vehicle_type: data.vehicle_type || 'car',
      // Campos mínimos requeridos
      license_plate: data.license_plate || null,
      brand_id: data.brand_id,
      brand_name: brandName,
      model_id: data.model_id ? parseInt(data.model_id) : null,
      model_name: modelName,
      version_id: data.version_id ? parseInt(data.version_id) : null,
      version_name: versionName,
      year: data.year ? parseInt(data.year) : null,
      mileage: data.mileage ? parseInt(data.mileage.replace(/\./g, '')) : null,
      fuel_type_id: data.fuel_type_id ? parseInt(data.fuel_type_id) : null,
      transmission: data.transmission,
      traction: data.traction || null,
      category_id: data.category_id ? parseInt(data.category_id) : null,

      // Campos adicionales del vehículo
      color_id: data.color_id ? parseInt(data.color_id) : null,
      condition_id: data.condition_id ? parseInt(data.condition_id) : null,
      owners: data.owners ? parseInt(data.owners) : null,
      keys: data.keys ? parseInt(data.keys) : 1,
      engine_number: data.engine_number || null,
      chassis_number: data.chassis_number || null,

      // Información legal y documentación
      has_lien: data.has_lien || false,
      is_billable: data.is_billable || false,
      tech_inspection_expiry: data.tech_inspection_expiry || null,
      circulation_permit_expiry: data.circulation_permit_expiry || null,
      emissions_expiry: data.emissions_expiry || null,
      municipality_permit_expiry: data.municipality_permit_expiry || null,
      permit_municipality: data.permit_municipality || null,
      transfer_value: data.transfer_value
        ? parseFloat(String(data.transfer_value).replace(/\./g, ''))
        : 0,

      // Descripción y extras
      description: data.description || null,
      extras: data.extras || null,
      label: data.label || null,
      label_color: data.label_color || null,

      // Campos de compatibilidad (pueden venir de otras secciones)
      stock_type: data.stock_type || 'online',
      // "Visible para todas las sedes" => dealership_id NULL (lo ven todas las sedes).
      // Si no, se usa la sede elegida ('_none' también = NULL).
      dealership_id:
        data.visible_all_dealerships ||
        !data.dealership_id ||
        data.dealership_id === '_none'
          ? null
          : parseInt(data.dealership_id),
      price: data.price
        ? parseFloat(String(data.price).replace(/\./g, ''))
        : null,
      discount_percentage: data.discount_percentage
        ? parseFloat(String(data.discount_percentage))
        : null,
      status_id: data.status_id
        ? parseInt(data.status_id)
        : null,
    } as Partial<Vehicle> & { brand_name?: string | null; model_name?: string | null };
  };

  // Auto-save: keep vehicleData in sync on every field change
  // Prevents data loss when navigating between steps via Previous/stepper
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    const subscription = form.watch((values) => {
      try {
        const data = formatFormData(values as z.infer<typeof formSchema>);
        onSaveRef.current(data);
      } catch {
        // Silently ignore errors on partial/incomplete data
      }
    });
    return () => subscription.unsubscribe();
    // `versions` va en las deps: carga async y si no se incluye, el closure de
    // form.watch queda con la lista vacía y no resuelve el nombre de la versión.
  }, [form.watch, brands, models, versions]);

  const saveFormData = async (data: z.infer<typeof formSchema>): Promise<boolean> => {
    try {
      const missing: string[] = [];
      const missingNames: string[] = [];
      const currentVehicleType = (data.vehicle_type || 'car') as VehicleType;
      const hiddenFields = VEHICLE_TYPE_HIDDEN_FIELDS[currentVehicleType] || [];
      const allReq: Array<[keyof z.infer<typeof formSchema>, string]> = [
        ['license_plate', t('vehicles.detail.labels.licensePlate')],
        ['brand_id', t('vehicles.detail.labels.brand')],
        ['model_id', t('vehicles.detail.labels.model')],
        ['year', t('vehicles.detail.labels.year')],
        ['mileage', t('vehicles.detail.labels.mileage')],
        ['fuel_type_id', t('vehicles.detail.labels.fuelType')],
        ['transmission', t('vehicles.detail.labels.transmission')],
        ['category_id', t('vehicles.detail.labels.category')],
        ['color_id', t('vehicles.detail.labels.color', { defaultValue: 'Color' })],
        ['condition_id', t('vehicles.detail.labels.condition', { defaultValue: 'Condición' })],
        ['keys', t('vehicles.detail.labels.keys', { defaultValue: 'N° de Llaves' })],
        ['stock_type', t('vehicles.detail.labels.location', { defaultValue: 'Ubicación' })],
      ];
      // Filter out fields that are hidden for this vehicle type
      const req = allReq.filter(([k]) => !hiddenFields.includes(k as string));

      req.forEach(([k, label]) => {
        const v = (data as any)[k];
        if (!v || v === '' || v === 'undefined') {
          missing.push(k as string);
          missingNames.push(label);
        }
      });

      // Validaciones numéricas
      if (data.year && !validateNumeric('year', data.year)) {
        if (!missing.includes('year')) missing.push('year');
        if (!missingNames.includes(t('vehicles.detail.labels.year'))) {
          missingNames.push(t('vehicles.detail.labels.year'));
        }
      }
      if (data.mileage && !validateNumeric('mileage', data.mileage)) {
        if (!missing.includes('mileage')) missing.push('mileage');
        if (!missingNames.includes(t('vehicles.detail.labels.mileage'))) {
          missingNames.push(t('vehicles.detail.labels.mileage'));
        }
      }

      // Si la ubicación es "En sucursal", exigir que se elija una sucursal concreta
      // (evita autos marcados en sucursal sin sucursal asignada). Excepción: si el
      // auto se marcó "Visible para todas las sedes", dealership_id NULL es válido.
      if (
        data.stock_type === 'dealership' &&
        !data.visible_all_dealerships &&
        dealerships.length > 0 &&
        (!data.dealership_id || data.dealership_id === '_none')
      ) {
        missing.push('dealership_id');
        missingNames.push(
          t('vehicles.detail.labels.dealership', { defaultValue: 'Sucursal' })
        );
      }

      // Validar campos de documentación configurados como obligatorios.
      // OJO: la config "Municipalidad" se guarda como `municipality_permit_expiry`
      // pero NO tiene un input propio; el dato se captura en el campo de texto
      // `permit_municipality`. Sin este mapeo la validación miraba un campo
      // fantasma siempre vacío y bloqueaba el alta al marcarlo como obligatorio.
      const docConfigToFormField: Record<string, string> = {
        municipality_permit_expiry: 'permit_municipality',
      };
      const docFieldLabels: Record<string, string> = {
        tech_inspection_expiry: t('vehicles.detail.labels.techInspection', { defaultValue: 'Revisión Técnica' }),
        circulation_permit_expiry: t('vehicles.detail.labels.circulationPermit', { defaultValue: 'Permiso de Circulación' }),
        emissions_expiry: t('vehicles.detail.labels.emissions', { defaultValue: 'SOAP' }),
        municipality_permit_expiry: t('vehicles.detail.labels.municipalityPermit', { defaultValue: 'Municipalidad' }),
      };
      Object.entries(requiredVehicleFields).forEach(([field, isRequired]) => {
        const formField = docConfigToFormField[field] || field;
        if (isRequired && isFieldVisible(formField) && !hiddenFields.includes(formField)) {
          const v = (data as any)[formField];
          if (!v || v === '') {
            if (!missing.includes(formField)) missing.push(formField);
            const label = docFieldLabels[field] || field;
            if (!missingNames.includes(label)) missingNames.push(label);
          }
        }
      });

      setCurrentErrorFields(missing);
      if (missing.length > 0) {
        toast({
          title: t('addVehicle.basic.toasts.missingFieldsTitle'),
          description: t('addVehicle.basic.toasts.missingFieldsDescription', {
            fields: missingNames.join(', '),
          }),
          variant: 'destructive',
        });
        return false;
      }

      setCurrentErrorFields([]);
      const payload = formatFormData(data);
      const ok = await onSave(payload);
      return ok;
    } catch (e) {
      console.error(e);
      toast({
        title: t('actions.error'),
        description: t('addVehicle.basic.toasts.saveError'),
        variant: 'destructive',
      });
      return false;
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const success = await saveFormData(data);
      if (success) {
        onNext(formatFormData(data));
        if (isEditMode) {
          toast({
            title: t('addVehicle.basic.toasts.updatedTitle'),
            description: t('addVehicle.basic.toasts.updatedDescription'),
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showAdditionalFields, setShowAdditionalFields] = useState(false);

  // Vehicle type visibility helpers
  const currentVehicleType = (form.watch('vehicle_type') || 'car') as VehicleType;
  const hiddenFields = VEHICLE_TYPE_HIDDEN_FIELDS[currentVehicleType] || [];
  const isFieldVisible = (fieldName: string) => !hiddenFields.includes(fieldName);
  const labelOverrides = VEHICLE_TYPE_LABEL_OVERRIDES?.[currentVehicleType] || {};
  const getLabel = (fieldName: string, defaultLabel: string) =>
    labelOverrides[fieldName] || defaultLabel;

  // Filter categories by vehicle type
  const allowedCategoryNames = VEHICLE_TYPE_CATEGORIES[currentVehicleType] || [];
  const filteredCategories = categories.filter((c) =>
    allowedCategoryNames.includes((c.name || '').toLowerCase())
  );

  return (
    <VehicleFormProvider
      value={{
        form,
        brandId,
        setBrandId,
        brands,
        models,
        calculateFinalPrice: () => 0,
        isSubmitting,
        errorFields: currentErrorFields,
        vehicleType: (form.watch('vehicle_type') || 'car') as VehicleType,
        clearFieldError: (f: string) =>
          setCurrentErrorFields((prev) => prev.filter((x) => x !== f)),
      }}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-4xl mx-auto">
          {/* Vehicle Type Selector */}
          <div>
            <FormLabel className="text-xs text-slate-500 mb-2 block">Tipo de vehículo</FormLabel>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((type) => {
                const currentType = form.watch('vehicle_type') || 'car';
                const iconMap: Record<VehicleType, React.ElementType> = { car: Car, truck: Truck, machinery: Cog, nautical: Ship };
                const TypeIcon = iconMap[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { form.setValue('vehicle_type', type); form.setValue('category_id', ''); }}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all',
                      currentType === type
                        ? 'border-sky-500 bg-sky-500 text-white'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <TypeIcon className="w-4 h-4" />
                    <span>{VEHICLE_TYPE_LABELS[type]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mensaje de datos precargados - compacto */}
          {showPrefilledMessage && (
            <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 text-sky-500 flex-shrink-0" />
              <span className="text-sky-600 text-xs flex-1">{t('addVehicle.basic.prefilled.title')}</span>
              <button type="button" onClick={() => setShowPrefilledMessage(false)} className="p-0.5 hover:bg-sky-100 rounded">
                <X className="w-3.5 h-3.5 text-sky-400" />
              </button>
            </div>
          )}

          {/* Leyenda de visibilidad: explica los íconos Público/Privado que
              acompañan a cada campo. Solo informativo. */}
          <FieldVisibilityLegend />

          {/* === ONE BIG CARD: All required sections with dividers === */}
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">

            {/* Identificación */}
            <div className="p-4 pb-0">
              <h3 className="text-sm font-medium text-slate-700 mb-3">
                {tt('addVehicle.basic.sections.identification', 'Identificación', 'Identification')}
              </h3>
            </div>
            <div className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {isFieldVisible('license_plate') && (
                <FormField
                  control={form.control}
                  name="license_plate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-500 inline-flex items-center gap-1">
                        Patente<span className="text-rose-400">*</span>
                        <FieldVisibility scope="private" />
                      </FormLabel>
                      <FormControl>
                        <Input
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          placeholder="ABCD12"
                          className="uppercase tracking-wider font-medium h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                )}
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-500 inline-flex items-center gap-1">
                        Año<span className="text-rose-400">*</span>
                        <FieldVisibility scope="public" />
                      </FormLabel>
                      <FormControl>
                        <Input
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                          inputMode="numeric"
                          placeholder={new Date().getFullYear().toString()}
                          className="h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <AutocompleteSelect
                  name="brand_id"
                  control={form.control}
                  label={<span className="text-xs text-slate-500 inline-flex items-center gap-1">Marca<span className="text-rose-400">*</span><FieldVisibility scope="public" /></span>}
                  placeholder="Selecciona"
                  options={brands}
                  form={form}
                  className="sm:col-span-2"
                  onChange={(v) => { setBrandId(v); form.setValue('model_id', ''); }}
                />
                <AutocompleteSelect
                  name="model_id"
                  control={form.control}
                  label={<span className="text-xs text-slate-500 inline-flex items-center gap-1">Modelo<span className="text-rose-400">*</span><FieldVisibility scope="public" /></span>}
                  placeholder="Selecciona"
                  options={models}
                  disabled={!brandId}
                  isModelSelect={true}
                  showCreateOption={true}
                  brandId={brandId}
                  form={form}
                  className="sm:col-span-2"
                  onChange={(value) => { form.setValue('model_id', value); setModelId(value ? parseInt(value) : null); form.setValue('version_id', ''); }}
                />
                <AutocompleteSelect
                  name="version_id"
                  control={form.control}
                  label={<span className="text-xs text-slate-500 inline-flex items-center gap-1">Versión<FieldVisibility scope="public" /></span>}
                  placeholder="Selecciona"
                  options={versions}
                  disabled={!modelId}
                  isVersionSelect={true}
                  showCreateOption={true}
                  modelId={modelId}
                  form={form}
                  className="sm:col-span-2"
                  onChange={(value, optionName) => {
                    form.setValue('version_id', value);
                    // Guardar el nombre para que version_name se persista bien
                    // incluso si la versión recién se creó inline.
                    versionNameRef.current = value
                      ? { id: value, name: optionName ?? null }
                      : null;
                  }}
                />
              </div>
            </div>

            {/* Características */}
            <div className="border-t border-slate-100 mx-4" />
            <div className="p-4 pb-0">
              <h3 className="text-sm font-medium text-slate-700 mb-3">
                {tt('addVehicle.basic.sections.general', 'Características', 'Characteristics')}
              </h3>
            </div>
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <FormField
                  control={form.control}
                  name="mileage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-500 inline-flex items-center gap-1">{getLabel('mileage', 'Km')}<span className="text-rose-400">*</span><FieldVisibility scope="public" /></FormLabel>
                      <FormControl>
                        <Input
                          value={field.value ? Number(String(field.value).replace(/\./g, '')).toLocaleString('es-CL') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            field.onChange(raw ? Number(raw).toLocaleString('es-CL') : '');
                          }}
                          inputMode="numeric"
                          placeholder="45.000"
                          className="h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fuel_type_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-500 inline-flex items-center gap-1">Combustible<span className="text-rose-400">*</span><FieldVisibility scope="public" /></FormLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Selecciona" /></SelectTrigger></FormControl>
                        <SelectContent>{fuelTypes.map((ft) => (<SelectItem key={String(ft.id)} value={String(ft.id)}>{ft.name}</SelectItem>))}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isFieldVisible('transmission') && (
                <FormField
                  control={form.control}
                  name="transmission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-500 inline-flex items-center gap-1">Transmisión<span className="text-rose-400">*</span><FieldVisibility scope="public" /></FormLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Selecciona" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="automatic">Automática</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                )}
                <FormField
                  control={form.control}
                  name="traction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-500 inline-flex items-center gap-1">Tracción<FieldVisibility scope="private" /></FormLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Selecciona" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="4x2">4x2</SelectItem>
                          <SelectItem value="4x4">4x4</SelectItem>
                          <SelectItem value="AWD">AWD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-500 inline-flex items-center gap-1">Categoría<span className="text-rose-400">*</span><FieldVisibility scope="public" /></FormLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Selecciona" /></SelectTrigger></FormControl>
                        <SelectContent>{filteredCategories.map((c) => (<SelectItem key={String(c.id)} value={String(c.id)}>{c.name}</SelectItem>))}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Detalles del Vehículo */}
            <div className="border-t border-slate-100 mx-4" />
            <div className="p-4 pb-0">
              <h3 className="text-sm font-medium text-slate-700 mb-3">
                {tt('addVehicle.basic.sections.vehicleDetails', 'Detalles del Vehículo', 'Vehicle Details')}
              </h3>
            </div>
            <div className="px-4 pb-4">
              <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-3">
                <AutocompleteSelect
                  name="color_id"
                  control={form.control}
                  label={<span className="text-xs text-slate-500 inline-flex items-center gap-1">{t('vehicles.detail.labels.color', { defaultValue: 'Color' })}<span className="text-rose-400">*</span><FieldVisibility scope="public" /></span>}
                  placeholder={tp('addVehicle.basic.placeholders.color', 'Selecciona un color', 'Select a color')}
                  options={colors}
                  form={form}
                  isColorSelect={true}
                  showCreateOption={true}
                  onChange={(value) => form.setValue('color_id', value)}
                />
                <div className="grid grid-cols-2 gap-3 sm:contents">
                <FormField
                  control={form.control}
                  name="condition_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-500 inline-flex items-center gap-1">
                        {t('vehicles.detail.labels.condition', { defaultValue: 'Condición' })}
                        <span className="text-rose-400">*</span>
                        <FieldVisibility scope="public" />
                      </FormLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue
                              placeholder={tp(
                                'addVehicle.basic.placeholders.condition',
                                'Nuevo o usado',
                                'New or used'
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {conditions.map((c) => (
                            <SelectItem key={String(c.id)} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isFieldVisible('keys') && (
                <FormField
                  control={form.control}
                  name="keys"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-500 inline-flex items-center gap-1">
                        {t('vehicles.detail.labels.keys', { defaultValue: 'N° de Llaves' })}
                        <span className="text-rose-400">*</span>
                        <FieldVisibility scope="private" />
                      </FormLabel>
                      <FormControl>
                        <Input
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                          inputMode="numeric"
                          placeholder={tp(
                            'addVehicle.basic.placeholders.keys',
                            'Ej: 2',
                            'e.g., 2'
                          )}
                          className="h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                )}
                </div>
              </div>
            </div>

            {/* Documentación (conditional) */}
            {isFieldVisible('tech_inspection_expiry') && (
            <>
              <div className="border-t border-slate-100 mx-4" />
              <div className="p-4 pb-0">
                <h3 className="text-sm font-medium text-slate-700 mb-3">
                  {tt('addVehicle.basic.sections.documentation', 'Documentación', 'Documentation')}
                </h3>
              </div>
              <div className="px-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 [&>*]:min-w-0">
                  <FormField
                    control={form.control}
                    name="tech_inspection_expiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-500 inline-flex items-center gap-1">
                          {t('vehicles.detail.labels.techInspection', { defaultValue: 'Venc. Revisión Técnica' })}
                          {requiredVehicleFields.tech_inspection_expiry && <span className="text-rose-400">*</span>}
                          <FieldVisibility scope="private" />
                        </FormLabel>
                        <FormControl>
                          <DatePickerInput
                            value={field.value}
                            onChange={field.onChange}
                            className="min-w-0 w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="circulation_permit_expiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-500 inline-flex items-center gap-1">
                          {t('vehicles.detail.labels.circulationPermit', { defaultValue: 'Venc. Permiso Circulación' })}
                          {requiredVehicleFields.circulation_permit_expiry && <span className="text-rose-400">*</span>}
                          <FieldVisibility scope="private" />
                        </FormLabel>
                        <FormControl>
                          <DatePickerInput
                            value={field.value}
                            onChange={field.onChange}
                            className="min-w-0 w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emissions_expiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-500 inline-flex items-center gap-1">
                          {t('vehicles.detail.labels.emissions', { defaultValue: 'Venc. SOAP' })}
                          {requiredVehicleFields.emissions_expiry && <span className="text-rose-400">*</span>}
                          <FieldVisibility scope="private" />
                        </FormLabel>
                        <FormControl>
                          <DatePickerInput
                            value={field.value}
                            onChange={field.onChange}
                            className="min-w-0 w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="permit_municipality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-500 inline-flex items-center gap-1">
                          {t('vehicles.detail.labels.municipalityPermit', { defaultValue: 'Municipalidad' })}
                          {requiredVehicleFields.municipality_permit_expiry && <span className="text-rose-400">*</span>}
                          <FieldVisibility scope="private" />
                        </FormLabel>
                        <FormControl>
                          <Input
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder="Ej: Las Condes"
                            className="h-9 min-w-0 w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </>
            )}

          </div>

          {/* Sección: Precios - Solo en modo edición */}
          {isEditMode && (
            <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
                <span className="text-slate-500 text-lg">$</span>
                <h3 className="text-sm font-medium text-slate-700">
                  {tt('addVehicle.basic.sections.pricing', 'Precios', 'Pricing')}
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-500 inline-flex items-center gap-1">
                          Precio Publicado
                          <FieldVisibility scope="public" />
                        </FormLabel>
                        <FormControl>
                          <Input
                            value={field.value ? new Intl.NumberFormat('es-CL').format(parseInt(field.value)) : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/\D/g, '');
                              field.onChange(rawValue);
                            }}
                            inputMode="numeric"
                            placeholder="15.000.000"
                            className="h-9"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DiscountPriceField control={form.control} />
                  <div className="flex flex-col justify-end">
                    <span className="text-xs text-slate-400 mb-1">Precio Final</span>
                    <div className="h-9 flex items-center px-3 bg-gray-50 rounded-md border border-slate-200">
                      <span className="text-sm font-medium text-green-600">
                        {(() => {
                          const price = parseInt(form.watch('price') || '0', 10);
                          const discount = parseFloat(form.watch('discount_percentage') || '0');
                          const finalPrice = Math.round(price - (price * discount / 100));
                          return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(finalPrice);
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ubicación del vehículo — sección propia y obligatoria. Antes vivía dentro
              de "Campos Adicionales (opcional)", lo que era contradictorio. */}
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-medium text-slate-700">Ubicación del vehículo</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Stock type: Online / Sucursal */}
                <FormField
                  control={form.control}
                  name="stock_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="inline-flex items-center gap-1">Ubicación <span className="text-rose-400">*</span><FieldVisibility scope="private" /></FormLabel>
                      <Select value={field.value || ''} onValueChange={(val) => {
                        field.onChange(val);
                        if (val === 'online') {
                          form.setValue('dealership_id', '_none');
                        }
                      }}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="dealership">En sucursal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Dealership selector — en sucursal y NO visible-para-todas. */}
                {form.watch('stock_type') === 'dealership' &&
                  dealerships.length > 0 &&
                  !form.watch('visible_all_dealerships') && (
                  <FormField
                    control={form.control}
                    name="dealership_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="inline-flex items-center gap-1">Sucursal <span className="text-rose-400">*</span><FieldVisibility scope="public" /></FormLabel>
                        <Select value={field.value ?? '_none'} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar sucursal" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {dealerships.map((d) => (
                              <SelectItem key={String(d.id)} value={String(d.id)}>
                                {d.name || d.address || `Sucursal ${d.id}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Visibilidad por sede — solo con multi-sede (>=2 sucursales). Un auto
                  puede verse en todas las sedes o asignarse a una sede concreta. */}
              {form.watch('stock_type') === 'dealership' && dealerships.length >= 2 && (
                <FormField
                  control={form.control}
                  name="visible_all_dealerships"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (checked) form.setValue('dealership_id', '_none');
                          }}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="inline-flex items-center gap-1">Visible para todas las sedes<FieldVisibility scope="private" /></FormLabel>
                        <p className="text-[11px] text-slate-500">
                          Aparece en el inventario de todas las sedes. Desmárcalo para
                          asignarlo a una sede específica.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>

          {/* Campos adicionales (Collapsible) - Compacto */}
          <Collapsible open={showAdditionalFields} onOpenChange={setShowAdditionalFields}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={cn(
                  'w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border transition-all shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)]',
                  showAdditionalFields ? 'border-slate-300 bg-white' : 'border-slate-200/60 bg-white hover:bg-slate-50/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-medium', showAdditionalFields ? 'text-slate-800' : 'text-slate-700')}>
                    {tt('addVehicle.basic.sections.additionalInfo', 'Campos Adicionales', 'Additional Fields')}
                  </span>
                  <span className="text-xs text-slate-400">(opcional)</span>
                </div>
                <ChevronDown className={cn('w-4 h-4 transition-transform', showAdditionalFields ? 'rotate-180 text-slate-600' : 'text-slate-400')} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">

                {/* Detalles Adicionales */}
                <div className="p-4 pb-0">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Detalles Adicionales</h4>
                </div>
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <FormField
                    control={form.control}
                    name="owners"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="inline-flex items-center gap-1">
                          {t('vehicles.detail.labels.owners', { defaultValue: 'N° de Dueños' })}
                          <FieldVisibility scope="private" />
                        </FormLabel>
                        <FormControl>
                          <Input
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            inputMode="numeric"
                            placeholder={tp(
                              'addVehicle.basic.placeholders.owners',
                              'Ej: 1',
                              'e.g., 1'
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="engine_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="inline-flex items-center gap-1">
                          {t('vehicles.detail.labels.engineNumber', { defaultValue: 'N° de Motor' })}
                          <FieldVisibility scope="private" />
                        </FormLabel>
                        <FormControl>
                          <Input
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder={tp(
                              'addVehicle.basic.placeholders.engineNumber',
                              'N° de motor',
                              'Engine number'
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="chassis_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="inline-flex items-center gap-1">
                          {t('vehicles.detail.labels.chassisNumber', { defaultValue: 'N° de Chasis' })}
                          <FieldVisibility scope="private" />
                        </FormLabel>
                        <FormControl>
                          <Input
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder={tp(
                              'addVehicle.basic.placeholders.chassisNumber',
                              'N° de chasis',
                              'Chassis number'
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                </div>

                {/* Información Legal */}
                <div className="border-t border-slate-100 mx-4" />
                <div className="p-4 pb-0">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">
                    {tt('addVehicle.basic.sections.legalInfo', 'Información Legal', 'Legal Information')}
                  </h4>
                </div>
                <div className="px-4 pb-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="has_lien"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="inline-flex items-center gap-1">
                              {t('vehicles.detail.labels.hasLien', { defaultValue: 'Tiene Prenda' })}
                              <FieldVisibility scope="private" />
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_billable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="inline-flex items-center gap-1">
                              {t('vehicles.detail.labels.isBillable', { defaultValue: 'Es Facturable' })}
                              <FieldVisibility scope="private" />
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="transfer_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="inline-flex items-center gap-1">
                            {t('vehicles.detail.labels.transferValue', { defaultValue: 'Valor de Transferencia' })}
                            <FieldVisibility scope="private" />
                          </FormLabel>
                          <FormControl>
                            <Input
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                              inputMode="numeric"
                              placeholder={tp(
                                'addVehicle.basic.placeholders.transferValue',
                                'Ej: 50000',
                                'e.g., 50000'
                              )}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Descripción y Extras */}
                <div className="border-t border-slate-100 mx-4" />
                <div className="p-4 pb-0">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">
                    {tt('addVehicle.basic.sections.descriptionExtras', 'Descripción y Extras', 'Description and Extras')}
                  </h4>
                </div>
                <div className="px-4 pb-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="inline-flex items-center gap-1">
                          {t('vehicles.detail.labels.label', { defaultValue: 'Etiqueta/Destacado' })}
                          <FieldVisibility scope="public" />
                        </FormLabel>
                        <FormControl>
                          <Input
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder={tp(
                              'addVehicle.basic.placeholders.label',
                              'Ej: Oportunidad, Recién llegado, etc.',
                              'e.g., Opportunity, Just arrived, etc.'
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="label_color"
                    render={({ field }) => {
                      const presets = [
                        { name: 'Verde', value: '#22c55e' },
                        { name: 'Azul', value: '#3b82f6' },
                        { name: 'Amarillo', value: '#eab308' },
                        { name: 'Rojo', value: '#ef4444' },
                        { name: 'Naranjo', value: '#f97316' },
                        { name: 'Morado', value: '#a855f7' },
                        { name: 'Gris', value: '#64748b' },
                      ];
                      const current = field.value ?? '';
                      return (
                        <FormItem>
                          <FormLabel className="inline-flex items-center gap-1">
                            {t('vehicles.detail.labels.labelColor', { defaultValue: 'Color de la etiqueta' })}
                            <FieldVisibility scope="public" />
                            <span className="text-slate-400 text-[10px] ml-1">
                              ({t('common.optional', { defaultValue: 'opcional' })})
                            </span>
                          </FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2 flex-wrap">
                              {presets.map((p) => {
                                const selected = current.toLowerCase() === p.value.toLowerCase();
                                return (
                                  <button
                                    key={p.value}
                                    type="button"
                                    title={p.name}
                                    onClick={() => field.onChange(selected ? '' : p.value)}
                                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                                      selected
                                        ? 'border-slate-900 ring-2 ring-slate-300 scale-110'
                                        : 'border-slate-200 hover:border-slate-400'
                                    }`}
                                    style={{ backgroundColor: p.value }}
                                    aria-label={p.name}
                                  />
                                );
                              })}
                              <div className="flex items-center gap-1 ml-1">
                                <input
                                  type="color"
                                  value={current || '#22c55e'}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  className="h-7 w-9 rounded cursor-pointer border border-slate-200 bg-transparent p-0"
                                  title={t('vehicles.detail.labels.labelColorCustom', { defaultValue: 'Color personalizado' })}
                                />
                                {current && (
                                  <button
                                    type="button"
                                    onClick={() => field.onChange('')}
                                    className="text-[11px] text-slate-500 hover:text-slate-700 underline ml-1"
                                  >
                                    {t('common.clear', { defaultValue: 'limpiar' })}
                                  </button>
                                )}
                              </div>
                            </div>
                          </FormControl>
                          <p className="text-[11px] text-slate-500">
                            {t('vehicles.detail.labels.labelColorHint', {
                              defaultValue: 'Si no eliges color, se usa el verde por defecto.',
                            })}
                          </p>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          {t('vehicles.detail.labels.description', { defaultValue: 'Descripción' })}
                          <FieldVisibility scope="public" />
                          <FieldInfoTooltip text="Se muestra en la ficha pública del vehículo (sitio web) y en la pestaña Detalles." />
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            rows={4}
                            placeholder={tp(
                              'addVehicle.basic.placeholders.description',
                              'Descripción detallada del vehículo...',
                              'Detailed vehicle description...'
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="extras"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          {t('vehicles.detail.labels.extras', { defaultValue: 'Extras/Equipamiento' })}
                          <FieldVisibility scope="private" />
                          <FieldInfoTooltip text="Se muestra en la pestaña Detalles del vehículo (no se publica en el sitio web)." />
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            rows={3}
                            placeholder={tp(
                              'addVehicle.basic.placeholders.extras',
                              'Aire acondicionado, cierre centralizado, etc.',
                              'Air conditioning, central locking, etc.'
                            )}
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

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
                {t('buttons.cancel', { defaultValue: 'Cancelar' })}
              </Button>
            )}
            {showNavigationButtons && !isEditMode && (
              <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-sky-400 hover:bg-sky-500 shadow-sm">
                {submitButtonText || t('buttons.next', { defaultValue: 'Siguiente' })}
              </Button>
            )}
            {isEditMode && (
              <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-sky-400 hover:bg-sky-500 shadow-sm">
                {submitButtonText || t('buttons.update', { defaultValue: 'Actualizar' })}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </VehicleFormProvider>
  );
};

export default VehicleBasicInfoForm;

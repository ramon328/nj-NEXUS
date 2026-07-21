import { useState, useCallback } from 'react';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useBrands } from '@/hooks/useBrands';
import { useModels } from '@/hooks/useModels';
import type { CreateVehicleRequestData } from '@/hooks/useVehicleRequests';
import { useTranslation } from 'react-i18next';
import { User, Car, Loader2, Check } from 'lucide-react';

interface CreateRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateVehicleRequestData) => Promise<{ error: string | null }>;
}

export default function CreateRequestDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateRequestDialogProps) {
  const { t } = useTranslation('solicitudes');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreateVehicleRequestData>({
    customer_name: '',
    brand_name: '',
    model_name: '',
    customer_phone: '',
    customer_email: '',
    notes: '',
  });
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [yearMin, setYearMin] = useState('');
  const [yearMax, setYearMax] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  const { brands } = useBrands();
  const { models } = useModels(selectedBrandId);

  const resetForm = useCallback(() => {
    setForm({ customer_name: '', brand_name: '', model_name: '', customer_phone: '', customer_email: '', notes: '' });
    setSelectedBrandId(null);
    setYearMin('');
    setYearMax('');
    setBudgetMin('');
    setBudgetMax('');
  }, []);

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim()) {
      toast({ title: 'Error', description: t('create.errorRequired'), variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const data: CreateVehicleRequestData = {
      ...form,
      year_min: yearMin ? parseInt(yearMin) : undefined,
      year_max: yearMax ? parseInt(yearMax) : undefined,
      budget_min: budgetMin ? parseFloat(budgetMin) : undefined,
      budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
    };

    const { error } = await onSubmit(data);
    setIsSubmitting(false);

    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: t('create.success'), description: t('create.successDescription') });
      resetForm();
      onOpenChange(false);
    }
  }, [form, yearMin, yearMax, budgetMin, budgetMax, onSubmit, onOpenChange, resetForm, t]);

  const handleBrandChange = (brandId: string) => {
    const brand = brands.find((b) => b.id === brandId);
    setSelectedBrandId(brandId);
    setForm({ ...form, brand_name: brand?.name || '', model_name: '' });
  };

  const handleModelChange = (modelId: string) => {
    const model = models.find((m) => String(m.id) === modelId);
    setForm({ ...form, model_name: model?.name || '' });
  };

  const content = (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col flex-1 min-h-0"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
          e.preventDefault();
        }
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 shrink-0">
        <h2 className="text-[16px] font-semibold text-slate-900">
          {t('create.title')}
        </h2>
      </div>

      {/* Form Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-5">
        <div className="space-y-5">
          {/* Customer info section */}
          <div className="flex items-center gap-2 pb-1">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-cyan-50 text-cyan-600">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="text-[13px] font-semibold text-slate-800">
              {t('create.customerData')}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] text-slate-700 font-medium">
              {t('create.customerName')} <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              placeholder={t('create.customerNamePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] text-slate-700 font-medium">
                {t('create.phone')}
              </label>
              <Input
                value={form.customer_phone}
                onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                placeholder={t('create.phonePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] text-slate-700 font-medium">
                {t('create.email')}
              </label>
              <Input
                type="email"
                value={form.customer_email}
                onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                placeholder={t('create.emailPlaceholder')}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Vehicle info section */}
          <div className="flex items-center gap-2 pb-1">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 text-blue-600">
              <Car className="h-3.5 w-3.5" />
            </div>
            <span className="text-[13px] font-semibold text-slate-800">
              {t('create.vehicleWanted')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] text-slate-700 font-medium">
                {t('create.brand')}
              </label>
              <Select
                value={selectedBrandId || ''}
                onValueChange={handleBrandChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('create.brandPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] text-slate-700 font-medium">
                {t('create.model')}
              </label>
              <Select
                value={models.find((m) => m.name === form.model_name) ? String(models.find((m) => m.name === form.model_name)!.id) : ''}
                onValueChange={handleModelChange}
                disabled={!selectedBrandId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('create.modelPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={String(model.id)}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] text-slate-700 font-medium">
                {t('create.yearFrom')}
              </label>
              <Input
                type="number"
                value={yearMin}
                onChange={(e) => setYearMin(e.target.value)}
                placeholder="2018"
                min={1990}
                max={2030}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] text-slate-700 font-medium">
                {t('create.yearTo')}
              </label>
              <Input
                type="number"
                value={yearMax}
                onChange={(e) => setYearMax(e.target.value)}
                placeholder="2024"
                min={1990}
                max={2030}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] text-slate-700 font-medium">
                {t('create.budgetMin')}
              </label>
              <Input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="5.000.000"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] text-slate-700 font-medium">
                {t('create.budgetMax')}
              </label>
              <Input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="15.000.000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] text-slate-700 font-medium">
              {t('create.notes')}
            </label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={t('create.notesPlaceholder')}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 pb-6 sm:pb-3 border-t border-slate-100 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            {t('create.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[13px]">{t('create.submitting')}</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span className="text-[13px]">{t('create.submit')}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );

  return (
    <Drawer open={open} onOpenChange={handleClose} direction="right">
      <DrawerContentRight className="md:min-w-[480px]">
        <div className="flex flex-col h-full">
          {content}
        </div>
      </DrawerContentRight>
    </Drawer>
  );
}

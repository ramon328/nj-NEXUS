import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LeadTypes } from '@/types/leads';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/hooks/useI18n';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, X } from 'lucide-react';

const createLeadSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  rut: z.string().optional(),
  type: z.nativeEnum(LeadTypes),
  notes: z.string().optional(),
});

type CreateLeadFormValues = z.infer<typeof createLeadSchema>;

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateLead: (input: {
    customer_id: number;
    type: LeadTypes;
    notes?: string;
  }) => Promise<boolean>;
}

const CreateLeadDialog = ({
  open,
  onOpenChange,
  onCreateLead,
}: CreateLeadDialogProps) => {
  const { t: tLeads } = useTranslation('leadsPage');
  const { tCommon } = useI18n();
  const { clientId } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateLeadFormValues>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      rut: '',
      type: undefined,
      notes: '',
    },
  });

  const handleClose = (value: boolean) => {
    if (!value) form.reset();
    onOpenChange(value);
  };

  const handleSubmit = async (values: CreateLeadFormValues) => {
    if (!clientId) return;

    setIsSubmitting(true);

    try {
      let customerId: number;

      // Look up existing customer by email if provided
      if (values.email) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('client_id', clientId)
          .eq('email', values.email)
          .maybeSingle();

        if (existing) {
          customerId = existing.id;
          toast({ title: tLeads('createDialog.existingCustomerUsed') });
        } else {
          const { data, error } = await supabase
            .from('customers')
            .insert({
              client_id: clientId,
              first_name: values.first_name,
              last_name: values.last_name,
              email: values.email || null,
              phone: values.phone || null,
              rut: values.rut || null,
            })
            .select('id')
            .single();

          if (error) throw error;
          customerId = data.id;
        }
      } else {
        // No email — always create new customer
        const { data, error } = await supabase
          .from('customers')
          .insert({
            client_id: clientId,
            first_name: values.first_name,
            last_name: values.last_name,
            phone: values.phone || null,
            rut: values.rut || null,
          })
          .select('id')
          .single();

        if (error) throw error;
        customerId = data.id;
      }

      const success = await onCreateLead({
        customer_id: customerId,
        type: values.type,
        notes: values.notes?.trim() || undefined,
      });

      if (success) {
        toast({ title: tLeads('createDialog.success') });
        form.reset();
        onOpenChange(false);
      } else {
        toast({
          title: tLeads('createDialog.error'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: tLeads('createDialog.error'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex flex-col flex-1 min-h-0"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
          e.preventDefault();
        }
      }}
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 shrink-0 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-slate-900">
          {tLeads('createDialog.title')}
        </h2>
        <button
          type="button"
          onClick={() => handleClose(false)}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 min-h-0 px-5 py-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-medium">
                {tLeads('createDialog.firstName')} <span className="text-red-500">*</span>
              </label>
              <Input
                {...form.register('first_name')}
                placeholder={tLeads('createDialog.firstName')}
              />
              {form.formState.errors.first_name && (
                <p className="text-[11px] text-destructive">
                  {tCommon('validation.required')}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-medium">
                {tLeads('createDialog.lastName')} <span className="text-red-500">*</span>
              </label>
              <Input
                {...form.register('last_name')}
                placeholder={tLeads('createDialog.lastName')}
              />
              {form.formState.errors.last_name && (
                <p className="text-[11px] text-destructive">
                  {tCommon('validation.required')}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-medium">
                {tLeads('createDialog.email')}
              </label>
              <Input
                type="email"
                {...form.register('email')}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-medium">
                {tLeads('createDialog.phone')}
              </label>
              <Input
                {...form.register('phone')}
                placeholder="+56 9 1234 5678"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-medium">
                {tLeads('createDialog.rut')}
              </label>
              <Input
                {...form.register('rut')}
                placeholder="12.345.678-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-medium">
                {tLeads('createDialog.type')} <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.watch('type') || ''}
                onValueChange={(v) =>
                  form.setValue('type', v as LeadTypes, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={tLeads('createDialog.selectType')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>
                      {tLeads('createDialog.typeGroupBuy')}
                    </SelectLabel>
                    <SelectItem value={LeadTypes.BUY_DIRECT}>
                      {tLeads('types.buyDirect')}
                    </SelectItem>
                    <SelectItem value={LeadTypes.BUY_CONSIGNMENT}>
                      {tLeads('types.buyConsignment')}
                    </SelectItem>
                    <SelectItem value={LeadTypes.SEARCH_REQUEST}>
                      {tLeads('types.searchRequest')}
                    </SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>
                      {tLeads('createDialog.typeGroupSell')}
                    </SelectLabel>
                    <SelectItem value={LeadTypes.SELL_VEHICLE}>
                      {tLeads('types.sellVehicle')}
                    </SelectItem>
                    <SelectItem value={LeadTypes.SELL_FINANCING}>
                      {tLeads('types.sellFinancing')}
                    </SelectItem>
                    <SelectItem value={LeadTypes.SELL_TRANSFER}>
                      {tLeads('types.sellTransfer')}
                    </SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>
                      {tLeads('createDialog.typeGroupOther')}
                    </SelectLabel>
                    <SelectItem value={LeadTypes.CONTACT_GENERAL}>
                      {tLeads('types.contactGeneral')}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {form.formState.errors.type && (
                <p className="text-[11px] text-destructive">
                  {tCommon('validation.required')}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 font-medium">
              {tLeads('createDialog.notes')}
            </label>
            <Textarea
              {...form.register('notes')}
              placeholder={tLeads('createDialog.notesPlaceholder')}
              rows={2}
              className="resize-none min-h-0"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 pb-6 sm:pb-3 border-t border-slate-100 shrink-0">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full gap-2 rounded-xl bg-sky-400 hover:bg-sky-500 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-[13px]">Guardando...</span>
            </>
          ) : (
            <span className="text-[13px]">{tCommon('buttons.save')}</span>
          )}
        </Button>
      </div>
    </form>
  );

  return (
    <Drawer open={open} onOpenChange={handleClose} direction="right" dismissible={false}>
      <DrawerContentRight className="md:min-w-[480px]">
        <div className="flex flex-col h-full">
          {content}
        </div>
      </DrawerContentRight>
    </Drawer>
  );
};

export default CreateLeadDialog;

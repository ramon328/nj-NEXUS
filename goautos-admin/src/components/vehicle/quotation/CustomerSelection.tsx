
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  FormField,
  FormItem,
  FormLabel,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CustomerForm from '../../customer/CustomerForm';
import { Control } from 'react-hook-form';
import { QuotationFormData } from './QuotationFormSchema';
import { useTranslation } from 'react-i18next';

interface CustomerSelectionProps {
  control: Control<QuotationFormData>;
  clientId: number | null;
}

const CustomerSelection: React.FC<CustomerSelectionProps> = ({ control, clientId }) => {
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = React.useState(false);
  const { t } = useTranslation('vehicleQuotations');

  // Fetch customers for this client
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email')
        .eq('client_id', clientId);
      
      if (error) throw error;
      return data || [];
    },
  });

  const handleNewCustomerCreated = () => {
    setIsCustomerDialogOpen(false);
  };

  return (
    <FormField
      control={control}
      name="customer_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('customerSelection.title')}</FormLabel>
          <div className="flex gap-2">
            <FormControl>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('customerSelection.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {customersLoading ? (
                    <SelectItem value="loading" disabled>{t('customerSelection.loading')}</SelectItem>
                  ) : customers?.length ? (
                    customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.first_name} {customer.last_name} {customer.email ? `(${customer.email})` : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="empty" disabled>{t('customerSelection.empty')}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </FormControl>
            <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">{t('customerSelection.newCustomer')}</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{t('customerSelection.dialogTitle')}</DialogTitle>
                </DialogHeader>
                <CustomerForm onSuccess={handleNewCustomerCreated} />
              </DialogContent>
            </Dialog>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CustomerSelection;

import React, { useState, ReactNode } from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Control, UseFormReturn } from 'react-hook-form';
import { AcquisitionFormValues } from './AcquisitionFormSchema';
import CustomerModal from '@/components/customer/CustomerModal';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ChevronsUpDown, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { getCustomerDisplayNameWithRut, getCustomerSearchText } from '@/utils/customerName';

interface CustomerSelectProps {
  control: Control<AcquisitionFormValues>;
  name: 'purchaseCustomerId' | 'consignmentCustomerId';
  label: ReactNode;
  description: string;
  customers: any[];
  isLoading: boolean;
  onNewCustomer: () => void | Promise<void>;
  initialEmail?: string;
  form?: UseFormReturn<AcquisitionFormValues>;
  onRefresh?: () => void | Promise<void>;
}

const CustomerSelect: React.FC<CustomerSelectProps> = ({
  control,
  name,
  label,
  description,
  customers,
  isLoading,
  onNewCustomer,
  initialEmail,
  form,
  onRefresh,
}) => {
  const { t } = useTranslation('common');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Format customer name for display (persona o empresa)
  const formatCustomerName = (customer: any) => getCustomerDisplayNameWithRut(customer);

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm.trim()) return true;
    return getCustomerSearchText(customer).includes(searchTerm.toLowerCase());
  });

  const handleShowCustomerModal = () => {
    setShowCustomerModal(true);
  };

  const handleCloseCustomerModal = () => {
    setShowCustomerModal(false);
  };

  const handleCustomerCreated = async (customerId: number) => {
    // Close modal first
    handleCloseCustomerModal();

    // Wait for customer list to refresh
    await onNewCustomer();

    // Now set the value in the form
    if (form) {
      form.setValue(name, customerId);
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    if (form) {
      form.setValue(name, parseInt(customerId));
    }
    setSearchTerm('');
    setOpen(false);
  };

  return (
    <>
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem>
            {label && <FormLabel>{label}</FormLabel>}
            <div className='flex flex-col sm:flex-row gap-2 sm:space-x-2'>
              <Popover open={open} onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (isOpen && onRefresh) onRefresh();
              }}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant='outline'
                      role='combobox'
                      aria-expanded={open}
                      className={cn(
                        'w-full justify-between font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                      disabled={isLoading}
                      onClick={() => setOpen(true)}
                    >
                      <span className='truncate'>
                        {field.value
                          ? customers.find((c) => c.id === field.value)
                            ? formatCustomerName(
                                customers.find((c) => c.id === field.value)
                              )
                            : t('addVehicle.acquisition.form.customerSelect.selectCustomer')
                          : t('addVehicle.acquisition.form.customerSelect.selectCustomer')}
                      </span>
                      <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent
                  className='w-[calc(100vw-2rem)] sm:w-[--radix-popover-trigger-width] min-w-[250px] p-0'
                  align='start'
                >
                  <div className='flex flex-col w-full p-2'>
                    <div className='px-2 mb-2'>
                      <Input
                        placeholder={t('addVehicle.acquisition.form.customerSelect.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className='h-9'
                      />
                    </div>

                    <ScrollArea className='h-60 w-full rounded-md border'>
                      <div className='p-2'>
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <div
                              key={customer.id}
                              className={cn(
                                'flex items-center rounded-md px-2 py-2 cursor-pointer hover:bg-slate-100',
                                customer.id === field.value && 'bg-slate-100'
                              )}
                              onClick={() =>
                                handleSelectCustomer(customer.id.toString())
                              }
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4 flex-shrink-0',
                                  customer.id === field.value
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              <span className='truncate'>
                                {formatCustomerName(customer)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className='px-2 py-6 text-center text-sm text-muted-foreground'>
                            {t('addVehicle.acquisition.form.customerSelect.noResults')}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                type='button'
                variant='outline'
                onClick={handleShowCustomerModal}
                className='flex items-center justify-center sm:w-auto'
              >
                <PlusCircle className='h-4 w-4 mr-1' />
                {t('buttons.add')}
              </Button>
            </div>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />

      <CustomerModal
        isOpen={showCustomerModal}
        onClose={handleCloseCustomerModal}
        onSuccess={handleCustomerCreated}
        initialEmail={initialEmail}
      />
    </>
  );
};

export default CustomerSelect;

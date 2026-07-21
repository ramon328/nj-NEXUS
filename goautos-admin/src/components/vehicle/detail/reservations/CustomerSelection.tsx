
import React from 'react';
import { useCustomerSelection } from '@/hooks/useCustomerSelection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, User, Check } from 'lucide-react';
import CustomerForm from '@/components/customer/CustomerForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface CustomerSelectionProps {
  vehicle: any;
  onCustomerSelected: (customerId: number | null) => void;
}

const CustomerSelection: React.FC<CustomerSelectionProps> = ({
  vehicle,
  onCustomerSelected
}) => {
  const { t } = useTranslation('vehicleReservations');
  const {
    filteredCustomers,
    loading,
    searchTerm,
    setSearchTerm,
    selectedCustomerId,
    setSelectedCustomerId,
    showNewCustomerForm,
    setShowNewCustomerForm,
    refetchCustomers
  } = useCustomerSelection();

  const handleSelectCustomer = (customerId: number) => {
    setSelectedCustomerId(customerId);
    onCustomerSelected(customerId);
  };

  const handleNewCustomerSuccess = () => {
    refetchCustomers();
    setShowNewCustomerForm(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('customerSelection.searchPlaceholder')}
            className="pl-8 h-7 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button size="sm" className="h-8 text-xs shrink-0" onClick={() => setShowNewCustomerForm(true)}>
          <PlusCircle className="mr-1 h-3.5 w-3.5" />
          {t('customerSelection.newCustomer')}
        </Button>
      </div>

      <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-1">
        {loading ? (
          <div className="text-center py-4 text-xs text-muted-foreground">{t('customerSelection.loading')}</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            {t('customerSelection.empty')}
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className={cn(
                'w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors text-xs',
                selectedCustomerId === customer.id
                  ? 'bg-primary/10 ring-1 ring-primary/30'
                  : 'hover:bg-slate-50'
              )}
              onClick={() => handleSelectCustomer(customer.id)}
            >
              <div className={cn(
                'flex items-center justify-center h-7 w-7 rounded-full shrink-0',
                selectedCustomerId === customer.id ? 'bg-primary text-white' : 'bg-slate-100'
              )}>
                {selectedCustomerId === customer.id
                  ? <Check className="h-3.5 w-3.5" />
                  : <User className="h-3.5 w-3.5 text-slate-400" />
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">
                  {customer.first_name} {customer.last_name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {customer.rut && <>{customer.rut} · </>}
                  {customer.email || t('customerSelection.noEmail')}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomerForm} onOpenChange={setShowNewCustomerForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('customerSelection.newCustomer')}</DialogTitle>
          </DialogHeader>
          <CustomerForm onSuccess={handleNewCustomerSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerSelection;

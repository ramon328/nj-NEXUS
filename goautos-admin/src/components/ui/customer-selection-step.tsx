import React from 'react';
import { useCustomerSelection } from '@/hooks/useCustomerSelection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, User, Check, Plus, ArrowLeft, Mail, Phone } from 'lucide-react';
import CustomerForm from '@/components/customer/CustomerForm';
import { cn } from '@/lib/utils';

interface CustomerSelectionStepProps {
  selectedCustomerId?: number | null;
  selectedCustomer?: any | null;
  onSelect: (customer: any | null) => void;
  searchPlaceholder?: string;
  excludeConsignmentOnly?: boolean;
}

const CustomerSelectionStep: React.FC<CustomerSelectionStepProps> = ({
  selectedCustomerId: externalSelectedId,
  selectedCustomer: externalSelectedCustomer,
  onSelect,
  searchPlaceholder = 'Buscar cliente por nombre o email...',
  excludeConsignmentOnly = false,
}) => {
  const {
    filteredCustomers,
    loading,
    searchTerm,
    setSearchTerm,
    selectedCustomerId: internalSelectedId,
    setSelectedCustomerId,
    selectedCustomer: internalSelectedCustomer,
    showNewCustomerForm,
    setShowNewCustomerForm,
    refetchCustomers,
  } = useCustomerSelection({ excludeConsignmentOnly });

  const activeCustomerId = externalSelectedId ?? internalSelectedId;
  const activeCustomer = externalSelectedCustomer ?? internalSelectedCustomer;

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomerId(customer.id);
    onSelect(customer);
  };

  const handleNewCustomerSuccess = (customerData: any) => {
    refetchCustomers();
    setShowNewCustomerForm(false);
    if (customerData) {
      setSelectedCustomerId(customerData.id);
      onSelect(customerData);
    }
  };

  const handleChangeCustomer = () => {
    setSelectedCustomerId(null);
    onSelect(null);
    setSearchTerm('');
  };

  // View: Selected customer card
  if (activeCustomerId && activeCustomer) {
    return (
      <div className="space-y-2">
        <div className="p-3 border rounded-lg bg-slate-50/60">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white shrink-0">
                <Check className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {activeCustomer.full_name ||
                    `${activeCustomer.first_name} ${activeCustomer.last_name}`}
                </p>
                {activeCustomer.rut && (
                  <p className="text-xs text-muted-foreground">{activeCustomer.rut}</p>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-7 shrink-0"
              onClick={handleChangeCustomer}
            >
              Cambiar
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {activeCustomer.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {activeCustomer.email}
              </span>
            )}
            {activeCustomer.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {activeCustomer.phone}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // View: Inline new customer form
  if (showNewCustomerForm) {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs h-7 -ml-1"
          onClick={() => setShowNewCustomerForm(false)}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a la lista
        </Button>
        <CustomerForm onSuccess={handleNewCustomerSuccess} />
      </div>
    );
  }

  // View: Customer list with search
  return (
    <div>
      <div className="sticky -top-3 -mx-3 px-3 pt-3 pb-2 z-10 bg-background">
        <div className="flex gap-1.5">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              className="pl-8 h-8 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setShowNewCustomerForm(true)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-0.5">
        {loading ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            Cargando clientes...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            {searchTerm
              ? 'No se encontraron clientes'
              : 'No hay clientes registrados'}
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className={cn(
                'w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors text-xs',
                activeCustomerId === customer.id
                  ? 'bg-primary/10 ring-1 ring-primary/30'
                  : 'hover:bg-slate-50'
              )}
              onClick={() => handleSelectCustomer(customer)}
            >
              <div
                className={cn(
                  'flex items-center justify-center h-7 w-7 rounded-full shrink-0',
                  activeCustomerId === customer.id
                    ? 'bg-primary text-white'
                    : 'bg-slate-100'
                )}
              >
                {activeCustomerId === customer.id ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <User className="h-3.5 w-3.5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">
                  {customer.first_name} {customer.last_name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {customer.rut && <>{customer.rut} &middot; </>}
                  {customer.email || 'Sin email'}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default CustomerSelectionStep;

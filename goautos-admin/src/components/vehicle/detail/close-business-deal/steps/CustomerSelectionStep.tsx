import { useCloseBusinessDealStore } from '@/stores/closeBusinessDealStore';
import CustomerSelectionStepUI from '@/components/ui/customer-selection-step';

const CustomerSelectionStep = () => {
  const { customerId, customer, setCustomer } = useCloseBusinessDealStore();

  return (
    <CustomerSelectionStepUI
      selectedCustomerId={customerId}
      selectedCustomer={customer}
      onSelect={(customer) => setCustomer(customer)}
    />
  );
};

export default CustomerSelectionStep;

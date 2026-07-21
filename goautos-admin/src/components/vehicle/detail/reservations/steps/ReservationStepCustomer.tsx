import React from 'react';
import CustomerSelectionStep from '@/components/ui/customer-selection-step';

interface ReservationStepCustomerProps {
  vehicle: any;
  onCustomerSelected: (customerId: number | null) => void;
}

const ReservationStepCustomer: React.FC<ReservationStepCustomerProps> = ({
  vehicle,
  onCustomerSelected,
}) => {
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null);

  const handleSelect = (customer: any | null) => {
    setSelectedCustomer(customer);
    onCustomerSelected(customer?.id ?? null);
  };

  return (
    <CustomerSelectionStep
      selectedCustomerId={selectedCustomer?.id ?? null}
      selectedCustomer={selectedCustomer}
      onSelect={handleSelect}
    />
  );
};

export default ReservationStepCustomer;

import { useVehicleSaleStore } from '@/stores/vehicleSaleStore';
import CustomerSelectionStepUI from '@/components/ui/customer-selection-step';
import { Button } from '@/components/ui/button';
import { UserX } from 'lucide-react';

const CustomerSelectionStep = () => {
  const { saleInfo, setCustomer, setSkipCustomer, goToNextStep } = useVehicleSaleStore();

  const handleSkip = () => {
    setSkipCustomer(true);
    goToNextStep();
  };

  return (
    <div className='space-y-3'>
      <CustomerSelectionStepUI
        selectedCustomerId={saleInfo.customerId}
        selectedCustomer={saleInfo.customer}
        onSelect={(customer) => setCustomer(customer)}
        excludeConsignmentOnly
      />

      {!saleInfo.customerId && (
        <div className='flex items-center justify-between gap-2 p-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60'>
          <div className='text-[12px] text-slate-600'>
            ¿Es una venta sin cliente final (vehículo de la automotora, traspaso interno)?
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleSkip}
            className='gap-1.5 rounded-xl text-[12px] h-8 shrink-0'
          >
            <UserX className='h-3.5 w-3.5' />
            Continuar sin cliente
          </Button>
        </div>
      )}
    </div>
  );
};

export default CustomerSelectionStep;

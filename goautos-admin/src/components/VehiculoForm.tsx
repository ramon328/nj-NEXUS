
import React from 'react';
import { Form } from '@/components/ui/form';
import { useVehicleForm } from '@/hooks/useVehicleForm';
import VehicleFormBrandModel from './vehiculos/form/VehicleFormBrandModel';
import VehicleFormYearPrice from './vehiculos/form/VehicleFormYearPrice';
import VehicleFormCategoryStatus from './vehiculos/form/VehicleFormCategoryStatus';
import VehicleFormConsigned from './vehiculos/form/VehicleFormConsigned';
import VehicleFormDescription from './vehiculos/form/VehicleFormDescription';
import VehicleFormActions from './vehiculos/form/VehicleFormActions';

interface VehiculoFormProps {
  onSuccess: () => void;
}

const VehiculoForm: React.FC<VehiculoFormProps> = ({ onSuccess }) => {
  const { 
    form, 
    selectedBrand, 
    setSelectedBrand, 
    isSubmitting, 
    onSubmit 
  } = useVehicleForm(onSuccess);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <VehicleFormBrandModel 
            control={form.control} 
            selectedBrand={selectedBrand} 
            setSelectedBrand={setSelectedBrand}
            form={form}
          />
        </div>

        <VehicleFormYearPrice control={form.control} />

        <VehicleFormCategoryStatus control={form.control} />

        <VehicleFormConsigned control={form.control} />

        <VehicleFormDescription control={form.control} />

        <VehicleFormActions 
          onCancel={onSuccess} 
          isSubmitting={isSubmitting} 
        />
      </form>
    </Form>
  );
};

export default VehiculoForm;

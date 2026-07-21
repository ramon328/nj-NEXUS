import React, { createContext, useContext } from 'react';
import { UseFormReturn, Control } from 'react-hook-form';
import { VehicleType } from '@/types/vehicle';

interface VehicleFormContextType {
  form: UseFormReturn<any>;
  brandId: string | null;
  setBrandId: (id: string | null) => void;
  brands: { id: string; name: string | null }[];
  models: { id: number; name: string | null }[];
  calculateFinalPrice: () => number | null;
  isSubmitting: boolean;
  errorFields: string[];
  clearFieldError: (fieldName: string) => void;
  vehicleType: VehicleType;
}

const VehicleFormContext = createContext<VehicleFormContextType | undefined>(
  undefined
);

export const VehicleFormProvider: React.FC<{
  children: React.ReactNode;
  value: VehicleFormContextType;
}> = ({ children, value }) => {
  return (
    <VehicleFormContext.Provider value={value}>
      {children}
    </VehicleFormContext.Provider>
  );
};

export const useVehicleForm = (): VehicleFormContextType => {
  const context = useContext(VehicleFormContext);
  if (!context) {
    throw new Error('useVehicleForm must be used within a VehicleFormProvider');
  }
  return context;
};

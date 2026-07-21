import React from 'react';
import BasicInfoSection from './BasicInfoSection';
import PriceSection from './PriceSection';
import DetailsSection from './DetailsSection';
import FormActions from './FormActions';
import { Dealership } from '@/hooks/useDealerships';

interface FormLayoutProps {
  categories: any[];
  colors: any[];
  conditions: any[];
  fuelTypes: any[];
  statuses: any[];
  dealerships?: Dealership[];
  onNext: (data?: any) => void;
  isEditMode?: boolean;
  submitButtonText?: string;
  showNavigationButtons?: boolean;
  onCancel?: () => void;
}

const FormLayout: React.FC<FormLayoutProps> = ({
  categories,
  colors,
  conditions,
  fuelTypes,
  statuses,
  dealerships = [],
  onNext,
  isEditMode,
  submitButtonText,
  showNavigationButtons,
  onCancel,
}) => {
  return (
    <>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <BasicInfoSection />
        <PriceSection />
      </div>

      <DetailsSection
        categories={categories}
        colors={colors}
        conditions={conditions}
        fuelTypes={fuelTypes}
        statuses={statuses}
      />

      <FormActions
        onNext={onNext}
        isEditMode={isEditMode}
        submitButtonText={submitButtonText}
        showNavigationButtons={showNavigationButtons}
        onCancel={onCancel}
      />
    </>
  );
};

export default FormLayout;

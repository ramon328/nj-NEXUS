import React from 'react';
import { Button } from '@/components/ui/button';
import { useVehicleForm } from './context/VehicleFormContext';
import { useTranslation } from 'react-i18next';

interface FormActionsProps {
  onNext: (data?: any) => void;
  onPrevious?: () => void;
  isValid?: boolean;
  isEditMode?: boolean;
  submitButtonText?: string;
  showNavigationButtons?: boolean;
  onCancel?: () => void;
}

const FormActions = ({
  onNext,
  onPrevious,
  isValid = true,
  isEditMode = false,
  submitButtonText,
  showNavigationButtons = true,
  onCancel,
}: FormActionsProps) => {
  const { form, isSubmitting } = useVehicleForm();
  const { t } = useTranslation('common');

  const handleNextClick = () => {
    const data = form.getValues();
    onNext(data);
  };

  if (isEditMode) {
    return (
      <div className='flex justify-between mt-6'>
        {onCancel ? (
          <Button
            type='button'
            variant='outline'
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t('buttons.cancel')}
          </Button>
        ) : (
          <div></div>
        )}
        <Button type='submit' disabled={isSubmitting || !isValid}>
          {isSubmitting ? t('actions.saving') : submitButtonText || t('buttons.update')}
        </Button>
      </div>
    );
  }

  if (showNavigationButtons) {
    return (
      <div className='flex justify-between mt-6'>
        {onPrevious ? (
          <Button
            type='button'
            variant='outline'
            onClick={onPrevious}
            disabled={isSubmitting}
          >
            {t('buttons.previous')}
          </Button>
        ) : (
          <div></div>
        )}
        <Button
          type='button'
          onClick={handleNextClick}
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting ? t('actions.saving') : submitButtonText || t('buttons.next')}
        </Button>
      </div>
    );
  }

  return (
    <div className='flex justify-end mt-6'>
      <Button type='submit' disabled={isSubmitting || !isValid}>
        {isSubmitting ? t('actions.saving') : submitButtonText || t('buttons.save')}
      </Button>
    </div>
  );
};

export default FormActions;

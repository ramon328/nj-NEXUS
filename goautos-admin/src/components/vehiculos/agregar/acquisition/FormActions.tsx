import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface FormActionsProps {
  onPrevious: () => void;
  isSubmitting?: boolean;
}

const FormActions: React.FC<FormActionsProps> = ({
  onPrevious,
  isSubmitting = false,
}) => {
  const { t } = useTranslation('common');
  return (
    <div className='flex justify-between'>
      <Button type='button' variant='outline' onClick={onPrevious}>
        {t('buttons.previous')}
      </Button>
      <Button type='submit' disabled={isSubmitting}>
        {isSubmitting ? t('actions.saving') : t('buttons.next')}
      </Button>
    </div>
  );
};

export default FormActions;

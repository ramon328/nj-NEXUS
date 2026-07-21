
import React from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';

type FormActionsProps = {
  onCancel: () => void;
  isLoading: boolean;
};

const FormActions = ({ onCancel, isLoading }: FormActionsProps) => {
  const { tCommon } = useI18n();
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl text-[12px] h-9 border-slate-200/60">
        {tCommon('buttons.cancel')}
      </Button>
      <Button type="submit" disabled={isLoading} className="bg-sky-400 hover:bg-sky-500 rounded-xl text-[12px] h-9">
        {isLoading ? tCommon('actions.saving') : tCommon('financing.form.save')}
      </Button>
    </div>
  );
};

export default FormActions;

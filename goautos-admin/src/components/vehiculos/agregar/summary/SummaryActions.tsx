import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SummaryActionsProps {
  onSave: () => void;
  onPrevious: () => void;
  isLoading: boolean;
}

const SummaryActions = ({ onSave, onPrevious, isLoading }: SummaryActionsProps) => {
  const { t } = useTranslation('common');
  return (
    <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
      <Button
        type="button"
        variant="ghost"
        onClick={onPrevious}
        disabled={isLoading}
        className="gap-2 text-slate-600 hover:text-slate-900 rounded-xl"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('buttons.previous', { defaultValue: 'Anterior' })}
      </Button>
      <Button
        onClick={onSave}
        disabled={isLoading}
        className="gap-2 bg-sky-400 hover:bg-sky-500 text-white shadow-sm rounded-xl"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('actions.saving', { defaultValue: 'Guardando...' })}
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            {t('addVehicle.summary.saveVehicle', { defaultValue: 'Guardar vehículo' })}
          </>
        )}
      </Button>
    </div>
  );
};

export default SummaryActions;

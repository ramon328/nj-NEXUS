import React from 'react';
import { useTranslation } from 'react-i18next';

const SummaryHeader = () => {
  const { t } = useTranslation('common');

  return (
    <div className="hidden md:flex items-center justify-between gap-4 pb-1">
      <h2 className="text-base font-semibold text-slate-800">
        {t('addVehicle.summary.title', { defaultValue: 'Resumen del vehículo' })}
      </h2>
      <span className="text-xs text-slate-400 font-medium">
        {t('addVehicle.summary.subtitle', { defaultValue: 'Revisa antes de guardar' })}
      </span>
    </div>
  );
};

export default SummaryHeader;

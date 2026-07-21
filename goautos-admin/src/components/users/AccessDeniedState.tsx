
import React from 'react';
import { useTranslation } from 'react-i18next';

const AccessDeniedState = () => {
  const { t } = useTranslation('team');
  return (
    <div className="rounded-2xl border border-slate-200/60 p-8 text-center mx-4 sm:mx-6 lg:mx-8 mt-4">
      <p className="text-[13px] text-slate-400">{t('accessDenied')}</p>
    </div>
  );
};

export default AccessDeniedState;

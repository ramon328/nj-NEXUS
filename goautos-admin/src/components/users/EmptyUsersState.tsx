import React from 'react';
import { useTranslation } from 'react-i18next';

interface EmptyUsersStateProps {
  userType?: string;
}

const EmptyUsersState: React.FC<EmptyUsersStateProps> = ({
  userType = 'usuarios',
}) => {
  const { t } = useTranslation('team');
  return (
    <div className='flex flex-col items-center justify-center py-12'>
      <span className='text-[15px] font-semibold text-slate-900 mb-1 text-center'>
        {t('empty.title', { type: userType })}
      </span>
      <span className='text-[13px] text-slate-500 text-center'>
        {t('empty.subtitle', { addLabel: t('actions.addUser') })}
      </span>
    </div>
  );
};

export default EmptyUsersState;

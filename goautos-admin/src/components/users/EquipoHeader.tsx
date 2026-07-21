import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface EquipoHeaderProps {
  onCreateUser: () => void;
  selectedTab: string;
}

const EquipoHeader: React.FC<EquipoHeaderProps> = ({
  onCreateUser,
  selectedTab,
}) => {
  const { t } = useTranslation('team');
  return (
    <div className='flex flex-col gap-2 pt-4 mb-8'>
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight text-[#181f2a] mb-1'>
            {t('title')}
          </h1>
          <p className='text-base text-[#6b7280] font-normal'>
            {t('subtitle')}
          </p>
        </div>
        {selectedTab === 'admins' && (
          <Button
            className='flex items-center gap-2 px-4 py-2 text-sm mt-4 mr-0 rounded-lg bg-sky-400/90 hover:bg-sky-500 text-white font-semibold shadow-md transition-transform hover:scale-100 md:px-5 md:py-3 md:text-base md:mt-8 md:mr-8'
            onClick={onCreateUser}
          >
            {t('actions.addUser')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EquipoHeader;

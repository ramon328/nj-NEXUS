import { useState, ReactNode } from 'react';
import { Icon } from '@iconify/react';

interface GeneralConfigSectionProps {
  children: ReactNode;
}

export const GeneralConfigSection = ({ children }: GeneralConfigSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className='border border-gray-200 rounded-xl overflow-hidden'>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors'
      >
        <div className='flex items-center gap-2'>
          <Icon icon='mdi:cog' className='text-lg text-gray-600' />
          <span className='text-sm font-medium text-gray-900'>
            Configuración General
          </span>
        </div>
        <Icon
          icon={isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}
          className='text-lg text-gray-400'
        />
      </button>

      {isOpen && (
        <div className='p-3 space-y-3 border-t border-gray-200 bg-white'>
          {children}
        </div>
      )}
    </div>
  );
};

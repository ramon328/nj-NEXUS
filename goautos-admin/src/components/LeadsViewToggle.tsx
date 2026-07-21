import { useRef, useEffect, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LeadsViewToggleProps {
  activeTab: 'buy' | 'sell';
  setActiveTab: (tab: 'buy' | 'sell') => void;
  groupedLeads: {
    buyLeads: any[];
    sellLeads: any[];
  };
  rightAction?: React.ReactNode;
}

const LeadsViewToggle = ({
  activeTab,
  setActiveTab,
  groupedLeads,
  rightAction,
}: LeadsViewToggleProps) => {
  const { tCommon } = useI18n();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = activeTab === 'buy' ? 0 : 1;
    const el = tabRefs.current[idx];
    if (el) {
      setIndicatorStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [activeTab]);

  return (
    <div className='w-full'>
      <div className='relative border-b border-gray-200 flex items-end min-w-[260px] mt-2 mb-2'>
        {/* Línea azul animada solo bajo el tab activo */}
        <div
          className='absolute h-[3px] bg-[#2da2e7] rounded-full z-10 transition-all duration-300'
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            bottom: 0,
          }}
        />
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                ref={(el) => (tabRefs.current[0] = el)}
                onClick={() => setActiveTab('buy')}
                className={`flex items-center gap-1 px-1.5 sm:px-3 py-1 text-base sm:text-[15px] transition-colors duration-200 relative z-20 mb-4
                  ${
                    activeTab === 'buy'
                      ? 'text-[#2da2e7] font-normal'
                      : 'text-gray-500 font-normal'
                  }
                `}
                style={{ background: 'transparent' }}
              >
                {tCommon('leads.tabs.buy')}
              </button>
            </TooltipTrigger>
            <TooltipContent side='bottom' className='max-w-[250px] text-center'>
              <p>{tCommon('leads.tabs.buyTooltip')}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                ref={(el) => (tabRefs.current[1] = el)}
                onClick={() => setActiveTab('sell')}
                className={`flex items-center gap-1 px-1.5 sm:px-3 py-1 text-base sm:text-[15px] transition-colors duration-200 relative z-20 mb-4
                  ${
                    activeTab === 'sell'
                      ? 'text-[#2da2e7] font-normal'
                      : 'text-gray-500 font-normal'
                  }
                `}
                style={{ background: 'transparent' }}
              >
                {tCommon('leads.tabs.sell')}
              </button>
            </TooltipTrigger>
            <TooltipContent side='bottom' className='max-w-[250px] text-center'>
              <p>{tCommon('leads.tabs.sellTooltip')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {rightAction && (
          <div className='hidden lg:flex items-center ml-auto mb-4'>
            {rightAction}
          </div>
        )}
      </div>
      {rightAction && (
        <div className='lg:hidden mt-2 mb-2'>
          {rightAction}
        </div>
      )}
    </div>
  );
};

export default LeadsViewToggle;

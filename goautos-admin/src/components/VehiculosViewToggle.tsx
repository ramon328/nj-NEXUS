import React, { useMemo, useEffect, useState } from 'react';
import { LayoutGrid, List, Smartphone } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { useVehiclesTableStore } from '@/stores/vehiclesTableStore';

interface VehiculosViewToggleProps {
  view: 'table' | 'board' | 'cards';
  onViewChange: (view: 'table' | 'board' | 'cards') => void;
}

const desktopTabs = [
  { value: 'board', key: 'vehicles.viewToggle.board', icon: LayoutGrid },
  { value: 'table', key: 'vehicles.viewToggle.table', icon: List },
];

const VehiculosViewToggle = ({
  view,
  onViewChange,
}: VehiculosViewToggleProps) => {
  const { tCommon } = useI18n();
  const { defaultView } = useVehiclesTableStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const tabsDef = useMemo(() => {
    const mobileTabs = [
      { value: 'cards', key: 'vehicles.viewToggle.cards', icon: Smartphone },
      ...desktopTabs,
    ];

    const tabs = isMobile ? mobileTabs : desktopTabs;

    if (defaultView === 'table') {
      return [...tabs].sort((a, b) => (a.value === 'table' ? -1 : 1));
    }
    return tabs;
  }, [defaultView, isMobile]);

  return (
    <div className="inline-flex rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] overflow-hidden">
      {tabsDef.map((tab) => {
        const Icon = tab.icon;
        const isActive = view === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onViewChange(tab.value as 'table' | 'board' | 'cards')}
            title={tCommon(tab.key)}
            className={`
              flex items-center justify-center h-9 w-9 transition-all duration-200
              ${isActive
                ? 'bg-slate-100 text-slate-700'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }
            `}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
};

export default VehiculosViewToggle;

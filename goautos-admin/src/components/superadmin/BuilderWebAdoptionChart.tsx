import React, { useState, useRef, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Globe, CheckCircle2, XCircle } from 'lucide-react';
import type { BuilderPieData } from '@/hooks/useUsabilityStats';

const COLORS = ['#8b5cf6', '#e5e7eb'];

interface BuilderWebAdoptionChartProps {
  loading: boolean;
  data: BuilderPieData[];
  activeNames: string[];
  inactiveNames: string[];
}

type TooltipType = 'active' | 'inactive' | null;

const BuilderWebAdoptionChart: React.FC<BuilderWebAdoptionChartProps> = ({
  loading,
  data,
  activeNames,
  inactiveNames,
}) => {
  const [tooltipType, setTooltipType] = useState<TooltipType>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const active = data.find((d) => d.name === 'Con builder web')?.value || 0;
  const percentage = total > 0 ? ((active / total) * 100).toFixed(1) : '0';

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setTooltipType(null);
    }, 300);
  }, [clearHideTimeout]);

  const handlePieEnter = useCallback((data: any, _index: number, e: React.MouseEvent) => {
    clearHideTimeout();
    const name = data.name?.toLowerCase() || '';
    if (name.includes('con builder')) {
      setTooltipType('active');
    } else {
      setTooltipType('inactive');
    }

    if (chartContainerRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      // Posicionar el tooltip a la derecha del cursor, cerca de él
      setTooltipPosition({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top,
      });
    }
  }, [clearHideTimeout]);

  const handlePieLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  const handleTooltipEnter = useCallback(() => {
    clearHideTimeout();
  }, [clearHideTimeout]);

  const handleTooltipLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  const renderTooltipContent = () => {
    if (tooltipType === 'active') {
      return (
        <div
          className='bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl p-3 sm:p-4 shadow-2xl w-[280px]'
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >
          <div className='font-bold text-sm text-violet-600 mb-2 flex items-center gap-2'>
            <CheckCircle2 className="h-4 w-4" />
            Con builder activo ({activeNames.length})
          </div>
          <ul className='text-xs text-gray-600 space-y-1 max-h-[200px] overflow-y-auto pr-2'>
            {activeNames.length === 0 ? (
              <li className="text-gray-400">No hay automotoras con builder activo.</li>
            ) : (
              activeNames.map((name, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                  {name}
                </li>
              ))
            )}
          </ul>
        </div>
      );
    }
    if (tooltipType === 'inactive') {
      return (
        <div
          className='bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl p-3 sm:p-4 shadow-2xl w-[280px]'
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >
          <div className='font-bold text-sm text-gray-600 mb-2 flex items-center gap-2'>
            <XCircle className="h-4 w-4" />
            Sin builder activo ({inactiveNames.length})
          </div>
          <ul className='text-xs text-gray-600 space-y-1 max-h-[200px] overflow-y-auto pr-2'>
            {inactiveNames.length === 0 ? (
              <li className="text-gray-400">No hay automotoras sin builder activo.</li>
            ) : (
              inactiveNames.map((name, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                  {name}
                </li>
              ))
            )}
          </ul>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Background effects */}
      <div className="absolute -right-16 -top-16 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-violet-50 blur-3xl opacity-60" />
      <div className="absolute -left-16 -bottom-16 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-purple-50 blur-3xl opacity-60" />

      <div className="relative p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
            <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Adopción del Builder Web</h3>
            <p className="text-[10px] sm:text-xs text-gray-500">Automotoras con sitio web activo</p>
          </div>
        </div>

        {loading ? (
          <div className="h-[250px] sm:h-[280px] flex items-center justify-center">
            <div className="h-[180px] w-[180px] sm:h-[200px] sm:w-[200px] rounded-full bg-gray-100 animate-pulse" />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-center gap-4 sm:gap-6">
            {/* Chart */}
            <div className="relative w-full lg:w-1/2 h-[200px] sm:h-[240px]" ref={chartContainerRef}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                    onMouseEnter={handlePieEnter}
                    onMouseLeave={handlePieLeave}
                  >
                    {data.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        className="cursor-pointer"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-violet-600">{percentage}%</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Adopción</p>
                </div>
              </div>

              {/* Custom Tooltip */}
              {tooltipType && (
                <div
                  className="absolute z-50 pointer-events-auto"
                  style={{
                    left: tooltipPosition.x,
                    top: tooltipPosition.y,
                    transform: 'translateY(-50%)'
                  }}
                >
                  {renderTooltipContent()}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="w-full lg:w-1/2 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-violet-500" />
                  <span className="text-xs sm:text-sm text-gray-700">Con Builder Web</span>
                </div>
                <span className="text-base sm:text-lg font-bold text-violet-600">{active}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gray-300" />
                  <span className="text-xs sm:text-sm text-gray-700">Sin Builder Web</span>
                </div>
                <span className="text-base sm:text-lg font-bold text-gray-600">{total - active}</span>
              </div>
              <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-gray-50 border border-gray-100 text-center">
                <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5">Total Automotoras</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{total}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuilderWebAdoptionChart;

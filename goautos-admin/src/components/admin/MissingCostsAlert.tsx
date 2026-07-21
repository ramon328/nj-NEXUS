import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { SoldVehicleRow } from '@/hooks/admin/types/soldVehicles';

interface Props {
  soldVehicles: SoldVehicleRow[];
}

const MissingCostsAlert: React.FC<Props> = ({ soldVehicles }) => {
  const { t } = useTranslation('dashboard');
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState(false);

  const missing = soldVehicles.filter((v) => !v.hasCostRegistered);
  if (missing.length === 0) return null;

  return (
    <div className='rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:px-5 sm:py-4'>
      <div className='flex items-start gap-3'>
        <div className='shrink-0 mt-0.5'>
          <AlertTriangle className='h-5 w-5 text-amber-600' />
        </div>
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-medium text-amber-900'>
            {t('stats.vehiclesWithoutCost', { n: missing.length })}
          </p>
          <p className='text-xs text-amber-800 mt-0.5'>
            {t('stats.vehiclesWithoutCostHint')}
          </p>
          <div className='mt-2 flex flex-wrap items-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              className='h-8 text-xs border-amber-300 hover:bg-amber-100'
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? (
                <>
                  <ChevronUp className='h-3.5 w-3.5 mr-1' />
                  {t('stats.vehiclesWithoutCostHide')}
                </>
              ) : (
                <>
                  <ChevronDown className='h-3.5 w-3.5 mr-1' />
                  {t('stats.vehiclesWithoutCostShow')}
                </>
              )}
            </Button>
          </div>

          {expanded && (
            <ul className='mt-3 space-y-1 max-h-80 overflow-y-auto pr-1'>
              {missing.map((v) => (
                <li
                  key={v.saleId}
                  className={cn(
                    'flex items-center justify-between text-xs',
                    'rounded-lg bg-white/70 border border-amber-200/60 px-2.5 py-1.5'
                  )}
                >
                  <span className='text-slate-700 tabular-nums'>
                    #{v.vehicleId} ·{' '}
                    <span className='text-slate-500'>
                      {v.isConsigned ? t('stats.consignedVehicles') : t('stats.ownStock')}
                    </span>
                  </span>
                  <button
                    type='button'
                    onClick={() => setLocation(`/vehiculos/${v.vehicleId}`)}
                    className='inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 font-medium'
                  >
                    {t('stats.vehiclesWithoutCostCta')}
                    <ExternalLink className='h-3 w-3' />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default MissingCostsAlert;

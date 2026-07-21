import React from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { InfoIcon } from 'lucide-react';
import { formatCurrency } from '../transactions/utils';
import { useI18n } from '@/hooks/useI18n';

type ExtraItem = {
  title?: string;
  amount?: number;
};

type DetailItemProps = {
  label: string;
  value: string | number | null | undefined;
  extras?: ExtraItem[];
  showHover?: boolean;
  formatValue?: (value: number | null | undefined) => string;
  className?: string;
  showSensitiveData?: boolean;
  isSensitive?: boolean;
};

export const DetailItem: React.FC<DetailItemProps> = ({
  label,
  value,
  extras = [],
  showHover = false,
  formatValue = formatCurrency,
  className = '',
  showSensitiveData = true,
  isSensitive = false,
}) => {
  const { tCommon } = useI18n();
  const renderHiddenValue = () => {
    return (
      <span className='text-slate-900 font-semibold font-mono tracking-wider'>
        ••••••••
      </span>
    );
  };

  const getDisplayValue = () => {
    if (!showSensitiveData && value && typeof value === 'number') {
      return renderHiddenValue();
    }
    return typeof value === 'number' ? formatValue(value) : value;
  };

  if (!showHover || extras.length === 0) {
    return (
      <div
        className={`flex justify-between text-[13px] ${className}`}
      >
        <span className='text-slate-500 font-medium'>{label}</span>
        <span className='text-slate-900 font-semibold'>{getDisplayValue()}</span>
      </div>
    );
  }

  return (
    <div className={`flex justify-between text-[13px] ${className}`}>
      <HoverCard>
        <HoverCardTrigger asChild>
          <span className='flex items-center cursor-help text-slate-500 font-medium'>
            {label} <InfoIcon className='h-3 w-3 ml-1' />
          </span>
        </HoverCardTrigger>
        <HoverCardContent className='w-80 p-2'>
          <div className='space-y-2'>
            <h4 className='text-sm font-medium'>
              {tCommon('vehicles.detail.financial.detailOf').replace(
                '{{label}}',
                label.toLowerCase()
              )}
            </h4>
            {extras.length > 0 ? (
              <div className='space-y-1'>
                {extras.map((extra, index) => (
                  <div key={index} className='flex justify-between text-xs'>
                    <span className='text-slate-500'>
                      {extra.title || tCommon('vehicles.detail.financial.untitled')}
                    </span>
                    <span className='font-medium text-slate-900'>
                      {!showSensitiveData
                        ? '••••••••'
                        : formatValue(extra.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-xs text-muted-foreground'>
                {tCommon('vehicles.detail.financial.noDetails')}
              </p>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
      <span className='text-slate-900 font-semibold'>{getDisplayValue()}</span>
    </div>
  );
};

type DetailSectionProps = {
  title: string;
  children: React.ReactNode;
  totalLabel?: string;
  totalValue?: number;
  className?: string;
  showSensitiveData?: boolean;
};

export const DetailSection: React.FC<DetailSectionProps> = ({
  title,
  children,
  totalLabel,
  totalValue,
  className = '',
  showSensitiveData = true,
}) => {
  const { tCommon } = useI18n();
  const customTotalLabel = totalLabel || tCommon('general.total');

  const renderHiddenValue = () => {
    return (
      <span className='text-slate-900 font-semibold font-mono tracking-wider'>
        ••••••••
      </span>
    );
  };

  const getDisplayTotal = () => {
    if (!showSensitiveData && totalValue) {
      return renderHiddenValue();
    }
    return formatCurrency(totalValue);
  };

  return (
    <div className={className}>
      <h3 className='font-semibold text-[13px] text-slate-900 mb-2'>{title}</h3>
      <div className='space-y-1.5'>
        {children}

        {totalValue !== undefined && (
          <div className='flex justify-between border-t border-slate-100 pt-2 mt-2 text-[13px]'>
            <span className='text-slate-500 font-medium'>
              {customTotalLabel}
            </span>
            <span className='text-slate-900 font-semibold'>
              {getDisplayTotal()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useVehiclesTableStore, VehiclesDefaultView } from '@/stores/vehiclesTableStore';
import { toast } from '@/hooks/use-toast';
import { LayoutGrid, Table } from 'lucide-react';

export const VehiclesPageConfig = () => {
  const { t } = useTranslation('common');
  const { defaultView, setDefaultView } = useVehiclesTableStore();

  const handleViewChange = (value: string) => {
    setDefaultView(value as VehiclesDefaultView);
    toast({
      title: t('configuration.vehiclesPage.toasts.saved.title'),
      description: t('configuration.vehiclesPage.toasts.saved.description'),
    });
  };

  return (
    <div className='space-y-6'>
      <div className='space-y-1'>
        <h2 className='text-[17px] font-semibold text-slate-900 tracking-tight'>
          {t('configuration.vehiclesPage.title')}
        </h2>
        <p className='text-[13px] text-slate-500'>
          {t('configuration.vehiclesPage.subtitle')}
        </p>
      </div>

      <div className='space-y-4'>
        <div>
          <Label className='text-[14px] font-medium text-slate-700'>
            {t('configuration.vehiclesPage.defaultView.label')}
          </Label>
          <p className='text-[13px] text-slate-500 mt-1'>
            {t('configuration.vehiclesPage.defaultView.description')}
          </p>
        </div>

        <RadioGroup
          value={defaultView}
          onValueChange={handleViewChange}
          className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-2'
        >
          <div className='relative'>
            <RadioGroupItem
              value='table'
              id='table-view'
              className='peer sr-only'
            />
            <Label
              htmlFor='table-view'
              className='flex flex-col items-center justify-between rounded-2xl border-2 border-slate-200/60 bg-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer'
            >
              <Table className='mb-3 h-7 w-7 text-slate-600' />
              <span className='text-[14px] font-semibold text-slate-800'>
                {t('configuration.vehiclesPage.defaultView.options.table')}
              </span>
              <span className='text-[12px] text-slate-500 text-center mt-1'>
                {t('configuration.vehiclesPage.defaultView.options.tableDescription')}
              </span>
            </Label>
          </div>

          <div className='relative'>
            <RadioGroupItem
              value='board'
              id='board-view'
              className='peer sr-only'
            />
            <Label
              htmlFor='board-view'
              className='flex flex-col items-center justify-between rounded-2xl border-2 border-slate-200/60 bg-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer'
            >
              <LayoutGrid className='mb-3 h-7 w-7 text-slate-600' />
              <span className='text-[14px] font-semibold text-slate-800'>
                {t('configuration.vehiclesPage.defaultView.options.board')}
              </span>
              <span className='text-[12px] text-slate-500 text-center mt-1'>
                {t('configuration.vehiclesPage.defaultView.options.boardDescription')}
              </span>
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

export default VehiclesPageConfig;

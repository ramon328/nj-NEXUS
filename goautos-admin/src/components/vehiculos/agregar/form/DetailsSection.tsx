import React, { useEffect } from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { useFormContext } from 'react-hook-form';
import SelectField from '@/components/vehiculos/agregar/form/SelectField';
import TextareaField from '@/components/vehiculos/agregar/form/TextareaField';
import SwitchField from '@/components/ui/inputs/SwitchField';
import DateField from '@/components/ui/inputs/DateField';
import { useDealerships } from '@/hooks/useDealerships';
import AutocompleteSelect from './selects/AutocompleteSelect';
import { useVehicleForm } from './context/VehicleFormContext';
import { useTranslation } from 'react-i18next';
import { VEHICLE_TYPE_HIDDEN_FIELDS } from '@/types/vehicle';

interface DetailsSectionProps {
  categories: any[];
  colors: any[];
  conditions: any[];
  fuelTypes: any[];
  statuses: any[];
}

const DetailsSection: React.FC<DetailsSectionProps> = ({
  categories,
  colors,
  conditions,
  fuelTypes,
  statuses,
}) => {
  const form = useFormContext();
  const { control, watch, setValue } = form;
  const { dealerships } = useDealerships();
  const { t } = useTranslation('common');

  // Get errorFields from the form context
  const { errorFields, clearFieldError, vehicleType } = useVehicleForm();
  const hiddenFields = VEHICLE_TYPE_HIDDEN_FIELDS[vehicleType] || [];
  const isFieldVisible = (fieldName: string) => !hiddenFields.includes(fieldName);

  // Helper function to check if a field has error
  const hasError = (fieldName: string) => errorFields.includes(fieldName);

  // Watch tech inspection date to sync with emissions
  const techInspectionDate = watch('tech_inspection_expiry');

  useEffect(() => {
    if (statuses && statuses.length > 0) {
      const defaultStatus = statuses.find(
        (s) => s.name === 'Revisión Mecánica'
      );
      if (defaultStatus && !form.getValues('status_id')) {
        form.setValue('status_id', defaultStatus.id);
      }
    }
  }, [statuses, form]);

  // Effect to sync emissions date with tech inspection
  useEffect(() => {
    if (techInspectionDate && !form.getValues('emissions_expiry')) {
      setValue('emissions_expiry', techInspectionDate);
    }
  }, [techInspectionDate, setValue, form]);

  return (
    <div className='space-y-4'>
      <h3 className='text-lg font-semibold'>{t('addVehicle.details.title')}</h3>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <SelectField
          name='category_id'
          control={control}
          label={`${t('vehicles.detail.labels.category')} *`}
          options={categories}
          placeholder={t('addVehicle.details.placeholders.selectCategory')}
          onChange={(value) => clearFieldError('category_id')}
          className={
            hasError('category_id')
              ? 'border-red-500 focus-visible:ring-red-500'
              : ''
          }
        />

        <SelectField
          name='status_id'
          control={control}
          label={`${t('vehicles.detail.labels.status')} *`}
          options={statuses}
          placeholder={t('addVehicle.details.placeholders.selectStatus')}
          onChange={(value) => clearFieldError('status_id')}
          className={
            hasError('status_id')
              ? 'border-red-500 focus-visible:ring-red-500'
              : ''
          }
        />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <SelectField
          name='fuel_type_id'
          control={control}
          label={`${t('vehicles.detail.labels.fuelType')} *`}
          options={fuelTypes}
          placeholder={t('addVehicle.details.placeholders.selectFuel')}
          onChange={(value) => clearFieldError('fuel_type_id')}
          className={
            hasError('fuel_type_id')
              ? 'border-red-500 focus-visible:ring-red-500'
              : ''
          }
        />

        <AutocompleteSelect
          name='color_id'
          control={control}
          label={t('vehicles.detail.labels.color')}
          placeholder={t('addVehicle.details.placeholders.selectColor')}
          options={colors}
          allowCreate={true}
          showCreateOption={true}
          isColorSelect={true}
          form={form}
        />

        <SelectField
          name='condition_id'
          control={control}
          label={`${t('vehicles.detail.labels.condition')} *`}
          options={conditions}
          placeholder={t('addVehicle.details.placeholders.selectCondition')}
          onChange={(value) => clearFieldError('condition_id')}
          className={
            hasError('condition_id')
              ? 'border-red-500 focus-visible:ring-red-500'
              : ''
          }
        />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <SelectField
          name='dealership_id'
          control={control}
          label={`${t('addVehicle.details.labels.dealership')} *`}
          options={dealerships.map((d) => ({
            id: d.id,
            name: d.address,
          }))}
          placeholder={t('addVehicle.details.placeholders.selectDealership')}
          onChange={(value) => clearFieldError('dealership_id')}
          className={
            hasError('dealership_id')
              ? 'border-red-500 focus-visible:ring-red-500'
              : ''
          }
        />
      </div>

      <TextareaField
        name='description'
        control={control}
        label={t('vehicles.detail.titles.description')}
        placeholder={t('addVehicle.details.placeholders.description')}
      />

      <FormField
        control={control}
        name='label'
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('addVehicle.details.labels.webLabel')}</FormLabel>
            <FormControl>
              <input
                {...field}
                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                placeholder={t('addVehicle.details.placeholders.webLabel')}
              />
            </FormControl>
            <FormMessage />
            <p className='text-xs text-muted-foreground'>
              {t('addVehicle.details.hints.webLabel')}
            </p>
          </FormItem>
        )}
      />

      <TextareaField
        name='extras'
        control={control}
        label={t('vehicles.detail.titles.extras')}
        placeholder={t('addVehicle.details.placeholders.extras')}
      />
      {/* Boolean fields section */}
      <div className='space-y-4'>
        <div className='pt-6 border-t border-gray-200'>
          <h4 className='text-md font-medium mb-4'>
            {t('vehicles.detail.titles.legalFinancial')}
          </h4>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <SwitchField
              name='has_lien'
              control={control}
              label={t('vehicles.detail.labels.hasLien')}
              description={t('addVehicle.details.hints.hasLien')}
            />

            <SwitchField
              name='is_billable'
              control={control}
              label={t('vehicles.detail.labels.isBillable')}
              description={t('addVehicle.details.hints.isBillable')}
            />
          </div>
        </div>
      </div>

      {/* Expiry dates section - only for cars and trucks */}
      {isFieldVisible('tech_inspection_expiry') && (
      <div className='space-y-4'>
        <div className='pt-6 border-t border-gray-200'>
          <h4 className='text-md font-medium mb-4'>{t('vehicles.detail.titles.expiryDates')}</h4>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <DateField
              name='tech_inspection_expiry'
              control={control}
              label={t('vehicles.detail.labels.techInspection')}
              placeholder={t('addVehicle.details.placeholders.selectDate')}
            />
            <DateField
              name='emissions_expiry'
              control={control}
              label={t('vehicles.detail.labels.emissions')}
              placeholder={t('addVehicle.details.placeholders.selectDate')}
            />
            <DateField
              name='circulation_permit_expiry'
              control={control}
              label={t('vehicles.detail.labels.circulationPermit')}
              placeholder={t('addVehicle.details.placeholders.selectDate')}
            />
            <FormField
              control={control}
              name='permit_municipality'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('vehicles.detail.labels.municipalityPermit')}</FormLabel>
                  <FormControl>
                    <input
                      {...field}
                      value={field.value ?? ''}
                      className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                      placeholder='Ej: Las Condes'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default DetailsSection;

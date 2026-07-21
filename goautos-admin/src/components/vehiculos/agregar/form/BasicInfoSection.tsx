import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import SelectField from './SelectField';
import NumberInputField from './NumberInputField';
import TextInputField from './TextInputField';
import { useVehicleForm } from './context/VehicleFormContext';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { useTranslation } from 'react-i18next';
import {
  VehicleType,
  VEHICLE_TYPE_LABELS,
  VEHICLE_TYPE_ICONS,
  VEHICLE_TYPE_HIDDEN_FIELDS,
  VEHICLE_TYPE_LABEL_OVERRIDES,
} from '@/types/vehicle';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { checkDuplicateVehicle, DuplicateVehicleInfo } from '@/services/vehicleService';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BasicInfoSection = () => {
  const {
    form,
    brandId,
    setBrandId,
    brands,
    models,
    calculateFinalPrice,
    errorFields,
    clearFieldError,
    vehicleType,
  } = useVehicleForm();
  const { t } = useTranslation('common');
  const { clientId } = useAuth();
  const [duplicateVehicle, setDuplicateVehicle] = useState<DuplicateVehicleInfo | null>(null);

  const handleLicensePlateBlur = useCallback(async () => {
    const plate = form.getValues('license_plate');
    if (!plate?.trim() || !clientId) {
      setDuplicateVehicle(null);
      return;
    }
    const duplicate = await checkDuplicateVehicle(plate.trim(), clientId);
    setDuplicateVehicle(duplicate);
  }, [clientId, form]);

  // Helper function to check if a field has error
  const hasError = (fieldName: string) => errorFields.includes(fieldName);

  // Hidden fields for current vehicle type
  const hiddenFields = VEHICLE_TYPE_HIDDEN_FIELDS[vehicleType] || [];
  const labelOverrides = VEHICLE_TYPE_LABEL_OVERRIDES[vehicleType] || {};
  const isFieldVisible = (fieldName: string) => !hiddenFields.includes(fieldName);

  // Get label with possible override
  const getLabel = (fieldName: string, defaultLabel: string) =>
    labelOverrides[fieldName] || defaultLabel;

  return (
    <Card>
      <CardContent className='pt-6'>
        <div className='space-y-4'>
          {/* Vehicle Type Selector */}
          <div className='space-y-2'>
            <FormLabel className='text-sm font-medium'>Tipo de vehículo</FormLabel>
            <div className='grid grid-cols-4 gap-2'>
              {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((type) => (
                <button
                  key={type}
                  type='button'
                  onClick={() => form.setValue('vehicle_type', type)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 text-xs font-medium transition-all',
                    vehicleType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <span className='text-lg'>{VEHICLE_TYPE_ICONS[type]}</span>
                  <span>{VEHICLE_TYPE_LABELS[type]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {isFieldVisible('license_plate') && (
              <div className='space-y-2'>
                <TextInputField
                  control={form.control}
                  name='license_plate'
                  label={`${t('vehicles.detail.labels.licensePlate')} *`}
                  uppercase={true}
                  className={
                    hasError('license_plate')
                      ? 'border-red-500 focus-visible:ring-red-500'
                      : duplicateVehicle
                      ? 'border-amber-400 focus-visible:ring-amber-400'
                      : ''
                  }
                  onFocus={() => clearFieldError('license_plate')}
                  onBlur={handleLicensePlateBlur}
                />
                <AnimatePresence>
                  {duplicateVehicle && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className='rounded-lg border border-amber-300 bg-amber-50 p-3'
                    >
                      <div className='flex items-start gap-2'>
                        <AlertTriangle className='w-4 h-4 text-amber-500 shrink-0 mt-0.5' />
                        <div className='flex-1 min-w-0'>
                          <p className='text-xs font-semibold text-amber-800'>
                            {duplicateVehicle.sold_only
                              ? 'Esta patente figura como vendida'
                              : 'Ya existe en inventario'}
                          </p>
                          <p className='text-[11px] text-amber-700 mt-0.5'>
                            {[duplicateVehicle.brand_name, duplicateVehicle.model_name, duplicateVehicle.year].filter(Boolean).join(' ')}
                            {duplicateVehicle.status_name && (
                              <span className='ml-1 inline-flex items-center px-1 py-px rounded text-[10px] font-medium bg-amber-200/60 text-amber-800'>
                                {duplicateVehicle.status_name}
                              </span>
                            )}
                          </p>
                          {duplicateVehicle.sold_only && (
                            <p className='text-[11px] text-amber-700 mt-0.5'>
                              Puedes crearlo igual: quedará como una unidad
                              nueva (recompra), sin tocar la venta anterior.
                            </p>
                          )}
                          <a
                            href={`/vehiculos/${duplicateVehicle.id}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2'
                          >
                            Ver vehiculo
                            <ExternalLink className='w-2.5 h-2.5' />
                          </a>
                        </div>
                        {duplicateVehicle.main_image && (
                          <img
                            src={duplicateVehicle.main_image}
                            alt=''
                            className='w-12 h-9 rounded object-cover shrink-0 border border-amber-200'
                          />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {isFieldVisible('transmission') && (
            <FormField
              control={form.control}
              name='transmission'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{`${t('vehicles.detail.labels.transmission')} *`}</FormLabel>
                  <FormControl>
                    <select
                      className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                        hasError('transmission')
                          ? 'border-red-500 focus-visible:ring-red-500'
                          : 'border-input focus-visible:ring-ring'
                      }`}
                      {...field}
                      onFocus={() => clearFieldError('transmission')}
                    >
                      <option value=''>{t('addVehicle.basic.placeholders.selectTransmission')}</option>
                      <option value='Manual'>{t('addVehicle.basic.transmissionOptions.manual')}</option>
                      <option value='Automática'>{t('addVehicle.basic.transmissionOptions.automatic')}</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <SelectField
              control={form.control}
              name='brand_id'
              label={`${t('vehicles.detail.labels.brand')} *`}
              placeholder={t('addVehicle.basic.placeholders.selectBrand')}
              options={brands}
              useAutocomplete={true}
              onChange={(value) => {
                setBrandId(value);
                form.setValue('model_id', '');
                calculateFinalPrice();
                clearFieldError('brand_id');
              }}
              form={form}
              className={
                hasError('brand_id')
                  ? 'border-red-500 focus-visible:ring-red-500'
                  : ''
              }
            />

            <SelectField
              control={form.control}
              name='model_id'
              label={`${t('vehicles.detail.labels.model')} *`}
              placeholder={t('addVehicle.basic.placeholders.selectModel')}
              options={models}
              useAutocomplete={true}
              disabled={!brandId}
              allowCreate={true}
              brandId={brandId}
              isModelSelect={true}
              showCreateOption={true}
              form={form}
              onChange={(value) => clearFieldError('model_id')}
              className={
                hasError('model_id')
                  ? 'border-red-500 focus-visible:ring-red-500'
                  : ''
              }
            />
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <NumberInputField
              control={form.control}
              name='year'
              label={`${t('vehicles.detail.labels.year')} *`}
              className={
                hasError('year')
                  ? 'border-red-500 focus-visible:ring-red-500'
                  : ''
              }
              onFocus={() => clearFieldError('year')}
            />

            <NumberInputField
              control={form.control}
              name='mileage'
              label={`${getLabel('mileage', t('vehicles.detail.labels.mileage'))} *`}
              formatWithSeparator={true}
              description={vehicleType === 'car' || vehicleType === 'truck' ? t('addVehicle.basic.examples.mileage') : undefined}
              className={
                hasError('mileage')
                  ? 'border-red-500 focus-visible:ring-red-500'
                  : ''
              }
              onFocus={() => clearFieldError('mileage')}
            />

            {isFieldVisible('owners') && (
            <NumberInputField
              control={form.control}
              name='owners'
              label={t('vehicles.detail.labels.owners')}
              min={1}
            />
            )}

            <TextInputField
              control={form.control}
              name='engine_number'
              label={getLabel('engine_number', t('vehicles.detail.labels.engineNumber'))}
            />

            <TextInputField
              control={form.control}
              name='chassis_number'
              label={getLabel('chassis_number', t('vehicles.detail.labels.chassisNumber'))}
            />

            {isFieldVisible('keys') && (
            <NumberInputField
              control={form.control}
              name='keys'
              label={t('vehicles.detail.labels.keys')}
              min={0}
            />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BasicInfoSection;

import React from 'react';
import { Vehicle, VEHICLE_TYPE_LABELS, VEHICLE_TYPE_HIDDEN_FIELDS, VEHICLE_TYPE_LABEL_OVERRIDES } from '@/types/vehicle';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/contexts/AuthContext';
import { getVehicleRegimen, REGIMEN_LABELS } from '@/utils/vehicleRegimen';

type VehicleDetailsProps = {
  vehicle: Vehicle;
};

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className='flex flex-col gap-0.5'>
    <span className='text-[13px] text-slate-500 font-medium'>{label}</span>
    <span className='text-sm text-slate-900'>{value}</span>
  </div>
);

const VehicleDetails = ({ vehicle }: VehicleDetailsProps) => {
  const { tCommon } = useI18n();
  const { client } = useAuth();
  // Régimen IVA visible para todos (no detrás del permiso financiero).
  const regimen = getVehicleRegimen(
    { is_consigned: vehicle.is_consigned, iva_exento: vehicle.iva_exento },
    !!(client as any)?.ventas_exentas_iva
  );
  const vType = vehicle.vehicle_type || 'car';
  const hiddenFields = VEHICLE_TYPE_HIDDEN_FIELDS[vType] || [];
  const labelOverrides = VEHICLE_TYPE_LABEL_OVERRIDES[vType] || {};
  const isFieldVisible = (f: string) => !hiddenFields.includes(f);
  const getLabel = (f: string, def: string) => labelOverrides[f] || def;
  const unspecified = tCommon('vehicles.detail.unspecified');
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return unspecified;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CL');
    } catch {
      return unspecified;
    }
  };

  const resolveValue = (field: any, nameKey = 'name') => {
    if (field && typeof field === 'object' && nameKey in field) return field[nameKey];
    if (typeof field === 'string') return field;
    return unspecified;
  };

  return (
    <div className='bg-white rounded-xl border border-slate-200/60 p-4 sm:p-6'>
      <div className='flex items-center gap-2 mb-4'>
        <h3 className='font-semibold text-base text-slate-900'>
          {tCommon('vehicles.detail.titles.details')}
        </h3>
        {vType !== 'car' && (
          <span className='inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200'>
            {VEHICLE_TYPE_LABELS[vType]}
          </span>
        )}
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-4'>
        <DetailItem label={tCommon('vehicles.detail.labels.brand')} value={resolveValue(vehicle.brand)} />
        <DetailItem label={tCommon('vehicles.detail.labels.model')} value={resolveValue(vehicle.model)} />
        <DetailItem label={tCommon('vehicles.detail.labels.year')} value={vehicle.year || unspecified} />
        <DetailItem label={tCommon('vehicles.detail.labels.color')} value={resolveValue(vehicle.color)} />
        <DetailItem
          label={getLabel('mileage', tCommon('vehicles.detail.labels.mileage'))}
          value={vehicle.mileage
            ? `${vehicle.mileage.toLocaleString()} ${vType === 'car' || vType === 'truck' ? tCommon('vehicles.detail.kmSuffix') : 'hrs'}`
            : unspecified}
        />
        {isFieldVisible('license_plate') && (
          <DetailItem label={tCommon('vehicles.detail.labels.licensePlate')} value={vehicle.license_plate || unspecified} />
        )}
        {isFieldVisible('keys') && (
          <DetailItem label={tCommon('vehicles.detail.labels.keys')} value={vehicle.keys || unspecified} />
        )}
        <DetailItem label={getLabel('engine_number', tCommon('vehicles.detail.labels.engineNumber'))} value={vehicle.engine_number || unspecified} />
        <DetailItem label={getLabel('chassis_number', tCommon('vehicles.detail.labels.chassisNumber'))} value={vehicle.chassis_number || unspecified} />
        <DetailItem label={tCommon('vehicles.detail.labels.condition')} value={resolveValue(vehicle.condition)} />
        <DetailItem label='Combustible' value={resolveValue(vehicle.fuel_type)} />
        {isFieldVisible('transmission') && (
          <DetailItem label={tCommon('vehicles.detail.labels.transmission')} value={vehicle.transmission || unspecified} />
        )}
        {vehicle.traction && (
          <DetailItem label='Tracción' value={vehicle.traction} />
        )}
        <DetailItem label={tCommon('vehicles.detail.labels.category')} value={resolveValue(vehicle.category)} />
        {isFieldVisible('owners') && (
          <DetailItem label={tCommon('vehicles.detail.labels.owners')} value={vehicle.owners || unspecified} />
        )}
      </div>

      {/* Legal and Financial Information */}
      <div className='mt-6'>
        <h4 className='font-semibold text-base text-slate-900 mb-4'>
          {tCommon('vehicles.detail.titles.legalFinancial')}
        </h4>
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-4'>
          <DetailItem label={tCommon('vehicles.detail.labels.hasLien')} value={vehicle.has_lien ? tCommon('general.yes') : tCommon('general.no')} />
          <DetailItem label={tCommon('vehicles.detail.labels.isBillable')} value={vehicle.is_billable ? tCommon('general.yes') : tCommon('general.no')} />
          <DetailItem label='Régimen IVA' value={REGIMEN_LABELS[regimen]} />
        </div>
      </div>

      {/* Expiry Dates - only for cars and trucks */}
      {isFieldVisible('tech_inspection_expiry') && (
      <div className='mt-6'>
        <h4 className='font-semibold text-base text-slate-900 mb-4'>
          {tCommon('vehicles.detail.titles.expiryDates')}
        </h4>
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-4'>
          <DetailItem label={tCommon('vehicles.detail.labels.techInspection')} value={formatDate(vehicle.tech_inspection_expiry)} />
          <DetailItem label={tCommon('vehicles.detail.labels.emissions')} value={formatDate(vehicle.emissions_expiry)} />
          <DetailItem label={tCommon('vehicles.detail.labels.circulationPermit')} value={formatDate(vehicle.circulation_permit_expiry)} />
          <DetailItem label={tCommon('vehicles.detail.labels.municipalityPermit')} value={vehicle.permit_municipality || '-'} />
        </div>
      </div>
      )}

      {vehicle.extras && (
        <div className='mt-6'>
          <h4 className='font-semibold text-base text-slate-900 mb-2'>
            {tCommon('vehicles.detail.titles.extras')}
          </h4>
          <p
            className='text-slate-600 text-sm bg-slate-50 rounded-lg p-3'
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {vehicle.extras}
          </p>
        </div>
      )}
      {vehicle.description && (
        <div className='mt-6'>
          <h4 className='font-semibold text-base text-slate-900 mb-2'>
            {tCommon('vehicles.detail.titles.description')}
          </h4>
          <p
            className='text-slate-600 text-sm bg-slate-50 rounded-lg p-3'
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {vehicle.description}
          </p>
        </div>
      )}
    </div>
  );
};

export default VehicleDetails;

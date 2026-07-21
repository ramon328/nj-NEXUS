import React from 'react';
import { Vehicle } from '@/types/vehicle';
import { useTranslation } from 'react-i18next';

interface BasicInfoCardProps {
  basicInfo: Partial<Vehicle> & { fuel_type_name?: string };
}

const BasicInfoCard = ({ basicInfo }: BasicInfoCardProps) => {
  const { t } = useTranslation('common');

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return value.toLocaleString();
  };

  const vehicleTitle = [
    basicInfo.brand_name || basicInfo.brand_id,
    basicInfo.model_name || basicInfo.model_id,
    basicInfo.version_name,
    basicInfo.year
  ].filter(Boolean).join(' ') || t('addVehicle.common.notDefined');

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100">
        <h3 className="text-sm font-medium text-slate-700">
          {t('addVehicle.basic.title', { defaultValue: 'Información básica' })}
        </h3>
        <p className="text-xs text-sky-600 font-medium mt-0.5">{vehicleTitle}</p>
      </div>

      {/* Info grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 bg-slate-50 rounded-lg">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Patente</p>
            <p className="text-sm font-semibold text-slate-900 truncate">
              {basicInfo.license_plate || '-'}
            </p>
          </div>

          <div className="p-2 bg-slate-50 rounded-lg">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Año</p>
            <p className="text-sm font-semibold text-slate-900">
              {basicInfo.year || '-'}
            </p>
          </div>

          <div className="p-2 bg-slate-50 rounded-lg">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Kilometraje</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatNumber(basicInfo.mileage)} km
            </p>
          </div>

          <div className="p-2 bg-slate-50 rounded-lg">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Transmisión</p>
            <p className="text-sm font-semibold text-slate-900 truncate">
              {basicInfo.transmission || '-'}
            </p>
          </div>

          {basicInfo.fuel_type_name && (
            <div className="p-2 bg-slate-50 rounded-lg">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Combustible</p>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {basicInfo.fuel_type_name}
              </p>
            </div>
          )}
        </div>

        {basicInfo.description && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Descripción</p>
            <p className="text-xs text-slate-600 line-clamp-2">
              {basicInfo.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BasicInfoCard;

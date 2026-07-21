import { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VehicleCreationData } from '@/types/vehicleCreation';
import BasicInfoCard from './summary/BasicInfoCard';
import MediaCard from './summary/MediaCard';
import AcquisitionCard from './summary/AcquisitionCard';
import DocumentsCard from './summary/DocumentsCard';
import SummaryHeader from './summary/SummaryHeader';
import SummaryActions from './summary/SummaryActions';
import { useTranslation } from 'react-i18next';
import { useStatuses } from '@/hooks/useStatuses';


interface VehicleSummaryProps {
  vehicleData: VehicleCreationData;
  onSave: () => void;
  onPrevious: () => void;
  isLoading: boolean;
  error: string | null;
}

const VehicleSummary = ({
  vehicleData,
  onSave,
  onPrevious,
  isLoading,
  error,
}: VehicleSummaryProps) => {
  const { t, i18n } = useTranslation('common');
  const { statuses } = useStatuses();

  // Get price from sales or basicInfo
  const price = useMemo(() => {
    if (vehicleData?.sales?.price) return vehicleData.sales.price;
    if ((vehicleData?.basicInfo as any)?.price) return (vehicleData.basicInfo as any).price;
    return null;
  }, [vehicleData]);

  // Get minPrice from sales
  const minPrice = useMemo(() => {
    return vehicleData?.sales?.minPrice ?? null;
  }, [vehicleData]);

  // Get discount from sales or basicInfo
  const discountPercentage = useMemo(() => {
    if (vehicleData?.sales?.discountPercentage) return vehicleData.sales.discountPercentage;
    if ((vehicleData?.basicInfo as any)?.discount_percentage) return (vehicleData.basicInfo as any).discount_percentage;
    return null;
  }, [vehicleData]);

  // Get status from sales or basicInfo
  const statusId = useMemo(() => {
    if (vehicleData?.sales?.statusId) return vehicleData.sales.statusId;
    if ((vehicleData?.basicInfo as any)?.status_id) return (vehicleData.basicInfo as any).status_id;
    return null;
  }, [vehicleData]);

  // Find status name
  const statusName = useMemo(() => {
    if (!statusId) return null;
    const status = statuses.find(s => s.id === statusId);
    return status?.name ?? null;
  }, [statusId, statuses]);

  // Calculate final price
  const finalPrice = useMemo(() => {
    if (price == null) return null;
    const discount = discountPercentage ?? 0;
    if (discount <= 0) return price;
    const discountAmount = (price * discount) / 100;
    return Math.round(price - discountAmount);
  }, [price, discountPercentage]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(
      i18n.language?.startsWith('es') ? 'es-CL' : 'en-US'
    ).format(n);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <SummaryHeader />

      {/* Grid principal: 3 columnas en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna 1: Info básica */}
        <BasicInfoCard basicInfo={vehicleData.basicInfo} />

        {/* Columna 2: Multimedia */}
        <MediaCard media={vehicleData.media} />

        {/* Columna 3: Adquisición */}
        <AcquisitionCard acquisition={vehicleData.acquisition} />
      </div>

      {/* Sección de precio y estado - Read Only Display */}
      <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <h3 className="text-sm font-medium text-slate-700">
            {t('addVehicle.summary.priceAndPublish.title', { defaultValue: 'Precio y publicación' })}
          </h3>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Precio de venta */}
            <div className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Precio venta</span>
              <span className="text-sm font-semibold text-slate-900">
                {price != null ? `$ ${fmt(price)}` : '-'}
              </span>
            </div>

            {/* Precio mínimo */}
            <div className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Precio mínimo</span>
              <span className="text-sm font-semibold text-slate-900">
                {minPrice != null ? `$ ${fmt(minPrice)}` : '-'}
              </span>
            </div>

            {/* Descuento */}
            <div className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Descuento</span>
              <span className="text-sm font-semibold text-slate-900">
                {discountPercentage && discountPercentage > 0 ? `${discountPercentage}%` : '-'}
              </span>
            </div>

            {/* Estado */}
            <div className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Estado</span>
              <span className="text-sm font-semibold text-slate-900">
                {statusName ?? '-'}
              </span>
            </div>

            {/* Precio final */}
            <div className={`flex flex-col p-3 rounded-xl border ${
              finalPrice != null
                ? 'bg-slate-100 border-slate-200'
                : 'bg-slate-50 border-slate-100'
            }`}>
              <span className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Precio final</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${finalPrice != null ? 'text-slate-900' : 'text-slate-400'}`}>
                  {finalPrice != null ? `$ ${fmt(finalPrice)}` : '-'}
                </span>
                {discountPercentage && discountPercentage > 0 && (
                  <span className="text-[10px] font-semibold text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded">
                    -{discountPercentage}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Documentos si existen */}
      {vehicleData.documents.length > 0 && (
        <DocumentsCard documents={vehicleData.documents} />
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Acciones */}
      <SummaryActions
        onSave={onSave}
        onPrevious={onPrevious}
        isLoading={isLoading}
      />
    </div>
  );
};

export default VehicleSummary;

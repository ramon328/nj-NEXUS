import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Car, Eye } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

interface VehicleInfo {
  brand: string;
  model: string;
  main_image: string;
  year?: number;
}

interface VehicleInfoCardProps {
  vehicleId: number;
  visits: number;
  rank?: number;
}

const VehicleInfoCard = ({ vehicleId, visits, rank }: VehicleInfoCardProps) => {
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { tCommon } = useI18n();

  useEffect(() => {
    const fetchVehicleData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          main_image,
          year,
          brands:brand_id (name),
          models:model_id (name)
        `)
        .eq('id', vehicleId)
        .single();

      if (error) {
        console.error(`Error fetching vehicle data for ID ${vehicleId}:`, error);
        setVehicleInfo(null);
      } else if (data) {
        setVehicleInfo({
          main_image: data.main_image,
          brand: data.brands?.name || tCommon('vehicles.labels.noBrand'),
          model: data.models?.name || tCommon('vehicles.labels.noModel'),
          year: data.year,
        });
      }
      setLoading(false);
    };

    if (vehicleId) fetchVehicleData();
  }, [vehicleId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 overflow-hidden">
        <div className="h-36 bg-slate-100 animate-pulse" />
        <div className="p-3 space-y-1.5">
          <div className="h-4 w-3/4 bg-slate-100 animate-pulse rounded-lg" />
          <div className="h-3 w-1/2 bg-slate-100 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!vehicleInfo) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 h-[220px] flex items-center justify-center">
        <div className="text-center p-4">
          <Car className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-[11px] text-slate-400">ID #{vehicleId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-2xl border border-slate-200/60 bg-white overflow-hidden hover:border-primary/20 transition-all duration-300 cursor-pointer">
      {/* Image */}
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
        {vehicleInfo.main_image ? (
          <img
            src={vehicleInfo.main_image}
            alt={`${vehicleInfo.brand} ${vehicleInfo.model}`}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Car className="w-12 h-12 text-slate-200" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Rank badge */}
        {rank && rank <= 3 && (
          <div className={`absolute top-2.5 left-2.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm ${
            rank === 1 ? 'bg-amber-400 text-white' :
            rank === 2 ? 'bg-slate-300 text-white' :
            'bg-orange-400 text-white'
          }`}>
            {rank}
          </div>
        )}

        {/* Visits badge */}
        <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm text-slate-900 px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-sm flex items-center gap-1.5">
          <Eye className="w-3 h-3 text-blue-500" />
          {visits.toLocaleString()}
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-6 bg-gradient-to-t from-black/60 to-transparent">
          <h3 className="text-[13px] font-semibold text-white truncate">
            {vehicleInfo.brand} {vehicleInfo.model}
          </h3>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <span className="text-[12px] text-slate-500">
          {vehicleInfo.brand} {vehicleInfo.model}
        </span>
        {vehicleInfo.year && (
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            {vehicleInfo.year}
          </span>
        )}
      </div>
    </div>
  );
};

export default VehicleInfoCard;

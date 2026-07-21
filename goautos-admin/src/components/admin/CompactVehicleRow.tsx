import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Car } from 'lucide-react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';

interface VehicleInfo {
  brand: string;
  model: string;
  main_image: string;
  year?: number;
}

interface CompactVehicleRowProps {
  vehicleId: number;
  visits: number;
  rank: number;
}

const CompactVehicleRow = ({ vehicleId, visits, rank }: CompactVehicleRowProps) => {
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

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
        setVehicleInfo(null);
      } else if (data) {
        setVehicleInfo({
          main_image: data.main_image,
          brand: data.brands?.name || '',
          model: data.models?.name || '',
          year: data.year,
        });
      }
      setLoading(false);
    };

    if (vehicleId) fetchVehicleData();
  }, [vehicleId]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50">
        <div className="h-12 w-16 rounded-lg bg-slate-100 animate-pulse shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-3/4 bg-slate-100 animate-pulse rounded-lg" />
          <div className="h-3 w-16 bg-slate-100 animate-pulse rounded-lg" />
        </div>
        <div className="h-6 w-16 bg-slate-100 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!vehicleInfo) return null;

  return (
    <div
      onClick={() => navigate(`/vehiculos/${vehicleId}`)}
      className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
    >
      {/* Thumbnail */}
      <div className="h-12 w-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
        {vehicleInfo.main_image ? (
          <img
            src={vehicleInfo.main_image}
            alt={`${vehicleInfo.brand} ${vehicleInfo.model}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Car className="w-5 h-5 text-slate-300" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-slate-800 truncate">
          {vehicleInfo.brand} {vehicleInfo.model}{vehicleInfo.year ? ` (${vehicleInfo.year})` : ''}
        </p>
        <span className="text-xs text-slate-400 font-medium inline-flex items-center gap-0.5">
          {dv('Ver detalle', 'View detail')} <span className="text-[10px]">→</span>
        </span>
      </div>

      {/* Visits badge */}
      <div className="shrink-0 bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap tabular-nums">
        {visits.toLocaleString()} {dv('visitas', 'visits')}
      </div>
    </div>
  );
};

export default CompactVehicleRow;

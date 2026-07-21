import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Globe, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { OldestVehicle } from '@/hooks/admin/useInventoryKpis';
import { Skeleton } from '@/components/ui/skeleton';

interface CriticalVehiclesCardProps {
  mode?: 'creation' | 'publication';
  preloadedVehicles?: OldestVehicle[];
  preloadedLoading?: boolean;
}

const CriticalVehiclesCard = ({
  mode = 'creation',
  preloadedVehicles,
  preloadedLoading,
}: CriticalVehiclesCardProps) => {
  const { t, i18n } = useTranslation('dashboard');
  const dv = (es: string, en: string) => (i18n.language?.toLowerCase().startsWith('es') ? es : en);
  const { clientId } = useAuth();
  const [, navigate] = useLocation();
  const [fetchedVehicles, setFetchedVehicles] = useState<any[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  const usePreloaded = preloadedVehicles !== undefined;
  const loading = usePreloaded ? (preloadedLoading ?? false) : fetchLoading;

  const vehicles = usePreloaded
    ? preloadedVehicles.filter(v => {
        const days = mode === 'publication' ? v.daysPublished : v.daysInStock;
        return days !== null && days >= 90;
      })
    : fetchedVehicles;

  useEffect(() => {
    if (usePreloaded || mode === 'publication') {
      setFetchLoading(false);
      return;
    }

    if (!clientId) return;

    const fetchCriticalVehicles = async () => {
      setFetchLoading(true);

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const id = typeof clientId === 'string' ? parseInt(clientId) : clientId;

      const { data: statesData } = await supabase
        .from('clients_vehicles_states')
        .select('id, name')
        .eq('client_id', id);

      const excludedStateIds = statesData
        ?.filter((s) => {
          const name = s.name.toLowerCase();
          return name.includes('vendido') || name.includes('sold') || name.includes('reservado') || name.includes('archivado');
        })
        .map((s) => s.id) || [];

      const { data: soldVehicles } = await supabase
        .from('vehicles_sales')
        .select('vehicle_id, vehicles!vehicle_id(id, client_id)')
        .eq('vehicles.client_id', id)
        .eq('status', 'approved');

      const soldVehicleIds = new Set((soldVehicles || []).map(s => s.vehicle_id));

      let query = supabase
        .from('vehicles')
        .select(`
          id,
          created_at,
          main_image,
          year,
          brands:brand_id (name),
          models:model_id (name)
        `)
        .eq('client_id', id)
        .lte('created_at', ninetyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (excludedStateIds.length > 0) {
        query = query.not('status_id', 'in', `(${excludedStateIds.join(',')})`);
      }

      const { data } = await query;

      const filtered = (data || [])
        .filter(v => !soldVehicleIds.has(v.id));

      setFetchedVehicles(filtered);
      setFetchLoading(false);
    };

    fetchCriticalVehicles();
  }, [clientId, usePreloaded, mode]);

  const isPublicationMode = mode === 'publication';
  const Icon = isPublicationMode ? Globe : AlertTriangle;

  type DaysFilter = 'all' | '90' | '180';
  const [daysFilter, setDaysFilter] = useState<DaysFilter>('all');

  const titleText = dv('Vehículos críticos', 'Critical Vehicles');
  const subtitle = dv('Stock sin vender', 'Unsold stock');

  const allVehicles = vehicles;

  const getDays = (vehicle: any) => {
    if (isPublicationMode && 'daysPublished' in vehicle) return vehicle.daysPublished ?? 0;
    if ('daysInStock' in vehicle) return vehicle.daysInStock;
    return Math.floor((Date.now() - new Date(vehicle.created_at).getTime()) / (1000 * 60 * 60 * 24));
  };

  const displayVehicles = useMemo(() => {
    let filtered = allVehicles;
    if (daysFilter === '90') filtered = allVehicles.filter(v => getDays(v) >= 90);
    else if (daysFilter === '180') filtered = allVehicles.filter(v => getDays(v) >= 180);
    return [...filtered].sort((a, b) => getDays(b) - getDays(a));
  }, [allVehicles, daysFilter]);

  const count90 = useMemo(() => allVehicles.filter(v => getDays(v) >= 90).length, [allVehicles]);
  const count180 = useMemo(() => allVehicles.filter(v => getDays(v) >= 180).length, [allVehicles]);

  const tabs: { key: DaysFilter; label: string; count: number }[] = [
    { key: 'all', label: dv('Todos', 'All'), count: allVehicles.length },
    { key: '90', label: '+90 días', count: count90 },
    { key: '180', label: '+180 días', count: count180 },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white h-full flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-semibold text-[#171717] flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-slate-500" />
            {titleText}
            {!loading && displayVehicles.length > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
                {displayVehicles.length}
              </span>
            )}
          </h3>
        </div>
{/*        <p className="text-xs text-slate-400 mt-1">{subtitle}</p> */}

        {/* Filter tabs */}
        {!loading && (
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 mt-3">
            {tabs.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setDaysFilter(key)}
                className={cn(
                  'flex-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all',
                  daysFilter === key
                    ? 'bg-white text-slate-900 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.08)]'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 px-5 pb-5 pt-3">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50">
                  <Skeleton className="h-12 w-16 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-lg" />
                </div>
              ))}
            </div>
          ) : displayVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{dv('Sin vehículos críticos', 'No critical vehicles')}</p>
                <p className="text-xs text-muted-foreground mt-1">{dv('Todos los vehículos tienen menos de 90 días', 'All vehicles are under 90 days')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {displayVehicles.map((vehicle) => {
                const brand = vehicle.brands?.name || 'Sin marca';
                const model = vehicle.models?.name || 'Sin modelo';
                const days = getDays(vehicle);

                return (
                  <div
                    key={vehicle.id}
                    onClick={() => navigate(`/vehiculos/${vehicle.id}`)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    {/* Thumbnail */}
                    <div className="h-12 w-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                      {vehicle.main_image ? (
                        <img
                          src={vehicle.main_image}
                          alt={`${brand} ${model}`}
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
                        {brand} {model} {vehicle.year ? `(${vehicle.year})` : ''}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/vehiculos/${vehicle.id}`);
                        }}
                        className="text-xs text-slate-400 font-medium hover:text-slate-600 transition-colors inline-flex items-center gap-0.5"
                      >
                        {dv('Editar precio', 'Edit price')} <span className="text-[10px]">→</span>
                      </button>
                    </div>

                    {/* Days badge */}
                    <div className="shrink-0 bg-red-50 text-red-600 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap">
                      {days} {dv('días', 'days')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default CriticalVehiclesCard;

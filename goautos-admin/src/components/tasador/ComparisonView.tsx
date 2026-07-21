import { ArrowLeftRight, Car, CheckCircle2, Info } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { AppraisalResponse, TasadorSource } from '@/types/tasador';
import {
  groupByVehicle,
  groupBySource,
  formatPrice,
} from './utils';
import ConfidenceIndicator from './ConfidenceIndicator';
import SearchStatsBar from './SearchStatsBar';
import ListingCard from './ListingCard';
import SourceCard from './SourceCard';

interface ComparisonViewProps {
  data: AppraisalResponse;
}

const CARD_COLORS = [
  {
    bg: 'bg-gradient-to-br from-blue-50 to-indigo-50/50',
    accent: 'text-blue-600',
    border: 'border-blue-100',
    badge: 'bg-blue-100 text-blue-700',
    bar: 'from-blue-500 to-blue-400',
  },
  {
    bg: 'bg-gradient-to-br from-amber-50 to-orange-50/50',
    accent: 'text-amber-600',
    border: 'border-amber-100',
    badge: 'bg-amber-100 text-amber-700',
    bar: 'from-amber-500 to-amber-400',
  },
  {
    bg: 'bg-gradient-to-br from-emerald-50 to-teal-50/50',
    accent: 'text-emerald-600',
    border: 'border-emerald-100',
    badge: 'bg-emerald-100 text-emerald-700',
    bar: 'from-emerald-500 to-emerald-400',
  },
];

interface VehicleBucket {
  label: string;
  listings: TasadorSource[];
  prices: number[];
  min: number;
  max: number;
  avg: number;
}

const ComparisonView = ({ data }: ComparisonViewProps) => {
  const {
    sources,
    vehicle_details,
    confidence,
    search_stats,
  } = data;

  const comparisonVehicles = vehicle_details.comparisonVehicles || [];
  const vehicleMap = groupByVehicle(sources, comparisonVehicles);
  const sourceGroups = groupBySource(sources);

  // Build buckets
  const buckets: VehicleBucket[] = comparisonVehicles.map((v) => {
    const key = `${v.brand} ${v.model}`.toLowerCase();
    const listings = vehicleMap.get(key) || [];
    const prices = listings.map((l) => l.price).filter((p) => p > 0);
    const min = prices.length > 0 ? Math.min(...prices) : 0;
    const max = prices.length > 0 ? Math.max(...prices) : 0;
    const avg =
      prices.length > 0
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : 0;
    return {
      label: `${v.brand} ${v.model}${v.year ? ` ${v.year}` : ''}`,
      listings,
      prices,
      min,
      max,
      avg,
    };
  });

  // Comparison calculation
  const bucketsWithPrices = buckets.filter((b) => b.avg > 0);
  const cheapest =
    bucketsWithPrices.length >= 2
      ? bucketsWithPrices.reduce((a, b) => (a.avg < b.avg ? a : b))
      : null;
  const maxAvg = Math.max(...bucketsWithPrices.map((b) => b.avg), 1);
  const minAvg = Math.min(...bucketsWithPrices.map((b) => b.avg), 0);
  const priceDiff =
    bucketsWithPrices.length >= 2
      ? Math.max(...bucketsWithPrices.map((b) => b.avg)) - Math.min(...bucketsWithPrices.map((b) => b.avg))
      : 0;
  const percentDiff =
    bucketsWithPrices.length >= 2
      ? Math.round((priceDiff / maxAvg) * 100)
      : 0;

  // Global max price for bar widths
  const globalMaxPrice = Math.max(...buckets.map((b) => b.max), 1);
  const minDisplayPrice = Math.min(...buckets.filter(b => b.min > 0).map((b) => b.min), 0) * 0.9;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 via-cyan-500/5 to-primary/5 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-cyan-400 shadow-lg shadow-primary/20 flex items-center justify-center">
            <ArrowLeftRight className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">
              Comparación de vehículos
            </h2>
            <p className="text-sm text-gray-500">
              Análisis comparativo de precios de mercado en Chile
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          <SearchStatsBar stats={search_stats} />
          <ConfidenceIndicator confidence={confidence} />
        </div>
      </div>

      {/* Vehicle cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {buckets.map((bucket, idx) => {
          const colors = CARD_COLORS[idx % CARD_COLORS.length];
          const isCheapest = cheapest && bucket.label === cheapest.label;

          return (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-2xl ${colors.bg} border ${colors.border}`}
            >
              {isCheapest && bucketsWithPrices.length >= 2 && (
                <div className="absolute -top-0 right-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-b-lg shadow-sm z-10">
                  Más económico
                </div>
              )}

              <div className="p-5 pb-4">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">
                      {bucket.label}
                    </h3>
                    {bucket.listings.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {bucket.listings.length} publicaciones encontradas
                      </p>
                    )}
                  </div>
                  <div
                    className={`w-10 h-10 rounded-xl ${colors.badge} flex items-center justify-center`}
                  >
                    <Car className="h-5 w-5" />
                  </div>
                </div>

                {bucket.prices.length > 0 ? (
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Rango de precios
                      </p>
                      <span className="text-xs text-gray-400">
                        {bucket.prices.length} publicaciones
                      </span>
                    </div>
                    {bucket.min === bucket.max ? (
                      <span className={`text-2xl font-bold ${colors.accent}`}>
                        {formatPrice(bucket.min)}
                      </span>
                    ) : (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span
                          className={`text-2xl font-bold ${colors.accent}`}
                        >
                          {formatPrice(bucket.min)}
                        </span>
                        <span className="text-gray-300">—</span>
                        <span
                          className={`text-2xl font-bold ${colors.accent}`}
                        >
                          {formatPrice(bucket.max)}
                        </span>
                      </div>
                    )}
                    {bucket.prices.length > 1 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Promedio:{' '}
                        <span className="font-semibold">
                          {formatPrice(bucket.avg)}
                        </span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white">
                    <div className="flex items-center gap-3 text-gray-400">
                      <Info className="h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Sin datos disponibles
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          No se encontraron publicaciones verificables
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Top 3 listings */}
              {bucket.listings.length > 0 && (
                <div className="px-5 pb-5 space-y-2">
                  {bucket.listings.slice(0, 3).map((listing, lidx) => (
                    <ListingCard key={lidx} listing={listing} showSource />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Price bar comparison */}
      {bucketsWithPrices.length >= 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  ¿Cuál es más conveniente?
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Comparación de precios de mercado
                </p>
              </div>
              {percentDiff > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">
                    {percentDiff}% diferencia
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* Bar chart */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-500 mb-3 text-center">
                Comparación visual de precios promedio
              </p>
              <div className="space-y-3">
                {buckets
                  .filter((b) => b.avg > 0)
                  .map((bucket, idx) => {
                    const colors = CARD_COLORS[idx % CARD_COLORS.length];
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-24 text-right">
                          <span className="text-sm font-medium text-gray-700">
                            {bucket.label.split(' ').slice(0, 2).join(' ')}
                          </span>
                        </div>
                        <div className="flex-1 h-10 bg-gray-200 rounded-lg overflow-hidden relative">
                          <div
                            className={`absolute h-full bg-gradient-to-r ${colors.bar} rounded-lg transition-all duration-500`}
                            style={{
                              width: `${Math.max(((bucket.avg - minDisplayPrice) / (globalMaxPrice - minDisplayPrice)) * 100, 20)}%`,
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-end pr-3">
                            <span className="text-sm font-bold text-white drop-shadow-sm">
                              {formatPrice(bucket.avg)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Conclusion badge */}
            {cheapest && priceDiff > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-1">
                      Conclusión del análisis
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-green-700">
                        {cheapest.label}
                      </span>{' '}
                      es aproximadamente{' '}
                      <span className="font-semibold text-green-700">
                        {formatPrice(priceDiff)}
                      </span>{' '}
                      más económico en promedio, lo que representa un{' '}
                      <span className="font-semibold text-green-700">
                        {percentDiff}%
                      </span>{' '}
                      de diferencia.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Partial comparison warning */}
      {bucketsWithPrices.length === 1 && buckets.length >= 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-white px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Info className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Comparación parcial
                </h3>
                <p className="text-sm text-gray-500">
                  Solo se encontraron datos para uno de los vehículos
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  No es posible realizar una comparación completa de precios. Te
                  recomendamos buscar el vehículo sin datos con términos más
                  específicos (año, versión, etc.).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs: by vehicle / by source */}
      {sources.length > 0 && (
        <Tabs defaultValue="by-vehicle">
          <TabsList className="w-full">
            <TabsTrigger value="by-vehicle" className="flex-1">
              Por vehículo
            </TabsTrigger>
            <TabsTrigger value="by-source" className="flex-1">
              Por fuente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="by-vehicle" className="space-y-4 mt-4">
            {buckets.map((bucket, idx) => {
              if (bucket.listings.length === 0) return null;
              const colors = CARD_COLORS[idx % CARD_COLORS.length];
              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm`}
                >
                  <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.badge}`}
                    >
                      <Car className={`h-4 w-4`} />
                    </div>
                    <span className="font-medium text-gray-900">
                      {bucket.label}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">
                      {bucket.listings.length} publicaciones
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    {bucket.listings.map((listing, lidx) => (
                      <ListingCard
                        key={lidx}
                        listing={listing}
                        showSource
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="by-source" className="space-y-4 mt-4">
            {sourceGroups.map((group) => (
              <SourceCard key={group.name} group={group} />
            ))}
          </TabsContent>
        </Tabs>
      )}

    </div>
  );
};

export default ComparisonView;

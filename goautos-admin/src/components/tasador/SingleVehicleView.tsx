import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ClipboardList } from 'lucide-react';
import type { AppraisalResponse } from '@/types/tasador';
import { groupBySource } from './utils';
import ConfidenceIndicator from './ConfidenceIndicator';
import SearchStatsBar from './SearchStatsBar';
import PriceHeroCard from './PriceHeroCard';
import PriceStatsCard from './PriceStatsCard';
import SuggestedPriceCard from './SuggestedPriceCard';
import InventoryMatchCard from './InventoryMatchCard';
import SourceCard from './SourceCard';
import ListingCard from './ListingCard';

interface SingleVehicleViewProps {
  data: AppraisalResponse;
}

const SingleVehicleView = ({ data }: SingleVehicleViewProps) => {
  const {
    sources,
    price_analysis,
    estimated_range,
    confidence,
    search_stats,
    resolved_from_plate,
  } = data;

  const sourceGroups = groupBySource(sources);

  // Sort all listings by price for the "all" tab
  const allListings = [...sources].sort((a, b) => a.price - b.price);

  const plateLabel = resolved_from_plate
    ? [resolved_from_plate.brand, resolved_from_plate.model, resolved_from_plate.year]
        .filter(Boolean)
        .join(' ')
    : '';

  return (
    <div className="space-y-5">
      {/* Aviso de patente — solo cuando la tasación vino de una patente resuelta por GetAPI */}
      {resolved_from_plate && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-blue-900">
              Tasación basada en la patente{' '}
              <span className="font-semibold">{resolved_from_plate.plate}</span>
            </p>
            {plateLabel && (
              <p className="text-xs text-blue-700 mt-0.5">
                Vehículo identificado: {plateLabel}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top bar: confidence + stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SearchStatsBar stats={search_stats} />
        <ConfidenceIndicator confidence={confidence} />
      </div>

      {/* Hero price range */}
      {estimated_range && (
        <PriceHeroCard
          low={estimated_range.low}
          high={estimated_range.high}
          sampleSize={price_analysis?.sampleSize}
        />
      )}

      {/* Suggested prices */}
      <SuggestedPriceCard priceAnalysis={price_analysis} estimatedRange={estimated_range} />

      {/* Price stats */}
      <PriceStatsCard priceAnalysis={price_analysis} />

      {/* Inventory matches */}
      {data.vehicle_details && (
        <InventoryMatchCard vehicleDetails={data.vehicle_details} />
      )}

      {/* Tabs: by source / all */}
      {sources.length > 0 && (
        <Tabs defaultValue="by-source">
          <TabsList className="w-full">
            <TabsTrigger value="by-source" className="flex-1">
              Por fuente
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1">
              Todas las publicaciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="by-source" className="space-y-4 mt-4">
            {sourceGroups.map((group) => (
              <SourceCard key={group.name} group={group} />
            ))}
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-500 font-medium">
                  {allListings.length} publicaciones ordenadas por precio
                </span>
              </div>
              <div className="p-4 space-y-2">
                {allListings.map((listing, idx) => (
                  <ListingCard key={idx} listing={listing} showSource />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

    </div>
  );
};

export default SingleVehicleView;

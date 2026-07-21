import React, { useState } from 'react';
import TimeRangeSelector, { TimeRange } from './TimeRangeSelector';
import { useUsabilityStats } from '@/hooks/useUsabilityStats';
import BuilderWebAdoptionChart from './BuilderWebAdoptionChart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSuperadminStats } from '@/hooks/useSuperadminStats';
import TasadorStats from './TasadorStats';
import InstagramStats from './InstagramStats';
import BuyLeadsStatsChart from './BuyLeadsStatsChart';
import UsabilityKpiTrendsChart from './UsabilityKpiTrendsChart';

const UsabilityDashboard = () => {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');

  // Obtener la lista de automotoras
  const { clients } = useSuperadminStats(selectedClientId, timeRange);

  const {
    builderPieData,
    builderActiveNames,
    builderInactiveNames,
    tasadorDealers,
    tasadorDealersFrequency,
    loading,
    allBuyConsignmentStats,
    buyDirectStats,
    financingStats,
    usabilityKpiTrendsData,
  } = useUsabilityStats(timeRange, selectedClientId);

  const emptyConsignMsg =
    timeRange === '7days'
      ? 'No hay consignaciones en los últimos 7 días.'
      : timeRange === '30days'
      ? 'No hay consignaciones en los últimos 30 días.'
      : 'No hay consignaciones registradas en este periodo.';

  // Manejar el cambio de automotora seleccionada
  const handleClientChange = (value: string) => {
    setSelectedClientId(value === 'all' ? null : parseInt(value));
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Filters */}
      <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
        <TimeRangeSelector
          selectedRange={timeRange}
          onRangeChange={setTimeRange}
        />
        <Select onValueChange={handleClientChange} defaultValue="all">
          <SelectTrigger className="w-full xs:w-[200px] sm:w-[220px] bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100 transition-colors text-xs sm:text-sm">
            <SelectValue placeholder="Seleccionar automotora" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las automotoras</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id.toString()}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Builder Web & Tasador Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        <BuilderWebAdoptionChart
          loading={loading}
          data={builderPieData}
          activeNames={builderActiveNames}
          inactiveNames={builderInactiveNames}
        />
        <TasadorStats
          tasadorDealers={tasadorDealers}
          tasadorDealersFrequency={tasadorDealersFrequency}
          totalTasaciones={tasadorDealersFrequency.reduce(
            (acc, d) => acc + d.count,
            0
          )}
          loading={loading}
          chartHeight={220}
          timeRange={timeRange}
        />
      </div>

      {/* Buy Leads Stats - Full Width */}
      <BuyLeadsStatsChart
        consignacionData={allBuyConsignmentStats}
        directaData={buyDirectStats}
        financiamientoData={financingStats}
        loading={loading}
        emptyMessages={{
          consignacion: emptyConsignMsg,
          directa: 'No hay leads de compra directa en este periodo.',
          financiamiento: 'No hay leads de financiamiento en este periodo.',
        }}
      />

      {/* Instagram Stats */}
      <InstagramStats />

      {/* KPI Trends Chart */}
      <UsabilityKpiTrendsChart
        usabilityKpiTrendsData={usabilityKpiTrendsData}
      />
    </div>
  );
};

export default UsabilityDashboard;

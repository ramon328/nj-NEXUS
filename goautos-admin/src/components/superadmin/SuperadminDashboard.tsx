import React, { useState } from 'react';
import { useSuperadminStats } from '@/hooks/useSuperadminStats';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import TimeRangeSelector, { TimeRange } from './TimeRangeSelector';
import TopViewedVehicles from './TopViewedVehicles';
import TopViewedDealers from './TopViewedDealers';
import TopSoldVehicles from './TopSoldVehicles';
import AveragePriceAnalysis from './AveragePriceAnalysis';
import SalesEfficiencyAnalysis from './SalesEfficiencyAnalysis';
import UsabilityDashboard from './UsabilityDashboard';
import BarChartVehiclesTabs from './BarChartVehicles';
import ReconciliationDashboard from './ReconciliationDashboard';
import { cn } from '@/lib/utils';

// Secondary KPI — compact
const StatCard = ({
  label,
  value,
  subtitle,
  loading,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  loading: boolean;
}) => (
  <div className="flex flex-col gap-0.5">
    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{label}</p>
    {loading ? (
      <div className="h-5 w-12 animate-pulse rounded bg-slate-100" />
    ) : (
      <p className="text-lg font-semibold text-slate-700 tracking-tight leading-tight">{value}</p>
    )}
    {subtitle && <p className="text-[10px] text-slate-400">{subtitle}</p>}
  </div>
);

const SuperadminDashboard = () => {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');
  const {
    stats,
    loading,
    clients,
    monthlyData,
    weeklyData,
    dailyData,
    topViewedDealers,
    topSoldVehicles,
    topSoldCategories,
    topSellingDealers,
    priceAnalysis,
    salesEfficiency,
    topViewedBrands,
    topViewedCategories,
    vehiclesByDealerData,
    vehiclesByDateData,
  } = useSuperadminStats(selectedClientId, timeRange);

  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'usabilidad' | 'conciliacion'>('dashboard');

  const handleClientChange = (value: string) => {
    setSelectedClientId(value === 'all' ? null : parseInt(value));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-semibold text-slate-800">Admin Metrics</h1>
              <div className="flex items-center gap-1 p-0.5 rounded-full bg-slate-100">
                <button
                  onClick={() => setSelectedTab('dashboard')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[13px] font-medium transition-all whitespace-nowrap',
                    selectedTab === 'dashboard'
                      ? 'bg-slate-800 text-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)]'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  )}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setSelectedTab('usabilidad')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[13px] font-medium transition-all whitespace-nowrap',
                    selectedTab === 'usabilidad'
                      ? 'bg-slate-800 text-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)]'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  )}
                >
                  Usabilidad
                </button>
                <button
                  onClick={() => setSelectedTab('conciliacion')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[13px] font-medium transition-all whitespace-nowrap',
                    selectedTab === 'conciliacion'
                      ? 'bg-slate-800 text-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)]'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  )}
                >
                  Conciliación
                </button>
              </div>
            </div>

            {selectedTab === 'dashboard' && (
              <div className="flex items-center gap-2">
                <TimeRangeSelector
                  selectedRange={timeRange}
                  onRangeChange={setTimeRange}
                />
                <Select onValueChange={handleClientChange} defaultValue="all">
                  <SelectTrigger className="w-[160px] h-9 rounded-xl border-slate-200/60 text-[13px] shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]">
                    <SelectValue placeholder="Automotora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {selectedTab === 'dashboard' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Hero KPI — Automotoras */}
            <div className="rounded-xl border border-slate-200/60 bg-white p-5">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                {/* Primary metric */}
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Automotoras Activas</p>
                  {loading ? (
                    <div className="mt-2 h-10 w-20 animate-pulse rounded bg-slate-100" />
                  ) : (
                    <p className="text-4xl font-bold text-slate-900 mt-1 tracking-tight">{stats.activeDealers}</p>
                  )}
                  {!loading && (
                    <div className="flex gap-3 mt-1 text-[11px]">
                      <span className="text-slate-500">{stats.totalPayingDealers} pagando</span>
                      <span className="text-slate-200">·</span>
                      <span className="text-slate-400">{stats.totalDealers} total</span>
                      <span className="text-slate-200">·</span>
                      <span className="text-slate-300">{stats.ghostDealers} ghost</span>
                    </div>
                  )}
                </div>

                {/* Secondary metrics — inline row */}
                <div className="flex items-start gap-6 sm:gap-8">
                  <StatCard label="Ingresados" value={stats.vehiclesInPeriod.toLocaleString()} loading={loading} />
                  <StatCard label="Publicados" value={stats.publishedVehicles.toLocaleString()} loading={loading} />
                  <StatCard label="Vendidos" value={stats.soldVehicles.toLocaleString()} loading={loading} />
                  <StatCard label="Visitas" value={stats.totalVisits.toLocaleString()} loading={loading} />
                  <StatCard label="Ventas" value={loading ? '...' : formatCurrency(stats.totalSales)} loading={false} />
                </div>
              </div>
            </div>

            {/* Charts — Vehicles */}
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              <TopSoldVehicles
                modelsData={topSoldVehicles}
                typesData={topSoldCategories}
                loading={loading}
              />
              <TopViewedVehicles
                brandsData={topViewedBrands}
                categoriesData={topViewedCategories}
                loading={loading}
              />
            </div>

            {/* Charts — Dealers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <TopViewedDealers
                viewData={topViewedDealers}
                sellData={topSellingDealers}
                loading={loading}
              />
              <SalesEfficiencyAnalysis
                data={salesEfficiency}
                loading={loading}
              />
              <div className="lg:col-span-2">
                <BarChartVehiclesTabs
                  loading={loading}
                  monthlyData={monthlyData}
                  weeklyData={weeklyData}
                  dailyData={dailyData}
                  timeRange={timeRange}
                  vehiclesByDateData={vehiclesByDateData}
                  vehiclesByDealerData={vehiclesByDealerData}
                />
              </div>
            </div>

            {/* Price Analysis */}
            {priceAnalysis && (
              <AveragePriceAnalysis data={priceAnalysis} loading={loading} />
            )}
          </div>
        )}

        {selectedTab === 'usabilidad' && <UsabilityDashboard />}

        {selectedTab === 'conciliacion' && <ReconciliationDashboard />}
      </div>
    </div>
  );
};

export default SuperadminDashboard;

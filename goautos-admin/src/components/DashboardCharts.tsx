
import React from 'react';
import { useAdminDashboard } from '@/hooks/dashboard';
import VisitsChart from './dashboard/VisitsChart';
import SalesChart from './dashboard/SalesChart';
import VehicleTypeChart from './dashboard/VehicleTypeChart';
import StatusChart from './dashboard/StatusChart';
import { formatCurrency } from './dashboard/formatters';

const DashboardCharts = () => {
  const { loading, monthlyData, vehicleTypes, stats } = useAdminDashboard();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      <VisitsChart loading={loading} monthlyData={monthlyData} />
      <SalesChart loading={loading} monthlyData={monthlyData} formatCurrency={formatCurrency} />
      <VehicleTypeChart loading={loading} vehicleTypes={vehicleTypes} />
      <StatusChart loading={loading} statusData={stats.byStatusCount} />
    </div>
  );
};

export default DashboardCharts;

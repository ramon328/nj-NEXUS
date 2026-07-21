
import React from 'react';
import { MonthlySellerData } from '@/hooks/useSellerDashboard';
import SellerSalesChart from './charts/SellerSalesChart';
import SellerCommissionsChart from './charts/SellerCommissionsChart';
import SellerStatusChart from './charts/SellerStatusChart';
import { SellerDashboardStats } from '@/hooks/useSellerDashboard';

interface SellerChartsProps {
  loading: boolean;
  monthlyData: MonthlySellerData[];
  stats: SellerDashboardStats;
}

const SellerCharts = ({ loading, monthlyData, stats }: SellerChartsProps) => {
  return (
    <div className="space-y-6">
      <SellerSalesChart loading={loading} monthlyData={monthlyData} />
      <SellerCommissionsChart loading={loading} monthlyData={monthlyData} />
      <SellerStatusChart 
        loading={loading} 
        approvedSales={stats.approvedSales}
        pendingSales={stats.pendingApprovalSales}
        rejectedSales={stats.rejectedSales}
      />
    </div>
  );
};

export default SellerCharts;

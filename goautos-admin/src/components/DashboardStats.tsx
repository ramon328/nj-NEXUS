
import React from 'react';
import { 
  DollarSign, 
  Car, 
  ShoppingBag, 
  Clock 
} from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import SkeletonCard from '@/components/dashboard/SkeletonCard';
import { formatCurrency } from '@/components/dashboard/formatters';
import { useDashboard } from '@/hooks/useDashboard';

const DashboardStats = () => {
  const { stats, loading } = useDashboard();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Ventas"
        value={formatCurrency(stats.totalSales)}
        icon={<DollarSign className="h-5 w-5 text-white" />}
      />
      <StatCard
        title="Vehículos Vendidos"
        value={stats.totalVehiclesSold.toString()}
        icon={<Car className="h-5 w-5 text-white" />}
      />
      <StatCard
        title="Ingresos Totales"
        value={formatCurrency(stats.totalRevenue)}
        icon={<ShoppingBag className="h-5 w-5 text-white" />}
      />
      <StatCard
        title="Ganancias del Mes"
        value={formatCurrency(stats.monthlyRevenue)}
        icon={<Clock className="h-5 w-5 text-white" />}
      />
    </div>
  );
};

export default DashboardStats;

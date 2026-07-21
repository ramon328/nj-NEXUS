
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
import { SellerDashboardStats } from '@/hooks/useSellerDashboard';

interface SellerStatsProps {
  stats: SellerDashboardStats;
  loading: boolean;
}

const SellerStats: React.FC<SellerStatsProps> = ({ stats, loading }) => {
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
        title="Comisiones Ganadas"
        value={formatCurrency(stats.totalCommissionEarned)}
        icon={<DollarSign className="h-5 w-5 text-white" />}
      />
      <StatCard
        title="Vehículos Asignados"
        value={stats.assignedVehicles.toString()}
        icon={<Car className="h-5 w-5 text-white" />}
      />
      <StatCard
        title="Ventas Totales"
        value={stats.totalSales.toString()}
        icon={<ShoppingBag className="h-5 w-5 text-white" />}
      />
      <StatCard
        title="Ventas Pendientes"
        value={stats.pendingApprovalSales.toString()}
        icon={<Clock className="h-5 w-5 text-white" />}
      />
    </div>
  );
};

export default SellerStats;

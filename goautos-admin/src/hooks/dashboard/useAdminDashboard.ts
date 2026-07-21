
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { DashboardStats, MonthlyData, VehicleTypeData } from './types';
import { fetchDashboardStats, fetchVehicleTypes, generateMonthlyData } from './dashboardService';

export const useAdminDashboard = () => {
  const { clientId } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    publishedVehicles: 0,
    soldVehicles: 0,
    totalVisits: 0,
    totalSales: 0,
    byStatusCount: {},
  });
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeData[]>([]);

  useEffect(() => {
    if (!clientId) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch main stats
        const statsData = await fetchDashboardStats(clientId);
        setStats(statsData);

        // Fetch vehicle types
        const vehicleTypesData = await fetchVehicleTypes(clientId);
        setVehicleTypes(vehicleTypesData);

        // Generate monthly data
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
        const monthlyDataResult = await generateMonthlyData(clientId, months);
        setMonthlyData(monthlyDataResult);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error",
          description: "No se pudo cargar los datos del dashboard",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [clientId]);

  return { stats, loading, monthlyData, vehicleTypes };
};


import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { DEFAULT_IVA_PERCENTAGE } from '@/utils/sellerCalculation';

export interface SellerDashboardStats {
  totalCommissionEarned: number;
  totalIvaWithheld: number;
  totalNetCommission: number;
  totalSales: number;
  assignedVehicles: number;
  pendingApprovalSales: number;
  approvedSales: number;
  rejectedSales: number;
  consignmentsCaptured: number;
}

export interface MonthlySellerData {
  month: string;
  sales: number;
  commissions: number;
}

export const useSellerDashboard = () => {
  const { userId, client } = useAuth();
  const ivaExempt = !!client?.ventas_exentas_iva;
  const [stats, setStats] = useState<SellerDashboardStats>({
    totalCommissionEarned: 0,
    totalIvaWithheld: 0,
    totalNetCommission: 0,
    totalSales: 0,
    assignedVehicles: 0,
    pendingApprovalSales: 0,
    approvedSales: 0,
    rejectedSales: 0,
    consignmentsCaptured: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlySellerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }
    // ivaExempt afecta el cálculo; recalcular si el flag del cliente cambia/llega.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, ivaExempt]);

  const fetchDashboardData = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // Get the seller ID from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', userId)
        .single();
        
      if (userError) {
        throw userError;
      }
      
      const sellerId = userData.id;
      
      // Fetch all sales data for this seller
      const { data: salesData, error: salesError } = await supabase
        .from('vehicles_sales')
        .select('*, vehicle:vehicle_id(*)')
        .eq('seller_id', sellerId);
        
      if (salesError) {
        throw salesError;
      }
      
      // Fetch assigned vehicles for this seller and client
      const { data: userClientData, error: userClientError } = await supabase
        .from('users')
        .select('client_id')
        .eq('id', sellerId)
        .single();

      if (userClientError) {
        throw userClientError;
      }

      const clientId = userClientData?.client_id;

      // Fetch assigned vehicles
      const { data: assignedVehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('seller_id', sellerId)
        .eq('client_id', clientId);
        
      if (vehiclesError) {
        throw vehiclesError;
      }

      // Fetch consignments captured by this seller
      const { data: capturedConsignments, error: consignmentsError } = await supabase
        .from('vehicles_consignments')
        .select('id')
        .eq('consignment_seller_id', sellerId);

      if (consignmentsError) {
        console.error('Error fetching captured consignments:', consignmentsError);
      }

      // Calculate stats
      const approvedSales = salesData?.filter(sale => sale.status === 'approved') || [];
      const pendingSales = salesData?.filter(sale => sale.status === 'pending') || [];
      const rejectedSales = salesData?.filter(sale => sale.status === 'rejected') || [];
      
      const totalCommissionEarned = approvedSales.reduce(
        (sum, sale) => sum + (Number(sale.commission_amount) || 0),
        0
      );

      // IVA-aware net commission across approved sales (régimen del margen):
      //   margen bruto = sale_price − acquisition_cost
      //   IVA = margen bruto × 19/119
      //   margen neto = margen bruto − IVA
      //   factor neto = margen_neto / margen_bruto = 100 / 119
      // Total IVA retenido sobre la base usada para comisión. El factor se calcula
      // POR VENTA (saleIvaFactor) para respetar el exento por vehículo; el toggle
      // por cliente (ivaExempt) queda como default cuando el vehículo no lo define.
      let totalIvaWithheld = 0;
      let totalNetCommission = 0;

      if (approvedSales.length > 0) {
        type SaleForBreakdown = {
          vehicle_id: number;
          sale_price: number | string | null;
          commission_amount: number | string | null;
          commission_base_type: 'total' | 'margin' | null;
          vehicle?: { is_consigned?: boolean | null; iva_exento?: boolean | null } | null;
        };
        const typedApproved = approvedSales as unknown as SaleForBreakdown[];
        const vehicleIds = typedApproved.map((s) => s.vehicle_id).filter(Boolean);
        const [purchasesResult, consignmentsResult] = await Promise.all([
          supabase.from('vehicles_purchases').select('vehicle_id, purchase_price').in('vehicle_id', vehicleIds),
          supabase.from('vehicles_consignments').select('vehicle_id, agreed_price, agreed_price_final').in('vehicle_id', vehicleIds),
        ]);
        const purchaseMap = new Map((purchasesResult.data || []).map(p => [p.vehicle_id, Number(p.purchase_price) || 0]));
        // Usar el precio garantizado reajustado (agreed_price_final) si existe — alinea
        // el margen base del vendedor con la utilidad mostrada en el resto de las vistas.
        const consignmentMap = new Map((consignmentsResult.data || []).map((c: any) => [c.vehicle_id, Number(c.agreed_price_final ?? c.agreed_price) || 0]));

        for (const sale of typedApproved) {
          const acquisitionCost = sale.vehicle?.is_consigned
            ? (consignmentMap.get(sale.vehicle_id) || 0)
            : (purchaseMap.get(sale.vehicle_id) || 0);
          const grossMargin = Math.max(0, (Number(sale.sale_price) || 0) - acquisitionCost);
          // IVA exento por VEHÍCULO (vehicles.iva_exento) tiene prioridad sobre el
          // toggle por cliente. null → usa el default del cliente (ivaExempt).
          const saleExempt = sale.vehicle?.iva_exento ?? ivaExempt;
          const saleIvaFactor = saleExempt
            ? 0
            : DEFAULT_IVA_PERCENTAGE / (100 + DEFAULT_IVA_PERCENTAGE);
          const ivaOnMargin = grossMargin * saleIvaFactor;
          const baseType = sale.commission_base_type || 'total';
          // Aproximación: si la comisión guardada se calculó sobre el margen, descontamos
          // proporcionalmente el IVA. Si fue sobre el total, no hay IVA que descontar de la comisión.
          const grossCommission = Number(sale.commission_amount) || 0;
          const ivaShareOnCommission = baseType === 'margin' ? grossCommission * saleIvaFactor : 0;
          totalIvaWithheld += ivaOnMargin;
          totalNetCommission += grossCommission - ivaShareOnCommission;
        }
      }

      setStats({
        totalCommissionEarned,
        totalIvaWithheld,
        totalNetCommission,
        totalSales: salesData?.length || 0,
        assignedVehicles: assignedVehicles?.length || 0,
        pendingApprovalSales: pendingSales.length,
        approvedSales: approvedSales.length,
        rejectedSales: rejectedSales.length,
        consignmentsCaptured: capturedConsignments?.length || 0,
      });
      
      // Generate monthly data for the past 6 months
      const monthlyData = await generateMonthlyData(salesData || []);
      setMonthlyData(monthlyData);
      
    } catch (error) {
      console.error('Error fetching seller dashboard data:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar los datos del dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to generate monthly data
  const generateMonthlyData = async (salesData: any[]) => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentDate = new Date();
    const result: MonthlySellerData[] = [];
    
    // Generate data for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate);
      monthDate.setMonth(currentDate.getMonth() - i);
      const monthIndex = monthDate.getMonth();
      const year = monthDate.getFullYear();
      
      // Filter sales for this month
      const monthlySales = salesData.filter(sale => {
        if (!sale.sale_date) return false;
        const saleDate = new Date(sale.sale_date);
        return saleDate.getMonth() === monthIndex && saleDate.getFullYear() === year;
      });
      
      // Calculate total sales and commissions for the month
      const salesCount = monthlySales.length;
      const commissions = monthlySales
        .filter(sale => sale.status === 'approved')
        .reduce((sum, sale) => sum + (Number(sale.commission_amount) || 0), 0);
      
      result.push({
        month: months[monthIndex],
        sales: salesCount,
        commissions: commissions
      });
    }
    
    return result;
  };
  
  return { stats, loading, monthlyData };
};

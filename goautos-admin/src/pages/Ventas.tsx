import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { LuLock } from 'react-icons/lu';
import SalesTable from '@/components/sales/SalesTable';
import SalesStatusCards from '@/components/sales/SalesStatusCards';
import ApprovalDialog from '@/components/sales/ApprovalDialog';
import VehiclesPagination from '@/components/vehiculos/VehiclesPagination';
import { useSalesData } from '@/hooks/useSalesData';
import { useSaleApproval } from '@/hooks/useSaleApproval';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

type SaleStatus = 'pending' | 'approved' | 'rejected';

const Ventas = () => {
  const { clientId, userRole, isTenantOverride } = useAuth();
  const { t: tSales } = useTranslation('salesPage');
  const [activeStatus, setActiveStatus] = useState<SaleStatus | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('alertFilter') === 'pending-sales') {
      window.history.replaceState({}, '', window.location.pathname);
      return 'pending';
    }
    return 'pending';
  });
  const [statusCounts, setStatusCounts] = useState<Record<SaleStatus, number>>({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [countsLoading, setCountsLoading] = useState(true);

  // Map activeStatus to the tab string the hook expects
  const activeTab = activeStatus || 'all';

  const pageSize = 10;
  const {
    sales,
    isLoading,
    fetchSales,
    currentPage,
    setCurrentPage,
    totalCount,
    totalPages,
  } = useSalesData(clientId, activeTab, pageSize);

  const {
    selectedSale,
    approvalDialog,
    setApprovalDialog,
    commissionAmount,
    setCommissionAmount,
    commissionPercentage,
    setCommissionPercentage,
    commissionBaseType,
    setCommissionBaseType,
    approvalNotes,
    setApprovalNotes,
    commissionSplits,
    setCommissionSplits,
    openApprovalDialog,
    handleApprove,
    handleRevert,
    handleToggleFinancingSettled,
  } = useSaleApproval({
    onSuccess: () => {
      fetchSales();
      fetchCounts();
    },
  });

  // Fetch counts for each status
  const fetchCounts = useCallback(async () => {
    if (!clientId) return;

    try {
      const { data: clientVehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('client_id', clientId);

      if (!clientVehicles || clientVehicles.length === 0) {
        setStatusCounts({ pending: 0, approved: 0, rejected: 0 });
        setCountsLoading(false);
        return;
      }

      const vehicleIds = clientVehicles.map((v) => v.id);

      const [pending, approved, rejected] = await Promise.all([
        supabase
          .from('vehicles_sales')
          .select('id', { count: 'exact', head: true })
          .in('vehicle_id', vehicleIds)
          .eq('status', 'pending'),
        supabase
          .from('vehicles_sales')
          .select('id', { count: 'exact', head: true })
          .in('vehicle_id', vehicleIds)
          .eq('status', 'approved'),
        supabase
          .from('vehicles_sales')
          .select('id', { count: 'exact', head: true })
          .in('vehicle_id', vehicleIds)
          .eq('status', 'rejected'),
      ]);

      setStatusCounts({
        pending: pending.count || 0,
        approved: approved.count || 0,
        rejected: rejected.count || 0,
      });
    } catch (error) {
      console.error('Error fetching sales counts:', error);
    } finally {
      setCountsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      fetchCounts();
    }
  }, [clientId, fetchCounts]);

  const handleStatusClick = (status: SaleStatus | null) => {
    setActiveStatus(status);
  };

  const totalSalesCount =
    statusCounts.pending + statusCounts.approved + statusCounts.rejected;

  if (userRole === 'seller' || userRole === 'vendedor' || (userRole === 'superadmin' && !isTenantOverride)) {
    const isSuperadmin = userRole === 'superadmin';
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
              <LuLock className="w-5 h-5 text-slate-400" />
            </div>
            <h1 className="text-lg font-semibold text-slate-700 mb-1">
              {tSales('accessDeniedTitle')}
            </h1>
            <p className="text-sm text-slate-400">
              {isSuperadmin
                ? 'Selecciona una automotora para ver sus ventas.'
                : tSales('accessDeniedDesc')}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="flex flex-col h-full bg-[#f5f5f7] overflow-x-hidden">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 bg-[#f5f5f7] border-b border-slate-200/60">
          <div
            className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-2 sm:pb-3 flex items-center gap-2 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
            data-tour="sales-tabs"
          >
            <SalesStatusCards
              counts={statusCounts}
              totalCount={totalSalesCount}
              activeStatus={activeStatus}
              onStatusClick={handleStatusClick}
              loading={countsLoading}
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-0">
          <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 py-3 sm:py-4" data-tour="sales-table">
            <SalesTable
              sales={sales}
              isLoading={isLoading}
              activeTab={activeTab}
              openApprovalDialog={openApprovalDialog}
            />
          </div>
        </div>

        {/* Pagination — fixed at bottom */}
        {!isLoading && totalCount > 0 && (
          <div className="bg-white/80 backdrop-blur-sm border-t border-slate-200/40">
            <VehiclesPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              isLoading={isLoading}
            />
          </div>
        )}
      </main>

      <ApprovalDialog
        open={approvalDialog}
        onOpenChange={setApprovalDialog}
        selectedSale={selectedSale}
        commissionAmount={commissionAmount}
        setCommissionAmount={setCommissionAmount}
        commissionPercentage={commissionPercentage}
        setCommissionPercentage={setCommissionPercentage}
        commissionBaseType={commissionBaseType}
        setCommissionBaseType={setCommissionBaseType}
        approvalNotes={approvalNotes}
        setApprovalNotes={setApprovalNotes}
        handleApprove={handleApprove}
        handleRevert={handleRevert}
        handleToggleFinancingSettled={handleToggleFinancingSettled}
        commissionSplits={commissionSplits}
        onCommissionSplitsChange={setCommissionSplits}
      />
    </DashboardLayout>
  );
};

export default Ventas;

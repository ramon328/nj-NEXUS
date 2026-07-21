import DashboardCharts from '@/components/DashboardCharts';
import DashboardStats from '@/components/DashboardStats';
import SuperadminDashboard from '@/components/superadmin/SuperadminDashboard';
import AdminDashboard from '@/components/admin/AdminDashboard';
import SellerDashboardContent from '@/components/seller/SellerDashboardContent';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';

const DashboardContent = () => {
  const { isTenantOverride } = useAuth();
  const { hasPermission, isSuperadmin } = usePermissions();

  const canViewFullDashboard = hasPermission(PermissionCode.DASHBOARD_VIEW_FULL);
  const canViewSellerDashboard = hasPermission(PermissionCode.DASHBOARD_VIEW_SELLER);

  // Superadmin sin tenant → superadmin dashboard
  if (isSuperadmin && !isTenantOverride) {
    return (
      <div className='p-0 space-y-6'>
        <SuperadminDashboard />
      </div>
    );
  }

  // Superadmin con tenant → admin dashboard
  if (isSuperadmin && isTenantOverride) {
    return (
      <div className='p-0 space-y-6'>
        <AdminDashboard />
      </div>
    );
  }

  // Usuarios normales: mostrar cada dashboard al que tengan permiso
  return (
    <div className='p-0 space-y-6'>
      {canViewFullDashboard && <AdminDashboard />}
      {canViewSellerDashboard && <SellerDashboardContent showHeader={!canViewFullDashboard} />}
      {!canViewFullDashboard && !canViewSellerDashboard && <SellerDashboardContent />}
    </div>
  );
};

export default DashboardContent;

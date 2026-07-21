import React, { useEffect } from 'react';
import SidebarNav from '@/components/SidebarNav';
import DashboardContent from '@/components/dashboard/DashboardContent';
import DashboardLoading from '@/components/dashboard/DashboardLoading';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import posthog from '@/utils/posthog';

const Index = () => {
  const { isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      posthog.capture({
        distinctId: user.id,
        event: 'dashboard_viewed',
      });
    }
  }, [isLoading, user]);

  if (isLoading) {
    return <DashboardLoading />;
  }

  return (
    <DashboardLayout>
      <div className="h-full">
        <DashboardContent />
      </div>
    </DashboardLayout>
  );
};

export default Index;

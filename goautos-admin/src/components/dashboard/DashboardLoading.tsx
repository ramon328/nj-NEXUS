import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import SidebarNav from '@/components/SidebarNav';

const DashboardLoading = () => {
  return (
    <div className='flex h-screen bg-background'>
      <SidebarNav />
      <main className='flex-1 overflow-auto'>
        <div className='p-6 space-y-6'>
          <Skeleton className='h-8 w-1/4 mb-2' />
          <Skeleton className='h-4 w-2/4 mb-8' />

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            <Skeleton className='h-32' />
            <Skeleton className='h-32' />
            <Skeleton className='h-32' />
            <Skeleton className='h-32' />
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4'>
            <Skeleton className='h-72' />
            <Skeleton className='h-72' />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLoading;

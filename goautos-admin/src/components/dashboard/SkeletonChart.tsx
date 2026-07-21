
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const SkeletonChart = () => (
  <div className="h-72 flex items-center justify-center">
    <div className="space-y-2 w-full">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6 mx-auto" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/6 mx-auto" />
      <Skeleton className="h-4 w-full" />
    </div>
  </div>
);

export default SkeletonChart;

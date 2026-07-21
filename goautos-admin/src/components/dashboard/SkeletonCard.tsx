

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const SkeletonCard = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div className="w-full">
          <Skeleton className="h-3 w-1/3 mb-2" />
          <Skeleton className="h-7 w-1/2 mb-1" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>
    </CardContent>
  </Card>
);

export default SkeletonCard;

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  className?: string;
}

const StatCard = ({ title, value, icon, trend, className }: StatCardProps) => (
  <Card className={cn('overflow-hidden', className)}>
    <CardContent className='p-6'>
      <div className='flex justify-between items-start'>
        <div>
          <p className='text-sm font-medium text-muted-foreground mb-1'>
            {title}
          </p>
          <h3 className='text-2xl font-semibold'>{value}</h3>
          {trend && (
            <p
              className={cn(
                'text-xs mt-1',
                trend.positive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.positive ? '↑' : '↓'} {trend.value} desde el mes pasado
            </p>
          )}
        </div>
        <div className='p-2 rounded-md bg-primary/80'>{icon}</div>
      </div>
    </CardContent>
  </Card>
);

export default StatCard;

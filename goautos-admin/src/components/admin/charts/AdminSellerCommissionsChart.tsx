import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SellerPerformance } from '@/hooks/admin/types';
import { useCurrency } from '@/hooks/useCurrency';
import { Users, Filter } from 'lucide-react';

interface AdminSellerCommissionsChartProps {
  loading: boolean;
  sellerPerformance: SellerPerformance[];
  filtroLabel?: string;
}

const CustomTooltip = ({ active, payload, label, formatPrice }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className='rounded-xl bg-white/95 backdrop-blur-sm shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)] border border-slate-200/60 p-3'>
        <p className='font-medium text-slate-900 mb-1'>{label}</p>
        <p className='text-violet-600'>{`Comisiones: ${formatPrice(
          payload[0].value
        )}`}</p>
      </div>
    );
  }
  return null;
};

const AdminSellerCommissionsChart = ({
  loading,
  sellerPerformance,
  filtroLabel,
}: AdminSellerCommissionsChartProps) => {
  const { formatPrice, currency } = useCurrency();
  const totalCommissions = sellerPerformance.reduce(
    (sum, seller) => sum + seller.commissions,
    0
  );

  return (
    <Card className='rounded-2xl border border-slate-200/60 bg-white'>
      <CardHeader className='pb-2'>
        <div className='flex flex-col items-start'>
          <div className='flex items-center gap-2'>
            <div className='text-primary'>
              <Users className='h-5 w-5 opacity-70' />
            </div>
            <CardTitle className='text-[15px] font-semibold text-slate-900 tracking-tight'>
              {filtroLabel ? filtroLabel : 'Comisiones por Vendedor'}
            </CardTitle>
          </div>

          <div className='mt-2'>
            <div>
              <p className='text-xs text-slate-500'>Total Comisiones</p>
              <p className='text-sm font-semibold'>
                {formatPrice(totalCommissions)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className='h-[250px] sm:h-[300px] md:h-[350px]'>
        {loading ? (
          <div className='h-full w-full bg-slate-100 animate-pulse rounded-xl' />
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart
              data={sellerPerformance}
              margin={{ top: 5, right: 10, left: 0, bottom: 30 }}
              layout='vertical'
            >
              <CartesianGrid
                strokeDasharray='3 3'
                stroke='rgba(0,0,0,0.04)'
                horizontal={false}
              />
              <XAxis
                type='number'
                tickFormatter={(value) =>
                  value === 0 ? '0' : `$${Math.round(value / 1000000)}M`
                }
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                label={{
                  value: `Comisión total (${currency})`,
                  position: 'insideBottom',
                  offset: -20,
                  style: {
                    textAnchor: 'middle',
                    fill: '#374151',
                    fontWeight: 600,
                    fontSize: 13,
                  },
                }}
              />
              <YAxis
                type='category'
                dataKey='name'
                width={85}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
              />
              <Tooltip content={<CustomTooltip formatPrice={formatPrice} />} />
              <Bar
                name='Comisiones'
                dataKey='commissions'
                fill='#8b5cf6'
                barSize={16}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSellerCommissionsChart;

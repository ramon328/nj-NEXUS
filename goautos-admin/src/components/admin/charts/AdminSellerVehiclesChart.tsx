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
import { Users, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateFilter } from '@/hooks/admin/useSellerPerformance';

interface AdminSellerVehiclesChartProps {
  loading: boolean;
  sellerPerformance: SellerPerformance[];
  filtroLabel?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className='rounded-xl bg-white/95 backdrop-blur-sm shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)] border border-slate-200/60 p-3'>
        <p className='font-medium text-slate-900 mb-1'>{label}</p>
        <p className='text-primary'>{`Vehículos Vendidos: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const AdminSellerVehiclesChart = ({
  loading,
  sellerPerformance,
  filtroLabel,
}: AdminSellerVehiclesChartProps) => {
  const totalVehicles = sellerPerformance.reduce(
    (sum, seller) => sum + seller.vehiclesSold,
    0
  );

  return (
    <Card className='rounded-2xl border border-slate-200/60 bg-white'>
      <CardHeader className='pb-2'>
        <div className='flex flex-col items-start'>
          <div className='flex items-center justify-between w-full'>
            <div className='flex items-center gap-2'>
              <div className='text-primary'>
                <Users className='h-5 w-5 opacity-70' />
              </div>
              <CardTitle className='text-[15px] font-semibold text-slate-900 tracking-tight'>
                {filtroLabel ? filtroLabel : 'Vehículos Vendidos por Vendedor'}
              </CardTitle>
            </div>
          </div>
          <div className='mt-2'>
            <div>
              <p className='text-xs text-slate-500'>Total Vehículos</p>
              <p className='text-sm font-semibold'>
                {totalVehicles.toLocaleString()}
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
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                label={{
                  value: 'Cantidad de vehículos vendidos',
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
              <Tooltip content={<CustomTooltip />} />
              <Bar
                name='Vehículos Vendidos'
                dataKey='vehiclesSold'
                fill='#4f46e5'
                barSize={16}
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSellerVehiclesChart;

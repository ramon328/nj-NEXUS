
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SellerPerformance } from '@/hooks/admin/types';
import { formatCurrency } from '@/components/dashboard/formatters';
import { Users } from 'lucide-react';

interface AdminSellerPerformanceChartProps {
  loading: boolean;
  sellerPerformance: SellerPerformance[];
  columnLayout?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className='rounded-xl bg-white/95 backdrop-blur-sm shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)] border border-slate-200/60 p-3'>
        <p className='font-medium text-slate-900 mb-1'>{label}</p>
        <p className='text-primary'>{`Ventas: ${formatCurrency(payload[0].value)}`}</p>
        <p className='text-slate-600'>{`Comisiones: ${formatCurrency(payload[1].value)}`}</p>
        <p className='text-violet-600'>{`Vehículos Vendidos: ${payload[2].value}`}</p>
      </div>
    );
  }
  return null;
};

const AdminSellerPerformanceChart: React.FC<AdminSellerPerformanceChartProps> = ({
  loading,
  sellerPerformance,
  columnLayout,
}) => {
  const chartData = sellerPerformance.map((seller) => ({
    name: seller.name,
    Ventas: seller.sales,
    Comisiones: seller.commissions,
    'Vehículos Vendidos': seller.vehiclesSold,
  }));

  const totalSales = sellerPerformance.reduce((sum, seller) => sum + seller.sales, 0);
  const totalCommissions = sellerPerformance.reduce((sum, seller) => sum + seller.commissions, 0);
  const totalVehicles = sellerPerformance.reduce((sum, seller) => sum + seller.vehiclesSold, 0);

  return (
    <Card className='rounded-2xl border border-slate-200/60 bg-white'>
      <CardHeader className='pb-2'>
        <div className={`flex flex-col items-start`}>
          <div className='flex items-center gap-2'>
            <div className='text-primary'>
              <Users className='h-5 w-5 opacity-70' />
            </div>
            <CardTitle className='text-[15px] font-semibold text-slate-900 tracking-tight'>
              Rendimiento de Vendedores
            </CardTitle>
          </div>
          <div className={`mt-2 flex gap-6`}>
            <div>
              <p className='text-xs text-slate-500'>Ventas</p>
              <p className='text-sm font-semibold'>{formatCurrency(totalSales)}</p>
            </div>
            <div>
              <p className='text-xs text-slate-500'>Comisiones</p>
              <p className='text-sm font-semibold'>{formatCurrency(totalCommissions)}</p>
            </div>
            <div>
              <p className='text-xs text-slate-500'>Vehículos Vendidos</p>
              <p className='text-sm font-semibold'>{totalVehicles}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className='h-[350px]'>
        {loading ? (
          <div className='h-full w-full bg-slate-100 animate-pulse rounded-xl' />
        ) : (
          <ResponsiveContainer width='100%' height='100%' className='flex justify-start'>
            <BarChart
              data={chartData}
              layout='vertical'
              margin={{ top: 10, right: 30, left: 60, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray='3 3' stroke='rgba(0,0,0,0.04)' horizontal={false} />
              <XAxis
                type='number'
                tickFormatter={(value) => (value === 0 ? '0' : `$${value / 1000}k`)}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
              />
              <YAxis
                type='category'
                dataKey='name'
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span className='text-slate-600'>{value}</span>}
              />
              <Bar
                dataKey='Ventas'
                fill='#4f46e5'
                barSize={20}
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey='Comisiones'
                fill='#94a3b8'
                barSize={20}
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey='Vehículos Vendidos'
                fill='#8b5cf6'
                barSize={20}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSellerPerformanceChart;

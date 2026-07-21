
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

interface AdminSellerPerformanceDetailProps {
  loading: boolean;
  sellerPerformance: SellerPerformance[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className='rounded-lg bg-white shadow-xl border p-3'>
        <p className='font-medium text-gray-900 mb-1'>{label}</p>
        <p className='text-primary'>{`Vehículos Vendidos: ${payload[0].value}`}</p>
        <p className='text-violet-600'>{`Comisiones: ${formatCurrency(payload[1].value)}`}</p>
      </div>
    );
  }
  return null;
};

const AdminSellerPerformanceDetail: React.FC<AdminSellerPerformanceDetailProps> = ({
  loading,
  sellerPerformance,
}) => {
  const totalVehiclesSold = sellerPerformance.reduce(
    (sum, seller) => sum + seller.vehiclesSold,
    0
  );
  const totalCommissions = sellerPerformance.reduce(
    (sum, seller) => sum + seller.commissions,
    0
  );

  return (
    <Card className='border bg-white'>
      <CardHeader className='pb-2'>
        <div className='flex flex-col items-start'>
          <div className='flex items-center gap-2'>
            <div className='text-primary'>
              <Users className='h-5 w-5 opacity-70' />
            </div>
            <CardTitle className='text-lg font-medium'>
              Rendimiento de Vendedores
            </CardTitle>
          </div>
          <div className='mt-2 flex gap-6'>
            <div>
              <p className='text-xs text-gray-500'>Total Vehículos Vendidos</p>
              <p className='text-sm font-semibold'>{totalVehiclesSold}</p>
            </div>
            <div>
              <p className='text-xs text-gray-500'>Total Comisiones</p>
              <p className='text-sm font-semibold'>{formatCurrency(totalCommissions)}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className='h-[350px]'>
        {loading ? (
          <div className='h-full w-full bg-gray-100 animate-pulse rounded-md' />
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart
              data={sellerPerformance}
              margin={{ top: 20, right: 30, left: 60, bottom: 0 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray='3 3' stroke='rgba(0,0,0,0.1)' horizontal={false} />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                name="Vehículos Vendidos"
                dataKey="vehiclesSold"
                fill="#4f46e5"
                barSize={20}
                radius={[0, 4, 4, 0]}
              />
              <Bar
                name="Comisiones"
                dataKey="commissions"
                fill="#8b5cf6"
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

export default AdminSellerPerformanceDetail;

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { TimeRange } from './TimeRangeSelector';

interface LineChartVehiclesProps {
  loading: boolean;
  weeklyData: {
    week: string;
    vehiclesAdded: number;
  }[];
  timeRange: TimeRange;
}

const SkeletonChart = () => (
  <div className='h-72 flex items-center justify-center'>
    <div className='space-y-2 w-full'>
      <div className='h-4 w-full bg-muted animate-pulse rounded'></div>
      <div className='h-4 w-5/6 mx-auto bg-muted animate-pulse rounded'></div>
      <div className='h-4 w-full bg-muted animate-pulse rounded'></div>
      <div className='h-4 w-4/6 mx-auto bg-muted animate-pulse rounded'></div>
      <div className='h-4 w-full bg-muted animate-pulse rounded'></div>
    </div>
  </div>
);

const LineChartVehicles: React.FC<LineChartVehiclesProps> = ({
  loading,
  weeklyData,
  timeRange,
}) => {
  const getChartTitle = () => {
    switch (timeRange) {
      case '7days':
        return 'Tendencia de vehículos por día';
      case '30days':
        return 'Tendencia de vehículos por día';
      case '6months':
        return 'Tendencia de vehículos por mes';
      case '1year':
        return 'de vehículos por mes';
      case 'all':
        return 'de vehículos histórica';
      default:
        return 'Tendencia de vehículos';
    }
  };

  // Función para formatear las etiquetas del eje X para mejor legibilidad
  const formatXAxis = (value: string) => {
    if (!value) return '';

    // Para períodos de 6 meses y 1 año, formatear correctamente
    if (timeRange === '6months' || timeRange === '1year') {
      // Para etiquetas mensuales como "Ene/23"
      if (value.includes('/')) {
        return value;
      }
    }

    // Para fechas con formato de rango (01-07)/05/23
    if (value.includes('(') && value.includes(')')) {
      return value;
    }

    // Para fechas con formato DD/MM/YY
    if (value.includes('/')) {
      return value;
    }

    return value;
  };

  // Determinar si necesitamos mostrar todos los ticks o reducirlos
  const getTickInterval = () => {
    if (timeRange === '7days') {
      return 0; // Mostrar todos los ticks para 7 días
    } else if (timeRange === '30days') {
      // Para 30 días, mostrar aproximadamente 6-8 ticks
      return Math.ceil(weeklyData.length / 8);
    } else if (timeRange === '6months') {
      // Para 6 meses, mostrar todas las etiquetas de los meses
      return 0;
    } else {
      // Para 1 año, mostrar menos ticks
      return Math.ceil(weeklyData.length / 12);
    }
  };

  // Calcular el ángulo de rotación según el período
  const getAngle = () => {
    if (timeRange === '6months' || timeRange === '1year') {
      return -25; // Más rotación para textos largos
    }
    return -15; // Rotación estándar
  };

  // Determinar cuántos ticks se deben mostrar
  const getTickCount = () => {
    if (timeRange === '30days') {
      return 8;
    } else if (timeRange === '6months') {
      return 12; // Mostrar todos los puntos de datos para 6 meses
    } else if (timeRange === '1year') {
      return 12; // Un punto por mes para 1 año
    }
    return 6; // Por defecto
  };

  // Calcular el valor promedio para la línea de referencia

  return (
    <Card className='col-span-1 lg:col-span-2'>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle className='text-md font-medium'>{getChartTitle()}</CardTitle>
        <TrendingUp className='h-4 w-4 text-muted-foreground' />
      </CardHeader>
      <CardContent>
        {loading ? (
          <SkeletonChart />
        ) : (
          <ResponsiveContainer width='100%' height={300}>
            <LineChart
              data={weeklyData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 30, // Aumentar margen inferior para las etiquetas
              }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='week'
                tickFormatter={formatXAxis}
                angle={getAngle()}
                textAnchor='end'
                height={60}
                tickMargin={10}
                interval={getTickInterval()}
                tickCount={getTickCount()}
              />
              <YAxis allowDecimals={false} domain={['auto', 'auto']} />
              <Tooltip
                formatter={(value) => [
                  Number(value).toLocaleString(),
                  'Vehículos',
                ]}
                labelFormatter={(label) => {
                  if (label.includes('(') && label.includes(')')) {
                    return `Período: ${label}`;
                  }
                  return `Fecha: ${label}`;
                }}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 10 }} />
              {timeRange !== '7days' && (
                <ReferenceLine
                  stroke='#ff7300'
                  strokeDasharray='3 3'
                  label={{
                    position: 'right',
                    fill: '#ff7300',
                    fontSize: 12,
                  }}
                />
              )}
              <Line
                type='monotone'
                name='Vehículos Agregados'
                dataKey='vehiclesAdded'
                stroke='#3b82f6'
                activeDot={{ r: 8 }}
                strokeWidth={2}
                dot={{ strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default LineChartVehicles;

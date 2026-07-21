import { TrendingUp, Calculator, BarChart3 } from 'lucide-react';
import type { PriceAnalysis } from '@/types/tasador';
import { formatPrice } from './utils';

interface PriceStatsCardProps {
  priceAnalysis?: PriceAnalysis | null;
}

const PriceStatsCard = ({ priceAnalysis }: PriceStatsCardProps) => {
  if (!priceAnalysis || priceAnalysis.sampleSize === 0) return null;

  const stats = [
    { label: 'Mínimo', value: priceAnalysis.min, icon: TrendingUp },
    { label: 'Máximo', value: priceAnalysis.max, icon: TrendingUp },
    { label: 'Promedio', value: priceAnalysis.average, icon: Calculator },
    { label: 'Mediana', value: priceAnalysis.median, icon: BarChart3 },
  ].filter((s) => s.value !== null);

  if (stats.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
        <BarChart3 className="h-4 w-4" />
        <span>Análisis estadístico</span>
        <span className="ml-auto text-xs text-gray-400">
          {priceAnalysis.sampleSize} publicaciones analizadas
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className="text-lg font-bold text-gray-900">
              {formatPrice(stat.value!)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PriceStatsCard;

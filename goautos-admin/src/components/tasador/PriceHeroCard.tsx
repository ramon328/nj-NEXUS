import { TrendingUp } from 'lucide-react';
import { formatPrice } from './utils';

interface PriceHeroCardProps {
  low: number;
  high: number;
  sampleSize?: number;
}

const PriceHeroCard = ({ low, high, sampleSize }: PriceHeroCardProps) => {
  return (
    <div className="bg-gradient-to-br from-primary to-cyan-400 rounded-2xl p-6 text-white shadow-lg shadow-primary/25">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white/80 text-sm">
          <TrendingUp className="h-4 w-4" />
          <span>Rango de precios verificado</span>
        </div>
        {sampleSize && sampleSize > 0 && (
          <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
            {sampleSize} publicaciones
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-3xl sm:text-4xl font-bold">
          {formatPrice(low)}
        </span>
        {low !== high && (
          <>
            <span className="text-white/60 text-xl">—</span>
            <span className="text-3xl sm:text-4xl font-bold">
              {formatPrice(high)}
            </span>
          </>
        )}
        <span className="text-white/80 text-sm">CLP</span>
      </div>
    </div>
  );
};

export default PriceHeroCard;

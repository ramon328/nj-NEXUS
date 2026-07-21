import { Zap, TrendingUp, ArrowDown, ArrowUp } from 'lucide-react';
import type { PriceAnalysis } from '@/types/tasador';
import { formatPrice } from './utils';

interface SuggestedPriceCardProps {
  priceAnalysis: PriceAnalysis | null;
  estimatedRange: { low: number; high: number } | null;
}

const SuggestedPriceCard = ({ priceAnalysis, estimatedRange }: SuggestedPriceCardProps) => {
  if (!priceAnalysis || !estimatedRange || priceAnalysis.sampleSize === 0) return null;

  const avg = priceAnalysis.average || 0;
  const median = priceAnalysis.median || avg;
  const low = estimatedRange.low;
  const high = estimatedRange.high;

  // Quick sell: 5-8% below median to attract fast buyers
  const quickSell = Math.round(median * 0.93);
  // Competitive: at median
  const competitive = Math.round(median);
  // Maximize: 5-10% above median (but not above high)
  const maximize = Math.round(Math.min(median * 1.07, high));

  // Suggested purchase price: 15-20% below median for dealer margin
  const purchaseSuggestion = Math.round(median * 0.82);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Zap className="h-4 w-4 text-primary" />
        <span className="font-medium text-gray-900">Precios sugeridos</span>
      </div>

      {/* Sell strategies */}
      <div className="grid grid-cols-3 gap-3">
        <div className="relative p-3 rounded-xl bg-white border border-slate-800 text-center">
          <div className="flex items-center justify-center gap-1 mb-1.5">
            <ArrowDown className="w-3 h-3 text-slate-800" />
            <p className="text-[10px] font-semibold text-slate-800 uppercase tracking-wider">Venta rápida</p>
          </div>
          <p className="text-lg font-bold text-slate-900">{formatPrice(quickSell)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">-7% del mercado</p>
        </div>

        <div className="relative p-3 rounded-xl bg-white border border-sky-400 text-center">
          <div className="flex items-center justify-center gap-1 mb-1.5">
            <TrendingUp className="w-3 h-3 text-sky-500" />
            <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-wider">Competitivo</p>
          </div>
          <p className="text-lg font-bold text-slate-900">{formatPrice(competitive)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Precio de mercado</p>
        </div>

        <div className="relative p-3 rounded-xl bg-white border border-emerald-400 text-center">
          <div className="flex items-center justify-center gap-1 mb-1.5">
            <ArrowUp className="w-3 h-3 text-emerald-500" />
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Maximizar</p>
          </div>
          <p className="text-lg font-bold text-slate-900">{formatPrice(maximize)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">+7% del mercado</p>
        </div>
      </div>

      {/* Purchase suggestion */}
      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-700">Precio de compra sugerido</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Para mantener ~18% de margen</p>
        </div>
        <p className="text-lg font-bold text-gray-900">{formatPrice(purchaseSuggestion)}</p>
      </div>
    </div>
  );
};

export default SuggestedPriceCard;

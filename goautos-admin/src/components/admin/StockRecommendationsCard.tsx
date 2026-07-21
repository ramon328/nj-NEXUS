import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StockRecommendation } from '@/hooks/admin/types/inventoryAnalytics';
import { TrendingUp, Zap, DollarSign, BarChart3, Star } from 'lucide-react';

interface StockRecommendationsCardProps {
  recommendations: {
    fastestSelling: StockRecommendation[];
    mostProfitable: StockRecommendation[];
    bestOverall: StockRecommendation[];
  } | undefined;
  loading: boolean;
}

type TabType = 'best' | 'fast' | 'profit';

const StockRecommendationsCard: React.FC<StockRecommendationsCardProps> = ({
  recommendations,
  loading,
}) => {
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) => (i18n.language?.toLowerCase().startsWith('es') ? es : en);
  const [activeTab, setActiveTab] = useState<TabType>('best');

  const tabs: { key: TabType; label: string; icon: React.ElementType; ringHex: string }[] = [
    { key: 'best', label: dv('Mejores', 'Best'), icon: Star, ringHex: '#d97706' },
    { key: 'fast', label: dv('Más rápidos', 'Fastest'), icon: Zap, ringHex: '#2563eb' },
    { key: 'profit', label: dv('Más rentables', 'Most profitable'), icon: DollarSign, ringHex: '#059669' },
  ];

  const getRecommendations = () => {
    if (!recommendations) return [];
    switch (activeTab) {
      case 'fast':
        return recommendations.fastestSelling;
      case 'profit':
        return recommendations.mostProfitable;
      default:
        return recommendations.bestOverall;
    }
  };

  const currentRecommendations = getRecommendations();

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-4 w-48 bg-slate-100 animate-pulse rounded-lg" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!recommendations || currentRecommendations.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white">
        <div className="p-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-[14px] font-semibold text-[#171717]">
              {dv('Recomendaciones de Stock', 'Stock Recommendations')}
            </h3>
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="text-center py-8 rounded-xl bg-slate-50/50">
            <BarChart3 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-[13px] text-slate-400">
              {dv('Se necesitan más ventas para generar recomendaciones', 'More sales needed to generate recommendations')}
            </p>
            <p className="text-[11px] text-slate-300 mt-1">
              {dv('Mínimo 2 ventas por marca', 'Minimum 2 sales per brand')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-[#171717]">
              {dv('Recomendaciones de Stock', 'Stock Recommendations')}
            </h3>
            <p className="text-[12px] text-slate-400">
              {dv('Basadas en historial de ventas', 'Based on sales history')}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 pb-3">
        <div className="flex gap-1.5">
          {tabs.map(({ key, label, icon: Icon, ringHex }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all border ${
                  isActive
                    ? 'border-transparent'
                    : 'border-slate-200/60 bg-white text-slate-500 hover:bg-slate-50 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]'
                }`}
                style={isActive ? { backgroundColor: `${ringHex}10`, boxShadow: `0 0 0 2px ${ringHex}`, color: ringHex } : undefined}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recommendations List */}
      <div className="px-5 pb-5 space-y-2">
        {currentRecommendations.map((rec, index) => (
          <div
            key={`${rec.brandId}-${index}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors"
          >
            {/* Rank */}
            <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${
              index === 0 ? 'bg-amber-100 text-amber-700' :
              index === 1 ? 'bg-slate-200 text-slate-600' :
              index === 2 ? 'bg-orange-100 text-orange-700' :
              'bg-slate-100 text-slate-400'
            }`}>
              {index + 1}
            </div>

            {/* Brand Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-900 truncate">{rec.brandName}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {rec.reasons.slice(0, 3).map((reason, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium">
                    {reason}
                  </span>
                ))}
              </div>
            </div>

            {/* Score */}
            <div className="flex-shrink-0 text-right">
              <p className="text-[15px] font-bold text-slate-900">{rec.overallScore}</p>
              <p className="text-[10px] text-slate-400">score</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StockRecommendationsCard;

import { Search, X, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { LeadStatus } from './leadConstants';

interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeStatus: LeadStatus | null;
  onStatusChange: (status: LeadStatus | null) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
}

export default function LeadFilters({
  search,
  onSearchChange,
  activeStatus,
  onStatusChange,
  hasActiveFilters,
  onReset,
}: LeadFiltersProps) {
  const { t } = useTranslation('leadsPage');

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {/* Search — mobile only, desktop search lives in LeadViewToggle */}
      <div className="relative w-full sm:w-[260px] md:hidden">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={t('filters.searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-9 pl-9 pr-8 rounded-xl bg-white border border-slate-200/60 text-[13px] text-slate-500 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 transition-all shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
          >
            <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>

      {/* Active pills */}
      <AnimatePresence>
        {activeStatus && (
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            layout
            onClick={() => onStatusChange(null)}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-blue-50 text-blue-700 text-[12px] font-medium border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            {t(`status.${activeStatus}`)}
            <X className="w-3 h-3" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Reset */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={onReset}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            {t('filters.clear')}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

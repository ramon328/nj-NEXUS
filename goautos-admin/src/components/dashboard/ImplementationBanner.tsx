import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import {
  X,
  ArrowRight,
  Building2,
  Car,
  Layers,
  Globe,
  MessageSquare,
  FileText,
  Check,
  Rocket,
  ChevronDown,
} from 'lucide-react';
import { useImplementationScore } from '@/hooks/useImplementationScore';
import { motion, AnimatePresence } from 'framer-motion';

const DISMISSED_KEY = 'implementation-banner-dismissed';

const MILESTONE_ICONS: Record<string, typeof Building2> = {
  dealershipData: Building2,
  firstVehicle: Car,
  fiveVehicles: Layers,
  builder: Globe,
  leadManaged: MessageSquare,
  documentGenerated: FileText,
};

interface ImplementationBannerProps {
  className?: string;
}

export default function ImplementationBanner({ className }: ImplementationBannerProps) {
  const { score, milestones, nextStep, isComplete, isLoading } = useImplementationScore();
  const { t } = useTranslation('implementation');
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISSED_KEY) === 'true'
  );
  const [expanded, setExpanded] = useState(false);

  const show = !isLoading && !isComplete && !dismissed;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  const completedCount = milestones.filter((m) => m.completed).length;
  const totalCount = milestones.length;

  // Sort for progress bar: completed first, then pending
  const sortedMilestones = [...milestones].sort((a, b) => Number(b.completed) - Number(a.completed));

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className={`relative bg-white border border-slate-200/60 rounded-2xl px-5 py-4 sm:px-6 sm:py-5 ${className ?? ''}`}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3.5 right-3.5 p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Header row */}
          <div className="flex items-center gap-2.5 pr-8">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-sky-50 shrink-0">
              <Rocket className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="min-w-0 flex-1 flex items-baseline gap-2">
              <p className="text-sm font-semibold text-slate-800 leading-tight shrink-0">
                {t('header', 'Configuración inicial')}
              </p>
              <p className="text-[11px] text-slate-400">
                {t('progress', { completed: completedCount, total: totalCount })}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400 shrink-0 mr-5">{score}%</span>
          </div>

          {/* Segmented progress bar with tooltips */}
          <div className="mt-3 flex gap-1.5">
            {sortedMilestones.map((m, i) => (
              <div key={m.key} className="group/seg relative flex-1">
                <div className={`h-[7px] rounded-full overflow-hidden ${m.completed ? 'bg-sky-400' : 'bg-slate-200/70'}`}>
                  <motion.div
                    className={`h-full rounded-full ${m.completed ? 'bg-sky-400' : 'bg-transparent'}`}
                    initial={{ width: 0 }}
                    animate={{ width: m.completed ? '100%' : '0%' }}
                    transition={{ duration: 0.8, delay: 0.4 + i * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                </div>
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-1 rounded-md bg-slate-800 text-white text-[10px] font-medium whitespace-nowrap opacity-0 group-hover/seg:opacity-100 transition-opacity pointer-events-none">
                  {t(`milestones.${m.key}.label`, t(`milestones.${m.key}.nextStep`))}
                  {m.completed && ' ✓'}
                </div>
              </div>
            ))}
          </div>

          {/* Expand/collapse toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center gap-1 w-full mt-1.5 text-[11px] text-slate-400 hover:text-slate-500 transition-colors"
          >
            <span>{expanded ? t('collapse', 'Ocultar pasos') : t('expand', 'Ver todos los pasos')}</span>
            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>

          {/* Expandable details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-0.5">
                  {/* Pending steps — full detail */}
                  {milestones.filter((m) => !m.completed).map((m) => {
                    const Icon = MILESTONE_ICONS[m.key] ?? FileText;
                    return (
                      <button
                        key={m.key}
                        onClick={() => navigate(m.link)}
                        className="group flex items-center gap-2.5 w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 bg-slate-100 text-slate-400">
                          <Icon className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-slate-600">
                            {t(`milestones.${m.key}.nextStep`)}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {t(`milestones.${m.key}.subtitle`)}
                          </p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-sky-400 transition-colors shrink-0" />
                      </button>
                    );
                  })}

                  {/* Completed steps — compact single line */}
                  {milestones.some((m) => m.completed) && (
                    <div className="pt-1.5 mt-1.5 border-t border-slate-100 space-y-0.5">
                      {milestones.filter((m) => m.completed).map((m) => (
                        <div key={m.key} className="flex items-center gap-2 px-2 py-1">
                          <Check className="h-3 w-3 text-sky-400 shrink-0" strokeWidth={2.5} />
                          <span className="text-[11px] text-slate-400 line-through decoration-slate-300">
                            {t(`milestones.${m.key}.nextStep`)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

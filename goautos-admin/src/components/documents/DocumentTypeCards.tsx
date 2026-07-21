import { motion } from 'framer-motion';

export interface DocTypeConfig {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  ringHex: string;
}

interface DocumentTypeCardsProps {
  types: DocTypeConfig[];
  counts: Record<string, number>;
  totalCount: number;
  activeType: string | null;
  onTypeClick: (type: string | null) => void;
  allLabel?: string;
}

export default function DocumentTypeCards({
  types,
  counts,
  totalCount,
  activeType,
  onTypeClick,
  allLabel = 'Todos',
}: DocumentTypeCardsProps) {
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
  };

  // Only show types that have documents
  const visibleTypes = types.filter((t) => (counts[t.key] || 0) > 0);

  return (
    <>
      {/* Mobile: horizontal scroll pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:hidden scrollbar-none">
        <button
          onClick={() => onTypeClick(null)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0 transition-all duration-200
            ${activeType === null
              ? 'bg-primary text-white ring-2 ring-primary'
              : 'bg-white border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]'
            }
          `}
        >
          <span className={`text-[13px] font-medium whitespace-nowrap ${activeType === null ? 'text-white' : 'text-slate-700'}`}>
            {allLabel}
          </span>
          <span className={`text-[13px] font-semibold ${activeType === null ? 'text-white' : 'text-slate-900'}`}>
            {totalCount}
          </span>
        </button>

        {visibleTypes.map((type) => {
          const Icon = type.icon;
          const isActive = activeType === type.key;
          const count = counts[type.key] || 0;

          return (
            <button
              key={type.key}
              onClick={() => onTypeClick(isActive ? null : type.key)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0 transition-all duration-200
                ${isActive
                  ? `${type.bgColor} ring-2`
                  : 'bg-white border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]'
                }
              `}
              style={isActive ? { boxShadow: `0 0 0 2px ${type.ringHex}` } : undefined}
            >
              <Icon className={`w-3.5 h-3.5 ${type.color}`} />
              <span className={`text-[13px] font-medium whitespace-nowrap ${type.color}`}>
                {type.label}
              </span>
              <span className="text-[13px] font-semibold text-slate-900">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop: horizontal scroll pills */}
      <motion.div
        className="hidden sm:flex gap-2 overflow-x-auto scrollbar-none py-1 px-1"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.button
          variants={item}
          onClick={() => onTypeClick(null)}
          className={`
            flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200
            shadow-[0_1px_4px_-2px_rgba(0,0,0,0.08)] border
            ${activeType === null
              ? 'ring-2 ring-primary border-transparent'
              : 'border-slate-200/60 bg-white hover:shadow-[0_2px_8px_-3px_rgba(0,0,0,0.10)] hover:scale-[1.01]'
            }
          `}
        >
          <span className={`text-[12px] font-medium whitespace-nowrap ${activeType === null ? 'text-slate-900' : 'text-slate-600'}`}>
            {allLabel}
          </span>
          <span className="text-[13px] font-semibold text-slate-900">
            {totalCount}
          </span>
        </motion.button>

        {visibleTypes.map((type) => {
          const Icon = type.icon;
          const isActive = activeType === type.key;
          const count = counts[type.key] || 0;

          return (
            <motion.button
              key={type.key}
              variants={item}
              onClick={() => onTypeClick(isActive ? null : type.key)}
              className={`
                flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200
                shadow-[0_1px_4px_-2px_rgba(0,0,0,0.08)] border
                ${isActive
                  ? 'border-transparent'
                  : 'border-slate-200/60 bg-white hover:shadow-[0_2px_8px_-3px_rgba(0,0,0,0.10)] hover:scale-[1.01]'
                }
              `}
              style={isActive ? {
                backgroundColor: `${type.ringHex}10`,
                boxShadow: `0 0 0 2px ${type.ringHex}, 0 1px 4px -2px rgba(0,0,0,0.08)`,
              } : undefined}
            >
              <Icon className={`w-3.5 h-3.5 ${type.color}`} />
              <span className={`text-[12px] font-medium whitespace-nowrap ${type.color}`}>
                {type.label}
              </span>
              <span className="text-[13px] font-semibold text-slate-900">{count}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </>
  );
}

import { Clock, Trash2 } from 'lucide-react';
import LottieImport from 'lottie-react';
const Lottie = (typeof LottieImport === 'object' && 'default' in LottieImport) ? (LottieImport as any).default : LottieImport;
import aiAnimation from '@/assets/ai-animation.json';

interface GaiaHeaderProps {
  blockCount: number;
  onToggleTimeline: () => void;
  showTimeline: boolean;
  onClearCanvas: () => void;
}

export function GaiaHeader({ blockCount, onToggleTimeline, showTimeline, onClearCanvas }: GaiaHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2 border-b border-slate-100">
      {/* Left — Logo with mini orb */}
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div
            className="absolute inset-[-4px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)' }}
          />
          <div className="absolute inset-[-2px] animate-spin" style={{ animationDuration: '10s' }}>
            <div className="w-full h-full rounded-full" style={{
              background: 'conic-gradient(from 0deg, transparent 0%, transparent 55%, rgba(6,182,212,0.35) 78%, transparent 100%)',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 1px), #fff calc(100% - 1px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 1px), #fff calc(100% - 1px))',
            }} />
          </div>
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-cyan-400/20 via-cyan-500/15 to-blue-600/20" />
          <Lottie animationData={aiAnimation} loop className="relative w-5 h-5" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-bold text-slate-900 tracking-tight">GAIA</span>
          <span className="text-sm text-slate-400 font-normal">Workspace</span>
        </div>
      </div>

      {/* Center — Block count pill */}
      <div className="hidden sm:flex items-center">
        {blockCount > 0 && (
          <span className="px-3 py-1 rounded-full bg-slate-100 text-[11px] font-medium text-slate-500">
            {blockCount} {blockCount === 1 ? 'elemento' : 'elementos'} en canvas
          </span>
        )}
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleTimeline}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all
            ${showTimeline
              ? 'bg-cyan-50 text-cyan-700'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Historial</span>
        </button>

        <button
          onClick={onClearCanvas}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

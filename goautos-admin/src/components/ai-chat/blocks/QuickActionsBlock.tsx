import { Sparkles } from 'lucide-react';

interface QuickActionsBlockProps {
  actions: { label: string; message: string }[];
  onSendMessage: (msg: string) => void;
}

export function QuickActionsBlock({ actions, onSendMessage }: QuickActionsBlockProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <Sparkles className="w-3 h-3" />
        Acciones sugeridas
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(action.message)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium
              border border-slate-200 bg-white text-slate-700
              hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 hover:border-cyan-200 hover:text-cyan-700
              active:scale-[0.96] transition-all shadow-sm"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

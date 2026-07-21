import { X } from 'lucide-react';

export interface TimelineEntry {
  id: string;
  type: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  blockCount?: number;
}

interface ActionTimelineProps {
  entries: TimelineEntry[];
  onClose: () => void;
}

const formatTime = (date: Date) =>
  new Date(date).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const dotColor: Record<TimelineEntry['type'], string> = {
  user: 'bg-cyan-400',
  assistant: 'bg-emerald-400',
  error: 'bg-red-400',
};

export function ActionTimeline({ entries, onClose }: ActionTimelineProps) {
  return (
    <div className="w-80 border-l border-slate-100 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900">Historial</h3>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-slate-400">Sin actividad todavia</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="px-4 py-3 border-b border-slate-50">
              <div className="flex items-start gap-2.5">
                {/* Dot */}
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor[entry.type]}`} />

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm leading-snug ${
                      entry.type === 'error'
                        ? 'text-red-600'
                        : 'text-slate-700'
                    } ${entry.type === 'assistant' ? 'line-clamp-3' : ''}`}
                  >
                    {entry.content}
                  </p>

                  {entry.type === 'assistant' && entry.blockCount != null && entry.blockCount > 0 && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-medium text-emerald-600">
                      {entry.blockCount} {entry.blockCount === 1 ? 'elemento generado' : 'elementos generados'}
                    </span>
                  )}

                  <p className="text-[10px] text-slate-400 mt-1">
                    {formatTime(entry.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

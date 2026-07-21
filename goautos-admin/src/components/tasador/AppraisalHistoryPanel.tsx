import { useMemo } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { formatPrice } from './utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { AppraisalRecord } from '@/hooks/useAppraisalHistory';
import { cn } from '@/lib/utils';

interface AppraisalHistoryPanelProps {
  history: AppraisalRecord[];
  loading: boolean;
  onSelect: (record: AppraisalRecord) => void;
  onDeleted?: () => void;
  selectedId?: number | null;
}

type DateGroup = 'today' | 'yesterday' | 'last7Days' | 'older';

const groupByDate = (records: AppraisalRecord[]): Record<DateGroup, AppraisalRecord[]> => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const last7 = new Date(today);
  last7.setDate(last7.getDate() - 7);

  const groups: Record<DateGroup, AppraisalRecord[]> = {
    today: [],
    yesterday: [],
    last7Days: [],
    older: [],
  };

  for (const r of records) {
    const d = new Date(r.created_at);
    if (d >= today) groups.today.push(r);
    else if (d >= yesterday) groups.yesterday.push(r);
    else if (d >= last7) groups.last7Days.push(r);
    else groups.older.push(r);
  }

  return groups;
};

const groupLabels: Record<DateGroup, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  last7Days: 'Últimos 7 días',
  older: 'Anteriores',
};

const groupOrder: DateGroup[] = ['today', 'yesterday', 'last7Days', 'older'];

const AppraisalHistoryPanel = ({
  history,
  loading,
  onSelect,
  onDeleted,
  selectedId,
}: AppraisalHistoryPanelProps) => {
  const grouped = useMemo(() => groupByDate(history), [history]);

  const handleDelete = async (id: number) => {
    await supabase.from('appraisals').delete().eq('id', id);
    onDeleted?.();
  };

  if (loading) {
    return (
      <div className="space-y-1.5 px-1 pt-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Search className="h-7 w-7 text-slate-300 mb-2" />
        <p className="text-xs text-slate-400">No hay tasaciones anteriores</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[420px]">
      <div className="px-1 pb-2">
        {groupOrder.map((group) => {
          const items = grouped[group];
          if (items.length === 0) return null;

          return (
            <div key={group} className="mt-3 first:mt-0">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider px-2 py-1">
                {groupLabels[group]}
              </p>
              <div className="space-y-px">
                {items.map((record) => {
                  const isActive = record.id === selectedId;
                  const range = record.estimated_range;

                  return (
                    <div
                      key={record.id}
                      className={cn(
                        'group flex items-center rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors min-w-0',
                        isActive
                          ? 'bg-cyan-50 text-cyan-800'
                          : 'hover:bg-slate-100 text-slate-600'
                      )}
                      onClick={() => onSelect(record)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-[11px] truncate leading-tight max-w-full',
                          isActive ? 'font-medium' : ''
                        )} title={record.query}>
                          {record.query.length > 35 ? record.query.slice(0, 35) + '…' : record.query}
                        </p>
                        {range && (
                          <p className="text-[10px] text-slate-400 truncate">
                            {formatPrice(range.low)} — {formatPrice(range.high)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-2.5 w-2.5 text-slate-400 hover:text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar tasación</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro de que quieres eliminar esta tasación? Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDelete(record.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default AppraisalHistoryPanel;

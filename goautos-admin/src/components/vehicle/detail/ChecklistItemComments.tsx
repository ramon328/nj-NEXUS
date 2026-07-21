import React, { useEffect, useState } from 'react';
import { Loader2, Send, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { VehicleChecklistComment } from '@/types/vehicleChecklist';
import {
  getVehicleChecklistComments,
  createVehicleChecklistComment,
  deleteVehicleChecklistComment,
} from '@/services/vehicleChecklistService';

interface ChecklistItemCommentsProps {
  vehicleChecklistId: number;
  onCountChange?: (newCount: number) => void;
}

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-CL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const ChecklistItemComments: React.FC<ChecklistItemCommentsProps> = ({
  vehicleChecklistId,
  onCountChange,
}) => {
  const { userData, userRole } = useAuth();
  const currentUserId = userData?.id ?? null;
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  const [comments, setComments] = useState<VehicleChecklistComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const data = await getVehicleChecklistComments(vehicleChecklistId);
      setComments(data);
      onCountChange?.(data.length);
    } catch (err: any) {
      console.error('Error loading comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleChecklistId]);

  const handleSubmit = async () => {
    const text = draft.trim();
    if (!text || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await createVehicleChecklistComment(
        vehicleChecklistId,
        text,
        currentUserId
      );
      setComments((prev) => {
        const next = [...prev, created];
        onCountChange?.(next.length);
        return next;
      });
      setDraft('');
    } catch (err: any) {
      toast({
        title: 'No se pudo agregar el comentario',
        description: err.message || 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    setDeletingId(commentId);
    try {
      await deleteVehicleChecklistComment(commentId);
      setComments((prev) => {
        const next = prev.filter((c) => c.id !== commentId);
        onCountChange?.(next.length);
        return next;
      });
    } catch (err: any) {
      toast({
        title: 'No se pudo borrar el comentario',
        description: err.message || 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-1 ml-7 mr-2 mb-2 pl-3 border-l-2 border-slate-200 space-y-2">
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Cargando comentarios...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-xs text-slate-400 py-1 flex items-center gap-1.5">
          <MessageSquare className="h-3 w-3" />
          Aún no hay comentarios
        </div>
      ) : (
        <ul className="space-y-1.5">
          {comments.map((c) => {
            const canDelete =
              isAdmin || (currentUserId !== null && c.user_id === currentUserId);
            return (
              <li
                key={c.id}
                className="bg-slate-50 rounded-md px-2.5 py-1.5 text-xs text-slate-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-0.5">
                      <span className="font-medium text-slate-600">
                        {c.author_name || 'Usuario'}
                      </span>
                      <span>·</span>
                      <span>{formatDate(c.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{c.comment}</p>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      className={cn(
                        'text-slate-400 hover:text-red-600 transition-colors p-0.5 rounded',
                        deletingId === c.id && 'opacity-50 pointer-events-none'
                      )}
                      onClick={() => handleDelete(c.id)}
                      title="Borrar comentario"
                    >
                      {deletingId === c.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Agregar un comentario..."
          rows={2}
          className="text-xs resize-none min-h-0 py-1.5"
          disabled={isSubmitting}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={!draft.trim() || isSubmitting}
          className="h-8 px-2.5"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChecklistItemComments;

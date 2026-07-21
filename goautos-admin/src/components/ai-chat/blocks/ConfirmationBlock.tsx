import { useState } from 'react';
import { CheckCircle2, X, Loader2, Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmationBlockProps {
  action: string;
  summary: string;
  details: Record<string, any>;
  onConfirm: () => void;
  onCancel: () => void;
}

function formatValue(value: any): string {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(value).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return String(value);
}

export function ConfirmationBlock({
  action,
  summary,
  details,
  onConfirm,
  onCancel,
}: ConfirmationBlockProps) {
  const [status, setStatus] = useState<'pending' | 'confirming' | 'confirmed' | 'cancelled'>('pending');

  const handleConfirm = () => {
    setStatus('confirming');
    onConfirm();
    setTimeout(() => setStatus('confirmed'), 800);
  };

  const handleCancel = () => {
    setStatus('cancelled');
    onCancel();
  };

  if (status === 'confirmed') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Acción ejecutada</p>
          <p className="text-xs text-emerald-600 mt-0.5">{summary}</p>
        </div>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3 opacity-60">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
          <X className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-500">Acción cancelada</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-white shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 flex items-center gap-2.5 border-b border-amber-100">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Confirmar acción</p>
          <p className="text-xs text-slate-500">{summary}</p>
        </div>
      </div>

      {/* Details */}
      {Object.keys(details).length > 0 && (
        <div className="px-4 py-3 space-y-2">
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{key}</span>
              <span className="text-sm font-semibold text-slate-800">{formatValue(value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 pt-1 flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={status === 'confirming'}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all',
            status === 'confirming'
              ? 'bg-emerald-400 text-white cursor-wait'
              : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white shadow-sm'
          )}
        >
          {status === 'confirming' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {status === 'confirming' ? 'Ejecutando...' : 'Confirmar'}
        </button>
        <button
          onClick={handleCancel}
          disabled={status === 'confirming'}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-slate-500 hover:bg-slate-100 active:scale-[0.97] transition-all"
        >
          Cancelar
        </button>
      </div>

      {/* Security badge */}
      <div className="px-4 pb-3 flex items-center gap-1.5 text-[10px] text-slate-400">
        <Shield className="w-3 h-3" />
        Acción segura — requiere tu confirmación
      </div>
    </div>
  );
}

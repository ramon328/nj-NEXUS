import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, RefreshCw, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVehicleFines } from '@/hooks/useVehicleFines';
import { cn } from '@/lib/utils';

interface VehicleFinesSectionProps {
  vehicleId: number;
  licensePlate?: string;
}

const VehicleFinesSection: React.FC<VehicleFinesSectionProps> = ({
  vehicleId,
  licensePlate,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { storedData, isLoading, isChecking, checkFines } = useVehicleFines({
    vehicleId,
    licensePlate,
    autoFetch: true,
  });

  const handleCheck = () => {
    if (licensePlate) {
      checkFines(licensePlate, vehicleId);
    }
  };

  const hasFines = storedData?.has_fines;
  const finesCount = storedData?.fines_count ?? 0;
  const tickets = storedData?.fines_data ?? [];
  const lastChecked = storedData?.checked_at;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!licensePlate) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {hasFines === true ? (
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
          ) : hasFines === false ? (
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-slate-400" />
            </div>
          )}
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-800">Multas de tránsito</h3>
            {lastChecked && (
              <p className="text-[11px] text-slate-400">
                Última consulta: {formatDate(lastChecked)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {storedData && !isLoading && (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                hasFines
                  ? 'bg-red-50 text-red-700'
                  : 'bg-emerald-50 text-emerald-700'
              )}
            >
              {hasFines ? `${finesCount} multa${finesCount !== 1 ? 's' : ''}` : 'Sin multas'}
            </span>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-slate-400 transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          {/* Loading */}
          {(isLoading || isChecking) && (
            <div className="flex items-center justify-center gap-2 py-6">
              <div className="relative w-4 h-4">
                <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
                <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              </div>
              <span className="text-sm text-slate-500">
                {isChecking ? 'Consultando multas...' : 'Cargando...'}
              </span>
            </div>
          )}

          {/* No data yet */}
          {!isLoading && !isChecking && !storedData && (
            <div className="text-center py-5">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-3">No se han consultado multas aún</p>
              <Button
                onClick={handleCheck}
                variant="outline"
                size="sm"
                className="rounded-lg"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Verificar multas
              </Button>
            </div>
          )}

          {/* Has data - no fines */}
          {!isLoading && !isChecking && storedData && !hasFines && (
            <div className="py-4">
              <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100 mb-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                <p className="text-sm font-semibold text-emerald-700">Sin multas registradas</p>
                <p className="text-xs text-emerald-600 mt-0.5">Este vehículo no tiene multas pendientes</p>
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={handleCheck}
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 hover:text-slate-700 rounded-lg text-xs"
                  disabled={isChecking}
                >
                  <RefreshCw className={cn('w-3 h-3 mr-1.5', isChecking && 'animate-spin')} />
                  Verificar nuevamente
                </Button>
              </div>
            </div>
          )}

          {/* Has fines */}
          {!isLoading && !isChecking && storedData && hasFines && (
            <div className="py-3 space-y-3">
              <div className="text-center p-3 bg-red-50 rounded-xl border border-red-100">
                <p className="text-lg font-bold text-red-700">{finesCount}</p>
                <p className="text-xs text-red-600">{finesCount === 1 ? 'multa registrada' : 'multas registradas'}</p>
              </div>

              {/* Tickets table */}
              {tickets.length > 0 && (
                <div className="rounded-lg border border-slate-200 overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-3 py-2 text-[11px] font-medium text-slate-500 uppercase tracking-wide">Motivo</th>
                        <th className="text-left px-3 py-2 text-[11px] font-medium text-slate-500 uppercase tracking-wide">Año</th>
                        <th className="text-left px-3 py-2 text-[11px] font-medium text-slate-500 uppercase tracking-wide">Monto</th>
                        <th className="text-left px-3 py-2 text-[11px] font-medium text-slate-500 uppercase tracking-wide">Lugar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((ticket, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-xs text-slate-700 max-w-[200px] truncate">{ticket.reason}</td>
                          <td className="px-3 py-2 text-xs text-slate-700">{ticket.year}</td>
                          <td className="px-3 py-2 text-xs text-slate-700 font-medium">{ticket.fine}</td>
                          <td className="px-3 py-2 text-xs text-slate-500 max-w-[150px] truncate">{ticket.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-center">
                <Button
                  onClick={handleCheck}
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 hover:text-slate-700 rounded-lg text-xs"
                  disabled={isChecking}
                >
                  <RefreshCw className={cn('w-3 h-3 mr-1.5', isChecking && 'animate-spin')} />
                  Verificar nuevamente
                </Button>
              </div>
            </div>
          )}

          {/* Error in stored data */}
          {!isLoading && !isChecking && storedData?.error && (
            <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-[11px] text-amber-700">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Última consulta con error: {storedData.error}
              </p>
            </div>
          )}

          <p className="text-[10px] text-slate-400 text-center mt-2">Fuente: Registro Civil (SEM)</p>
        </div>
      )}
    </div>
  );
};

export default VehicleFinesSection;

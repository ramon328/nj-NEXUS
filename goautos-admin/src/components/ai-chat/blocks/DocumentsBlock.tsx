import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDocuments } from '@/components/vehicle/detail/documents/useDocuments';
import DocumentsList from '@/components/vehicle/detail/documents/DocumentsList';
import ExtraDocumentsList from '@/components/vehicle/detail/documents/ExtraDocumentsList';
import type { Vehicle } from '@/types/vehicle';
import { FileText } from 'lucide-react';

interface DocumentsBlockProps {
  vehicleId: number;
  onAction: (msg: string) => void;
}

/**
 * Lista los documentos REALES de un vehículo reusando toda la maquinaria de la
 * ficha: `useDocuments` para traerlos y `DocumentsList` para el visor PDF modal,
 * edición de layout (auto-guardado) y descarga. No reinventa nada.
 */
export function DocumentsBlock({ vehicleId, onAction }: DocumentsBlockProps) {
  const { clientId } = useAuth();
  const { documents, documentTransactions, isLoading, refreshDocuments } = useDocuments(vehicleId);
  const [vehicle, setVehicle] = useState<Vehicle | undefined>(undefined);

  // El vehículo (fila cruda) es necesario para los diálogos de edición de
  // venta/reserva/cierre dentro de DocumentsList.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!vehicleId || !clientId) return;
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .eq('client_id', clientId)
        .maybeSingle();
      if (!cancelled && data) setVehicle(data as Vehicle);
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, clientId]);

  const hasAnything =
    isLoading || documents.length > 0 || documentTransactions.length > 0;

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-50 flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-400" />
        <span className="text-[13px] font-semibold text-slate-700">Documentos del vehículo</span>
        {!isLoading && (
          <span className="ml-auto text-[12px] text-slate-400">
            {documents.length + documentTransactions.length}
          </span>
        )}
      </div>

      <div className="p-3">
        <DocumentsList
          vehicleId={vehicleId}
          documents={documents}
          onRefresh={refreshDocuments}
          vehicle={vehicle}
          isLoading={isLoading}
          isCompact
        />

        {/* Adjuntos de transacciones (gastos/ingresos con archivo) */}
        {documentTransactions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[11px] font-medium text-slate-400 mb-2">Adjuntos de transacciones</p>
            <ExtraDocumentsList
              documents={documentTransactions}
              onRefresh={refreshDocuments}
              isCompact
            />
          </div>
        )}

        {!hasAnything && (
          <button
            onClick={() => onAction(`Genera un documento para el vehículo ID ${vehicleId}`)}
            className="mt-1 text-[13px] font-medium text-cyan-600 hover:text-cyan-700"
          >
            Generar un documento
          </button>
        )}
      </div>
    </div>
  );
}

export default DocumentsBlock;

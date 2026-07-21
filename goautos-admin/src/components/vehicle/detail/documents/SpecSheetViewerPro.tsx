import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import { buildVehicleSpecSheetBlob } from '@/utils/vehicleSpecSheet';
import { useAutoDownloadPdf } from '@/hooks/useAutoDownloadPdf';

interface SpecSheetViewerProProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: number;
  clientId?: number | null;
  /** Si true, genera el PDF y lo descarga solo (sin preview), luego cierra. */
  autoDownload?: boolean;
}

/**
 * Viewer de la ficha técnica: muestra el PDF en preview (como el resto de docs),
 * con botón para descargar. Genera el PDF on-demand con la plantilla del cliente.
 */
const SpecSheetViewerPro: React.FC<SpecSheetViewerProProps> = ({
  isOpen,
  onClose,
  vehicleId,
  clientId,
  autoDownload,
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState('Ficha técnica');
  const [loading, setLoading] = useState(true);

  useAutoDownloadPdf(autoDownload, pdfBlob, `${fileName}.pdf`, onClose);

  useEffect(() => {
    if (!isOpen) return;
    let url: string | null = null;
    setLoading(true);
    setPdfUrl(null);
    setPdfBlob(null);
    buildVehicleSpecSheetBlob(vehicleId, clientId)
      .then(({ blob, fileName: fn }) => {
        setPdfBlob(blob);
        setFileName(fn);
        url = URL.createObjectURL(blob);
        setPdfUrl(url);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [isOpen, vehicleId, clientId]);

  const handleDownload = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Modo auto-descarga: el hook baja el PDF y cierra; solo mostramos "Generando...".
  if (autoDownload) {
    return (
      <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-xs">
          <div className="py-8 flex items-center justify-center gap-2 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Generando ficha...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-sm font-medium text-slate-700">Ficha técnica</span>
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={!pdfBlob}
            className="h-8 text-[13px]"
          >
            <Download className="w-4 h-4 mr-1.5" /> Descargar
          </Button>
        </div>
        <div className="flex-1 min-h-0 bg-slate-100">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              title="Ficha técnica"
              className="w-full h-full border-0"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              No se pudo generar la ficha técnica.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpecSheetViewerPro;

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Save, Check, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  SPEC_SHEET_FIELDS,
  type SpecSheetFieldKey,
  type SpecSheetTemplate,
} from '@/components/documents/pdf/VehicleSpecSheetPDF';
import {
  loadSpecSheetTemplate,
  saveSpecSheetTemplate,
  downloadVehicleSpecSheet,
} from '@/utils/vehicleSpecSheet';
import { toast } from '@/hooks/use-toast';

interface SpecSheetTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  vehicleId: number;
  clientId?: number | null;
  /** Se llama cuando la ficha queda archivada como documento del vehículo. */
  onSaved?: () => void;
}

/**
 * Editor de la "plantilla" de la ficha técnica: el cliente elige qué campos salen.
 * La selección se guarda por cliente (se aplica a las próximas fichas) y se puede
 * editar cuando quiera. También permite descargar la ficha con la selección actual.
 */
export const SpecSheetTemplateDialog: React.FC<SpecSheetTemplateDialogProps> = ({
  open,
  onClose,
  vehicleId,
  clientId,
  onSaved,
}) => {
  const [config, setConfig] = useState<SpecSheetTemplate>({ fields: {} });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadSpecSheetTemplate(clientId)
      .then((c) => setConfig(c || { fields: {} }))
      .finally(() => setLoading(false));
  }, [open, clientId]);

  const isOn = (key: SpecSheetFieldKey) => config.fields?.[key] !== false;
  const toggle = (key: SpecSheetFieldKey) =>
    setConfig((prev) => ({
      ...prev,
      fields: { ...prev.fields, [key]: prev.fields?.[key] === false ? true : false },
    }));

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadVehicleSpecSheet(vehicleId, clientId, config);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo generar la ficha técnica.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      await saveSpecSheetTemplate(clientId, config);
      toast({
        title: 'Plantilla guardada',
        description: 'Se aplicará a las próximas fichas técnicas.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Deja la ficha técnica ARCHIVADA como documento del vehículo (aparece en la pestaña
  // Documentos; al abrirla se genera el PDF con la plantilla actual). Una por vehículo.
  const handleSaveAsDocument = async () => {
    if (!clientId) return;
    setSavingDoc(true);
    try {
      const { data: existing } = await supabase
        .from('vehicles_documents')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .eq('type', 'spec_sheet')
        .limit(1)
        .maybeSingle();
      if (!existing) {
        const { error } = await supabase.from('vehicles_documents').insert({
          client_id: clientId,
          vehicle_id: vehicleId,
          type: 'spec_sheet',
          status: 'completed',
        });
        if (error) throw error;
      }
      toast({
        title: 'Ficha guardada en documentos',
        description: 'Quedó en la pestaña Documentos del vehículo.',
      });
      onSaved?.();
    } catch {
      toast({
        title: 'No se pudo guardar como documento',
        description: 'Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setSavingDoc(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-800">Ficha técnica — campos a mostrar</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-slate-500">
              Elige qué campos salen en la ficha. Marca y modelo siempre aparecen. Un campo
              solo se muestra si está marcado <span className="text-slate-400">y</span> el
              vehículo tiene ese dato cargado.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {SPEC_SHEET_FIELDS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => toggle(f.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] text-left transition-colors ${
                    isOn(f.key)
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                      isOn(f.key) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                    }`}
                  >
                    {isOn(f.key) && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className="truncate">{f.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={saving || !clientId}
                className="flex-1 h-9 text-[13px]"
                title={!clientId ? 'Sin cliente identificado' : 'Guardar como plantilla del cliente'}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1.5" />
                )}
                Guardar plantilla
              </Button>
              <Button onClick={handleDownload} disabled={downloading} className="flex-1 h-9 text-[13px]">
                {downloading ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-1.5" />
                )}
                Descargar ficha
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={handleSaveAsDocument}
              disabled={savingDoc || !clientId}
              className="w-full h-8 text-[12px] text-slate-500 hover:text-slate-700"
            >
              {savingDoc ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5 mr-1.5" />
              )}
              Guardar como documento del vehículo
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SpecSheetTemplateDialog;

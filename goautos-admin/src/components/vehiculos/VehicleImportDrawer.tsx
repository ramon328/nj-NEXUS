import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useVehicleImport } from '@/hooks/useVehicleImport';
import { downloadVehicleImportTemplate } from '@/utils/excelExport';
import { useAuth } from '@/contexts/AuthContext';
import posthog from '@/utils/posthog';

interface VehicleImportDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

const VehicleImportDrawer = ({
  open,
  onOpenChange,
  onImportComplete,
}: VehicleImportDrawerProps) => {
  const { user } = useAuth();
  const {
    parsedData,
    validationErrors,
    importResult,
    isImporting,
    progress,
    handleFileUpload,
    importVehicles,
    reset,
  } = useVehicleImport();

  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    await handleFileUpload(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleClose = () => {
    if (!isImporting) {
      reset();
      setFileName(null);
      onOpenChange(false);
    }
  };

  const handleImport = async () => {
    await importVehicles();

    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'vehicle_imported',
      properties: {
        vehicle_count: parsedData.length,
        file_name: fileName,
      },
    });

    onImportComplete();
  };

  const criticalErrors = validationErrors.filter((e) =>
    ['Marca', 'Modelo', 'Año', 'Precio'].includes(e.field)
  );
  const hasCriticalErrors = criticalErrors.length > 0;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-[15px]">Importar Vehículos</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pt-4">
          {/* Step 1: Download template */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-[11px] font-bold">
                1
              </div>
              <p className="text-[13px] font-semibold text-slate-800">
                Descargar plantilla
              </p>
            </div>
            <p className="text-[12px] text-slate-500">
              Descarga la plantilla Excel con el formato correcto y las
              instrucciones de cada campo.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg text-[12px]"
              onClick={downloadVehicleImportTemplate}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Descargar Plantilla .xlsx
            </Button>
          </div>

          {/* Step 2: Upload file */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-[11px] font-bold">
                2
              </div>
              <p className="text-[13px] font-semibold text-slate-800">
                Subir archivo completado
              </p>
            </div>
            <p className="text-[12px] text-slate-500">
              Sube el archivo Excel con los datos de los vehículos a importar.
            </p>

            {!fileName ? (
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="bg-slate-50 rounded-full p-3">
                    <FileSpreadsheet className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-[12px] text-slate-500">
                    Formato permitido: .xlsx, .xls
                  </p>
                  <Button asChild size="sm" className="rounded-lg text-[12px]">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        disabled={isImporting}
                      />
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Seleccionar Archivo
                    </label>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span className="text-[12px] font-medium text-slate-700 truncate max-w-[200px]">
                    {fileName}
                  </span>
                </div>
                {!isImporting && !importResult && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-7"
                    onClick={() => {
                      reset();
                      setFileName(null);
                    }}
                  >
                    Cambiar
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Validation errors */}
          {validationErrors.length > 0 && !importResult && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-[13px] font-semibold text-amber-800">
                  {hasCriticalErrors
                    ? 'Errores que deben corregirse'
                    : 'Advertencias'}
                </p>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {validationErrors.map((err, i) => (
                  <p key={i} className="text-[11px] text-amber-700">
                    Fila {err.row}: {err.message} ({err.field})
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {parsedData.length > 0 && !importResult && (
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-[11px] font-bold">
                  3
                </div>
                <p className="text-[13px] font-semibold text-slate-800">
                  Confirmar importación
                </p>
              </div>
              <p className="text-[12px] text-slate-500">
                Se encontraron{' '}
                <span className="font-semibold text-slate-700">
                  {parsedData.length}
                </span>{' '}
                vehículos para importar.
              </p>

              {/* Mini preview table */}
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium text-slate-600">
                          #
                        </th>
                        <th className="px-2 py-1.5 text-left font-medium text-slate-600">
                          Marca
                        </th>
                        <th className="px-2 py-1.5 text-left font-medium text-slate-600">
                          Modelo
                        </th>
                        <th className="px-2 py-1.5 text-left font-medium text-slate-600">
                          Año
                        </th>
                        <th className="px-2 py-1.5 text-right font-medium text-slate-600">
                          Precio
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 10).map((row, i) => (
                        <tr
                          key={i}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-2 py-1.5 text-slate-400">
                            {i + 1}
                          </td>
                          <td className="px-2 py-1.5 text-slate-700">
                            {row.Marca}
                          </td>
                          <td className="px-2 py-1.5 text-slate-700">
                            {row.Modelo}
                          </td>
                          <td className="px-2 py-1.5 text-slate-700">
                            {row.Año}
                          </td>
                          <td className="px-2 py-1.5 text-right text-slate-700">
                            {Number(row.Precio).toLocaleString('es-CL', {
                              style: 'currency',
                              currency: 'CLP',
                              maximumFractionDigits: 0,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 10 && (
                  <div className="px-2 py-1.5 bg-slate-50 text-[11px] text-slate-500 text-center border-t border-slate-200">
                    y {parsedData.length - 10} más...
                  </div>
                )}
              </div>

              {/* Import progress */}
              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                    <span className="text-[12px] text-slate-600">
                      Importando... {progress}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}

              <Button
                className="w-full rounded-lg text-[13px]"
                onClick={handleImport}
                disabled={isImporting || hasCriticalErrors}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar {parsedData.length} vehículos
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Result */}
          {importResult && (
            <div className="space-y-3">
              {importResult.success > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <p className="text-[13px] font-semibold text-emerald-800">
                      {importResult.success} vehículos importados correctamente
                    </p>
                  </div>
                </div>
              )}

              {importResult.duplicates.length > 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <p className="text-[13px] font-semibold text-blue-800">
                      {importResult.duplicates.length} duplicados omitidos
                    </p>
                  </div>
                  <p className="text-[11px] text-blue-700">
                    Estos vehículos ya existían en tu inventario (misma patente o
                    N° de chasis) y no se volvieron a cargar.
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.duplicates.map((dup, i) => (
                      <p key={i} className="text-[11px] text-blue-700">
                        Fila {dup.row} ({dup.vehicle}): {dup.reason}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <p className="text-[13px] font-semibold text-red-800">
                      {importResult.errors.length} errores
                    </p>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-[11px] text-red-700">
                        Fila {err.row} ({err.vehicle}): {err.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full rounded-lg text-[13px]"
                onClick={handleClose}
              >
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default VehicleImportDrawer;

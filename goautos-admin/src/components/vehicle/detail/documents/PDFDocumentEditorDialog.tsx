import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, Wand2, RotateCcw, ChevronDown,
  AlertTriangle, FileText,
  Type, AlignJustify, Eye, PenLine, Layers,
  MousePointerClick,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PDFLayoutConfig, PDFPageSize, DEFAULT_PDF_LAYOUT } from '@/types/document-template';
import DownloadPDFButtonGeneric from './DownloadPDFButtonGeneric';

// ─── Sub-components ────────────────────────────────────────────────────────

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, step, unit = '', onChange, disabled }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className="text-[11px] font-mono font-semibold text-gray-700 tabular-nums">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      disabled={disabled}
      className="w-full h-[3px] bg-gray-200 rounded-full appearance-none cursor-pointer accent-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
    />
    <div className="flex justify-between text-[9px] text-gray-300">
      <span>{min}</span>
      <span>{max}</span>
    </div>
  </div>
);


interface AccordionSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/70 text-left transition-colors"
      >
        <div className="flex items-center gap-2 text-gray-500">
          {icon}
          <span className="text-[10px] font-bold uppercase tracking-widest">{title}</span>
        </div>
        <ChevronDown className={cn('h-3.5 w-3.5 text-gray-400 transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>}
    </div>
  );
};

// ─── Presets ───────────────────────────────────────────────────────────────

const PRESETS: Record<string, PDFLayoutConfig> = {
  Normal: DEFAULT_PDF_LAYOUT,
  Compacto: {
    ...DEFAULT_PDF_LAYOUT,
    pageMarginH: 26,
    pageMarginV: 16,
    sectionSpacing: 6,
    signaturesMarginTop: 11,
    termsFontSize: 7,
    notesFontSize: 7.5,
  },
  Mínimo: {
    ...DEFAULT_PDF_LAYOUT,
    pageMarginH: 22,
    pageMarginV: 12,
    sectionSpacing: 3,
    signaturesMarginTop: 6,
    termsFontSize: 6.5,
    notesFontSize: 7,
  },
};

const PAGE_SIZES: { value: PDFPageSize; label: string; sub: string }[] = [
  { value: 'A4',     label: 'A4',    sub: '210×297' },
  { value: 'LETTER', label: 'Carta', sub: '216×279' },
  { value: 'A5',     label: 'A5',    sub: '148×210' },
];

// ─── Main component ────────────────────────────────────────────────────────

export interface PDFDocumentEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;

  layoutConfig: PDFLayoutConfig;
  onLayoutConfigChange: (config: PDFLayoutConfig) => void;

  pdfUrl: string | null;
  pdfBlob: Blob | null;
  generatingPdf: boolean;
  pageCount: number;

  // Original document text (for the content editor panel)
  notes?: string;
  terms?: string;

  // For DownloadPDFButtonGeneric
  documentType: string;
  documentId: string;
  documentData: any;
  extraPageConfig?: any;

  onAutoFit: () => Promise<void>;
  autoFitting: boolean;

  // Dynamic section visibility toggles for this document type
  availableSections?: Array<{ key: keyof PDFLayoutConfig; label: string }>;

  loading?: boolean;
  error?: string;

  // Editable HTML preview (rendered when in edit mode)
  editablePreview?: React.ReactNode;
}

const PDFDocumentEditorDialog: React.FC<PDFDocumentEditorDialogProps> = ({
  isOpen,
  onClose,
  title,
  layoutConfig,
  onLayoutConfigChange,
  pdfUrl,
  pdfBlob,
  generatingPdf,
  pageCount,
  notes,
  terms,
  documentType,
  documentId,
  documentData,
  extraPageConfig,
  onAutoFit,
  autoFitting,
  availableSections,
  loading,
  error,
  editablePreview,
}) => {
  const [editMode, setEditMode] = useState(false);
  const lc = layoutConfig;
  const upd = (partial: Partial<PDFLayoutConfig>) => onLayoutConfigChange({ ...lc, ...partial });
  const busy = generatingPdf || autoFitting;

  // Apply a layout preset while preserving content edits
  const applyLayout = (preset: PDFLayoutConfig) => {
    onLayoutConfigChange({
      ...preset,
      notesOverride: lc.notesOverride,
      termsOverride: lc.termsOverride,
      contentOverrides: lc.contentOverrides,
    });
  };

  // Derived content values
  const notesValue = lc.notesOverride !== null && lc.notesOverride !== undefined ? lc.notesOverride : (notes ?? '');
  const termsValue = lc.termsOverride !== null && lc.termsOverride !== undefined ? lc.termsOverride : (terms ?? '');

  const clearLineBreaks = (type: 'notes' | 'terms') => {
    const current = type === 'notes' ? notesValue : termsValue;
    const cleaned = current.replace(/\r\n|\r|\n/g, ' ').replace(/ {2,}/g, ' ').trim();
    upd(type === 'notes' ? { notesOverride: cleaned } : { termsOverride: cleaned });
  };

  // Compare only layout keys (ignore content overrides) for active preset detection
  const layoutOnly = (c: PDFLayoutConfig) => {
    const { notesOverride, termsOverride, contentOverrides, ...rest } = c;
    return rest;
  };
  const activePreset = Object.entries(PRESETS).find(
    ([, v]) => JSON.stringify(layoutOnly(v)) === JSON.stringify(layoutOnly(lc))
  )?.[0];

  const showContentSection = notes !== undefined || terms !== undefined;
  const hasNonDefaultConfig = JSON.stringify(layoutOnly(lc)) !== JSON.stringify(layoutOnly(DEFAULT_PDF_LAYOUT));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-none w-[calc(100vw-24px)] h-[calc(100vh-24px)] p-0 overflow-hidden flex flex-col gap-0 rounded-xl"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-white shrink-0 pr-12">
          <h2 className="text-sm font-semibold text-gray-800 truncate min-w-0">{title}</h2>

          {/* Page count badge */}
          {!loading && (pageCount === 0 ? (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full shrink-0">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Generando...</span>
            </div>
          ) : pageCount === 1 ? (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full shrink-0">
              <FileText className="h-3.5 w-3.5" />
              <span>1 página</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full shrink-0">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{pageCount} páginas</span>
            </div>
          ))}

          {/* Auto-fit shortcut when overflowing */}
          {pageCount > 1 && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 bg-slate-800 hover:bg-slate-700 shrink-0"
              onClick={onAutoFit}
              disabled={busy}
            >
              {autoFitting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Wand2 className="h-3.5 w-3.5" />
              }
              Ajustar a 1 página
            </Button>
          )}

          {/* View mode toggle */}
          {editablePreview && !loading && (
            <Button
              size="sm"
              variant="outline"
              className={cn(
                'h-7 text-xs gap-1.5 shrink-0 ml-auto',
                editMode
                  ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  : 'border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300'
              )}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Ver PDF
                </>
              ) : (
                <>
                  <PenLine className="h-3.5 w-3.5" />
                  Editar
                </>
              )}
            </Button>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden relative">

          {/* Preview panel (left) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-gray-500">Cargando documento...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center px-8">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            ) : !documentData ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-gray-400">Sin datos de documento</p>
              </div>
            ) : editMode && editablePreview ? (
              /* ─── Editable HTML preview ─── */
              <div className="relative flex-1 flex flex-col overflow-hidden">
                {/* Edit mode hint bar */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border-b border-blue-100 shrink-0">
                  <PenLine className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="text-[11px] text-blue-600 font-medium">
                    Haz clic en cualquier campo para editarlo
                  </span>
                  <span className="text-[10px] text-blue-400 ml-auto shrink-0">Se guarda automáticamente</span>
                </div>
                <div className="flex-1 overflow-auto">
                  {editablePreview}
                </div>
              </div>
            ) : (
              <div className="relative flex-1">
                {/* Overlay while regenerating */}
                {(generatingPdf || autoFitting) && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                    <div className="flex items-center gap-2.5 bg-white rounded-xl shadow-lg px-5 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-gray-700 font-medium">
                        {autoFitting ? 'Ajustando diseño...' : 'Generando PDF...'}
                      </span>
                    </div>
                  </div>
                )}
                {pdfUrl ? (
                  <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    width="100%"
                    height="100%"
                    title="Vista previa del documento"
                    style={{ border: 'none' }}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right editor panel — hidden on mobile */}
          <div className="hidden md:flex w-64 shrink-0 border-l bg-gray-50 overflow-y-auto flex-col">

            {/* Presets */}
            <div className="px-4 py-3 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Configuración rápida</p>
                <TooltipProvider delayDuration={200}>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => applyLayout(DEFAULT_PDF_LAYOUT)}
                          disabled={busy || !hasNonDefaultConfig}
                          className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left"><p className="text-xs">Restaurar</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={onAutoFit}
                          disabled={busy}
                          className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {autoFitting
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Wand2 className="h-4 w-4" />
                          }
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left"><p className="text-xs">Auto-ajustar</p></TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
              <div className="flex gap-1.5">
                {Object.keys(PRESETS).map((name) => (
                  <button
                    key={name}
                    onClick={() => applyLayout(PRESETS[name])}
                    disabled={busy}
                    className={cn(
                      'flex-1 text-xs py-1.5 rounded-md border transition-all font-medium disabled:opacity-50',
                      activePreset === name
                        ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-slate-400 hover:text-slate-800'
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Page setup */}
            <AccordionSection title="Página" icon={<Layers className="h-3.5 w-3.5" />} defaultOpen={false}>
              <div>
                <p className="text-[10px] text-gray-400 mb-1.5">Tamaño de hoja</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {PAGE_SIZES.map(({ value, label, sub }) => (
                    <button
                      key={value}
                      onClick={() => upd({ pageSize: value })}
                      disabled={busy}
                      className={cn(
                        'py-2 rounded-lg border text-center transition-all disabled:opacity-50',
                        lc.pageSize === value
                          ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-slate-400'
                      )}
                    >
                      <div className="text-[11px] font-bold">{label}</div>
                      <div className={cn('text-[9px]', lc.pageSize === value ? 'text-slate-300' : 'text-gray-400')}>
                        {sub}mm
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <SliderRow
                label="Márgenes horizontales"
                value={lc.pageMarginH}
                min={10} max={55} step={1} unit="pt"
                onChange={v => upd({ pageMarginH: v })}
                disabled={busy}
              />
              <SliderRow
                label="Márgenes verticales"
                value={lc.pageMarginV}
                min={8} max={45} step={1} unit="pt"
                onChange={v => upd({ pageMarginV: v })}
                disabled={busy}
              />
            </AccordionSection>

            {/* Spacing */}
            <AccordionSection title="Espaciado" icon={<AlignJustify className="h-3.5 w-3.5" />} defaultOpen={false}>
              <SliderRow
                label="Entre secciones"
                value={lc.sectionSpacing}
                min={1} max={22} step={0.5} unit="pt"
                onChange={v => upd({ sectionSpacing: v })}
                disabled={busy}
              />
              <SliderRow
                label="Margen superior firmas"
                value={lc.signaturesMarginTop}
                min={2} max={45} step={1} unit="pt"
                onChange={v => upd({ signaturesMarginTop: v })}
                disabled={busy}
              />
            </AccordionSection>

            {/* Typography */}
            <AccordionSection title="Tipografía" icon={<Type className="h-3.5 w-3.5" />} defaultOpen={false}>
              <SliderRow
                label="Texto términos"
                value={lc.termsFontSize}
                min={4} max={12} step={0.5} unit="pt"
                onChange={v => upd({ termsFontSize: v })}
                disabled={busy}
              />
              <SliderRow
                label="Texto observaciones"
                value={lc.notesFontSize}
                min={5} max={14} step={0.5} unit="pt"
                onChange={v => upd({ notesFontSize: v })}
                disabled={busy}
              />
            </AccordionSection>

            {/* Section visibility */}
            <AccordionSection title="Secciones" icon={<Eye className="h-3.5 w-3.5" />}>
              <div className="space-y-3">
                {availableSections && availableSections.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{label}</span>
                    <Switch
                      checked={(lc as any)[key] !== false}
                      onCheckedChange={v => upd({ [key]: v } as any)}
                      disabled={busy}
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Observaciones</span>
                  <Switch
                    checked={lc.showNotes !== false}
                    onCheckedChange={v => upd({ showNotes: v })}
                    disabled={busy}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Términos y condiciones</span>
                  <Switch
                    checked={lc.showTerms !== false}
                    onCheckedChange={v => upd({ showTerms: v })}
                    disabled={busy}
                  />
                </div>
              </div>
            </AccordionSection>

            {/* Content editing */}
            {showContentSection && (
              <AccordionSection title="Editar contenido" icon={<PenLine className="h-3.5 w-3.5" />} defaultOpen={false}>
                {notes !== undefined && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-gray-600">Observaciones</label>
                      <button
                        onClick={() => clearLineBreaks('notes')}
                        className="text-[10px] text-primary hover:text-primary/80 hover:underline"
                      >
                        Limpiar saltos de línea
                      </button>
                    </div>
                    <Textarea
                      value={notesValue}
                      onChange={e => upd({ notesOverride: e.target.value })}
                      rows={4}
                      className="text-[11px] resize-none leading-relaxed"
                      placeholder="Sin observaciones"
                      disabled={lc.showNotes === false}
                    />
                    {lc.notesOverride !== null && lc.notesOverride !== undefined && (
                      <button
                        onClick={() => upd({ notesOverride: null })}
                        className="text-[10px] text-gray-400 hover:text-gray-600"
                      >
                        ↺ Restaurar texto original
                      </button>
                    )}
                  </div>
                )}
                {terms !== undefined && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-gray-600">Términos y condiciones</label>
                      <button
                        onClick={() => clearLineBreaks('terms')}
                        className="text-[10px] text-primary hover:text-primary/80 hover:underline"
                      >
                        Limpiar saltos de línea
                      </button>
                    </div>
                    <Textarea
                      value={termsValue}
                      onChange={e => upd({ termsOverride: e.target.value })}
                      rows={6}
                      className="text-[11px] resize-none leading-relaxed"
                      placeholder="Sin términos"
                      disabled={lc.showTerms === false}
                    />
                    {lc.termsOverride !== null && lc.termsOverride !== undefined && (
                      <button
                        onClick={() => upd({ termsOverride: null })}
                        className="text-[10px] text-gray-400 hover:text-gray-600"
                      >
                        ↺ Restaurar texto original
                      </button>
                    )}
                  </div>
                )}
              </AccordionSection>
            )}

            {/* Spacer to push footer to bottom */}
            <div className="flex-1" />

            {/* Sticky footer with actions */}
            {documentData && (
              <div className="sticky bottom-0 border-t bg-white p-3 shrink-0">
                <div className="flex gap-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <DownloadPDFButtonGeneric
                      documentType={documentType}
                      documentId={documentId}
                      documentData={documentData}
                      extraPageConfig={extraPageConfig}
                      pdfBlob={pdfBlob}
                      isPrintButton={true}
                      compact={true}
                      fullWidth={true}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DownloadPDFButtonGeneric
                      documentType={documentType}
                      documentId={documentId}
                      documentData={documentData}
                      extraPageConfig={extraPageConfig}
                      pdfBlob={pdfBlob}
                      isPrintButton={false}
                      compact={true}
                      fullWidth={true}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile floating actions — bottom-right, icon-only */}
          {!loading && documentData && (
            <div className="absolute bottom-4 right-4 z-20 flex md:hidden flex-col gap-2">
              <Button
                size="icon"
                className="h-10 w-10 rounded-full bg-slate-800 hover:bg-slate-700 shadow-lg"
                onClick={onAutoFit}
                disabled={busy}
                title="Auto-ajustar"
              >
                {autoFitting
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Wand2 className="h-4 w-4" />
                }
              </Button>
              <div className="flex-shrink-0">
                <DownloadPDFButtonGeneric
                  documentType={documentType}
                  documentId={documentId}
                  documentData={documentData}
                  extraPageConfig={extraPageConfig}
                  pdfBlob={pdfBlob}
                  isPrintButton={true}
                  compact={true}
                />
              </div>
              <div className="flex-shrink-0">
                <DownloadPDFButtonGeneric
                  documentType={documentType}
                  documentId={documentId}
                  documentData={documentData}
                  extraPageConfig={extraPageConfig}
                  pdfBlob={pdfBlob}
                  isPrintButton={false}
                  compact={true}
                />
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFDocumentEditorDialog;

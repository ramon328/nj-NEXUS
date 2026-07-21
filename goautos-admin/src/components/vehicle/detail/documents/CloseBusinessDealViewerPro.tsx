import React, { useState, useEffect, useCallback, useRef } from 'react';
import { pdf } from '@react-pdf/renderer';
import { useAutoDownloadPdf } from '@/hooks/useAutoDownloadPdf';
import { PDFDocument } from 'pdf-lib';
import CloseBusinessDealPDF from '@/components/documents/pdf/CloseBusinessDealPDF';
import { useCloseBusinessDealNoteData } from '@/hooks/documents/useCloseBusinessDealNoteData';
import { supabase } from '@/integrations/supabase/client';
import { PDFLayoutConfig, DEFAULT_PDF_LAYOUT } from '@/types/document-template';
import { autoFitToOnePage } from '@/utils/pdfAutoFit';
import PDFDocumentEditorDialog from './PDFDocumentEditorDialog';
import GenericDocumentHTMLPreview from '@/components/documents/editor/GenericDocumentHTMLPreview';
import { buildCloseBusinessDealSchema } from '@/config/document-editor';

const SECTIONS: Array<{ key: keyof PDFLayoutConfig; label: string }> = [
  { key: 'showClientData', label: 'Datos del cliente' },
  { key: 'showVehicleDetails', label: 'Datos del vehículo' },
  { key: 'showFinancialDetails', label: 'Detalle financiero' },
  { key: 'showCommission', label: 'Comisión automotora' },
  { key: 'showSignatures', label: 'Firmas' },
];

interface CloseBusinessDealViewerProProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  /** Genera y descarga el PDF directo (sin interacción), luego cierra. */
  autoDownload?: boolean;
}

const CloseBusinessDealViewerPro: React.FC<CloseBusinessDealViewerProProps> = ({
  isOpen,
  onClose,
  documentId,
  autoDownload,
}) => {
  const { data: documentData, loading, error, refetch } = useCloseBusinessDealNoteData(documentId);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  useAutoDownloadPdf(autoDownload, pdfBlob, `liquidacion_venta_${documentId}.pdf`, onClose);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [layoutConfig, setLayoutConfig] = useState<PDFLayoutConfig>(DEFAULT_PDF_LAYOUT);
  const [pageCount, setPageCount] = useState(0);
  const [autoFitting, setAutoFitting] = useState(false);
  const [savedDocumentLayoutConfig, setSavedDocumentLayoutConfig] = useState<any>(undefined);
  const initializedRef = useRef(false);

  // Fetch saved layout_config from vehicles_documents
  useEffect(() => {
    if (!documentId || !isOpen) return;
    const fetchLayoutConfig = async () => {
      try {
        const { data: docData } = await supabase
          .from('vehicles_documents').select('layout_config').eq('id', documentId).single();
        if (docData) setSavedDocumentLayoutConfig(docData.layout_config || undefined);
      } catch (err) {
        console.error('Error fetching layout config:', err);
      }
    };
    fetchLayoutConfig();
  }, [documentId, isOpen]);

  // Refetch data every time the dialog opens to pick up vehicle changes
  useEffect(() => {
    if (isOpen && documentId) {
      initializedRef.current = false;
      refetch();
    }
  }, [isOpen]);

  // Initialize layoutConfig from saved document-level config (once per open)
  useEffect(() => {
    if (!documentData || initializedRef.current) return;
    initializedRef.current = true;

    if (savedDocumentLayoutConfig) {
      setLayoutConfig({
        ...DEFAULT_PDF_LAYOUT,
        ...(documentData.layoutConfig || {}),
        ...savedDocumentLayoutConfig,
      });
    } else if (documentData.layoutConfig) {
      setLayoutConfig({ ...DEFAULT_PDF_LAYOUT, ...documentData.layoutConfig });
    }
  }, [documentData, savedDocumentLayoutConfig]);

  // Auto-save layoutConfig to vehicles_documents (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!documentId || !initializedRef.current) return;

    const hasOverrides =
      layoutConfig.contentOverrides && Object.keys(layoutConfig.contentOverrides).length > 0;
    const hasNotesOverride = layoutConfig.notesOverride != null;
    const hasTermsOverride = layoutConfig.termsOverride != null;
    const isNonDefaultLayout = JSON.stringify({
      ...layoutConfig,
      contentOverrides: undefined,
      notesOverride: null,
      termsOverride: null,
    }) !== JSON.stringify({
      ...DEFAULT_PDF_LAYOUT,
      contentOverrides: undefined,
      notesOverride: null,
      termsOverride: null,
    });

    if (!hasOverrides && !hasNotesOverride && !hasTermsOverride && !isNonDefaultLayout) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await supabase
          .from('vehicles_documents')
          .update({ layout_config: layoutConfig })
          .eq('id', documentId);
      } catch (err) {
        console.error('Error saving document layout config:', err);
      }
    }, 1500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [layoutConfig, documentId]);

  const pdfTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!documentData) return;
    const generatePdf = async () => {
      setGeneratingPdf(true);
      try {
        const doc = <CloseBusinessDealPDF {...documentData} layoutConfig={layoutConfig} />;
        let blob = await pdf(doc).toBlob();

        if (documentData.extraPageConfig?.enabled && documentData.extraPageConfig.files?.length > 0) {
          try {
            const mainPdfBytes = await blob.arrayBuffer();
            const mainPdfDoc = await PDFDocument.load(mainPdfBytes);
            for (const file of documentData.extraPageConfig.files) {
              if (file.type === 'pdf') {
                try {
                  const response = await fetch(file.url, { mode: 'cors', credentials: 'same-origin' });
                  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                  const extraPdfBytes = await response.arrayBuffer();
                  const extraPdfDoc = await PDFDocument.load(extraPdfBytes);
                  const copiedPages = await mainPdfDoc.copyPages(extraPdfDoc, extraPdfDoc.getPageIndices());
                  copiedPages.forEach((page) => mainPdfDoc.addPage(page));
                } catch (err) { console.error(`Error loading extra PDF ${file.name}:`, err); }
              }
            }
            const combinedPdfBytes = await mainPdfDoc.save();
            blob = new Blob([new Uint8Array(combinedPdfBytes)], { type: 'application/pdf' });
          } catch (err) { console.error('Error combining PDFs:', err); }
        }

        try {
          const countDoc = await PDFDocument.load(await blob.arrayBuffer());
          setPageCount(countDoc.getPageCount());
        } catch { setPageCount(0); }

        setPdfBlob(blob);
        const url = URL.createObjectURL(blob);
        setPdfUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (err) { console.error('Error generating PDF:', err); }
      finally { setGeneratingPdf(false); }
    };
    // Debounce PDF generation to avoid flickering on rapid edits
    if (pdfTimerRef.current) clearTimeout(pdfTimerRef.current);
    pdfTimerRef.current = setTimeout(generatePdf, 800);

    return () => {
      if (pdfTimerRef.current) clearTimeout(pdfTimerRef.current);
    };
  }, [documentData, layoutConfig]);

  const handleAutoFit = useCallback(async () => {
    if (!documentData) return;
    setAutoFitting(true);
    try {
      const best = await autoFitToOnePage(
        (config) => <CloseBusinessDealPDF {...documentData} layoutConfig={config} />,
        layoutConfig
      );
      setLayoutConfig(best);
    } finally { setAutoFitting(false); }
  }, [documentData, layoutConfig]);

  // Handle inline field edits from the HTML preview
  const handleFieldChange = useCallback((key: string, value: string) => {
    if (key === '_notesOverride') {
      setLayoutConfig(prev => ({ ...prev, notesOverride: value }));
      return;
    }
    if (key === '_termsOverride') {
      setLayoutConfig(prev => ({ ...prev, termsOverride: value }));
      return;
    }
    setLayoutConfig(prev => ({
      ...prev,
      contentOverrides: { ...(prev.contentOverrides || {}), [key]: value },
    }));
  }, []);

  // Build the editable HTML preview
  const editablePreview = documentData ? (
    <GenericDocumentHTMLPreview
      schema={buildCloseBusinessDealSchema(documentData, layoutConfig)}
      layoutConfig={layoutConfig}
      onFieldChange={handleFieldChange}
      onLayoutConfigChange={setLayoutConfig}
    />
  ) : null;

  return (
    <PDFDocumentEditorDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Cierre de Negocio${documentData ? ` N° ${documentData.documentNumber}` : ''}`}
      layoutConfig={layoutConfig}
      onLayoutConfigChange={setLayoutConfig}
      pdfUrl={pdfUrl}
      pdfBlob={pdfBlob}
      generatingPdf={generatingPdf}
      pageCount={pageCount}
      notes={documentData?.notes}
      terms={documentData?.terms}
      documentType="liquidacion_venta"
      documentId={documentData?.documentNumber || ''}
      documentData={documentData}
      extraPageConfig={documentData?.extraPageConfig}
      onAutoFit={handleAutoFit}
      autoFitting={autoFitting}
      availableSections={SECTIONS}
      loading={loading}
      error={error?.message}
      editablePreview={editablePreview}
    />
  );
};

export default CloseBusinessDealViewerPro;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { pdf } from '@react-pdf/renderer';
import { useAutoDownloadPdf } from '@/hooks/useAutoDownloadPdf';
import { PDFDocument } from 'pdf-lib';
import SaleNotePDF from '@/components/documents/pdf/SaleNotePDF';
import { useSaleNoteData } from '@/hooks/documents/useSaleNoteData';
import { useSequentialDocumentNumber } from '@/hooks/useSequentialDocumentNumber';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PDFLayoutConfig, DEFAULT_PDF_LAYOUT } from '@/types/document-template';
import { autoFitToOnePage } from '@/utils/pdfAutoFit';
import PDFDocumentEditorDialog from './PDFDocumentEditorDialog';
import GenericDocumentHTMLPreview from '@/components/documents/editor/GenericDocumentHTMLPreview';
import { buildSaleNoteSchema } from '@/config/document-editor';

const SECTIONS: Array<{ key: keyof PDFLayoutConfig; label: string }> = [
  { key: 'showClientData', label: 'Datos del cliente' },
  { key: 'showVehicleDetails', label: 'Datos del vehículo' },
  { key: 'showFinancialDetails', label: 'Detalle de la venta' },
  { key: 'showTransferValue', label: 'Valor de transferencia' },
  { key: 'showPayments', label: 'Pagos realizados' },
  { key: 'showSignatures', label: 'Firmas' },
];

interface SaleNoteViewerProDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  /** Genera y descarga el PDF directo (sin interacción), luego cierra. */
  autoDownload?: boolean;
}

const SaleNoteViewerProDialog: React.FC<SaleNoteViewerProDialogProps> = ({
  isOpen,
  onClose,
  documentId,
  autoDownload,
}) => {
  const { client } = useAuth();
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [saleId, setSaleId] = useState<number | null>(null);
  const [loadingIds, setLoadingIds] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  useAutoDownloadPdf(autoDownload, pdfBlob, `nota_venta_${documentId}.pdf`, onClose);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [layoutConfig, setLayoutConfig] = useState<PDFLayoutConfig>(DEFAULT_PDF_LAYOUT);
  const [pageCount, setPageCount] = useState(0);
  const [autoFitting, setAutoFitting] = useState(false);

  useEffect(() => {
    const fetchIds = async () => {
      if (!documentId || !isOpen) { setLoadingIds(false); return; }
      try {
        setLoadingIds(true);
        const { data: docData, error: docError } = await supabase
          .from('vehicles_documents').select('vehicle_id, customer_id').eq('id', documentId).single();
        if (docError) throw docError;
        setVehicleId(docData.vehicle_id);

        const { data: saleByDoc } = await supabase
          .from('vehicles_sales').select('id').eq('document_id', documentId).maybeSingle();
        if (saleByDoc) {
          setSaleId(saleByDoc.id);
        } else if (docData.customer_id) {
          const { data: saleByCustomer } = await supabase
            .from('vehicles_sales').select('id')
            .eq('vehicle_id', docData.vehicle_id).eq('customer_id', docData.customer_id)
            .order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (saleByCustomer) setSaleId(saleByCustomer.id);
        }
      } catch (error) {
        console.error('Error fetching IDs:', error);
      } finally {
        setLoadingIds(false);
      }
    };
    fetchIds();
  }, [documentId, isOpen]);

  const { data: documentData, loading: dataLoading, error, refetch } = useSaleNoteData(vehicleId || 0, saleId || undefined);
  const sequentialNumber = useSequentialDocumentNumber({ clientId: client?.id || null, documentId: saleId || null, documentType: 'sale', isOpen });
  const loading = loadingIds || dataLoading;
  const initializedRef = useRef(false);

  // Refetch data every time the dialog opens to pick up vehicle/sale changes
  useEffect(() => {
    if (isOpen && vehicleId) {
      initializedRef.current = false;
      refetch();
    }
  }, [isOpen]);

  // Initialize layoutConfig from saved document-level config (once per open)
  useEffect(() => {
    if (!documentData || initializedRef.current) return;
    initializedRef.current = true;

    if (documentData.savedDocumentLayoutConfig) {
      // Merge: template defaults → saved document config
      setLayoutConfig({
        ...DEFAULT_PDF_LAYOUT,
        ...(documentData.layoutConfig || {}),
        ...documentData.savedDocumentLayoutConfig,
      });
    } else if (documentData.layoutConfig) {
      // Only template-level config exists
      setLayoutConfig({ ...DEFAULT_PDF_LAYOUT, ...documentData.layoutConfig });
    }
  }, [documentData]);

  // Auto-save layoutConfig to vehicles_documents (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only save if we have a document ID and the config has been initialized
    const docId = documentData?.vehicleDocumentId;
    if (!docId || !initializedRef.current) return;

    // Check if there's anything worth saving (any override or non-default layout)
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
          .eq('id', docId);
      } catch (err) {
        console.error('Error saving document layout config:', err);
      }
    }, 1500); // 1.5s debounce

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [layoutConfig, documentData?.vehicleDocumentId]);

  const pdfTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!documentData) return;

    const generatePdf = async () => {
      setGeneratingPdf(true);
      try {
        const doc = <SaleNotePDF {...documentData} documentNumber={sequentialNumber || documentData.documentNumber} layoutConfig={layoutConfig} />;
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
  }, [documentData, sequentialNumber, layoutConfig]);

  const handleAutoFit = useCallback(async () => {
    if (!documentData) return;
    setAutoFitting(true);
    try {
      const best = await autoFitToOnePage(
        (config) => <SaleNotePDF {...documentData} documentNumber={sequentialNumber || documentData.documentNumber} layoutConfig={config} />,
        layoutConfig
      );
      setLayoutConfig(best);
    } finally { setAutoFitting(false); }
  }, [documentData, layoutConfig, sequentialNumber]);

  // Handle inline field edits from the HTML preview
  const handleFieldChange = useCallback((key: string, value: string) => {
    // Special keys for notes/terms overrides (handled by existing system)
    if (key === '_notesOverride') {
      setLayoutConfig(prev => ({ ...prev, notesOverride: value }));
      return;
    }
    if (key === '_termsOverride') {
      setLayoutConfig(prev => ({ ...prev, termsOverride: value }));
      return;
    }
    // All other fields go into contentOverrides
    setLayoutConfig(prev => ({
      ...prev,
      contentOverrides: { ...(prev.contentOverrides || {}), [key]: value },
    }));
  }, []);

  // Build the editable HTML preview
  const editablePreview = documentData ? (
    <GenericDocumentHTMLPreview
      schema={buildSaleNoteSchema({ ...documentData, documentNumber: sequentialNumber || documentData.documentNumber }, layoutConfig)}
      layoutConfig={layoutConfig}
      onFieldChange={handleFieldChange}
      onLayoutConfigChange={setLayoutConfig}
    />
  ) : null;

  return (
    <PDFDocumentEditorDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Nota de Venta${documentData ? ` N° ${sequentialNumber || documentData.documentNumber}` : ''}`}
      layoutConfig={layoutConfig}
      onLayoutConfigChange={setLayoutConfig}
      pdfUrl={pdfUrl}
      pdfBlob={pdfBlob}
      generatingPdf={generatingPdf}
      pageCount={pageCount}
      notes={documentData?.notes}
      terms={documentData?.terms}
      documentType="nota_venta"
      documentId={sequentialNumber || documentData?.documentNumber || ''}
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

export default SaleNoteViewerProDialog;

import React, { useEffect, useState, useMemo } from 'react';
import { pdf } from '@react-pdf/renderer';
import SaleNotePDF from '@/components/documents/pdf/SaleNotePDF';
import DownloadPDFButtonGeneric from './DownloadPDFButtonGeneric';
import { useTranslation } from 'react-i18next';
import { useSaleNoteData } from '@/hooks/documents/useSaleNoteData';
import { Loader2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { DEFAULT_PDF_LAYOUT } from '@/types/document-template';

interface SaleNoteViewerProProps {
  vehicleId: number;
  saleId?: number;
}

const SaleNoteViewerPro: React.FC<SaleNoteViewerProProps> = ({
  vehicleId,
  saleId,
}) => {
  const { t } = useTranslation('vehicleDocuments');
  const { data: documentData, loading, error } = useSaleNoteData(vehicleId, saleId);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Merge template + saved document-level layout config
  const effectiveLayoutConfig = useMemo(() => {
    if (!documentData) return undefined;
    return {
      ...DEFAULT_PDF_LAYOUT,
      ...(documentData.layoutConfig || {}),
      ...(documentData.savedDocumentLayoutConfig || {}),
    };
  }, [documentData]);

  useEffect(() => {
    if (!documentData) return;

    const generatePdf = async () => {
      setGeneratingPdf(true);
      try {
        // Generate main PDF with merged layout config (includes saved overrides)
        const doc = <SaleNotePDF {...documentData} layoutConfig={effectiveLayoutConfig} />;
        let blob = await pdf(doc).toBlob();

        // If there are extra PDFs, combine them
        if (documentData.extraPageConfig?.enabled && documentData.extraPageConfig.files && documentData.extraPageConfig.files.length > 0) {
          try {
            const mainPdfBytes = await blob.arrayBuffer();
            const mainPdfDoc = await PDFDocument.load(mainPdfBytes);

            for (const file of documentData.extraPageConfig.files) {
              // Only process PDF files (support URLs with query parameters)
              if (file.type === 'pdf') {
                try {
                  const response = await fetch(file.url, {
                    mode: 'cors',
                    credentials: 'same-origin'
                  });

                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }

                  const extraPdfBytes = await response.arrayBuffer();
                  const extraPdfDoc = await PDFDocument.load(extraPdfBytes);

                  const copiedPages = await mainPdfDoc.copyPages(extraPdfDoc, extraPdfDoc.getPageIndices());
                  copiedPages.forEach((page) => mainPdfDoc.addPage(page));
                } catch (error) {
                  console.error(`Error loading extra PDF ${file.name}:`, error);
                }
              }
            }

            const combinedPdfBytes = await mainPdfDoc.save();
            blob = new Blob([new Uint8Array(combinedPdfBytes)], { type: 'application/pdf' });
          } catch (error) {
            console.error('Error combining PDFs:', error);
          }
        }

        // Store blob for download/print reuse and create URL for preview
        setPdfBlob(blob);
        const url = URL.createObjectURL(blob);
        setPdfUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (error) {
        console.error('Error generating PDF:', error);
      } finally {
        setGeneratingPdf(false);
      }
    };

    generatePdf();

    return () => {};
  }, [documentData, effectiveLayoutConfig]);

  if (loading || generatingPdf) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <div className="text-gray-600">
            {loading ? 'Cargando documento...' : 'Generando PDF...'}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-600">Error al cargar el documento: {error.message}</div>
      </div>
    );
  }

  if (!documentData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">No se encontraron datos del documento</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Botones de acción */}
      <div className="flex gap-2 justify-end">
        <DownloadPDFButtonGeneric
          documentType="nota_venta"
          documentId={documentData.documentNumber}
          documentData={documentData}
          extraPageConfig={documentData.extraPageConfig}
          pdfBlob={pdfBlob}
          isPrintButton={true}
        />
        <DownloadPDFButtonGeneric
          documentType="nota_venta"
          documentId={documentData.documentNumber}
          documentData={documentData}
          extraPageConfig={documentData.extraPageConfig}
          pdfBlob={pdfBlob}
          isPrintButton={false}
        />
      </div>

      {/* Vista previa del PDF */}
      <div className="w-full h-[800px] border border-gray-200 rounded-lg overflow-hidden">
        {pdfUrl ? (
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            width="100%"
            height="100%"
            title="Vista previa del documento"
            style={{ border: 'none' }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
};

export default SaleNoteViewerPro;

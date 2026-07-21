import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PDFDocument } from 'pdf-lib';
import { ExtraPageConfig } from '@/types/document-template';

// Import all PDF components
import SaleNotePDF from '@/components/documents/pdf/SaleNotePDF';
import ReservationNotePDF from '@/components/documents/pdf/ReservationNotePDF';
import PurchaseNotePDF from '@/components/documents/pdf/PurchaseNotePDF';
import ConsignmentNotePDF from '@/components/documents/pdf/ConsignmentNotePDF';
import QuotationPDF from '@/components/documents/pdf/QuotationPDF';
import CloseBusinessDealPDF from '@/components/documents/pdf/CloseBusinessDealPDF';

type DocumentType = 'nota_venta' | 'reserva' | 'nota_compra' | 'consignacion' | 'cotizacion' | 'liquidacion_venta';

interface DownloadPDFButtonGenericProps {
  documentType: DocumentType;
  documentId: string | number;
  documentData: any; // Data object that matches the PDF component props
  extraPageConfig?: ExtraPageConfig;
  isPrintButton?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
  /** Pre-generated PDF blob from the viewer preview. When provided, download/print
   *  uses this exact blob instead of regenerating, guaranteeing identical output. */
  pdfBlob?: Blob | null;
}

const DownloadPDFButtonGeneric: React.FC<DownloadPDFButtonGenericProps> = ({
  documentType,
  documentId,
  documentData,
  extraPageConfig,
  isPrintButton = false,
  compact = false,
  fullWidth = false,
  pdfBlob: preGeneratedBlob,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useTranslation('vehicleDocuments');

  const getPDFComponent = () => {
    switch (documentType) {
      case 'nota_venta':
        return <SaleNotePDF {...documentData} />;
      case 'reserva':
        return <ReservationNotePDF {...documentData} />;
      case 'nota_compra':
        return <PurchaseNotePDF {...documentData} />;
      case 'consignacion':
        return <ConsignmentNotePDF {...documentData} />;
      case 'cotizacion':
        return <QuotationPDF {...documentData} />;
      case 'liquidacion_venta':
        return <CloseBusinessDealPDF {...documentData} />;
      default:
        throw new Error(`Unknown document type: ${documentType}`);
    }
  };

  const getFileName = () => {
    const typeNames: Record<DocumentType, string> = {
      'nota_venta': 'nota_venta',
      'reserva': 'reserva',
      'nota_compra': 'nota_compra',
      'consignacion': 'consignacion',
      'cotizacion': 'cotizacion',
      'liquidacion_venta': 'liquidacion_venta',
    };
    return `${typeNames[documentType]}_${documentId}.pdf`;
  };

  const generateBlobFromScratch = async (): Promise<Blob> => {
    // Get the correct PDF component
    const doc = getPDFComponent();

    // Generate the main PDF as blob
    let blob = await pdf(doc).toBlob();

    // If there are extra pages, combine PDFs
    if (extraPageConfig?.enabled && extraPageConfig.files && extraPageConfig.files.length > 0) {
      try {
        const mainPdfBytes = await blob.arrayBuffer();
        const mainPdfDoc = await PDFDocument.load(mainPdfBytes);

        // Combine with each extra PDF
        for (const file of extraPageConfig.files) {
          // Only process PDF files
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

              // Copy all pages from extra PDF to main
              const copiedPages = await mainPdfDoc.copyPages(extraPdfDoc, extraPdfDoc.getPageIndices());
              copiedPages.forEach((page) => mainPdfDoc.addPage(page));
            } catch (error) {
              console.error(`Error loading extra PDF ${file.name}:`, error);
            }
          }
        }

        // Save the combined PDF
        const combinedPdfBytes = await mainPdfDoc.save();
        blob = new Blob([new Uint8Array(combinedPdfBytes)], { type: 'application/pdf' });
      } catch (error) {
        console.error('Error combining PDFs:', error);
        // If combination fails, use main PDF only
      }
    }

    return blob;
  };

  const handleGeneratePDF = async () => {
    try {
      setIsProcessing(true);

      // Use pre-generated blob if available (same blob as preview = guaranteed identical output)
      // Otherwise generate from scratch (legacy viewers that don't provide a blob)
      const blob = preGeneratedBlob || await generateBlobFromScratch();

      if (isPrintButton) {
        // Open PDF in new window for printing
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.focus();
          // Wait for window to load completely before printing
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 1000);
          };
          // Fallback: if onload doesn't fire (some browsers), use longer timeout
          setTimeout(() => {
            try {
              printWindow.print();
            } catch (e) {
              // Already printed via onload, ignore error
            }
          }, 3000);
          // Clean URL after 2 minutes to give time for printing
          setTimeout(() => URL.revokeObjectURL(url), 120000);
        } else {
          // If popup is blocked, download file directly
          const link = document.createElement('a');
          link.href = url;
          link.download = getFileName();
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      } else {
        // Download the PDF
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = getFileName();
        link.click();

        // Clean after 60 seconds for slow connections
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('download.errors.process'));
    } finally {
      setIsProcessing(false);
    }
  };

  const Icon = isProcessing ? Loader2 : isPrintButton ? Printer : Download;
  const text = isProcessing
    ? t('download.preparing')
    : isPrintButton
    ? t('download.print')
    : t('download.download');

  const className = isPrintButton
    ? `bg-primary hover:bg-primary/90 text-white flex items-center justify-center text-xs px-2 py-1 sm:py-2 ${
        fullWidth ? 'w-full' : ''
      }`
    : `bg-white text-primary border-2 border-primary hover:bg-gray-100 flex items-center justify-center text-xs px-2 py-1 sm:py-2 ${
        fullWidth ? 'w-full' : ''
      }`;

  return (
    <Button
      onClick={handleGeneratePDF}
      className={className}
      size="sm"
      disabled={isProcessing}
    >
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${
          isProcessing ? 'animate-spin' : ''
        }`}
      />
      <span className="truncate">{text}</span>
    </Button>
  );
};

export default DownloadPDFButtonGeneric;

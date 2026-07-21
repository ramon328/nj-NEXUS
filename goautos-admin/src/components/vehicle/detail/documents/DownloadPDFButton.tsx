import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SaleNotePDF from '@/components/documents/pdf/SaleNotePDF';
import { ExtraPageConfig } from '@/types/document-template';
import { PDFDocument } from 'pdf-lib';

interface DownloadPDFButtonProps {
  // Datos de la empresa
  companyName: string;
  companyRut: string;
  companyAddress: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;

  // Datos del documento
  documentNumber: string;
  documentDate: string;
  documentType: string;

  // Datos del cliente
  customerName: string;
  customerRut?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;

  // Datos del vehículo
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehiclePlate?: string;
  vehicleMileage?: number;
  vehicleEngineNumber?: string;
  vehicleChassisNumber?: string;

  // Datos financieros
  vehiclePrice: number;
  transferValue?: number;
  additionals?: Array<{ title: string; amount: number }>;
  total: number;

  // Pagos
  payments?: Array<{ title: string; amount: number }>;
  totalPaid: number;

  // Términos y observaciones
  terms?: string;
  notes?: string;

  // Hoja extra
  extraPageConfig?: ExtraPageConfig;

  // Props del botón
  isPrintButton?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
}

const DownloadPDFButton: React.FC<DownloadPDFButtonProps> = ({
  companyName,
  companyRut,
  companyAddress,
  companyPhone,
  companyEmail,
  companyLogo,
  documentNumber,
  documentDate,
  documentType,
  customerName,
  customerRut,
  customerPhone,
  customerEmail,
  customerAddress,
  vehicleBrand,
  vehicleModel,
  vehicleYear,
  vehicleColor,
  vehiclePlate,
  vehicleMileage,
  vehicleEngineNumber,
  vehicleChassisNumber,
  vehiclePrice,
  transferValue,
  additionals,
  total,
  payments,
  totalPaid,
  terms,
  notes,
  extraPageConfig,
  isPrintButton = false,
  compact = false,
  fullWidth = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useTranslation('vehicleDocuments');

  const handleGeneratePDF = async () => {
    try {
      setIsProcessing(true);

      // Crear el documento PDF principal (sin extra pages en el componente)
      const doc = (
        <SaleNotePDF
          companyName={companyName}
          companyRut={companyRut}
          companyAddress={companyAddress}
          companyPhone={companyPhone}
          companyEmail={companyEmail}
          companyLogo={companyLogo}
          documentNumber={documentNumber}
          documentDate={documentDate}
          customerName={customerName}
          customerRut={customerRut}
          customerPhone={customerPhone}
          customerEmail={customerEmail}
          customerAddress={customerAddress}
          vehicleBrand={vehicleBrand}
          vehicleModel={vehicleModel}
          vehicleYear={vehicleYear}
          vehicleColor={vehicleColor}
          vehiclePlate={vehiclePlate}
          vehicleMileage={vehicleMileage}
          vehicleEngineNumber={vehicleEngineNumber}
          vehicleChassisNumber={vehicleChassisNumber}
          vehiclePrice={vehiclePrice}
          transferValue={transferValue}
          additionals={additionals}
          total={total}
          payments={payments}
          totalPaid={totalPaid}
          terms={terms}
          notes={notes}
        />
      );

      // Generar el PDF principal como blob
      let blob = await pdf(doc).toBlob();

      // Si hay hojas extras, combinar PDFs
      if (extraPageConfig?.enabled && extraPageConfig.files && extraPageConfig.files.length > 0) {
        try {
          const mainPdfBytes = await blob.arrayBuffer();
          const mainPdfDoc = await PDFDocument.load(mainPdfBytes);

          // Combinar con cada PDF extra
          for (const file of extraPageConfig.files) {
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

                // Copiar todas las páginas del PDF extra al principal
                const copiedPages = await mainPdfDoc.copyPages(extraPdfDoc, extraPdfDoc.getPageIndices());
                copiedPages.forEach((page) => mainPdfDoc.addPage(page));
              } catch (error) {
                console.error(`Error loading extra PDF ${file.name}:`, error);
              }
            }
          }

          // Guardar el PDF combinado
          const combinedPdfBytes = await mainPdfDoc.save();
          blob = new Blob([new Uint8Array(combinedPdfBytes)], { type: 'application/pdf' });
        } catch (error) {
          console.error('Error combining PDFs:', error);
          // Si falla la combinación, usar el PDF principal solamente
        }
      }

      if (isPrintButton) {
        // Abrir el PDF en una nueva ventana para imprimir
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.focus();
          // Esperar a que la ventana cargue completamente antes de imprimir
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 1000);
          };
          // Fallback: si onload no se dispara (algunos navegadores), usar timeout más largo
          setTimeout(() => {
            try {
              printWindow.print();
            } catch (e) {
              // Ya se imprimió via onload, ignorar error
            }
          }, 3000);
          // Limpiar URL después de 2 minutos para dar tiempo a la impresión
          setTimeout(() => URL.revokeObjectURL(url), 120000);
        } else {
          // Si el popup está bloqueado, descargar el archivo directamente
          const link = document.createElement('a');
          link.href = url;
          link.download = `${documentType}_${documentNumber}.pdf`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      } else {
        // Descargar el PDF
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${documentType}_${documentNumber}.pdf`;
        link.click();

        // Limpiar después de 60 segundos para conexiones lentas
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
    ? `bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 ${
        fullWidth ? 'flex-1 sm:flex-initial' : ''
      }`
    : `bg-white text-blue-600 border border-blue-600 hover:bg-gray-100 flex items-center justify-center text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 ${
        fullWidth ? 'flex-1 sm:flex-initial' : ''
      }`;

  return (
    <Button
      onClick={handleGeneratePDF}
      className={className}
      size="sm"
      disabled={isProcessing}
    >
      <Icon
        className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${
          isProcessing ? 'animate-spin' : ''
        }`}
      />
      <span className="sm:inline">{text}</span>
    </Button>
  );
};

export default DownloadPDFButton;

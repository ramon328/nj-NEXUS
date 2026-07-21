import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useConsignmentDocumentData } from '@/hooks/useConsignmentDocumentData';
import { useConsignmentNoteData } from '@/hooks/documents/useConsignmentNoteData';
import { useSequentialDocumentNumber } from '@/hooks/useSequentialDocumentNumber';
import { useLegalInfoForVehicle } from '@/hooks/useLegalInfo';
import ConsignmentNote from '@/components/documents/ConsignmentNote';
import { Client } from '@/types/user';
import DownloadPDFButtonGeneric from './DownloadPDFButtonGeneric';
import { supabase } from '@/integrations/supabase/client';

interface ConsignmentNoteViewerProps {
  documentId: number;
  isOpen?: boolean;
  onClose?: () => void;
}

const ConsignmentNoteViewer = ({
  documentId,
  isOpen = true,
  onClose,
}: ConsignmentNoteViewerProps) => {
  const { t } = useTranslation('vehicleDocuments');
  const { client } = useAuth();
  const { loading, documentData, consignmentData, vehicleData, customerData } =
    useConsignmentDocumentData(documentId, isOpen);

  // Get legal info for the vehicle (with automatic fallback to client-level)
  const { data: legalInfo, isLoading: legalInfoLoading } = useLegalInfoForVehicle(
    vehicleData?.id
  );

  // Get vehicle and consignment IDs for PDF data hook
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [consignmentId, setConsignmentId] = useState<number | null>(null);

  useEffect(() => {
    const fetchIds = async () => {
      if (!documentId || !isOpen) return;

      try {
        const { data: docData } = await supabase
          .from('vehicles_documents')
          .select('vehicle_id')
          .eq('id', documentId)
          .single();

        if (docData) {
          setVehicleId(docData.vehicle_id);

          // Get consignment ID from vehicles_consignments
          const { data: consignmentData } = await supabase
            .from('vehicles_consignments')
            .select('id')
            .eq('document_id', documentId)
            .maybeSingle();

          if (consignmentData) {
            setConsignmentId(consignmentData.id);
          }
        }
      } catch (error) {
        console.error('Error fetching IDs:', error);
      }
    };

    fetchIds();
  }, [documentId, isOpen]);

  // Get PDF-formatted data
  const { data: pdfData, loading: pdfDataLoading } = useConsignmentNoteData(
    vehicleId || 0,
    consignmentId || undefined
  );

  // Usar el hook para calcular el número secuencial
  const sequentialNumber = useSequentialDocumentNumber({
    clientId: client?.id || null,
    documentId: consignmentData?.id || null,
    documentType: 'consignment',
    isOpen,
  });

  // Configurar los estilos de impresión cuando el componente se monta
  useEffect(() => {
    // Crear una hoja de estilo específica para forzar la impresión multipágina
    const style = document.createElement('style');
    style.id = 'force-paged-media-style';
    style.textContent = `
      @media print {
        html, body {
          height: auto !important;
          overflow: visible !important;
          width: 210mm !important;
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          break-inside: auto !important;
        }

        .DialogContent {
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          position: relative !important;
          display: block !important;
          width: 100% !important;
          max-width: 21cm !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
        }

        .consignment-note-document, .sale-note-document {
          height: auto !important;
          min-height: 0 !important;
          background-color: white !important;
          position: relative !important;
          display: block !important;
          padding: 1cm !important;
          margin: 0 !important;
          page-break-inside: auto !important;
          page-break-before: auto !important;
          page-break-after: auto !important;
        }

        /* Forzar cada parte importante del documento a no cortarse */
        .document-header, .customer-details, .vehicle-details, .pricing-details, .terms-container {
          page-break-inside: avoid !important;
        }

        /* Asegurar que el texto fluya correctamente */
        p, div, table {
          page-break-inside: auto !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Escuchar el evento beforeprint para manipular el DOM justo antes de imprimir
    const beforePrintHandler = () => {
      console.log('Preparando para imprimir...');

      // Obtener elementos críticos
      const dialogContent = document.querySelector('.DialogContent');
      const printContainer = document.querySelector('.print-container');
      const documentContent = document.querySelector(
        '.consignment-note-document'
      );

      if (dialogContent) {
        (dialogContent as HTMLElement).style.height = 'auto';
        (dialogContent as HTMLElement).style.maxHeight = 'none';
        (dialogContent as HTMLElement).style.overflow = 'visible';
        (dialogContent as HTMLElement).style.position = 'relative';
      }

      if (printContainer) {
        (printContainer as HTMLElement).style.height = 'auto';
        (printContainer as HTMLElement).style.overflow = 'visible';
      }

      if (documentContent) {
        (documentContent as HTMLElement).style.minHeight = '0';
        (documentContent as HTMLElement).style.height = 'auto';
      }
    };

    window.addEventListener('beforeprint', beforePrintHandler);

    // Limpiar al desmontar
    return () => {
      const styleElement = document.getElementById('force-paged-media-style');
      if (styleElement) {
        styleElement.remove();
      }
      window.removeEventListener('beforeprint', beforePrintHandler);
    };
  }, []);

  const handlePrint = () => {
    // Vuelvo al método estándar de impresión con los estilos mejorados
    window.print();
  };

  // Si está cargando, mostrar indicador
  if (loading || legalInfoLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose && onClose()}>
        <DialogContent className='max-w-4xl'>
          <div className='flex justify-center items-center h-64'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <span className='ml-2'>{t('viewer.loadingGeneric')}</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Si no hay datos de consignación
  if (!documentData || !consignmentData) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose && onClose()}>
        <DialogContent className='max-w-4xl'>
          <div className='text-center py-8'>
            <h2 className='text-xl font-semibold text-red-600'>
              {t('viewer.notFound.title')}
            </h2>
            <p className='mt-2'>{t('viewer.notFound.description')}</p>
            <Button className='mt-4' onClick={onClose}>
              {t('common:buttons.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Preparar datos para el componente ConsignmentNote
  const customer = {
    first_name: customerData?.first_name || '',
    last_name: customerData?.last_name || '',
    email: customerData?.email || '',
    phone: customerData?.phone || '',
    address: customerData?.address || '',
    rut: customerData?.rut || '',
  };

  const vehicle = {
    brand: vehicleData?.brand?.name || vehicleData?.brand || '',
    model: vehicleData?.model?.name || vehicleData?.model || '',
    year: vehicleData?.year || 0,
    license_plate: vehicleData?.license_plate || '',
    color: vehicleData?.color?.name || vehicleData?.color || '',
    mileage: vehicleData?.mileage || 0,
    engine_number: vehicleData?.engine_number || '',
    chassis_number: vehicleData?.chassis_number || '',
    owner_number: vehicleData?.owners || '',
  };

  // Preparar datos específicos de consignación
  const preparedConsignmentData = {
    client_price: consignmentData.agreed_price || 0,
    publication_price: vehicleData?.price || 0,
    commission_percentage: consignmentData.commission_percentage || 6,
    minimum_commission: consignmentData.minimum_commission || 1000000,
    duration_days: consignmentData.duration_days || 60,
  };

  // Legal info is now obtained from useLegalInfoForVehicle hook above

  // Formatear la fecha para mostrar en el documento
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Use document_date if available, otherwise fall back to created_at
  const displayDate = documentData.document_date || documentData.created_at || '';

  // Contenido del documento
  const content = (
    <ConsignmentNote
      isEditable={false}
      documentClient={client as any} // Forzar tipo para evitar error
      legalInfo={legalInfo}
      customer={customer}
      vehicle={vehicle}
      consignmentData={preparedConsignmentData}
      notes={documentData.notes || ''}
      terms={documentData.terms_and_conditions || ''}
      documentNumber={
        sequentialNumber ||
        documentData.document_number?.toString() ||
        documentData.id?.toString() ||
        ''
      }
      documentDate={formatDate(displayDate)}
      onPrint={handlePrint}
    />
  );

  // Si no se requiere modo diálogo, renderizar solo el contenido
  if (!isOpen && !onClose) {
    return content;
  }

  // Modo diálogo (para vista previa)
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose && onClose()}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:h-auto print:max-w-none print:p-0 print:rounded-none print:border-none print:shadow-none'>
        {/* Encabezado - Título y botones */}
        <div className='print:hidden mb-2 sm:mb-4'>
          {/* Título y cierre (solo en móvil) */}
          <div className='flex items-center justify-between mb-2 sm:mb-0'>
            <h2 className='text-lg sm:text-2xl font-semibold'>
              {t('viewer.title')}
            </h2>
          </div>

          {/* Botones de acción */}
          <div className='flex items-center justify-end space-x-2 sm:space-x-4 mt-2 mr-4'>
            {pdfData && !pdfDataLoading && (
              <>
                <DownloadPDFButtonGeneric
                  documentType='consignacion'
                  documentId={
                    sequentialNumber ||
                    documentData.document_number?.toString() ||
                    documentData.id?.toString() ||
                    ''
                  }
                  documentData={pdfData}
                  isPrintButton={true}
                />
                <DownloadPDFButtonGeneric
                  documentType='consignacion'
                  documentId={
                    sequentialNumber ||
                    documentData.document_number?.toString() ||
                    documentData.id?.toString() ||
                    ''
                  }
                  documentData={pdfData}
                  isPrintButton={false}
                />
              </>
            )}
            {(!pdfData || pdfDataLoading) && (
              <div className="text-xs text-gray-500">Cargando datos para descarga...</div>
            )}
          </div>
        </div>

        <div className='print-container h-full overflow-y-auto print:overflow-visible print:h-auto'>
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConsignmentNoteViewer;

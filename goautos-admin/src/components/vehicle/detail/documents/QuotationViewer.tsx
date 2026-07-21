import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { useQuotationData } from '@/hooks/useQuotationData';
import { useQuotationData as useQuotationPDFData } from '@/hooks/documents/useQuotationData';
import { useSequentialDocumentNumber } from '@/hooks/useSequentialDocumentNumber';
import { useLegalInfoForVehicle } from '@/hooks/useLegalInfo';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DownloadPDFButtonGeneric from './DownloadPDFButtonGeneric';
import { useAuth } from '@/contexts/AuthContext';
import QuotationNote from '@/components/documents/QuotationNote';
import { supabase } from '@/integrations/supabase/client';

export interface QuotationViewerProps {
  documentId: string | number;
  isOpen: boolean;
  onClose: () => void;
}

const QuotationViewer: React.FC<QuotationViewerProps> = ({
  documentId,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation('vehicleDocuments');
  // Convert documentId to number if it's a string
  const docId =
    typeof documentId === 'string' ? parseInt(documentId) : documentId;
  const { loading, documentData, quotationData, vehicleData, customerData } =
    useQuotationData(docId);
  const { client } = useAuth();

  // Get legal info for the vehicle (with automatic fallback to client-level)
  const { data: legalInfo, isLoading: legalInfoLoading } = useLegalInfoForVehicle(
    vehicleData?.id
  );

  // Get vehicle and quotation IDs for PDF data hook
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [quotationId, setQuotationId] = useState<number | null>(null);

  useEffect(() => {
    const fetchIds = async () => {
      if (!docId || !isOpen) return;

      try {
        const { data: docData } = await supabase
          .from('vehicles_documents')
          .select('vehicle_id')
          .eq('id', docId)
          .single();

        if (docData) {
          setVehicleId(docData.vehicle_id);
          setQuotationId(quotationData?.id || null);
        }
      } catch (error) {
        console.error('Error fetching IDs:', error);
      }
    };

    fetchIds();
  }, [docId, isOpen, quotationData?.id]);

  // Get PDF-formatted data
  const { data: pdfData, loading: pdfDataLoading } = useQuotationPDFData(
    vehicleId || 0,
    quotationId || undefined
  );

  // Usar el hook para calcular el número secuencial
  const sequentialNumber = useSequentialDocumentNumber({
    clientId: client?.id || null,
    documentId: quotationData?.id || null,
    documentType: 'quotation',
    isOpen,
  });

  const handlePrint = () => {
    window.print();
  };

  if (loading || legalInfoLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className='max-w-full sm:max-w-3xl w-[95%] max-h-[90vh] overflow-y-auto p-4 sm:p-6'>
          <div className='flex justify-center items-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            <span className='ml-2'>{t('viewer.loading')}</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Preparar datos de cliente
  const customer = {
    first_name: customerData?.first_name || '',
    last_name: customerData?.last_name || '',
    email: customerData?.email || '',
    phone: customerData?.phone || '',
    address: customerData?.address || '',
    rut: customerData?.rut || '',
  };

  // Preparar datos de vehículo
  const vehicle = {
    brand: vehicleData?.brand?.name || vehicleData?.brand || '',
    model: vehicleData?.model?.name || vehicleData?.model || '',
    year: vehicleData?.year || 0,
    license_plate: vehicleData?.license_plate || '',
    color: vehicleData?.color?.name || vehicleData?.color || '',
    mileage: vehicleData?.mileage || 0,
    version: vehicleData?.version || '',
    condition: vehicleData?.condition || '',
    engine_number: vehicleData?.engine_number || '',
    chassis_number: vehicleData?.chassis_number || '',
    owner_number: vehicleData?.owners || '',
  };

  // Datos de cotización
  const preparedQuotationData = {
    estimated_price: quotationData?.estimated_price || 0,
    quotation_date: quotationData?.quotation_date,
    validity_period: quotationData?.validity_period,
  };

  // Formatear la fecha para mostrar en el documento
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className='max-w-full sm:max-w-3xl w-[95%] max-h-[90vh] overflow-y-auto p-2 sm:p-6 print:p-0 print:max-w-none print:h-auto print:rounded-none print:border-none print:shadow-none'>
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
            {/* Botón Imprimir usando el componente mejorado */}
            {pdfData && !pdfDataLoading && (
              <>
                <DownloadPDFButtonGeneric
                  documentType='cotizacion'
                  documentId={
                    sequentialNumber ||
                    documentData?.document_number?.toString() ||
                    quotationData?.id?.toString() ||
                    ''
                  }
                  documentData={pdfData}
                  isPrintButton={true}
                />
                <DownloadPDFButtonGeneric
                  documentType='cotizacion'
                  documentId={
                    sequentialNumber ||
                    documentData?.document_number?.toString() ||
                    quotationData?.id?.toString() ||
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

        {/* Contenido del documento */}
        <div className='print-container scale-[0.85] sm:scale-100 origin-top'>
          <div className='bg-white p-2 sm:p-6 border rounded-md shadow-sm'>
            <QuotationNote
              isEditable={false}
              documentClient={client}
              legalInfo={legalInfo}
              customer={customer}
              vehicle={vehicle}
              quotationData={preparedQuotationData}
              notes={quotationData?.notes || ''}
              terms={documentData?.terms_and_conditions || ''}
              documentNumber={
                sequentialNumber ||
                documentData?.document_number?.toString() ||
                quotationData?.id?.toString() ||
                ''
              }
              documentDate={formatDate(quotationData?.quotation_date || '')}
              onPrint={handlePrint}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuotationViewer;

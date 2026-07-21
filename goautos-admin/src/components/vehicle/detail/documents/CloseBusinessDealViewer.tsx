import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useCloseBusinessDealData } from '@/hooks/useCloseBusinessDealData';
import { useCloseBusinessDealNoteData } from '@/hooks/documents/useCloseBusinessDealNoteData';
import { useSequentialDocumentNumber } from '@/hooks/useSequentialDocumentNumber';
import { useLegalInfoForVehicle } from '@/hooks/useLegalInfo';
import CloseBusinessDealNote from '@/components/documents/CloseBusinessDealNote';
import DownloadPDFButtonGeneric from './DownloadPDFButtonGeneric';

interface CloseBusinessDealViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
}

const CloseBusinessDealViewer = ({
  isOpen,
  onClose,
  documentId,
}: CloseBusinessDealViewerProps) => {
  const { t } = useTranslation('vehicleDocuments');
  const { client } = useAuth();
  const {
    loading,
    closeBusinessDealData,
    vehicleData,
    customerData,
    documentData,
    allAdditionals,
  } = useCloseBusinessDealData(documentId, isOpen);

  // Get legal info for the vehicle (with automatic fallback to client-level)
  const { data: legalInfo, isLoading: legalInfoLoading } = useLegalInfoForVehicle(
    vehicleData?.id
  );

  // Get PDF-formatted data
  const { data: pdfData, loading: pdfDataLoading } = useCloseBusinessDealNoteData(documentId);

  // Usar el hook para calcular el número secuencial
  const sequentialNumber = useSequentialDocumentNumber({
    clientId: client?.id || null,
    documentId: documentData?.id || null,
    documentType: 'close_deal',
    isOpen,
  });

  const handlePrint = () => {
    window.print();
  };

  if (loading || legalInfoLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className='max-w-4xl'>
          <div className='flex justify-center items-center h-64'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <span className='ml-2'>{t('viewer.loadingGeneric')}</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Si no hay datos de cierre de negocio
  if (!closeBusinessDealData || !documentData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
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

  // Prepare customer data
  const customer = customerData
    ? {
        first_name: customerData.first_name,
        last_name: customerData.last_name,
        phone: customerData.phone,
        rut: customerData.rut,
      }
    : null;

  // Prepare vehicle data
  const vehicle = vehicleData
    ? {
        brand: vehicleData.brand?.name || '',
        model: vehicleData.model?.name || '',
        year: vehicleData.year,
        license_plate: vehicleData.license_plate,
        color: vehicleData.color?.name || '',
        mileage: vehicleData.mileage,
        engine_number: vehicleData.engine_number,
        chassis_number: vehicleData.chassis_number,
        transfer_value: vehicleData.transfer_value || 0, // Agregar el valor de transferencia
        is_consigned: vehicleData.is_consigned || false, // Agregar si es consignado
      }
    : null;

  // Prepare deal details (from parsed JSON data)
  const dealDetails = {
    finalSalePrice: closeBusinessDealData?.finalSalePrice || 0,
    sale_price: closeBusinessDealData?.sale_price || 0,
    dealershipCommission: closeBusinessDealData?.dealershipCommission || 0,
    paymentMethod: closeBusinessDealData?.paymentMethod || 'transferencia',
  };

  // Formatear la fecha para mostrar en el documento
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-full sm:max-w-4xl w-[95%] max-h-[90vh] overflow-y-auto p-2 sm:p-6 print:p-0 print:max-w-none print:h-auto print:rounded-none print:border-none print:shadow-none'>
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
            {/* Botón Imprimir */}
            {pdfData && !pdfDataLoading && (
              <>
                <DownloadPDFButtonGeneric
                  documentType='liquidacion_venta'
                  documentId={
                    sequentialNumber ||
                    documentData?.document_number?.toString() ||
                    documentId?.toString() ||
                    ''
                  }
                  documentData={pdfData}
                  isPrintButton={true}
                />
                <DownloadPDFButtonGeneric
                  documentType='liquidacion_venta'
                  documentId={
                    sequentialNumber ||
                    documentData?.document_number?.toString() ||
                    documentId?.toString() ||
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

        <div className='print-container'>
          <CloseBusinessDealNote
            isEditable={false}
            documentClient={client as any}
            legalInfo={legalInfo}
            customer={customer}
            vehicle={vehicle}
            dealDetails={dealDetails}
            notes={closeBusinessDealData?.customNotes || ''}
            terms={documentData?.terms_and_conditions || ''}
            documentNumber={
              sequentialNumber ||
              documentData?.document_number?.toString() ||
              documentId?.toString() ||
              ''
            }
            documentDate={formatDate(documentData?.created_at || '')}
            allAdditionals={allAdditionals}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CloseBusinessDealViewer;

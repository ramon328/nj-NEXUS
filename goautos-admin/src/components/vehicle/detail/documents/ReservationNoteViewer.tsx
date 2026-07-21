import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useReservationDocumentData } from '@/hooks/useReservationDocumentData';
import { useReservationNoteData } from '@/hooks/documents/useReservationNoteData';
import { useSequentialDocumentNumber } from '@/hooks/useSequentialDocumentNumber';
import { useLegalInfoForVehicle } from '@/hooks/useLegalInfo';
import ReservationNote from '@/components/documents/ReservationNote';
import DownloadPDFButtonGeneric from './DownloadPDFButtonGeneric';
import { supabase } from '@/integrations/supabase/client';

interface ReservationNoteViewerProps {
  documentId: number;
  isOpen?: boolean;
  onClose?: () => void;
}

const ReservationNoteViewer = ({
  documentId,
  isOpen = true,
  onClose,
}: ReservationNoteViewerProps) => {
  const { t } = useTranslation('vehicleDocuments');
  const { client } = useAuth();
  const {
    loading,
    documentData,
    reservationData,
    vehicleData,
    customerData,
    additionalsData,
  } = useReservationDocumentData(documentId, isOpen);

  // Get vehicle and reservation IDs for PDF data hook
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [reservationId, setReservationId] = useState<number | null>(null);

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

          const { data: resData } = await supabase
            .from('vehicles_reservations')
            .select('id')
            .eq('document_id', documentId)
            .maybeSingle();

          if (resData) {
            setReservationId(resData.id);
          }
        }
      } catch (error) {
        console.error('Error fetching IDs:', error);
      }
    };

    fetchIds();
  }, [documentId, isOpen]);

  // Get PDF-formatted data
  const { data: pdfData, loading: pdfDataLoading } = useReservationNoteData(
    vehicleId || 0,
    reservationId || undefined
  );

  // Get legal info for the vehicle (with automatic fallback to client-level)
  const { data: legalInfo, isLoading: legalInfoLoading } = useLegalInfoForVehicle(
    vehicleData?.id
  );

  // Usar el hook para calcular el número secuencial
  const sequentialNumber = useSequentialDocumentNumber({
    clientId: client?.id || null,
    documentId: reservationData?.id || null,
    documentType: 'reservation',
    isOpen,
  });

  const handlePrint = () => {
    window.print();
  };

  // Si está cargando, mostrar indicador
  if (loading || legalInfoLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose && onClose()}>
        <DialogContent className='max-w-4xl'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='text-2xl font-semibold'>
              {t('viewer.loadingGeneric')}
            </h2>
          </div>
          <div className='h-[80vh] flex items-center justify-center'>
            <div className='animate-pulse space-y-4'>
              <div className='h-4 bg-slate-200 rounded w-3/4'></div>
              <div className='h-4 bg-slate-200 rounded w-1/2'></div>
              <div className='h-4 bg-slate-200 rounded w-5/6'></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Si no hay datos de reserva
  if (!documentData || !reservationData) {
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

  // Preparar datos para el componente ReservationNote
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

  // Preparar datos específicos de reserva
  const preparedReservationData = {
    vehicle_price:
      reservationData?.reservation_agreed_price != null &&
      reservationData?.reservation_agreed_price !== 0
        ? reservationData.reservation_agreed_price
        : vehicleData?.price || 0,
    reservation_agreed_price: reservationData?.reservation_agreed_price || 0,
    transfer_value: vehicleData?.transfer_value || 0,
    reservation_amount: reservationData?.reservation_amount || 0,
    reservation_date: reservationData?.reservation_date
      ? new Date(reservationData.reservation_date).toLocaleDateString()
      : '',
    expiration_date: reservationData?.expiration_date
      ? new Date(reservationData.expiration_date).toLocaleDateString()
      : '',
    status: reservationData?.status || 'Pendiente',
  };

  // Formatear la fecha para mostrar en el documento
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Si no se requiere modo diálogo, renderizar solo el contenido
  if (!isOpen && !onClose) {
    return (
      <div className='reservation-note-document'>
        <ReservationNote
          isEditable={false}
          documentClient={client}
          legalInfo={legalInfo}
          customer={customer}
          vehicle={vehicle}
          reservationData={preparedReservationData}
          additionals={additionalsData}
          notes={documentData.notes || ''}
          terms={documentData.terms_and_conditions || ''}
          documentNumber={
            sequentialNumber ||
            documentData.document_number?.toString() ||
            documentData.id?.toString() ||
            ''
          }
          documentDate={formatDate(documentData.created_at || '')}
          onPrint={handlePrint}
        />
      </div>
    );
  }

  // Modo diálogo (para vista previa)
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose && onClose()}>
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
            {/* Botón Imprimir con el componente mejorado */}
            {pdfData && !pdfDataLoading && (
              <>
                <DownloadPDFButtonGeneric
                  documentType='reserva'
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
                  documentType='reserva'
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

        <div className='print-container'>
          <ReservationNote
            isEditable={false}
            documentClient={client}
            legalInfo={legalInfo}
            customer={customer}
            vehicle={vehicle}
            reservationData={preparedReservationData}
            additionals={additionalsData}
            notes={documentData.notes || ''}
            terms={documentData.terms_and_conditions || ''}
            documentNumber={
              sequentialNumber ||
              documentData.document_number?.toString() ||
              documentData.id?.toString() ||
              ''
            }
            documentDate={formatDate(documentData.created_at || '')}
            onPrint={handlePrint}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationNoteViewer;

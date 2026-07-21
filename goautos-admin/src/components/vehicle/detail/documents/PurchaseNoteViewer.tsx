import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { usePurchaseDocumentData } from '@/hooks/usePurchaseDocumentData';
import { usePurchaseNoteData } from '@/hooks/documents/usePurchaseNoteData';
import { useSequentialDocumentNumber } from '@/hooks/useSequentialDocumentNumber';
import { useLegalInfoForVehicle } from '@/hooks/useLegalInfo';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PurchaseNote from '@/components/documents/PurchaseNote';
import { useAuth } from '@/contexts/AuthContext';
import DownloadPDFButtonGeneric from './DownloadPDFButtonGeneric';
import { extractTermsText } from '@/utils/documentTemplateUtils';
import { supabase } from '@/integrations/supabase/client';

interface PurchaseNoteViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
}

const PurchaseNoteViewer: React.FC<PurchaseNoteViewerProps> = ({
  isOpen,
  onClose,
  documentId,
}) => {
  const { t } = useTranslation('vehicleDocuments');
  const { client } = useAuth(); // Obtener el cliente actual
  const {
    loading,
    purchaseData,
    vehicleData,
    customerData,
    extraTransactions,
    documentData,
  } = usePurchaseDocumentData(documentId, isOpen);

  // Get legal info for the vehicle (with automatic fallback to client-level)
  const { data: legalInfo, isLoading: legalInfoLoading } = useLegalInfoForVehicle(
    vehicleData?.id
  );

  // Get vehicle and purchase IDs for PDF data hook
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [purchaseId, setPurchaseId] = useState<number | null>(null);

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

          // Get purchase ID from vehicles_purchases
          const { data: purchaseData } = await supabase
            .from('vehicles_purchases')
            .select('id')
            .eq('document_id', documentId)
            .maybeSingle();

          if (purchaseData) {
            setPurchaseId(purchaseData.id);
          }
        }
      } catch (error) {
        console.error('Error fetching IDs:', error);
      }
    };

    fetchIds();
  }, [documentId, isOpen]);

  // Get PDF-formatted data
  const { data: pdfData, loading: pdfDataLoading } = usePurchaseNoteData(
    vehicleId || 0,
    purchaseId || undefined
  );

  // Usar el hook para calcular el número secuencial
  const sequentialNumber = useSequentialDocumentNumber({
    clientId: client?.id || null,
    documentId: purchaseData?.id || null,
    documentType: 'purchase',
    isOpen,
  });

  // Function to handle printing the document
  const handlePrint = () => {
    window.print();
  };

  // Calculate totals based on purchase price and extras
  const calculateTotals = () => {
    const vehiclePrice = purchaseData?.purchase_price || 0;
    const additionalExpenses = extraTransactions
      .filter((extra) => extra.type === 'expense')
      .reduce((sum, extra) => sum + Number(extra.amount || 0), 0);

    const additionalIncome = extraTransactions
      .filter((extra) => extra.type === 'income')
      .reduce((sum, extra) => sum + Number(extra.amount || 0), 0);

    const totalAdjustments = additionalIncome - additionalExpenses;
    const grandTotal = vehiclePrice + totalAdjustments;

    return {
      vehiclePrice,
      additionalExpenses,
      additionalIncome,
      totalAdjustments,
      grandTotal,
    };
  };

  const totals = calculateTotals();

  if (loading || legalInfoLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className='max-w-4xl'>
          <DialogTitle>{t('viewer.title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('viewer.loadingGeneric')}
          </DialogDescription>
          <div className='flex justify-center items-center h-64'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <span className='ml-2'>{t('viewer.loadingGeneric')}</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Si no hay datos de compra
  if (!purchaseData) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className='max-w-4xl'>
          <DialogTitle className="sr-only">{t('viewer.notFound.title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('viewer.notFound.description')}
          </DialogDescription>
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

  // Preparar datos para el componente de nota de compra
  const seller = {
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

  const payment = {
    purchase_price: purchaseData?.purchase_price || 0,
    discounts: Math.abs(
      totals.totalAdjustments < 0 ? totals.totalAdjustments : 0
    ),
    total: totals.grandTotal,
    payment_method: purchaseData?.payment_method || 'TRANSFERENCIA',
  };

  // Formatear la fecha para mostrar en el documento
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  console.log('Purchase data términos:', purchaseData?.terms_and_conditions);
  console.log('Document data términos:', documentData?.terms_and_conditions);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className='max-w-full sm:max-w-3xl w-[95%] max-h-[90vh] overflow-y-auto p-2 sm:p-6 print:p-0 print:max-w-none print:h-auto print:rounded-none print:border-none print:shadow-none'>
        <DialogTitle className="sr-only">{t('viewer.title')}</DialogTitle>
        <DialogDescription className="sr-only">
          Documento de nota de compra para el vehículo {vehicle.brand} {vehicle.model}
        </DialogDescription>
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
                  documentType='nota_compra'
                  documentId={
                    sequentialNumber ||
                    documentData?.document_number?.toString() ||
                    purchaseData?.id?.toString() ||
                    ''
                  }
                  documentData={pdfData}
                  isPrintButton={true}
                />
                <DownloadPDFButtonGeneric
                  documentType='nota_compra'
                  documentId={
                    sequentialNumber ||
                    documentData?.document_number?.toString() ||
                    purchaseData?.id?.toString() ||
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
          <PurchaseNote
            isEditable={false}
            documentClient={client}
            legalInfo={legalInfo}
            seller={seller}
            vehicle={vehicle}
            payment={payment}
            notes={purchaseData?.notes || ''}
            terms={extractTermsText(
              documentData?.terms_and_conditions ||
              purchaseData?.terms_and_conditions ||
              purchaseData?.terms
            )}
            documentNumber={
              sequentialNumber ||
              documentData?.document_number?.toString() ||
              purchaseData?.id?.toString() ||
              ''
            }
            documentDate={formatDate(purchaseData?.purchase_date || '')}
            onPrint={handlePrint}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseNoteViewer;

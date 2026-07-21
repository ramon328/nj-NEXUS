import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSaleDocumentData } from '@/hooks/useSaleDocumentData';
import { useSaleNoteData } from '@/hooks/documents/useSaleNoteData';
import { useSequentialDocumentNumber } from '@/hooks/useSequentialDocumentNumber';
import useDocumentTemplate from '@/hooks/useDocumentTemplate';
import { useLegalInfoForVehicle } from '@/hooks/useLegalInfo';
import SaleNote from '@/components/documents/SaleNote';
import DownloadPDFButtonGeneric from './DownloadPDFButtonGeneric';
import { ExtraPageConfig } from '@/types/document-template';
import { Edit, Loader2 } from 'lucide-react';
import VehicleSaleCreateEditDialog from '../sales-2/VehicleSaleCreateEditDialog';
import { supabase } from '@/integrations/supabase/client';

interface SaleNoteViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
}

const SaleNoteViewer = ({
  isOpen,
  onClose,
  documentId,
}: SaleNoteViewerProps) => {
  const { t } = useTranslation('vehicleDocuments');
  const { client } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const {
    loading,
    saleData,
    vehicleData,
    customerData,
    extraTransactions,
    saleAdditionals,
    saleIncomes,
    allAdditionals,
    reservationPayments,
    documentData,
    tradeInVehicle,
    tradeInVehicles,
  } = useSaleDocumentData(documentId, isOpen);

  // Get legal info for the vehicle (with automatic fallback to client-level)
  const { data: legalInfo, isLoading: legalInfoLoading } = useLegalInfoForVehicle(
    vehicleData?.id
  );

  // Get sale template to get extra page config
  const { getExtraPageConfig, template } = useDocumentTemplate('sale');
  const [extraPageConfig, setExtraPageConfig] = useState<ExtraPageConfig>({
    enabled: false,
    files: [],
  });

  // Get vehicle and sale IDs for PDF data hook
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [saleId, setSaleId] = useState<number | null>(null);

  useEffect(() => {
    const fetchIds = async () => {
      if (!documentId || !isOpen) return;

      try {
        const { data: docData } = await supabase
          .from('vehicles_documents')
          .select('vehicle_id, customer_id')
          .eq('id', documentId)
          .single();

        if (docData) {
          setVehicleId(docData.vehicle_id);

          // First try to find sale by document_id link (most reliable)
          const { data: saleByDoc } = await supabase
            .from('vehicles_sales')
            .select('id')
            .eq('document_id', documentId)
            .maybeSingle();

          if (saleByDoc) {
            setSaleId(saleByDoc.id);
          } else if (docData.customer_id) {
            // Fallback for older records without document_id: match by vehicle + customer
            const { data: saleByCustomer } = await supabase
              .from('vehicles_sales')
              .select('id')
              .eq('vehicle_id', docData.vehicle_id)
              .eq('customer_id', docData.customer_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (saleByCustomer) {
              setSaleId(saleByCustomer.id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching IDs:', error);
      }
    };

    fetchIds();
  }, [documentId, isOpen]);

  // Get PDF-formatted data
  const { data: pdfData, loading: pdfDataLoading } = useSaleNoteData(
    vehicleId || 0,
    saleId || undefined
  );

  // Load extra page config when template loads
  useEffect(() => {
    if (isOpen && template) {
      const config = getExtraPageConfig();
      console.log('SaleNoteViewer: Loaded config:', config);
      setExtraPageConfig(config);
    }
  }, [isOpen, template]);

  // Usar el hook para calcular el número secuencial
  const sequentialNumber = useSequentialDocumentNumber({
    clientId: client?.id || null,
    documentId: saleData?.id || null,
    documentType: 'sale',
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

  // Si no hay datos de venta
  if (!saleData) {
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
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
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
        owner_number: vehicleData.owners?.toString() || undefined,
        transfer_value: vehicleData.transfer_value || 0, // Agregar el valor de transferencia de vehicles
        price: vehicleData.price || 0, // Precio publicado para mostrar ajuste en nota de venta
      }
    : null;

  // Calcular precio y totales
  const vehiclePrice = saleData.sale_price || 0;

  // Preparar datos de venta
  const preparedSaleData = {
    vehicle_price: vehiclePrice,
    payment_method: saleData.payment_method || 'TRANSFERENCIA',
  };

  // Formatear la fecha para mostrar en el documento
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  console.log('Sale data términos:', saleData?.terms_and_conditions);
  console.log('Document data términos:', documentData?.terms_and_conditions);
  console.log('Document data notes:', documentData?.notes);
  console.log('Sale data notes:', saleData?.notes);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
            {/* Botón Editar Venta */}
            <Button
              onClick={() => setIsEditDialogOpen(true)}
              variant='outline'
              className='flex items-center justify-center text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2'
              size='sm'
            >
              <Edit className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
              <span className='sm:inline'>Editar</span>
            </Button>

            {/* Botón Imprimir con el componente mejorado */}
            {pdfData && !pdfDataLoading && (
              <>
                <DownloadPDFButtonGeneric
                  documentType='nota_venta'
                  documentId={sequentialNumber || saleData.id}
                  documentData={{ ...pdfData, extraPageConfig }}
                  extraPageConfig={extraPageConfig}
                  isPrintButton={true}
                />
                <DownloadPDFButtonGeneric
                  documentType='nota_venta'
                  documentId={sequentialNumber || saleData.id}
                  documentData={{ ...pdfData, extraPageConfig }}
                  extraPageConfig={extraPageConfig}
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
          <SaleNote
            isEditable={false}
            documentClient={client as any}
            legalInfo={legalInfo}
            customer={customer}
            vehicle={vehicle}
            saleData={preparedSaleData}
            additionalTransactions={extraTransactions}
            saleAdditionals={saleAdditionals}
            saleIncomes={saleIncomes}
            allAdditionals={allAdditionals}
            notes={documentData?.notes || ''}
            terms={
              documentData?.terms_and_conditions ||
              saleData.terms_and_conditions ||
              saleData.terms ||
              ''
            }
            documentNumber={
              sequentialNumber ||
              documentData?.document_number?.toString() ||
              saleData.id?.toString() ||
              ''
            }
            documentDate={formatDate(saleData.created_at || '')}
            tradeInVehicle={tradeInVehicle}
            tradeInVehicles={tradeInVehicles}
            onPrint={handlePrint}
            paymentBreakdown={saleData.payment_breakdown}
            reservationPayments={reservationPayments}
            extraPageConfig={extraPageConfig}
          />
        </div>
      </DialogContent>

      {/* Diálogo de Edición de Venta */}
      {vehicleData && (
        <VehicleSaleCreateEditDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          vehicle={vehicleData}
          onSuccess={() => {
            setIsEditDialogOpen(false);
            // Reload the document data
            window.location.reload();
          }}
          saleId={documentId}
          initialData={true}
        />
      )}
    </Dialog>
  );
};

export default SaleNoteViewer;

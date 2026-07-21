import React, { useState, useMemo } from 'react';
import { useDocumentViewers } from './hooks/useDocumentViewers';
import DocumentItem, { getDocumentTypeDisplay } from './DocumentItem';
import { useDocumentOperations } from './hooks/useDocumentOperations';
import DocumentViewers from './DocumentViewers';
import EmptyDocuments from './EmptyDocuments';
import VehicleSaleCreateEditDialog from '../sales-2/VehicleSaleCreateEditDialog';
import VehicleReservationDialog from '../reservations/VehicleReservationDialog';
import CloseBusinessDealDrawer from '../close-business-deal/CloseBusinessDealDrawer';
import DocumentEditDrawer from './DocumentEditDrawer';
import { Vehicle } from '@/types/vehicle';
import { Skeleton } from '@/components/ui/skeleton';

interface Document {
  id: number;
  type: string;
  created_at?: string;
  document_date?: string;
  notes?: string;
  status?: string;
  client_id?: number;
  client_name?: string;
  vehicle_id?: number;
  amount?: number;
  [key: string]: string | number | boolean | undefined;
}

interface DocumentsListProps {
  vehicleId: number;
  documents: Document[];
  onRefresh: () => void;
  isCompact?: boolean;
  vehicle?: Vehicle;
  isLoading?: boolean;
}

const DocumentsList: React.FC<DocumentsListProps> = ({
  vehicleId,
  documents,
  onRefresh,
  isCompact = false,
  vehicle,
  isLoading = false,
}) => {
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const { isDeleting, handleDeleteDocument } = useDocumentOperations(onRefresh);

  // State for sale edit dialog
  const [isEditSaleDialogOpen, setIsEditSaleDialogOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null
  );

  // State for reservation edit dialog
  const [isEditReservationDialogOpen, setIsEditReservationDialogOpen] =
    useState(false);
  const [selectedReservationDocumentId, setSelectedReservationDocumentId] =
    useState<number | null>(null);

  // State for close business deal edit dialog
  const [isEditCloseDealDialogOpen, setIsEditCloseDealDialogOpen] =
    useState(false);
  const [selectedCloseDealDocumentId, setSelectedCloseDealDocumentId] =
    useState<number | null>(null);

  // State for generic document edit drawer (quotation, purchase, consignment)
  const [isGenericEditOpen, setIsGenericEditOpen] = useState(false);
  const [genericEditDocId, setGenericEditDocId] = useState<number | null>(null);
  const [genericEditType, setGenericEditType] = useState<string>('');

  const {
    selectedConsignment,
    showConsignmentViewer,
    selectedQuotation,
    showQuotationViewer,
    selectedSale,
    showSaleViewer,
    selectedPurchase,
    showPurchaseViewer,
    selectedReservation,
    showReservationViewer,
    selectedCloseDeal,
    showCloseDealViewer,
    setShowConsignmentViewer,
    setShowQuotationViewer,
    setShowSaleViewer,
    setShowPurchaseViewer,
    setShowReservationViewer,
    setShowCloseDealViewer,
    viewDocument,
    downloadDocument,
    autoDownloadType,
    specSheetView,
    showSpecSheetViewer,
    setShowSpecSheetViewer,
  } = useDocumentViewers();

  // Handler for editing sale document
  const handleEditSale = (document: Document) => {
    if (document.id && document.type === 'sale') {
      // Los diálogos se montan SIEMPRE cerrados (ver abajo), así que acá solo
      // seteamos el id y abrimos: vaul recibe la transición isOpen false→true.
      setSelectedDocumentId(document.id);
      setIsEditSaleDialogOpen(true);
    }
  };

  // Handler for when a sale is successfully updated
  const handleSaleUpdated = () => {
    setIsEditSaleDialogOpen(false);
    setSelectedDocumentId(null);
    // Reload so Resumen/Timeline/Detalles también vean el sale_price actualizado.
    // Sin reload, cada tab mantiene su propia instancia de useVehicleFinancialData
    // con saleData stale hasta que se desmonte.
    window.location.reload();
  };

  // Handler for editing reservation document
  const handleEditReservation = (document: Document) => {
    if (document.id && document.type === 'reservation') {
      setSelectedReservationDocumentId(document.id);
      setIsEditReservationDialogOpen(true);
    }
  };

  // Handler for when a reservation is successfully updated
  const handleReservationUpdated = () => {
    setIsEditReservationDialogOpen(false);
    setSelectedReservationDocumentId(null);
    window.location.reload();
  };

  // Handler for editing close business deal document
  const handleEditCloseDeal = (document: Document) => {
    if (document.id && document.type === 'close_deal') {
      setSelectedCloseDealDocumentId(document.id);
      setIsEditCloseDealDialogOpen(true);
    }
  };

  // Handler for when a close business deal is successfully updated
  const handleCloseDealUpdated = () => {
    setIsEditCloseDealDialogOpen(false);
    setSelectedCloseDealDocumentId(null);
    window.location.reload();
  };

  // Generic edit handler for quotation, purchase, consignment
  const handleGenericEdit = (document: Document) => {
    if (document.id) {
      setGenericEditDocId(document.id);
      setGenericEditType(document.type);
      setIsGenericEditOpen(true);
    }
  };

  const handleGenericEditSuccess = () => {
    setIsGenericEditOpen(false);
    setGenericEditDocId(null);
    setGenericEditType('');
    // purchase/consignment editan precio de adquisición → cambia GASTOS del timeline.
    // Reload para que todos los tabs (Resumen, Línea de tiempo, Detalles) lo reflejen.
    window.location.reload();
  };

  // Ordenar documentos del más reciente al más antiguo
  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      const dateA = (a.document_date || a.created_at) ? new Date(a.document_date || a.created_at).getTime() : 0;
      const dateB = (b.document_date || b.created_at) ? new Date(b.document_date || b.created_at).getTime() : 0;
      return dateB - dateA; // Orden descendente (más reciente primero)
    });
  }, [documents]);

  if (isLoading) {
    // Mostrar 3 skeletons de documento
    return (
      <div className='space-y-2'>
        <div className='grid gap-3'>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className='h-16 w-full rounded-lg' />
          ))}
        </div>
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <EmptyDocuments message='Este vehículo aún no tiene documentos principales.' />
    );
  }

  return (
    <div className='space-y-2'>
      <div className='grid gap-3'>
        {sortedDocuments.map((document) => (
          <DocumentItem
            key={`${document.id}${document.is_trade_in_doc ? '-ti' : ''}`}
            document={document}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            isDeleting={isDeleting}
            handleDeleteDocument={document.is_trade_in_doc ? async () => {} : handleDeleteDocument}
            onView={viewDocument}
            onDownload={downloadDocument}
            onEdit={
              document.is_trade_in_doc
                ? undefined
                : document.type === 'sale'
                ? handleEditSale
                : document.type === 'reservation'
                ? handleEditReservation
                : document.type === 'close_deal'
                ? handleEditCloseDeal
                : document.type === 'consignment'
                ? handleGenericEdit
                : document.type === 'quotation'
                ? handleGenericEdit
                : document.type === 'purchase'
                ? handleGenericEdit
                : undefined
            }
            isCompact={isCompact}
            hideDelete={document.is_trade_in_doc}
          />
        ))}
      </div>

      <DocumentViewers
        selectedConsignment={selectedConsignment}
        showConsignmentViewer={showConsignmentViewer}
        selectedQuotation={selectedQuotation}
        showQuotationViewer={showQuotationViewer}
        selectedSale={selectedSale}
        showSaleViewer={showSaleViewer}
        selectedPurchase={selectedPurchase}
        showPurchaseViewer={showPurchaseViewer}
        selectedReservation={selectedReservation}
        showReservationViewer={showReservationViewer}
        selectedCloseDeal={selectedCloseDeal}
        showCloseDealViewer={showCloseDealViewer}
        onCloseConsignment={() => setShowConsignmentViewer(false)}
        onCloseQuotation={() => setShowQuotationViewer(false)}
        onCloseSale={() => setShowSaleViewer(false)}
        onClosePurchase={() => setShowPurchaseViewer(false)}
        onCloseReservation={() => setShowReservationViewer(false)}
        onCloseCloseDeal={() => setShowCloseDealViewer(false)}
        autoDownloadType={autoDownloadType}
        specSheetView={specSheetView}
        showSpecSheetViewer={showSpecSheetViewer}
        onCloseSpecSheet={() => setShowSpecSheetViewer(false)}
      />

      {/* Diálogos de edición: se montan SIEMPRE (cerrados) — gateados solo por
          `vehicle`, igual que en VehicleDetailHeader. Así vaul ya tiene el drawer en
          estado cerrado y, al abrir, recibe la transición isOpen false→true y el panel
          anima hacia adentro. Si se montaran recién al hacer click (gate por id), el
          contenido de vaul nace "abierto" y queda fuera de pantalla → no aparece nada. */}
      {vehicle && (
        <VehicleSaleCreateEditDialog
          isOpen={isEditSaleDialogOpen}
          onClose={() => setIsEditSaleDialogOpen(false)}
          saleId={selectedDocumentId ?? undefined}
          initialData={true}
          vehicle={vehicle}
          onSuccess={handleSaleUpdated}
        />
      )}
      {/* Diálogo de edición de reservación */}
      {vehicle && (
        <VehicleReservationDialog
          isOpen={isEditReservationDialogOpen}
          onClose={() => setIsEditReservationDialogOpen(false)}
          vehicle={vehicle}
          onSuccess={handleReservationUpdated}
        />
      )}

      {/* Diálogo de edición de cierre de negocio */}
      {vehicle && (
        <CloseBusinessDealDrawer
          isOpen={isEditCloseDealDialogOpen}
          onClose={() => setIsEditCloseDealDialogOpen(false)}
          vehicle={vehicle}
          onSuccess={handleCloseDealUpdated}
          documentId={selectedCloseDealDocumentId}
          isEditMode
        />
      )}

      {/* Drawer genérico (cotización, compra, consignación): montado siempre
          (cerrado) por el mismo motivo. documentId puede ser null mientras está
          cerrado; el componente lo ignora hasta que isOpen pasa a true. */}
      <DocumentEditDrawer
        isOpen={isGenericEditOpen}
        onClose={() => setIsGenericEditOpen(false)}
        documentId={genericEditDocId}
        documentType={genericEditType as any}
        vehicleId={vehicleId}
        onSuccess={handleGenericEditSuccess}
      />
    </div>
  );
};

export default DocumentsList;

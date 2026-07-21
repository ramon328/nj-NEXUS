import React from 'react';
import ConsignmentNoteViewerPro from './ConsignmentNoteViewerPro';
import QuotationViewerPro from './QuotationViewerPro';
import SaleNoteViewerProDialog from './SaleNoteViewerProDialog';
import PurchaseNoteViewerPro from './PurchaseNoteViewerPro';
import ReservationNoteViewerPro from './ReservationNoteViewerPro';
import CloseBusinessDealViewerPro from './CloseBusinessDealViewerPro';
import SpecSheetViewerPro from './SpecSheetViewerPro';

interface DocumentViewersProps {
  selectedConsignment: number | null;
  showConsignmentViewer: boolean;
  selectedQuotation: number | null;
  showQuotationViewer: boolean;
  selectedSale: number | null;
  showSaleViewer: boolean;
  selectedPurchase: number | null;
  showPurchaseViewer: boolean;
  selectedReservation: number | null;
  showReservationViewer: boolean;
  selectedCloseDeal: number | null;
  showCloseDealViewer: boolean;
  onCloseConsignment: () => void;
  onCloseQuotation: () => void;
  onCloseSale: () => void;
  onClosePurchase: () => void;
  onCloseReservation: () => void;
  onCloseCloseDeal: () => void;
  /** Si coincide con el tipo, ese viewer genera y descarga el PDF directo. */
  autoDownloadType?: string | null;
  /** Ficha técnica: viewer con preview. */
  specSheetView?: { vehicleId: number; clientId?: number | null } | null;
  showSpecSheetViewer?: boolean;
  onCloseSpecSheet?: () => void;
}

const DocumentViewers: React.FC<DocumentViewersProps> = ({
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
  onCloseConsignment,
  onCloseQuotation,
  onCloseSale,
  onClosePurchase,
  onCloseReservation,
  onCloseCloseDeal,
  autoDownloadType,
  specSheetView,
  showSpecSheetViewer,
  onCloseSpecSheet,
}) => {
  return (
    <>
      {showConsignmentViewer && selectedConsignment && (
        <ConsignmentNoteViewerPro
          documentId={selectedConsignment}
          isOpen={showConsignmentViewer}
          onClose={onCloseConsignment}
          autoDownload={autoDownloadType === 'consignment'}
        />
      )}

      {showQuotationViewer && selectedQuotation && (
        <QuotationViewerPro
          documentId={selectedQuotation}
          isOpen={showQuotationViewer}
          onClose={onCloseQuotation}
          autoDownload={autoDownloadType === 'quotation'}
        />
      )}

      {showSaleViewer && selectedSale && (
        <SaleNoteViewerProDialog
          documentId={selectedSale}
          isOpen={showSaleViewer}
          onClose={onCloseSale}
          autoDownload={autoDownloadType === 'sale'}
        />
      )}

      {showPurchaseViewer && selectedPurchase && (
        <PurchaseNoteViewerPro
          documentId={selectedPurchase}
          isOpen={showPurchaseViewer}
          onClose={onClosePurchase}
          autoDownload={autoDownloadType === 'purchase'}
        />
      )}

      {showReservationViewer && selectedReservation && (
        <ReservationNoteViewerPro
          documentId={selectedReservation}
          isOpen={showReservationViewer}
          onClose={onCloseReservation}
          autoDownload={autoDownloadType === 'reservation'}
        />
      )}

      {showCloseDealViewer && selectedCloseDeal && (
        <CloseBusinessDealViewerPro
          documentId={selectedCloseDeal}
          isOpen={showCloseDealViewer}
          onClose={onCloseCloseDeal}
          autoDownload={autoDownloadType === 'close_deal'}
        />
      )}

      {showSpecSheetViewer && specSheetView && (
        <SpecSheetViewerPro
          isOpen={showSpecSheetViewer}
          onClose={onCloseSpecSheet || (() => {})}
          vehicleId={specSheetView.vehicleId}
          clientId={specSheetView.clientId}
        />
      )}
    </>
  );
};

export default DocumentViewers;

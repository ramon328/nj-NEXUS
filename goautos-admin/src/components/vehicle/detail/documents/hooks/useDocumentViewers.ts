import { useState } from 'react';
import { downloadVehicleSpecSheet } from '@/utils/vehicleSpecSheet';

interface Document {
  id: number;
  type: string;
  created_at?: string;
  notes?: string;
  status?: string;
  [key: string]: any;
}

export const useDocumentViewers = () => {
  // Document viewer states
  const [selectedConsignment, setSelectedConsignment] = useState<number | null>(
    null
  );
  const [showConsignmentViewer, setShowConsignmentViewer] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<number | null>(
    null
  );
  const [showQuotationViewer, setShowQuotationViewer] = useState(false);
  const [selectedSale, setSelectedSale] = useState<number | null>(null);
  const [showSaleViewer, setShowSaleViewer] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<number | null>(null);
  const [showPurchaseViewer, setShowPurchaseViewer] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<number | null>(
    null
  );
  const [showReservationViewer, setShowReservationViewer] = useState(false);
  const [selectedCloseDeal, setSelectedCloseDeal] = useState<number | null>(
    null
  );
  const [showCloseDealViewer, setShowCloseDealViewer] = useState(false);
  // Cuando está seteado, el viewer de ese tipo genera el PDF y lo descarga solo
  // (sin que el usuario interactúe), luego cierra. Para "descargar directo".
  const [autoDownloadType, setAutoDownloadType] = useState<string | null>(null);
  // Ficha técnica: viewer con preview (vehicleId/clientId, no documentId).
  const [specSheetView, setSpecSheetView] = useState<{
    vehicleId: number;
    clientId?: number | null;
  } | null>(null);
  const [showSpecSheetViewer, setShowSpecSheetViewer] = useState(false);

  // Abre el viewer del tipo. Si auto=true, el viewer auto-descarga y cierra.
  const openViewer = (document: Document, auto: boolean) => {
    setAutoDownloadType(auto ? document.type : null);
    switch (document.type) {
      case 'consignment':
        setSelectedConsignment(document.id);
        setShowConsignmentViewer(true);
        break;
      case 'quotation':
        setSelectedQuotation(document.id);
        setShowQuotationViewer(true);
        break;
      case 'sale':
        setSelectedSale(document.id);
        setShowSaleViewer(true);
        break;
      case 'purchase':
        setSelectedPurchase(document.id);
        setShowPurchaseViewer(true);
        break;
      case 'reservation':
        setSelectedReservation(document.id);
        setShowReservationViewer(true);
        break;
      case 'close_deal':
        setSelectedCloseDeal(document.id);
        setShowCloseDealViewer(true);
        break;
      case 'spec_sheet':
        // Ver → viewer de ficha con preview. Descargar (auto) → baja el PDF directo.
        if (auto) {
          downloadVehicleSpecSheet(document.vehicle_id, document.client_id).catch(() => {});
        } else {
          setSpecSheetView({
            vehicleId: document.vehicle_id,
            clientId: document.client_id,
          });
          setShowSpecSheetViewer(true);
        }
        break;
      default:
        // For other document types
        break;
    }
  };

  // Ver: abre el viewer normal. Descargar: abre el viewer en modo auto-descarga.
  const viewDocument = (document: Document) => openViewer(document, false);
  const downloadDocument = (document: Document) => openViewer(document, true);

  return {
    autoDownloadType,
    downloadDocument,
    specSheetView,
    showSpecSheetViewer,
    setShowSpecSheetViewer,
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
  };
};

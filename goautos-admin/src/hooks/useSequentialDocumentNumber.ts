import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseSequentialDocumentNumberProps {
  clientId: number | null;
  documentId: number | null;
  documentType:
    | 'sale'
    | 'purchase'
    | 'consignment'
    | 'reservation'
    | 'quotation'
    | 'close_deal';
  isOpen: boolean;
}

/**
 * Hook para calcular el número secuencial de documentos por cliente
 * @param clientId - ID del cliente/automotriz
 * @param documentId - ID del documento actual
 * @param documentType - Tipo de documento (sale, purchase, consignment, etc.)
 * @param isOpen - Si el modal/viewer está abierto
 * @returns El número secuencial como string
 */
export const useSequentialDocumentNumber = ({
  clientId,
  documentId,
  documentType,
  isOpen,
}: UseSequentialDocumentNumberProps): string => {
  const [sequentialNumber, setSequentialNumber] = useState<string>('');

  useEffect(() => {
    const calculateSequentialNumber = async () => {
      if (!clientId || !documentId) {
        setSequentialNumber('');
        return;
      }

      try {
        let tableName: string;
        let idField: string;
        let vehicleRelation: string;

        // Determinar la tabla y campos según el tipo de documento
        switch (documentType) {
          case 'sale':
            tableName = 'vehicles_sales';
            idField = 'id';
            vehicleRelation = 'vehicle:vehicle_id';
            break;
          case 'purchase':
            tableName = 'vehicles_purchases';
            idField = 'id';
            vehicleRelation = 'vehicle:vehicle_id';
            break;
          case 'consignment':
            tableName = 'vehicles_consignments';
            idField = 'id';
            vehicleRelation = 'vehicle:vehicle_id';
            break;
          case 'reservation':
            tableName = 'vehicles_reservations';
            idField = 'id';
            vehicleRelation = 'vehicle:vehicle_id';
            break;
          case 'quotation':
            tableName = 'vehicles_quotations';
            idField = 'id';
            vehicleRelation = 'vehicle:vehicle_id';
            break;
          case 'close_deal':
            tableName = 'vehicles_close_deal';
            idField = 'document_id';
            vehicleRelation =
              'vehicles_documents!document_id(vehicle_id, client_id)';
            break;
          default:
            console.error('Tipo de documento no soportado:', documentType);
            setSequentialNumber('');
            return;
        }

        // Obtener todos los documentos de este tipo de este cliente hasta este documento (inclusive)
        const { data: allDocuments, error: documentsError } = await supabase
          .from(tableName)
          .select(
            `
            ${idField},
            ${vehicleRelation} (
              client_id
            )
          `
          )
          .lte(idField, documentId)
          .order(idField, { ascending: true });

        if (!documentsError && allDocuments) {
          // Filtrar solo los documentos de este cliente
          const clientDocuments = allDocuments.filter((doc: any) => {
            if (documentType === 'close_deal') {
              // Para close_deal, la relación es vehicles_documents!document_id
              return doc.vehicles_documents?.client_id === clientId;
            } else {
              // Para otros tipos, la relación es vehicle:vehicle_id
              return doc.vehicle?.client_id === clientId;
            }
          });

          setSequentialNumber(clientDocuments.length.toString());
        } else {
          console.error('Error fetching documents:', documentsError);
          setSequentialNumber('');
        }
      } catch (error) {
        console.error('Error calculating sequential number:', error);
        setSequentialNumber('');
      }
    };

    if (isOpen && clientId && documentId) {
      calculateSequentialNumber();
    } else {
      setSequentialNumber('');
    }
  }, [isOpen, clientId, documentId, documentType]);

  return sequentialNumber;
};

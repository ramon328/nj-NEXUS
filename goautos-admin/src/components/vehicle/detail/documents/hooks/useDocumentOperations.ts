import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PostgrestError } from '@supabase/supabase-js';
import { invalidateSalesQueries } from '@/lib/invalidateSalesQueries';

interface Document {
  id: number;
  type: string;
  created_at?: string;
  notes?: string;
  status?: string;
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Helper function to get the "Publicado" status ID for a client
 */
const getPublishedStatusId = async (clientId: number): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('clients_vehicles_states')
      .select('id')
      .eq('client_id', clientId)
      .ilike('name', '%publicado%')
      .single();

    if (error || !data) {
      console.error('Error getting Publicado status:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error in getPublishedStatusId:', error);
    return null;
  }
};

/**
 * Helper function to update vehicle status back to "Publicado"
 */
const updateVehicleToPublished = async (vehicleId: number, clientId: number): Promise<boolean> => {
  try {
    const publishedStatusId = await getPublishedStatusId(clientId);
    if (!publishedStatusId) {
      console.error('Could not find Publicado status for client');
      return false;
    }

    const { error } = await supabase
      .from('vehicles')
      .update({ status_id: publishedStatusId, updated_at: new Date().toISOString() })
      .eq('id', vehicleId)
      .eq('client_id', clientId);

    if (error) {
      console.error('Error updating vehicle status to Publicado:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateVehicleToPublished:', error);
    return false;
  }
};

/**
 * Helper function to delete sale-related data
 */
const deleteSaleData = async (documentId: number, vehicleId: number): Promise<void> => {
  // Delete sale additionals from vehicles_extras
  const { error: extrasError } = await supabase
    .from('vehicles_extras')
    .delete()
    .eq('vehicle_id', vehicleId)
    .eq('type', 'sale_additional');

  if (extrasError) {
    console.warn('Error deleting sale additionals:', extrasError);
  }

  // Delete the sale record
  const { error: saleError } = await supabase
    .from('vehicles_sales')
    .delete()
    .eq('document_id', documentId);

  if (saleError) {
    console.warn('Error deleting sale record:', saleError);
  }
};

/**
 * Helper function to delete reservation-related data
 */
const deleteReservationData = async (documentId: number, vehicleId: number): Promise<void> => {
  // Delete reservation payments and additionals from vehicles_extras
  const { error: extrasError } = await supabase
    .from('vehicles_extras')
    .delete()
    .eq('vehicle_id', vehicleId)
    .in('type', ['reservation_payment', 'reservation_additional']);

  if (extrasError) {
    console.warn('Error deleting reservation extras:', extrasError);
  }

  // Delete the reservation record
  const { error: reservationError } = await supabase
    .from('vehicles_reservations')
    .delete()
    .eq('document_id', documentId);

  if (reservationError) {
    console.warn('Error deleting reservation record:', reservationError);
  }
};

export const useDocumentOperations = (onRefresh: () => void) => {
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteDocument = async (documentId: number) => {
    setIsDeleting(true);
    try {
      // First, get the document info to know its type, vehicle_id, and client_id
      const { data: documentData, error: docError } = await supabase
        .from('vehicles_documents')
        .select('type, vehicle_id, client_id')
        .eq('id', documentId)
        .single();

      if (docError) {
        console.error('Error fetching document data:', docError);
        throw new Error('No se pudo obtener la información del documento.');
      }

      const { type, vehicle_id: vehicleId, client_id: clientId } = documentData;

      // Handle deletion based on document type
      if (type === 'sale' && vehicleId) {
        // Delete sale data and related extras
        await deleteSaleData(documentId, vehicleId);

        // Update vehicle status back to "Publicado"
        if (clientId) {
          await updateVehicleToPublished(vehicleId, clientId);
        }
      } else if (type === 'reservation' && vehicleId) {
        // Delete reservation data and related extras
        await deleteReservationData(documentId, vehicleId);

        // Update vehicle status back to "Publicado"
        if (clientId) {
          await updateVehicleToPublished(vehicleId, clientId);
        }
      }

      // Delete any associated quotation
      const { error: quotationError } = await supabase
        .from('vehicles_quotations')
        .delete()
        .eq('document_id', documentId);

      if (quotationError && !quotationError.message.includes('no rows')) {
        console.warn('Error al eliminar cotización:', quotationError);
      }

      // Finally, delete the document
      const { error } = await supabase
        .from('vehicles_documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        if (error.message.includes('violates foreign key constraint')) {
          throw new Error(
            'Este documento está vinculado a otros registros. Para eliminarlo, primero debes eliminar los registros asociados.'
          );
        }
        throw new Error(error.message);
      }

      toast({
        title: 'Documento eliminado',
        description: 'El documento y sus registros asociados han sido eliminados exitosamente.',
      });

      // Borrar una nota de venta / reserva cambia márgenes, stock y resúmenes: invalidar
      // las queries de ventas para que dashboard, resumen mensual y el resumen del
      // vehículo (vía signal query en useVehicleFinancialData) se refresquen al instante.
      invalidateSalesQueries(queryClient);

      onRefresh();
    } catch (error: Error | PostgrestError | unknown) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo eliminar el documento.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setMenuOpen(null);
    }
  };

  return {
    menuOpen,
    setMenuOpen,
    isDeleting,
    handleDeleteDocument,
  };
};

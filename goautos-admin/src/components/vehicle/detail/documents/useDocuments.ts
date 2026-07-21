import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VehicleTransaction } from '../transactions/types';

export const useDocuments = (vehicleId: number) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentTransactions, setDocumentTransactions] = useState<
    VehicleTransaction[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);

      // Fetch documents from vehicles_documents
      const { data: docsData, error: docsError } = await supabase
        .from('vehicles_documents')
        .select('*')
        .eq('vehicle_id', vehicleId);

      if (docsError) {
        console.error('Error fetching vehicle documents:', docsError);
        return;
      }

      // Fetch purchase documents from trade-in vehicles (parte de pago)
      let tradeInDocs: any[] = [];
      try {
        console.log('[TRADEIN-DEBUG] v2 fetching trade-in docs for vehicle', vehicleId);
        // Check if this vehicle has a sale with trade-ins
        const { data: saleData, error: saleErr } = await supabase
          .from('vehicles_sales')
          .select('id, has_trade_in')
          .eq('vehicle_id', vehicleId)
          .eq('has_trade_in', true)
          .maybeSingle();
        console.log('[TRADEIN-DEBUG] saleData:', saleData, 'err:', saleErr);

        if (saleData) {
          // Get trade-in vehicle IDs from junction table
          const { data: tradeIns, error: tiErr } = await supabase
            .from('vehicles_sales_trade_ins')
            .select('trade_in_vehicle_id, brand_name, model_name, year, license_plate')
            .eq('vehicle_sale_id', saleData.id);
          console.log('[TRADEIN-DEBUG] tradeIns:', tradeIns, 'err:', tiErr);

          if (tradeIns && tradeIns.length > 0) {
            const tradeInVehicleIds = tradeIns.map((t) => t.trade_in_vehicle_id);

            // Fetch purchase documents for those trade-in vehicles
            const { data: purchaseDocs, error: pdErr } = await supabase
              .from('vehicles_documents')
              .select('*')
              .in('vehicle_id', tradeInVehicleIds)
              .eq('type', 'purchase');
            console.log('[TRADEIN-DEBUG] purchaseDocs:', purchaseDocs, 'err:', pdErr);

            if (purchaseDocs) {
              // Enrich with trade-in vehicle info for display
              tradeInDocs = purchaseDocs.map((doc) => {
                const tradeIn = tradeIns.find(
                  (t) => t.trade_in_vehicle_id === doc.vehicle_id
                );
                return {
                  ...doc,
                  is_trade_in_doc: true,
                  trade_in_label: tradeIn
                    ? `${tradeIn.brand_name || ''} ${tradeIn.model_name || ''} ${tradeIn.year || ''} ${tradeIn.license_plate || ''}`.trim()
                    : 'Parte de pago',
                };
              });
              console.log('[TRADEIN-DEBUG] tradeInDocs final:', tradeInDocs);
            }
          }
        }
      } catch (tradeInError) {
        console.error('[TRADEIN-DEBUG] Error fetching trade-in documents:', tradeInError);
      }

      // Fetch ALL transactions with documents from vehicles_extras
      // This includes type 'document', 'expense', 'income' or any other type with documents
      const { data: transactionsData, error: transactionsError } =
        await supabase
          .from('vehicles_extras')
          .select('*')
          .eq('vehicle_id', vehicleId)
          .not('docs_urls', 'is', null); // Get only transactions with documents

      if (transactionsError) {
        console.error(
          'Error fetching document transactions:',
          transactionsError
        );
        return;
      }

      // Process document transactions to ensure docs_urls is always an array
      const processedTransactions = transactionsData.map((transaction) => ({
        ...transaction,
        docs_urls: Array.isArray(transaction.docs_urls)
          ? transaction.docs_urls
          : transaction.docs_urls
          ? [transaction.docs_urls]
          : [],
      }));

      // Filter out transactions with empty docs_urls even after processing
      const transactionsWithDocuments = processedTransactions.filter(
        (transaction) =>
          transaction.docs_urls && transaction.docs_urls.length > 0
      );

      setDocuments([...(docsData || []), ...tradeInDocs]);
      setDocumentTransactions(transactionsWithDocuments);
    } catch (error) {
      console.error('Error in fetchDocuments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (vehicleId) {
      fetchDocuments();
    }
  }, [vehicleId]);

  return {
    documents,
    documentTransactions,
    isLoading,
    refreshDocuments: fetchDocuments,
  };
};

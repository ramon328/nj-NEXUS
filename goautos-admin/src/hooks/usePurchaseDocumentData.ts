import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PurchaseDocumentData {
  purchaseData: any;
  vehicleData: any;
  customerData: any;
  extraTransactions: any[];
  loading: boolean;
}

export const usePurchaseDocumentData = (
  documentId: number,
  isOpen: boolean
) => {
  const [loading, setLoading] = useState(true);
  const [purchaseData, setPurchaseData] = useState<any>(null);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [extraTransactions, setExtraTransactions] = useState<any[]>([]);
  const [documentData, setDocumentData] = useState<any>(null);
  const { client, clientId } = useAuth();

  useEffect(() => {
    const fetchPurchaseDocumentData = async () => {
      if (!documentId || !isOpen) return;

      setLoading(true);
      try {
        // 1. Fetch document and related purchase record
        const { data: docRecord, error: documentError } = await supabase
          .from('vehicles_documents')
          .select('*, vehicles_purchases(*)')
          .eq('id', documentId)
          .eq('type', 'purchase')
          .single();

        if (documentError) {
          console.error('Error fetching document:', documentError);
          return;
        }

        if (!docRecord) {
          console.error('Document not found');
          return;
        }

        // Fetch template terms & conditions based on client id
        if (client?.id) {
          try {
            const { data: templateData } = await supabase
              .from('document_templates')
              .select('*')
              .eq('client_id', client.id)
              .eq('template_type', 'purchase')
              .single();

            if (templateData) {
              // Add terms to document data
              docRecord.terms_and_conditions = templateData.terms_and_conditions;
            }
          } catch (templateError) {
            console.error('Error fetching template data:', templateError);
          }
        }

        setDocumentData(docRecord);

        let purchaseRecord = null;

        // If there's a related purchase record in the document, use it
        if (
          docRecord.vehicles_purchases &&
          docRecord.vehicles_purchases.length > 0
        ) {
          purchaseRecord = docRecord.vehicles_purchases[0];
        } else {
          // Fallback: filter by customer_id if available to avoid picking wrong purchase
          let purchaseQuery = supabase
            .from('vehicles_purchases')
            .select('*')
            .eq('vehicle_id', docRecord.vehicle_id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (docRecord.customer_id) {
            purchaseQuery = supabase
              .from('vehicles_purchases')
              .select('*')
              .eq('vehicle_id', docRecord.vehicle_id)
              .eq('customer_id', docRecord.customer_id)
              .order('created_at', { ascending: false })
              .limit(1);
          }

          const { data: purchaseFallback, error: purchaseError } = await purchaseQuery.maybeSingle();

          if (purchaseError) {
            console.error('Error fetching purchase record:', purchaseError);
          } else if (purchaseFallback) {
            purchaseRecord = purchaseFallback;
          }
        }

        // Set the purchase data if we found a record
        if (purchaseRecord) {
          // Copiar términos y condiciones del documento al registro de compra
          if (docRecord.terms_and_conditions) {
            purchaseRecord.terms_and_conditions = docRecord.terms_and_conditions;
          }
          setPurchaseData(purchaseRecord);
        }

        // 2. Fetch vehicle data
        const { data: vehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .select(
            '*,  brand:brand_id(*), model:model_id(*), color:color_id(*), category:category_id(*)'
          )
          .eq('id', docRecord.vehicle_id)
          .eq('client_id', clientId)
          .single();

        if (vehicleError) {
          console.error('Error fetching vehicle:', vehicleError);
          return;
        }

        setVehicleData(vehicle);

        // 3. Fetch customer data (seller in this case)
        // Try to get customer from both the document and purchase record
        const customerId = docRecord.customer_id || purchaseRecord?.customer_id;

        if (customerId) {
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .maybeSingle();

          if (customerError) {
            console.error('Error fetching customer:', customerError);
            // Don't return — document can still render without customer data
          }

          setCustomerData(customer);
        }

        // 4. Fetch extras (income and expenses)
        const { data: extras, error: extrasError } = await supabase
          .from('vehicles_extras')
          .select('*')
          .eq('vehicle_id', docRecord.vehicle_id);

        if (extrasError) {
          console.error('Error fetching extras:', extrasError);
          return;
        }

        setExtraTransactions(extras || []);
      } catch (error) {
        console.error('Error in fetchPurchaseDocumentData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseDocumentData();
  }, [documentId, isOpen, client, clientId]);

  return {
    loading,
    purchaseData,
    vehicleData,
    customerData,
    extraTransactions,
    documentData,
  };
};

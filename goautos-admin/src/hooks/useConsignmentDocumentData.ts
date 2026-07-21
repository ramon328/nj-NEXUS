
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useConsignmentDocumentData = (
  documentId: number,
  isOpen: boolean
) => {
  const [loading, setLoading] = useState(true);
  const [consignmentData, setConsignmentData] = useState<any>(null);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [documentData, setDocumentData] = useState<any>(null);
  const { client } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!documentId || !isOpen) return;

      setLoading(true);
      try {
        // First, fetch the document data
        const { data: docData, error: docError } = await supabase
          .from('vehicles_documents')
          .select('*')
          .eq('id', documentId)
          .single();

        if (docError) {
          console.error('Error fetching document:', docError);
          return;
        }
        
        // Get template terms and conditions
        const { data: templateData, error: templateError } = await supabase
          .from('document_templates')
          .select('*')
          .eq('client_id', client?.id)
          .eq('template_type', 'consignment')
          .single();

        // Create a document data object with terms_and_conditions
        const enhancedDocData = {
          ...docData,
          terms_and_conditions: templateData?.terms_and_conditions || ''
        };

        setDocumentData(enhancedDocData);

        // Fetch the consignment data: first by document_id, then fallback by vehicle_id
        let consignmentRecord = null;

        const { data: consignmentByDoc } = await supabase
          .from('vehicles_consignments')
          .select('*')
          .eq('document_id', documentId)
          .maybeSingle();

        if (consignmentByDoc) {
          consignmentRecord = consignmentByDoc;
        } else {
          // Fallback: find by vehicle_id (+ customer_id if available on document)
          let fallbackQuery = supabase
            .from('vehicles_consignments')
            .select('*')
            .eq('vehicle_id', docData.vehicle_id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (docData.customer_id) {
            fallbackQuery = supabase
              .from('vehicles_consignments')
              .select('*')
              .eq('vehicle_id', docData.vehicle_id)
              .eq('customer_id', docData.customer_id)
              .order('created_at', { ascending: false })
              .limit(1);
          }

          const { data: consignmentFallback, error: fallbackError } = await fallbackQuery.maybeSingle();

          if (fallbackError) {
            console.error('Error fetching consignment data:', fallbackError);
            return;
          }

          consignmentRecord = consignmentFallback;
        }

        if (!consignmentRecord) {
          console.error('Consignment data not found');
          return;
        }

        setConsignmentData(consignmentRecord);

        // Fetch the vehicle data
        const vehicleId = docData.vehicle_id;
        const { data: vehicleData, error: vehicleError } = await supabase
          .from('vehicles')
          .select(
            `
            *,
            brand:brand_id(name),
            model:model_id(name),
            category:category_id(name),
            color:color_id(name),
            condition:condition_id(name),
            fuel_type:fuel_type_id(name)
          `
          )
          .eq('id', vehicleId)
          .single();

        console.log('vehicleData', vehicleData);
        if (vehicleError) {
          console.error('Error fetching vehicle data:', vehicleError);
          return;
        }

        setVehicleData(vehicleData);

        // Fetch the customer data
        const customerId = consignmentRecord?.customer_id || docData?.customer_id;
        if (customerId) {
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .maybeSingle();

          if (customerError) {
            console.error('Error fetching customer data:', customerError);
            // Don't return — document can still render without customer data
          }

          setCustomerData(customerData);
        }
      } catch (error) {
        console.error('Error in useConsignmentDocumentData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [documentId, isOpen, client]);

  return {
    loading,
    documentData,
    consignmentData,
    vehicleData,
    customerData,
  };
};

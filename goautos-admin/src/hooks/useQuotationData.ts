import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useQuotationData = (documentId: number) => {
  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState<any>(null);
  const [quotationData, setQuotationData] = useState<any>(null);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const { client } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch document data
        const { data: document, error: documentError } = await supabase
          .from('vehicles_documents')
          .select(
            `
            *,
            client_id (*)
          `
          )
          .eq('id', documentId)
          .single();

        if (documentError) throw documentError;

        // Fetch template terms & conditions based on client id
        if (client?.id) {
          try {
            const { data: templateData } = await supabase
              .from('document_templates')
              .select('*')
              .eq('client_id', client.id)
              .eq('template_type', 'quotation')
              .single();

            if (templateData) {
              // Add terms to document data
              document.terms_and_conditions = templateData.terms_and_conditions;
            }
          } catch (templateError) {
            console.error('Error fetching template data:', templateError);
          }
        }

        setDocumentData(document);

        // Fetch quotation data
        const { data: quotation, error: quotationError } = await supabase
          .from('vehicles_quotations')
          .select('*')
          .eq('document_id', documentId)
          .single();

        if (quotationError) throw quotationError;

        // Copiar términos y condiciones del documento al registro de cotización
        if (document.terms_and_conditions) {
          quotation.terms_and_conditions = document.terms_and_conditions;
        }

        setQuotationData(quotation);

        // Fetch vehicle data
        const { data: vehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .select(
            `
            *,
            brand: brands (name),
            model: models (name),
            category: categories (name),
            color: colors (name),
            fuel_type: fuel_types (name)
          `
          )
          .eq('id', document.vehicle_id)
          .single();

        if (vehicleError) throw vehicleError;
        setVehicleData(vehicle);

        // Fetch customer data if available
        if (document.customer_id) {
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', document.customer_id)
            .single();

          if (!customerError) {
            setCustomerData(customer);
          }
        }
      } catch (error) {
        console.error('Error fetching quotation data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      fetchData();
    }
  }, [documentId, client]);

  return {
    loading,
    documentData,
    quotationData,
    vehicleData,
    customerData,
  };
};

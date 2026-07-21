
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useQuotationData = (documentId: number, isOpen: boolean) => {
  const [loading, setLoading] = useState(true);
  const [documentData, setDocumentData] = useState<any>(null);
  const [quotationData, setQuotationData] = useState<any>(null);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const { client } = useAuth();

  useEffect(() => {
    const fetchQuotationData = async () => {
      try {
        setLoading(true);
        
        // Fetch document data
        const { data: document, error: documentError } = await supabase
          .from('vehicles_documents')
          .select('*')
          .eq('id', documentId)
          .single();
        
        if (documentError) throw documentError;
        
        // Get template terms and conditions
        const { data: templateData, error: templateError } = await supabase
          .from('document_templates')
          .select('*')
          .eq('client_id', client?.id)
          .eq('template_type', 'quotation')
          .single();
          
        // Enhance document with terms and conditions
        const enhancedDocument = {
          ...document,
          terms_and_conditions: templateData?.terms_and_conditions || ''
        };
        
        setDocumentData(enhancedDocument);
        
        // Fetch quotation data
        const { data: quotation, error: quotationError } = await supabase
          .from('vehicles_quotations')
          .select('*')
          .eq('document_id', documentId)
          .single();
        
        if (quotationError) throw quotationError;
        
        // Enhance quotation with terms if needed
        const enhancedQuotation = {
          ...quotation,
          terms_and_conditions: enhancedDocument.terms_and_conditions
        };
        
        setQuotationData(enhancedQuotation);
        
        // Fetch vehicle data
        if (document.vehicle_id) {
          const { data: vehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .select(`
              *,
              brand:brand_id(*),
              model:model_id(*),
              color:color_id(*),
              category:category_id(*)
            `)
            .eq('id', document.vehicle_id)
            .single();
          
          if (vehicleError) throw vehicleError;
          setVehicleData(vehicle);
        }
        
        // Fetch customer data if available
        if (document.customer_id) {
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', document.customer_id)
            .single();
          
          if (customerError) throw customerError;
          setCustomerData(customer);
        }
      } catch (error) {
        console.error('Error fetching quotation data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (isOpen && documentId) {
      fetchQuotationData();
    }
  }, [isOpen, documentId, client]);

  return {
    loading,
    documentData,
    quotationData,
    vehicleData,
    customerData
  };
};

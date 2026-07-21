import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CloseBusinessDealData {
  loading: boolean;
  closeBusinessDealData: any | null;
  vehicleData: any | null;
  customerData: any | null;
  documentData: any | null;
  allAdditionals: any[];
}

export const useCloseBusinessDealData = (
  documentId: number,
  isOpen: boolean
): CloseBusinessDealData => {
  const { client, clientId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [closeBusinessDealData, setCloseBusinessDealData] = useState<
    any | null
  >(null);
  const [vehicleData, setVehicleData] = useState<any | null>(null);
  const [customerData, setCustomerData] = useState<any | null>(null);
  const [documentData, setDocumentData] = useState<any | null>(null);
  const [allAdditionals, setAllAdditionals] = useState<any[]>([]);

  useEffect(() => {
    const fetchCloseBusinessDealData = async () => {
      if (!documentId || !isOpen) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch the main document data (sin vehicles_close_deal por ahora)
        const { data: documentData, error: documentError } = await supabase
          .from('vehicles_documents')
          .select('*')
          .eq('id', documentId)
          .eq('type', 'close_deal')
          .single();

        if (documentError) {
          console.error('Error fetching document:', documentError);
          setLoading(false);
          return;
        }

        // Fetch template terms & conditions based on client id (igual que los otros documentos)
        if (client?.id) {
          try {
            const { data: templateData } = await supabase
              .from('document_templates')
              .select('*')
              .eq('client_id', client.id)
              .eq('template_type', 'close_deal')
              .single();

            if (templateData) {
              // Add terms to document data (igual que useSaleDocumentData)
              documentData.terms_and_conditions =
                templateData.terms_and_conditions;
            }
          } catch (templateError) {
            console.error('Error fetching template data:', templateError);
          }
        }

        setDocumentData(documentData);

        // Obtener sale_price de vehicles_sales (sin transfer_value)
        let salePrice = 0;

        if (documentData.vehicle_id) {
          const { data: saleData, error: saleError } = await supabase
            .from('vehicles_sales')
            .select('sale_price')
            .eq('vehicle_id', documentData.vehicle_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!saleError && saleData) {
            salePrice = saleData.sale_price || 0;
          }
        }

        // TEMPORAL: Leer datos desde vehicles_close_deal si existe, sino desde JSON en notes
        let closeDealData = null;

        // Intentar leer desde vehicles_close_deal
        const { data: closeDealFromTable, error: closeDealError } =
          await supabase
            .from('vehicles_close_deal')
            .select('*')
            .eq('document_id', documentId)
            .single();

        if (closeDealFromTable && !closeDealError) {
          closeDealData = closeDealFromTable;
        } else {
          // Si no existe en vehicles_close_deal, intentar leer desde JSON en notes
          if (documentData.notes) {
            try {
              const parsedNotes = JSON.parse(documentData.notes);
              if (parsedNotes.finalSalePrice) {
                closeDealData = {
                  finalSalePrice: parsedNotes.finalSalePrice,
                  dealershipCommission: parsedNotes.dealershipCommission,
                  dealershipCommissionPercentage:
                    parsedNotes.dealershipCommissionPercentage,
                  paymentMethod: parsedNotes.paymentMethod,
                };
              }
            } catch (error) {
              console.error('Error parsing notes JSON:', error);
            }
          }
        }

        if (closeDealData) {
          setCloseBusinessDealData({
            finalSalePrice: closeDealData.finalSalePrice,
            dealershipCommission: closeDealData.dealershipCommission,
            dealershipCommissionPercentage:
              closeDealData.dealershipCommissionPercentage,
            paymentMethod: closeDealData.paymentMethod,
            customNotes: documentData.notes || null,
            termsAndConditions: documentData.terms_and_conditions || null,
            sale_price: salePrice,
          });
        } else {
          setCloseBusinessDealData({
            finalSalePrice: 0,
            dealershipCommission: 0,
            dealershipCommissionPercentage: 0,
            paymentMethod: 'transferencia',
            customNotes: documentData.notes || null,
            termsAndConditions: documentData.terms_and_conditions || null,
            sale_price: salePrice,
          });
        }

        // Fetch vehicle data
        if (documentData.vehicle_id) {
          const { data: vehicleData, error: vehicleError } = await supabase
            .from('vehicles')
            .select(
              `
              *,
              brand:brand_id(name),
              model:model_id(name),
              color:color_id(name)
            `
            )
            .eq('id', documentData.vehicle_id)
            .eq('client_id', clientId)
            .single();

          if (vehicleError) {
            console.error('Error fetching vehicle:', vehicleError);
          } else {
            console.log('🚗 Vehicle data loaded:', vehicleData);
            setVehicleData(vehicleData);
          }
        }

        // Fetch customer data
        if (documentData.customer_id) {
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', documentData.customer_id)
            .single();

          if (customerError) {
            console.error('Error fetching customer:', customerError);
          } else {
            setCustomerData(customerData);
          }
        }

        // Fetch additional expenses (gastos adicionales)
        if (documentData.vehicle_id) {
          const { data: extras, error: extrasError } = await supabase
            .from('vehicles_extras')
            .select('*')
            .eq('vehicle_id', documentData.vehicle_id)
            .in('type', ['sale_additional', 'reservation_additional']);

          if (extrasError) {
            console.error('Error fetching extras:', extrasError);
          } else {
            console.log('💰 Additional expenses loaded:', extras);
            setAllAdditionals(extras || []);
          }
        }
      } catch (error) {
        console.error('Error in fetchCloseBusinessDealData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCloseBusinessDealData();
  }, [documentId, isOpen, client, clientId]);

  return {
    loading,
    closeBusinessDealData,
    vehicleData,
    customerData,
    documentData,
    allAdditionals,
  };
};

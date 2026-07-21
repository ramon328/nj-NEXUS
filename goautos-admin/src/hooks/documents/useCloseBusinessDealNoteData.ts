import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import useDocumentTemplate from '@/hooks/useDocumentTemplate';
import { extractTermsText } from '@/utils/documentTemplateUtils';
import { formatRut } from '@/utils/rutFormatter';
import { getCustomerDisplayName } from '@/utils/customerName';
import { ExtraPageConfig } from '@/types/document-template';
import { prepareImageForPDF } from '@/utils/imageUtils';
import { getLegalInfoForVehicle } from '@/services/legalInfoService';

interface CloseBusinessDealNoteData {
  companyName: string;
  companyRut: string;
  companyAddress: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;
  documentNumber: string;
  documentDate: string;
  customerName: string;
  customerRut?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehiclePlate?: string;
  vehicleMileage?: number;
  finalSalePrice: number;
  transferValue: number;
  dealershipCommission: number;
  paymentMethod?: string;
  additionals?: Array<{ title: string; amount: number }>;
  terms?: string;
  notes?: string;
  layoutConfig?: any;
  extraPageConfig?: ExtraPageConfig;
}

export const useCloseBusinessDealNoteData = (documentId: number) => {
  const [data, setData] = useState<CloseBusinessDealNoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { client, clientId } = useAuth();
  const { template, loading: templateLoading, getExtraPageConfig, getLayoutConfig } = useDocumentTemplate('close_deal');

  const refetch = () => {
    setData(null);
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!documentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch document
        const { data: document, error: documentError } = await supabase
          .from('vehicles_documents')
          .select('*')
          .eq('id', documentId)
          .eq('type', 'close_deal')
          .single();

        if (documentError) throw documentError;

        // Fetch vehicle
        const { data: vehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .select(`
            *,
            brand:brand_id(name),
            model:model_id(name),
            color:color_id(name)
          `)
          .eq('id', document.vehicle_id)
          .single();

        if (vehicleError) throw vehicleError;

        // Fetch customer (propietario)
        let customer = null;
        if (document.customer_id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', document.customer_id)
            .maybeSingle();

          customer = customerData;
        }

        // Fetch close deal data
        let closeDealData = null;
        const { data: closeDealFromTable } = await supabase
          .from('vehicles_close_deal')
          .select('*')
          .eq('document_id', documentId)
          .maybeSingle();

        if (closeDealFromTable) {
          closeDealData = closeDealFromTable;
        } else if (document.notes) {
          // Fallback: try to parse from notes
          try {
            const parsedNotes = JSON.parse(document.notes);
            if (parsedNotes.finalSalePrice) {
              closeDealData = {
                finalSalePrice: parsedNotes.finalSalePrice,
                dealershipCommission: parsedNotes.dealershipCommission,
                paymentMethod: parsedNotes.paymentMethod,
              };
            }
          } catch (e) {
            console.error('Error parsing notes:', e);
          }
        }

        // Fetch additional expenses (gastos adicionales)
        let additionals: Array<{ title: string; amount: number }> = [];
        if (vehicle?.id) {
          const { data: additionalsData } = await supabase
            .from('vehicles_extras')
            .select('*')
            .eq('vehicle_id', vehicle.id)
            .eq('type', 'sale_additional');

          if (additionalsData && additionalsData.length > 0) {
            additionals = additionalsData.map((add: any) => ({
              title: add.title || add.description || 'Gasto adicional',
              amount: add.amount || 0,
            }));
          }
        }

        // Extract terms from template
        let terms = '';
        if (template && !templateLoading) {
          terms = extractTermsText(template.terms_and_conditions);
        }

        // Obtener información legal desde la tabla legal_info
        const legalInfo = clientId ? await getLegalInfoForVehicle(document.vehicle_id, clientId) : null;

        // Capitalize payment method for display
        const rawPaymentMethod = closeDealData?.paymentMethod || closeDealData?.paymentmethod || '';
        const displayPaymentMethod = rawPaymentMethod
          ? rawPaymentMethod.charAt(0).toUpperCase() + rawPaymentMethod.slice(1)
          : 'Transferencia';

        const documentData: CloseBusinessDealNoteData = {
          companyName: legalInfo?.company_name || client?.name || 'Empresa',
          companyRut: formatRut(legalInfo?.rut || client?.contact?.rut) || '',
          companyAddress: legalInfo?.legal_address || client?.contact?.address || '',
          companyPhone: client?.contact?.phone || '',
          companyEmail: client?.contact?.email || '',
          companyLogo: await prepareImageForPDF(client?.logo) || undefined,
          documentNumber: document?.document_number?.toString() || documentId.toString(),
          documentDate: document?.created_at
            ? new Date(document.created_at).toLocaleDateString('es-CL')
            : new Date().toLocaleDateString('es-CL'),
          customerName: customer
            ? getCustomerDisplayName(customer) || 'Propietario'
            : 'Propietario',
          customerRut: customer?.rut ? formatRut(customer.rut) : undefined,
          customerPhone: customer?.phone || undefined,
          customerEmail: customer?.email || undefined,
          customerAddress: customer?.address || undefined,
          vehicleBrand: vehicle?.brand?.name || vehicle?.brand || '',
          vehicleModel: vehicle?.model?.name || vehicle?.model || '',
          vehicleYear: vehicle?.year || undefined,
          vehicleColor: vehicle?.color?.name || vehicle?.color || undefined,
          vehiclePlate: vehicle?.license_plate || undefined,
          vehicleMileage: vehicle?.mileage || undefined,
          finalSalePrice: closeDealData?.finalSalePrice || closeDealData?.finalsaleprice || 0,
          transferValue: vehicle?.transfer_value || 0,
          dealershipCommission: closeDealData?.dealershipCommission || closeDealData?.dealershipcommission || 0,
          paymentMethod: displayPaymentMethod,
          additionals: additionals.length > 0 ? additionals : undefined,
          terms,
          notes: document?.notes || undefined,
          layoutConfig: getLayoutConfig(),
          extraPageConfig: getExtraPageConfig(),
        };

        setData(documentData);
      } catch (err: any) {
        console.error('Error fetching close business deal note data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (!templateLoading) {
      fetchData();
    }
  }, [documentId, client, template, templateLoading, refreshKey]);

  return { data, loading: loading || templateLoading, error, refetch };
};

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

interface QuotationData {
  companyName: string;
  companyRut: string;
  companyAddress: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;
  documentNumber: string;
  documentDate: string;
  validUntil?: string;
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
  vehicleEngineNumber?: string;
  vehicleChassisNumber?: string;
  vehiclePrice: number;
  transferValue?: number;
  additionals?: Array<{ title: string; amount: number }>;
  total: number;
  terms?: string;
  notes?: string;
  layoutConfig?: any;
  extraPageConfig?: ExtraPageConfig;
}

export const useQuotationData = (vehicleId: number, quotationId?: number) => {
  const [data, setData] = useState<QuotationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { client, clientId } = useAuth();
  const { template, loading: templateLoading, getExtraPageConfig, getLayoutConfig } = useDocumentTemplate('quotation');

  const refetch = () => {
    setData(null);
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!vehicleId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data: vehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .select(`
            *,
            brand:brand_id(name),
            model:model_id(name),
            color:color_id(name)
          `)
          .eq('id', vehicleId)
          .single();

        if (vehicleError) throw vehicleError;

        let quotation = null;
        if (quotationId) {
          const { data: quotData, error: quotError } = await supabase
            .from('vehicles_quotations')
            .select('*')
            .eq('id', quotationId)
            .single();

          if (quotError) throw quotError;
          quotation = quotData;
        } else {
          const { data: quotData } = await supabase
            .from('vehicles_quotations')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          quotation = quotData;
        }

        let customer = null;
        if (quotation?.customer_id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', quotation.customer_id)
            .maybeSingle();

          customer = customerData;
        }

        const vehiclePrice = quotation?.estimated_price || vehicle?.price || 0;
        const transferValue = vehicle?.transfer_value || 0;

        // Fetch additionals from vehicles_extras
        let additionals: Array<{ title: string; amount: number }> = [];
        if (vehicle?.id) {
          const { data: additionalsData } = await supabase
            .from('vehicles_extras')
            .select('*')
            .eq('vehicle_id', vehicle.id)
            .eq('type', 'sale_additional');

          if (additionalsData && additionalsData.length > 0) {
            additionals = additionalsData.map((add: any) => ({
              title: add.title || add.description || 'Adicional',
              amount: add.amount || 0,
            }));
          }
        }

        const additionalsTotal = additionals.reduce((sum, add) => sum + add.amount, 0);
        const total = vehiclePrice + transferValue + additionalsTotal;

        let terms = '';
        if (template && !templateLoading) {
          terms = extractTermsText(template.terms_and_conditions);
        }

        // Obtener información legal desde la tabla legal_info
        const legalInfo = clientId ? await getLegalInfoForVehicle(vehicleId, clientId) : null;

        const documentData: QuotationData = {
          companyName: legalInfo?.company_name || client?.name || 'Empresa',
          companyRut: formatRut(legalInfo?.rut || client?.contact?.rut) || '',
          companyAddress: legalInfo?.legal_address || client?.contact?.address || '',
          companyPhone: client?.contact?.phone || '',
          companyEmail: client?.contact?.email || '',
          companyLogo: await prepareImageForPDF(client?.logo) || undefined,
          documentNumber: quotation?.id?.toString() || vehicleId.toString(),
          documentDate: quotation?.quotation_date
            ? new Date(quotation.quotation_date).toLocaleDateString('es-CL')
            : new Date().toLocaleDateString('es-CL'),
          customerName: customer
            ? getCustomerDisplayName(customer) || 'Cliente'
            : 'Cliente',
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
          vehicleEngineNumber: vehicle?.engine_number || undefined,
          vehicleChassisNumber: vehicle?.chassis_number || undefined,
          vehiclePrice,
          transferValue,
          additionals: additionals.length > 0 ? additionals : undefined,
          total,
          terms,
          notes: quotation?.notes || undefined,
          layoutConfig: getLayoutConfig(),
          extraPageConfig: getExtraPageConfig(),
        };

        setData(documentData);
      } catch (err: any) {
        console.error('Error fetching quotation data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (!templateLoading) {
      fetchData();
    }
  }, [vehicleId, quotationId, client, template, templateLoading, refreshKey]);

  return { data, loading: loading || templateLoading, error, refetch };
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import useDocumentTemplate from '@/hooks/useDocumentTemplate';
import { extractTermsText } from '@/utils/documentTemplateUtils';
import { formatRut } from '@/utils/rutFormatter';
import { ExtraPageConfig } from '@/types/document-template';
import { prepareImageForPDF } from '@/utils/imageUtils';
import { getLegalInfoForVehicle } from '@/services/legalInfoService';
import { getCustomerDisplayName } from '@/utils/customerName';

interface PurchaseNoteData {
  companyName: string;
  companyRut: string;
  companyAddress: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;
  documentNumber: string;
  documentDate: string;
  sellerName: string;
  sellerRut?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  sellerAddress?: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehiclePlate?: string;
  vehicleMileage?: number;
  vehicleEngineNumber?: string;
  vehicleChassisNumber?: string;
  vehicleOwnerNumber?: string;
  purchasePrice: number;
  discounts?: number;
  additionals?: Array<{ title: string; amount: number }>;
  total: number;
  paymentMethod?: string;
  terms?: string;
  notes?: string;
  layoutConfig?: any;
  extraPageConfig?: ExtraPageConfig;
}

export const usePurchaseNoteData = (vehicleId: number, purchaseId?: number) => {
  const [data, setData] = useState<PurchaseNoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { client, clientId } = useAuth();
  const { template, loading: templateLoading, getExtraPageConfig, getLayoutConfig } = useDocumentTemplate('purchase');

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

        // Obtener datos del vehículo con joins para brand, model y color
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

        // Obtener datos de la compra
        let purchase = null;
        if (purchaseId) {
          const { data: purchaseData, error: purchaseError } = await supabase
            .from('vehicles_purchases')
            .select('*')
            .eq('id', purchaseId)
            .single();

          if (purchaseError) throw purchaseError;
          purchase = purchaseData;
        } else {
          const { data: purchaseData } = await supabase
            .from('vehicles_purchases')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          purchase = purchaseData;
        }

        // Obtener datos del vendedor
        let seller = null;
        if (purchase?.customer_id) {
          const { data: sellerData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', purchase.customer_id)
            .maybeSingle();

          seller = sellerData;
        }

        const purchasePrice = purchase?.purchase_price || vehicle?.acquisition_price || 0;
        const total = purchasePrice;

        let terms = '';
        if (template && !templateLoading) {
          terms = extractTermsText(template.terms_and_conditions);
        }

        const companyLogo = await prepareImageForPDF(client?.logo);

        // Obtener información legal desde la tabla legal_info
        const legalInfo = clientId ? await getLegalInfoForVehicle(vehicleId, clientId) : null;

        const documentData: PurchaseNoteData = {
          companyName: legalInfo?.company_name || client?.name || 'Empresa',
          companyRut: formatRut(legalInfo?.rut || client?.contact?.rut) || '',
          companyAddress: legalInfo?.legal_address || client?.contact?.address || '',
          companyPhone: client?.contact?.phone || '',
          companyEmail: client?.contact?.email || '',
          companyLogo: companyLogo || undefined,
          documentNumber: purchase?.id?.toString() || vehicleId.toString(),
          documentDate: purchase?.purchase_date
            ? new Date(purchase.purchase_date).toLocaleDateString('es-CL')
            : new Date().toLocaleDateString('es-CL'),
          sellerName: (seller && getCustomerDisplayName(seller)) || 'Vendedor',
          sellerRut: seller?.rut ? formatRut(seller.rut) : undefined,
          sellerPhone: seller?.phone || undefined,
          sellerEmail: seller?.email || undefined,
          sellerAddress: seller?.address || undefined,
          vehicleBrand: vehicle?.brand?.name || vehicle?.brand || '',
          vehicleModel: vehicle?.model?.name || vehicle?.model || '',
          vehicleYear: vehicle?.year || undefined,
          vehicleColor: vehicle?.color?.name || vehicle?.color || undefined,
          vehiclePlate: vehicle?.license_plate || undefined,
          vehicleMileage: vehicle?.mileage || undefined,
          vehicleEngineNumber: vehicle?.engine_number || undefined,
          vehicleChassisNumber: vehicle?.chassis_number || undefined,
          vehicleOwnerNumber: vehicle?.owners?.toString() || undefined,
          purchasePrice,
          additionals: undefined,
          total,
          paymentMethod: purchase?.payment_method || undefined,
          terms,
          notes: purchase?.notes || undefined,
          layoutConfig: getLayoutConfig(),
          extraPageConfig: getExtraPageConfig(),
        };

        setData(documentData);
      } catch (err: any) {
        console.error('Error fetching purchase note data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (!templateLoading) {
      fetchData();
    }
  }, [vehicleId, purchaseId, client, template, templateLoading, refreshKey]);

  return { data, loading: loading || templateLoading, error, refetch };
};

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

interface ConsignmentNoteData {
  companyName: string;
  companyRut: string;
  companyAddress: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;
  documentNumber: string;
  documentDate: string;
  ownerName: string;
  ownerRut?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  ownerAddress?: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehiclePlate?: string;
  vehicleMileage?: number;
  vehicleEngineNumber?: string;
  vehicleChassisNumber?: string;
  suggestedPrice?: number;
  minimumPrice?: number;
  commissionRate?: number;
  commissionAmount?: number;
  startDate?: string;
  endDate?: string;
  duration?: string;
  terms?: string;
  notes?: string;
  layoutConfig?: any;
  extraPageConfig?: ExtraPageConfig;
}

export const useConsignmentNoteData = (vehicleId: number, consignmentId?: number) => {
  const [data, setData] = useState<ConsignmentNoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { client, clientId } = useAuth();
  const { template, loading: templateLoading, getExtraPageConfig, getLayoutConfig } = useDocumentTemplate('consignment');

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

        let consignment = null;
        let documentDate = null;
        if (consignmentId) {
          const { data: consData, error: consError } = await supabase
            .from('vehicles_consignments')
            .select('*')
            .eq('id', consignmentId)
            .single();

          if (consError) throw consError;
          consignment = consData;

          // Fetch document_date from vehicles_documents if available
          if (consData?.document_id) {
            const { data: docData } = await supabase
              .from('vehicles_documents')
              .select('document_date, created_at')
              .eq('id', consData.document_id)
              .single();

            if (docData) {
              documentDate = docData.document_date || docData.created_at;
            }
          }
        } else {
          const { data: consData } = await supabase
            .from('vehicles_consignments')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          consignment = consData;

          // Fetch document_date from vehicles_documents if available
          if (consData?.document_id) {
            const { data: docData } = await supabase
              .from('vehicles_documents')
              .select('document_date, created_at')
              .eq('id', consData.document_id)
              .single();

            if (docData) {
              documentDate = docData.document_date || docData.created_at;
            }
          }
        }

        let owner = null;
        if (consignment?.customer_id) {
          const { data: ownerData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', consignment.customer_id)
            .maybeSingle();

          owner = ownerData;
        }

        let terms = '';
        if (template && !templateLoading) {
          terms = extractTermsText(template.terms_and_conditions);
        }

        // Obtener información legal desde la tabla legal_info
        const legalInfo = clientId ? await getLegalInfoForVehicle(vehicleId, clientId) : null;

        const documentData: ConsignmentNoteData = {
          companyName: legalInfo?.company_name || client?.name || 'Empresa',
          companyRut: formatRut(legalInfo?.rut || client?.contact?.rut) || '',
          companyAddress: legalInfo?.legal_address || client?.contact?.address || '',
          companyPhone: client?.contact?.phone || '',
          companyEmail: client?.contact?.email || '',
          companyLogo: await prepareImageForPDF(client?.logo) || undefined,
          documentNumber: consignment?.id?.toString() || vehicleId.toString(),
          documentDate: documentDate
            ? new Date(documentDate).toLocaleDateString('es-CL')
            : consignment?.created_at
            ? new Date(consignment.created_at).toLocaleDateString('es-CL')
            : new Date().toLocaleDateString('es-CL'),
          ownerName: owner
            ? getCustomerDisplayName(owner) || 'Propietario'
            : 'Propietario',
          ownerRut: owner?.rut ? formatRut(owner.rut) : undefined,
          ownerPhone: owner?.phone || undefined,
          ownerEmail: owner?.email || undefined,
          ownerAddress: owner?.address || undefined,
          vehicleBrand: vehicle?.brand?.name || vehicle?.brand || '',
          vehicleModel: vehicle?.model?.name || vehicle?.model || '',
          vehicleYear: vehicle?.year || undefined,
          vehicleColor: vehicle?.color?.name || vehicle?.color || undefined,
          vehiclePlate: vehicle?.license_plate || undefined,
          vehicleMileage: vehicle?.mileage || undefined,
          vehicleEngineNumber: vehicle?.engine_number || undefined,
          vehicleChassisNumber: vehicle?.chassis_number || undefined,
          suggestedPrice: consignment?.suggested_price || vehicle?.price || undefined,
          minimumPrice: consignment?.agreed_price || undefined,
          terms,
          notes: consignment?.notes || undefined,
          layoutConfig: getLayoutConfig(),
          extraPageConfig: getExtraPageConfig(),
        };

        setData(documentData);
      } catch (err: any) {
        console.error('Error fetching consignment note data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (!templateLoading) {
      fetchData();
    }
  }, [vehicleId, consignmentId, client, template, templateLoading, refreshKey]);

  return { data, loading: loading || templateLoading, error, refetch };
};

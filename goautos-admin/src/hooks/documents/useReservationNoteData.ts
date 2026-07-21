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

interface ReservationNoteData {
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
  vehicleEngineNumber?: string;
  vehicleChassisNumber?: string;
  vehiclePrice: number;
  transferValue: number;
  reservationAmount: number;
  remainingAmount: number;
  additionals?: Array<{ title: string; amount: number }>;
  reservationDays?: number;
  expirationDate?: string;
  terms?: string;
  notes?: string;
  layoutConfig?: any;
  extraPageConfig?: ExtraPageConfig;
}

export const useReservationNoteData = (vehicleId: number, reservationId?: number) => {
  const [data, setData] = useState<ReservationNoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { client, clientId } = useAuth();
  const { template, loading: templateLoading, getExtraPageConfig, getLayoutConfig } = useDocumentTemplate('reservation');

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

        let reservation = null;
        if (reservationId) {
          const { data: resData, error: resError } = await supabase
            .from('vehicles_reservations')
            .select('*')
            .eq('id', reservationId)
            .single();

          if (resError) throw resError;
          reservation = resData;
        } else {
          const { data: resData } = await supabase
            .from('vehicles_reservations')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          reservation = resData;
        }

        let customer = null;
        if (reservation?.customer_id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', reservation.customer_id)
            .maybeSingle();

          customer = customerData;
        }

        // Fetch reservation additionals
        let additionals: Array<{ title: string; amount: number }> = [];
        const { data: additionalsRaw } = await supabase
          .from('vehicles_extras')
          .select('title, amount')
          .eq('vehicle_id', vehicleId)
          .eq('type', 'reservation_additional')
          .order('created_at', { ascending: true });

        if (additionalsRaw && additionalsRaw.length > 0) {
          additionals = additionalsRaw.map((a: any) => ({
            title: a.title || '',
            amount: Number(a.amount) || 0,
          }));
        }

        const vehiclePrice = reservation?.reservation_agreed_price || vehicle?.price || 0;
        const transferValue = vehicle?.transfer_value || 0;
        const reservationAmount = reservation?.reservation_amount || 0;
        const totalAdditionals = additionals.reduce((sum, a) => sum + a.amount, 0);
        const totalWithTransfer = vehiclePrice + transferValue + totalAdditionals;
        const remainingAmount = totalWithTransfer - reservationAmount;

        let terms = '';
        if (template && !templateLoading) {
          terms = extractTermsText(template.terms_and_conditions);
        }

        const companyLogo = await prepareImageForPDF(client?.logo);

        // Obtener información legal desde la tabla legal_info
        const legalInfo = clientId ? await getLegalInfoForVehicle(vehicleId, clientId) : null;

        const documentData: ReservationNoteData = {
          companyName: legalInfo?.company_name || client?.name || 'Empresa',
          companyRut: formatRut(legalInfo?.rut || client?.contact?.rut) || '',
          companyAddress: legalInfo?.legal_address || client?.contact?.address || '',
          companyPhone: client?.contact?.phone || '',
          companyEmail: client?.contact?.email || '',
          companyLogo: companyLogo || undefined,
          documentNumber: reservation?.id?.toString() || vehicleId.toString(),
          documentDate: reservation?.created_at
            ? new Date(reservation.created_at).toLocaleDateString('es-CL')
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
          reservationAmount,
          remainingAmount,
          additionals: additionals.length > 0 ? additionals : undefined,
          expirationDate: reservation?.expiration_date
            ? new Date(reservation.expiration_date).toLocaleDateString('es-CL')
            : undefined,
          terms,
          notes: reservation?.notes || undefined,
          layoutConfig: getLayoutConfig(),
          extraPageConfig: getExtraPageConfig(),
        };

        setData(documentData);
      } catch (err: any) {
        console.error('Error fetching reservation note data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (!templateLoading) {
      fetchData();
    }
  }, [vehicleId, reservationId, client, template, templateLoading, refreshKey]);

  return { data, loading: loading || templateLoading, error, refetch };
};

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

interface SaleNoteData {
  // Datos de la empresa
  companyName: string;
  companyRut: string;
  companyAddress: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;

  // Datos del documento
  documentNumber: string;
  documentDate: string;

  // Datos del cliente
  customerName: string;
  customerRut?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;

  // Datos del vehículo
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vehiclePlate?: string;
  vehicleMileage?: number;
  vehicleEngineNumber?: string;
  vehicleChassisNumber?: string;

  // Datos financieros
  vehiclePrice: number;
  originalVehiclePrice?: number;
  priceAdjustment?: number;
  transferValue?: number;
  additionals?: Array<{ title: string; amount: number }>;
  incomes?: Array<{ title: string; amount: number }>;
  total: number;

  // Pagos. dueDate/paid solo para cuotas/letras a plazo (pendientes).
  payments?: Array<{ title: string; amount: number; dueDate?: string; paid?: boolean }>;
  totalPaid: number;

  // Términos y observaciones
  terms?: string;
  notes?: string;

  // Trade-in vehicles
  tradeInVehicles?: Array<{
    brand: string;
    model: string;
    year?: number;
    licensePlate?: string;
    value: number;
  }>;
  tradeInTotal?: number;

  // Layout y hoja extra
  layoutConfig?: any;
  extraPageConfig?: ExtraPageConfig;

  // Document record ID (vehicles_documents.id) for saving overrides
  vehicleDocumentId?: number;
  // Document-level layout_config (saved per-document overrides)
  savedDocumentLayoutConfig?: any;
}

export const useSaleNoteData = (vehicleId: number, saleId?: number) => {
  const [data, setData] = useState<SaleNoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { client, clientId } = useAuth();
  const { template, loading: templateLoading, getExtraPageConfig, getLayoutConfig } = useDocumentTemplate('sale');

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

        // Obtener datos de la venta desde vehicles_sales (datos financieros)
        let saleRecord: any = null;
        if (saleId) {
          // saleId es vehicles_sales.id
          const { data: saleData } = await supabase
            .from('vehicles_sales')
            .select('*')
            .eq('id', saleId)
            .maybeSingle();
          saleRecord = saleData;
        } else {
          // Buscar la venta más reciente por vehicle_id
          const { data: saleData } = await supabase
            .from('vehicles_sales')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          saleRecord = saleData;
        }

        // Obtener documento asociado para fecha y notas
        let saleDoc: any = null;
        if (saleRecord?.document_id) {
          const { data: docData } = await supabase
            .from('vehicles_documents')
            .select('*')
            .eq('id', saleRecord.document_id)
            .maybeSingle();
          saleDoc = docData;
        } else {
          // Fallback: buscar documento de venta por vehicle_id
          const { data: docData } = await supabase
            .from('vehicles_documents')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .eq('type', 'sale')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          saleDoc = docData;
        }

        // Obtener datos del cliente/customer
        let customer = null;
        const customerId = saleRecord?.customer_id || saleDoc?.customer_id;
        if (customerId) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .maybeSingle();

          customer = customerData;
        }

        // Obtener adicionales de la venta (desde vehicles_extras con type='sale_additional')
        // Solo los que paga el cliente final (assumed_by='customer'). Los descontados al
        // consignador no aparecen en la nota de venta porque el comprador no los paga.
        let additionals: Array<{ title: string; amount: number }> = [];
        if (vehicle?.id) {
          const { data: additionalsData } = await supabase
            .from('vehicles_extras')
            .select('*')
            .eq('vehicle_id', vehicle.id)
            .eq('type', 'sale_additional');

          if (additionalsData) {
            additionals = additionalsData
              .filter((add: any) => (add.assumed_by ?? 'dealership') === 'customer')
              .map((add: any) => ({
                title: add.title || add.description || 'Adicional',
                amount: add.amount || 0,
              }));
          }
        }

        // Obtener ingresos de la venta (desde vehicles_extras con type='sale_income')
        // Default: 'customer'. Solo se muestran los que paga el cliente final.
        let incomes: Array<{ title: string; amount: number }> = [];
        if (vehicle?.id) {
          const { data: incomesData } = await supabase
            .from('vehicles_extras')
            .select('*')
            .eq('vehicle_id', vehicle.id)
            .eq('type', 'sale_income');

          if (incomesData) {
            incomes = incomesData
              .filter((inc: any) => (inc.assumed_by ?? 'customer') === 'customer')
              .map((inc: any) => ({
                title: inc.title || inc.description || 'Ingreso',
                amount: inc.amount || 0,
              }));
          }
        }

        // Obtener pagos de reserva desde vehicles_extras
        let payments: Array<{ title: string; amount: number; dueDate?: string; paid?: boolean }> = [];
        let totalPaid = 0;

        if (vehicle?.id) {
          const { data: reservationPaymentsData } = await supabase
            .from('vehicles_extras')
            .select('*')
            .eq('vehicle_id', vehicle.id)
            .eq('type', 'reservation_payment')
            .order('created_at', { ascending: true });

          if (reservationPaymentsData && reservationPaymentsData.length > 0) {
            payments = reservationPaymentsData.map((p: any) => ({
              title: p.title || 'Pago de reserva',
              amount: p.amount || 0,
            }));
          }
        }

        // Obtener pagos de venta desde payment_breakdown de vehicles_sales
        if (saleRecord?.payment_breakdown) {
          try {
            const breakdown = typeof saleRecord.payment_breakdown === 'string'
              ? JSON.parse(saleRecord.payment_breakdown)
              : saleRecord.payment_breakdown;

            if (Array.isArray(breakdown)) {
              const salePayments = breakdown.map((p: any) => ({
                title: p.title || 'Pago',
                amount: p.amount || 0,
                dueDate: p.dueDate,
                paid: p.paid,
              }));
              payments = [...payments, ...salePayments];
            }
          } catch (e) {
            console.error('Error parsing payment breakdown:', e);
          }
        }

        // "Total pagado" cuenta solo lo efectivamente recibido (paid !== false).
        // Las cuotas/letras a plazo (paid === false) son saldo pendiente, no pagado.
        totalPaid = payments
          .filter((p) => p.paid !== false)
          .reduce((sum, p) => sum + p.amount, 0);

        // Si no hay pagos desglosados, usar el total de la venta
        if (payments.length === 0 && saleRecord?.sale_price) {
          payments = [{ title: 'Pago total', amount: saleRecord.sale_price }];
          totalPaid = saleRecord.sale_price;
        }

        // Obtener vehículos en parte de pago (trade-ins)
        let tradeInVehicles: Array<{ brand: string; model: string; year?: number; licensePlate?: string; value: number }> = [];
        let tradeInTotal = 0;

        if (saleRecord?.has_trade_in && saleRecord?.trade_in_value > 0) {
          // Try junction table first (multiple trade-ins)
          const { data: junctionRows, error: junctionError } = await supabase
            .from('vehicles_sales_trade_ins')
            .select('*')
            .eq('vehicle_sale_id', saleRecord.id);

          if (junctionError) {
            console.error('[SaleNoteData] Error fetching trade-in junction rows:', junctionError);
          }

          if (junctionRows && junctionRows.length > 0) {
            tradeInVehicles = junctionRows.map((row: any) => ({
              brand: row.brand_name || '',
              model: row.model_name || '',
              year: row.year,
              licensePlate: row.license_plate || '',
              value: row.trade_in_value || 0,
            }));
            tradeInTotal = tradeInVehicles.reduce((sum, v) => sum + v.value, 0);
          } else if (saleRecord.trade_in_vehicle_id) {
            // Legacy fallback: single trade-in from vehicles table
            const { data: tradeInVehicle } = await supabase
              .from('vehicles')
              .select('*, brand:brand_id(name), model:model_id(name)')
              .eq('id', saleRecord.trade_in_vehicle_id)
              .maybeSingle();

            if (tradeInVehicle) {
              tradeInVehicles = [{
                brand: tradeInVehicle.brand?.name || '',
                model: tradeInVehicle.model?.name || '',
                year: tradeInVehicle.year,
                licensePlate: tradeInVehicle.license_plate || '',
                value: saleRecord.trade_in_value || 0,
              }];
              tradeInTotal = saleRecord.trade_in_value || 0;
            }
          } else {
            // No specific vehicle data, just the value
            tradeInVehicles = [{
              brand: 'Vehículo',
              model: 'en parte de pago',
              value: saleRecord.trade_in_value || 0,
            }];
            tradeInTotal = saleRecord.trade_in_value || 0;
          }
        }

        // Calcular total — priorizar precio de venta real sobre precio de lista
        const vehiclePrice = saleRecord?.sale_price || vehicle?.price || 0;
        const originalVehiclePrice = vehicle?.price || 0;
        const priceAdjustment =
          originalVehiclePrice > 0 && vehiclePrice > 0
            ? Math.max(0, originalVehiclePrice - vehiclePrice)
            : 0;
        // El CRT solo se incluye en la nota si la venta lo cobra al cliente.
        // Ventas viejas (columna nueva, default true) siguen incluyéndolo.
        const transferValue =
          (saleRecord as any)?.transfer_value_charged === false
            ? 0
            : vehicle?.transfer_value || 0;
        const additionalsTotal = additionals.reduce((sum, add) => sum + add.amount, 0);
        const incomesTotal = incomes.reduce((sum, inc) => sum + inc.amount, 0);
        const total = vehiclePrice + transferValue + additionalsTotal + incomesTotal;

        // Obtener términos de la plantilla
        let terms = '';
        if (template && !templateLoading) {
          terms = extractTermsText(template.terms_and_conditions);
        }

        // Obtener configuración de hoja extra
        const extraPageConfig = getExtraPageConfig();

        // Obtener información legal desde la tabla legal_info
        const legalInfo = clientId ? await getLegalInfoForVehicle(vehicleId, clientId) : null;

        // Preparar el logo para PDF (convertir a base64 si es necesario)
        const companyLogo = await prepareImageForPDF(client?.logo);

        // Construir datos del documento
        const documentData: SaleNoteData = {
          // Datos de la empresa (prioridad: legal_info de la tabla > datos del client)
          companyName: legalInfo?.company_name || client?.name || 'Empresa',
          companyRut: formatRut(legalInfo?.rut || client?.contact?.rut) || '',
          companyAddress: legalInfo?.legal_address || client?.contact?.address || '',
          companyPhone: client?.contact?.phone || '',
          companyEmail: client?.contact?.email || '',
          companyLogo: companyLogo || undefined,

          // Datos del documento
          documentNumber: saleRecord?.id?.toString() || saleDoc?.id?.toString() || vehicleId.toString(),
          documentDate: saleRecord?.sale_date
            ? new Date(saleRecord.sale_date).toLocaleDateString('es-CL')
            : saleDoc?.created_at
            ? new Date(saleDoc.created_at).toLocaleDateString('es-CL')
            : new Date().toLocaleDateString('es-CL'),

          // Datos del cliente
          customerName: customer
            ? getCustomerDisplayName(customer) || 'Cliente'
            : 'Cliente',
          customerRut: customer?.rut ? formatRut(customer.rut) : undefined,
          customerPhone: customer?.phone || undefined,
          customerEmail: customer?.email || undefined,
          customerAddress: customer?.address || undefined,

          // Datos del vehículo
          vehicleBrand: vehicle?.brand?.name || '',
          vehicleModel: vehicle?.model?.name || '',
          vehicleYear: vehicle?.year || undefined,
          vehicleColor: vehicle?.color?.name || undefined,
          vehiclePlate: vehicle?.license_plate || undefined,
          vehicleMileage: vehicle?.mileage || undefined,
          vehicleEngineNumber: vehicle?.engine_number || undefined,
          vehicleChassisNumber: vehicle?.chassis_number || undefined,

          // Datos financieros
          vehiclePrice,
          originalVehiclePrice: originalVehiclePrice > 0 ? originalVehiclePrice : undefined,
          priceAdjustment: priceAdjustment > 0 ? priceAdjustment : undefined,
          transferValue,
          additionals: additionals.length > 0 ? additionals : undefined,
          incomes: incomes.length > 0 ? incomes : undefined,
          total,

          // Pagos
          payments: payments.length > 0 ? payments : undefined,
          totalPaid,

          // Trade-in vehicles
          tradeInVehicles: tradeInVehicles.length > 0 ? tradeInVehicles : undefined,
          tradeInTotal: tradeInTotal > 0 ? tradeInTotal : undefined,

          // Términos y observaciones
          terms,
          notes: saleDoc?.notes || saleRecord?.notes || (vehicle as any)?.notes || undefined,

          // Layout y hoja extra
          layoutConfig: getLayoutConfig(),
          extraPageConfig,

          // Document record for saving overrides
          vehicleDocumentId: saleDoc?.id || undefined,
          savedDocumentLayoutConfig: saleDoc?.layout_config || undefined,
        };

        setData(documentData);
      } catch (err: any) {
        console.error('Error fetching sale note data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (!templateLoading) {
      fetchData();
    }
  }, [vehicleId, saleId, client, template, templateLoading, refreshKey]);

  return { data, loading: loading || templateLoading, error, refetch };
};

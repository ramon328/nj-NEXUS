import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  calculateVehicleNetProfit,
  type AssumedBy,
  type ConsignmentMethod,
  type VehicleExtra,
  type VehicleNetProfitResult,
} from '@/utils/vehicleNetProfit';

/**
 * Carga TODO el detalle de un vehículo en una sola pasada (specs + relaciones +
 * compra/consignación + venta + extras + margen neto), reusando exactamente las
 * mismas queries que la ficha de vehículo y el resumen financiero.
 *
 * Pensado para vistas instantáneas en el asistente: el componente puede pintar
 * un skeleton desde el `preview` mientras este hook completa los datos.
 */
export interface FullVehicleDetail {
  vehicle: any;
  isConsigned: boolean;
  isSold: boolean;
  acquisition: any | null;
  sale: any | null;
  extras: any[];
  expensesTotal: number;
  incomeTotal: number;
  documentsCount: number;
  profit: VehicleNetProfitResult;
}

export const useVehicleFullDetail = (vehicleId: number | null) => {
  const { clientId } = useAuth();
  const [data, setData] = useState<FullVehicleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!vehicleId || !clientId) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Vehículo con relaciones (mismo join que useVehicles)
      const { data: vehicle, error: vErr } = await supabase
        .from('vehicles')
        .select(
          `
          *,
          category:category_id(name),
          status:status_id(name, color, order, show_in_web),
          brand:brand_id(name),
          model:model_id(name),
          color:color_id(name),
          condition:condition_id(name),
          fuel_type:fuel_type_id(name),
          seller:seller_id(id, first_name, last_name)
        `
        )
        .eq('id', vehicleId)
        .eq('client_id', clientId)
        .maybeSingle();

      if (vErr) throw vErr;
      if (!vehicle) throw new Error('Vehículo no encontrado');

      const isConsigned = !!(vehicle as any).is_consigned;

      // 2. Resto en paralelo: adquisición, venta, extras, conteo de documentos
      const [acqRes, salesRes, extrasRes, docsRes] = await Promise.all([
        isConsigned
          ? supabase
              .from('vehicles_consignments')
              .select('*')
              .eq('vehicle_id', vehicleId)
              .maybeSingle()
          : supabase
              .from('vehicles_purchases')
              .select('*')
              .eq('vehicle_id', vehicleId)
              .maybeSingle(),
        supabase
          .from('vehicles_sales')
          .select('*')
          .eq('vehicle_id', vehicleId)
          .order('created_at', { ascending: false }),
        supabase.from('vehicles_extras').select('*').eq('vehicle_id', vehicleId),
        supabase
          .from('vehicles_documents')
          .select('id', { count: 'exact', head: true })
          .eq('vehicle_id', vehicleId),
      ]);

      const acquisition = (acqRes as any)?.data ?? null;
      const sale =
        (salesRes as any)?.data && (salesRes as any).data.length > 0
          ? (salesRes as any).data[0]
          : null;
      const extras = ((extrasRes as any)?.data ?? []) as any[];
      const documentsCount = (docsRes as any)?.count ?? 0;

      // 3. Override de utilidad bruta (close_deal) solo para consignados
      let dealershipCommission: number | null = null;
      if (isConsigned) {
        const { data: closeDeal } = await supabase
          .from('vehicles_documents')
          .select('vehicles_close_deal!inner(dealershipCommission)')
          .eq('vehicle_id', vehicleId)
          .eq('type', 'close_deal')
          .maybeSingle();
        // Embed uno-a-muchos → PostgREST lo devuelve como array; normalizar a la 1ª fila.
        const rawCloseDeal = (closeDeal as any)?.vehicles_close_deal;
        const cdRow = Array.isArray(rawCloseDeal) ? rawCloseDeal[0] : rawCloseDeal;
        const cd = cdRow?.dealershipCommission;
        dealershipCommission = cd != null ? Number(cd) : null;
      }

      // 4. Margen neto vía helper unificado (mismo input que useVehicleFinancialData)
      const mappedExtras: VehicleExtra[] = extras.map((e) => ({
        amount: Number(e.amount || 0),
        type: e.type as 'expense' | 'income',
        assumedBy: (e.assumed_by ?? 'dealership') as AssumedBy,
      }));

      const profit = calculateVehicleNetProfit({
        isSold: !!sale,
        isConsigned,
        consignmentMethod: (acquisition as any)?.metodo_consignacion as
          | ConsignmentMethod
          | undefined,
        salePrice: sale?.sale_price,
        publishedPrice: (vehicle as any)?.price,
        purchasePrice: !isConsigned ? acquisition?.purchase_price : undefined,
        // IVA de compra (auto propio): costo neto si la compra genera crédito fiscal.
        purchaseGeneraCreditoFiscal: !isConsigned
          ? (acquisition as any)?.genera_credito_fiscal
          : undefined,
        agreedPrice: isConsigned ? acquisition?.agreed_price : undefined,
        commissionPercentage: (acquisition as any)?.porcentaje_comision_consignacion,
        commissionFixed: (acquisition as any)?.monto_fijo_comision_consignacion,
        consignmentGrossProfitOverride: isConsigned ? dealershipCommission : null,
        extras: mappedExtras,
      });

      // Totales informativos (todos los extras, sin filtrar por assumed_by)
      const expensesTotal = extras
        .filter((e) => e.type === 'expense' || e.type === 'sale_additional')
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const incomeTotal = extras
        .filter((e) => e.type === 'income' || e.type === 'sale_income')
        .reduce((s, e) => s + Number(e.amount || 0), 0);

      setData({
        vehicle,
        isConsigned,
        isSold: !!sale,
        acquisition,
        sale,
        extras,
        expensesTotal,
        incomeTotal,
        documentsCount,
        profit,
      });
    } catch (err: any) {
      console.error('Error fetching full vehicle detail:', err);
      setError(err?.message || 'Error al cargar el detalle del vehículo');
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId, clientId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { data, isLoading, error, refetch: fetchDetail };
};

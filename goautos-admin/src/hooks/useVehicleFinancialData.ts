import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  calculateVehicleNetProfit,
  type AssumedBy,
  type ConsignmentMethod,
  type VehicleExtra,
} from '@/utils/vehicleNetProfit';
import { getVehicleRegimen, regimenSaleHasIva } from '@/utils/vehicleRegimen';

export interface SaleSellerInfo {
  id: number;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
}

export interface VehicleCommissionSplitSummary {
  totalAmount: number;
  count: number;
}

export const useVehicleFinancialData = (
  vehicleId: number,
  isConsigned: boolean
) => {
  const { clientId, client } = useAuth();
  const clientExempt = !!(client as any)?.ventas_exentas_iva;
  const queryClient = useQueryClient();
  const [acquisitionData, setAcquisitionData] = useState<any>(null);
  const [saleData, setSaleData] = useState<any>(null);
  const [extrasData, setExtrasData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vehicleData, setVehicleData] = useState<any>(null);
  // dealershipCommission del flujo "Cierre de negocio" (campo manual legacy).
  // Si está cargado, override la utilidad bruta del consignado en el helper.
  const [dealershipCommission, setDealershipCommission] = useState<
    number | null
  >(null);
  // close_deal.discount — la automotora absorbe el descuento (propios y consignados).
  const [discount, setDiscount] = useState<number>(0);
  const [saleSeller, setSaleSeller] = useState<SaleSellerInfo | null>(null);
  const [commissionSplits, setCommissionSplits] =
    useState<VehicleCommissionSplitSummary>({ totalAmount: 0, count: 0 });

  const fetchAcquisitionAndSaleData = useCallback(async () => {
    try {
      setIsLoading(true);

      if (!clientId) {
        setIsLoading(false);
        return;
      }

      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .eq('client_id', clientId)
        .maybeSingle();
      if (vehicleError) {
        console.error('Error fetching vehicle data:', vehicleError);
      } else {
        setVehicleData(vehicle);
      }

      // Check if vehicle is consigned
      if (isConsigned) {
        // Fetch consignment data
        const { data: consignmentData, error: consignmentError } =
          await supabase
            .from('vehicles_consignments')
            .select('*')
            .eq('vehicle_id', vehicleId)
            // Puede haber >1 fila; tomar la más reciente (igual que el loader del
            // dashboard). Sin esto, maybeSingle() erraba y el detalle quedaba sin
            // costo (utilidad inflada, divergía del dashboard).
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (consignmentError) {
          console.error('Error fetching consignment data:', consignmentError);
        } else {
          setAcquisitionData(consignmentData);
        }
      } else {
        // Fetch purchase data
        const { data: purchaseData, error: purchaseError } = await supabase
          .from('vehicles_purchases')
          .select('*')
          .eq('vehicle_id', vehicleId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (purchaseError) {
          console.error('Error fetching purchase data:', purchaseError);
        } else {
          setAcquisitionData(purchaseData);
        }
      }

      // Check if vehicle has been sold
      const { data: salesData, error: saleError } = await supabase
        .from('vehicles_sales')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });

      if (saleError) {
        console.error('Error fetching sale data:', saleError);
      } else {
        // Get the most recent sale (first item after ordering by created_at desc)
        const mostRecentSale =
          salesData && salesData.length > 0 ? salesData[0] : null;
        setSaleData(mostRecentSale);

        // Cargar info del vendedor que registró la venta (si lo hay).
        const sellerId = (mostRecentSale as any)?.seller_id;
        if (sellerId) {
          const { data: sellerUser } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .eq('id', sellerId)
            .maybeSingle();
          if (sellerUser) {
            const first = (sellerUser as any).first_name ?? '';
            const last = (sellerUser as any).last_name ?? '';
            const full = `${first} ${last}`.trim() || 'Vendedor';
            setSaleSeller({
              id: (sellerUser as any).id,
              firstName: first || null,
              lastName: last || null,
              fullName: full,
            });
          } else {
            setSaleSeller(null);
          }
        } else {
          setSaleSeller(null);
        }

        // Cargar splits de comisión vendedor para mostrar la línea SIEMPRE
        // visible en el resumen (incluso si suma 0).
        const saleIdForSplits = (mostRecentSale as any)?.id;
        if (saleIdForSplits) {
          const { data: splits } = await supabase
            .from('sale_commission_splits')
            .select('amount')
            .eq('sale_id', saleIdForSplits);
          const rows = splits ?? [];
          const total = rows.reduce(
            (sum, r) => sum + Number((r as any).amount || 0),
            0
          );
          setCommissionSplits({ totalAmount: total, count: rows.length });
        } else {
          setCommissionSplits({ totalAmount: 0, count: 0 });
        }
      }

      // Fetch vehicle extras (additional expenses and incomes)
      const { data: extrasData, error: extrasError } = await supabase
        .from('vehicles_extras')
        .select('*')
        .eq('vehicle_id', vehicleId);

      if (extrasError) {
        console.error('Error fetching extras data:', extrasError);
      } else {
        setExtrasData(extrasData || []);
      }

      // close_deal: dealershipCommission (override de utilidad bruta del consignado,
      // cuando se cargó el "Cierre de negocio" manual) + discount (descuento que
      // absorbe la automotora, aplica a propios y consignados). Se trae siempre
      // para alinear el detalle con el dashboard (fetchSoldVehicleRows).
      {
        const { data: closeDeal, error: closeDealError } = await supabase
          .from('vehicles_documents')
          .select('vehicles_close_deal!inner(dealershipCommission, discount)')
          .eq('vehicle_id', vehicleId)
          .eq('type', 'close_deal')
          .maybeSingle();
        if (closeDealError) {
          setDealershipCommission(null);
          setDiscount(0);
        } else {
          // PostgREST devuelve el embed como ARRAY (document_id NO es único en
          // vehicles_close_deal → relación uno-a-muchos). Si se lee como objeto,
          // cd?.dealershipCommission queda undefined → el override no se aplica y el
          // consignado mostraba margen ≈ precio de venta completo (bug Ford Expedition).
          const rawCloseDeal = (closeDeal as any)?.vehicles_close_deal;
          const cd = Array.isArray(rawCloseDeal) ? rawCloseDeal[0] : rawCloseDeal;
          setDealershipCommission(
            isConsigned && cd?.dealershipCommission != null
              ? Number(cd.dealershipCommission)
              : null
          );
          setDiscount(cd?.discount != null ? Number(cd.discount) : 0);
        }
      }
    } catch (error) {
      console.error('Error in fetchAcquisitionAndSaleData:', error);
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId, clientId, isConsigned]);

  useEffect(() => {
    if (vehicleId && clientId) {
      fetchAcquisitionAndSaleData();
    }
  }, [vehicleId, clientId, isConsigned, fetchAcquisitionAndSaleData]);

  // Signal query: la suscripción de abajo sólo se dispara si invalidateQueries
  // encuentra ALGO que invalidar en el caché. En el detalle del vehículo las queries
  // reales del dashboard (salesSummary/soldVehicles/...) NO están montadas, así que
  // invalidateSalesQueries no emitía evento y el resumen quedaba stale al editar una
  // nota de venta (reportado por Mallorca). Esta query liviana comparte el prefijo
  // 'salesSummary' → invalidateQueries({queryKey:['salesSummary']}) la marca y emite el
  // evento 'invalidate' que la suscripción escucha. queryFn = null (no trae datos).
  useQuery({
    queryKey: ['salesSummary', 'vehicle-detail-signal', vehicleId],
    queryFn: () => null,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!vehicleId && !!clientId,
  });

  // Este panel usa estado local (no react-query), así que invalidateSalesQueries no lo
  // refrescaba: al crear/editar/aprobar una venta (incl. notas de venta antiguas) el
  // resumen del vehículo quedaba stale (reportado por Mallorca). Nos suscribimos a las
  // invalidaciones de las queries de ventas y re-traemos los datos del vehículo.
  useEffect(() => {
    const unsub = queryClient.getQueryCache().subscribe((event: any) => {
      if (event?.type !== 'updated' || event?.action?.type !== 'invalidate') return;
      const key = event?.query?.queryKey?.[0];
      if (
        (key === 'soldVehicles' ||
          key === 'salesSummary' ||
          key === 'vehicle-net-profits-by-period') &&
        vehicleId &&
        clientId
      ) {
        fetchAcquisitionAndSaleData();
      }
    });
    return unsub;
  }, [queryClient, vehicleId, clientId, fetchAcquisitionAndSaleData]);

  // Listas SIN filtrar — para timeline y desglose UI (muestra todos los extras
  // independiente de quién los asume; el filtro de assumed_by sólo afecta cálculos).
  const expenseExtras = extrasData.filter((extra) => extra.type === 'expense');
  const incomeExtras = extrasData.filter((extra) => extra.type === 'income');

  // Listas alineadas con el cálculo del helper (qué cuenta como ingreso/gasto de
  // la AUTOMOTORA) para que el desglose del Resumen Financiero cuadre con los
  // totales. Incluye los adicionales de venta del modal (sale_additional /
  // sale_income): assumed_by='customer' => ingreso de la automotora;
  // assumed_by='dealership' => gasto. (Ver vehicleNetProfit.ts.)
  // Pass-through: dinero que la automotora solo traspasa (ej. CRT / comisión tarjeta
  // cobrada al cliente y pagada a un tercero). NO cuenta como ingreso ni gasto real —
  // sale de las listas de "Otros ingresos"/"Otros gastos" y se muestra aparte en su
  // propia sección informativa (ver passthroughExtras).
  const passthroughExtras = extrasData.filter((e: any) => e.is_passthrough === true);
  const dealershipIncomeExtras = extrasData.filter((e: any) => {
    if (e.is_passthrough === true) return false;
    const ab = e.assumed_by ?? 'dealership';
    // sale_income es SIEMPRE ingreso de la automotora (igual que partitionExtras,
    // donde assumed_by NO aplica para sale_income). Antes se filtraba por
    // assumed_by='customer' y un sale_income/dealership caía en la lista de GASTOS,
    // contradiciendo el cálculo (que lo suma como ingreso) → el desglose no cuadraba.
    if (e.type === 'sale_income') return true;
    if (e.type === 'income') return ab === 'dealership';
    if (e.type === 'sale_additional') return ab === 'customer';
    return false;
  });
  const dealershipExpenseExtras = extrasData.filter((e: any) => {
    if (e.is_passthrough === true) return false;
    const ab = e.assumed_by ?? 'dealership';
    if (e.type === 'expense') return ab === 'dealership';
    if (e.type === 'sale_additional') return ab === 'dealership';
    return false;
  });

  // Totales informativos (todos los extras, sin filtrar por assumed_by).
  // Para el cálculo de utilidad usamos el helper más abajo, que sí filtra.
  const additionalExpenses = expenseExtras.reduce(
    (sum, extra) => sum + Number(extra.amount || 0),
    0
  );
  const additionalIncome = incomeExtras.reduce(
    (sum, extra) => sum + Number(extra.amount || 0),
    0
  );

  // Cálculo unificado vía helper (filtra internamente assumed_by='dealership').
  // Fase 0: consignmentMethod queda undefined → helper aplica default 'precio_garantizado'.
  const mappedExtras: VehicleExtra[] = extrasData.map((e) => ({
    amount: Number(e.amount || 0),
    type: e.type as 'expense' | 'income',
    assumedBy: (e.assumed_by ?? 'dealership') as AssumedBy,
    // Regla 3: IVA por línea. extrasData viene de select('*'), así que la columna llega
    // cuando la migración está aplicada; si no, undefined → se trata como TOTAL.
    generaCreditoFiscal: (e as any).genera_credito_fiscal ?? null,
    // Pass-through: excluye la línea del margen (informativa). select('*') trae la
    // columna cuando la migración está aplicada; si no, undefined → se trata normal.
    isPassthrough: (e as any).is_passthrough ?? null,
  }));

  // Comisión financiera (vehicles_sales.financing_commission) y comisión del
  // vendedor canónica (splits con fallback legacy) se pasan EXPLÍCITAS al helper
  // (mismas reglas que el loader del dashboard → el detalle == su aporte al total).
  const financingCommission = Number((saleData as any)?.financing_commission) || 0;
  const sellerCommissionCanonical =
    commissionSplits.count > 0
      ? commissionSplits.totalAmount
      : Number((saleData as any)?.commission_amount) || 0;

  // Inputs base del helper. Se exponen para que consumers puedan re-llamarlo
  // con overrides (ej: calculadora de "margen con otro precio" en no vendidos).
  const profitInput = {
    isSold: !!saleData,
    isConsigned,
    consignmentMethod: (acquisitionData as any)?.metodo_consignacion as
      | ConsignmentMethod
      | undefined,
    salePrice: saleData?.sale_price,
    publishedPrice: (vehicleData as any)?.price,
    purchasePrice: !isConsigned ? acquisitionData?.purchase_price : undefined,
    // IVA de compra (auto propio): si la compra tiene factura afecta, el costo entra
    // neto. acquisitionData viene de select('*') → la columna llega si la migración
    // está aplicada; si no, undefined → bruto (legacy).
    purchaseGeneraCreditoFiscal: !isConsigned
      ? (acquisitionData as any)?.genera_credito_fiscal
      : undefined,
    // Precio garantizado: usa el reajustado (agreed_price_final) si existe, si no
    // el acordado original. Así un consignado renegociado calcula la utilidad real.
    agreedPrice: isConsigned
      ? (acquisitionData as any)?.agreed_price_final ??
        acquisitionData?.agreed_price
      : undefined,
    commissionPercentage: (acquisitionData as any)
      ?.porcentaje_comision_consignacion,
    commissionFixed: (acquisitionData as any)?.monto_fijo_comision_consignacion,
    discount,
    financingCommission,
    sellerCommission: sellerCommissionCanonical,
    // Regla 4: transferencia de salida. Pass-through salvo que la automotora la absorba
    // (charged === false) en auto propio → castiga el margen.
    transferValue: (saleData as any)?.transfer_value,
    transferValueCharged: (saleData as any)?.transfer_value_charged,
    // Override de utilidad bruta SOLO si el close_deal trae un monto > 0.
    // Un dealershipCommission de 0 (o ausente) se trata como "no seteado": antes
    // forzaba utilidad bruta = 0 (consignados que aparecían con utilidad cero, ej.
    // "RAM"). Ahora cae a la fórmula del método (precio_garantizado: venta − acordado;
    // comisión: venta×% + fijo), que es la utilidad real de la consignación.
    consignmentGrossProfitOverride:
      isConsigned && dealershipCommission && dealershipCommission > 0
        ? dealershipCommission
        : null,
    extras: mappedExtras,
  };

  const profitResult = calculateVehicleNetProfit(profitInput);

  // netResult = utilidad BRUTA (antes de comisión vendedor), alineado con la
  // columna "Utilidad Neta" (net_profit) y con el aporte de este auto al total del
  // dashboard. La transferencia (CRT) ya NO se suma: es pass-through, no margen
  // (decisión canónica). La comisión de vendedores (sale_commission_splits) se
  // expone aparte en commissionSplits y se resta en las vistas de neto c/comisión.
  const netResult = profitResult.grossProfit;

  // Régimen tributario del vehículo (R2): afecto/exento/consignación, resuelto de
  // iva_exento del auto con fallback al default del cliente. Determina si la VENTA
  // lleva IVA. ivaDebitoFiscal es INFORMATIVO (el IVA del margen que la automotora
  // retiene para el SII en autos afectos) — NO modifica netResult: no movemos el margen.
  const regimen = getVehicleRegimen(
    { is_consigned: isConsigned, iva_exento: (vehicleData as any)?.iva_exento },
    clientExempt
  );
  const IVA_PCT_DEBITO = 19;
  const ivaDebitoFiscal =
    regimenSaleHasIva(regimen) && netResult > 0
      ? Math.round((netResult * IVA_PCT_DEBITO) / (100 + IVA_PCT_DEBITO))
      : 0;

  // totalExpenses / totalIncome se mantienen como derivados informativos para
  // compatibilidad con la UI actual ("Total gastos" / "Total ingresos" del resumen).
  const totalExpenses =
    profitResult.breakdown.acquisitionCost +
    profitResult.breakdown.dealershipExpenses;
  const totalIncome =
    profitResult.breakdown.basePrice +
    profitResult.breakdown.dealershipIncome;

  // Format currency utility
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    const abs = Math.abs(amount);
    const formatted = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(abs);
    return amount < 0 ? `-${formatted}` : formatted;
  };

  return {
    acquisitionData,
    saleData,
    isLoading,
    totalExpenses,
    totalIncome,
    netResult,
    regimen,
    ivaDebitoFiscal,
    additionalExpenses,
    additionalIncome,
    expenseExtras,
    incomeExtras,
    dealershipIncomeExtras,
    dealershipExpenseExtras,
    // Líneas pass-through (dinero solo traspasado): informativas, fuera del margen.
    passthroughExtras,
    formatCurrency,
    refetchData: fetchAcquisitionAndSaleData,
    vehicleData,
    // Resultado completo del helper (incluye breakdown por categoría y rama del
    // árbol). Usado por VehicleFinancialSummary para renderizar el desglose
    // del PDF (Capital / Gastos / Ingresos / Resultado).
    profitResult,
    dealershipCommissionOverride: dealershipCommission,
    // Inputs originales del helper. Consumers pueden re-llamarlo con overrides
    // (ej: calculadora "margen con otro precio").
    profitInput,
    // Info del vendedor que cerró la venta (si está vendido).
    saleSeller,
    // Suma actual de splits de comisión vendedor para mostrar en el resumen.
    commissionSplits,
  };
};

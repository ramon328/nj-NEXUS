/**
 * Smoke check contra Supabase: para los últimos N vehículos vendidos,
 * calcula netProfit con el helper unificado y reporta:
 *  - el número
 *  - la rama del árbol aplicada
 *  - si tiene close_deal cargado (override aplica)
 *  - extras dealership/customer
 *
 * Sirve para confirmar visualmente que las cifras tienen sentido antes
 * de mergear.
 *
 * Correr con: npx tsx scripts/smoke-vehicleNetProfit.ts [limit]
 *   limit: cantidad de vehículos a probar (default 10)
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import {
  calculateVehicleNetProfit,
  type AssumedBy,
  type ConsignmentMethod,
  type VehicleExtra,
} from '../src/utils/vehicleNetProfit';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const limit = parseInt(process.argv[2] || '10', 10);
const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);

async function main() {
  console.log(`\nSmoke check: últimas ${limit} ventas de cualquier cliente\n`);

  const { data: sales, error } = await supabase
    .from('vehicles_sales')
    .select(
      `
      id,
      vehicle_id,
      sale_price,
      sale_date,
      vehicles!vehicles_sales_vehicle_id_fkey!inner(client_id, is_consigned, price, brand:brand_id(name), model:model_id(name), year)
    `
    )
    .not('sale_date', 'is', null)
    .order('sale_date', { ascending: false })
    .limit(limit);

  if (error || !sales) {
    console.error('Error fetching sales:', error);
    process.exit(1);
  }

  for (const sale of sales as unknown as Array<{
    id: number;
    vehicle_id: number;
    sale_price: number | null;
    sale_date: string;
    vehicles: {
      client_id: number;
      is_consigned: boolean;
      price: number | null;
      brand?: { name: string } | null;
      model?: { name: string } | null;
      year?: number;
    };
  }>) {
    const vehicleId = sale.vehicle_id;
    const isConsigned = !!sale.vehicles.is_consigned;

    const [purchaseRes, consignmentRes, extrasRes, closeDealRes] =
      await Promise.all([
        supabase
          .from('vehicles_purchases')
          .select('purchase_price')
          .eq('vehicle_id', vehicleId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('vehicles_consignments')
          .select(
            'agreed_price, metodo_consignacion, porcentaje_comision_consignacion, monto_fijo_comision_consignacion'
          )
          .eq('vehicle_id', vehicleId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('vehicles_extras')
          .select('amount, type, assumed_by')
          .eq('vehicle_id', vehicleId),
        supabase
          .from('vehicles_documents')
          .select('vehicles_close_deal!inner(dealershipCommission)')
          .eq('vehicle_id', vehicleId)
          .eq('type', 'close_deal')
          .maybeSingle(),
      ]);

    const purchase = purchaseRes.data as { purchase_price: number } | null;
    const consignment = consignmentRes.data as {
      agreed_price: number | null;
      metodo_consignacion: string | null;
      porcentaje_comision_consignacion: number | null;
      monto_fijo_comision_consignacion: number | null;
    } | null;
    const closeDeal = closeDealRes.data as {
      vehicles_close_deal: { dealershipCommission: number | null } | null;
    } | null;
    const dealershipCommission =
      closeDeal?.vehicles_close_deal?.dealershipCommission ?? null;

    const extras: VehicleExtra[] = (extrasRes.data || []).map((e: any) => ({
      amount: Number(e.amount) || 0,
      type: e.type as 'expense' | 'income',
      assumedBy: (e.assumed_by ?? 'dealership') as AssumedBy,
    }));

    const r = calculateVehicleNetProfit({
      isSold: true,
      isConsigned,
      consignmentMethod: consignment?.metodo_consignacion as
        | ConsignmentMethod
        | undefined,
      salePrice: sale.sale_price,
      purchasePrice: !isConsigned ? purchase?.purchase_price : undefined,
      agreedPrice: isConsigned ? consignment?.agreed_price : undefined,
      commissionPercentage: consignment?.porcentaje_comision_consignacion,
      commissionFixed: consignment?.monto_fijo_comision_consignacion,
      // Solo aplica si HAY close_deal cargado (preservar legacy)
      consignmentGrossProfitOverride: isConsigned ? dealershipCommission : null,
      extras,
    });

    // Fórmula VIEJA de useVehicleFinancialData para comparar
    const oldNetResult = (() => {
      if (isConsigned) {
        const agreed = consignment?.agreed_price ?? 0;
        const extraExp = extras
          .filter((e) => e.type === 'expense')
          .reduce((s, e) => s + e.amount, 0);
        const extraInc = extras
          .filter((e) => e.type === 'income')
          .reduce((s, e) => s + e.amount, 0);
        return (sale.sale_price ?? 0) + extraInc - agreed - extraExp;
      } else {
        const cost = purchase?.purchase_price ?? 0;
        const extraExp = extras
          .filter((e) => e.type === 'expense')
          .reduce((s, e) => s + e.amount, 0);
        const extraInc = extras
          .filter((e) => e.type === 'income')
          .reduce((s, e) => s + e.amount, 0);
        return (sale.sale_price ?? 0) + extraInc - cost - extraExp;
      }
    })();

    const diff = r.netProfit - oldNetResult;
    const diffPct = oldNetResult !== 0 ? ((diff / oldNetResult) * 100).toFixed(1) : 'N/A';
    const dealerExp = extras.filter((e) => e.type === 'expense' && e.assumedBy === 'dealership').length;
    const customerExp = extras.filter((e) => e.type === 'expense' && e.assumedBy === 'customer').length;

    const vehInfo = `${sale.vehicles.brand?.name ?? '?'} ${sale.vehicles.model?.name ?? '?'} ${sale.vehicles.year ?? ''}`;
    console.log(`─────────────────────────────────────────────`);
    console.log(`Vehículo ${sale.vehicle_id}: ${vehInfo}`);
    console.log(`  Tipo:           ${isConsigned ? 'CONSIGNADO' : 'STOCK PROPIO'}`);
    console.log(`  Precio venta:   ${fmt(sale.sale_price ?? 0)}`);
    if (isConsigned) {
      console.log(`  Precio acordado:${fmt(consignment?.agreed_price ?? 0)}`);
      console.log(`  Close_deal:     ${dealershipCommission !== null ? fmt(dealershipCommission) : '(NO cargado → override 0)'}`);
      console.log(`  Método:         ${consignment?.metodo_consignacion || 'precio_garantizado (default)'}`);
    } else {
      console.log(`  Precio compra:  ${fmt(purchase?.purchase_price ?? 0)}`);
    }
    console.log(`  Extras:         ${dealerExp} dealership + ${customerExp} customer`);
    console.log(`  Rama helper:    ${r.branch}`);
    console.log(`  NUEVO netProfit: ${fmt(r.netProfit)}`);
    console.log(`  VIEJO netResult: ${fmt(oldNetResult)}`);
    console.log(`  DIFF:           ${fmt(diff)} (${diffPct}%)`);
    if (Math.abs(diff) > 0) {
      const reasons: string[] = [];
      if (customerExp > 0) reasons.push(`${customerExp} extras de customer ya no afectan (correcto)`);
      if (isConsigned && dealershipCommission !== null && dealershipCommission > 0)
        reasons.push(`override de close_deal aplicado (correcto)`);
      if (isConsigned && dealershipCommission === null)
        reasons.push(`sin close_deal → override 0 (correcto, resuelve -15M)`);
      if (reasons.length > 0) {
        console.log(`  Razón:          ${reasons.join('; ')}`);
      } else {
        console.log(`  ⚠ Diferencia sin razón obvia — investigar`);
      }
    }
  }

  console.log(`─────────────────────────────────────────────\n✓ Smoke check completado\n`);
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});

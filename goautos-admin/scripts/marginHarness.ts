/**
 * Harness de consistencia del margen unificado (sin app/login).
 * Importa SOLO las capas puras (vehicleNetProfit + soldVehicleFinancials) y prueba:
 *  - valores dorados por rama (propio, consignado garantizado, comisión, override),
 *  - decisiones canónicas: transferencia FUERA, financiera DENTRO, splits > legacy,
 *  - el invariante: Σ por-auto == total del dashboard.
 * Correr:  npx tsx scripts/marginHarness.ts
 */
import { calculateVehicleNetProfit } from '../src/utils/vehicleNetProfit';
import { deriveTradeInValue, cashDifferenceFromToma } from '../src/utils/tradeInValue';
import {
  getVehicleRegimen,
  regimenCostBasis,
  regimenSaleHasIva,
} from '../src/utils/vehicleRegimen';
import { lineCostBasis } from '../src/utils/fiscalCredit';
import {
  buildNormalizedRows,
  aggregateSoldVehicles,
  normalizeSoldVehicle,
  resolveSellerCommission,
  type RawSoldVehicleBundle,
} from '../src/utils/soldVehicleFinancials';

let failures = 0;
function assertEq(label: string, got: number, want: number) {
  const ok = Math.abs(got - want) < 0.001;
  if (!ok) failures++;
  console.log(`${ok ? '✅' : '❌'} ${label}: got=${got.toLocaleString()} want=${want.toLocaleString()}`);
}

function assertSame(label: string, got: unknown, want: unknown) {
  const ok = got === want;
  if (!ok) failures++;
  console.log(`${ok ? '✅' : '❌'} ${label}: got=${String(got)} want=${String(want)}`);
}

const base = (over: Partial<RawSoldVehicleBundle>): RawSoldVehicleBundle => ({
  saleId: 1, vehicleId: 1, saleDate: '2026-06-01', sellerId: 1,
  isConsigned: false, salePrice: 0, commissionAmount: null, financingCommission: null,
  purchasePrice: null, consignment: null, closeDeal: null, extras: [], splitsTotal: null,
  ...over,
});

// ── Bundle 1: PROPIO ──
// 10M venta − 8M compra − 200k gasto + 150k financiera = 1.95M bruto; − 300k splits = 1.65M neto.
// transfer 500k presente (debe ignorarse).
const b1 = base({
  saleId: 1, vehicleId: 1, salePrice: 10_000_000, purchasePrice: 8_000_000,
  financingCommission: 150_000, splitsTotal: 300_000, commissionAmount: 999_999,
  extras: [{ amount: 200_000, type: 'expense', assumedBy: 'dealership' }],
});

// ── Bundle 2: CONSIGNADO GARANTIZADO con agreed_price_final + descuento ──
// (10M − 300k desc) − 7.5M final = 2.2M bruto; sin splits → legacy 100k → 2.1M neto.
const b2 = base({
  saleId: 2, vehicleId: 2, isConsigned: true, salePrice: 10_000_000,
  commissionAmount: 100_000, splitsTotal: null,
  consignment: { agreedPrice: 7_000_000, agreedPriceFinal: 7_500_000, method: 'precio_garantizado', commissionPercentage: null, commissionFixed: null },
  closeDeal: { dealershipCommission: null, discount: 300_000 },
});

// ── Bundle 3: CONSIGNADO COMISIÓN (5% + 100k fijo) + extra del cliente (ignorado) ──
// 10M×5% + 100k = 600k bruto; gasto del cliente 50k no afecta; sin comisión vendedor → 600k neto.
const b3 = base({
  saleId: 3, vehicleId: 3, isConsigned: true, salePrice: 10_000_000,
  consignment: { agreedPrice: null, agreedPriceFinal: null, method: 'comision', commissionPercentage: 5, commissionFixed: 100_000 },
  extras: [{ amount: 50_000, type: 'expense', assumedBy: 'customer' }],
});

// ── Bundle 4: CONSIGNADO con override (close_deal) + adicionales de venta ──
// override 800k − 100k gasto dealership + 50k ingreso cliente = 750k bruto; sin splits → 750k neto.
const b4 = base({
  saleId: 4, vehicleId: 4, isConsigned: true, salePrice: 9_000_000,
  consignment: { agreedPrice: 6_000_000, agreedPriceFinal: null, method: 'precio_garantizado', commissionPercentage: null, commissionFixed: null },
  closeDeal: { dealershipCommission: 800_000, discount: null },
  extras: [
    { amount: 100_000, type: 'sale_additional', assumedBy: 'dealership' },
    { amount: 50_000, type: 'sale_additional', assumedBy: 'customer' },
  ],
});

console.log('=== Valores dorados por rama ===');
const r1 = normalizeSoldVehicle(b1);
assertEq('propio bruto', r1.grossProfit, 1_950_000);
assertEq('propio neto', r1.netProfitAfterSellerCommission, 1_650_000);
const r2 = normalizeSoldVehicle(b2);
assertEq('consig garantizado bruto (usa final+desc)', r2.grossProfit, 2_200_000);
assertEq('consig garantizado neto (legacy 100k)', r2.netProfitAfterSellerCommission, 2_100_000);
assertEq('consig garantizado cogs == final', r2.cogs, 7_500_000);
const r3 = normalizeSoldVehicle(b3);
assertEq('consig comisión bruto', r3.grossProfit, 600_000);
assertEq('consig comisión neto', r3.netProfitAfterSellerCommission, 600_000);
const r4 = normalizeSoldVehicle(b4);
assertEq('consig override bruto', r4.grossProfit, 750_000);

console.log('\n=== Decisión: transferencia FUERA del margen ===');
const withTransfer = calculateVehicleNetProfit({ isSold: true, isConsigned: false, salePrice: 10_000_000, purchasePrice: 8_000_000, transferValue: 500_000 });
const noTransfer = calculateVehicleNetProfit({ isSold: true, isConsigned: false, salePrice: 10_000_000, purchasePrice: 8_000_000, transferValue: 0 });
assertEq('transfer no cambia el bruto', withTransfer.grossProfit, noTransfer.grossProfit);
assertEq('bruto sin transfer correcto', withTransfer.grossProfit, 2_000_000);

console.log('\n=== Decisión: financiera DENTRO del margen ===');
const noFin = normalizeSoldVehicle(base({ saleId: 9, salePrice: 10_000_000, purchasePrice: 8_000_000, financingCommission: 0, extras: [{ amount: 200_000, type: 'expense', assumedBy: 'dealership' }] }));
assertEq('sin financiera baja 150k', r1.grossProfit - noFin.grossProfit, 150_000);

console.log('\n=== Decisión: splits sobre legacy ===');
assertEq('splits ganan al legacy', resolveSellerCommission(b1), 300_000);
assertEq('sin splits usa legacy', resolveSellerCommission(b2), 100_000);

console.log('\n=== Decisión: sale_income es SIEMPRE ingreso (aunque assumed_by=dealership) ===');
const siBase = calculateVehicleNetProfit({ isSold: true, isConsigned: false, salePrice: 10_000_000, purchasePrice: 8_000_000 });
const siInc = calculateVehicleNetProfit({ isSold: true, isConsigned: false, salePrice: 10_000_000, purchasePrice: 8_000_000, extras: [{ amount: 300_000, type: 'sale_income', assumedBy: 'dealership' }] });
assertEq('sale_income(dealership) SUMA como ingreso (+300k, no resta)', siInc.grossProfit - siBase.grossProfit, 300_000);

console.log('\n=== PR-2 asumido-por: tercer valor "consignor" en assumed_by ===');
// Base: consignado con override de comisión de la automotora 800k, sin extras.
const cbBase = calculateVehicleNetProfit({
  isSold: true, isConsigned: true, salePrice: 10_000_000,
  consignmentGrossProfitOverride: 800_000,
});
// (a) sale_additional 'dealership' en consignado SIGUE restando del margen
//     (blindaje del fix "bug Carklass": la automotora lo absorbe → gasto).
const cbDealership = calculateVehicleNetProfit({
  isSold: true, isConsigned: true, salePrice: 10_000_000,
  consignmentGrossProfitOverride: 800_000,
  extras: [{ amount: 100_000, type: 'sale_additional', assumedBy: 'dealership' }],
});
assertEq("(a) sale_additional 'dealership' consignado sigue restando del margen (−100k)", cbBase.grossProfit - cbDealership.grossProfit, 100_000);
// (b) sale_additional 'customer' SIGUE sumando como ingreso de la automotora.
const cbCustomer = calculateVehicleNetProfit({
  isSold: true, isConsigned: true, salePrice: 10_000_000,
  consignmentGrossProfitOverride: 800_000,
  extras: [{ amount: 50_000, type: 'sale_additional', assumedBy: 'customer' }],
});
assertEq("(b) sale_additional 'customer' consignado suma como ingreso (+50k)", cbCustomer.grossProfit - cbBase.grossProfit, 50_000);
// (c) sale_additional 'consignor' NO altera el margen de la automotora (neutro):
//     lo paga el consignador de su liquidación y la automotora lo recupera del payout.
const cbConsignor = calculateVehicleNetProfit({
  isSold: true, isConsigned: true, salePrice: 10_000_000,
  consignmentGrossProfitOverride: 800_000,
  extras: [{ amount: 760_852, type: 'sale_additional', assumedBy: 'consignor' }],
});
assertEq("(c) sale_additional 'consignor' es NEUTRO en el margen", cbConsignor.grossProfit, cbBase.grossProfit);
// (c') un 'consignor' tipo 'expense' (drawer del timeline en consignado) tampoco altera el margen.
const cbConsignorExp = calculateVehicleNetProfit({
  isSold: true, isConsigned: true, salePrice: 10_000_000,
  consignmentGrossProfitOverride: 800_000,
  extras: [{ amount: 300_000, type: 'expense', assumedBy: 'consignor' }],
});
assertEq("(c') expense 'consignor' es NEUTRO en el margen", cbConsignorExp.grossProfit, cbBase.grossProfit);

console.log('\n=== PR-3 pass-through: Ford SRZR56 (consignado) NO infla el margen ===');
// Caso real: comisión de consignación 2.618.000; único gasto real "Uso de Tag" 166.632.
// Los conceptos pass-through (transferencia de dominio + comisión tarjeta) se digitaron
// como INGRESO cobrado al cliente y GASTO pagado por la automotora, con montos distintos:
// el diferencial recargo−costo inflaba el margen. Marcados is_passthrough, deben quedar
// fuera del cálculo (informativos) y el margen real = 2.618.000 − 166.632 = 2.451.368.
const fordBase = calculateVehicleNetProfit({
  isSold: true, isConsigned: true, salePrice: 44_000_000,
  consignmentGrossProfitOverride: 2_618_000,
  extras: [
    { amount: 166_632, type: 'sale_additional', assumedBy: 'dealership' }, // Uso de Tag (gasto real)
  ],
});
assertEq('Ford base: comisión 2.618.000 − gasto real 166.632', fordBase.grossProfit, 2_451_368);
const fordPassthrough = calculateVehicleNetProfit({
  isSold: true, isConsigned: true, salePrice: 44_000_000,
  consignmentGrossProfitOverride: 2_618_000,
  extras: [
    { amount: 166_632, type: 'sale_additional', assumedBy: 'dealership' },
    { amount: 457_315, type: 'sale_additional', assumedBy: 'customer', isPassthrough: true }, // comisión tarjeta (cobrada)
    { amount: 816_889, type: 'sale_additional', assumedBy: 'customer', isPassthrough: true }, // transferencia (cobrada)
    { amount: 760_852, type: 'sale_additional', assumedBy: 'dealership', isPassthrough: true }, // transferencia (pagada)
  ],
});
assertEq('Ford: pass-through NO altera el margen (sigue 2.451.368)', fordPassthrough.grossProfit, 2_451_368);
// Buckets informativos: el par pass-through queda visible pero fuera del margen.
assertEq('pass-through income informativo', fordPassthrough.breakdown.passthroughIncome, 1_274_204);
assertEq('pass-through expense informativo', fordPassthrough.breakdown.passthroughExpense, 760_852);
// Regresión del bug: SIN el flag, el diferencial recargo−costo infla el margen.
const fordSinFlag = calculateVehicleNetProfit({
  isSold: true, isConsigned: true, salePrice: 44_000_000,
  consignmentGrossProfitOverride: 2_618_000,
  extras: [
    { amount: 166_632, type: 'sale_additional', assumedBy: 'dealership' },
    { amount: 457_315, type: 'sale_additional', assumedBy: 'customer' },
    { amount: 816_889, type: 'sale_additional', assumedBy: 'customer' },
    { amount: 760_852, type: 'sale_additional', assumedBy: 'dealership' },
  ],
});
assertEq('Ford SIN flag: el margen queda inflado (2.964.720 > 2.451.368)', fordSinFlag.grossProfit, 2_964_720);

console.log('\n=== Fundamento contable regla 5b: valor de toma DERIVADO del precio real ===');
// Ejemplos exactos del documento de Mallorca (mismo trato al cliente, distinta toma real).
assertEq('A mantengo precio: venta 100, dif 20 → toma 80', deriveTradeInValue(100, 20), 80);
assertEq('B ajusto precio: venta 90, dif 20 → toma 70', deriveTradeInValue(90, 20), 70);
assertEq('inversa: venta 90, toma 70 → dif 20', cashDifferenceFromToma(90, 70), 20);
// El riesgo que blinda la regla: NO anclar al precio publicado. Si la venta real es 90 y
// la diferencia 20, la toma es 70 — NUNCA 80 (que saldría de anclar al publicado 100).
assertEq('no usa el publicado (100): toma real = 70, no 80', deriveTradeInValue(90, 20), 70);

console.log('\n=== Fundamento contable regla 2: régimen y su encadenamiento ===');
// Clasificación (consignación manda; luego exento/afecto según iva_exento, null=default cliente).
assertSame('consignado → consignacion', getVehicleRegimen({ is_consigned: true, iva_exento: null }), 'consignacion');
assertSame('iva_exento=true → exento', getVehicleRegimen({ is_consigned: false, iva_exento: true }), 'exento');
assertSame('iva_exento=false → afecto', getVehicleRegimen({ is_consigned: false, iva_exento: false }), 'afecto');
assertSame('null + cliente afecto → afecto', getVehicleRegimen({ iva_exento: null }, false), 'afecto');
assertSame('null + cliente exento → exento', getVehicleRegimen({ iva_exento: null }, true), 'exento');
// Encadenamiento (cómo acumula costo + si la venta lleva IVA).
assertSame('afecto → costo NETO', regimenCostBasis('afecto'), 'neto');
assertSame('exento → costo TOTAL', regimenCostBasis('exento'), 'total');
assertSame('consignacion → sin_stock', regimenCostBasis('consignacion'), 'sin_stock');
assertSame('solo afecto vende con IVA', regimenSaleHasIva('afecto'), true);
assertSame('exento vende sin IVA', regimenSaleHasIva('exento'), false);
assertSame('consignacion: la venta del auto sin IVA', regimenSaleHasIva('consignacion'), false);

console.log('\n=== Fundamento contable regla 3: IVA por LÍNEA (neto vs total) ===');
// Línea con factura afecta (genera crédito) carga su NETO; sin crédito o legacy → TOTAL.
assertEq('línea genera crédito: 119k → neto 100k', lineCostBasis(119_000, true), 100_000);
assertEq('línea sin crédito: 100k → total 100k', lineCostBasis(100_000, false), 100_000);
assertEq('línea legacy (sin flag): 119k → total 119k (NO /1,19 a ciegas)', lineCostBasis(119_000, undefined), 119_000);
// Integración: un auto mezcla las dos en el mismo día (regla "un mismo auto puede mezclar").
const ivaLineExtras = [
  { amount: 119_000, type: 'expense' as const, assumedBy: 'dealership' as const, generaCreditoFiscal: true },
  { amount: 100_000, type: 'expense' as const, assumedBy: 'dealership' as const, generaCreditoFiscal: false },
];
const conFlags = calculateVehicleNetProfit({ isSold: true, isConsigned: false, salePrice: 1_000_000, purchasePrice: 500_000, extras: ivaLineExtras });
const sinFlags = calculateVehicleNetProfit({ isSold: true, isConsigned: false, salePrice: 1_000_000, purchasePrice: 500_000, extras: ivaLineExtras.map((e) => ({ ...e, generaCreditoFiscal: undefined })) });
// con flags: costo gastos = 100k(neto) + 100k(total) = 200k → gross = 1M − 500k − 200k = 300k
assertEq('mixto con IVA por línea: gross = 300k', conFlags.grossProfit, 300_000);
// legacy: ambos total = 219k → gross = 281k. La diferencia (19k) es el IVA recuperable.
assertEq('legacy (sin flags): gross = 281k', sinFlags.grossProfit, 281_000);

console.log('\n=== Fundamento contable regla 4: transferencia de salida ===');
const tBase = { isSold: true, isConsigned: false, salePrice: 1_000_000, purchasePrice: 600_000 };
assertEq('propio, comprador paga (charged) → pass-through, gross 400k',
  calculateVehicleNetProfit({ ...tBase, transferValue: 150_000, transferValueCharged: true }).grossProfit, 400_000);
assertEq('propio, charged undefined (default) → pass-through, gross 400k',
  calculateVehicleNetProfit({ ...tBase, transferValue: 150_000 }).grossProfit, 400_000);
assertEq('propio, automotora absorbe (no charged) → castiga: gross 250k',
  calculateVehicleNetProfit({ ...tBase, transferValue: 150_000, transferValueCharged: false }).grossProfit, 250_000);
// Consignación garantizado: venta 1M, acordado 800k → gross 200k; la automotora NO transfiere
// a su nombre → aunque "no charged", la transferencia NUNCA castiga su margen.
assertEq('consignación: transfer no castiga (gross 200k)',
  calculateVehicleNetProfit({ isSold: true, isConsigned: true, salePrice: 1_000_000, agreedPrice: 800_000, consignmentMethod: 'precio_garantizado', transferValue: 150_000, transferValueCharged: false }).grossProfit, 200_000);

console.log('\n=== Fix Sebastián: ingreso YA registrado entra al margen ESPERADO (no vendido) ===');
// SsangYong MUSSO: recibido en parte de pago (costo 19M), publicado 22.8M, + ingreso de
// $415k (transferencia que pagó el cliente). El margen esperado debe ser 4.215M, no 3.8M.
const muso = calculateVehicleNetProfit({
  isSold: false, isConsigned: false, publishedPrice: 22_800_000, purchasePrice: 19_000_000,
  extras: [{ amount: 415_000, type: 'income', assumedBy: 'dealership' }],
});
assertSame('rama = no_vendido_stock', muso.branch, 'no_vendido_stock');
assertEq('MUSSO margen esperado incluye el ingreso 415k', muso.grossProfit, 4_215_000);
const musoSin = calculateVehicleNetProfit({ isSold: false, isConsigned: false, publishedPrice: 22_800_000, purchasePrice: 19_000_000 });
assertEq('MUSSO sin el ingreso = 3.8M', musoSin.grossProfit, 3_800_000);

console.log('\n=== PR-5 dashboard-iva: IVA agregado del período (Σ por-auto == dashboard) ===');
// El IVA por-auto reutiliza el MISMO helper puro (buildIvaBreakdown) que el Resumen IVA
// del detalle → dashboard y detalle cuadran por construcción. Convención: neto = débito − crédito.
// ivaA: propio AFECTO. venta 10M − compra 8M (sin crédito) = 2M margen → débito 19/119 = 319.328.
const ivaA = normalizeSoldVehicle(base({
  saleId: 21, vehicleId: 21, salePrice: 10_000_000, purchasePrice: 8_000_000,
}));
assertEq('ivaA (afecto) débito = round(2M×19/119)', ivaA.ivaDebito, 319_328);
assertEq('ivaA (afecto) crédito = 0 (compra sin factura)', ivaA.ivaCredito, 0);
assertEq('ivaA (afecto) neto = débito − crédito', ivaA.ivaNeto, 319_328);
// ivaB: EXENTO (iva_exento=true). La venta NO genera débito aunque haya margen.
const ivaB = normalizeSoldVehicle(base({
  saleId: 22, vehicleId: 22, salePrice: 10_000_000, purchasePrice: 8_000_000, ivaExento: true,
}));
assertEq('ivaB (exento) débito = 0 (venta sin IVA)', ivaB.ivaDebito, 0);
assertEq('ivaB (exento) neto = 0', ivaB.ivaNeto, 0);
// ivaC: CONSIGNADO con gasto de la automotora con factura (crédito 19% de 119k = 19k).
// Consignación: la venta del auto NO lleva débito → neto = −crédito (a favor).
const ivaC = normalizeSoldVehicle(base({
  saleId: 23, vehicleId: 23, isConsigned: true, salePrice: 10_000_000,
  closeDeal: { dealershipCommission: 800_000, discount: null },
  consignment: { agreedPrice: 6_000_000, agreedPriceFinal: null, method: 'precio_garantizado', commissionPercentage: null, commissionFixed: null },
  extras: [{ amount: 119_000, type: 'sale_additional', assumedBy: 'dealership', generaCreditoFiscal: true }],
}));
assertEq('ivaC (consignado) débito = 0 (la venta del auto sin IVA)', ivaC.ivaDebito, 0);
assertEq('ivaC (consignado) crédito = IVA del gasto afecto (119k → 19k)', ivaC.ivaCredito, 19_000);
assertEq('ivaC (consignado) neto = −crédito (a favor)', ivaC.ivaNeto, -19_000);
// ivaD: propio AFECTO con COMPRA que genera crédito fiscal (factura de compra afecta).
// venta 10M, compra 9.520.000 con crédito → el costo entra NETO (9.520.000/1,19 = 8M),
// así grossProfit = 2M. RÉGIMEN DE MARGEN: el débito se calcula sobre el margen BRUTO
// (venta − compra bruta = 10M − 9,52M = 480k) y NO se recupera crédito de compra por
// separado → neto = round(480k×19/119) = 76.639 a PAGAR. Blinda [1]: antes se contaba
// el IVA de compra dos veces (débito sobre margen neto 319.328 − crédito compra 1.520.000
// = −1.200.672 "a favor" falso, con el signo invertido).
const ivaD = normalizeSoldVehicle(base({
  saleId: 24, vehicleId: 24, salePrice: 10_000_000,
  purchasePrice: 9_520_000, purchaseGeneraCreditoFiscal: true,
}));
assertEq('ivaD débito sobre margen bruto (venta−compra bruta) = round(480k×19/119)', ivaD.ivaDebito, 76_639);
assertEq('ivaD crédito = 0 (régimen de margen: no recupera crédito de compra)', ivaD.ivaCredito, 0);
assertEq('ivaD neto = 76.639 a PAGAR (no −1.200.672 del doble conteo)', ivaD.ivaNeto, 76_639);
// ivaE: propio AFECTO con un INGRESO extra afecto (genera_credito_fiscal=true).
// venta 10M − compra 8M (sin crédito) + ingreso 1.190.000 (entra BRUTO) = 3.190.000 margen.
// El IVA del ingreso ya está dentro del débito de la venta (round(3.190.000×19/119) =
// 509.328). Blinda [2]: NO se emite otra fila de débito por el ingreso (antes 509.328 +
// 190.000 = 699.328, contando su IVA dos veces).
const ivaE = normalizeSoldVehicle(base({
  saleId: 25, vehicleId: 25, salePrice: 10_000_000, purchasePrice: 8_000_000,
  extras: [{ amount: 1_190_000, type: 'income', assumedBy: 'dealership', generaCreditoFiscal: true }],
}));
assertEq('ivaE débito = 509.328 (IVA del ingreso NO se cuenta dos veces, no 699.328)', ivaE.ivaDebito, 509_328);
assertEq('ivaE crédito = 0', ivaE.ivaCredito, 0);
assertEq('ivaE neto = 509.328', ivaE.ivaNeto, 509_328);
// Invariante IVA: Σ por-auto == total agregado del dashboard (incluye ivaD/ivaE).
const ivaRows = [ivaA, ivaB, ivaC, ivaD, ivaE];
const ivaAgg = aggregateSoldVehicles(ivaRows);
assertEq('Σ ivaDebito por-auto == ivaDebito dashboard', ivaRows.reduce((s, r) => s + r.ivaDebito, 0), ivaAgg.ivaDebito);
assertEq('Σ ivaCredito por-auto == ivaCredito dashboard', ivaRows.reduce((s, r) => s + r.ivaCredito, 0), ivaAgg.ivaCredito);
assertEq('Σ ivaNeto por-auto == ivaNeto dashboard', ivaRows.reduce((s, r) => s + r.ivaNeto, 0), ivaAgg.ivaNeto);
// débito 319.328 + 0 + 0 + 76.639 + 509.328 = 905.295; crédito 19.000 → neto 886.295.
assertEq('ivaNeto dashboard = débito − crédito (886.295)', ivaAgg.ivaNeto, 886_295);

console.log('\n=== INVARIANTE: Σ por-auto == total dashboard ===');
const rows = buildNormalizedRows([b1, b2, b3, b4]);
const agg = aggregateSoldVehicles(rows, 1_000_000);
assertEq('Σ bruto == grossMargin dashboard', rows.reduce((s, r) => s + r.grossProfit, 0), agg.grossMargin);
assertEq('grossMargin', agg.grossMargin, 5_500_000);
assertEq('Σ neto == utilidadNeta dashboard', rows.reduce((s, r) => s + r.netProfitAfterSellerCommission, 0), agg.utilidadNeta);
assertEq('utilidadNeta', agg.utilidadNeta, 5_100_000);
assertEq('resultadoEmpresa == neta − overhead', agg.resultadoEmpresa, 4_100_000);

console.log(`\n${failures === 0 ? '✅ PASS — la matemática canónica es consistente y el invariante se cumple' : `❌ FAIL — ${failures} aserción(es) fallaron`}`);
process.exit(failures === 0 ? 0 : 1);

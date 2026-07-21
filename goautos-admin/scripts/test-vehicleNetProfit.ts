/**
 * Test standalone del helper calculateVehicleNetProfit.
 * Sin framework — solo assertions y print de resultados.
 * Correr con: npx tsx scripts/test-vehicleNetProfit.ts
 */
import {
  calculateVehicleNetProfit,
  type VehicleExtra,
} from '../src/utils/vehicleNetProfit';

let failed = 0;
let passed = 0;

const assertEq = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    console.log(`    expected: ${JSON.stringify(expected)}`);
    console.log(`    actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
};

const extras = (
  expDealership: number,
  expCustomer: number,
  incDealership = 0
): VehicleExtra[] => [
  ...(expDealership > 0
    ? [{ amount: expDealership, type: 'expense' as const, assumedBy: 'dealership' as const }]
    : []),
  ...(expCustomer > 0
    ? [{ amount: expCustomer, type: 'expense' as const, assumedBy: 'customer' as const }]
    : []),
  ...(incDealership > 0
    ? [{ amount: incDealership, type: 'income' as const, assumedBy: 'dealership' as const }]
    : []),
];

// =========================================================================
console.log('\n[Rama 1] vendido_stock — stock propio vendido');
{
  const r = calculateVehicleNetProfit({
    isSold: true,
    isConsigned: false,
    salePrice: 15_000_000,
    purchasePrice: 10_000_000,
    extras: extras(500_000, 200_000, 100_000),
  });
  assertEq('branch', r.branch, 'vendido_stock');
  assertEq(
    'netProfit = sale - cost - dealershipExp + dealershipInc',
    r.netProfit,
    15_000_000 - 10_000_000 - 500_000 + 100_000
  );
  assertEq(
    'customer extras NO afectan',
    r.netProfit,
    15_000_000 - 10_000_000 - 500_000 + 100_000
  );
  assertEq('isExpected', r.isExpected, false);
}

// =========================================================================
console.log('\n[Rama 2] vendido_consig_garantizado — consignado precio garantizado');
{
  const r = calculateVehicleNetProfit({
    isSold: true,
    isConsigned: true,
    consignmentMethod: 'precio_garantizado',
    salePrice: 11_000_000,
    agreedPrice: 10_000_000,
    consignmentGrossProfitOverride: null, // sin close_deal manual
    extras: extras(120_000, 0),
  });
  assertEq('branch', r.branch, 'vendido_consig_garantizado');
  assertEq(
    'netProfit = sale - agreed - dealershipExp',
    r.netProfit,
    11_000_000 - 10_000_000 - 120_000
  );
}

// =========================================================================
console.log('\n[Rama 3] vendido_consig_garantizado con override (close_deal cargado)');
{
  const r = calculateVehicleNetProfit({
    isSold: true,
    isConsigned: true,
    salePrice: 11_000_000,
    agreedPrice: 10_000_000,
    consignmentGrossProfitOverride: 500_000, // automotora se quedó 500k
    extras: extras(120_000, 50_000, 30_000), // 50k del cliente NO afecta
  });
  assertEq('branch', r.branch, 'vendido_consig_garantizado');
  assertEq(
    'override aplica como gross profit',
    r.netProfit,
    500_000 - 120_000 + 30_000
  );
}

// =========================================================================
console.log('\n[Rama 4] vendido_consig_comision — comisión sobre venta');
{
  const r = calculateVehicleNetProfit({
    isSold: true,
    isConsigned: true,
    consignmentMethod: 'comision',
    salePrice: 10_000_000,
    commissionPercentage: 4, // 4%
    commissionFixed: 50_000,
    consignmentGrossProfitOverride: null,
    extras: extras(20_000, 100_000), // 100k del cliente NO afecta
  });
  assertEq('branch', r.branch, 'vendido_consig_comision');
  assertEq(
    'netProfit = sale * % + fijo - dealershipExp',
    r.netProfit,
    (10_000_000 * 4) / 100 + 50_000 - 20_000
  );
}

// =========================================================================
console.log('\n[Rama 5] no_vendido_stock — margen esperado stock propio');
{
  const r = calculateVehicleNetProfit({
    isSold: false,
    isConsigned: false,
    publishedPrice: 20_000_000,
    purchasePrice: 15_000_000,
    extras: extras(300_000, 0),
  });
  assertEq('branch', r.branch, 'no_vendido_stock');
  assertEq(
    'margen esperado = pub - cost - exp',
    r.netProfit,
    20_000_000 - 15_000_000 - 300_000
  );
  assertEq('isExpected', r.isExpected, true);
}

// =========================================================================
console.log('\n[Rama 6] no_vendido_stock con hypotheticalPrice (calculadora)');
{
  const r = calculateVehicleNetProfit({
    isSold: false,
    isConsigned: false,
    publishedPrice: 20_000_000,
    hypotheticalPrice: 18_000_000, // simular venta a este precio
    purchasePrice: 15_000_000,
    extras: extras(300_000, 0),
  });
  assertEq('branch', r.branch, 'no_vendido_stock');
  assertEq(
    'usa hypothetical, no published',
    r.netProfit,
    18_000_000 - 15_000_000 - 300_000
  );
}

// =========================================================================
console.log('\n[Rama 7] no_vendido_consig_comision');
{
  const r = calculateVehicleNetProfit({
    isSold: false,
    isConsigned: true,
    consignmentMethod: 'comision',
    publishedPrice: 12_000_000,
    commissionPercentage: 5,
    commissionFixed: 0,
    extras: extras(40_000, 0),
  });
  assertEq('branch', r.branch, 'no_vendido_consig_comision');
  assertEq(
    'margen esperado = pub * % - exp',
    r.netProfit,
    (12_000_000 * 5) / 100 - 40_000
  );
}

// =========================================================================
console.log('\n[Caso TradeCars] consignado vendido SIN close_deal, override = 0');
{
  // Antes daba: 35M - 50M - 100k = -15.1M (el bug del PRD)
  // Ahora con override = 0: 0 - 100k + 0 = -100k (solo extras dealership)
  const r = calculateVehicleNetProfit({
    isSold: true,
    isConsigned: true,
    salePrice: 35_000_000,
    agreedPrice: 50_000_000,
    consignmentGrossProfitOverride: 0,
    extras: extras(100_000, 0),
  });
  assertEq('branch', r.branch, 'vendido_consig_garantizado');
  assertEq('TradeCars deja de ver -15M', r.netProfit, -100_000);
}

// =========================================================================
console.log('\n[Edge case] sin precio venta y sin published → sin_datos');
{
  const r = calculateVehicleNetProfit({
    isSold: true,
    isConsigned: false,
    salePrice: 0,
    purchasePrice: 10_000_000,
    extras: [],
  });
  assertEq('branch sin_datos cuando sale=0', r.branch, 'sin_datos');
  assertEq('netProfit = 0', r.netProfit, 0);
}

// =========================================================================
console.log('\n[Validación] assumed_by=customer NUNCA afecta');
{
  const baseline = calculateVehicleNetProfit({
    isSold: true,
    isConsigned: false,
    salePrice: 10_000_000,
    purchasePrice: 7_000_000,
    extras: extras(100_000, 0),
  });
  const withCustomer = calculateVehicleNetProfit({
    isSold: true,
    isConsigned: false,
    salePrice: 10_000_000,
    purchasePrice: 7_000_000,
    extras: extras(100_000, 5_000_000), // 5M del cliente
  });
  assertEq(
    'mismo netProfit con o sin customer extras',
    baseline.netProfit,
    withCustomer.netProfit
  );
}

// =========================================================================
console.log('\n=========================================');
console.log(`Total: ${passed + failed}   ✓ ${passed}   ✗ ${failed}`);
console.log('=========================================');
if (failed > 0) process.exit(1);

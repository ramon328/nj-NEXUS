// Tests del cálculo de margen (réplica Power BI). Runner: node:test (built-in, sin deps).
//   node --test margen-bi.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeMargen, DIVIDE, buildMargenSQL, calcularMargen, margenNetoDesdeAliace, pctTexto } from './margen-bi.mjs'

// Compara floats con tolerancia (evita sorpresas de coma flotante en los %).
const cerca = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `esperaba ~${b}, recibí ${a}`)

test('caso del enunciado: signos y neteo de NC', () => {
  // facturas: total_neto=1000, costo_ventas=600
  // notas_credito: total_neto=-200 (NEGATIVO), costo_ventas=-120
  const r = computeMargen({ ventas: 1000, NC: -200, costo_ventas_fact: 600, costo_ventas_nc: -120 })
  assert.equal(r.ventas, 1000)
  assert.equal(r.NC, -200)
  assert.equal(r.ventas_netas, 800)              // 1000 + (-200)
  assert.equal(r.costo_ventas_total, 480)        // 600 + (-120)
  assert.equal(r.margen_bruto, 320)              // 800 - 480
  cerca(r.pct_margen, 0.40)                       // 320 / 800
  cerca(r.pct_costos, 0.60)                       // 480 / 800
  cerca(r.pct_nc, -0.20)                          // -200 / 1000 (sobre venta bruta)
})

test('margenNetoDesdeAliace: sin ventas_con_costo cae a facturas_amount (montos POSITIVOS)', () => {
  // Cómo llega la fila del hub: facturas y NC en positivo; el helper aplica los signos.
  //   facturas_amount=1000, nc_amount=200 (positivo), costo_ventas=600, costo_ventas_nc=120 (positivo)
  const r = margenNetoDesdeAliace({ facturas_amount: 1000, nc_amount: 200, costo_ventas: 600, costo_ventas_nc: 120 })
  assert.equal(r.ventas, 1000)
  assert.equal(r.NC, -200)                          // nc_amount negado
  assert.equal(r.ventas_netas, 800)
  assert.equal(r.costo_ventas_total, 480)           // 600 + (-120)
  assert.equal(r.margen_bruto, 320)
  cerca(r.pct_margen, 0.40)
})

test('margenNetoDesdeAliace: la BASE es ventas_con_costo (no infla con facturas sin costear)', () => {
  // ventas_con_costo=900 (< facturas_amount=1000: hay $100 de facturas SIN costear).
  // La base de ventas debe ser 900, NO 1000 (si no, el margen quedaría inflado).
  const r = margenNetoDesdeAliace({ ventas_con_costo: 900, facturas_amount: 1000, nc_amount: 200, costo_ventas: 600, costo_ventas_nc: 120 })
  assert.equal(r.ventas, 900)                        // usa ventas_con_costo, ignora facturas_amount
  assert.equal(r.ventas_netas, 700)                  // 900 − 200
  assert.equal(r.costo_ventas_total, 480)            // 600 − 120
  assert.equal(r.margen_bruto, 220)                  // 700 − 480
  cerca(r.pct_margen, 220 / 700)                     // ≈ 0.3143, sobre la base costeada neta
})

test('margenNetoDesdeAliace: sin devoluciones (nc_amount=0) = margen bruto normal', () => {
  const r = margenNetoDesdeAliace({ facturas_amount: 1000, nc_amount: 0, costo_ventas: 600, costo_ventas_nc: 0 })
  assert.equal(r.ventas_netas, 1000)
  assert.equal(r.costo_ventas_total, 600)
  assert.equal(r.margen_bruto, 400)
  cerca(r.pct_margen, 0.40)
})

test('margenNetoDesdeAliace: fila vacía/sin datos → todo 0 sin NaN', () => {
  const r = margenNetoDesdeAliace({})
  assert.equal(r.ventas_netas, 0)
  assert.equal(r.margen_bruto, 0)
  assert.equal(r.pct_margen, 0)
})

test('la NC se SUMA (negativo), no se resta dos veces', () => {
  // Si por error se restara el negativo, ventas_netas daría 1200 en vez de 800.
  const r = computeMargen({ ventas: 1000, NC: -200, costo_ventas_fact: 0, costo_ventas_nc: 0 })
  assert.equal(r.ventas_netas, 800)
})

test('DIVIDE protege contra división por cero (default 0)', () => {
  assert.equal(DIVIDE(10, 0), 0)
  assert.equal(DIVIDE(10, NaN), 0)
  assert.equal(DIVIDE(10, undefined), 0)
  assert.equal(DIVIDE(0, 0), 0)
  assert.equal(DIVIDE(10, 2), 5)
  assert.equal(DIVIDE(10, 0, null), null)   // alternativo configurable
})

test('sin ventas ni datos: todo 0, sin NaN', () => {
  const r = computeMargen({})
  for (const k of ['ventas', 'NC', 'ventas_netas', 'costo_ventas_total', 'margen_bruto', 'pct_margen', 'pct_costos', 'pct_nc']) {
    assert.equal(r[k], 0, `${k} debería ser 0`)
  }
})

test('ventas_netas = 0 → pct_margen y pct_costos = 0 (no dividen)', () => {
  // ventas 200, NC -200 → netas 0. pct_nc SÍ existe (denominador = ventas brutas = 200).
  const r = computeMargen({ ventas: 200, NC: -200, costo_ventas_fact: 100, costo_ventas_nc: -100 })
  assert.equal(r.ventas_netas, 0)
  assert.equal(r.pct_margen, 0)
  assert.equal(r.pct_costos, 0)
  cerca(r.pct_nc, -1)   // -200 / 200
})

test('el objeto devuelto tiene EXACTAMENTE las claves pedidas', () => {
  const claves = Object.keys(computeMargen({ ventas: 1 })).sort()
  assert.deepEqual(claves, ['NC', 'costo_ventas_total', 'margen_bruto', 'pct_costos', 'pct_margen', 'pct_nc', 'ventas', 'ventas_netas'])
})

test('buildMargenSQL aplica el MISMO WHERE a ambas tablas', () => {
  const sql = buildMargenSQL({ desde: '2026-01-01', hasta: '2026-06-30', vendedor_id: '42' })
  assert.ok(/FROM facturas\s+WHERE/i.test(sql), 'facturas debe llevar WHERE')
  assert.ok(/FROM notas_credito\s+WHERE/i.test(sql), 'notas_credito debe llevar WHERE')
  // ambas con las tres condiciones (fecha desde, fecha hasta, vendedor)
  assert.equal((sql.match(/fecha >= '2026-01-01'/g) || []).length, 2)
  assert.equal((sql.match(/fecha <= '2026-06-30'/g) || []).length, 2)
  assert.equal((sql.match(/vendedor_id = '42'/g) || []).length, 2)
})

test('buildMargenSQL escapa comillas (anti-inyección)', () => {
  const sql = buildMargenSQL({ cliente_id: "x' OR '1'='1" })
  assert.ok(sql.includes("cliente_id = 'x'' OR ''1''=''1'"), 'debe duplicar las comillas simples')
  assert.ok(!/OR '1'='1'\s*$/m.test(sql), 'no debe quedar la comilla sin escapar')
})

test('calcularMargen: usa runQuery inyectado y netea vía computeMargen', async () => {
  // runQuery falso: simula la fila que devolvería Postgres para el caso del enunciado.
  const fakeQuery = async (sql) => {
    assert.ok(sql.includes('CROSS JOIN'), 'debe ser la query neteada')
    return [{ ventas: 1000, nc: -200, costo_ventas_fact: 600, costo_ventas_nc: -120 }]
  }
  const r = await calcularMargen({ desde: '2026-06-01' }, fakeQuery)
  assert.equal(r.ventas_netas, 800)
  assert.equal(r.margen_bruto, 320)
  cerca(r.pct_margen, 0.40)
})

test('calcularMargen exige runQuery', async () => {
  await assert.rejects(() => calcularMargen({}), /runQuery/)
})

test('pctTexto formatea fracción → % es-CL', () => {
  assert.equal(pctTexto(0.40), '40,0%')
  assert.equal(pctTexto(-0.2, 0), '-20%')
})

// ── MARGEN BRUTO (réplica del modelo Power BI) ───────────────────────────────
// Reproduce AL PIE DE LA LETRA la cadena de cálculo del informe BI original
// (bi_transactions = facturas, bi_credit_notes = notas_credito). Claves:
//   • Las notas de crédito vienen en NEGATIVO en total_neto → se SUMAN (sumar un
//     negativo = restar la devolución). NO se usa valor absoluto ni se resta dos veces.
//   • Los porcentajes usan DIVIDE de DAX: división protegida que devuelve 0 si el
//     denominador es 0 (o NaN/undefined).
//   • pct_margen es una FRACCIÓN (0.40 = 40%); el formateo a % es de la capa de vista.
// La fórmula vive SOLO en computeMargen(): el SQL únicamente entrega las 4 sumas base.

// DIVIDE de DAX: numerador/denominador, o `alternativo` (def. 0) si el denominador
// es 0, NaN o ausente. Así todos los % quedan protegidos contra división por cero.
export function DIVIDE(numerador, denominador, alternativo = 0) {
  const d = Number(denominador)
  if (!Number.isFinite(d) || d === 0) return alternativo
  return Number(numerador) / d
}

// Núcleo determinista: recibe las 4 SUMAS base (ya calculadas sobre el subconjunto
// filtrado) y devuelve el objeto de margen completo. Único lugar donde vive la fórmula.
//   ventas             = SUM(facturas.total_neto)          (positivo)
//   NC                 = SUM(notas_credito.total_neto)     (NEGATIVO)
//   costo_ventas_fact  = SUM(facturas.costo_ventas)        (positivo)
//   costo_ventas_nc    = SUM(notas_credito.costo_ventas)   (negativo, netea el costo)
export function computeMargen({ ventas = 0, NC = 0, costo_ventas_fact = 0, costo_ventas_nc = 0 } = {}) {
  const v  = Number(ventas) || 0
  const nc = Number(NC) || 0                 // ya viene NEGATIVO: NO negar de nuevo
  const cf = Number(costo_ventas_fact) || 0
  const cn = Number(costo_ventas_nc) || 0

  // Ventas
  const ventas_netas = v + nc                // = facturas − devoluciones

  // Costos
  const costo_ventas_total = cf + cn

  // Margen
  const margen_bruto = ventas_netas - costo_ventas_total
  const pct_margen   = DIVIDE(margen_bruto, ventas_netas)   // fracción, default 0

  // Métricas relacionadas (mismo patrón DIVIDE)
  const pct_costos = DIVIDE(costo_ventas_total, ventas_netas)
  const pct_nc     = DIVIDE(nc, v)                          // sobre venta BRUTA, no neta

  return {
    ventas: v,
    NC: nc,
    ventas_netas,
    costo_ventas_total,
    margen_bruto,
    pct_margen,
    pct_costos,
    pct_nc,
  }
}

// Mapa físico tabla→columna. Por defecto usa los nombres del enunciado; ajústalo si
// tu esquema real difiere (p.ej. en Aliace las columnas se llaman distinto). Las
// columnas de filtro (fecha/vendedor/cliente/producto) deben existir en AMBAS tablas.
export const COLS_BI = {
  facturas:      { tabla: 'facturas',      neto: 'total_neto', costo: 'costo_ventas', fecha: 'fecha', vendedor: 'vendedor_id', cliente: 'cliente_id', producto: 'producto_id' },
  notas_credito: { tabla: 'notas_credito', neto: 'total_neto', costo: 'costo_ventas', fecha: 'fecha', vendedor: 'vendedor_id', cliente: 'cliente_id', producto: 'producto_id' },
}

// Escapa un valor para incrustarlo seguro como literal SQL (dobla comillas simples).
function sqlLiteral(v) {
  return `'${String(v).replace(/'/g, "''")}'`
}
function esFechaISO(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

// Construye el WHERE a partir de los filtros. Se aplica IGUAL a facturas y a notas
// de crédito (mismas condiciones sobre ambas tablas), como exige el modelo BI.
// filtros: { desde, hasta, vendedor_id, cliente_id, producto_id } (todos opcionales).
function buildWhere(filtros, cols) {
  const cond = []
  if (esFechaISO(filtros.desde)) cond.push(`${cols.fecha} >= ${sqlLiteral(filtros.desde)}`)
  if (esFechaISO(filtros.hasta)) cond.push(`${cols.fecha} <= ${sqlLiteral(filtros.hasta)}`)
  if (filtros.vendedor_id != null && filtros.vendedor_id !== '') cond.push(`${cols.vendedor} = ${sqlLiteral(filtros.vendedor_id)}`)
  if (filtros.cliente_id  != null && filtros.cliente_id  !== '') cond.push(`${cols.cliente} = ${sqlLiteral(filtros.cliente_id)}`)
  if (filtros.producto_id != null && filtros.producto_id !== '') cond.push(`${cols.producto} = ${sqlLiteral(filtros.producto_id)}`)
  return cond.length ? 'WHERE ' + cond.join(' AND ') : ''
}

// Genera la query que NETEA facturas + notas de crédito en UN solo resultado (dos CTEs
// + CROSS JOIN). Devuelve las 4 sumas base y, por comodidad/lectura, ya netea
// ventas_netas / costo_ventas_total / margen_bruto en SQL (mismo cálculo que computeMargen).
// El mismo WHERE se aplica a AMBAS tablas.
export function buildMargenSQL(filtros = {}, cfg = COLS_BI) {
  const f = cfg.facturas
  const n = cfg.notas_credito
  const whereF = buildWhere(filtros, f)
  const whereN = buildWhere(filtros, n)
  return `WITH f AS (
  SELECT COALESCE(SUM(${f.neto}), 0)  AS ventas,
         COALESCE(SUM(${f.costo}), 0) AS costo_ventas_fact
  FROM ${f.tabla}
  ${whereF}
),
nc AS (
  SELECT COALESCE(SUM(${n.neto}), 0)  AS nc,            -- ya viene NEGATIVO
         COALESCE(SUM(${n.costo}), 0) AS costo_ventas_nc
  FROM ${n.tabla}
  ${whereN}
)
SELECT
  f.ventas,
  nc.nc,
  f.ventas + nc.nc                                                 AS ventas_netas,
  f.costo_ventas_fact,
  nc.costo_ventas_nc,
  f.costo_ventas_fact + nc.costo_ventas_nc                         AS costo_ventas_total,
  (f.ventas + nc.nc) - (f.costo_ventas_fact + nc.costo_ventas_nc)  AS margen_bruto
FROM f CROSS JOIN nc`
}

// Servicio de alto nivel: arma la query, la corre con `runQuery(sql)` (inyectable —
// en el hub pásale aliaceQuery) y devuelve el objeto de margen canónico. La derivación
// final SIEMPRE pasa por computeMargen (una sola fuente de la verdad).
export async function calcularMargen(filtros = {}, runQuery, cfg = COLS_BI) {
  if (typeof runQuery !== 'function') throw new Error('calcularMargen necesita runQuery(sql) (ej. aliaceQuery)')
  const sql = buildMargenSQL(filtros, cfg)
  const filas = await runQuery(sql)
  const r = (Array.isArray(filas) ? filas[0] : filas) || {}
  return computeMargen({
    ventas: r.ventas,
    NC: r.nc,
    costo_ventas_fact: r.costo_ventas_fact,
    costo_ventas_nc: r.costo_ventas_nc,
  })
}

// Mapea una fila del agregado real de Aliace (la que arma aliaceFacturasRango en el hub)
// a las 4 sumas base y deriva el margen NETO con computeMargen (única fórmula). Deja
// documentada la convención de signos de Aliace, donde los montos vienen en POSITIVO:
//   ventas_con_costo → SUM(net de facturas COSTEADAS)        (base de ventas; ver abajo)
//   facturas_amount  → SUM(facturas.net_amount)              (fallback si no hay ventas_con_costo)
//   nc_amount        → SUM(ABS(net_amount de las NC))        (positivo → se NIEGA: resta la devolución)
//   costo_ventas     → SUM(WAC de ventas costeadas)          (positivo)
//   costo_ventas_nc  → SUM(WAC de devoluciones, mov. 'return')(positivo → se NIEGA: netea el costo)
//
// BASE DE VENTAS = ventas COSTEADAS (misma disciplina que la app): ingreso y costo se
// miden sobre el MISMO subconjunto (facturas con WAC). Si se usara el total de facturas
// contra un costo que solo cubre el 96% costeado, el margen quedaría INFLADO por las
// facturas sin costear (no es preciso). Sobre esa base costeada se netean las NC. Cae a
// facturas_amount solo si no viene ventas_con_costo (compat/tests del enunciado puro).
export function margenNetoDesdeAliace(row = {}) {
  const ventas = row.ventas_con_costo != null ? Number(row.ventas_con_costo) : Number(row.facturas_amount)
  return computeMargen({
    ventas: Number(ventas) || 0,
    NC: -(Number(row.nc_amount) || 0),
    costo_ventas_fact: Number(row.costo_ventas) || 0,
    costo_ventas_nc: -(Number(row.costo_ventas_nc) || 0),
  })
}

// Helper de capa de vista: fracción → texto de %. 0.40 → "40,0%" (coma decimal, es-CL).
export function pctTexto(fraccion, decimales = 1) {
  const n = (Number(fraccion) || 0) * 100
  return n.toFixed(decimales).replace('.', ',') + '%'
}

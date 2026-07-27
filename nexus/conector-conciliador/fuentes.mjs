// fuentes.mjs — de dónde saca los datos el conciliador.
//
// ⚠️ SOLO LECTURA DE DISCO. Este módulo NO llama a la tek-api ni al SII: lee los
// archivos que esos sistemas ya dejaron cacheados. Motivo: pedirle /movimientos a
// la tek-api dispara `asegurarFresco()`, que relanza el login al banco si la data
// venció — y conciliar no es razón para gastar un login. El SII es aún más
// delicado (bloquea por logins repetidos).
//
// Banco   → conector-tek/data/cartola-anual.json   (acumulador que no pierde lo viejo)
// SII RCV → sii-web/data/empresas/<id>/<compra|venta>/<periodo>/detalle.csv

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const NEXUS = join(DIR, '..')
const CARTOLA = join(NEXUS, 'conector-tek', 'data', 'cartola-anual.json')
const RCV_BASE = join(NEXUS, 'sii-web', 'data', 'empresas')

// ── RUT ───────────────────────────────────────────────────────────────────────
// Deja el RUT en forma canónica comparable: sin puntos, guiones ni ceros a la
// izquierda. "0763075532" → "763075532" ; "76.307.553-2" → "763075532".
export function normRut(s) {
  const t = String(s || '').replace(/[.\-\s]/g, '').toUpperCase()
  return t.replace(/^0+/, '')
}

// Dígito verificador (módulo 11). Sirve para descartar números que NO son RUT:
// en la glosa del banco conviven RUTs con folios, códigos de sucursal y montos.
export function dvValido(rutNorm) {
  const m = /^(\d+)([\dK])$/.exec(rutNorm)
  if (!m) return false
  const cuerpo = m[1]
  if (cuerpo.length < 7 || cuerpo.length > 8) return false
  let suma = 0
  let mul = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mul
    mul = mul === 7 ? 2 : mul + 1
  }
  const resto = 11 - (suma % 11)
  const dv = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)
  return dv === m[2]
}

// RUTs que aparecen en la glosa del banco. El Santander la escribe con el RUT
// del contraparte al inicio, cero-rellenado a 10 ("0763075532") o con formato
// ("78.302.808-5"). Se validan por DV para no confundirlos con folios.
export function rutsEnTexto(texto) {
  const t = String(texto || '')
  const out = new Set()
  for (const m of t.matchAll(/\d{1,2}\.\d{3}\.\d{3}-[\dkK]/g)) {
    const r = normRut(m[0])
    if (dvValido(r)) out.add(r)
  }
  for (const m of t.matchAll(/\b\d{8,10}[\dkK]?\b/g)) {
    const r = normRut(m[0])
    if (dvValido(r)) out.add(r)
  }
  return [...out]
}

// ── Razón social en la glosa ──────────────────────────────────────────────────
// Segundo ancla, cuando el banco no escribe el RUT: "Compra Nacional NP COPEC
// APP EMPRE" no trae RUT pero sí el nombre. Se comparan solo palabras
// distintivas — "SPA", "COMERCIAL" o "CHILE" calzarían con media plaza.
const GENERICAS = new Set([
  'SPA', 'LTDA', 'LIMITADA', 'SA', 'EIRL', 'SOCIEDAD', 'COMERCIAL', 'COMERCIALIZADORA',
  'INVERSIONES', 'SERVICIOS', 'ASESORIAS', 'CHILE', 'CHILENA', 'EMPRESA', 'EMPRESAS',
  'DISTRIBUIDORA', 'IMPORTADORA', 'EXPORTADORA', 'INDUSTRIAL', 'NACIONAL', 'REPUESTOS',
  'TRANSPORTES', 'TRANSPORTE', 'AUTOMOTRIZ', 'CONSULTORA', 'INGENIERIA', 'PRODUCTOS',
  'GENERALES', 'INTEGRALES', 'REPRESENTACIONES', 'DEL', 'LOS', 'LAS', 'CIA', 'BANCO',
])

const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

export function tokensNombre(razon) {
  return sinTildes(razon).split(/[^A-Z0-9]+/).filter((t) => t.length >= 4 && !GENERICAS.has(t))
}

/**
 * Palabra distintiva de la razón social que aparece en la glosa del banco.
 * Se exige palabra completa: por substring, el "INTER" de "Porsche Inter Auto"
 * calzaba con "Traspaso Internet a T. Crédito".
 */
export function nombreEnGlosa(razon, glosa) {
  const g = sinTildes(glosa)
  return tokensNombre(razon).find((t) => new RegExp(`(^|[^A-Z0-9])${t}([^A-Z0-9]|$)`).test(g)) || null
}

// ── Banco ─────────────────────────────────────────────────────────────────────
/**
 * Movimientos del banco desde el acumulador anual de tek.
 * signo: 'egreso' (cargo, paga una compra) | 'ingreso' (abono, cobra una venta).
 */
export function movimientosBanco({ desde, hasta } = {}) {
  if (!existsSync(CARTOLA)) {
    return { error: `No encuentro la cartola del banco en ${CARTOLA}. ¿Corrió alguna vez la captura de tek?`, movimientos: [] }
  }
  const d = JSON.parse(readFileSync(CARTOLA, 'utf8'))
  let movs = (d.movimientos || []).map((m, i) => {
    const cargo = Number(m.cargo || 0)
    const abono = Number(m.abono || 0)
    return {
      id: `bco-${i}`,
      fecha: String(m.fecha || '').slice(0, 10),
      descripcion: m.descripcion || '',
      documento: m.documento || '',
      cuenta: m.cuenta || '',
      monto: cargo || abono,
      signo: cargo ? 'egreso' : 'ingreso',
      ruts: rutsEnTexto(m.descripcion),
    }
  }).filter((m) => m.fecha && m.monto > 0)

  if (desde) movs = movs.filter((m) => m.fecha >= desde)
  if (hasta) movs = movs.filter((m) => m.fecha <= hasta)
  movs.sort((a, b) => a.fecha.localeCompare(b.fecha) || b.monto - a.monto)

  return { movimientos: movs, cobertura: d.cobertura, actualizado: d.actualizado, empresa: d.empresa }
}

// Muchos movimientos NO tienen ni deben tener factura: traspasos entre cuentas
// propias, cuotas de crédito, impuestos, sueldos. Etiquetarlos evita que el
// informe muestre 40 "descuadres" cuando en realidad hay 5 que revisar.
const CATEGORIAS = [
  ['traspaso interno', /traspaso|cuenta corri|\bBK\b|ANA CLARA/i],
  ['crédito / financiero', /cuota cr[eé]dito|t\.? cr[eé]dito|tarjeta|l[ií]nea de cr[eé]dito|inter[eé]s|comisi[oó]n|dividendo|leasing|seguro de/i],
  ['impuestos', /\bSII\b|tesorer[ií]a|\bPPM\b|\bIVA\b|impuesto|contribucion/i],
  ['remuneraciones', /remuneraci|sueldo|previred|\bAFP\b|isapre|honorario|finiquito/i],
]

/** Etiqueta el motivo probable por el que un movimiento no tiene factura. */
export function categoriaMovimiento(mov) {
  for (const [nombre, re] of CATEGORIAS) if (re.test(mov.descripcion)) return nombre
  return mov.signo === 'ingreso' ? 'cobro a cliente' : 'por revisar'
}

/**
 * Días que el banco realmente tiene cubiertos, mes a mes. La captura de tek baja
 * UNA página por mes (~60 filas), así que un mes puede venir cortado al día 7 y
 * parecer que "no hay movimientos" el resto. Conciliar fuera de estos días da
 * falsos "sin pago", por eso el motor lo advierte.
 */
export function coberturaReal(movs) {
  const porMes = new Map()
  for (const m of movs) {
    const mes = m.fecha.slice(0, 7)
    const r = porMes.get(mes) || { mes, n: 0, min: m.fecha, max: m.fecha }
    r.n++
    if (m.fecha < r.min) r.min = m.fecha
    if (m.fecha > r.max) r.max = m.fecha
    porMes.set(mes, r)
  }
  return [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes))
}

// ── SII / RCV ─────────────────────────────────────────────────────────────────
function parseCsv(txt) {
  const lineas = txt.split(/\r?\n/).filter((l) => l.trim())
  if (!lineas.length) return []
  const cab = lineas[0].replace(/^\uFEFF/, '').split(';').map((c) => c.trim())
  return lineas.slice(1).map((l) => {
    const cel = l.split(';')
    const o = {}
    cab.forEach((c, i) => { o[c] = (cel[i] ?? '').trim() })
    return o
  })
}

// El SII cambia los nombres de columna entre COMPRA y VENTA ("RUT Proveedor" vs
// "Rut cliente"), y a veces entre versiones. Se busca por aproximación.
function col(fila, ...alternativas) {
  const claves = Object.keys(fila)
  for (const alt of alternativas) {
    const k = claves.find((c) => c.toLowerCase().replace(/[^a-z]/g, '') === alt.toLowerCase().replace(/[^a-z]/g, ''))
    if (k) return fila[k]
  }
  for (const alt of alternativas) {
    const k = claves.find((c) => c.toLowerCase().includes(alt.toLowerCase()))
    if (k) return fila[k]
  }
  return ''
}

const aIso = (f) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(f || '').trim())
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ''
}

/**
 * Facturas del RCV ya descargadas por sii-web.
 * operacion: 'compra' (se pagan → egresos) | 'venta' (se cobran → ingresos).
 */
export function facturasSii({ empresaId = 3, operacion = 'compra', desde, hasta } = {}) {
  const base = join(RCV_BASE, String(empresaId), operacion)
  if (!existsSync(base)) {
    return { error: `No hay datos de ${operacion.toUpperCase()} descargados (falta ${base}). Hay que bajarlos del SII primero.`, facturas: [], periodos: [] }
  }
  const periodos = readdirSync(base).filter((p) => /^\d{6}$/.test(p)).sort()
  const facturas = []
  for (const per of periodos) {
    const f = join(base, per, 'detalle.csv')
    if (!existsSync(f)) continue
    for (const r of parseCsv(readFileSync(f, 'utf8'))) {
      const total = Number(String(col(r, 'Monto Total')).replace(/[^\d-]/g, '')) || 0
      if (!total) continue
      const rut = normRut(col(r, 'RUT Proveedor', 'Rut cliente', 'RUT Cliente', 'Rut Proveedor'))
      facturas.push({
        id: `${operacion}-${per}-${col(r, 'Nro') || facturas.length}`,
        operacion,
        periodo: per,
        rut,
        razon: col(r, 'Razon Social', 'Razón Social'),
        folio: col(r, 'Folio'),
        fecha: aIso(col(r, 'Fecha Docto', 'Fecha Emision')),
        fechaRecepcion: aIso(col(r, 'Fecha Recepcion')),
        monto: total,
      })
    }
  }
  let out = facturas.filter((f) => f.fecha)
  if (desde) out = out.filter((f) => f.fecha >= desde)
  if (hasta) out = out.filter((f) => f.fecha <= hasta)
  out.sort((a, b) => a.fecha.localeCompare(b.fecha) || b.monto - a.monto)
  return { facturas: out, periodos }
}

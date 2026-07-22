// almacen.mjs — ACUMULADOR ANUAL de cartola (SOLO LECTURA del banco).
// Problema que resuelve: cada captura del banco entrega como máximo ~90 días online,
// y el flujo viejo SOBRESCRIBÍA movimientos.json en cada corrida → se perdía lo ya
// capturado (p.ej. los 50 movimientos de una corrida se borraban en la siguiente).
//
// Este módulo FUSIONA (append + dedup) cada captura dentro de un store anual
// `data/cartola-anual.json` que arranca en el 1° de enero del año en curso y NUNCA
// pierde lo viejo. Así, corrida tras corrida (cada una trae su ventana de 90 días),
// el dataset crece hacia el año completo. Además guarda los últimos ~50 movimientos
// CRUDOS (todos los campos originales) en `data/ultimos-movimientos.json`.
//
// No abre navegador, no toca el banco: solo lee/escribe JSON local. Lo llaman los
// capturadores (login-humano.mjs, capturar-movimientos.mjs) tras extraer la data.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = '/Users/AIagenteia/nexus/conector-tek'
const DATA = join(DIR, 'data')
const ANUAL = join(DATA, 'cartola-anual.json')
const ULTIMOS = join(DATA, 'ultimos-movimientos.json')

const leer = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return null } }
const esFechaISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))

// año que cubre el store: por defecto el año en curso (o TEK_ANIO)
export function anioActual() {
  const forz = Number(process.env.TEK_ANIO)
  if (forz && forz > 2000) return forz
  return new Date().getFullYear()
}
export function inicioAnio(anio = anioActual()) { return `${anio}-01-01` }

// clave estable de un movimiento normalizado (para dedup entre capturas repetidas).
// NO usa nroMov: la cartola histórica no lo trae, y el saldo (balance corrido, único por
// movimiento) + fecha + monto neto + glosa identifican el mismo movimiento venga de la
// captura online (con nroMov) o de la cartola histórica (sin nroMov) → cero duplicados.
function claveMov(m) {
  const monto = Math.round(Number(m.abono || 0) - Number(m.cargo || 0))
  return [m.fecha || '', m.saldo ?? '', monto, String(m.descripcion || '').slice(0, 40)].join('|')
}

// Fusiona movimientos NORMALIZADOS nuevos dentro del store anual. Devuelve stats.
// `nuevos` = [{fecha, descripcion, cargo, abono, saldo, documento, sucursal, nroMov, cuenta}]
export function fusionar(nuevos, meta = {}) {
  mkdirSync(DATA, { recursive: true })
  const anio = meta.anio || anioActual()
  const piso = inicioAnio(anio)
  const prev = leer(ANUAL)
  const mapa = new Map()
  // 1) conservar lo ya acumulado (solo del año en curso)
  for (const m of (prev?.movimientos || [])) {
    if (esFechaISO(m.fecha) && m.fecha >= piso) mapa.set(claveMov(m), m)
  }
  const antes = mapa.size
  // 2) sumar los nuevos (dedup por clave; el nuevo pisa al viejo idéntico)
  let agregadosCrudos = 0
  for (const m of (nuevos || [])) {
    if (!esFechaISO(m.fecha) || m.fecha < piso) continue
    agregadosCrudos++
    mapa.set(claveMov(m), m)
  }
  const movimientos = [...mapa.values()].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
  const nuevosNetos = mapa.size - antes
  const fechas = movimientos.map((m) => m.fecha).filter(esFechaISO)
  const out = {
    actualizado: new Date().toISOString(),
    empresa: meta.empresa || prev?.empresa || 'ANA CLARA SPA',
    anio,
    desde: piso,
    hasta: meta.hasta || (fechas[0] || new Date().toISOString().slice(0, 10)),
    total: movimientos.length,
    cobertura: {
      min_fecha: fechas.length ? fechas[fechas.length - 1] : null,
      max_fecha: fechas.length ? fechas[0] : null,
      ultima_captura: new Date().toISOString(),
      ventana_capturada: meta.desde ? { desde: meta.desde, hasta: meta.hasta } : (prev?.cobertura?.ventana_capturada || null),
      capturas: (prev?.cobertura?.capturas || 0) + 1,
    },
    movimientos,
  }
  writeFileSync(ANUAL, JSON.stringify(out, null, 2))
  return { total: out.total, antes, nuevos: nuevosNetos, vistos: agregadosCrudos, min: out.cobertura.min_fecha, max: out.cobertura.max_fecha }
}

// Guarda los últimos N movimientos CRUDOS (todos los campos originales del banco)
// para "el mismo endpoint guarda los 50 últimos + más información".
export function guardarUltimos(filasCrudas, meta = {}, n = 50) {
  mkdirSync(DATA, { recursive: true })
  // dedup crudo por (NroMovimiento|Fecha|NuevoSaldo) y ordenar por fecha desc
  const fechaDe = (r) => {
    const t = String(r.FechaContableMovimiento || r.FechaContable || r.Fecha || '')
    let m = t.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`
    m = t.match(/(\d{2})[/-](\d{2})[/-](\d{4})/); if (m) return `${m[3]}-${m[2]}-${m[1]}`
    return ''
  }
  const vistos = new Set(); const filas = []
  for (const r of (filasCrudas || [])) {
    const k = [r.NroMovimiento || '', fechaDe(r), r.NuevoSaldo ?? '', r.Monto ?? r.Importe ?? ''].join('|')
    if (vistos.has(k)) continue
    vistos.add(k)
    filas.push({ ...r, _fecha: fechaDe(r) })
  }
  filas.sort((a, b) => (b._fecha || '').localeCompare(a._fecha || ''))
  const recorte = filas.slice(0, n)
  const out = {
    actualizado: new Date().toISOString(),
    empresa: meta.empresa || 'ANA CLARA SPA',
    fuente: 'eob.officebanking.cl/CTA.UI.Services/api/SaldoCuentaCorriente/ObtenerMovimientos',
    n: recorte.length,
    movimientos: recorte,
  }
  writeFileSync(ULTIMOS, JSON.stringify(out, null, 2))
  return { guardados: recorte.length }
}

export function leerAnual() { return leer(ANUAL) }
export function leerUltimos() { return leer(ULTIMOS) }

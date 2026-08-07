// libro.mjs — LIBRO DE CONCILIACIÓN persistente.
//
// La idea: el banco solo entrega con comodidad su ventana reciente (~50
// movimientos). En vez de pelear con el histórico, cada mañana se guarda esa
// tanda; lo que ya estaba no se vuelve a contar y lo nuevo se acumula. Corrida
// tras corrida el libro converge al año completo.
//
// Lo mismo con las facturas: las que llegan nuevas entran al pozo y se cruzan
// contra los movimientos que todavía no tienen factura — y al revés. Una factura
// de enero puede calzar con un pago que recién aparece en agosto, así que nada
// se descarta: lo no calzado queda esperando.
//
// Un calce, una vez hecho, NO se recalcula. Eso hace la corrida diaria barata y
// estable (el informe de ayer no cambia solo). Para recomputar todo desde cero
// está `sincronizar.mjs --rehacer`.
//
// Solo lee y escribe JSON local. No toca el banco ni el SII.

import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
const LIBRO = join(DATA, 'libro.json')

const vacio = () => ({
  version: 1,
  creado: new Date().toISOString(),
  actualizado: null,
  movimientos: {},   // id → movimiento + _visto
  facturas: {},      // id → factura + _visto
  calces: [],        // { movimiento_id, factura_ids, confianza, tipo, motivos, diferencia, conciliado_en }
  corridas: [],      // bitácora: qué trajo cada mañana
})

export function leer() {
  if (!existsSync(LIBRO)) return vacio()
  try {
    const l = JSON.parse(readFileSync(LIBRO, 'utf8'))
    return { ...vacio(), ...l }
  } catch (e) {
    throw new Error(`El libro está corrupto (${LIBRO}): ${e.message}. Muévelo a un lado y vuelve a correr con --rehacer.`)
  }
}

// Escritura atómica: si el proceso muere a mitad, el libro anterior queda intacto.
export function grabar(libro) {
  mkdirSync(DATA, { recursive: true })
  libro.actualizado = new Date().toISOString()
  const tmp = LIBRO + '.tmp'
  writeFileSync(tmp, JSON.stringify(libro, null, 2))
  renameSync(tmp, LIBRO)
  return LIBRO
}

/**
 * Incorpora lo que trajo la captura de hoy. Devuelve SOLO lo que no estaba.
 * Idempotente: correrlo dos veces con la misma tanda no agrega nada la segunda.
 */
export function incorporar(libro, { movimientos = [], facturas = [] } = {}) {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const movsNuevos = []
  const facsNuevas = []

  for (const m of movimientos) {
    if (libro.movimientos[m.id]) continue
    libro.movimientos[m.id] = { ...m, _visto: hoy }
    movsNuevos.push(m)
  }
  for (const f of facturas) {
    if (libro.facturas[f.id]) continue
    libro.facturas[f.id] = { ...f, _visto: hoy }
    facsNuevas.push(f)
  }
  return { movsNuevos, facsNuevas }
}

// ── Qué sigue suelto ──────────────────────────────────────────────────────────
export function idsCalzados(libro) {
  const movs = new Set()
  const facs = new Set()
  for (const c of libro.calces) {
    movs.add(c.movimiento_id)
    for (const f of c.factura_ids) facs.add(f)
  }
  return { movs, facs }
}

/** Movimientos y facturas que todavía no tienen contraparte. */
export function pendientes(libro) {
  const { movs, facs } = idsCalzados(libro)
  return {
    movimientos: Object.values(libro.movimientos).filter((m) => !movs.has(m.id)),
    facturas: Object.values(libro.facturas).filter((f) => !facs.has(f.id)),
  }
}

/** Anota calces nuevos. Ignora los que pisarían algo ya calzado (defensa). */
export function anotarCalces(libro, calces) {
  const { movs, facs } = idsCalzados(libro)
  const ahora = new Date().toISOString()
  let n = 0
  for (const c of calces) {
    const movId = c.movimiento.id
    const facIds = c.facturas.map((f) => f.id)
    if (movs.has(movId) || facIds.some((f) => facs.has(f))) continue
    libro.calces.push({
      movimiento_id: movId,
      factura_ids: facIds,
      confianza: c.confianza,
      tipo: c.tipo,
      motivos: c.motivos,
      diferencia: c.diferencia,
      conciliado_en: ahora,
    })
    movs.add(movId)
    facIds.forEach((f) => facs.add(f))
    n++
  }
  return n
}

export function anotarCorrida(libro, stats) {
  libro.corridas.push({ cuando: new Date().toISOString(), ...stats })
  // La bitácora es para mirar tendencias, no un archivo histórico: 200 basta.
  if (libro.corridas.length > 200) libro.corridas = libro.corridas.slice(-200)
}

export function estado(libro) {
  const p = pendientes(libro)
  const conf = { alta: 0, media: 0, baja: 0 }
  for (const c of libro.calces) conf[c.confianza] = (conf[c.confianza] || 0) + 1
  const fechas = Object.values(libro.movimientos).map((m) => m.fecha).filter(Boolean).sort()
  return {
    movimientos: Object.keys(libro.movimientos).length,
    facturas: Object.keys(libro.facturas).length,
    calces: libro.calces.length,
    confianza: conf,
    movimientos_pendientes: p.movimientos.length,
    facturas_pendientes: p.facturas.length,
    cubre: fechas.length ? { desde: fechas[0], hasta: fechas[fechas.length - 1] } : null,
    corridas: libro.corridas.length,
  }
}

export const RUTA = LIBRO

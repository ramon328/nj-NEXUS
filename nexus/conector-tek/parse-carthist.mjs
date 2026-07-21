// parse-carthist.mjs — Toma la tabla CRUDA de la Cartola Histórica (data/carthist-crudo.json,
// filas = arrays de celdas por mes) y la convierte en MOVIMIENTOS, los FUSIONA al acumulador
// data/cartola-anual.json (dedupe) y re-exporta al segundo cerebro. Idempotente.
//
// Mapeo de columnas FLEXIBLE: detecta la fila de encabezado por palabras clave (Fecha, Cargo,
// Abono, Saldo, Descripción/Glosa, Documento, Sucursal). Si no hay header claro, usa posición
// típica de Santander (Fecha, Sucursal, N°Doc, Descripción, Cargo, Abono, Saldo).
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
const CUENTA_ANACLARA = '0000802809390'.replace(/^0+/, '') // referencia; el nº real viene del banco

const leer = (f) => { try { return JSON.parse(readFileSync(join(DATA, f), 'utf8')) } catch { return null } }
const num = (s) => { const n = Number(String(s || '').replace(/[^\d-]/g, '')); return Number.isFinite(n) ? n : 0 }
// "21/07/2026" o "21-07-2026" → "2026-07-21"; ya-ISO pasa igual
function fechaISO(s) {
  const t = String(s || '').trim()
  let m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) { const [_, d, mo, y] = m; const yy = y.length === 2 ? '20' + y : y; return `${yy}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}` }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0]
  return ''
}

const HKEYS = { fecha: /fecha/i, sucursal: /sucursal/i, documento: /doc/i, descripcion: /descrip|glosa|detalle/i, cargo: /cargo|d[eé]bito|giro/i, abono: /abono|cr[eé]dito|dep[oó]sito/i, saldo: /saldo/i }
function mapearColumnas(filas) {
  // busca la fila-header (la que más keys matchea)
  let headerIdx = -1, headerMap = null, best = 0
  filas.forEach((row, i) => {
    if (i > 6) return
    const map = {}; let hits = 0
    row.forEach((cell, j) => { for (const [k, re] of Object.entries(HKEYS)) if (re.test(cell) && map[k] == null) { map[k] = j; hits++ } })
    if (hits > best) { best = hits; headerIdx = i; headerMap = map }
  })
  return { headerIdx: best >= 3 ? headerIdx : -1, headerMap: best >= 3 ? headerMap : null }
}

function filasAMovs(filas, { anio, mes }) {
  if (!filas || !filas.length) return []
  const { headerIdx, headerMap } = mapearColumnas(filas)
  const movs = []
  const start = headerIdx >= 0 ? headerIdx + 1 : 0
  for (let i = start; i < filas.length; i++) {
    const row = filas[i]
    if (!row || row.length < 3) continue
    let fecha, descripcion, cargo, abono, saldo, sucursal = '', documento = ''
    if (headerMap) {
      fecha = fechaISO(row[headerMap.fecha])
      descripcion = (row[headerMap.descripcion] || '').trim()
      cargo = num(row[headerMap.cargo]); abono = num(row[headerMap.abono]); saldo = num(row[headerMap.saldo])
      sucursal = (row[headerMap.sucursal] || '').trim(); documento = (row[headerMap.documento] || '').trim()
    } else {
      // posicional típico: [Fecha, Sucursal, N°Doc, Descripción, Cargo, Abono, Saldo]
      fecha = fechaISO(row[0]); sucursal = (row[1] || '').trim(); documento = (row[2] || '').trim()
      descripcion = (row[3] || '').trim(); cargo = num(row[row.length - 3]); abono = num(row[row.length - 2]); saldo = num(row[row.length - 1])
    }
    if (!fecha && !descripcion) continue
    // solo el mes/año pedido (por si el banco mete filas de otros períodos)
    if (fecha && anio && String(fecha).slice(0, 4) !== String(anio)) continue
    if (fecha && mes && Number(String(fecha).slice(5, 7)) !== Number(mes)) continue
    if (!fecha && !cargo && !abono) continue
    movs.push({ fecha, descripcion, cargo, abono, saldo, documento, sucursal, cuenta: CUENTA_ANACLARA, fuente: 'cartola_historica' })
  }
  return movs
}

const claveMov = (m) => `${m.fecha}|${(m.descripcion || '').slice(0, 24)}|${m.cargo}|${m.abono}|${m.saldo}`

export function parseYFusionar() {
  const crudo = leer('carthist-crudo.json')
  if (!crudo?.capturas?.length) throw new Error('No hay carthist-crudo.json (corré la descarga primero).')
  const nuevos = []
  for (const cap of crudo.capturas) nuevos.push(...filasAMovs(cap.filas, { anio: cap.anio, mes: cap.mes }))
  // fusionar con el acumulador anual (dedupe)
  const anual = leer('cartola-anual.json') || { movimientos: [] }
  const vistos = new Set((anual.movimientos || []).map(claveMov))
  let agregados = 0
  for (const m of nuevos) { const k = claveMov(m); if (!vistos.has(k)) { anual.movimientos.push(m); vistos.add(k); agregados++ } }
  // recomputar cobertura
  const fechas = anual.movimientos.map((m) => m.fecha).filter(Boolean).sort()
  anual.cobertura = { ...(anual.cobertura || {}), min_fecha: fechas[0] || null, max_fecha: fechas[fechas.length - 1] || null, historica_fusionada: crudo.meses }
  anual.desde = fechas[0] || anual.desde
  writeFileSync(join(DATA, 'cartola-anual.json'), JSON.stringify(anual, null, 2))
  // re-exportar al cerebro
  let expOk = false
  try { const r = spawnSync(process.execPath, [join(DIR, 'cerebro-cartolas.mjs')], { cwd: DIR, encoding: 'utf8' }); expOk = r.status === 0 } catch {}
  return { nuevos: nuevos.length, agregados, total: anual.movimientos.length, rango: `${anual.cobertura.min_fecha}→${anual.cobertura.max_fecha}`, cerebro_ok: expOk }
}

if (process.argv[1] && process.argv[1].endsWith('parse-carthist.mjs')) {
  try { const r = parseYFusionar(); console.log('RESULTADO:', JSON.stringify(r)) }
  catch (e) { console.error('ERROR:', e.message); process.exit(1) }
}

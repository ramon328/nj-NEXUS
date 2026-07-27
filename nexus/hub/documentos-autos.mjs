// documentos-autos.mjs — Recordatorio de DOCUMENTOS por vencer de los autos de MallorcAutos.
// Vigila 3 documentos por auto: Revisión Técnica, Permiso de Circulación y SOAP, calcula
// cuántos días le quedan a cada uno y le avisa a JOAQUÍN por WhatsApp (plantilla oficial
// `alerta_nexus`, para poder escribirle aunque esté fuera de la ventana de 24h — igual que
// [[nexus-alertas-fuera-24h]]).
//
// De dónde salen las fechas:
//   • Revisión Técnica → columna "RT" de la hoja STOCK VALORIZADO del Excel global de
//     Mallorca (ya la trae el conector-mallorca). Se puede sobrescribir en el registro.
//   • Permiso de Circulación y SOAP → NO están en ningún Excel: se guardan a mano en el
//     registro local `documentos-autos.json` (por patente). Hasta que se carguen, esos
//     dos documentos no generan aviso (no inventamos fechas).
//
// Uso (CLI):
//   node documentos-autos.mjs revisar [--dias 30]        → muestra el estado (no envía)
//   node documentos-autos.mjs avisar  [--dias 30] [--dry] [--force]
//        → le manda a Joaquín los documentos que vencen dentro de `dias` (+ los ya vencidos).
//          Respeta un gate de 7 días (no lo spamea); --force lo ignora; --dry no envía.
//   node documentos-autos.mjs registrar --patente GYRG43 --tipo soap --fecha 2026-08-31
//        → carga/actualiza una fecha en el registro (tipo: revision_tecnica|permiso_circulacion|soap).
//
// También se importa desde el hub (asistente.mjs, tool `documentos_autos`):
//   import { estadoDocumentos, registrarDocumento, avisarJoaquin } from './documentos-autos.mjs'
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const ejecArchivo = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* opcional */ }

const RAIZ = join(__dirname, '..')
const REGISTRO = join(RAIZ, 'documentos-autos.json')
const TRACK = join(RAIZ, 'documentos-autos-track.json')
const LOGDIR = join(RAIZ, 'logs')
const LOG = join(LOGDIR, 'documentos-autos.log')
const PY = join(RAIZ, 'conector-mallorca', '.venv', 'bin', 'python')
const SCRIPT_MALLORCA = join(RAIZ, 'conector-mallorca', 'mallorca.py')

// Joaquín es el destinatario de estos recordatorios (usuario de MallorcAutos).
const JOAQUIN = process.env.DOCS_AUTOS_DESTINO || '+56958589915'
const CADA_DIAS = 7          // no reenviar el digest más seguido que esto (gate)
const VENTANA_DEFECTO = 30   // "por vencer" = vence dentro de estos días

// Los 3 documentos que vigilamos, con su etiqueta y de dónde sale la fecha.
export const TIPOS = {
  revision_tecnica: { label: 'Revisión técnica', fuente: 'excel' },
  permiso_circulacion: { label: 'Permiso de circulación', fuente: 'registro' },
  soap: { label: 'SOAP', fuente: 'registro' },
}
// Alias para que el modelo/CLI pueda nombrarlos de varias formas.
const ALIAS_TIPO = {
  rt: 'revision_tecnica', revision: 'revision_tecnica', revision_tecnica: 'revision_tecnica',
  'revisión_técnica': 'revision_tecnica', tecnica: 'revision_tecnica',
  permiso: 'permiso_circulacion', permiso_circulacion: 'permiso_circulacion',
  circulacion: 'permiso_circulacion', 'permiso_de_circulacion': 'permiso_circulacion',
  soap: 'soap',
}

function log(msg) {
  const ts = new Date().toISOString()
  try { mkdirSync(LOGDIR, { recursive: true }) } catch { /* */ }
  try { appendFileSync(LOG, `${ts}  ${msg}\n`) } catch { /* */ }
  console.log(msg)
}

const normPat = (p) => String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const patenteValida = (p) => /^[A-Z0-9]{5,7}$/.test(normPat(p))

export function normalizarTipo(t) {
  const k = String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_')
  return ALIAS_TIPO[k] || (TIPOS[k] ? k : null)
}

// Fecha a medianoche UTC (para restar días sin líos de zona horaria).
function fechaUTC(str) {
  const m = String(str || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}
function hoyUTC() {
  const n = new Date()
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()))
}
function diasHasta(str) {
  const f = fechaUTC(str)
  if (!f) return null
  return Math.round((f.getTime() - hoyUTC().getTime()) / 86400000)
}
function fechaLegible(str) {
  const m = String(str || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(str || '')
}

// --- Registro local (SOAP / permiso / override de RT por patente) ---
export function leerRegistro() {
  try { return JSON.parse(readFileSync(REGISTRO, 'utf8')) || {} } catch { return {} }
}
function guardarRegistro(reg) {
  writeFileSync(REGISTRO, JSON.stringify(reg, null, 2))
}

// --- Stock del Excel de Mallorca (patente, marca, modelo, RT) ---
async function leerStockMallorca() {
  const { stdout } = await ejecArchivo(PY, [SCRIPT_MALLORCA, 'hoja', '--nombre', 'STOCK VALORIZADO', '--limite', '200'],
    { timeout: 60000, maxBuffer: 16 * 1024 * 1024 })
  const data = JSON.parse(stdout)
  if (data.error) throw new Error('No pude leer el Excel de Mallorca: ' + data.error)
  const autos = []
  for (const f of (data.filas || [])) {
    const pat = f.PATENTE
    if (!patenteValida(pat)) continue
    autos.push({
      patente: normPat(pat),
      marca: (f.MARCA || '').toString().trim(),
      modelo: (f.MODELO || '').toString().trim(),
      rt_excel: /^\d{4}-\d{2}-\d{2}/.test(String(f.RT || '')) ? String(f.RT).slice(0, 10) : null,
    })
  }
  return autos
}

function clasificar(dias) {
  if (dias == null) return 'sin_fecha'
  if (dias < 0) return 'vencido'
  if (dias === 0) return 'vence_hoy'
  return 'vigente'
}

// Estado de TODOS los documentos de TODOS los autos en stock.
// Devuelve { autos:[{patente,marca,modelo,docs:[{tipo,label,fecha,dias,estado}]}], generado }
export async function estadoDocumentos() {
  const stock = await leerStockMallorca()
  const reg = leerRegistro()
  const autos = []
  for (const a of stock) {
    const r = reg[a.patente] || {}
    const docs = []
    for (const [tipo, meta] of Object.entries(TIPOS)) {
      // La fecha del registro manda; para RT, si no hay override, se usa la del Excel.
      let fecha = r[tipo] || null
      if (!fecha && tipo === 'revision_tecnica') fecha = a.rt_excel
      const dias = fecha ? diasHasta(fecha) : null
      docs.push({ tipo, label: meta.label, fecha: fecha || null, dias, estado: clasificar(dias) })
    }
    autos.push({ patente: a.patente, marca: a.marca, modelo: a.modelo, docs })
  }
  return { autos, generado: new Date().toISOString() }
}

// Lista PLANA de documentos que vencen dentro de `dias` (o ya vencidos), ordenados por urgencia.
export async function porVencer(dias = VENTANA_DEFECTO) {
  const { autos } = await estadoDocumentos()
  const items = []
  for (const a of autos) {
    for (const d of a.docs) {
      if (d.dias == null) continue
      if (d.dias <= dias) items.push({ ...a, docs: undefined, ...d })
    }
  }
  items.sort((x, y) => x.dias - y.dias)
  return items
}

function auto2str(it) {
  return [it.marca, it.modelo].filter(Boolean).join(' ').trim() || 'Auto'
}
function doc2str(it) {
  const f = fechaLegible(it.fecha)
  if (it.dias < 0) return `${it.label}: VENCIDA hace ${Math.abs(it.dias)} día${Math.abs(it.dias) === 1 ? '' : 's'} (${f}) ⚠️`
  if (it.dias === 0) return `${it.label}: vence HOY (${f}) ⚠️`
  return `${it.label}: vence en ${it.dias} día${it.dias === 1 ? '' : 's'} (${f})`
}

// Arma el texto para Joaquín (solo el CUERPO; la plantilla alerta_nexus agrega el saludo).
export function construirMensaje(items, dias = VENTANA_DEFECTO) {
  if (!items.length) return null
  const porAuto = new Map()
  for (const it of items) {
    const k = it.patente
    if (!porAuto.has(k)) porAuto.set(k, { titulo: `${auto2str(it)} · ${it.patente}`, lineas: [] })
    porAuto.get(k).lineas.push('   • ' + doc2str(it))
  }
  const bloques = [...porAuto.values()].map(a => `🚗 ${a.titulo}\n${a.lineas.join('\n')}`)
  const vencidos = items.filter(i => i.dias < 0).length
  const cabecera = `📋 Documentos por vencer (próx. ${dias} días) — MallorcAutos` +
    (vencidos ? `\n⚠️ ${vencidos} ya ${vencidos === 1 ? 'está vencido' : 'están vencidos'}.` : '')
  return `${cabecera}\n\n${bloques.join('\n\n')}\n\nA renovarlos antes de que caduquen. 💪`
}

// Gate: no reenviar el digest antes de CADA_DIAS (sobrevive reinicios/suspensión).
function leerTrack() { try { return JSON.parse(readFileSync(TRACK, 'utf8')) || {} } catch { return {} } }
function guardarTrack(t) { try { writeFileSync(TRACK, JSON.stringify(t, null, 2)) } catch { /* */ } }

// Manda el aviso a Joaquín. opts: {dias, dry, force}. Devuelve {ok, enviados, mensaje, saltado?}.
export async function avisarJoaquin(opts = {}) {
  const dias = Number(opts.dias) > 0 ? Number(opts.dias) : VENTANA_DEFECTO
  const items = await porVencer(dias)
  const mensaje = construirMensaje(items, dias)
  if (!items.length) { log(`sin documentos por vencer dentro de ${dias} días`); return { ok: true, enviados: 0, mensaje: null, nota: `Nada por vencer en los próximos ${dias} días.` } }

  if (!opts.force && !opts.dry) {
    const track = leerTrack()
    const ultimo = fechaUTC(track.ultimo_envio)
    if (ultimo != null) {
      const desde = Math.round((hoyUTC().getTime() - ultimo.getTime()) / 86400000)
      if (desde < CADA_DIAS) { log(`gate: último envío hace ${desde} día(s) (<${CADA_DIAS}), no reenvío`); return { ok: true, enviados: 0, saltado: true, mensaje, nota: `Ya avisé hace ${desde} día(s); el próximo digest sale a los ${CADA_DIAS}. Usa force para mandarlo igual.` } }
    }
  }

  if (opts.dry) { log(`[DRY] avisaría a Joaquín (${JOAQUIN}) sobre ${items.length} documento(s)`); return { ok: true, enviados: 0, dry: true, mensaje, items: items.length } }

  const { alertarUsuario } = await import('./alertar.mjs')
  const id = await alertarUsuario(JOAQUIN, mensaje, 'Joaquin')
  const hoyStr = hoyUTC().toISOString().slice(0, 10)
  guardarTrack({ ultimo_envio: hoyStr, items: items.length })
  log(`aviso enviado a Joaquín (${JOAQUIN}) id=${id} — ${items.length} documento(s)`)
  return { ok: true, enviados: items.length, id, mensaje, nota: `Le mandé a Joaquín ${items.length} documento(s) por vencer.` }
}

// Carga/actualiza una fecha en el registro. Devuelve {ok, patente, tipo, fecha}.
export function registrarDocumento({ patente, tipo, fecha }) {
  const pat = normPat(patente)
  if (!patenteValida(pat)) return { ok: false, error: `Patente inválida: "${patente}".` }
  const t = normalizarTipo(tipo)
  if (!t) return { ok: false, error: `Documento desconocido: "${tipo}". Usa: revision_tecnica, permiso_circulacion o soap.` }
  const f = String(fecha || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !fechaUTC(f)) return { ok: false, error: `Fecha inválida: "${fecha}". Formato AAAA-MM-DD.` }
  const reg = leerRegistro()
  reg[pat] = reg[pat] || {}
  reg[pat][t] = f
  guardarRegistro(reg)
  log(`registro: ${pat} ${t} = ${f}`)
  return { ok: true, patente: pat, tipo: t, label: TIPOS[t].label, fecha: f }
}

// --- CLI ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2)
  const cmd = argv[0]
  const flag = (n, def = null) => { const i = argv.indexOf('--' + n); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : def }
  const dias = Number(flag('dias')) > 0 ? Number(flag('dias')) : VENTANA_DEFECTO
  try {
    if (cmd === 'revisar') {
      const items = await porVencer(dias)
      const msg = construirMensaje(items, dias)
      console.log(msg || `Nada por vencer en los próximos ${dias} días.`)
    } else if (cmd === 'avisar') {
      const r = await avisarJoaquin({ dias, dry: argv.includes('--dry'), force: argv.includes('--force') })
      log(r.nota || (r.dry ? `[DRY] ${r.items} documento(s):\n${r.mensaje}` : JSON.stringify(r)))
    } else if (cmd === 'registrar') {
      const r = registrarDocumento({ patente: flag('patente'), tipo: flag('tipo'), fecha: flag('fecha') })
      console.log(r.ok ? `OK: ${r.patente} · ${r.label} = ${fechaLegible(r.fecha)}` : `Error: ${r.error}`)
      if (!r.ok) process.exit(1)
    } else {
      console.log('Uso: node documentos-autos.mjs revisar|avisar|registrar [--dias N] [--dry] [--force] [--patente P --tipo T --fecha AAAA-MM-DD]')
    }
  } catch (e) {
    log('ERROR: ' + (e.message || String(e)))
    process.exit(1)
  }
}

// api.mjs — API HTTP del banco (Santander Empresa / ANA CLARA), SOLO LECTURA.
// Sirve la data REAL ya extraída (data/*.json) al instante y permite refrescarla.
// Patrón igual al resto de Nexus: pre-generar a JSON y servir el archivo (rápido,
// no cuelga). El extractor (fetch-santander.mjs) corre aparte y actualiza data/.
//
// Puerto 7690, bind 127.0.0.1. Auth por token (?token= o header x-api-token).
// Token: data/.api-token (se crea solo si no existe).
//
// Rutas:
//   GET  /health                      → estado + frescura de la data
//   GET  /saldos                      → saldos por cuenta (último snapshot)
//   GET  /movimientos?desde=&hasta=&cuenta=&q=  → movimientos filtrados
//   GET  /resumen                     → totales (ingresos/egresos/neto) del rango
//   POST /refresh                     → lanza el extractor en segundo plano
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'

const DIR = '/Users/AIagenteia/nexus/conector-tek'
const DATA = join(DIR, 'data')
mkdirSync(DATA, { recursive: true })
const PORT = Number(process.env.TEK_API_PORT || 7692)
const TOKFILE = join(DATA, '.api-token')
if (!existsSync(TOKFILE)) { try { writeFileSync(TOKFILE, randomBytes(24).toString('hex')) } catch {} }
const TOKEN = existsSync(TOKFILE) ? readFileSync(TOKFILE, 'utf8').trim() : 'tek'

const leer = (f) => { try { return JSON.parse(readFileSync(join(DATA, f), 'utf8')) } catch { return null } }
const edadMin = (f) => { try { return Math.round((Date.now() - statSync(join(DATA, f)).mtimeMs) / 60000) } catch { return null } }
const num = (v) => { const n = Number(String(v ?? '').replace(/[^\d,-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.')); return isNaN(n) ? 0 : n }
const fechaDe = (row) => { for (const k of Object.keys(row)) if (/fecha/i.test(k)) return String(row[k]); return '' }
const isoFecha = (s) => { const m = String(s).match(/(\d{2})[/-](\d{2})[/-](\d{4})/); if (m) return `${m[3]}-${m[2]}-${m[1]}`; const m2 = String(s).match(/(\d{4})-(\d{2})-(\d{2})/); return m2 ? m2[0] : '' }

// Fuente de movimientos: PREFIERE el acumulador anual (cartola-anual.json, que nunca
// pierde lo viejo); cae a movimientos.json (última captura) si aún no hay acumulado.
function fuenteMovs() {
  const anual = leer('cartola-anual.json')
  if (anual?.movimientos?.length) return { ...anual, _fuente: 'cartola-anual' }
  const m = leer('movimientos.json')
  return m?.movimientos ? { ...m, _fuente: 'movimientos' } : { movimientos: [], _fuente: 'vacio' }
}
function filtrarMovs({ desde, hasta, cuenta, q, limit }) {
  const d = fuenteMovs()
  let out = d.movimientos || []
  if (desde) out = out.filter((r) => { const f = isoFecha(fechaDe(r)); return !f || f >= desde })
  if (hasta) out = out.filter((r) => { const f = isoFecha(fechaDe(r)); return !f || f <= hasta })
  if (cuenta) out = out.filter((r) => JSON.stringify(r).includes(cuenta))
  if (q) { const re = new RegExp(q, 'i'); out = out.filter((r) => re.test(JSON.stringify(r))) }
  const total = out.length
  const lim = Number(limit) > 0 ? Number(limit) : 0
  if (lim) out = out.slice(0, lim)   // acumulador viene ordenado desc → los más recientes
  return { actualizado: d.actualizado, fuente: d._fuente, cobertura: d.cobertura, desde: desde || d.desde, hasta: hasta || d.hasta, total, mostrados: out.length, movimientos: out }
}

function resumen(params) {
  const { movimientos, ...meta } = filtrarMovs(params)
  let ingresos = 0, egresos = 0
  for (const r of movimientos) {
    for (const k of Object.keys(r)) {
      if (/abono|ingreso|cr[eé]dito|haber/i.test(k)) ingresos += num(r[k])
      if (/cargo|egreso|d[eé]bito|debe/i.test(k)) egresos += num(r[k])
    }
  }
  return { ...meta, ingresos, egresos, neto: ingresos - egresos, n: movimientos.length }
}

const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj, null, 2)) }

// ── Re-login BAJO DEMANDA ──────────────────────────────────────────────
// Se dispara SOLO cuando alguien pide data y está vencida (nunca en idle ni /health).
// El orquestador actualizar.mjs decide: sesión viva → fetch; vencida → login+fetch;
// MFA → marca necesita_superclave y no reintenta (cooldown). Acá solo lo lanzamos.
const FRESH_MIN = Number(process.env.TEK_FRESCURA_MIN || 15)   // data más nueva que esto = no refresca
let ultimoLanzamiento = 0
function dataFresca() {
  // frescura por el timestamp del último snapshot OK (no por un archivo puntual)
  const e = leer('estado.json'); if (e?.estado !== 'ok') return false
  const edad = edadMin('estado.json')
  return edad != null && edad <= FRESH_MIN
}
function lanzarActualizar(forzar = false) {
  // anti-tormenta: no relanzar si lo hicimos hace <45s
  if (!forzar && Date.now() - ultimoLanzamiento < 45_000) return { estado: 'lanzado_reciente' }
  ultimoLanzamiento = Date.now()
  const hijo = spawn('/usr/local/bin/node', [join(DIR, 'actualizar.mjs')], {
    cwd: DIR, detached: true, stdio: 'ignore', env: { ...process.env, ...(forzar ? { TEK_FORZAR: '1' } : {}) },
  })
  hijo.unref()
  return { estado: 'lanzado', pid: hijo.pid }
}
// se llama al servir data: si está vencida, refresca en segundo plano (no bloquea)
function asegurarFresco() { if (!dataFresca()) return lanzarActualizar(false); return { estado: 'fresca' } }

createServer((req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`)
  const tok = u.searchParams.get('token') || req.headers['x-api-token']
  if (u.pathname === '/health') {
    // /health NUNCA dispara login (idle = no se re-loguea)
    const e = leer('estado.json')
    const a = leer('cartola-anual.json')
    const sesionViva = !/logout\/error-seguridad|\/login/i.test(String(e?.url || ''))
    return send(res, 200, {
      ok: true, puerto: PORT, data: e,
      sesion_viva: sesionViva,   // discriminante real: la URL, no el estado "ok"
      anual: a ? { total: a.total, desde: a.cobertura?.min_fecha, hasta: a.cobertura?.max_fecha, capturas: a.cobertura?.capturas } : null,
      frescura_min: edadMin('movimientos.json'), fresca: dataFresca(),
    })
  }
  if (tok !== TOKEN) return send(res, 401, { error: 'token inválido', hint: 'usa ?token= o header x-api-token' })
  const p = Object.fromEntries(u.searchParams)
  // endpoints de DATA: aseguran frescura bajo demanda (refrescan si venció, en 2º plano)
  if (u.pathname === '/saldos') { const act = asegurarFresco(); return send(res, 200, { ...(leer('saldos.json') || { cuentas: [] }), _actualizando: act.estado }) }
  if (u.pathname === '/movimientos') { const act = asegurarFresco(); return send(res, 200, { ...filtrarMovs(p), _actualizando: act.estado }) }
  if (u.pathname === '/resumen') { const act = asegurarFresco(); return send(res, 200, { ...resumen(p), _actualizando: act.estado }) }
  if (u.pathname === '/refresh' && req.method === 'POST') return send(res, 202, lanzarActualizar(true))
  if (u.pathname === '/') return send(res, 200, { api: 'tek-santander', rutas: ['/health', '/saldos', '/movimientos?desde=&hasta=&cuenta=&q=', '/resumen', 'POST /refresh'] })
  return send(res, 404, { error: 'no existe' })
}).listen(PORT, process.env.TEK_API_HOST || '0.0.0.0', () => console.log(`[tek-api] http://${process.env.TEK_API_HOST || '0.0.0.0'}:${PORT}  token=${TOKEN.slice(0, 6)}… (alcanzable por Tailscale; auth por token)`))

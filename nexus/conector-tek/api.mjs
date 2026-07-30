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
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { networkInterfaces } from 'node:os'
import { randomBytes, timingSafeEqual } from 'node:crypto'

const DIR = '/Users/AIagenteia/nexus/conector-tek'
const DATA = join(DIR, 'data')
mkdirSync(DATA, { recursive: true })
const PORT = Number(process.env.TEK_API_PORT || 7692)
// MODO SOLO-MOVIMIENTOS: para compartir afuera sin exponer saldos ni forzar refrescos.
// Con TEK_API_SOLO_MOVS=1 solo responden /health y /movimientos; el resto da 403.
const SOLO_MOVS = process.env.TEK_API_SOLO_MOVS === '1'
const TOKFILE = join(DATA, '.api-token')
if (!existsSync(TOKFILE)) { try { writeFileSync(TOKFILE, randomBytes(24).toString('hex'), { mode: 0o600 }) } catch {} }
try { chmodSync(TOKFILE, 0o600) } catch {}
// Token: por env (instancia con scope propio, ej. la de solo-movimientos) o el del archivo.
const TOKEN = (process.env.TEK_API_TOKEN || (existsSync(TOKFILE) ? readFileSync(TOKFILE, 'utf8').trim() : 'tek')).trim()
// TOKEN DE NAVEGADOR (opcional): distinto al de scripts, REVOCABLE por separado (se quita del
// env y se recarga). Es visible en las devtools de la web, por eso no debe ser el de scripts.
const BROWSER_TOKEN = (process.env.TEK_API_TOKEN_BROWSER || '').trim()
// Tokens válidos (cualquiera de los dos entra). Comparación en tiempo constante contra cada uno.
const TOKEN_BUFS = [TOKEN, BROWSER_TOKEN].filter(Boolean).map((t) => Buffer.from(t))
// CORS: lista blanca de orígenes por env (coma-separada). NUNCA '*' — esto sirve data bancaria.
const CORS_ORIGINS = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean)
// RATE-LIMIT por IP (hardening para exposición pública): ventana fija, N req/ventana → 429.
const RL_MAX = Number(process.env.TEK_API_RL_MAX || 60)
const RL_WIN = Number(process.env.TEK_API_RL_WIN_MS || 60_000)
const rlHits = new Map()   // ip → { n, reset }
function ipDe(req) { return (String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket?.remoteAddress || 'x' }
function rateLimited(req) {
  const ip = ipDe(req); const now = Date.now()
  let e = rlHits.get(ip)
  if (!e || now > e.reset) { e = { n: 0, reset: now + RL_WIN }; rlHits.set(ip, e) }
  e.n++
  if (rlHits.size > 5000) { for (const [k, v] of rlHits) if (now > v.reset) rlHits.delete(k) }   // poda
  return e.n > RL_MAX
}

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
  // Búsqueda por texto literal, no por regex: un patrón como (a+)+$ colgaba el proceso entero.
  if (q) { const aguja = String(q).toLowerCase(); out = out.filter((r) => JSON.stringify(r).toLowerCase().includes(aguja)) }
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

// Estado de la sesión del banco (lo escribe el corazón en data/sesiones.json cada ~20s).
// Da control a los usuarios: si está viva o muerta, y hace cuánto está viva.
function estadoSesion(user = 'ramon') {
  const s = leer('sesiones.json')
  const info = s?.sesiones?.[user]
  if (!info) return { viva: false, estado: 'desconocida', nota: 'sin dato del corazón (¿corazón activo?)', actualizado: s?.actualizado || null }
  return {
    viva: info.viva,
    estado: info.estado,                 // 'viva' | 'muerta'
    viva_desde: info.desde,              // ISO cuándo se estableció
    tiempo_vivo_min: info.viva_min,      // hace cuántos min está viva
    tiempo_vivo_seg: info.viva_seg,
    restante_min: info.restante_min,     // min hasta el tope de vida (~95)
    vida_max_min: info.vida_max_min,
    ultimo_latido: info.ultimo_latido,
    actualizado: s.actualizado,          // cuándo el corazón escribió esto
  }
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
// Presupuesto de entradas al banco. Cada lanzamiento puede terminar en un login real,
// y una ráfaga de logins es lo que gatilla el bloqueo de la cuenta en Santander. El
// forzado (POST /refresh) puede saltarse la espera corta, pero NO el presupuesto diario:
// si no, un bucle de requests desde fuera se traduce en un bucle de logins.
const MIN_ENTRE = Number(process.env.TEK_MIN_ENTRE_MS || 45_000)
const TOPE_DIA = Number(process.env.TEK_TOPE_LOGINS_DIA || 24)
let dia = new Date().toDateString()
let lanzadosHoy = 0
function lanzarActualizar(forzar = false) {
  const hoy = new Date().toDateString()
  if (hoy !== dia) { dia = hoy; lanzadosHoy = 0 }
  if (lanzadosHoy >= TOPE_DIA) return { estado: 'tope_diario', tope: TOPE_DIA, nota: 'no entro más al banco hoy' }
  // anti-tormenta: el forzado espera menos, pero espera
  const espera = forzar ? 10_000 : MIN_ENTRE
  if (Date.now() - ultimoLanzamiento < espera) return { estado: 'lanzado_reciente' }
  ultimoLanzamiento = Date.now()
  lanzadosHoy++
  const hijo = spawn('/usr/local/bin/node', [join(DIR, 'actualizar.mjs')], {
    cwd: DIR, detached: true, stdio: 'ignore', env: { ...process.env, ...(forzar ? { TEK_FORZAR: '1' } : {}) },
  })
  hijo.unref()
  return { estado: 'lanzado', pid: hijo.pid, hoy: lanzadosHoy, tope: TOPE_DIA }
}
// se llama al servir data: si está vencida, refresca en segundo plano (no bloquea)
function asegurarFresco() { if (!dataFresca()) return lanzarActualizar(false); return { estado: 'fresca' } }

// Comparación en tiempo constante: `!==` filtra el token carácter a carácter y deja
// medir cuántos aciertan por el tiempo de respuesta.
function tokenOk(tok) {
  if (typeof tok !== 'string' || !tok) return false
  const b = Buffer.from(tok)
  for (const t of TOKEN_BUFS) { if (b.length === t.length && timingSafeEqual(b, t)) return true }
  return false
}

const manejar = (req, res) => {
  // ── CORS ─────────────────────────────────────────────────────────────
  // Solo para orígenes en la lista blanca (CORS_ORIGIN). Sin '*': es data bancaria.
  // Los headers se setean ANTES de cualquier auth → así el preflight y las respuestas
  // reales los llevan. writeHead() posterior los conserva (merge con setHeader).
  const origin = req.headers['origin']
  if (origin && CORS_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-API-Token, Content-Type')
    res.setHeader('Access-Control-Max-Age', '600')
  }
  // Preflight: NUNCA lleva credenciales → responde 204 sin exigir token (antes de validar).
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  // Rate-limit por IP (protege el endpoint público de scraping/abuso).
  if (rateLimited(req)) return send(res, 429, { error: 'demasiadas solicitudes', reintenta_en_s: Math.ceil(RL_WIN / 1000) })
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
      sesion: estadoSesion('ramon'),   // estado en vivo del corazón (viva/muerta + hace cuánto)
      anual: a ? { total: a.total, desde: a.cobertura?.min_fecha, hasta: a.cobertura?.max_fecha, capturas: a.cobertura?.capturas } : null,
      frescura_min: edadMin('movimientos.json'), fresca: dataFresca(),
    })
  }
  if (!tokenOk(tok)) return send(res, 401, { error: 'token inválido', hint: 'usa ?token= o header x-api-token' })
  // En modo solo-movimientos, TODO lo que no sea /movimientos (o /) queda bloqueado.
  if (SOLO_MOVS && ['/saldos', '/resumen', '/resumen-mensual', '/refresh'].includes(u.pathname)) {
    return send(res, 403, { error: 'esta API es solo de movimientos' })
  }
  const p = Object.fromEntries(u.searchParams)
  // endpoints de DATA: aseguran frescura bajo demanda (refrescan si venció, en 2º plano)
  // Estado de la sesión del banco — NO toca el banco (lee lo que escribió el corazón).
  if (u.pathname === '/sesion') return send(res, 200, { empresa: 'ANA CLARA SPA', ...estadoSesion('ramon') })
  if (u.pathname === '/saldos') { const act = asegurarFresco(); return send(res, 200, { ...(leer('saldos.json') || { cuentas: [] }), _actualizando: act.estado }) }
  if (u.pathname === '/movimientos') { const act = asegurarFresco(); return send(res, 200, { sesion: estadoSesion('ramon'), ...filtrarMovs(p), _actualizando: act.estado }) }
  if (u.pathname === '/resumen') { const act = asegurarFresco(); return send(res, 200, { ...resumen(p), _actualizando: act.estado }) }
  // RESUMEN MENSUAL OFICIAL de la cartola histórica (ingresos/egresos/saldos por mes, COMPLETO
  // ene→jun; los movimientos individuales de /movimientos son parciales para meses viejos).
  if (u.pathname === '/resumen-mensual') {
    const h = leer('carthist-resumen.json') || { meses: [] }
    const meses = (h.meses || []).map((m) => ({
      mes: m.mes, anio: m.anio, n_cartola: m.n_cartola, periodo: m.periodo,
      ingresos: m.abonos, egresos: m.cargos, saldo_inicial: m.saldo_inicial, saldo_final: m.saldo_final,
    })).sort((a, b) => a.mes - b.mes)
    return send(res, 200, { empresa: 'ANA CLARA SPA', cuenta: '0-000-8028093-9', actualizado: h.actualizado, fuente: 'cartola histórica Santander', meses })
  }
  if (u.pathname === '/refresh' && req.method === 'POST') return send(res, 202, lanzarActualizar(true))
  if (u.pathname === '/') return send(res, 200, SOLO_MOVS
    ? { api: 'tek-santander (solo movimientos · ANA CLARA)', rutas: ['/health', '/sesion', '/movimientos?desde=&hasta=&cuenta=&q=&limit='] }
    : { api: 'tek-santander', rutas: ['/health', '/sesion', '/saldos', '/movimientos?desde=&hasta=&cuenta=&q=', '/resumen', '/resumen-mensual', 'POST /refresh'] })
  return send(res, 404, { error: 'no existe' })
}

// Dónde escuchamos. En 0.0.0.0 esto también respondía en el WiFi del café, y el token
// vive en un archivo del disco: quien lee el archivo entra. Escuchamos solo en loopback
// (los consumidores locales) y en la IP de Tailscale (el teléfono), que va cifrada.
function ipTailscale() {
  for (const dir of Object.values(networkInterfaces())) {
    for (const i of dir || []) {
      if (i.family === 'IPv4' && !i.internal && /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(i.address)) return i.address
    }
  }
  return null
}
const forzado = process.env.TEK_API_HOST
const destinos = forzado ? [forzado] : ['127.0.0.1', ipTailscale()].filter(Boolean)
for (const host of destinos) {
  createServer(manejar).listen(PORT, host, () => console.log(`[tek-api] http://${host}:${PORT}  token=${TOKEN.slice(0, 6)}… (auth por token)`))
    .on('error', (e) => console.error(`[tek-api] no pude escuchar en ${host}:${PORT} → ${e.message}`))
}

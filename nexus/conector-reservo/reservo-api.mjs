// reservo-api.mjs — Conector Reservo con TOKEN FIJO que nunca cambia.
//
// Idea: Reservo usa sesión Django (sessionid) que CADUCA y tiene 2FA por riesgo.
// Este servicio te da UN token propio (RESERVO_TOKEN, fijo, sobrevive reinicios) y
// mantiene viva la sesión de Reservo SOLO: cuando la sesión muere, se re-loguea con
// Chrome real (que esquiva el 2FA). Tus apps/Nexus llaman acá con el token fijo y el
// servicio traduce a Reservo con la sesión vigente.
//
// Uso:
//   GET  http://127.0.0.1:8896/health                       → estado
//   ANY  http://127.0.0.1:8896/r/<ruta-reservo>             → proxy autenticado
//     header  X-Token: <RESERVO_TOKEN>   (o  ?token=...)
//   ej: curl http://127.0.0.1:8896/r/appointment/viewAppt/ -H "X-Token: rsv_..."
//
// Si un re-login topa con 2FA, avisa por WhatsApp (Kapso) y sirve 503 hasta resolverlo.
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'

process.loadEnvFile(path.join(os.homedir(), 'nexus', '.env'))
const TOKEN = process.env.RESERVO_TOKEN || ''
const PORT = Number(process.env.RESERVO_PORT || 8896)
const API_TOKEN = process.env.RESERVO_API_TOKEN || ''            // token OFICIAL API pública v2
const API_V2 = 'https://reservo.cl/APIpublica/v2/'
const PUBLIC_BASE = process.env.RESERVO_PUBLIC_BASE || ''        // para reescribir la paginación
const DIR = path.join(os.homedir(), 'nexus', 'conector-reservo')
const SESS_FILE = path.join(DIR, 'session.json')
const CREDS = JSON.parse(readFileSync(path.join(os.homedir(), 'nexus', 'reservo', '.creds.json'), 'utf8'))
const BASE = 'https://reservo.cl'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
const LOG = '/tmp/nexus-reservo-api.log'
const log = (m) => { const l = `[${new Date().toISOString()}] ${m}\n`; try { appendFileSync(LOG, l) } catch {} ; process.stdout.write(l) }
if (!TOKEN) { log('FATAL: falta RESERVO_TOKEN en ~/nexus/.env'); process.exit(1) }

// ── Estado de sesión ─────────────────────────────────────────────────────────
let sess = { sessionid: '', csrftoken: '', ts: 0, need2fa: false }
function cargar() { try { const st = JSON.parse(readFileSync(SESS_FILE, 'utf8')); const c = st.cookies || []; sess.sessionid = c.find(x => x.name === 'sessionid')?.value || ''; sess.csrftoken = c.find(x => x.name === 'csrftoken')?.value || ''; sess.ts = st.ts || 0 } catch {} }
function guardar() { const cookies = [{ name: 'sessionid', value: sess.sessionid, domain: 'reservo.cl', path: '/' }, { name: 'csrftoken', value: sess.csrftoken, domain: 'reservo.cl', path: '/' }]; writeFileSync(SESS_FILE, JSON.stringify({ cookies, ts: Date.now() }, null, 2)) }
const cookieHeader = () => `sessionid=${sess.sessionid}; csrftoken=${sess.csrftoken}`

// ¿la sesión sirve? (viewAppt sin redirigir a login)
async function sesionViva() {
  if (!sess.sessionid) return false
  try {
    const r = await fetch(`${BASE}/appointment/viewAppt/`, { headers: { 'User-Agent': UA, Cookie: cookieHeader() }, redirect: 'manual' })
    return r.status === 200
  } catch { return false }
}

// Re-login con Chrome real (esquiva el 2FA por riesgo). Devuelve true si quedó logueado.
let logueando = null
async function login() {
  if (logueando) return logueando
  logueando = (async () => {
    log('re-login con Chrome…')
    let b
    try {
      const patchright = (await import(path.join(os.homedir(), 'nexus', 'conector-tek', 'node_modules', 'patchright', 'index.js'))).default
      b = await patchright.chromium.launch({ headless: true, channel: 'chrome' })
      const ctx = await b.newContext()
      const page = await ctx.newPage()
      await page.goto(CREDS.login_url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.fill('input[name=username]', CREDS.usuario)
      await page.fill('input[name=password]', CREDS.password)
      await Promise.all([page.waitForNavigation({ timeout: 20000 }).catch(() => {}), page.click('form button[type=submit], form [type=submit], form button')])
      await page.waitForLoadState('domcontentloaded').catch(() => {})
      await new Promise(r => setTimeout(r, 3000))
      const url = page.url()
      const cookies = await ctx.cookies()
      const sid = cookies.find(c => c.name === 'sessionid')?.value || ''
      const csrf = cookies.find(c => c.name === 'csrftoken')?.value || ''
      if (/\/accounts\/2fa/.test(url) || (!sid)) {
        sess.need2fa = /2fa/.test(url)
        log('re-login NO completó (2fa=' + sess.need2fa + ', url=' + url.slice(0, 60) + ')')
        if (sess.need2fa) avisar2fa()
        return false
      }
      sess.sessionid = sid; sess.csrftoken = csrf; sess.ts = Date.now(); sess.need2fa = false
      guardar()
      log('re-login OK → ' + url.split('?')[0])
      return true
    } catch (e) { log('re-login ERROR: ' + e.message.slice(0, 120)); return false }
    finally { try { await b?.close() } catch {} ; logueando = null }
  })()
  return logueando
}

let ultimoAviso2fa = 0
async function avisar2fa() {
  if (Date.now() - ultimoAviso2fa < 3600_000) return
  ultimoAviso2fa = Date.now()
  try { const kapso = await import(path.join(os.homedir(), 'nexus', 'hub', 'kapso.mjs')); await kapso.enviarKapso('+56932945240', '🔐 Reservo: la sesión caducó y el re-login pidió 2FA. Entra una vez desde el navegador para reactivarlo (el token sigue fijo).') } catch {}
}

async function ensure() {
  if (await sesionViva()) return true
  return await login()
}

// ── Caché de la API v2 (para entregar RÁPIDO) ────────────────────────────────
// Guarda cada respuesta v2 por URL. Sirve al instante desde caché; si está vieja,
// devuelve lo cacheado YA y refresca en segundo plano (stale-while-revalidate).
const cacheData = new Map()   // key = "citas/?..." → { status, ct, body, ts }
const inflight = new Map()    // dedupe de fetches concurrentes al mismo key
const CACHE_TTL = Number(process.env.RESERVO_CACHE_TTL || 600) * 1000   // fresco 10 min

// ── PERSISTENCIA DE CACHÉ A DISCO ─────────────────────────────────────────────
// Sin esto, cada reinicio arranca en FRÍO (primeras cargas lentas). Guardamos los
// datasets pesados (ALL:/D2:) a disco y los cargamos al arrancar → data al instante
// (stale-while-revalidate refresca en segundo plano). No guardamos el gzip (se recomputa).
const CACHE_FILE = path.join(DIR, 'cache.json')
let _guardando = false
function guardarCacheDisco() {
  if (_guardando) return; _guardando = true
  try {
    const obj = {}
    for (const [k, v] of cacheData) {
      if (!/^(ALL:|D2:|ALL_INDEX)/.test(k)) continue           // solo los grandes/computados
      if (!v || v.status !== 200 || !v.body) continue
      obj[k] = { status: v.status, ct: v.ct, body: v.body, ts: v.ts }   // sin gz
    }
    writeFileSync(CACHE_FILE, JSON.stringify(obj))
  } catch (e) { log('guardarCache falló: ' + e.message.slice(0, 80)) } finally { _guardando = false }
}
function cargarCacheDisco() {
  try {
    if (!existsSync(CACHE_FILE)) return 0
    const obj = JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
    let n = 0
    for (const [k, v] of Object.entries(obj)) { if (v && v.body) { cacheData.set(k, v); n++ } }
    log(`caché cargada de disco: ${n} datasets (arranque en caliente)`)
    return n
  } catch (e) { log('cargarCache falló: ' + e.message.slice(0, 80)); return 0 }
}
const esMesActual = (mes) => mes === new Date().toISOString().slice(0, 7)
const ttlFor = (mes) => (mes && esMesActual(mes) ? 120_000 : CACHE_TTL)   // mes actual: 2 min; cerrados: largo
// fetch con reintentos ante caídas de red (ECONNRESET/timeout).
async function fetchR(u, opts, tries = 3) { for (let i = 0; i < tries; i++) { try { return await fetch(u, opts) } catch (e) { if (i === tries - 1) throw e; await new Promise((r) => setTimeout(r, 300 * (i + 1))) } } }
// Envuelve una lista en el wrapper estándar { cantidad_elementos, pagina_siguiente, resultados }.
function wrapList(arr, pagina, baseUrl) {
  const per = 200
  if (arr.length <= per) return { cantidad_elementos: arr.length, pagina_siguiente: null, pagina_anterior: null, resultados: arr }
  const p = Math.max(1, Number(pagina) || 1), start = (p - 1) * per
  const mk = (n) => { try { const u = new URL(baseUrl); u.searchParams.set('pagina', n); return u.toString() } catch { return null } }
  return { cantidad_elementos: arr.length, pagina_siguiente: start + per < arr.length ? mk(p + 1) : null, pagina_anterior: p > 1 ? mk(p - 1) : null, resultados: arr.slice(start, start + per) }
}
// Trae una página v2 (RAW, sin reescribir) y la cachea.
async function fetchV2(key) {
  if (inflight.has(key)) return inflight.get(key)
  const p = (async () => {
    const r = await fetchR(API_V2 + key, { headers: { Authorization: `Token ${API_TOKEN}`, Accept: 'application/json' } })
    const body = await r.text()
    const e = { status: r.status, ct: r.headers.get('content-type') || 'application/json', body, ts: Date.now() }
    if (r.status === 200) cacheData.set(key, e)
    return e
  })().finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}
// Reescribe las URLs de paginación para que apunten al proxy (solo al servir 1 página).
const rewrite = (body, ct) => (ct.includes('json') && PUBLIC_BASE) ? body.split(API_V2).join(PUBLIC_BASE + '/r/data/') : body
// Sirve un cuerpo comprimido (gzip) si el cliente lo acepta — clave para payloads grandes.
// entry (opcional) cachea el gzip de datasets completos para no recomprimir en cada HIT.
function sendGz(req, res, status, ct, cacheTag, body, entry) {
  const h = { 'Content-Type': ct, 'X-Cache': cacheTag, Vary: 'Accept-Encoding' }
  if (/gzip/.test(req.headers['accept-encoding'] || '') && body.length > 1024) {
    const gz = entry ? (entry.gz || (entry.gz = gzipSync(body))) : gzipSync(body)
    h['Content-Encoding'] = 'gzip'
    res.writeHead(status, h); res.end(gz)
  } else { res.writeHead(status, h); res.end(body) }
}
// Trae los resultados de UNA página con reintentos (nunca descarta en silencio).
async function pageResults(qkey, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const e = await fetchV2(qkey)
    if (e.status === 200) { try { const j = JSON.parse(e.body); if (Array.isArray(j.resultados)) return j.resultados } catch {} }
    cacheData.delete(qkey)                               // no cachear el fallo → el reintento re-pide
    await new Promise((r) => setTimeout(r, 400 * (i + 1)))
  }
  throw new Error('página falló tras reintentos: ' + qkey)
}
// Junta TODAS las páginas del lado del servidor → la app pide todo en 1 request.
// Valida que el total cuadre; si falta data, NO cachea (mejor 502 que datos incompletos).
async function buildAll(ep, params, ck) {
  const q = (pg) => { const p = new URLSearchParams(params); p.set('pagina', String(pg)); return ep + '?' + p.toString() }
  const first = JSON.parse((await fetchV2(q(1))).body)
  const total = first.cantidad_elementos || 0
  const per = first.resultados.length || 50
  const pages = Math.max(1, Math.ceil(total / per))
  // 🛡️ Tope de seguridad: una consulta descomunal (ej. citas SIN filtro = 40k+) colgaría
  // el request 90s+ y taparía conexiones. Cortamos rápido y pedimos filtrar por fecha.
  const MAX_PAGES = Number(process.env.RESERVO_MAX_PAGES || 120)
  if (pages > MAX_PAGES) { const e = new Error(`consulta demasiado grande: ${total} registros (${pages} págs > ${MAX_PAGES}). Filtrá por fecha_inicial/fecha_final o uuid_cliente.`); e.tooLarge = true; throw e }
  const all = [...first.resultados]
  const CONC = 5
  for (let s = 2; s <= pages; s += CONC) {
    const batch = []
    for (let pg = s; pg < Math.min(s + CONC, pages + 1); pg++) batch.push(pageResults(q(pg)))
    for (const r of await Promise.all(batch)) all.push(...r)
  }
  if (total && all.length < total) throw new Error(`dataset incompleto ${ep}: ${all.length}/${total}`)
  const e = { status: 200, ct: 'application/json', body: JSON.stringify({ cantidad_elementos: all.length, pagina_siguiente: null, pagina_anterior: null, resultados: all }), ts: Date.now() }
  cacheData.set(ck, e)
  log(`buildAll ${ep} → ${all.length}/${total} ✓`)
  return e
}
// ── data2: endpoints DERIVADOS (calculados del v2, cacheado y rápido) ─────────
const num = (x) => Number(x || 0)
function rangoMes(mes) { const [y, m] = mes.split('-').map(Number); const fin = new Date(y, m, 0).getDate(); return { ini: `${mes}-01`, fin: `${mes}-${String(fin).padStart(2, '0')}` } }
async function ventasMes(mes) {   // usa el buildAll cacheado (dataset completo del mes)
  const { ini, fin } = rangoMes(mes)
  const params = new URLSearchParams({ fecha_inicial: ini, fecha_final: fin })
  const ck = 'ALL:ventas/?' + params.toString()
  let e = cacheData.get(ck)
  if (!e || Date.now() - e.ts >= CACHE_TTL) e = await buildAll('ventas/', params, ck)
  return JSON.parse(e.body).resultados
}
// Caja: ingresos por MEDIO DE PAGO del mes.
async function d2_caja(mes) {
  const vs = (await ventasMes(mes)).filter((v) => v.estado?.codigo !== 'E')
  const m = new Map()
  for (const v of vs) for (const p of (v.pagos || [])) {
    const t = p.meta_data?.tipo_pago?.descripcion || p.tipo || 'Otro'
    const o = m.get(t) || { tipo: t, monto: 0, n: 0 }; o.monto += num(p.monto); o.n++; m.set(t, o)
  }
  return [...m.values()].map((o) => ({ ...o, monto: Math.round(o.monto) })).sort((a, b) => b.monto - a.monto)
}
// Comisiones por profesional — del endpoint OFICIAL /comisiones/ventascomisionprofesional/
// (POST fechainicio/fechafin dd/mm/yyyy + profesionales[]=id, máx 3 por llamada → batches).
// Reservo entrega en JSON: base de VENTAS + COMISIÓN POR ATENCIÓN (calculada, en pesos).
// La "comisión por ventas" la calcula el front con el % privado de cada profesional (config,
// NO expuesto como JSON) → por eso el split centro/líquido no está disponible acá.
async function d2_comisiones(mes) {
  const { ini, fin } = rangoMes(mes)
  const fi = dmy(ini), ff = dmy(fin)
  const profs = ((await internalJson('/cliente/list_profesional/')) || []).filter((p) => p.estado)
  const batches = []
  for (let i = 0; i < profs.length; i += 3) batches.push(profs.slice(i, i + 3))
  const byId = new Map()
  // concurrencia acotada (5) para no gatillar rate-limit de Reservo.
  for (let s = 0; s < batches.length; s += 5) {
    const wave = batches.slice(s, s + 5).map(async (grupo) => {
      const body = new URLSearchParams({ fechainicio: fi, fechafin: ff, imprimir: '0' })
      for (const p of grupo) body.append('profesionales[]', p.id)
      const rows = await internalJson('/comisiones/ventascomisionprofesional/', 'POST', body.toString()).catch(() => null)
      for (const r of (Array.isArray(rows) ? rows : [])) byId.set(r.personal_id, r)
    })
    await Promise.all(wave)
  }
  return profs.map((p) => {
    const r = byId.get(p.id) || {}
    const ventas = num(r.total_venta_tratamientos) + num(r.total_venta_producto) + num(r.total_venta_plan) + num(r.total_venta_giftcard)
    const comAtencion = Math.round(num(r.comision_atencion))
    return {
      profesional_id: p.id, profesional_uuid: p.uuid, nombre: p.nombre, cargo: p.cargo,
      ventas: Math.round(ventas), bruto: Math.round(ventas), comision_atencion: comAtencion,
      comision_centro: null, liquido: null, retencion_pct: null, split_disponible: false,
    }
  }).filter((o) => o.ventas > 0 || o.comision_atencion > 0)
    .sort((a, b) => (b.ventas + b.comision_atencion) - (a.ventas + a.comision_atencion))
}
// Clientes completos (cacheado) — para cumpleaños/ficha.
async function clientesAll() {
  const ck = 'ALL:cliente/?'
  let e = cacheData.get(ck)
  if (!e || Date.now() - e.ts >= CACHE_TTL) e = await buildAll('cliente/', new URLSearchParams(), ck)
  return JSON.parse(e.body).resultados
}
// Cumpleaños del día (fidelización): filtra clientes por mes-día de nacimiento.
async function d2_cumpleanos(fecha) {
  const md = fecha.slice(5)                      // MM-DD
  const anio = Number(fecha.slice(0, 4))
  return (await clientesAll()).filter((c) => c.fecha_nacimiento && c.fecha_nacimiento.slice(5) === md)
    .map((c) => ({ uuid: c.uuid, nombre: [c.nombre, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' '), rut: c.identificador || '', edad: anio - Number(c.fecha_nacimiento.slice(0, 4)), telefono: c.telefono_1 || '', mail: c.mail || '' }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
}
// Pacientes con datos de CONTACTO (emails + teléfonos) para marketing/recordatorios.
// ?con_email=1 → solo los que TIENEN correo válido. Del dataset de clientes cacheado (rápido).
async function d2_pacientes(soloConEmail) {
  const cs = await clientesAll()
  let out = cs.map((c) => ({
    uuid: c.uuid,
    nombre: [c.nombre, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' '),
    rut: c.identificador || '',
    mail: String(c.mail || '').trim(),
    telefono: String(c.telefono_1 || c.telefono_2 || '').trim(),
    ficha: c.ficha || '',
    fecha_nacimiento: c.fecha_nacimiento || '',
    sexo: c.sexo || '',
  }))
  if (soloConEmail) out = out.filter((c) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.mail))
  return out.sort((a, b) => a.nombre.localeCompare(b.nombre))
}
// Mapa uuid_cliente → { paciente, rut } (del dataset de clientes cacheado).
async function clienteMap() {
  const ck = 'ALL:cliente/?'
  let e = cacheData.get(ck)
  if (!e || Date.now() - e.ts >= CACHE_TTL) e = await buildAll('cliente/', new URLSearchParams(), ck)
  const m = new Map()
  for (const c of JSON.parse(e.body).resultados) m.set(c.uuid, { paciente: [c.nombre, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' '), rut: c.identificador || '' })
  return m
}
// Deuda: por venta, lo facturado (documentos) menos lo pagado (pagos) → saldo pendiente, por paciente.
async function d2_deuda(mes) {
  const vs = (await ventasMes(mes)).filter((v) => v.estado?.codigo !== 'E')
  const cm = await clienteMap()
  const out = []
  for (const v of vs) {
    const facturado = (v.documentos || []).reduce((s, d) => s + (/NDC/i.test(d.tipo?.codigo || '') ? -num(d.monto) : num(d.monto)), 0)
    const pagado = (v.pagos || []).reduce((s, p) => s + num(p.monto), 0)
    const saldo = Math.round(facturado - pagado)
    if (saldo > 0) { const c = cm.get(v.receptor?.uuid) || {}; out.push({ paciente_uuid: v.receptor?.uuid || '', paciente: c.paciente || '', rut: c.rut || '', venta_uuid: v.uuid, monto: saldo, fecha: v.fecha, facturado: Math.round(facturado), pagado: Math.round(pagado) }) }
  }
  return out.sort((a, b) => b.monto - a.monto)
}

// Llamada al APP INTERNO (sesión) → JSON. Renueva sesión si caducó.
async function internalJson(pathr, method = 'GET', body = null) {
  if (!sess.sessionid) await login()
  const doIt = () => fetchR(BASE + pathr, { method, headers: { 'User-Agent': UA, Cookie: cookieHeader(), 'X-CSRFToken': sess.csrftoken, 'X-Requested-With': 'XMLHttpRequest', Referer: BASE + '/appointment/viewAppt/', ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) }, body, redirect: 'manual' })
  let r = await doIt()
  if (r.status >= 300 && r.status < 400 && /accounts\/login/.test(r.headers.get('location') || '')) { if (await login()) r = await doIt() }
  const t = await r.text(); try { return JSON.parse(t) } catch { return null }
}
async function citasMes(mes) {
  const { ini, fin } = rangoMes(mes)
  const params = new URLSearchParams({ fecha_inicial: ini, fecha_final: fin })
  const ck = 'ALL:citas/?' + params.toString()
  let e = cacheData.get(ck)
  if (!e || Date.now() - e.ts >= CACHE_TTL) e = await buildAll('citas/', params, ck)
  return JSON.parse(e.body).resultados
}
// Mapa agenda↔profesional↔box: list_profesional (id↔uuid) + box más usado por el prof (de las citas).
async function d2_agendas() {
  const [profs, citas, clientes] = await Promise.all([
    internalJson('/cliente/list_profesional/').then((x) => x || []),
    citasMes(new Date().toISOString().slice(0, 7)).catch(() => []),
    clientesAll().catch(() => []),
  ])
  const boxByUuid = new Map()
  for (const c of citas) { const b = c.agenda?.descripcion, u = c.profesional?.uuid; if (b && u) { const s = boxByUuid.get(u) || new Map(); s.set(b, (s.get(b) || 0) + 1); boxByUuid.set(u, s) } }
  const topBox = (u) => { const s = boxByUuid.get(u); return s ? [...s.entries()].sort((a, b) => b[1] - a[1])[0][0] : '' }
  // Teléfono/mail: primero del registro de profesional; si viene vacío (pasa en ~29/39),
  // se completa cruzando el RUT con su ficha de paciente (v2 cliente.identificador).
  const rn = (r) => String(r || '').replace(/[.\-\s]/g, '').toUpperCase()
  const ficha = new Map()
  for (const c of clientes) { const k = rn(c.identificador); if (k) ficha.set(k, { tel: String(c.telefono_1 || c.telefono_2 || '').trim(), mail: String(c.mail || '').trim() }) }
  return profs.filter((p) => p.estado).map((p) => {
    const f = ficha.get(rn(p.rut)) || {}
    const telefono = String(p.telefono || p.celular || '').trim() || f.tel || ''
    return { agenda_id: p.id, profesional_uuid: p.uuid, profesional_nombre: p.nombre, cargo: p.cargo, box: topBox(p.uuid), rut: p.rut || '', telefono, celular: String(p.celular || '').trim(), email: String(p.email || '').trim() || f.mail || '', telefono_origen: (String(p.telefono || p.celular || '').trim() ? 'profesional' : (f.tel ? 'ficha' : 'sin_dato')) }
  })
}
// Lista de tratamientos con su ID INTERNO (numérico) — para el picker de la app.
// Fuente: el <select id="id_tratamientos"> viene con las 63 opciones en el HTML de makeAppointment.
let _tratCache = { ts: 0, list: [] }
async function d2_tratamientos() {
  if (Date.now() - _tratCache.ts < 30 * 60 * 1000 && _tratCache.list.length) return _tratCache.list
  const r = await fetchR(BASE + '/appointment/makeAppointment/', { headers: { 'User-Agent': UA, Cookie: cookieHeader() }, redirect: 'manual' })
  const html = await r.text()
  const m = html.match(/<select[^>]*id="id_tratamientos"[\s\S]*?<\/select>/)
  const list = []
  if (m) for (const mm of m[0].matchAll(/<option value="(\d+)"[^>]*>([^<]+)<\/option>/g)) list.push({ id: Number(mm[1]), nombre: mm[2].trim() })
  if (list.length) _tratCache = { ts: Date.now(), list }
  return list
}
// Bloqueos del mes por agenda: obtenerBloqueoProfesional es por día → recorremos el mes.
async function d2_bloqueos(mes) {
  const { ini, fin } = rangoMes(mes)
  const dias = []; for (let d = new Date(ini + 'T00:00:00Z'); d.toISOString().slice(0, 10) <= fin; d = new Date(d.getTime() + 86400000)) dias.push(d.toISOString().slice(0, 10))
  const raw = {}   // agenda_id → Map(id → bloque) para deduplicar
  for (let s = 0; s < dias.length; s += 6) {
    const batch = dias.slice(s, s + 6).map((dia) => internalJson('/bloqueosHorario/obtenerBloqueoProfesional/', 'POST', new URLSearchParams({ fecha: dia }).toString()).then((j) => ({ dia, j })).catch(() => ({ dia, j: null })))
    for (const { dia, j } of await Promise.all(batch)) {
      if (!j || typeof j !== 'object') continue
      for (const [ag, blocks] of Object.entries(j)) {
        if (!Array.isArray(blocks) || !blocks.length) continue
        const m = (raw[ag] ||= new Map())
        for (const b of blocks) {
          const id = b.id || (String(b.start) + ag)
          if (!m.has(id)) m.set(id, { fecha: (b.start || dia + 'T').slice(0, 10), horaInicio: (b.start || '').slice(11, 16), horaFin: (b.end || '').slice(11, 16), motivo: b.title || b.motivo || '' })
        }
      }
    }
  }
  const out = {}
  for (const [ag, m] of Object.entries(raw)) out[ag] = [...m.values()].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio))
  return out
}

// Citas/ventas de UN paciente (v2 por uuid_cliente, cacheado).
async function porClienteV2(ep, uuid) {
  const params = new URLSearchParams({ uuid_cliente: uuid })
  const ck = 'ALL:' + ep + '?' + params.toString()
  let e = cacheData.get(ck)
  if (!e || Date.now() - e.ts >= CACHE_TTL) e = await buildAll(ep, params, ck)
  return JSON.parse(e.body).resultados
}
async function clienteFicha(uuid) { const e = await fetchV2('cliente/' + uuid + '/'); try { return JSON.parse(e.body) } catch { return null } }
const CANCELADA = new Set(['C', 'TC'])
// B6: ficha del paciente (datos + saldo + próxima cita + total atenciones).
async function d2_paciente(uuid) {
  const [c, citas, ventas] = await Promise.all([clienteFicha(uuid), porClienteV2('citas/', uuid), porClienteV2('ventas/', uuid)])
  if (!c || !c.uuid) { const e = new Error('paciente no encontrado'); e.noEncontrado = true; throw e }
  let saldo = 0
  for (const v of ventas.filter((v) => v.estado?.codigo !== 'E')) {
    const f = (v.documentos || []).reduce((s, d) => s + (/NDC/i.test(d.tipo?.codigo || '') ? -num(d.monto) : num(d.monto)), 0)
    const p = (v.pagos || []).reduce((s, x) => s + num(x.monto), 0)
    if (f - p > 0) saldo += f - p
  }
  const now = new Date().toISOString()
  const prox = citas.filter((x) => x.inicio > now && !CANCELADA.has(x.estado?.codigo)).sort((a, b) => a.inicio.localeCompare(b.inicio))[0]
  return { uuid: c.uuid, nombre: [c.nombre, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' '), rut: c.identificador || '', fecha_nacimiento: c.fecha_nacimiento || null, telefono: c.telefono_1 || '', mail: c.mail || '', saldo: Math.round(saldo), proxima_cita: prox?.inicio || null, total_atenciones: citas.filter((x) => x.estado?.codigo === 'A').length }
}
// B7: historial de atenciones del paciente (cita + monto/boleta cruzado con ventas).
async function d2_historial(uuid) {
  const [citas, ventas] = await Promise.all([porClienteV2('citas/', uuid), porClienteV2('ventas/', uuid)])
  const byCita = new Map()
  for (const v of ventas.filter((v) => v.estado?.codigo !== 'E')) for (const it of (v.items || [])) {
    const uc = it.meta_data?.uuid_cita; if (uc) byCita.set(uc, { monto: Math.round(num(it.monto)), boleta: (v.documentos || [])[0]?.folio || '' })
  }
  return citas.sort((a, b) => b.inicio.localeCompare(a.inicio)).map((x) => ({
    fecha: x.inicio.slice(0, 10), profesional: x.profesional?.nombre || '', tratamiento: (x.tratamientos || [])[0]?.nombre || '',
    estado: x.estado?.descripcion || '', monto: byCita.get(x.uuid)?.monto ?? 0, boleta: byCita.get(x.uuid)?.boleta || '',
  }))
}

// Estado de resultado (ventas/gastos/utilidad por mes) — del dashboard oficial.
async function d2_estado_resultado() {
  const j = await internalJson('/dashboard/estado_resultado/', 'POST', new URLSearchParams({ fecha_inicial: '2020-01-01', fecha_final: new Date().toISOString().slice(0, 10) }).toString())
  return (j?.resumen || []).map((x) => ({ mes: x.mes, ventas: Math.round(x.ventas || 0), gastos: Math.round(x.gastos || 0), utilidad: Math.round(x.delta || 0) }))
}

// Endpoints del dashboard "personalizado": body form-urlencoded fecha_desde/fecha_hasta en dd/mm/yyyy (NO yyyy-mm-dd como el v2).
function dmy(iso) { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
async function d2_dashboard(ep, mes, rango = null) {
  // rango = {desde,hasta} en dd/mm/yyyy (override); si no, el mes completo.
  let desde, hasta
  if (rango && rango.desde && rango.hasta) { desde = rango.desde; hasta = rango.hasta }
  else { const { ini, fin } = rangoMes(mes); desde = dmy(ini); hasta = dmy(fin) }
  const body = new URLSearchParams({ fecha_desde: desde, fecha_hasta: hasta }).toString()
  return (await internalJson('/dashboard/' + ep, 'POST', body)) || {}
}

// ── ACCIONES de escritura (crear/anular/estado cita) ─────────────────────────
// Blindaje: X-Token SIEMPRE (ya exigido arriba) + log de auditoría de CADA intento
// + flag RESERVO_ESCRITURA=1 para habilitar el golpe real (default OFF = nunca a ciegas).
const AUDIT = path.join(DIR, 'auditoria-escritura.jsonl')
const ESCRITURA_OK = process.env.RESERVO_ESCRITURA === '1'
function auditar(accion, det) { try { appendFileSync(AUDIT, JSON.stringify({ ts: new Date().toISOString(), accion, ...det }) + '\n') } catch {} }
function pendienteCaptura(ep) { const e = new Error('acción no habilitada: faltan los params exactos de ' + ep + ' (capturar Form Data del Network) y/o RESERVO_ESCRITURA≠1'); e.pendiente = true; return e }
// Los internos reales son makeAppointment/ (crear), estadoAppt/ (estado), + anular.
// El MAPEO exacto de campos se clava cuando llegue la captura de Ramón; hoy validan y
// registran, pero NO golpean Reservo hasta ESCRITURA_OK (prueba primero con cita de test).
// Resolver paciente por rut/nombre → id interno (person_id) + datos. Read-only (buscarAjaxPerson).
async function resolverPaciente(term) {
  const j = await internalJson('/pacienteDentista/buscarAjaxPerson/', 'POST', new URLSearchParams({ term: String(term || '') }).toString())
  return (Array.isArray(j) ? j : [])[0] || null
}
// Endpoint REAL de creación (CAPTURADO 2026-07-22 del botón "Reservar", intercept+abort, cero escritura):
//   POST /appointment/createAppt/  (antes NO se sabía; makeAppointment NO crea).
// Y previo dispara /appointment/ValidaTomaHora/ (chequeo "hora libre").
const CREAR_EP = process.env.RESERVO_CREAR_EP || '/appointment/createAppt/'
const VALIDA_EP = '/appointment/ValidaTomaHora/'
// Arma el body EXACTO de createAppt tal cual lo manda la web (orden/campos del Form Data capturado).
// servicio = id del box/agenda (37857-37863) que la app ya tiene de obtenerDisponibilidad (= b.agenda).
function buildCrearBody(b) {
  const [y, m, d] = String(b.fecha || '').split('-')
  const p = b.paciente_nuevo || {}
  return {
    person_id: b.person_id ? String(b.person_id) : '', cellphone: '',
    day: String(Number(d)), month: String(Number(m)), year: y,
    direccion: '', cliente: b.cliente ? String(b.cliente) : '', recursos: '',
    tiene_profesionales: '1', ver_codigo: '0', phone_feo: '', origen: '',
    rut: p.rut || '', name: p.nombre || '', app_paterno: p.apellido_paterno || '', app_materno: p.apellido_materno || '',
    phone_0: p.telefono ? 'CL' : 'CL', phone_1: p.telefono || '', mail: p.mail || '',
    hour: '', minute: '',
    profesionales: String(b.profesional_id ?? ''),
    servicio: String(b.agenda ?? b.servicio ?? ''),
    tratamientos: String(b.tratamiento_id ?? ''),
    comentario: b.comentario || '', antecedentes_personales: '',
    registrar: b.person_id ? '0' : (b.paciente_nuevo ? '1' : '0'),
    Nficha: '', sexo: '0', fecha_nacimiento: '', prevision: '', comuna: '', address: '', referencia: '', categoria: '', convenio: '',
    horaInicio: b.hora_inicio || b.hora || '', horaFin: b.hora_fin || '',
    view: 'viewAppt', sendmail: b.sendmail ? 'true' : 'false', phone: '',
  }
}
// CREAR cita. DEFAULT = simular (cero escritura): devuelve el body exacto que mandaría, sin tocar Reservo.
// Real solo con simular:false Y RESERVO_ESCRITURA=1 (blindaje: nunca a ciegas; certificar con cita de test).
async function accionCrearCita(b) {
  for (const k of ['fecha', 'profesional_id', 'tratamiento_id']) if (b[k] == null || b[k] === '') throw new Error('falta campo obligatorio: ' + k)
  if (!b.hora_inicio && !b.hora) throw new Error('falta campo obligatorio: hora_inicio')
  if (!b.person_id && !b.paciente_nuevo) throw new Error('falta paciente: pasá person_id (existente) o paciente_nuevo{rut,nombre,...}')
  if (b.agenda == null || b.agenda === '') throw new Error('falta campo obligatorio: agenda (id del box/servicio 37857-37863, viene de obtenerDisponibilidad)')
  const form = buildCrearBody(b)
  const simular = b.simular !== false
  if (simular) return { ok: true, simulado: true, endpoint: CREAR_EP, metodo: 'POST', form }
  if (!ESCRITURA_OK) throw pendienteCaptura(CREAR_EP)
  // 1) chequeo de disponibilidad (mismo que hace la web) → "hora ya tomada"
  const vparams = new URLSearchParams({ id: '', recursos: '', horaInicio: form.horaInicio, horaFin: form.horaFin, fecha: `${form.year}-${String(form.month).padStart(2, '0')}-${String(form.day).padStart(2, '0')}`, profesionales: form.profesionales, servicio: form.servicio })
  const val = await internalJson(VALIDA_EP, 'POST', vparams.toString())
  if (val && (val.disponible === false || val.error || /tomada|ocupad/i.test(JSON.stringify(val)))) return { ok: false, raw: { error: 'hora ya tomada', valida: val } }
  // 2) creación
  const j = await internalJson(CREAR_EP, 'POST', new URLSearchParams(form).toString())
  const okCreate = !!(j && j.uuid && j.id)   // createAppt OK devuelve {id, uuid, estado:"No Confirmado"}
  return { ok: okCreate, cita_id: j?.id || null, cita_uuid: j?.uuid || null, estado: j?.estado || null, raw: j }
}
// REAGENDAR (mover) cita. Mismo blindaje. El endpoint interno de edición se confirma en el test
// controlado (su handler vive en un bundle webpack, no en el HTML) → en simular se marca "por confirmar".
async function accionReagendarCita(b) {
  for (const k of ['cita_uuid', 'fecha']) if (!b[k]) throw new Error('falta campo obligatorio: ' + k)
  if (!b.hora_inicio && !b.hora) throw new Error('falta campo obligatorio: hora_inicio')
  const [y, m, d] = String(b.fecha).split('-')
  const form = { cita: String(b.cita_uuid), day: String(Number(d)), month: String(Number(m)), year: y, horaInicio: b.hora_inicio || b.hora, horaFin: b.hora_fin || '', ...(b.profesional_id ? { profesionales: String(b.profesional_id) } : {}) }
  const ep = '/appointment/editAppt/'
  const simular = b.simular !== false
  if (simular) return { ok: true, simulado: true, endpoint: ep + ' (por confirmar en el test)', metodo: 'POST', form }
  if (!ESCRITURA_OK) throw pendienteCaptura(ep)
  const j = await internalJson(ep, 'POST', new URLSearchParams(form).toString())
  return { ok: !!j, raw: j }
}
// ANULAR = estadoAppt con codigo=E (CERTIFICADO 2026-07-22: {id,status:"",codigo:"E"} → estado "Eliminado").
// Necesita el ID NUMÉRICO de la cita (el que devuelve crear), NO el uuid (estadoAppt no acepta uuid).
async function accionAnularCita(b) {
  const id = b.cita_id || b.id
  if (!id) throw new Error('falta campo obligatorio: cita_id (id numérico que devuelve crear; estadoAppt no usa uuid)')
  if (b.simular !== false) return { ok: true, simulado: true, endpoint: '/appointment/estadoAppt/', form: { id: String(id), status: '', codigo: 'E' } }
  if (!ESCRITURA_OK) throw pendienteCaptura('/appointment/estadoAppt/')
  const j = await internalJson('/appointment/estadoAppt/', 'POST', new URLSearchParams({ id: String(id), status: '', codigo: 'E' }).toString())
  return { ok: !!(j && /eliminad/i.test((j.estado || j.status || '') + '')), raw: j }
}
// Cambiar estado: codigo letra (E eliminado, C/3 confirmado, A/1 atendido…). Certificado con E.
async function accionEstadoCita(b) {
  const id = b.cita_id || b.id
  if (!id) throw new Error('falta campo obligatorio: cita_id')
  if (!b.codigo) throw new Error('falta campo obligatorio: codigo (E=eliminar, C=confirmar…)')
  if (b.simular !== false) return { ok: true, simulado: true, endpoint: '/appointment/estadoAppt/', form: { id: String(id), status: '', codigo: String(b.codigo) } }
  if (!ESCRITURA_OK) throw pendienteCaptura('/appointment/estadoAppt/')
  const j = await internalJson('/appointment/estadoAppt/', 'POST', new URLSearchParams({ id: String(id), status: '', codigo: String(b.codigo) }).toString())
  return { ok: !!j, raw: j }
}

// ── /r/reservar : fachada limpia con contrato uuid (la que pidió Ramón) ───────
// Traduce el mundo uuid (v2/agenda_online) al form interno de makeAppointment.
//  - profesional: uuid → id interno vía /cliente/list_profesional/ (uuid↔id). ✅
//  - tratamiento: v2 NO expone id interno (todo uuid). Se acepta tratamiento_id directo;
//    si viene uuid_tratamiento se intenta calzar por codigo/nombre (mapa best-effort).
//  - hora ISO (con offset) → fecha + horaInicio en la hora LOCAL que trae el string.
let _profMapCache = { ts: 0, byUuid: new Map() }
async function profMap() {
  if (Date.now() - _profMapCache.ts < 10 * 60 * 1000 && _profMapCache.byUuid.size) return _profMapCache.byUuid
  const profs = (await internalJson('/cliente/list_profesional/')) || []
  const m = new Map(); for (const p of profs) if (p.uuid) m.set(p.uuid, { id: p.id, nombre: p.nombre })
  _profMapCache = { ts: Date.now(), byUuid: m }; return m
}
function partirHoraISO(iso) {
  // "2026-07-23T16:00:00-04:00" → { fecha:"2026-07-23", hora:"16:00" } (respeta la hora local del string)
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/)
  if (!m) throw new Error('hora inválida: usá ISO tipo 2026-07-23T16:00:00-04:00')
  return { fecha: m[1], hora: m[2] }
}
function partirNombre(nom) {
  const p = String(nom || '').trim().split(/\s+/)
  if (p.length <= 1) return { name: p[0] || '', app_paterno: '', app_materno: '' }
  if (p.length === 2) return { name: p[0], app_paterno: p[1], app_materno: '' }
  // 3+: nombre = primero(s) hasta -2, apellidos = últimos 2
  return { name: p.slice(0, p.length - 2).join(' '), app_paterno: p[p.length - 2], app_materno: p[p.length - 1] }
}
async function reservarFacade(b) {
  const errores = []
  // profesional
  let profesional_id = b.profesional_id
  if (!profesional_id && b.uuid_profesional) { const pm = await profMap(); profesional_id = pm.get(b.uuid_profesional)?.id }
  if (!profesional_id) errores.push('no pude resolver el profesional (pasá uuid_profesional válido o profesional_id interno)')
  // tratamiento (sin puente uuid→id en la API: hoy requiere tratamiento_id interno)
  let tratamiento_id = b.tratamiento_id
  if (!tratamiento_id && b.uuid_tratamiento) errores.push('el tratamiento llega como uuid pero el form interno usa id numérico y la API v2 no expone ese id; pasá tratamiento_id (o habilitamos el mapa con el test controlado)')
  else if (!tratamiento_id) errores.push('falta tratamiento (uuid_tratamiento o tratamiento_id)')
  // hora
  let fecha, hora
  try { ({ fecha, hora } = partirHoraISO(b.hora)) } catch (e) { errores.push(e.message) }
  // cliente: por rut → person_id; si no existe, paciente nuevo
  const cli = b.cliente || {}
  let person_id = b.person_id, paciente_nuevo = null
  // OJO: buscarAjaxPerson es fuzzy y devuelve la 1ª fila aunque NO calce → exigir rut EXACTO
  // (jamás agendar sobre el paciente equivocado).
  const rutNorm = (r) => String(r || '').replace(/[.\-\s]/g, '').toLowerCase()
  if (!person_id && cli.rut) { const p = await resolverPaciente(cli.rut); if (p && p.id && rutNorm(p.rut) && rutNorm(p.rut) === rutNorm(cli.rut)) person_id = p.id }
  if (!person_id) {
    if (!cli.nombre) errores.push('falta cliente.nombre (o person_id) para registrar el paciente')
    else { const nm = partirNombre(cli.nombre); paciente_nuevo = { rut: cli.rut || '', nombre: nm.name, apellido_paterno: nm.app_paterno, apellido_materno: nm.app_materno, telefono: (cli.telefono || '').replace(/^\+?56/, ''), mail: cli.email || '' } }
  }
  if (errores.length) return { ok: false, error: errores.join(' | ') }
  const out = await accionCrearCita({
    fecha, hora_inicio: hora, hora_fin: b.hora_fin || '', profesional_id, tratamiento_id,
    ...(person_id ? { person_id } : { paciente_nuevo }), sendmail: !!b.sendmail,
    agenda: b.agenda, simular: b.simular,
  })
  if (out.simulado) return { ok: true, simulado: true, estado: 'NC', form: out.form, endpoint: out.endpoint }
  if (out.ok) return { ok: true, cita_id: out.cita_id, cita_uuid: out.cita_uuid, estado: 'NC' }
  return { ok: false, error: out.raw?.error || out.raw?.mensaje || 'no se pudo crear la cita' }
}

// Pre-calienta las consultas que la app pide siempre (mes actual + anterior).
function mesRango(off = 0) { const n = new Date(); const ini = new Date(n.getFullYear(), n.getMonth() + off, 1); const fin = new Date(n.getFullYear(), n.getMonth() + off + 1, 0); const f = (d) => d.toISOString().slice(0, 10); return `fecha_inicial=${f(ini)}&fecha_final=${f(fin)}` }
async function warm() {
  const jobs = [
    ['citas/', new URLSearchParams(mesRango(0))], ['citas/', new URLSearchParams(mesRango(-1))],
    ['ventas/', new URLSearchParams(mesRango(0))], ['ventas/', new URLSearchParams(mesRango(-1))],
    ['planes/', new URLSearchParams()], ['cliente/', new URLSearchParams()],
  ]
  for (const [ep, params] of jobs) { const ck = 'ALL:' + ep + '?' + params.toString(); await buildAll(ep, params, ck).catch(() => {}) }
  log(`caché pre-calentada (${jobs.length} datasets completos)`)
}

// ── Servidor HTTP ────────────────────────────────────────────────────────────
function autorizado(req, url) { const t = req.headers['x-token'] || url.searchParams.get('token') || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, ''); return t === TOKEN }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const send = (code, obj, ct = 'application/json') => { res.writeHead(code, { 'Content-Type': ct }); res.end(typeof obj === 'string' ? obj : JSON.stringify(obj)) }
  // Detrás de Tailscale Funnel se sirve bajo /reservo → lo sacamos para rutear igual.
  let pn = url.pathname
  if (pn.startsWith('/reservo/')) pn = pn.slice(8); else if (pn === '/reservo') pn = '/'

  if (pn === '/health') {
    if (!autorizado(req, url)) return send(200, { ok: true })   // sin token: nada de sesión (no filtrar info)
    const viva = await sesionViva()
    return send(200, { ok: true, sesion_viva: viva, need2fa: sess.need2fa, ultimo_login: sess.ts ? new Date(sess.ts).toISOString() : null, token_fijo: true })
  }
  if (!autorizado(req, url)) return send(401, { error: 'token inválido (X-Token)', endpoint: pn })

  // ── /r/reservar : contrato limpio uuid → crea cita (fachada de accionCrearCita) ──
  if (pn === '/r/reservar' || pn === '/r/reservar/') {
    if (req.method !== 'POST') return send(405, { ok: false, error: 'usá POST' })
    let b = {}
    try { const raw = (await leerBody(req)).toString('utf8').trim(); b = raw ? JSON.parse(raw) : {} } catch { return send(400, { ok: false, error: 'el body debe ser JSON' }) }
    const quien = req.headers['x-actor'] || req.socket.remoteAddress || 'desconocido'
    try {
      const out = await reservarFacade(b)
      auditar('reservar', { quien, ip: req.socket.remoteAddress, body: b, simulado: !!out.simulado, ok: out.ok, cita_uuid: out.cita_uuid || null, error: out.error || null })
      return send(out.ok ? 200 : (out.error && /obligatorio|resolver|falta|inválid|uuid/.test(out.error) ? 400 : 200), out)
    } catch (e) {
      auditar('reservar', { quien, ip: req.socket.remoteAddress, body: b, error: e.message })
      return send(e.pendiente ? 501 : 500, { ok: false, error: e.message.slice(0, 200) })
    }
  }

  // ── data2 ESCRITURA: /r/data2/cita/{crear,anular,estado}/ (POST + auditoría) ──
  if (pn.startsWith('/r/data2/cita/')) {
    const accion = pn.slice('/r/data2/cita/'.length).replace(/\/+$/, '')   // crear|anular|estado
    if (req.method !== 'POST') return send(405, { error: 'usá POST', endpoint: pn })
    let b = {}
    try { const raw = (await leerBody(req)).toString('utf8').trim(); b = raw ? JSON.parse(raw) : {} } catch { return send(400, { error: 'el body debe ser JSON', endpoint: pn }) }
    const quien = req.headers['x-actor'] || req.socket.remoteAddress || 'desconocido'
    try {
      let out
      if (accion === 'crear') out = await accionCrearCita(b)
      else if (accion === 'reagendar') out = await accionReagendarCita(b)
      else if (accion === 'anular') out = await accionAnularCita(b)
      else if (accion === 'estado') out = await accionEstadoCita(b)
      else return send(404, { error: 'acción inválida (crear|reagendar|anular|estado)', endpoint: pn })
      auditar(accion, { quien, ip: req.socket.remoteAddress, body: b, simulado: !!out.simulado, ok: out.ok, cita_uuid: out.cita_uuid || b.cita_uuid || null })
      return send(out.ok ? 200 : 502, out)
    } catch (e) {
      auditar(accion, { quien, ip: req.socket.remoteAddress, body: b, error: e.message })
      const code = e.pendiente ? 501 : /^falta campo/.test(e.message) ? 400 : 502
      return send(code, { error: e.message.slice(0, 180), endpoint: pn })
    }
  }

  // ── data2: endpoints DERIVADOS (plata/ocupación calculados) ──────────────────
  if (pn.startsWith('/r/data2/')) {
    const sub = pn.slice('/r/data2/'.length)
    const mes = url.searchParams.get('mes') || new Date().toISOString().slice(0, 7)
    const fecha = url.searchParams.get('fecha') || new Date().toISOString().slice(0, 10)
    const pagina = url.searchParams.get('pagina')
    const desde = url.searchParams.get('desde'), hasta = url.searchParams.get('hasta')
    const rango = (desde && hasta) ? { desde, hasta } : null
    if (url.searchParams.has('mes') && !/^\d{4}-\d{2}$/.test(mes)) return send(400, { error: 'mes inválido, usá YYYY-MM', endpoint: pn })
    // OJO: la clave DEBE incluir pagina + con_email, si no todas las páginas colisionan
    // en la caché y ?pagina=N devuelve siempre la primera (bug de paginación de pacientes).
    const clave = sub + ':' + mes + ':' + fecha + ':' + (rango ? desde + '_' + hasta : '') + ':p' + (pagina || '1') + ':' + (url.searchParams.get('con_email') === '1' ? 'e1' : '')
    const ck = 'D2:' + clave
    const ce = cacheData.get(ck)
    // mes actual = TTL corto (cambia durante el día); meses cerrados = caché largo.
    const ttl = /bloqueos|caja|comisiones|deuda|ventas|ocupacion|nuevos_pacientes|atenciones|citas_por_estado|gastos/.test(sub) ? ttlFor(mes) : CACHE_TTL
    if (ce && Date.now() - ce.ts < ttl) return sendGz(req, res, 200, 'application/json', 'HIT', ce.body, ce)
    try {
      let data, esLista = true
      if (sub === 'caja/') data = await d2_caja(mes)
      else if (sub === 'comisiones/') data = await d2_comisiones(mes)
      else if (sub === 'deuda/') data = await d2_deuda(mes)
      else if (sub === 'agendas/') data = await d2_agendas()
      else if (sub === 'tratamientos/') data = await d2_tratamientos()
      else if (sub === 'cumpleanos/') data = await d2_cumpleanos(fecha)
      else if (sub === 'pacientes/') data = await d2_pacientes(url.searchParams.get('con_email') === '1')
      else if (sub === 'estado_resultado/') data = await d2_estado_resultado()
      else if (sub === 'ocupacion_personal_box/') { data = await d2_dashboard('ocupacion_personal_box/', mes, rango); esLista = false }
      else if (sub === 'nuevos_pacientes/') { data = await d2_dashboard('nuevos_pacientes/', mes, rango); esLista = false }
      else if (sub === 'atenciones_por_profesional/') { data = await d2_dashboard('atenciones_por_profesional/', mes, rango); esLista = false }
      else if (sub === 'citas_por_estado/') { data = await d2_dashboard('citas_por_estado/', mes, rango); esLista = false }
      else if (sub === 'gastos_por_categoria/') { data = await d2_dashboard('gastos_por_categoria/', mes, rango); esLista = false }
      else if (sub === 'bloqueos/') { data = await d2_bloqueos(mes); esLista = false }   // dict por agenda, no wrap
      else if (/^paciente\/[0-9a-f-]+\/$/i.test(sub)) { data = await d2_paciente(sub.split('/')[1]); esLista = false }
      else if (/^paciente\/[0-9a-f-]+\/historial\/$/i.test(sub)) data = await d2_historial(sub.split('/')[1])
      else return send(404, { error: 'data2 aún no implementado: ' + sub, endpoint: pn, disponibles: ['caja/', 'comisiones/', 'deuda/', 'agendas/', 'bloqueos/', 'cumpleanos/', 'pacientes/', 'estado_resultado/', 'ocupacion_personal_box/', 'nuevos_pacientes/', 'atenciones_por_profesional/', 'citas_por_estado/', 'gastos_por_categoria/', 'paciente/{uuid}/', 'paciente/{uuid}/historial/'] })
      const out = esLista ? wrapList(data, pagina, PUBLIC_BASE + '/r/data2/' + sub + (url.search || '')) : data
      const body = JSON.stringify(out)
      cacheData.set(ck, { status: 200, ct: 'application/json', body, ts: Date.now() })
      return sendGz(req, res, 200, 'application/json', 'MISS', body, null)
    } catch (e) { return send(e.noEncontrado ? 404 : 502, { error: 'data2 ' + sub + ': ' + e.message.slice(0, 120), endpoint: pn }) }
  }

  // ── API PÚBLICA v2 (limpia, estructura oficial): /r/data/<endpoint>/ ──────────
  // Reenvía a reservo.cl/APIpublica/v2/ con el token OFICIAL y reescribe la paginación
  // para que apunte de vuelta al proxy. La app la consume sin cambios.
  if (pn.startsWith('/r/data/')) {
    if (!API_TOKEN) return send(503, { error: 'falta RESERVO_API_TOKEN (token oficial v2)' })
    const ep = pn.slice('/r/data/'.length)   // "citas/"
    // Modo TODO en 1 request: ?all=1 → junta todas las páginas (rapidísimo para la app).
    if (url.searchParams.get('all') === '1') {
      const params = new URLSearchParams(url.search); params.delete('all')
      const ck = 'ALL:' + ep + '?' + params.toString()
      const s2 = (e, cache) => sendGz(req, res, e.status, e.ct, cache, e.body, e)
      const c = cacheData.get(ck)
      if (c && Date.now() - c.ts < CACHE_TTL) return s2(c, 'HIT')
      if (c) { buildAll(ep, params, ck).catch(() => {}); return s2(c, 'STALE') }
      try { return s2(await buildAll(ep, params, ck), 'MISS') } catch (e) { return send(e.tooLarge ? 413 : 502, { error: 'API v2 all: ' + e.message.slice(0, 160), endpoint: pn, sugerencia: e.tooLarge ? 'agregá ?fecha_inicial=YYYY-MM-DD&fecha_final=YYYY-MM-DD' : undefined }) }
    }
    // Paginado normal (1 página), con reescritura de la paginación al servir.
    const key = ep + (url.search || '')
    const serve = (e, cache) => sendGz(req, res, e.status, e.ct, cache, rewrite(e.body, e.ct), null)
    const c = cacheData.get(key)
    if (c && Date.now() - c.ts < CACHE_TTL) return serve(c, 'HIT')
    if (c) { fetchV2(key).catch(() => {}); return serve(c, 'STALE') }
    try { return serve(await fetchV2(key), 'MISS') } catch (e) { return send(502, { error: 'API v2: ' + e.message.slice(0, 100) }) }
  }

  // Proxy autenticado al APP INTERNO: /r/<ruta reservo> (sesión, hace TODO lo del app)
  if (pn.startsWith('/r/')) {
    const ruta = pn.slice(2) + (url.search || '')   // /r/appointment/... → /appointment/...
    // Revalidación PEREZOSA: no chequeamos la sesión en cada request (lento). Solo
    // logueamos si nunca hubo sesión; si muere a mitad, el reintento de abajo la renueva.
    if (!sess.sessionid && !(await login())) return send(503, { error: sess.need2fa ? 'Reservo pide 2FA — reactiva la sesión desde el navegador' : 'no pude iniciar sesión en Reservo' })
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await leerBody(req)
    const doFetch = () => fetch(BASE + ruta, {
      method: req.method,
      headers: { 'User-Agent': UA, Cookie: cookieHeader(), 'X-CSRFToken': sess.csrftoken, 'X-Requested-With': 'XMLHttpRequest', 'Referer': BASE + '/appointment/viewAppt/', ...(body ? { 'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded' } : {}) },
      body, redirect: 'manual',
    })
    let r = await doFetch()
    // 🔁 Sesión murió (Reservo redirige a /accounts/login/) → REGENERA una nueva y reintenta.
    if (r.status >= 300 && r.status < 400 && /accounts\/login/.test(r.headers.get('location') || '')) {
      log('sesión caducada detectada en request → regenerando token de Reservo…')
      if (await login()) r = await doFetch()
      else return send(503, { error: sess.need2fa ? 'Reservo pide 2FA — reactiva desde el navegador' : 'no pude regenerar la sesión de Reservo' })
    }
    const buf = Buffer.from(await r.arrayBuffer())
    res.writeHead(r.status, { 'Content-Type': r.headers.get('content-type') || 'application/octet-stream' })
    return res.end(buf)
  }
  send(404, { error: 'usa /health o /r/<ruta-reservo>' })
})
function leerBody(req) { return new Promise(r => { const ch = []; req.on('data', d => ch.push(d)); req.on('end', () => r(Buffer.concat(ch))) }) }

// ── BLINDAJE: que NUNCA se caiga por un error no capturado ────────────────────
process.on('uncaughtException', (e) => { try { log('uncaughtException (ignorado, sigo vivo): ' + (e?.stack || e?.message || e).toString().slice(0, 200)) } catch {} })
process.on('unhandledRejection', (e) => { try { log('unhandledRejection (ignorado): ' + (e?.message || e).toString().slice(0, 200)) } catch {} })
server.on('clientError', (e, socket) => { try { socket.destroy() } catch {} })   // requests malformados no tumban el server

cargar()
cargarCacheDisco()   // ⚡ arranque en CALIENTE: data servida al instante desde la última caché
server.listen(PORT, '127.0.0.1', () => log(`conector-reservo escuchando en 127.0.0.1:${PORT} (token fijo)`))
// keep-warm: cada 3h revisa la sesión y re-loguea si murió
setInterval(() => { ensure().catch(() => {}) }, 3 * 3600_000)
ensure().catch(() => {})
// Pre-calentar la caché v2: refresca en segundo plano (rápido si ya cargó de disco) y cada TTL.
if (API_TOKEN) { setTimeout(() => warm().catch(() => {}), 1500); setInterval(() => warm().catch(() => {}), CACHE_TTL) }
// Persistir la caché a disco: periódica + al salir → el próximo reinicio arranca caliente.
setInterval(guardarCacheDisco, 120_000)
for (const sig of ['SIGTERM', 'SIGINT', 'exit']) process.on(sig, () => { try { guardarCacheDisco() } catch {} })

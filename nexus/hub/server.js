// server.js — Daemon del Hub Nexus.
// Sirve el panel React compilado (dist/) y expone una API local:
//   GET  /api/health           estado real de cada servicio (check server-side)
//   POST /api/restart/:label   reinicia un daemon vía launchctl
//   GET  /api/agents           última actividad de agentes (Supabase)
//   GET  /api/log              últimas acciones para auditoría (Supabase)
//   GET  /api/consumo          consumo de API del mes (Supabase)
// Escucha SOLO en 127.0.0.1 (+ interfaz Tailscale si se indica). Nunca 0.0.0.0 público.

import express from 'express'
import { connect as netConnect } from 'node:net'
import { execFile, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, readFileSync, writeFileSync, chmodSync, mkdirSync, copyFileSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { registrar } from '../registrador-consumo/registrar.mjs'
import * as recordatorios from './recordatorios.mjs'
import * as histDB from './historial.mjs'
import * as vista from './vista.mjs'
import * as kapso from './kapso.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- Cargar el .env compartido de ~/nexus/.env ---
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* opcional */ }

// Refresco del contador de consumo: recalcula desde las trazas de OpenClaw,
// como máximo 1 vez cada 5 min (se dispara al abrir el panel; sin daemon aparte).
let _ultimoRefrescoConsumo = 0
async function refrescarConsumo() {
  if (Date.now() - _ultimoRefrescoConsumo < 5 * 60 * 1000) return
  _ultimoRefrescoConsumo = Date.now()
  try { await registrar() } catch (e) { console.error('[consumo] refresco falló:', e.message) }
}

const PORT = Number(process.env.PUERTO_HUB || 3000)
const HOST = process.env.HUB_HOST || '127.0.0.1'

// --- Catálogo de servicios a vigilar ---
// core=true: servicio base, siempre se monitorea. Para los demás, "desplegado"
// se decide según si su carpeta tiene un package.json (repo clonado).
const SERVICIOS = [
  { id: 'hub',        nombre: 'Hub Nexus',     puerto: Number(process.env.PUERTO_HUB || 3000),        ruta: '/api/ping', label: 'com.nexus.hub',        core: true },
  { id: 'openclaw',   nombre: 'OpenClaw',      puerto: Number(process.env.PUERTO_OPENCLAW || 18789),  ruta: '/health',   label: 'com.nexus.openclaw',   core: true },
  { id: 'sii',        nombre: 'Conector SII',  puerto: Number(process.env.PUERTO_SII_WEB || 8000),    ruta: '/',         label: 'com.nexus.sii-web',    core: true },
  { id: 'cerebro',    nombre: 'Segundo Cerebro', puerto: Number(process.env.PUERTO_CEREBRO || 8081),  ruta: '/health',   label: 'com.nexus.cerebro',    dir: 'conector-obsidian' },
  { id: 'navegador',  nombre: 'Conector Navegador', puerto: Number(process.env.PUERTO_NAVEGADOR || 8082), ruta: '/health', label: 'com.nexus.navegador', dir: 'conector-navegador' },
]
const PUERTO_CEREBRO = Number(process.env.PUERTO_CEREBRO || 8081)
function estaDesplegado(s) {
  if (s.core) return true
  try { return existsSync(join(__dirname, '..', s.dir, 'package.json')) } catch { return false }
}

// --- Supabase (opcional: si no hay credenciales, el Hub degrada con elegancia) ---
let supa = null
const SUPA_URL = process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
if (SUPA_URL && SUPA_KEY) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    supa = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } })
  } catch (e) { console.error('No se pudo inicializar Supabase:', e.message) }
}

// --- Helpers ---
// Comprueba si un puerto TCP acepta conexión (rápido, sin depender de rutas HTTP).
function checkPort(host, port, timeout = 1500) {
  return new Promise((resolve) => {
    let done = false
    const s = netConnect(port, host)
    const finish = (ok) => { if (!done) { done = true; try { s.destroy() } catch {} ; resolve(ok) } }
    s.setTimeout(timeout)
    s.once('connect', () => finish(true))
    s.once('timeout', () => finish(false))
    s.once('error', () => finish(false))
  })
}

// Uptime de un daemon a partir de su PID en launchctl + ps etime.
function daemonInfo(label) {
  return new Promise((resolve) => {
    execFile('launchctl', ['list'], (err, stdout) => {
      if (err) return resolve({ cargado: false, pid: null, uptime: null })
      const line = stdout.split('\n').find((l) => l.includes(label))
      if (!line) return resolve({ cargado: false, pid: null, uptime: null })
      const pid = line.trim().split(/\s+/)[0]
      if (pid === '-' || !/^\d+$/.test(pid)) return resolve({ cargado: true, pid: null, uptime: null })
      execFile('ps', ['-o', 'etime=', '-p', pid], (e2, out2) => {
        resolve({ cargado: true, pid: Number(pid), uptime: (out2 || '').trim() || null })
      })
    })
  })
}

const app = express()
// Guardamos el body CRUDO para verificar la firma HMAC de los webhooks de Kapso
// (la firma se calcula sobre los bytes exactos, antes de parsear el JSON).
app.use(express.json({ limit: '2mb', verify: (req, _res, buf) => { req.rawBody = buf } }))

// Ping propio (para que el Hub se vea a sí mismo "activo").
app.get('/api/ping', (_req, res) => res.json({ ok: true, ts: Date.now() }))

// ─── Conectar Gmail de Nexus (OAuth de Google) ──────────────────────────────
const GOOGLE_DIR = join(__dirname, '..', 'conector-correo', 'google')
const GCLIENT_PATH = join(GOOGLE_DIR, 'oauth-client.json')
const GTOKEN_PATH = join(GOOGLE_DIR, 'token.json')
const GSCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email'
const HUB_PORT = Number(process.env.PUERTO_HUB || 3000)
const GREDIRECT = `http://localhost:${HUB_PORT}/api/google/callback`
function gClient() {
  const j = JSON.parse(readFileSync(GCLIENT_PATH, 'utf8'))
  return j.installed || j.web || {}
}

// Estado: ¿hay un Gmail conectado?
app.get('/api/google/status', (_req, res) => {
  try {
    if (!existsSync(GTOKEN_PATH)) return res.json({ conectado: false })
    const t = JSON.parse(readFileSync(GTOKEN_PATH, 'utf8'))
    res.json({ conectado: Boolean(t.refresh_token), email: t.email || null, desde: t.creado || null })
  } catch { res.json({ conectado: false }) }
})

// Inicia el flujo: redirige a Google para iniciar sesión y dar permiso.
app.get('/api/google/connect', (_req, res) => {
  try {
    const c = gClient()
    if (!c.client_id) return res.status(400).send('Falta oauth-client.json de Google.')
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: c.client_id, redirect_uri: GREDIRECT, response_type: 'code',
      scope: GSCOPES, access_type: 'offline', prompt: 'consent',
    }).toString()
    res.redirect(url)
  } catch (e) { res.status(500).send('Error: ' + e.message) }
})

// Callback: intercambia el código por tokens y guarda el refresh_token.
app.get('/api/google/callback', async (req, res) => {
  const page = (titulo, cuerpo) => `<html><body style="font-family:system-ui;background:#0b1020;color:#cfe3ff;padding:48px;text-align:center"><h2>${titulo}</h2><p>${cuerpo}</p></body></html>`
  try {
    const code = req.query.code
    if (!code) return res.status(400).send(page('❌ Falta el código', 'Reintenta desde el panel.'))
    const c = gClient()
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code), client_id: c.client_id, client_secret: c.client_secret,
        redirect_uri: GREDIRECT, grant_type: 'authorization_code',
      }).toString(),
    })
    const tok = await r.json()
    if (!tok.access_token) return res.status(400).send(page('❌ No se pudo conectar', String(tok.error_description || tok.error || 'token vacío')))
    let email = null
    try {
      const ui = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: 'Bearer ' + tok.access_token } })
      email = (await ui.json()).email || null
    } catch { /* opcional */ }
    writeFileSync(GTOKEN_PATH, JSON.stringify({ ...tok, email, creado: new Date().toISOString() }, null, 2))
    try { chmodSync(GTOKEN_PATH, 0o600) } catch { /* best-effort */ }
    res.send(page('✅ Gmail conectado' + (email ? ` (${email})` : ''), 'Ya puedes cerrar esta pestaña. Nexus podrá leer los correos de Plaud.'))
  } catch (e) { res.status(500).send(page('❌ Error', e.message)) }
})

// URL del chat web de OpenClaw (Control UI), con token leído del config del lado servidor.
app.get('/api/openclaw-chat', (_req, res) => {
  try {
    const cfgPath = join(process.env.HOME || '', '.openclaw', 'openclaw.json')
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
    const port = cfg?.gateway?.port || 18789
    const token = cfg?.gateway?.auth?.token
    const url = token
      ? `http://127.0.0.1:${port}/#token=${token}`
      : `http://127.0.0.1:${port}/`
    res.json({ url })
  } catch (e) {
    res.json({ url: 'http://127.0.0.1:18789/', error: e.message })
  }
})

// Catálogo de enlaces (SII, internos, conocimiento) — editable en ~/nexus/enlaces.json.
app.get('/api/enlaces', (_req, res) => {
  try {
    const raw = readFileSync(join(__dirname, '..', 'enlaces.json'), 'utf8')
    res.json({ configurado: true, ...JSON.parse(raw) })
  } catch (e) {
    res.json({ configurado: false, grupos: [], error: e.message })
  }
})

// --- Proxy al Segundo Cerebro (conector-obsidian) ---
// Evita CORS: el navegador habla solo con el Hub; el Hub reenvía al daemon local.
const CEREBRO_BASE = `http://127.0.0.1:${PUERTO_CEREBRO}`
// Estado del cerebro para el panel: ¿activo?, nº de notas, última actualización
// y las notas modificadas más recientemente ("cómo va").
app.get('/api/cerebro/estado', async (_req, res) => {
  try {
    const [h, l] = await Promise.all([
      fetch(`${CEREBRO_BASE}/health`).then((r) => r.json()),
      fetch(`${CEREBRO_BASE}/listar`).then((r) => r.json()).catch(() => ({ notas: [] })),
    ])
    const notas = Array.isArray(l.notas) ? l.notas : []
    const recientes = [...notas]
      .sort((a, b) => (b.modificado || 0) - (a.modificado || 0))
      .slice(0, 8)
      .map((n) => ({ ruta: n.ruta, titulo: n.titulo, modificado: n.modificado, bytes: n.bytes }))
    res.json({
      ok: true, activo: true, raiz: h.raiz || l.raiz || null,
      notas: Number.isFinite(h.notas) ? h.notas : notas.length,
      ultima: recientes[0]?.modificado || null, recientes,
    })
  } catch (e) {
    res.status(502).json({ ok: false, activo: false, error: e.message, notas: 0, recientes: [] })
  }
})
app.get('/api/cerebro/buscar', async (req, res) => {
  try {
    const q = encodeURIComponent(String(req.query.q || ''))
    const r = await fetch(`${CEREBRO_BASE}/buscar?q=${q}&limite=${Number(req.query.limite || 15)}`)
    res.json(await r.json())
  } catch (e) { res.status(502).json({ error: 'cerebro no disponible', detalle: e.message, resultados: [] }) }
})
app.get('/api/cerebro/nota', async (req, res) => {
  try {
    const ruta = encodeURIComponent(String(req.query.ruta || ''))
    const r = await fetch(`${CEREBRO_BASE}/nota?ruta=${ruta}`)
    res.status(r.status).json(await r.json())
  } catch (e) { res.status(502).json({ error: 'cerebro no disponible', detalle: e.message }) }
})
app.post('/api/cerebro/nota', async (req, res) => {
  try {
    const r = await fetch(`${CEREBRO_BASE}/nota`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autor: 'hub', ...req.body }),
    })
    res.status(r.status).json(await r.json())
  } catch (e) { res.status(502).json({ error: 'cerebro no disponible', detalle: e.message }) }
})

// --- Explorador de la base de datos Supabase (solo lectura, loopback) ---
// La service_role key NUNCA sale al navegador: el Hub consulta y devuelve solo filas.
const SUPA_REST = SUPA_URL ? SUPA_URL.replace(/\/$/, '') + '/rest/v1' : null
let _tablasCache = null
async function listarTablas() {
  if (_tablasCache) return _tablasCache
  if (!SUPA_REST) return []
  const r = await fetch(SUPA_REST + '/', { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY } })
  const spec = await r.json()
  const defs = spec.definitions || spec.components?.schemas || {}
  _tablasCache = Object.keys(defs).sort()
  return _tablasCache
}

app.get('/api/datos/tablas', async (_req, res) => {
  if (!SUPA_REST) return res.json({ configurado: false, tablas: [] })
  try {
    const tablas = await listarTablas()
    res.json({ configurado: true, total: tablas.length, tablas })
  } catch (e) { res.json({ configurado: true, error: e.message, tablas: [] }) }
})

app.get('/api/datos/tabla', async (req, res) => {
  if (!SUPA_REST) return res.json({ configurado: false, filas: [] })
  try {
    const nombre = String(req.query.nombre || '')
    const tablas = await listarTablas()
    if (!tablas.includes(nombre)) return res.status(400).json({ error: 'tabla desconocida' })
    const limite = Math.min(Number(req.query.limite || 50), 500)
    const q = String(req.query.q || '').trim()
    let url = `${SUPA_REST}/${encodeURIComponent(nombre)}?select=*&limit=${limite}`
    // Búsqueda libre: intenta sobre columnas de texto comunes si se pasa q (opcional, best-effort).
    const r = await fetch(url, {
      headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, Prefer: 'count=exact', Range: `0-${limite - 1}` },
    })
    const filas = await r.json()
    const cr = r.headers.get('content-range') || ''
    const total = cr.split('/')[1] || (Array.isArray(filas) ? filas.length : 0)
    const columnas = Array.isArray(filas) && filas[0] ? Object.keys(filas[0]) : []
    res.json({ configurado: true, nombre, total: Number(total) || 0, columnas, filas: Array.isArray(filas) ? filas : [] })
  } catch (e) { res.status(500).json({ error: e.message, filas: [] }) }
})

// --- Asistente IA (chat) ---
let _responder = null
async function getResponder() {
  if (_responder) return _responder
  const mod = await import('./asistente.mjs')
  _responder = mod.responder
  return _responder
}
// Envío de NOTA DE VOZ (para responder por audio cuando el usuario mandó un audio).
let _enviarVoz = null
async function getEnviarVoz() {
  if (_enviarVoz) return _enviarVoz
  const mod = await import('./asistente.mjs')
  _enviarVoz = mod.enviarAudioWhatsApp
  return _enviarVoz
}
// Transcribe un audio (URL de Kapso) con el Whisper local (127.0.0.1:8083). Respaldo
// por si Kapso no mandó el transcript en el webhook. Devuelve '' si no se pudo.
async function transcribirAudioURL(url) {
  try {
    if (!url) return ''
    const a = await fetch(url, { headers: { 'X-API-Key': process.env.KAPSO_API_KEY || '' } })
    if (!a.ok) return ''
    const ab = await a.arrayBuffer()
    const fd = new FormData()
    fd.append('file', new Blob([Buffer.from(ab)], { type: 'audio/ogg' }), 'voz.ogg')
    const r = await fetch(`http://127.0.0.1:${process.env.PUERTO_TRANSCRIBE || 8083}/v1/audio/transcriptions`, { method: 'POST', body: fd })
    if (!r.ok) return ''
    const j = await r.json().catch(() => null)
    return String(j?.text || '').trim()
  } catch { return '' }
}
// Memoria de conversación POR REMITENTE (multi-turno). El puente (preguntar.mjs)
// manda solo el mensaje actual; sin esto el cerebro no recuerda nada y se pierde en
// flujos de varios pasos (ej. SII: "RCV" → "ambas" → "enero a mayo"). Guardamos los
// últimos turnos en memoria, con expiración para no arrastrar conversaciones viejas.
const _memoria = new Map()           // de -> { msgs:[{role,content}], ts }
const MEM_TTL = 30 * 60 * 1000       // 30 min sin hablar => arranca limpio
const MEM_MAX = 16                   // últimos 16 turnos

// Rehidrata la conversación desde historial.db cuando la memoria en RAM está vacía
// (típico tras un REINICIO del hub). Sin esto, un "emítela" después de reiniciar se
// queda SIN el borrador que se creó antes → el asistente vuelve a pedir el borrador o
// dice "no tengo nada pendiente". Trae los últimos mensajes RECIENTES (dentro del TTL,
// para respetar el "arranca limpio si pasó mucho") y los mapea a {role,content}.
function rehidratarMemoria(de, canal) {
  try {
    if (!de) return []
    const lim = Date.now() - MEM_TTL
    const filas = histDB.recientes({ canal, contraparte: de, limite: MEM_MAX * 2 }) || []
    return filas
      .filter((f) => {
        if (!f.texto || (f.direccion !== 'entrante' && f.direccion !== 'saliente')) return false
        const t = Date.parse(f.ts)
        return Number.isFinite(t) ? t >= lim : true
      })
      .map((f) => ({ role: f.direccion === 'saliente' ? 'assistant' : 'user', content: String(f.texto) }))
      .slice(-MEM_MAX)
  } catch { return [] }
}

// Push de texto por WhatsApp (para respuestas largas que se entregan async).
// Ahora vía Kapso (WhatsApp Cloud API oficial). Antes era OpenClaw/Baileys, que
// baneaba el número (memoria whatsapp-baneo-por-autorespuesta) → retirado.
function enviarTextoWhatsApp(target, texto) {
  return kapso.enviarKapso(target, texto)
}
// ≤ACK_MS → UN SOLO mensaje con la respuesta. Si tarda más, manda un ACUSE
// ("dame un momento") y empuja la respuesta después = el usuario recibe DOS mensajes.
//
// Con Kapso (Cloud API) el acuse casi nunca hace falta: el webhook ya devolvió 200 al
// toque (no hay timeout de puente que temer, como sí lo había con OpenClaw) y además
// marcamos "escribiendo…" apenas llega el mensaje, así que el usuario YA ve que estamos
// trabajando. Por eso subimos el umbral: preferimos esperar y mandar UNA sola respuesta
// buena antes que ensuciar el chat con un "dame un momento" + la respuesta.
// OJO: WhatsApp apaga el indicador "escribiendo…" ~25s, así que este es el techo útil.
const ACK_MS = Number(process.env.ACK_MS || 25000)

// Caché de adjuntos: subir un auto es conversacional (foto → preguntas → confirmar →
// crear), y eso puede tardar minutos. OpenClaw podría limpiar ~/.openclaw/media/inbound
// en ese rato. Para NO perder la foto al crear, copiamos los archivos recibidos a una
// caché propia del Hub apenas llegan; los paths cacheados son estables (se purgan a 24h).
const MEDIA_CACHE = join(__dirname, '.media-cache')
function cachearMedia(paths) {
  const out = []
  try { mkdirSync(MEDIA_CACHE, { recursive: true }) } catch { /* ya existe */ }
  // Purga archivos viejos (>24h) para no acumular.
  try {
    const lim = Date.now() - 24 * 60 * 60 * 1000
    for (const f of readdirSync(MEDIA_CACHE)) {
      const p = join(MEDIA_CACHE, f)
      try { if (statSync(p).mtimeMs < lim) unlinkSync(p) } catch { /* ignore */ }
    }
  } catch { /* sin caché aún */ }
  for (const src of paths) {
    try {
      if (!existsSync(src)) { out.push(src); continue }   // si no existe, deja el original
      const base = src.split('/').pop().replace(/[^\w.-]/g, '_')
      const dst = join(MEDIA_CACHE, `${Date.now()}_${base}`)
      copyFileSync(src, dst)
      out.push(dst)
    } catch { out.push(src) }   // si falla la copia, usa el original (mejor que nada)
  }
  return out
}

app.post('/api/chat', async (req, res) => {
  try {
    const de = req.body?.de || ''
    // Canal de origen: 'desktop'/web responde EN LA APP (nunca empuja a WhatsApp).
    const esWeb = req.body?.web === true || req.body?.canal === 'desktop'
    const canalHist = esWeb ? 'desktop' : 'whatsapp'
    const historial = req.body?.historial || []
    const media = Array.isArray(req.body?.media) ? req.body.media.filter((p) => typeof p === 'string' && p) : []
    const actual = ([...historial].reverse().find((m) => m.role === 'user')?.content || '').trim()
    const voz = req.body?.voz === true    // responder por NOTA DE VOZ (el usuario mandó un audio)

    // RUTEO COBRANZA: si quien escribe tiene una conversación de cobranza ACTIVA,
    // lo atiende el agente ACOTADO (cobranza-agente.mjs): SIN acceso a herramientas
    // del negocio, solo su factura. Así un cliente NUNCA llega al Nexus completo.
    if (de && !esWeb) {
      try {
        const cob = await import('./cobranza-agente.mjs')
        const activa = await cob.conversacionActiva(de)
        if (activa) {
          const out = await cob.responderCobranza(de, actual)
          if (out) return res.json(out)
        }
      } catch (e) { /* si falla el ruteo, sigue al Nexus normal (admin) */ }
    }

    // RUTEO SII ACOTADO: si el remitente tiene acceso SII restringido (ej. Joaquín →
    // Mallorca/ANA CLARA, en hub/accesos-sii.json), lo atiende el agente SII acotado:
    // SOLO descargas SII de SU empresa, sin acceso al resto del negocio. Un usuario
    // acotado NUNCA cae al Nexus admin (ni aunque algo falle → responde genérico).
    if (de && !esWeb) {
      let sa = null
      try { sa = await import('./sii-agente.mjs') } catch { sa = null }
      if (sa && sa.accesoSii(de)) {
        try {
          let m = _memoria.get(de)
          if (!m || Date.now() - m.ts > MEM_TTL) {
            m = { msgs: [], ts: Date.now() }
            m.msgs = rehidratarMemoria(de, 'whatsapp')   // sobrevive reinicios del hub
          }
          if (actual) {
            const ult = m.msgs[m.msgs.length - 1]
            if (!(ult && ult.role === 'user' && ult.content === actual)) m.msgs.push({ role: 'user', content: actual })
          }
          m.ts = Date.now(); _memoria.set(de, m)
          const out = await sa.responderSii(de, m.msgs.slice(-MEM_MAX))
          if (out?.reply) { m.msgs.push({ role: 'assistant', content: out.reply }); m.msgs = m.msgs.slice(-MEM_MAX); _memoria.set(de, m) }
          return res.json(out || { reply: 'Listo.' })
        } catch (e) {
          return res.json({ reply: 'Ahora no puedo procesar tu solicitud, intenta más tarde.' })
        }
      }
    }

    // Nexus admin CON memoria por remitente.
    const key = de || '_anon'
    let mem = _memoria.get(key)
    if (!mem || Date.now() - mem.ts > MEM_TTL) {
      mem = { msgs: [], ts: Date.now() }
      // Arranque en frío (o tras reiniciar el hub): recupera el hilo reciente desde la BD
      // para NO perder el contexto (ej. el borrador de factura recién creado). Solo canales
      // con historial persistente (WhatsApp/desktop), no el anónimo web sin remitente.
      if (de) mem.msgs = rehidratarMemoria(de, canalHist)
    }
    // Evita duplicar el mensaje actual si ya vino en la rehidratación.
    if (actual) {
      const ult = mem.msgs[mem.msgs.length - 1]
      if (!(ult && ult.role === 'user' && ult.content === actual)) mem.msgs.push({ role: 'user', content: actual })
    }

    // Adjuntos (foto del auto + documentos) recibidos por WhatsApp. Se ACUMULAN por
    // remitente con TTL: un traspaso de tag / subir un auto es conversacional y los PDF
    // llegan en MENSAJES SEPARADOS (carnet, poder, factura…). Antes se sobrescribía y el
    // tool solo veía el último → ahora se juntan todos los recientes (dedup por tamaño,
    // porque Kapso reenvía el mismo archivo con otro path).
    const TTL_MEDIA = 20 * 60 * 1000
    const mediaTurno = media.length ? cachearMedia(media) : []   // los de ESTE turno (para visión)
    const prevItems = (mem.media && Date.now() - mem.media.ts < TTL_MEDIA) ? (mem.media.items || []) : []
    const items = prevItems.slice()
    const seenSizes = new Set(items.map((it) => it.size))
    for (const p of mediaTurno) {
      let size = 0; try { size = statSync(p).size } catch { /* */ }
      if (size && seenSizes.has(size)) continue   // mismo archivo reenviado → no duplicar
      seenSizes.add(size); items.push({ p, size })
    }
    if (media.length || prevItems.length) mem.media = { items: items.slice(-12), ts: Date.now() }
    const mediaReciente = (mem.media && Date.now() - mem.media.ts < TTL_MEDIA) ? (mem.media.items || []).map((it) => it.p) : []

    mem.ts = Date.now(); _memoria.set(key, mem)   // persiste el mensaje del usuario ya
    // Historial persistente del chat: mensaje ENTRANTE de la persona (solo con remitente).
    if (de && actual) {
      try { histDB.registrar({ canal: canalHist, direccion: 'entrante', contraparte: de, texto: actual, origen: esWeb ? 'desktop' : 'chat', estado: 'recibido', media: mediaTurno.length ? mediaTurno : undefined }) } catch { /* best-effort */ }
    }
    const responder = await getResponder()
    // 'origen:centro' lo pone SOLO la página del Centro de IAs → respuestas breves
    // (canal con voz). No afecta a WhatsApp/terminal ni al panel React.
    const breve = req.body?.origen === 'centro'
    const guardar = (out) => {
      if (out?.reply) {
        mem.msgs.push({ role: 'assistant', content: out.reply }); mem.msgs = mem.msgs.slice(-MEM_MAX); mem.ts = Date.now(); _memoria.set(key, mem)
        // Respuesta SALIENTE de Nexus hacia la persona.
        if (de) { try { histDB.registrar({ canal: canalHist, direccion: 'saliente', contraparte: de, texto: out.reply, origen: esWeb ? 'desktop' : 'chat', estado: 'enviado' }) } catch { /* best-effort */ } }
      }
    }

    // STREAMING (solo web/Centro con voz): Nexus HABLA apenas se va generando el texto.
    // El cliente manda stream:true y recibe SSE: {t:'delta',text} por trozo mientras el
    // modelo escribe, y {t:'done', reply, graficos, tarjetas} al final. Una sola corrida
    // de responder() (con onText). Fallback: si no pide stream, sigue el flujo normal.
    if (req.body?.stream === true && (esWeb || !de)) {
      res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
      res.flushHeaders?.()
      const send = (o) => { try { res.write('data: ' + JSON.stringify(o) + '\n\n') } catch { /* cliente cerró */ } }
      const onText = (d) => { if (d) send({ t: 'delta', text: d }) }
      const onEvento = (ev) => send({ t: 'tool', ...ev })   // {nombre, agente, area} → indicador en vivo (ej. Segundo Cerebro)
      try {
        const out = await responder(mem.msgs.slice(-MEM_MAX), { de, media: mediaTurno, mediaReciente, web: esWeb, breve, onText, onEvento })
        guardar(out)
        send({ t: 'done', reply: out?.reply || '', graficos: out?.graficos || [], tarjetas: out?.tarjetas || [], herramientas: out?.herramientas || [] })
      } catch (e) { send({ t: 'error', error: String(e.message || e) }) }
      return res.end()
    }

    const trabajo = responder(mem.msgs.slice(-MEM_MAX), { de, media: mediaTurno, mediaReciente, web: esWeb, breve, voz })
    // Web/Desktop (o sin remitente): espera la respuesta COMPLETA y la devuelve en la
    // app. NUNCA empuja a WhatsApp (aunque tenga 'de' para identificar al admin).
    if (esWeb || !de) { const out = await trabajo; guardar(out); return res.json(out) }

    // Con remitente (WhatsApp): si el cerebro responde en ≤ACK_MS va directo; si tarda,
    // mandamos un ACUSE al instante (el puente no espera ni tira "reintentalo") y
    // entregamos la respuesta completa apenas esté, por WhatsApp.
    const carrera = await Promise.race([
      trabajo.then((out) => ({ done: true, out })),
      new Promise((r) => setTimeout(() => r({ done: false }), ACK_MS)),
    ])
    if (carrera.done) { guardar(carrera.out); return res.json(carrera.out) }
    // Acuse (texto rápido, aunque la respuesta final vaya por voz): marcado con acuse:true
    // para que el puente lo mande como texto y NO como audio.
    res.json({ reply: 'Dame un momento, estoy juntando eso 🔎 ya te respondo acá mismo.', acuse: true })
    trabajo.then(async (out) => {
      guardar(out)
      if (out?.reply) {
        try {
          if (voz) { const ev = await getEnviarVoz(); await ev(de, out.reply) }
          else await enviarTextoWhatsApp(de, out.reply)
        } catch { /* best-effort */ }
      }
    }).catch(() => {})
  } catch (e) { res.status(500).json({ reply: 'Error interno del asistente.', error: e.message }) }
})

// ── Webhook de WhatsApp (Kapso, Cloud API oficial) ────────────────────────────
// Kapso llama aquí en cada mensaje ENTRANTE (whatsapp.message.received). Verificamos
// la firma HMAC, extraemos remitente+texto y lo pasamos por el MISMO pipeline que la
// app web (/api/chat con web:false), reusando el ruteo cobranza/SII/admin y la memoria.
// La respuesta se entrega por Kapso. Ack inmediato (200) para que Kapso no reintente.
// Baja un archivo ENTRANTE de WhatsApp (foto/PDF/documento) desde la media_url de
// Kapso a un temporal, con la extensión correcta (por content-type o magic bytes),
// para que el modelo lo LEA (imagen→visión, PDF→documento). Devuelve la ruta o null.
async function descargarMediaKapso(url, tipoHint) {
  try {
    if (!url) return null
    const r = await fetch(url, { headers: { 'X-API-Key': process.env.KAPSO_API_KEY || '' } })
    if (!r.ok) return null
    const ct = (r.headers.get('content-type') || '').toLowerCase()
    const buf = Buffer.from(await r.arrayBuffer())
    const b = buf.subarray(0, 4)
    let ext = 'bin'
    if (ct.includes('pdf') || b.toString('latin1', 0, 4) === '%PDF') ext = 'pdf'
    else if (ct.includes('png') || (b[0] === 0x89 && b[1] === 0x50)) ext = 'png'
    else if (ct.includes('jpeg') || ct.includes('jpg') || (b[0] === 0xFF && b[1] === 0xD8)) ext = 'jpg'
    else if (ct.includes('webp')) ext = 'webp'
    else if (ct.includes('mp4') || ct.includes('quicktime') || ct.startsWith('video')) ext = 'mp4'
    else if (tipoHint === 'document') ext = 'pdf'          // los documentos suelen ser PDF (ej. CAV)
    else if (tipoHint === 'image') ext = 'jpg'
    else if (tipoHint === 'video') ext = 'mp4'             // WhatsApp manda mp4/mov; extraemos fotogramas aparte
    const tmp = join('/tmp', `nexus-wa-in-${Date.now()}.${ext}`)
    writeFileSync(tmp, buf)
    return tmp
  } catch { return null }
}

// El modelo NO puede "ver" un video, pero SÍ imágenes. Cuando llega un video por
// WhatsApp, sacamos unos fotogramas con ffmpeg (1 cada 2s, máx 6, escalados) y se los
// pasamos como fotos para que Nexus entienda qué muestra el video. Devuelve las rutas
// de los frames (vacío si no se pudo). Sin ffprobe: cubrimos los primeros ~12s, que es
// lo típico de un video de auto/WhatsApp.
function extraerFramesVideo(rutaVideo) {
  return new Promise((resolve) => {
    try {
      const base = join('/tmp', `nexus-wa-frame-${Date.now()}`)
      const patron = `${base}-%02d.jpg`
      const args = ['-y', '-i', rutaVideo, '-vf', 'fps=1/2,scale=768:-2', '-frames:v', '6', '-q:v', '3', patron]
      execFile('/usr/local/bin/ffmpeg', args, { timeout: 30000 }, (err) => {
        const frames = []
        try {
          for (let i = 1; i <= 6; i++) {
            const p = `${base}-${String(i).padStart(2, '0')}.jpg`
            if (existsSync(p)) frames.push(p)
          }
        } catch { /* */ }
        if (err && !frames.length) console.error('[wa/kapso] ffmpeg frames falló:', err.message)
        resolve(frames)
      })
    } catch (e) { console.error('[wa/kapso] extraerFramesVideo:', e.message); resolve([]) }
  })
}

const _waVistos = new Map()   // wamid → ts, para deduplicar reentregas (at-least-once)
function yaVisto(id) {
  if (!id) return false
  const now = Date.now()
  for (const [k, t] of _waVistos) if (now - t > 10 * 60 * 1000) _waVistos.delete(k)
  if (_waVistos.has(id)) return true
  _waVistos.set(id, now); return false
}
app.post('/wa/kapso', async (req, res) => {
  // 1) Firma: sin firma válida NO confiamos en el entrante (fail-closed).
  const firma = req.get('X-Webhook-Signature') || req.get('x-webhook-signature') || ''
  if (!kapso.verificarFirma(req.rawBody, firma)) {
    // Aviso: un webhook rechazado por firma se DESCARTA en silencio (fail-closed), lo que
    // hace que "Nexus no contesta" sin dejar rastro. Logueamos para que sea diagnosticable.
    console.error(`[wa/kapso] firma inválida → mensaje descartado (firma recibida: ${firma ? 'sí' : 'NINGUNA'}, len body: ${(req.rawBody || '').length})`)
    return res.status(401).json({ ok: false, error: 'firma inválida' })
  }
  // 2) Ack YA (Kapso espera 200 rápido; procesamos en segundo plano).
  res.json({ ok: true })
  try {
    let info = kapso.parsearRecibido(req.body)
    if (!info) return
    if (yaVisto(info.wamid)) return                     // reentrega duplicada
    // AUDIO ENTRANTE: si mandó una nota de voz, respondemos POR VOZ. Si Kapso no trajo
    // la transcripción, la sacamos con el Whisper local desde la media_url.
    if (info.esAudio && !info.texto) info.texto = await transcribirAudioURL(info.mediaUrl)
    // MEDIA ENTRANTE (foto / PDF / documento): la bajamos y se la pasamos al modelo
    // para que la LEA (imagen→visión, PDF→documento). Antes se descartaba: por eso
    // "Nexus no leía los PDF" que le mandaban.
    const mediaPaths = []
    // Kapso a veces manda el adjunto en media_url (estructurado) y a veces como un
    // TEXTO tipo "Document attached (x.pdf) [Type: application/pdf] URL: https://…".
    // Cubrimos AMBOS: media_url directo, o la URL embebida en el texto.
    let urlAdj = (!info.esAudio && info.tipo !== 'text') ? info.mediaUrl : ''
    let tipoAdj = info.tipo
    if (!urlAdj && info.texto) {
      const m = info.texto.match(/(Document|Image|File)\s+attached[\s\S]*?URL:\s*(https?:\/\/\S+)/i)
      if (m) {
        urlAdj = m[2]
        tipoAdj = /image/i.test(info.texto) ? 'image' : (/pdf|document/i.test(info.texto) ? 'document' : info.tipo)
        info.texto = info.texto.replace(/(Document|Image|File)\s+attached[\s\S]*/i, '').trim() // deja solo el caption real
      }
    }
    let esVideo = false
    if (urlAdj) {
      const f = await descargarMediaKapso(urlAdj, tipoAdj)
      if (f) {
        if (tipoAdj === 'video' || /\.(mp4|mov|m4v|webm)$/i.test(f)) {
          // Video: el modelo no lo ve → le pasamos fotogramas como fotos.
          const frames = await extraerFramesVideo(f)
          if (frames.length) { mediaPaths.push(...frames); esVideo = true }
          else console.error('[wa/kapso] video sin fotogramas extraíbles:', f)
        } else {
          mediaPaths.push(f)
        }
      }
    }
    // Video que no se pudo convertir a fotogramas: avisamos en vez de descartarlo en silencio.
    if (esVideo && !mediaPaths.length && !info.texto) {
      try { await kapso.enviarKapso(info.de, 'Me llegó un video pero no pude procesarlo 😕. Mándame una foto o cuéntame qué muestra y te ayudo.') } catch { /* */ }
      return
    }
    if (!info.texto && !mediaPaths.length) {             // sin texto ni archivo útil
      if (info.esAudio) { try { const ev = await getEnviarVoz(); await ev(info.de, 'No te entendí el audio, ¿me lo repites o me lo escribes?') } catch { /* */ } }
      return
    }
    kapso.marcarEscribiendo(info.wamid).catch(() => {}) // muestra "escribiendo…" ya mismo
    const voz = Boolean(info.esAudio)                   // respondemos por audio SOLO si nos hablaron por audio
    const textoTurno = info.texto || (esVideo
      ? `Te mando un VIDEO por WhatsApp. Te paso ${mediaPaths.length} fotograma(s) del video (en orden). Míralos y dime qué muestra el video.`
      : (mediaPaths.length ? 'Te mando un archivo adjunto (foto o PDF). Léelo y dime qué contiene.' : ''))
    // Pasa por el cerebro completo vía el endpoint interno (mismo ruteo que la app).
    const r = await fetch(`http://127.0.0.1:${PORT}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ de: info.de, voz, media: mediaPaths, historial: [{ role: 'user', content: textoTurno }] }),
    })
    const out = await r.json().catch(() => null)
    // /api/chat responde EN EL CUERPO la respuesta (rápida) o un acuse (si tarda, la
    // completa la empuja solo por Kapso). Entregamos lo del cuerpo por WhatsApp:
    // por VOZ si nos escribieron por voz, si no en texto.
    if (out?.reply) {
      try {
        if (voz && !out.acuse) { const ev = await getEnviarVoz(); await ev(info.de, out.reply) }
        else await kapso.enviarKapso(info.de, out.reply)
      } catch (e) { console.error('[wa/kapso] envío falló:', e.message) }
    }
  } catch (e) { console.error('[wa/kapso] error:', e.message) }
})

app.get('/api/health', async (_req, res) => {
  const out = await Promise.all(SERVICIOS.map(async (s) => {
    const desplegado = estaDesplegado(s)
    const [reachable, info] = await Promise.all([checkPort(HOST, s.puerto), daemonInfo(s.label)])
    return { ...s, desplegado, activo: reachable, ...info }
  }))
  res.json({ servicios: out, ts: Date.now() })
})

// ── VISTA GENERAL (Jarvis): datos para el dashboard a pantalla completa ────────
app.get('/api/vista/aliace', async (_req, res) => {
  try { res.json(await vista.datosAliace()) }
  catch (e) { res.status(500).json({ error: String(e.message || e) }) }
})
app.get('/api/vista/autos', async (req, res) => {
  try { res.json(await vista.datosAutos({ limite: Math.min(20, Number(req.query.limite) || 8) })) }
  catch (e) { res.status(500).json({ error: String(e.message || e) }) }
})
app.get('/api/vista/cerebro', (req, res) => {
  try { res.json(vista.datosCerebro({ max: Math.min(3000, Number(req.query.max) || 1500) })) }
  catch (e) { res.status(500).json({ error: String(e.message || e) }) }
})
// Grafo del cerebro (Obsidian) para la vista 3D del Centro de IAs.
// I/O 100% ASÍNCRONO (cerebro-grafo.mjs) → NUNCA congela el event loop, aunque el
// vault esté en iCloud. Patrón stale-while-revalidate con mutex: si hay caché (aunque
// vieja) se devuelve YA y se reconstruye en segundo plano; una sola construcción a la
// vez aunque varios abran el 3D al mismo tiempo.
// El grafo se PRE-GENERA a un archivo (cerebro-grafo.json) por un subproceso DETACHED
// que el hub NO espera: bajo launchd los hijos del hub corren con I/O estrangulada y
// leer las 90 notas puede tardar >30s, así que eso NUNCA puede ir en la ruta del
// request. El endpoint solo sirve el archivo (una lectura chica, siempre rápida) y, si
// está viejo, dispara una regeneración en segundo plano. Stale-while-revalidate real.
const GRAFO_CLI = join(__dirname, 'cerebro-grafo.mjs')
const GRAFO_JSON = join(__dirname, 'cerebro-grafo.json')
const GRAFO_TTL = 10 * 60 * 1000   // regenera si el archivo tiene más de 10 min
let _grafoRegenerando = false
function regenerarGrafo() {
  if (_grafoRegenerando) return
  _grafoRegenerando = true
  try {
    // detached + unref + stdio ignore: el hub se desentiende por completo del hijo.
    const hijo = spawn(process.execPath, [GRAFO_CLI, GRAFO_JSON], { detached: true, stdio: 'ignore' })
    hijo.on('exit', () => { _grafoRegenerando = false })
    hijo.on('error', () => { _grafoRegenerando = false })
    hijo.unref()
  } catch { _grafoRegenerando = false }
}
app.get('/api/cerebro/grafo', async (_req, res) => {
  try {
    let stat = null
    try { stat = statSync(GRAFO_JSON) } catch { /* aún no existe */ }
    if (!stat || Date.now() - stat.mtimeMs > GRAFO_TTL) regenerarGrafo()   // refresco en segundo plano
    if (!stat) return res.status(202).json({ generando: true, nodes: [], links: [], total: 0, enlaces: 0 })
    const raw = readFileSync(GRAFO_JSON, 'utf8')
    res.set('Content-Type', 'application/json').send(raw)
  } catch (e) { res.status(500).json({ error: String(e.message || e), nodes: [], links: [] }) }
})
// Lista de voces disponibles (para el selector de la Vista).
app.get('/api/voces', async (_req, res) => {
  try { res.json({ voces: await vista.listarVoces() }) }
  catch (e) { res.status(500).json({ error: String(e.message || e), voces: [] }) }
})
// Voz de Nexus (TTS macOS, voz de hombre, sin emojis) → audio WAV.
app.get('/api/voz', async (req, res) => {
  try {
    const { buf, mime } = await vista.sintetizarVoz(String(req.query.texto || ''), req.query.voz ? String(req.query.voz) : undefined, req.query.motor ? String(req.query.motor) : undefined)
    res.set('Content-Type', mime || 'audio/wav')
    res.set('Cache-Control', 'no-store')
    res.send(buf)
  } catch (e) { res.status(500).json({ error: String(e.message || e) }) }
})

app.post('/api/restart/:label', (req, res) => {
  const label = req.params.label
  const conocido = SERVICIOS.some((s) => s.label === label)
  if (!conocido) return res.status(400).json({ error: 'servicio desconocido' })
  const uid = process.getuid()
  execFile('launchctl', ['kickstart', '-k', `gui/${uid}/${label}`], (err, _o, stderr) => {
    if (err) return res.status(500).json({ error: stderr || err.message })
    res.json({ ok: true, label })
  })
})

// --- Lecturas Supabase (con degradación si no está configurado) ---
function sinSupabase(res) {
  return res.json({ configurado: false, datos: [] })
}
app.get('/api/agents', async (_req, res) => {
  if (!supa) return sinSupabase(res)
  const { data, error } = await supa.from('agentes').select('*').order('ultima_actividad', { ascending: false })
  if (error) return res.json({ configurado: true, error: error.message, datos: [] })
  res.json({ configurado: true, datos: data })
})
app.get('/api/log', async (_req, res) => {
  if (!supa) return sinSupabase(res)
  const { data, error } = await supa.from('log_acciones').select('*').order('creado_en', { ascending: false }).limit(50)
  if (error) return res.json({ configurado: true, error: error.message, datos: [] })
  res.json({ configurado: true, datos: data })
})
app.get('/api/consumo', async (_req, res) => {
  if (!supa) return sinSupabase(res)
  // Recalcula el consumo desde las trazas de OpenClaw (throttle 5 min) antes de leer.
  await refrescarConsumo()
  // Suma de costo/tokens del mes en curso desde la vista/tabla consumo_api.
  const { data, error } = await supa.from('consumo_api').select('*').order('dia', { ascending: false }).limit(31)
  if (error) return res.json({ configurado: true, error: error.message, datos: [] })
  res.json({ configurado: true, datos: data })
})

// ─── Recordatorios / mensajes programados ───────────────────────────────────
// El Hub corre 24/7 → es el lugar natural para el ticker que dispara los envíos.
app.get('/api/recordatorios', (_req, res) => {
  try { res.json({ ok: true, destinos: recordatorios.getDestinos(), recordatorios: recordatorios.listar() }) }
  catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})
app.post('/api/recordatorios', (req, res) => {
  try { res.json({ ok: true, recordatorio: recordatorios.programar({ ...req.body, creado_por: 'panel' }) }) }
  catch (e) { res.status(400).json({ ok: false, error: e.message }) }
})
app.delete('/api/recordatorios/:id', (req, res) => {
  res.json({ ok: recordatorios.cancelar(req.params.id) })
})
app.post('/api/recordatorios/destino', (req, res) => {
  try { res.json({ ok: true, destinos: recordatorios.setDestino(req.body.canal, req.body.valor) }) }
  catch (e) { res.status(400).json({ ok: false, error: e.message }) }
})
// Throttle por lotes (config por canal + valores recomendados).
app.get('/api/throttle', (_req, res) => {
  try { res.json({ ok: true, throttle: recordatorios.getThrottle(), recomendado: recordatorios.THROTTLE_REC }) }
  catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})
app.post('/api/throttle', (req, res) => {
  try { res.json({ ok: true, throttle: recordatorios.setThrottle(req.body.canal, { lote: req.body.lote, pausa_min: req.body.pausa_min }) }) }
  catch (e) { res.status(400).json({ ok: false, error: e.message }) }
})

// ─── Historial (dashboard de chats / correos / llamadas) ─────────────────────
app.get('/api/historial/conversaciones', (req, res) => {
  try { res.json({ ok: true, conversaciones: histDB.conversaciones({ canal: req.query.canal || undefined }) }) }
  catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})
app.get('/api/historial/hilo', (req, res) => {
  try { res.json({ ok: true, mensajes: histDB.hilo({ canal: req.query.canal, contraparte: req.query.contraparte }) }) }
  catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})
app.get('/api/historial/feed', (req, res) => {
  try { res.json({ ok: true, mensajes: histDB.feed({ canal: req.query.canal || undefined }) }) }
  catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

// ─── Panel lateral del Centro de IAs: clima, efeméride y noticias de IA ───────
// Se piden a fuentes externas DESDE el servidor (así el front no choca con CORS
// ni con la CSP del gateway público) y se cachean 15 min para no golpearlas.
const _WMO = {
  0: ['Despejado', '☀️'], 1: ['Casi despejado', '🌤️'], 2: ['Parcial nublado', '⛅'], 3: ['Nublado', '☁️'],
  45: ['Neblina', '🌫️'], 48: ['Neblina', '🌫️'], 51: ['Llovizna', '🌦️'], 53: ['Llovizna', '🌦️'], 55: ['Llovizna', '🌦️'],
  61: ['Lluvia', '🌧️'], 63: ['Lluvia', '🌧️'], 65: ['Lluvia fuerte', '🌧️'], 66: ['Lluvia helada', '🌧️'], 67: ['Lluvia helada', '🌧️'],
  71: ['Nieve', '🌨️'], 73: ['Nieve', '🌨️'], 75: ['Nieve fuerte', '🌨️'], 77: ['Aguanieve', '🌨️'],
  80: ['Chubascos', '🌦️'], 81: ['Chubascos', '🌦️'], 82: ['Chubascos fuertes', '⛈️'],
  85: ['Chubascos de nieve', '🌨️'], 86: ['Chubascos de nieve', '🌨️'],
  95: ['Tormenta', '⛈️'], 96: ['Tormenta', '⛈️'], 99: ['Tormenta', '⛈️'],
}
async function _panelClima() {
  const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-33.45&longitude=-70.66&current=temperature_2m,weather_code&timezone=America/Santiago', { signal: AbortSignal.timeout(8000) })
  const j = await r.json(); const c = j.current || {}
  if (c.temperature_2m == null) return null
  const [desc, emoji] = _WMO[c.weather_code] || ['—', '🌡️']
  return { temp: Math.round(c.temperature_2m), desc, emoji, ciudad: 'Santiago' }
}
async function _panelEfemeride() {
  const d = new Date(); const mm = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0')
  const r = await fetch(`https://es.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`, { headers: { 'User-Agent': 'NexusCentro/1.0 (centro-ias)' }, signal: AbortSignal.timeout(8000) })
  const j = await r.json(); const evs = (j.events || []).filter((e) => e.year && e.text)
  const ev = evs.filter((e) => +e.year < 2005).sort((a, b) => a.year - b.year)[0] || evs[0]
  if (!ev) return null
  return { year: ev.year, texto: String(ev.text).replace(/\s+/g, ' ').trim() }
}
async function _panelNoticiasIA() {
  const r = await fetch('https://news.google.com/rss/search?q=inteligencia+artificial+when:7d&hl=es-419&gl=CL&ceid=CL:es-419', { signal: AbortSignal.timeout(8000) })
  const xml = await r.text(); const items = []; const re = /<item>([\s\S]*?)<\/item>/g; let m
  const deHTML = (s) => String(s).replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
  while ((m = re.exec(xml)) && items.length < 6) {
    const blk = m[1]
    let titulo = deHTML((blk.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '')
    const link = ((blk.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '').trim()
    const idx = titulo.lastIndexOf(' - '); let fuente = ''
    if (idx > 0) { fuente = titulo.slice(idx + 3); titulo = titulo.slice(0, idx) }
    if (titulo) items.push({ titulo, fuente, link })
  }
  return items
}
let _panelCache = { ts: 0, data: null }
app.get('/api/panel', async (_req, res) => {
  try {
    if (_panelCache.data && Date.now() - _panelCache.ts < 15 * 60 * 1000) return res.json(_panelCache.data)
    const [clima, efemeride, noticias] = await Promise.all([
      _panelClima().catch(() => null), _panelEfemeride().catch(() => null), _panelNoticiasIA().catch(() => []),
    ])
    const data = { ok: true, ts: Date.now(), clima, efemeride, noticias }
    _panelCache = { ts: Date.now(), data }
    res.json(data)
  } catch (e) { res.status(200).json({ ok: false, error: e.message }) }
})

// HTML de la página del Centro de IAs (se lee UNA vez al arrancar; fuera del hot path).
let CENTRO_IAS_HTML = '<h1>Centro de IAs</h1><p>Falta centro-ias.html</p>'
try { CENTRO_IAS_HTML = readFileSync(join(__dirname, 'centro-ias.html'), 'utf8') } catch (e) { console.error('[centro-ias] no se pudo leer centro-ias.html:', e.message) }

// ─── Centro de IAs (front separado): qué hace cada subagente de Nexus ─────────
// Catálogo canónico de subagentes. `servicio` = id en SERVICIOS (para salud por
// puerto); los que no tienen daemon propio derivan su salud de la actividad.
const IAS = [
  { persona: 'Ali',       area: 'aliace',    rol: 'Aliace · ERP y finanzas',        emoji: '📊', servicio: null },
  { persona: 'Meme',      area: 'goautos',   rol: 'MallorcAutos · autos y ventas',   emoji: '🚗', servicio: null },
  { persona: 'Néstor',    area: 'correo',    rol: 'Correo · lectura de buzones',     emoji: '✉️', servicio: null },
  { persona: 'Martes',    area: 'sii',       rol: 'SII · documentos tributarios',    emoji: '🧾', servicio: 'sii' },
  { persona: 'SAI',       area: 'sai',       rol: 'Conciliación · SII ↔ banco',      emoji: '🧮', servicio: null },
  { persona: 'Leo',       area: 'banco',     rol: 'Bancos · saldos y movimientos',   emoji: '🏦', servicio: null },
  { persona: 'Cerebro',   area: 'cerebro',   rol: 'Segundo cerebro · notas',         emoji: '🧠', servicio: 'cerebro' },
  { persona: 'Nexus',     area: 'nexus',     rol: 'Orquestador · resto de acciones', emoji: '🤖', servicio: 'hub' },
]

// Snapshot completo para el panel en UNA llamada (estado + métricas + salud).
app.get('/api/ias', async (_req, res) => {
  try {
    const estado = histDB.estadoIAs({ activoSeg: 90 })
    const metricas = histDB.metricasIAs()
    // Salud por puerto solo de los que tienen daemon propio.
    const salud = {}
    await Promise.all(IAS.filter((i) => i.servicio).map(async (i) => {
      const s = SERVICIOS.find((x) => x.id === i.servicio)
      if (!s) return
      salud[i.persona] = { activo: await checkPort(HOST, s.puerto), ...daemonInfo(s.label) }
    }))
    const estadoPorP = Object.fromEntries(estado.map((e) => [e.persona, e]))
    const metPorP = Object.fromEntries((metricas.por_persona || []).map((m) => [m.persona, m]))
    const ias = IAS.map((i) => ({
      ...i,
      estado: estadoPorP[i.persona] || null,
      metricas: metPorP[i.persona] || { acciones: 0, errores: 0, ms_promedio: 0 },
      salud: salud[i.persona] || null,
    }))
    res.json({ ok: true, ts: Date.now(), ias, total_dia: metricas.total || { acciones: 0, errores: 0 }, desde: metricas.desde })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

// Feed de actividad reciente (todas o filtrado por ?persona=Ali).
app.get('/api/ias/actividad', (req, res) => {
  try {
    const persona = req.query.persona ? String(req.query.persona) : undefined
    const limite = Math.min(200, Number(req.query.limite) || 60)
    res.json({ ok: true, actividad: histDB.actividadIAs({ persona, limite }) })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

// Página standalone del Centro de IAs (front separado, sin build).
app.get('/centro-ias', (_req, res) => {
  try {
    const html = readFileSync(join(__dirname, 'centro-ias.html'), 'utf8')
    res.set('Content-Type', 'text/html; charset=utf-8').send(html)
  } catch (e) {
    res.status(500).send('No se pudo leer centro-ias.html: ' + e.message)
  }
})

// --- Servir el panel React compilado ---
const dist = join(__dirname, 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')))
} else {
  app.get('/', (_req, res) => res.status(200).send(
    '<body style="background:#000;color:#eee;font-family:system-ui;padding:40px">' +
    '<h1>Nexus Hub</h1><p>Falta compilar el panel. Corre: <code>cd ~/nexus/hub && npm run build</code></p></body>'))
}

// Escucha en localhost (necesario para el callback de Google) y, si se indica,
// en una IP privada EXTRA (ej. la de Tailscale) para llegar desde otra PC SIN
// abrir el panel a toda la red con 0.0.0.0. Acepta varias separadas por coma.
const HOSTS = [HOST, ...String(process.env.HUB_HOST_EXTRA || '').split(',').map((s) => s.trim()).filter(Boolean)]
let _schedulerArrancado = false
for (const h of HOSTS) {
  app.listen(PORT, h, () => {
    console.log(`[nexus-hub] escuchando en http://${h}:${PORT}  (Supabase: ${supa ? 'sí' : 'no configurado'})`)
    if (!_schedulerArrancado) {
      _schedulerArrancado = true
      // Arranca el ticker de mensajes programados (revisa vencidos cada 20s).
      try { recordatorios.iniciarScheduler() } catch (e) { console.error('[recordatorios] no arrancó:', e.message) }
    }
  }).on('error', (e) => console.error(`[nexus-hub] no pude escuchar en ${h}:${PORT}: ${e.message}`))
}

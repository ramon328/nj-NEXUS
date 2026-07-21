// centro-pub.mjs — Gateway PÚBLICO del Centro de IAs.
//
// Objetivo: compartir SOLO la página /centro-ias (estado de agentes + cerebro 3D)
// con gente de fuera, sin meterlos a la tailnet, detrás de un login.
//
// Diseño de seguridad (principio de mínimo privilegio):
//   - Este proceso escucha SOLO en 127.0.0.1:PUERTO_CENTRO_PUB. Se publica a
//     internet vía `tailscale funnel` (HTTPS con cert real de Tailscale).
//   - NO expone el hub completo. Solo hace proxy de 3 endpoints de LECTURA que
//     la página necesita. Reiniciar daemons, chat, escribir en el cerebro o
//     volcar Supabase quedan inalcanzables desde afuera.
//   - Todo (salvo /login) exige una sesión válida: cookie FIRMADA con HMAC,
//     HttpOnly + Secure + SameSite, con expiración.
//   - Contraseña guardada HASHEADA (scrypt) y comparada en tiempo constante.
//   - Rate-limiting por IP contra fuerza bruta.
//   - Cabeceras de seguridad duras (CSP, anti-clickjacking, noindex).

import express from 'express'
import { randomBytes, createHmac, scryptSync, timingSafeEqual } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* opcional */ }

const PORT = Number(process.env.PUERTO_CENTRO_PUB || 7690)
const HOST = '127.0.0.1'                                   // nunca 0.0.0.0
const HUB = `http://127.0.0.1:${Number(process.env.PUERTO_HUB || 3000)}`
const SESION_HORAS = Number(process.env.CENTRO_SESION_HORAS || 12)
const COOKIE = 'centro_sesion'
// Identidad que usa el chat del front (para que Nexus reconozca al usuario y le dé
// acceso a sus áreas). Si se define CENTRO_ADMIN_DE (ej. el número de Ramón), el
// chat responde CON ese acceso. Vacío = anónimo (sin datos del negocio). Como esta
// URL es pública detrás de login, activarlo = quien tenga la clave maneja ese Nexus.
const ADMIN_DE = process.env.CENTRO_ADMIN_DE || ''

// --- Identidad por token de FORJA (app nicojuri) ----------------------------
// Forja (portal de apps de Nico) abre esta web pasando ?forja_token=<JWT Supabase>.
// Validamos ese token contra el Supabase de Forja (proyecto NICOJURI: ydcpsihovvaefyobnhws,
// NO el de Aliace) y sacamos el EMAIL → así sabemos si entra Ramón o Nico y usamos SU identidad.
// El token lo EMITE el Supabase de nicojuri, así que hay que validarlo contra ESE proyecto
// (validarlo contra Aliace daba 401 → rebotaba a Forja).
const FORJA_SUPA = process.env.FORJA_SUPABASE_URL || 'https://ydcpsihovvaefyobnhws.supabase.co'
const FORJA_ANON = process.env.FORJA_SUPABASE_ANON_KEY || ''
const FORJA_MAP = {   // email (minúsculas) → número de identidad en Nexus
  'ramon@dropout.cl': '+56932945240',   // Ramón
  'njuri@dropout.cl': '+56975481858',   // Nico Juri
}
const _forjaCache = new Map()   // token → { de, email, ts }
async function identidadForja(token) {
  if (!token || !FORJA_ANON) return null
  const c = _forjaCache.get(token)
  if (c && Date.now() - c.ts < 5 * 60 * 1000) return c
  try {
    const r = await fetch(`${FORJA_SUPA}/auth/v1/user`, {
      headers: { apikey: FORJA_ANON, Authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) { try { console.log('[centro-pub] /auth/v1/user →', r.status, (await r.text()).slice(0, 140)) } catch { /* */ } ; return null }
    const u = await r.json()
    const email = String(u?.email || '').toLowerCase()
    if (!email) return null
    const de = FORJA_MAP[email] || email   // Ramón/Nico → su número; otro → su email (no fundador)
    const out = { de, email, ts: Date.now() }
    _forjaCache.set(token, out)
    return out
  } catch { return null }
}

// --- Credenciales -----------------------------------------------------------
// Usuario y contraseña. La contraseña NUNCA se guarda en claro: se deriva un
// hash scrypt con sal aleatoria y se persiste solo el hash (archivo 0600).
const USUARIO = process.env.CENTRO_USER || 'nexus'
const PASS_DEFECTO = process.env.CENTRO_PASS || 'nexus123'
const CRED_PATH = join(__dirname, '.centro-cred.json')

function derivar(pass, salt) { return scryptSync(pass, salt, 32) }

let CRED
if (existsSync(CRED_PATH)) {
  CRED = JSON.parse(readFileSync(CRED_PATH, 'utf8'))
} else {
  const salt = randomBytes(16).toString('hex')
  CRED = { user: USUARIO, salt, hash: derivar(PASS_DEFECTO, salt).toString('hex') }
  writeFileSync(CRED_PATH, JSON.stringify(CRED, null, 2))
  try { chmodSync(CRED_PATH, 0o600) } catch {}
  console.log('[centro-pub] credenciales inicializadas (hash guardado, sin texto claro)')
}

function passValida(pass) {
  const cand = derivar(pass, CRED.salt)
  const real = Buffer.from(CRED.hash, 'hex')
  return cand.length === real.length && timingSafeEqual(cand, real)
}
function userValido(u) {
  const a = Buffer.from(String(u || ''))
  const b = Buffer.from(CRED.user)
  return a.length === b.length && timingSafeEqual(a, b)
}

// --- Secreto para firmar cookies (persistido, sobrevive reinicios) ----------
const SECRET_PATH = join(__dirname, '.centro-secret')
let SECRET
if (existsSync(SECRET_PATH)) {
  SECRET = readFileSync(SECRET_PATH)
} else {
  SECRET = randomBytes(32)
  writeFileSync(SECRET_PATH, SECRET)
  try { chmodSync(SECRET_PATH, 0o600) } catch {}
}

const b64u = (buf) => Buffer.from(buf).toString('base64url')
function firmar(payload) {
  const cuerpo = b64u(JSON.stringify(payload))
  const mac = createHmac('sha256', SECRET).update(cuerpo).digest('base64url')
  return `${cuerpo}.${mac}`
}
function verificar(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [cuerpo, mac] = token.split('.')
  const esperado = createHmac('sha256', SECRET).update(cuerpo).digest('base64url')
  const a = Buffer.from(mac || ''); const b = Buffer.from(esperado)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const p = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'))
    if (!p.exp || Date.now() > p.exp) return null
    return p
  } catch { return null }
}

// --- Rate limiting de login por IP ------------------------------------------
const intentos = new Map()  // ip -> { n, hasta }
const MAX_INTENTOS = 8, VENTANA_MS = 15 * 60 * 1000
function ipDe(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return xff || req.socket.remoteAddress || 'desconocida'
}
function bloqueada(ip) {
  const e = intentos.get(ip)
  return e && e.hasta && Date.now() < e.hasta
}
function fallo(ip) {
  const e = intentos.get(ip) || { n: 0, hasta: 0 }
  e.n += 1
  if (e.n >= MAX_INTENTOS) { e.hasta = Date.now() + VENTANA_MS; e.n = 0 }
  intentos.set(ip, e)
}
function limpiar(ip) { intentos.delete(ip) }

// --- App --------------------------------------------------------------------
const app = express()
app.disable('x-powered-by')
app.set('trust proxy', true)
app.use(express.urlencoded({ extended: false, limit: '4kb' }))
app.use(express.json({ limit: '64kb' }))

// Cabeceras de seguridad en TODA respuesta.
app.use((req, res, next) => {
  res.set('X-Frame-Options', 'DENY')
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('Referrer-Policy', 'no-referrer')
  res.set('X-Robots-Tag', 'noindex, nofollow')
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "font-src 'self' data: https://fonts.gstatic.com",
    "media-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; '))
  next()
})

function parseCookies(req) {
  const out = {}
  for (const p of String(req.headers.cookie || '').split(';')) {
    const i = p.indexOf('=')
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim())
  }
  return out
}
function autenticado(req) { return verificar(parseCookies(req)[COOKIE]) }

// --- Login ------------------------------------------------------------------
function paginaLogin(msg = '') {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Acceso · Centro de IAs</title><style>
  *{box-sizing:border-box} html,body{margin:0;height:100%}
  body{background:radial-gradient(1000px 700px at 50% 30%,#0c1119,#07090d 70%);
    color:#e8edf5;font-family:-apple-system,system-ui,sans-serif;display:grid;place-items:center;padding:20px}
  .card{width:100%;max-width:340px;background:#11151c;border:1px solid #222a36;border-radius:16px;
    padding:26px 24px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
  h1{font-size:20px;margin:0 0 4px} p.sub{color:#8a94a6;font-size:13px;margin:0 0 20px}
  label{display:block;font-size:12px;color:#8a94a6;margin:14px 0 6px;text-transform:uppercase;letter-spacing:.5px}
  input{width:100%;padding:11px 13px;background:#0b0f15;border:1px solid #222a36;border-radius:10px;
    color:#e8edf5;font-size:15px;outline:none}
  input:focus{border-color:#5b9dff}
  button{width:100%;margin-top:22px;padding:12px;background:#5b9dff;border:0;border-radius:10px;
    color:#04101f;font-weight:700;font-size:15px;cursor:pointer}
  button:hover{background:#78b0ff}
  .err{margin-top:16px;color:#ff5c6c;font-size:13px;text-align:center;min-height:16px}
  .brand{font-size:26px;margin-bottom:8px}
</style></head><body>
  <form class="card" method="POST" action="/login" autocomplete="off">
    <div class="brand">🧠</div>
    <h1>Centro de IAs</h1>
    <p class="sub">Acceso restringido · Nexus</p>
    <label>Usuario</label>
    <input name="usuario" autocapitalize="off" autocorrect="off" autofocus>
    <label>Contraseña</label>
    <input name="clave" type="password">
    <button type="submit">Entrar</button>
    <div class="err">${msg}</div>
  </form>
</body></html>`
}

// SIN login de usuario/clave: la identidad viene del TOKEN de Forja (nicojuri.ai).
// Quien entra directo (sin token ni sesión) se redirige a Forja.
const FORJA_URL = process.env.FORJA_URL || 'https://nicojuri.ai/'
app.get('/login', (_req, res) => res.redirect(FORJA_URL))
app.post('/login', (_req, res) => res.redirect(FORJA_URL))
app.post('/logout', (_req, res) => {
  res.set('Set-Cookie', `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`)
  res.redirect(FORJA_URL)
})

// --- Muro de identidad (Forja) — todo lo de abajo exige identidad ------------
app.use(async (req, res, next) => {
  // 1) ¿Ya hay sesión? (cookie firmada con la identidad: de/email)
  const sess = autenticado(req)
  if (sess && sess.de) { req.identidad = sess; return next() }
  // 2) ¿Viene con token de Forja? (query en la 1ª carga, o body en /api)
  const tok = req.query.forja_token || req.body?.forja_token
  try { console.log(`[centro-pub][gate] ${req.method} ${req.path} · token:${tok ? 'sí(' + String(tok).length + ')' : 'NO'} · cookie:${sess ? 'sí' : 'no'}`) } catch { /* */ }
  if (tok) {
    let id = null
    try { id = await identidadForja(String(tok)) } catch (e) { console.log('[centro-pub][gate] identidadForja lanzó:', e.message) }
    console.log(`[centro-pub][gate] identidad → ${id ? id.email + ' = ' + id.de : 'NULL (token inválido/no valida)'}`)
    if (id && id.de) {
      const exp = Date.now() + SESION_HORAS * 3600 * 1000
      res.set('Set-Cookie', `${COOKIE}=${firmar({ de: id.de, email: id.email, exp })}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESION_HORAS * 3600}`)
      req.identidad = { de: id.de, email: id.email }
      if (!req.path.startsWith('/api/')) {   // página: limpia el token de la URL
        const u = new URL(req.originalUrl, 'http://x'); u.searchParams.delete('forja_token')
        return res.redirect(u.pathname + (u.search || ''))
      }
      return next()
    }
  }
  // 3) Sin identidad → API: 401; página: a Forja para que se identifique.
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'sin identidad', forja: FORJA_URL })
  return res.redirect(FORJA_URL)
})

// --- Página del Centro de IAs ----------------------------------------------
function servirCentro(_req, res) {
  try {
    const html = readFileSync(join(__dirname, 'centro-ias.html'), 'utf8')
    res.type('html').send(html)
  } catch (e) { res.status(500).send('No se pudo leer centro-ias.html: ' + e.message) }
}
app.get('/', servirCentro)
app.get('/centro-ias', servirCentro)

// --- Hablarle a Nexus desde el front público (chat + voz) -------------------
// Detrás del login. Se FUERZA web:true / canal:desktop: Nexus responde SOLO en
// la app (nunca empuja a WhatsApp) y no queda expuesto el envío como admin.
app.post('/api/chat', async (req, res) => {
  try {
    // Identidad ya resuelta por el muro (cookie/token de Forja): Ramón o Nico.
    const de = req.identidad?.de || ADMIN_DE || undefined
    const cuerpo = { ...(req.body || {}), forja_token: undefined, web: true, canal: 'desktop', de }
    const r = await fetch(`${HUB}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(120000),
    })
    // Streaming (SSE): reenvía el cuerpo TAL CUAL a medida que llega, sin bufferear,
    // para que Nexus hable apenas se genera el texto también desde el teléfono.
    if (cuerpo.stream === true && r.body) {
      res.status(r.status)
      res.set('Content-Type', r.headers.get('content-type') || 'text/event-stream; charset=utf-8')
      res.set('Cache-Control', 'no-store'); res.set('X-Accel-Buffering', 'no'); res.flushHeaders?.()
      const reader = r.body.getReader()
      for (;;) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)) }
      return res.end()
    }
    res.status(r.status).type('application/json').send(await r.text())
  } catch (e) { res.status(502).json({ reply: 'Nexus no está disponible ahora mismo.', error: e.message }) }
})
// Voz (TTS) → audio binario. Hay que reenviar el buffer tal cual (no como texto).
app.get('/api/voz', async (req, res) => {
  try {
    const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''
    const r = await fetch(`${HUB}/api/voz${qs}`, { signal: AbortSignal.timeout(40000) })
    const buf = Buffer.from(await r.arrayBuffer())
    res.status(r.status).set('Content-Type', r.headers.get('content-type') || 'audio/mpeg')
      .set('Cache-Control', 'no-store').send(buf)
  } catch (e) { res.status(502).json({ error: e.message }) }
})

// --- Proxy de SOLO los endpoints de lectura que la página usa ---------------
const RUTAS_OK = new Set(['/api/ias', '/api/ias/actividad', '/api/cerebro/grafo', '/api/panel'])
app.get('/api/*', async (req, res) => {
  if (!RUTAS_OK.has(req.path)) return res.status(404).json({ error: 'no encontrado' })
  try {
    const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''
    const r = await fetch(`${HUB}${req.path}${qs}`, { signal: AbortSignal.timeout(8000) })
    const cuerpo = await r.text()
    res.status(r.status).type(r.headers.get('content-type') || 'application/json').send(cuerpo)
  } catch (e) { res.status(502).json({ error: 'hub no disponible', detalle: e.message }) }
})

app.use((_req, res) => res.status(404).send('No encontrado'))

app.listen(PORT, HOST, () => {
  console.log(`[centro-pub] escuchando en http://${HOST}:${PORT} → proxy a ${HUB}`)
  console.log('[centro-pub] publícalo con:  tailscale funnel --bg ' + PORT)
})

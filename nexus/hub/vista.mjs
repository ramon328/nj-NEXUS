// vista.mjs — Datos para la VISTA GENERAL (Jarvis): Aliace + Autos de Mallorca.
// Lectura de solo-lectura, pensada para el dashboard a pantalla completa.
//   datosAliace() → facturación últimos 6 meses (tendencia), deuda hoy, nº clientes.
//   datosAutos()  → últimos autos PUBLICADOS de MallorcAutos con foto + conteo stock.
// No expone secretos al front: el hub llama acá y devuelve solo lo necesario.

import { readFileSync, readdirSync, statSync, realpathSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, basename, sep } from 'node:path'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* opcional */ }

// ── ALIACE (Supabase del portal) ──────────────────────────────────────────────
const ALIACE_URL = process.env.ALIACE_SUPABASE_URL
const ALIACE_KEY = process.env.ALIACE_SUPABASE_SERVICE_KEY || process.env.ALIACE_SUPABASE_ANON_KEY
const ALIACE_REST = ALIACE_URL ? ALIACE_URL.replace(/\/$/, '') + '/rest/v1' : null

async function aliaceRpc(fn, params = {}) {
  if (!ALIACE_REST) throw new Error('Falta ALIACE_SUPABASE_URL en ~/nexus/.env')
  const r = await fetch(`${ALIACE_REST}/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: ALIACE_KEY, Authorization: 'Bearer ' + ALIACE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!r.ok) throw new Error(`aliace rpc ${fn} HTTP ${r.status}`)
  return r.json()
}

// Suma defensiva de los campos numéricos "de deuda" del resumen (la forma exacta
// del RPC puede variar; tomamos un 'total' si existe, o sumamos lo numérico).
function totalDeuda(d) {
  if (!d) return null
  const o = Array.isArray(d) ? d[0] : d
  if (!o || typeof o !== 'object') return null
  for (const k of ['total_debt', 'total', 'debt', 'monto_total', 'deuda_total']) {
    if (o[k] != null && Number.isFinite(Number(o[k]))) return Number(o[k])
  }
  let s = 0, hubo = false
  for (const v of Object.values(o)) { if (Number.isFinite(Number(v))) { s += Number(v); hubo = true } }
  return hubo ? s : null
}

export async function datosAliace() {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth() + 1
  // Facturación: mes actual + 5 anteriores (tendencia para el gráfico).
  const periodos = []
  for (let i = 5; i >= 0; i--) { const d = new Date(y, (m - 1) - i, 1); periodos.push({ y: d.getFullYear(), m: d.getMonth() + 1 }) }
  const MES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const facturacion = []
  for (const p of periodos) {
    let net = 0
    try {
      const rows = await aliaceRpc('get_monthly_invoice_totals', { target_month: p.m, target_year: p.y })
      net = Array.isArray(rows) && rows[0] ? Number(rows[0].net_amount) || 0 : 0
    } catch { /* deja 0 */ }
    facturacion.push({ etiqueta: `${MES[p.m]} ${String(p.y).slice(2)}`, valor: net })
  }
  // Deuda hoy.
  let deuda = null
  try { deuda = totalDeuda(await aliaceRpc('get_debt_summary_at_cutoff_fixed', { cutoff_date: now.toISOString().slice(0, 10) })) } catch { /* */ }
  // Nº clientes.
  let clientes = null
  try {
    const c = await aliaceRpc('get_clients_count', {})
    const o = Array.isArray(c) ? c[0] : c
    clientes = typeof o === 'number' ? o : (o?.count ?? o?.total ?? null)
  } catch { /* */ }
  return {
    facturacion,
    mesActual: facturacion[facturacion.length - 1] || null,
    deuda,
    clientes,
    ts: Date.now(),
  }
}

// ── GOAUTOS / MALLORCA (Supabase, client_id=32) ───────────────────────────────
const SUPA = 'https://miuiujntdjrjhhcysiba.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdWl1am50ZGpyamhoY3lzaWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwODEzNjcsImV4cCI6MjA1MDY1NzM2N30.CqgUmrnmGSLDc6tg2aCHdD7tB-q9YL2utHPzXSIo6gI'
const CLIENT_ID = 32

let _go = null
function goCreds() {
  if (_go) return _go
  const c = JSON.parse(readFileSync(join(__dirname, '..', 'credenciales.json'), 'utf8')).goautos
  if (!c?.usuario || !c?.clave) throw new Error('Faltan credenciales de goautos en credenciales.json')
  return (_go = c)
}
let _tok = null, _tokExp = 0
async function goToken() {
  if (_tok && Date.now() < _tokExp) return _tok
  const c = goCreds()
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: c.usuario, password: c.clave }),
  })
  const j = await r.json().catch(() => ({}))
  if (!j.access_token) throw new Error('login goautos falló: ' + (j.error_description || j.msg || 'sin token'))
  _tok = j.access_token; _tokExp = Date.now() + ((j.expires_in || 3600) * 1000) - 60000
  return _tok
}
async function goRest(path, { count = false } = {}) {
  const jwt = await goToken()
  const headers = { apikey: ANON, Authorization: 'Bearer ' + jwt }
  if (count) { headers.Prefer = 'count=exact'; headers.Range = '0-0' }
  const r = await fetch(`${SUPA}/rest/v1/${path}`, { headers })
  const body = await r.json().catch(() => null)
  let total = null
  const cr = r.headers.get('content-range')
  if (cr && cr.includes('/')) total = Number(cr.split('/')[1])
  return { ok: r.ok, status: r.status, body, total }
}
function fotoUrl(main_image) {
  if (!main_image) return null
  if (/^https?:\/\//.test(main_image)) return main_image
  return `${SUPA}/storage/v1/object/public/vehicle-images/${main_image}`
}

export async function datosAutos({ limite = 8 } = {}) {
  const sel = 'id,year,price,mileage,main_image,created_at,brands(name),models(name),colors(name)'
  const r = await goRest(
    `vehicles?select=${sel}&client_id=eq.${CLIENT_ID}&show_in_stock=eq.true&main_image=not.is.null` +
    `&order=created_at.desc&limit=${limite}`,
  )
  const autos = (Array.isArray(r.body) ? r.body : []).map((v) => ({
    id: v.id,
    anio: v.year,
    precio: v.price,
    km: v.mileage,
    marca: v.brands?.name || '',
    modelo: v.models?.name || '',
    color: v.colors?.name || '',
    foto: fotoUrl(v.main_image),
    creado: v.created_at,
  }))
  // Conteos: en stock (publicados) y total.
  let enStock = null, total = null
  try { enStock = (await goRest(`vehicles?select=id&client_id=eq.${CLIENT_ID}&show_in_stock=eq.true`, { count: true })).total } catch { /* */ }
  try { total = (await goRest(`vehicles?select=id&client_id=eq.${CLIENT_ID}`, { count: true })).total } catch { /* */ }
  return { autos, enStock, total, ts: Date.now() }
}

// ── SEGUNDO CEREBRO (bóveda Obsidian) → grafo {nodes, links} ───────────────────
// Lee la bóveda directo del disco (mismo Mac) y arma el grafo parseando los
// [[wikilinks]] de cada nota. La raíz puede ser un symlink → se resuelve con realpath.
function cerebroRaiz() {
  const base = process.env.CEREBRO_RUTA || join(process.env.HOME || '', 'nexus', 'cerebro')
  try { return realpathSync(base) } catch { return base }
}
function walkMd(dir, acc = [], depth = 0) {
  if (depth > 7) return acc
  let nombres = []
  try { nombres = readdirSync(dir) } catch { return acc }
  for (const nombre of nombres) {
    if (nombre.startsWith('.')) continue           // ignora .obsidian y ocultos
    const abs = join(dir, nombre)
    let st
    try { st = statSync(abs) } catch { continue }   // statSync sigue symlinks
    if (st.isDirectory()) walkMd(abs, acc, depth + 1)
    else if (st.isFile() && /\.md$/i.test(nombre)) acc.push(abs)
  }
  return acc
}

export function datosCerebro({ max = 1500 } = {}) {
  const raiz = cerebroRaiz()
  const files = walkMd(raiz).slice(0, max)
  const nodes = []
  const idByTitle = new Map()
  const contenidos = []
  for (const abs of files) {
    const rel = relative(raiz, abs)
    const titulo = basename(abs).replace(/\.md$/i, '')
    const grupo = rel.includes(sep) ? rel.split(sep)[0] : 'raíz'
    nodes.push({ id: rel, titulo, grupo, val: 1 })
    if (!idByTitle.has(titulo)) idByTitle.set(titulo, rel)
    let txt = ''
    try { txt = readFileSync(abs, 'utf8') } catch { /* */ }
    contenidos.push({ id: rel, txt })
  }
  const links = []
  const vistos = new Set()
  for (const { id, txt } of contenidos) {
    const matches = txt.match(/\[\[([^\]]+)\]\]/g) || []
    for (const m of matches) {
      let target = m.slice(2, -2).split('|')[0].split('#')[0].trim()
      const base = target.split('/').pop().replace(/\.md$/i, '')
      const tid = idByTitle.get(target) || idByTitle.get(base)
      if (tid && tid !== id) {
        const key = id + '>' + tid
        if (!vistos.has(key)) { vistos.add(key); links.push({ source: id, target: tid }) }
      }
    }
  }
  const grado = {}
  for (const l of links) { grado[l.source] = (grado[l.source] || 0) + 1; grado[l.target] = (grado[l.target] || 0) + 1 }
  for (const n of nodes) n.val = 1 + (grado[n.id] || 0)
  return { nodes, links, total: nodes.length, enlaces: links.length, ts: Date.now() }
}

// ── VOZ (TTS) — voz de HOMBRE con el sistema de macOS, sin emojis ──────────────
// Genera audio WAV con `say` (voz masculina en español) y lo devuelve para que el
// navegador lo reproduzca (y pueda dibujar ondas REALES). Limpia emojis/markdown
// para que NO se "lean" símbolos: solo se dice el texto en forma natural.
const VOZ_DEFECTO = process.env.NEXUS_VOZ || 'Rocko (Español (México))'
const VOZ_RATE = process.env.NEXUS_VOZ_RATE || '172'   // wpm: más pausado = más "asistente/Jarvis"

// ElevenLabs (voz neural tipo Jarvis). Solo se usa si hay API key en .env.
// ELEVENLABS_API_KEY=...  y opcional ELEVENLABS_VOICE=<voiceId> (por defecto un male grave).
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || ''
const ELEVEN_VOICE = process.env.ELEVENLABS_VOICE || 'pNInz6obpgDQGcFmaJgB'   // "Adam" (male grave)
async function ttsEleven(texto) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: texto, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25 } }),
  })
  if (!r.ok) throw new Error('elevenlabs HTTP ' + r.status)
  return Buffer.from(await r.arrayBuffer())
}

// F5-TTS clonando la voz de NICO — vía Space gratis en la nube (daemon com.nexus.f5space
// :8093). Es la voz de Nico de verdad, pero depende de un Space público (a veces lento/caído)
// → si falla, cae a Kokoro. Timeout generoso porque puede haber cola.
const F5SPACE = `http://127.0.0.1:${Number(process.env.PUERTO_F5 || 8093)}`
async function ttsF5(texto) {
  const r = await fetch(`${F5SPACE}/tts`, { method: 'POST', body: texto, signal: AbortSignal.timeout(35000) })
  if (!r.ok) throw new Error('f5 http ' + r.status)
  const buf = Buffer.from(await r.arrayBuffer())
  if (!buf.length) throw new Error('f5 vacío')
  return buf
}

// Kokoro TTS — voz neural LOCAL (daemon com.nexus.kokoro en :8092). Gratis, privado,
// rápido en CPU (más rápido que tiempo real) y más humano que edge. RESPALDO de F5.
const KOKORO = `http://127.0.0.1:${Number(process.env.PUERTO_KOKORO || 8092)}`
async function ttsKokoro(texto) {
  const r = await fetch(`${KOKORO}/tts`, { method: 'POST', body: texto, signal: AbortSignal.timeout(25000) })
  if (!r.ok) throw new Error('kokoro http ' + r.status)
  const buf = Buffer.from(await r.arrayBuffer())
  if (!buf.length) throw new Error('kokoro vacío')
  return buf
}

// Edge TTS (Microsoft) — voz NEURAL gratis y sin API key. Voz de HOMBRE natural
// en ESPAÑOL NEUTRO (Jorge, acento latino neutro estándar, sin marca regional).
// Es la mejor opción libre (ttsmp3/Polly quedó limitando con "Usage Limit exceeded"
// y caía al `say` robótico). Requiere el paquete python `edge-tts`.
const EDGE_VOICE = process.env.NEXUS_EDGE_VOICE || 'es-MX-JorgeNeural'
const EDGE_RATE = process.env.NEXUS_EDGE_RATE || '-7%'   // un poco más pausado = menos robótico, más natural
const EDGE_PITCH = process.env.NEXUS_EDGE_PITCH || '-2Hz' // tono levemente más grave/cálido
const EDGE_PY = process.env.NEXUS_EDGE_PY || 'python3'
async function ttsEdge(texto) {
  const out = join(tmpdir(), `nexus-edge-${process.pid}-${Date.now()}.mp3`)
  await new Promise((resolve, reject) => {
    const ch = spawn(EDGE_PY, ['-m', 'edge_tts', '--voice', EDGE_VOICE, '--rate', EDGE_RATE, '--pitch', EDGE_PITCH, '--text', texto, '--write-media', out])
    let err = ''
    const to = setTimeout(() => { try { ch.kill('SIGKILL') } catch { /* */ } reject(new Error('edge-tts timeout')) }, 20000)
    ch.stderr.on('data', (d) => { err += d })
    ch.on('error', (e) => { clearTimeout(to); reject(e) })
    ch.on('exit', (code) => { clearTimeout(to); code === 0 ? resolve() : reject(new Error('edge-tts exit ' + code + ' ' + err.slice(0, 120))) })
  })
  const buf = readFileSync(out)
  try { unlinkSync(out) } catch { /* */ }
  if (!buf.length) throw new Error('edge-tts vacío')
  return buf
}

// ttsmp3.com → voces Amazon Polly GRATIS sin API key. Voz de HOMBRE en español:
// "Miguel" (es-US, latino) o "Enrique" (es-ES). Suena natural, tipo asistente real.
const VOZ_POLLY = process.env.NEXUS_VOZ_POLLY || 'Miguel'
async function ttsPolly(texto) {
  const r1 = await fetch('https://ttsmp3.com/makemp3_new.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ msg: texto, lang: VOZ_POLLY, source: 'ttsmp3' }).toString(),
  })
  const j = await r1.json().catch(() => ({}))
  if (!j.URL) throw new Error('ttsmp3 sin URL (Error ' + (j.Error ?? '?') + ')')
  const r2 = await fetch(j.URL)
  if (!r2.ok) throw new Error('ttsmp3 mp3 HTTP ' + r2.status)
  return Buffer.from(await r2.arrayBuffer())
}

// Google Translate TTS: gratis, sin API key, voz natural de "asistente". Tiene
// límite de ~200 caracteres por petición → se trocea por frases y se concatena.
function trocearTexto(texto, max = 190) {
  const out = []
  let cur = ''
  for (const frag of String(texto).split(/(?<=[.!?,;:])\s+|\n+/)) {
    if (!frag) continue
    if ((cur + ' ' + frag).trim().length > max) {
      if (cur) out.push(cur.trim())
      // si una frase sola supera el máximo, pártela por palabras
      if (frag.length > max) { let c = ''; for (const w of frag.split(/\s+/)) { if ((c + ' ' + w).trim().length > max) { if (c) out.push(c.trim()); c = w } else c += ' ' + w } if (c.trim()) out.push(c.trim()); cur = '' }
      else cur = frag
    } else cur += ' ' + frag
  }
  if (cur.trim()) out.push(cur.trim())
  return out.length ? out : [String(texto).slice(0, max)]
}
async function ttsGoogle(texto, lang = 'es') {
  const trozos = trocearTexto(texto)
  const partes = []
  for (const t of trozos) {
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=' + lang + '&client=tw-ob&q=' + encodeURIComponent(t)
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!r.ok) throw new Error('gtts HTTP ' + r.status)
    partes.push(Buffer.from(await r.arrayBuffer()))
  }
  return Buffer.concat(partes)
}

const _MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
// "7", "7", "2026" → "7 de julio de 2026" (dice la fecha como una persona,
// no "7 a 7 a 2026"). Devuelve null si no es una fecha válida (así se deja igual).
function _fechaTexto(d, mo, y) {
  const dd = parseInt(d, 10), mm = parseInt(mo, 10)
  if (!(mm >= 1 && mm <= 12) || !(dd >= 1 && dd <= 31)) return null
  let s = `${dd} de ${_MESES[mm - 1]}`
  if (y != null) { let yy = parseInt(y, 10); if (String(y).length === 2) yy += yy < 50 ? 2000 : 1900; s += ` de ${yy}` }
  return s
}
// Naturaliza fechas y números ANTES de leerlos en voz alta, para que suene humano.
function naturalizarVoz(t) {
  return String(t)
    // MODISMOS que NO son fechas (van ANTES de las reglas de fecha)
    .replace(/\b24\s*[/x×·\-]\s*7\b/gi, 'veinticuatro siete')   // 24/7 → "veinticuatro siete" (no "24 de julio")
    .replace(/\b(\d{1,2})\s*[/x×]\s*(\d{1,2})\b(?=\s*(horas?|días?|dias?|meses|años|semanas))/gi, '$1 por $2') // "12/2 meses" tipo ratio
    .replace(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, (m, y, mo, d) => _fechaTexto(d, mo, y) || m) // 2026-07-07
    .replace(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g, (m, d, mo, y) => _fechaTexto(d, mo, y) || m) // 07-07-2026
    .replace(/\b(\d{1,2})[/-](\d{1,2})\b/g, (m, d, mo) => _fechaTexto(d, mo, null) || m) // 07-07 (sin año)
    .replace(/(\d)\s*\/\s*(\d)/g, '$1 $2')       // resto de "número/número" (50/50) → sin decir "barra"
    .replace(/(\d)\.(?=\d{3}(?:\D|$))/g, '$1')   // 1.500.000 → 1500000 (no dice "punto")
    .replace(/\$\s?(\d+)/g, '$1 pesos')          // $330.879.272 → 330879272 pesos (no "dólar")
    .replace(/(\d)\s*%/g, '$1 por ciento')       // 20% → 20 por ciento
    .replace(/[…]|\.{3,}/g, ', ')                 // puntos suspensivos → pausa
    .replace(/\s[–—-]\s/g, ', ')                  // guión suelto como separador → pausa
    .replace(/[•·]/g, ', ')                       // bullets a media línea
}

export function limpiarParaVoz(t) {
  return naturalizarVoz(String(t || ''))
    // emojis y pictogramas
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}]/gu, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // [texto](url) → texto
    .replace(/[*_`~#>|]/g, ' ')                 // markdown
    .replace(/^\s*\d+[.)]\s+/gm, '')            // listas numeradas "1." → sin "uno punto"
    .replace(/^\s*[-•·]\s+/gm, '')              // viñetas
    // separadores decorativos / líneas de caja: la voz los lee como cortes → fluye entrecortado
    .replace(/[━─═╌╍│┃┄┅▬▭▮▯▪▫◆◇●○◦‣∙═]{2,}/g, ' ')
    .replace(/[━─═╌╍│┃┄┅▬▭▮▯▪▫◆◇●○◦‣∙]/g, ' ')
    .replace(/[·•]{2,}/g, ' ')
    // saltos de línea → pausa NATURAL (coma), no cortes duros que traban la voz
    .replace(/\s*\n+\s*/g, ', ')
    .replace(/,(\s*,)+/g, ',')                  // comas repetidas encadenadas
    .replace(/\s+([.,;:!?])/g, '$1')            // espacio antes de puntuación
    .replace(/([.,;:])\1+/g, '$1')              // puntuación duplicada (",," "..")
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,.;:]+/, '')                  // no arrancar con coma/punto
    .trim()
}

const _MASC = ['rocko', 'reed', 'eddy', 'grandpa', 'jorge', 'diego', 'juan', 'carlos', 'paul']
const _FEM = ['mónica', 'monica', 'paulina', 'flo', 'sandy', 'shelley', 'grandma']
export async function listarVoces() {
  const out = await new Promise((resolve) => {
    const ch = spawn('say', ['-v', '?'])
    let s = ''
    ch.stdout.on('data', (d) => { s += d })
    ch.on('close', () => resolve(s))
    ch.on('error', () => resolve(''))
  })
  const voces = []
  for (const line of out.split('\n')) {
    const m = line.match(/^(.+?)\s+(es_[A-Z]{2})\b/)
    if (!m) continue
    const id = m[1].trim()
    const corto = id.toLowerCase().split(' ')[0]
    const genero = _MASC.includes(corto) ? 'hombre' : _FEM.includes(corto) ? 'mujer' : '—'
    voces.push({ id, lang: m[2], genero })
  }
  return voces
}

export async function sintetizarVoz(texto, voz, motor) {
  const limpio = limpiarParaVoz(texto).slice(0, 2200)
  if (!limpio) throw new Error('texto vacío para voz')
  const modo = (motor && String(motor).trim()) || process.env.NEXUS_TTS || ''   // '' = auto; o forzar: f5|kokoro|edge|google|polly|macos
  // 0a) Kokoro LOCAL (daemon) → POR DEFECTO: neural, humano, INSTANTÁNEO, gratis y privado.
  if (modo === '' || modo === 'kokoro') {
    try { return { buf: await ttsKokoro(limpio), mime: 'audio/wav' } } catch { /* si el daemon no está, sigue a edge */ }
  }
  // 0b) F5 con la voz de NICO (Space nube) → SOLO si se pide (NEXUS_TTS=f5); es más lento (~9s).
  if (modo === 'f5') {
    try { return { buf: await ttsF5(limpio), mime: 'audio/wav' } } catch { /* Space lento/caído → Kokoro */ }
    try { return { buf: await ttsKokoro(limpio), mime: 'audio/wav' } } catch { /* → edge */ }
  }
  // 1) ElevenLabs si hay key → voz neural tipo Jarvis (lo mejor).
  if (ELEVEN_KEY && (modo === '' || modo === 'eleven')) {
    try { return { buf: await ttsEleven(limpio), mime: 'audio/mpeg' } } catch { /* sigue */ }
  }
  // 2) Edge TTS (neural, HOMBRE chileno) → POR DEFECTO. Natural y estable, sin key.
  if (modo === '' || modo === 'edge') {
    try { return { buf: await ttsEdge(limpio), mime: 'audio/mpeg' } } catch { /* sigue */ }
  }
  // 3) Amazon Polly "Miguel" (ttsmp3, hombre) — respaldo si Edge falla.
  if (modo === '' || modo === 'polly') {
    try { return { buf: await ttsPolly(limpio), mime: 'audio/mpeg' } } catch { /* sigue */ }
  }
  // 4) Google TTS (voz femenina natural) — respaldo o si se pide explícito.
  if (modo === '' || modo === 'google') {
    try { return { buf: await ttsGoogle(limpio), mime: 'audio/mpeg' } } catch { /* sigue */ }
  }
  // 5) macOS `say` (respaldo offline, voz de hombre robótica).
  const out = join(tmpdir(), `nexus-voz-${process.pid}-${Date.now()}.wav`)
  await new Promise((resolve, reject) => {
    const ch = spawn('say', ['-v', voz || VOZ_DEFECTO, '-r', VOZ_RATE, '-o', out, '--data-format=LEI16@22050', limpio])
    const to = setTimeout(() => { try { ch.kill('SIGKILL') } catch { /* */ } reject(new Error('say timeout')) }, 20000)
    ch.on('error', (e) => { clearTimeout(to); reject(e) })
    ch.on('exit', (code) => { clearTimeout(to); code === 0 ? resolve() : reject(new Error('say exit ' + code)) })
  })
  const buf = readFileSync(out)
  try { unlinkSync(out) } catch { /* */ }
  return { buf, mime: 'audio/wav' }
}

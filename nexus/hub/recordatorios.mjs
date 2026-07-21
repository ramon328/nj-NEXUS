// recordatorios.mjs — Mensajes PROGRAMADOS de Nexus.
// "Después de cierto tiempo, mándale un mensaje a <quien> por <canal>".
// Canales: whatsapp (vía OpenClaw), correo (Gmail API) y llamada (FaceTime, gratis).
//
// Pieza 1: un STORE en ~/nexus/recordatorios.json (sobrevive reinicios).
// Pieza 2: un TICKER (iniciarScheduler) que corre dentro del daemon del Hub (24/7);
//          cada 20s revisa los que ya vencieron y los envía, marcándolos.
// Pieza 3: destinatarios POR DEFECTO editables (~/nexus/recordatorios-config.json)
//          — así se puede "cambiar el número de vez en cuando" sin tocar código.
//
// El destino va SIEMPRE por mensaje (número/correo). Si no se pasa, se usa el
// destinatario por defecto del canal.

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import * as historial from './historial.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* opcional */ }

const HOME = process.env.HOME || ''
const RUTA_STORE = join(HOME, 'nexus', 'recordatorios.json')
const RUTA_CONFIG = join(HOME, 'nexus', 'recordatorios-config.json')
const LOG = '/tmp/nexus-recordatorios.log'
const CANALES = ['whatsapp', 'correo', 'llamada', 'telefono', 'sms']

function flog(m) { try { appendFileSync(LOG, `[${new Date().toISOString()}] ${m}\n`) } catch { /* */ } }

// ── Destinatarios por defecto (editables) ────────────────────────────────────
// Semilla: los datos de prueba de Ramón. Se pueden cambiar con setDestino().
// Sin destinatarios por defecto: NINGÚN canal apunta a un número fijo (se quitó el
// de Ramón para evitar fugas). Siempre hay que indicar el destino — y el agente,
// si no lo dicen, usa el número de QUIEN pide (ctx.de), no un fijo.
const DESTINOS_SEMILLA = {
  whatsapp: '',
  correo: '',
  llamada: '',
  telefono: '',
  sms: '',
}
function leerConfig() {
  let cfg = {}
  try { cfg = JSON.parse(readFileSync(RUTA_CONFIG, 'utf8')) || {} } catch { cfg = {} }
  return { destinos: { ...DESTINOS_SEMILLA, ...(cfg.destinos || {}) } }
}
function escribirConfig(cfg) { writeFileSync(RUTA_CONFIG, JSON.stringify(cfg, null, 2)) }
export function getDestinos() { return leerConfig().destinos }
export function setDestino(canal, valor) {
  if (!CANALES.includes(canal)) throw new Error(`Canal inválido: ${canal}`)
  const cfg = leerConfig()
  cfg.destinos[canal] = canal === 'whatsapp' ? (normNum(valor) || String(valor).trim()) : String(valor).trim()
  escribirConfig(cfg)
  return cfg.destinos
}

// ── Store de recordatorios ────────────────────────────────────────────────────
function leerStore() {
  try { const a = JSON.parse(readFileSync(RUTA_STORE, 'utf8')); return Array.isArray(a) ? a : [] } catch { return [] }
}
function escribirStore(a) { writeFileSync(RUTA_STORE, JSON.stringify(a, null, 2)) }

function normNum(s) {
  const d = String(s || '').replace(/[^0-9]/g, '')
  return d ? '+' + d.replace(/^0+/, '') : ''
}
function nuevoId() { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

// Convierte la entrada de tiempo en un instante (ms epoch). Acepta:
//  - en_minutos / en_segundos (relativo desde ahora)
//  - cuando: ISO 8601 (ej "2026-06-28T15:30:00-04:00")
function resolverCuando({ cuando, en_minutos, en_segundos }) {
  if (en_segundos != null && Number.isFinite(Number(en_segundos))) return Date.now() + Number(en_segundos) * 1000
  if (en_minutos != null && Number.isFinite(Number(en_minutos))) return Date.now() + Number(en_minutos) * 60000
  if (cuando) {
    const t = Date.parse(cuando)
    if (Number.isFinite(t)) return t
  }
  return NaN
}

// Programa un mensaje. Devuelve el registro creado (o lanza si los datos no sirven).
export function programar({ canal, destino, mensaje, asunto, cuando, en_minutos, en_segundos, creado_por, repeticiones, intervalo_min }) {
  canal = String(canal || 'sms').toLowerCase()
  if (!CANALES.includes(canal)) throw new Error(`Canal inválido "${canal}". Usa: ${CANALES.join(', ')}.`)
  if (canal === 'whatsapp') throw new Error('WhatsApp está deshabilitado como canal de salida (anti-ban). Usa sms o correo.')
  const texto = String(mensaje || '').trim()
  if (!texto) throw new Error('Falta el MENSAJE a enviar.')
  const ts = resolverCuando({ cuando, en_minutos, en_segundos })
  if (!Number.isFinite(ts)) throw new Error('Falta CUÁNDO enviarlo (en_minutos, en_segundos o cuando=ISO).')
  // Destino: el pasado, o el por defecto del canal.
  const def = getDestinos()[canal]
  let dest = destino ? String(destino).trim() : def
  // whatsapp → E.164. llamada → usuario de Telegram (@user) o teléfono tal cual.
  if (canal === 'whatsapp') dest = normNum(dest) || dest
  if (!dest) throw new Error(`No hay destino para ${canal} (ni explícito ni por defecto).`)

  // REPETICIONES: enviar el MISMO mensaje N veces, separadas `intervalo_min` minutos.
  let veces = Math.max(1, Math.min(50, Math.floor(Number(repeticiones) || 1)))  // tope 50 (anti-abuso)
  let intervaloMs = Math.max(1, Number(intervalo_min) || 1) * 60000             // por defecto 1 min
  // 🛡️ ANTI-BAN SOLO PARA WHATSAPP: WhatsApp banea por spam (más por la vía no
  // oficial). Para whatsapp se FUERZA un intervalo mínimo seguro y un tope de
  // repeticiones. Los demás canales (sms, correo, llamada, telefono) quedan SIN límite.
  if (canal === 'whatsapp' && veces > 1) {
    const WA_INT_MIN = Math.max(1, Number(process.env.WA_REP_INTERVALO_MIN || 5))  // min. minutos entre repes
    const WA_REP_MAX = Math.max(1, Number(process.env.WA_REP_MAX || 5))            // tope de repes
    intervaloMs = Math.max(intervaloMs, WA_INT_MIN * 60000)
    veces = Math.min(veces, WA_REP_MAX)
  }
  const serie = nuevoId()
  const creadoIso = new Date().toISOString()
  const store = leerStore()
  const creados = []
  for (let i = 0; i < veces; i++) {
    const reg = {
      id: nuevoId(), canal, destino: dest, mensaje: texto,
      asunto: canal === 'correo' ? String(asunto || 'Recordatorio de Nexus') : undefined,
      cuando: new Date(ts + i * intervaloMs).toISOString(),
      creado: creadoIso, creado_por: creado_por || null,
      estado: 'pendiente', resultado: null,
      ...(veces > 1 ? { serie, indice: i + 1, total: veces } : {}),
    }
    store.push(reg)
    creados.push(reg)
  }
  escribirStore(store)
  flog(`PROGRAMADO ${creados[0].id} ${canal} -> ${dest} x${veces} c/${intervaloMs / 60000}min @ ${creados[0].cuando} :: ${texto.slice(0, 50)}`)
  // Devuelve el primero + info de la serie (compatible: el caller usa id/canal/destino/cuando).
  return { ...creados[0], repeticiones: veces, intervalo_min: intervaloMs / 60000 }
}

export function listar({ soloPendientes = false } = {}) {
  let a = leerStore()
  if (soloPendientes) a = a.filter((r) => r.estado === 'pendiente')
  return a.sort((x, y) => Date.parse(x.cuando) - Date.parse(y.cuando))
}

export function cancelar(id) {
  const store = leerStore()
  const r = store.find((x) => x.id === id && x.estado === 'pendiente')
  if (!r) return false
  r.estado = 'cancelado'
  escribirStore(store)
  flog(`CANCELADO ${id}`)
  return true
}

// ── Envío por canal ───────────────────────────────────────────────────────────

// WhatsApp vía CLI de OpenClaw (mismo mecanismo que el resto del Hub).
const OPENCLAW_CLI = join(HOME, '.npm-global', 'lib', 'node_modules', 'openclaw', 'openclaw.mjs')
let OPENCLAW_TOKEN = ''
try { OPENCLAW_TOKEN = JSON.parse(readFileSync(join(HOME, '.openclaw', 'openclaw.json'), 'utf8'))?.gateway?.auth?.token || '' } catch { /* */ }

// ⛔ WhatsApp DESHABILITADO como canal de SALIDA (jul 2026). El envío por Baileys/OpenClaw
// en el número personal provocó bans ("revisar la cuenta"); se apaga por completo. Este es
// el backstop DURO: aunque algo quede encolado con canal 'whatsapp' (campaña vieja, retry,
// reactivación por error), aquí NO sale nada. Para reactivar: usar API oficial + número
// dedicado, no este atajo. [[nexus-cobranza-ciclo-blindaje]]
function enviarWhatsApp(target, mensaje) {
  flog(`WHATSAPP BLOQUEADO (canal de salida deshabilitado) -> ${target} :: ${String(mensaje).slice(0, 60)}`)
  return Promise.reject(new Error('WhatsApp deshabilitado como canal de salida (anti-ban). Usa SMS o correo.'))
}

// Correo vía Gmail API. Usa el refresh_token guardado por el flujo OAuth del Hub
// (requiere el scope gmail.send → reconectar Gmail una vez desde el panel).
const GOOGLE_DIR = join(__dirname, '..', 'conector-correo', 'google')
const GTOKEN_PATH = join(GOOGLE_DIR, 'token.json')
const GCLIENT_PATH = join(GOOGLE_DIR, 'oauth-client.json')
async function accessTokenGoogle() {
  const tok = JSON.parse(readFileSync(GTOKEN_PATH, 'utf8'))
  if (!tok.refresh_token) throw new Error('Gmail no conectado (sin refresh_token). Conéctalo desde el Hub.')
  const cj = JSON.parse(readFileSync(GCLIENT_PATH, 'utf8'))
  const c = cj.installed || cj.web || {}
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: c.client_id, client_secret: c.client_secret,
      refresh_token: tok.refresh_token, grant_type: 'refresh_token',
    }).toString(),
  })
  const j = await r.json()
  if (!j.access_token) throw new Error('No pude refrescar el token de Gmail: ' + (j.error_description || j.error || 'desconocido'))
  return { access_token: j.access_token, from: tok.email || 'me' }
}
function b64url(s) { return Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
async function enviarCorreo(to, asunto, cuerpo) {
  const { access_token, from } = await accessTokenGoogle()
  // Asunto en UTF-8 (RFC 2047) por si lleva tildes/emoji.
  const asuntoEnc = `=?UTF-8?B?${Buffer.from(asunto, 'utf8').toString('base64')}?=`
  const raw = [
    `From: ${from}`, `To: ${to}`, `Subject: ${asuntoEnc}`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset="UTF-8"', '',
    cuerpo,
  ].join('\r\n')
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST', headers: { Authorization: 'Bearer ' + access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: b64url(raw) }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error('Gmail rechazó el envío: ' + JSON.stringify(j).slice(0, 200))
  return j.id
}

// Llamada de VOZ GRATIS vía CallMeBot → suena dentro de la app de TELEGRAM y
// lee el mensaje con voz (TTS). NO es una llamada a la línea celular (esa es de
// pago en CallMeBot). El "destino" es el usuario de Telegram (@usuario) o el
// teléfono con código de país REGISTRADO en Telegram y autorizado en el bot
// (@CallMeBot_txtbot, mandándole /start una vez).
// Nota: hay un bug conocido en Telegram de iOS que a veces conecta sin audio.
const CALLMEBOT_LANG = process.env.CALLMEBOT_LANG || 'es-ES-Standard-A'
async function enviarLlamada(user, mensaje) {
  const texto = String(mensaje).slice(0, 256)   // CallMeBot: máx 256 caracteres
  const url = 'https://api.callmebot.com/start.php?'
    + new URLSearchParams({ user: String(user), text: texto, lang: CALLMEBOT_LANG }).toString()
  const r = await fetch(url)
  const body = (await r.text()).trim()
  if (!r.ok) throw new Error(`CallMeBot HTTP ${r.status}: ${body.slice(0, 160)}`)
  // CallMeBot responde texto plano; si trae error/“not registered”, lo señalamos.
  if (/\b(error|not\s+found|not\s+registered|invalid|unauthor|missing)\b/i.test(body)) {
    throw new Error(`CallMeBot: ${body.slice(0, 180)}`)
  }
  return body.slice(0, 200) || 'ok'
}

// Llamada TELEFÓNICA REAL vía Twilio: marca el número y una voz LEE el mensaje
// (TTS en español). Es de PAGO (centavos/min); en cuenta TRIAL solo se puede
// llamar a números VERIFICADOS en la consola de Twilio. Config en ~/nexus/.env:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (número Twilio), opc TWILIO_VOICE/TWILIO_LANG.
const TW_SID = process.env.TWILIO_ACCOUNT_SID || ''
const TW_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const TW_FROM = process.env.TWILIO_FROM || ''
const TW_VOICE = process.env.TWILIO_VOICE || 'Polly.Mia'   // voz español LatAm (Amazon Polly)
const TW_LANG = process.env.TWILIO_LANG || 'es-MX'
const xmlEsc = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))
async function enviarTelefono(numero, mensaje) {
  if (!TW_SID || !TW_TOKEN || !TW_FROM) throw new Error('Twilio sin configurar: faltan TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM en ~/nexus/.env.')
  const to = '+' + String(numero).replace(/[^0-9]/g, '')   // E.164 limpio (sin espacios/guiones)
  const texto = xmlEsc(String(mensaje).slice(0, 1000))
  // Lee el mensaje dos veces (con una pausa) para que se entienda bien.
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="${TW_VOICE}" language="${TW_LANG}">${texto}</Say><Pause length="1"/><Say voice="${TW_VOICE}" language="${TW_LANG}">${texto}</Say></Response>`
  const body = new URLSearchParams({ To: to, From: TW_FROM, Twiml: twiml }).toString()
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TW_SID}/Calls.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${TW_SID}:${TW_TOKEN}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`Twilio rechazó la llamada (HTTP ${r.status}): ${(j.message || JSON.stringify(j)).slice(0, 220)}`)
  return j.sid || 'ok'
}

async function enviar(reg) {
  if (reg.canal === 'whatsapp') return enviarWhatsApp(reg.destino, reg.mensaje)
  if (reg.canal === 'correo') return enviarCorreo(reg.destino, reg.asunto || 'Recordatorio de Nexus', reg.mensaje)
  if (reg.canal === 'llamada') return enviarLlamada(reg.destino, reg.mensaje)
  if (reg.canal === 'telefono') return enviarTelefono(reg.destino, reg.mensaje)
  if (reg.canal === 'sms') return enviarSms(reg.destino, reg.mensaje)
  throw new Error('Canal desconocido: ' + reg.canal)
}

// SMS vía Twilio (mismo Twilio que las llamadas). De pago; trial = solo a números
// verificados y con prefijo "Sent from your Twilio trial account".
async function enviarSms(numero, mensaje) {
  if (!TW_SID || !TW_TOKEN || !TW_FROM) throw new Error('Twilio sin configurar (faltan TWILIO_* en ~/nexus/.env).')
  const to = '+' + String(numero).replace(/[^0-9]/g, '')   // E.164 limpio (sin espacios/guiones)
  const body = new URLSearchParams({ To: to, From: TW_FROM, Body: String(mensaje).slice(0, 1500) }).toString()
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TW_SID}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${TW_SID}:${TW_TOKEN}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`Twilio SMS rechazó (HTTP ${r.status}): ${(j.message || JSON.stringify(j)).slice(0, 200)}`)
  const sid = j.sid || 'ok'
  registrarSidSms(sid, to)   // para verificar la ENTREGA después (¿llegó o lo bloquearon?)
  return sid
}

// ── SEGUIMIENTO DE ENTREGA SMS (saber si llegó o lo bloquearon/filtraron) ──────
// Twilio entrega "delivery receipts": queued→sent→delivered, o undelivered/failed.
// Guardamos el SID al enviar y consultamos el estado final ~minuto y medio después.
const RUTA_SMS_TRACK = join(HOME, 'nexus', 'recordatorios-sms-track.json')
function leerTrackSms() { try { const a = JSON.parse(readFileSync(RUTA_SMS_TRACK, 'utf8')); return Array.isArray(a) ? a : [] } catch { return [] } }
function escribirTrackSms(a) { writeFileSync(RUTA_SMS_TRACK, JSON.stringify(a, null, 2)) }
function registrarSidSms(sid, destino) {
  if (!sid || sid === 'ok') return
  const a = leerTrackSms()
  a.push({ sid, destino, ts: Date.now(), estado: 'enviado', final: false, error_code: null, error_msg: null })
  escribirTrackSms(a.slice(-500))
}
async function estadoTwilioSms(sid) {
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TW_SID}/Messages/${sid}.json`, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${TW_SID}:${TW_TOKEN}`).toString('base64') },
  })
  const j = await r.json().catch(() => ({}))
  return { status: j.status, error_code: j.error_code, error_message: j.error_message }
}
let _verifSms = false
async function verificarEntregasSms() {
  if (_verifSms || !TW_SID || !TW_TOKEN) return
  _verifSms = true
  try {
    const a = leerTrackSms()
    let cambio = false
    for (const t of a) {
      if (t.final || Date.now() - t.ts < 90000) continue   // espera ~90s al receipt
      try {
        const e = await estadoTwilioSms(t.sid)
        if (['delivered', 'undelivered', 'failed'].includes(e.status)) {
          t.estado = e.status; t.final = true; t.error_code = e.error_code || null; t.error_msg = e.error_message || null; cambio = true
          try { historial.registrar({ canal: 'sms', direccion: 'saliente', contraparte: t.destino, texto: `[entrega: ${e.status}${e.error_code ? ' #' + e.error_code : ''}]`, origen: 'entrega', estado: e.status === 'delivered' ? 'entregado' : 'no_entregado', detalle: e.error_message || null }) } catch { /* */ }
          flog(`SMS ENTREGA ${t.sid} -> ${t.destino}: ${e.status}${e.error_code ? ' (#' + e.error_code + ' ' + (e.error_message || '') + ')' : ''}`)
        } else if (Date.now() - t.ts > 20 * 60000) { t.estado = e.status || 'desconocido'; t.final = true; cambio = true }
      } catch { /* reintenta el próximo tick */ }
    }
    if (cambio) escribirTrackSms(a)
  } finally { _verifSms = false }
}
// Resumen de entregas (para reportar): cuántos llegaron / no llegaron + motivos.
export function resumenEntregasSms(destino) {
  const norm = destino ? ('+' + String(destino).replace(/[^0-9]/g, '')) : null
  const a = leerTrackSms().filter((t) => !norm || t.destino === norm)
  const out = { total: a.length, entregados: 0, no_entregados: 0, pendientes: 0, fallos: [] }
  for (const t of a) {
    if (!t.final) out.pendientes++
    else if (t.estado === 'delivered') out.entregados++
    else { out.no_entregados++; out.fallos.push({ estado: t.estado, error_code: t.error_code, error_msg: t.error_msg }) }
  }
  return out
}

// Envía un mensaje YA (inmediato, sin esperar al scheduler de 20s). Mismos canales
// y destinos que programar(). Devuelve el registro con estado enviado/error y lo
// deja en el historial. Lanza si falla.
export async function enviarAhora({ canal, destino, mensaje, asunto, creado_por }) {
  canal = String(canal || 'sms').toLowerCase()
  if (!CANALES.includes(canal)) throw new Error(`Canal inválido "${canal}". Usa: ${CANALES.join(', ')}.`)
  if (canal === 'whatsapp') throw new Error('WhatsApp está deshabilitado como canal de salida (anti-ban). Usa sms o correo.')
  const texto = String(mensaje || '').trim()
  if (!texto) throw new Error('Falta el MENSAJE a enviar.')
  const dest = destino
    ? (canal === 'whatsapp' ? (normNum(destino) || String(destino).trim()) : String(destino).trim())
    : getDestinos()[canal]
  if (!dest) throw new Error(`Falta el DESTINO para ${canal} (y no hay uno por defecto).`)
  const reg = {
    id: nuevoId(), canal, destino: dest, mensaje: texto,
    asunto: canal === 'correo' ? String(asunto || 'Mensaje de Nexus') : undefined,
    cuando: new Date().toISOString(), creado: new Date().toISOString(),
    creado_por: creado_por || null, estado: 'enviando', resultado: null,
  }
  try {
    const res = await enviar(reg)
    reg.estado = 'enviado'; reg.resultado = 'ok'; reg.enviado = new Date().toISOString()
    flog(`ENVIO_YA ${reg.id} ${canal} -> ${dest} :: ${texto.slice(0, 60)}`)
    try { historial.registrar({ canal, direccion: 'saliente', contraparte: dest, texto, asunto: reg.asunto, origen: 'manual', ref_id: reg.id, estado: 'enviado', detalle: typeof res === 'string' ? res : null }) } catch { /* */ }
    return reg
  } catch (e) {
    reg.estado = 'error'; reg.resultado = String(e.message).slice(0, 200)
    flog(`ERROR_YA ${reg.id} ${canal} -> ${dest}: ${reg.resultado}`)
    try { historial.registrar({ canal, direccion: 'saliente', contraparte: dest, texto, asunto: reg.asunto, origen: 'manual', ref_id: reg.id, estado: 'error', detalle: reg.resultado }) } catch { /* */ }
    throw e
  }
}

// ── Ticker (corre dentro del daemon del Hub) ──────────────────────────────────
let _corriendo = false
// 🛡️ THROTTLE POR LOTES — para TODOS los canales. Cada canal manda hasta `lote`
// mensajes y luego pausa `pausa_min` minutos antes del siguiente lote. WhatsApp es
// PREDETERMINADO (fijo, anti-ban). Los demás se configuran desde el panel.
const RUTA_THROTTLE = join(HOME, 'nexus', 'recordatorios-throttle.json')
// Valores RECOMENDADOS/seguros por canal (el front marca en ROJO si te pasas):
//  lote_max = máximo de mensajes por lote seguro · pausa_rec = pausa mínima recomendada (min)
export const THROTTLE_REC = {
  whatsapp: { lote_max: 10, pausa_rec: 2, fijo: true, nota: 'WhatsApp banea por ráfaga (vía no oficial). Fijo y conservador.' },
  sms: { lote_max: 30, pausa_rec: 1, nota: 'Twilio aguanta ~1 SMS/seg; 30 por minuto va cómodo.' },
  correo: { lote_max: 50, pausa_rec: 1, nota: 'Gmail tiene límite diario (~500/día gratis); no abuses.' },
  telefono: { lote_max: 5, pausa_rec: 1, nota: 'Llamadas: pocas a la vez (concurrencia Twilio).' },
  llamada: { lote_max: 5, pausa_rec: 1, nota: 'Llamada Telegram: pocas a la vez.' },
}
const THROTTLE_DEFAULT = {
  whatsapp: { lote: 10, pausa_min: 2 }, sms: { lote: 20, pausa_min: 1 },
  correo: { lote: 30, pausa_min: 1 }, telefono: { lote: 3, pausa_min: 1 }, llamada: { lote: 3, pausa_min: 1 },
}
export function getThrottle() {
  let cfg = {}
  try { cfg = JSON.parse(readFileSync(RUTA_THROTTLE, 'utf8')) || {} } catch { cfg = {} }
  const out = {}
  for (const c of CANALES) out[c] = { ...THROTTLE_DEFAULT[c], ...(cfg[c] || {}) }
  // WhatsApp SIEMPRE forzado al seguro (no se puede aflojar): lote ≤ máx, pausa ≥ rec.
  out.whatsapp = {
    lote: Math.min(out.whatsapp.lote, THROTTLE_REC.whatsapp.lote_max),
    pausa_min: Math.max(out.whatsapp.pausa_min, THROTTLE_REC.whatsapp.pausa_rec),
  }
  return out
}
export function setThrottle(canal, { lote, pausa_min }) {
  if (!CANALES.includes(canal)) throw new Error(`Canal inválido: ${canal}`)
  if (canal === 'whatsapp') throw new Error('WhatsApp es predeterminado (anti-ban): no se puede cambiar.')
  let cfg = {}
  try { cfg = JSON.parse(readFileSync(RUTA_THROTTLE, 'utf8')) || {} } catch { cfg = {} }
  cfg[canal] = {
    lote: Math.max(1, Math.floor(Number(lote) || THROTTLE_DEFAULT[canal].lote)),
    pausa_min: Math.max(0, Number(pausa_min) || 0),
  }
  writeFileSync(RUTA_THROTTLE, JSON.stringify(cfg, null, 2))
  return getThrottle()
}
const _throttle = {}   // canal -> { inicio, enviados } (ventana actual)
function puedeEnviarCanal(canal, cfg) {
  const c = cfg[canal]
  if (!c) return true
  const pausaMs = Math.max(1, Number(c.pausa_min) || 1) * 60000
  const lote = Math.max(1, Number(c.lote) || 1)
  const st = _throttle[canal] || (_throttle[canal] = { inicio: 0, enviados: 0 })
  const ahora = Date.now()
  if (ahora - st.inicio >= pausaMs) { st.inicio = ahora; st.enviados = 0 }   // nueva ventana
  return st.enviados < lote
}

// ── CAMPAÑAS EN BUCLE (ráfaga → pausa de refresco → repetir, hasta pararla) ──────
// Una campaña reenvía el MISMO mensaje en RÁFAGAS: manda `rafaga` mensajes (separados
// `espaciado_min`), espera `refresco_min` y vuelve a lanzar otra ráfaga. Sigue así
// HASTA QUE SE PARE. Persiste en disco → sobrevive reinicios (sigue sola al volver).
const RUTA_CAMPANAS = join(HOME, 'nexus', 'recordatorios-campanas.json')

// Defaults RECOMENDADOS por canal: cuántos por ráfaga · espaciado entre mensajes (min) ·
// refresco entre ráfagas (min). Pensados para mandar harto en poco rato SIN quemar la cuenta.
export const CAMP_DEFAULT = {
  correo:   { rafaga: 10, espaciado_min: 0.2, refresco_min: 15 },  // 10 en ~2min, luego 15min (Gmail ~500/día)
  whatsapp: { rafaga: 3,  espaciado_min: 5,   refresco_min: 30 },  // muy conservador (anti-ban vía no oficial)
  sms:      { rafaga: 5,  espaciado_min: 0.2, refresco_min: 10 },
  telefono: { rafaga: 1,  espaciado_min: 1,   refresco_min: 30 },
  llamada:  { rafaga: 1,  espaciado_min: 1,   refresco_min: 30 },
}
// Topes anti-ban (mínimos/máximos forzados). WhatsApp es FIJO (vía no oficial banea fácil).
export const CAMP_CAP = {
  whatsapp: { rafaga_max: 5,  espaciado_min_min: 5, refresco_min_min: 30, fijo: true },
  correo:   { rafaga_max: 30, espaciado_min_min: 0, refresco_min_min: 5 },
  sms:      { rafaga_max: 30, espaciado_min_min: 0, refresco_min_min: 5 },
  telefono: { rafaga_max: 5,  espaciado_min_min: 0, refresco_min_min: 5 },
  llamada:  { rafaga_max: 5,  espaciado_min_min: 0, refresco_min_min: 5 },
}
function leerCampanas() { try { const a = JSON.parse(readFileSync(RUTA_CAMPANAS, 'utf8')); return Array.isArray(a) ? a : [] } catch { return [] } }
function escribirCampanas(a) { writeFileSync(RUTA_CAMPANAS, JSON.stringify(a, null, 2)) }

// ── INTERRUPTOR MAESTRO DE COBRANZA ──────────────────────────────────────────
// Si existe ~/nexus/COBRANZA-OFF, NINGUNA campaña (correo/SMS) se dispara ni se
// crea/reanuda. Reversible: borrar el archivo. WhatsApp además está bloqueado aparte.
const RUTA_COBRANZA_OFF = join(HOME, 'nexus', 'COBRANZA-OFF')
function cobranzaApagada() { try { readFileSync(RUTA_COBRANZA_OFF); return true } catch { return false } }

function aplicaTopes(canal, p) {
  const cap = CAMP_CAP[canal] || {}
  const d = CAMP_DEFAULT[canal] || { rafaga: 1, espaciado_min: 1, refresco_min: 10 }
  let rafaga = Math.max(1, Math.floor(Number(p.rafaga) || d.rafaga))
  let espaciado_min = Math.max(0, Number(p.espaciado_min ?? d.espaciado_min))
  let refresco_min = Math.max(0, Number(p.refresco_min ?? d.refresco_min))
  if (cap.rafaga_max) rafaga = Math.min(rafaga, cap.rafaga_max)
  if (cap.espaciado_min_min) espaciado_min = Math.max(espaciado_min, cap.espaciado_min_min)
  if (cap.refresco_min_min) refresco_min = Math.max(refresco_min, cap.refresco_min_min)
  return { rafaga, espaciado_min, refresco_min }
}

// Encola UNA ráfaga (N mensajes espaciados) y programa la próxima (= fin de ráfaga + refresco).
function lanzarRafaga(camp) {
  if (cobranzaApagada()) { flog(`CAMPAÑA BLOQUEADA (COBRANZA-OFF) ${camp.id} ${camp.canal} -> ${camp.destino}`); return }
  let store = leerStore()
  // Poda: quita mensajes de campaña YA terminados y viejos (>30min) para no inflar el archivo.
  const limite = Date.now() - 30 * 60000
  store = store.filter((r) => !(r.campana && ['enviado', 'error', 'cancelado'].includes(r.estado) && Date.parse(r.enviado || r.cuando) < limite))
  const base = Date.now()
  const espMs = Math.max(0, Number(camp.espaciado_min) || 0) * 60000
  const serie = nuevoId()
  for (let i = 0; i < camp.rafaga; i++) {
    store.push({
      id: nuevoId(), canal: camp.canal, destino: camp.destino, mensaje: camp.mensaje,
      asunto: camp.canal === 'correo' ? (camp.asunto || 'Recordatorio de Nexus') : undefined,
      cuando: new Date(base + i * espMs).toISOString(),
      creado: new Date().toISOString(), creado_por: camp.creado_por || null,
      estado: 'pendiente', resultado: null,
      campana: camp.id, serie, indice: i + 1, total: camp.rafaga,
    })
  }
  escribirStore(store)
  const tramoMs = (camp.rafaga * espMs) + Math.max(0, Number(camp.refresco_min) || 0) * 60000
  const camps = leerCampanas()
  const c = camps.find((x) => x.id === camp.id)
  if (c) {
    c.rafagas = (c.rafagas || 0) + 1
    c.enviadas = (c.enviadas || 0) + camp.rafaga
    c.proximo = new Date(base + tramoMs).toISOString()
    c.ultima_rafaga = new Date().toISOString()
    escribirCampanas(camps)
    camp.proximo = c.proximo
  }
  flog(`CAMPAÑA RÁFAGA ${camp.id} +${camp.rafaga} ${camp.canal} -> ${camp.destino}; próxima @ ${camp.proximo}`)
}

export function crearCampana({ canal, destino, mensaje, asunto, rafaga, espaciado_min, refresco_min, creado_por }) {
  if (cobranzaApagada()) throw new Error('Cobranza DESACTIVADA (existe ~/nexus/COBRANZA-OFF). No se crean campañas.')
  canal = String(canal || 'sms').toLowerCase()
  if (!CANALES.includes(canal)) throw new Error(`Canal inválido "${canal}". Usa: ${CANALES.join(', ')}.`)
  if (canal === 'whatsapp') throw new Error('WhatsApp está deshabilitado como canal de campañas (anti-ban). Usa sms o correo.')
  const texto = String(mensaje || '').trim()
  if (!texto) throw new Error('Falta el MENSAJE de la campaña.')
  let dest = destino ? String(destino).trim() : getDestinos()[canal]
  if (canal === 'whatsapp') dest = normNum(dest) || dest
  if (!dest) throw new Error(`No hay destino para ${canal} (ni explícito ni por defecto).`)
  const t = aplicaTopes(canal, { rafaga, espaciado_min, refresco_min })
  const camp = {
    id: nuevoId(), canal, destino: dest, mensaje: texto,
    asunto: canal === 'correo' ? String(asunto || 'Recordatorio de Nexus') : undefined,
    ...t, estado: 'activa',
    creado: new Date().toISOString(), creado_por: creado_por || null,
    proximo: new Date().toISOString(), rafagas: 0, enviadas: 0,
  }
  const camps = leerCampanas(); camps.push(camp); escribirCampanas(camps)
  flog(`CAMPAÑA NUEVA ${camp.id} ${canal} -> ${dest} rafaga=${t.rafaga} esp=${t.espaciado_min}min refresco=${t.refresco_min}min :: ${texto.slice(0, 50)}`)
  lanzarRafaga(camp)   // primera ráfaga YA
  return camp
}

export function listarCampanas() { return leerCampanas() }
export function pararCampana(id) {
  const camps = leerCampanas(); const c = camps.find((x) => x.id === id)
  if (!c) return false
  c.estado = 'parada'; escribirCampanas(camps); flog(`CAMPAÑA PARADA ${id}`); return true
}
export function reanudarCampana(id) {
  if (cobranzaApagada()) return false
  const camps = leerCampanas(); const c = camps.find((x) => x.id === id)
  if (!c) return false
  c.estado = 'activa'; c.proximo = new Date().toISOString(); escribirCampanas(camps); flog(`CAMPAÑA REANUDADA ${id}`); return true
}
export function pararCampanas(canal) {
  const camps = leerCampanas(); let n = 0
  for (const c of camps) { if (c.estado === 'activa' && (!canal || c.canal === canal)) { c.estado = 'parada'; n++ } }
  if (n) escribirCampanas(camps)
  flog(`CAMPAÑAS PARADAS x${n}${canal ? ' (' + canal + ')' : ''}`); return n
}

// BLINDAJE anti-flood/anti-ban: tope DURO de mensajes por campaña. WhatsApp bien bajo
// (Baileys banea fácil); SMS/correo más holgado. Al llegar al tope, la campaña se
// auto-detiene (aunque alguien la reactive por error, en el próximo tick vuelve a pararse).
const CAP_CAMPANA = { whatsapp: 5, sms: 15, correo: 60 }
// Llamado en cada tick: si una campaña activa ya venció su `proximo`, lanza otra ráfaga.
function tickCampanas() {
  if (cobranzaApagada()) return
  const camps = leerCampanas()
  const ahora = Date.now()
  let cambio = false
  for (const c of camps) {
    if (c.estado !== 'activa') continue
    const cap = CAP_CAMPANA[c.canal] || 20
    if ((c.enviadas || 0) >= cap) {
      c.estado = 'parada'; c.parada_por = 'tope-blindaje'; c.parada_en = new Date().toISOString()
      flog(`CAMPAÑA ${c.id} DETENIDA por tope de blindaje (${c.enviadas}/${cap} ${c.canal})`)
      cambio = true; continue
    }
    if (Date.parse(c.proximo) <= ahora) {
      try { lanzarRafaga(c) } catch (e) { flog(`CAMPAÑA ${c.id} ráfaga falló: ${e.message}`) }
    }
  }
  if (cambio) { try { escribirCampanas(camps) } catch { /* */ } }
}

// ── AGENDA DIARIA (ciclo por HORAS del día, ej. 12am/1am/3am, todos los días) ────
// A diferencia de las campañas (ráfaga+pausa), esto dispara a HORAS de reloj fijas
// cada día, en la zona horaria indicada (por defecto Chile). Cada hora dispara 1 vez.
const RUTA_AGENDA = join(HOME, 'nexus', 'recordatorios-agenda.json')
const TZ_DEFECTO = 'America/Santiago'
function leerAgenda() { try { const a = JSON.parse(readFileSync(RUTA_AGENDA, 'utf8')); return Array.isArray(a) ? a : [] } catch { return [] } }
function escribirAgenda(a) { writeFileSync(RUTA_AGENDA, JSON.stringify(a, null, 2)) }
function horaFechaTZ(tz) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, hourCycle: 'h23' })
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]))
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour), minuto: Number(p.minute) }
}
export function crearAgendaDiaria({ canal, destino, mensaje, asunto, horas, minuto = 0, tz, creado_por, activa = true }) {
  canal = String(canal || 'sms').toLowerCase()
  if (!CANALES.includes(canal)) throw new Error(`Canal inválido "${canal}".`)
  if (canal === 'whatsapp') throw new Error('WhatsApp está deshabilitado como canal de salida (anti-ban). Usa sms o correo.')
  const texto = String(mensaje || '').trim()
  if (!texto) throw new Error('Falta el MENSAJE.')
  let dest = destino ? String(destino).trim() : getDestinos()[canal]
  if (canal === 'whatsapp') dest = normNum(dest) || dest
  if (!dest) throw new Error(`No hay destino para ${canal}.`)
  const hs = [...new Set((Array.isArray(horas) ? horas : []).map(Number).filter((h) => Number.isInteger(h) && h >= 0 && h < 24))].sort((a, b) => a - b)
  if (!hs.length) throw new Error('Faltan HORAS (lista 0-23).')
  const e = {
    id: nuevoId(), canal, destino: dest, mensaje: texto,
    asunto: canal === 'correo' ? String(asunto || 'Recordatorio de Nexus') : undefined,
    horas: hs, minuto: Math.max(0, Math.min(59, Number(minuto) || 0)), tz: tz || TZ_DEFECTO,
    estado: activa ? 'activa' : 'pausada',
    creado: new Date().toISOString(), creado_por: creado_por || null, ultimo_disparo: '',
  }
  const a = leerAgenda(); a.push(e); escribirAgenda(a)
  flog(`AGENDA NUEVA ${e.id} ${canal} -> ${dest} horas=[${hs.join(',')}] tz=${e.tz} estado=${e.estado} :: ${texto.slice(0, 40)}`)
  return e
}
export function listarAgenda() { return leerAgenda() }
export function pararAgenda(id) { const a = leerAgenda(); const e = a.find((x) => x.id === id); if (!e) return false; e.estado = 'pausada'; escribirAgenda(a); flog(`AGENDA PAUSADA ${id}`); return true }
export function activarAgenda(id) { const a = leerAgenda(); const e = a.find((x) => x.id === id); if (!e) return false; e.estado = 'activa'; e.ultimo_disparo = ''; escribirAgenda(a); flog(`AGENDA ACTIVADA ${id}`); return true }
export function borrarAgenda(id) { const a = leerAgenda(); const n = a.filter((x) => x.id !== id); escribirAgenda(n); flog(`AGENDA BORRADA ${id}`); return n.length < a.length }
function tickAgenda() {
  const a = leerAgenda()
  if (!a.length) return
  let cambio = false
  for (const e of a) {
    if (e.estado !== 'activa') continue
    const { fecha, hora, minuto } = horaFechaTZ(e.tz || TZ_DEFECTO)
    if (!e.horas.includes(hora)) continue
    if (minuto < (e.minuto || 0)) continue
    const clave = `${fecha}-${hora}`
    if (e.ultimo_disparo === clave) continue   // ya disparó esta hora hoy
    const store = leerStore()
    store.push({
      id: nuevoId(), canal: e.canal, destino: e.destino, mensaje: e.mensaje, asunto: e.asunto,
      cuando: new Date().toISOString(), creado: new Date().toISOString(), creado_por: e.creado_por,
      estado: 'pendiente', resultado: null, agenda: e.id,
    })
    escribirStore(store)
    e.ultimo_disparo = clave; cambio = true
    flog(`AGENDA DISPARO ${e.id} ${e.canal} -> ${e.destino} @ ${clave} (${e.tz})`)
  }
  if (cambio) escribirAgenda(a)
}

async function tick() {
  if (_corriendo) return
  _corriendo = true
  try {
    try { tickCampanas() } catch (e) { flog('tickCampanas error: ' + e.message) }
    try { tickAgenda() } catch (e) { flog('tickAgenda error: ' + e.message) }
    verificarEntregasSms().catch(() => {})   // revisa entregas SMS (sin bloquear el tick)
    const store = leerStore()
    const ahora = Date.now()
    const vencidos = store.filter((r) => r.estado === 'pendiente' && Date.parse(r.cuando) <= ahora)
    const throttleCfg = getThrottle()
    for (const reg of vencidos) {
      // 🛡️ Throttle por LOTES (TODOS los canales): si el lote de la ventana de este
      // canal está lleno, deja el mensaje para la próxima ventana (sigue 'pendiente').
      if (!puedeEnviarCanal(reg.canal, throttleCfg)) continue
      _throttle[reg.canal].enviados++
      // Marca 'enviando' ANTES de enviar y persiste, para no duplicar si el envío
      // tarda y entra otro tick (o si el daemon se reinicia a media acción).
      reg.estado = 'enviando'
      escribirStore(store)
      try {
        const resEnvio = await enviar(reg)
        reg.estado = 'enviado'; reg.resultado = 'ok'; reg.enviado = new Date().toISOString()
        flog(`ENVIADO ${reg.id} ${reg.canal} -> ${reg.destino}`)
        try {
          historial.registrar({
            canal: reg.canal, direccion: 'saliente', contraparte: reg.destino,
            texto: reg.mensaje, asunto: reg.asunto, origen: 'recordatorio', ref_id: reg.id,
            estado: 'enviado', detalle: typeof resEnvio === 'string' ? resEnvio : null,
          })
        } catch (e2) { flog('historial(ok) falló: ' + e2.message) }
      } catch (e) {
        reg.estado = 'error'; reg.resultado = String(e.message).slice(0, 200)
        flog(`ERROR ${reg.id} ${reg.canal} -> ${reg.destino}: ${reg.resultado}`)
        try {
          historial.registrar({
            canal: reg.canal, direccion: 'saliente', contraparte: reg.destino,
            texto: reg.mensaje, asunto: reg.asunto, origen: 'recordatorio', ref_id: reg.id,
            estado: 'error', detalle: reg.resultado,
          })
        } catch (e2) { flog('historial(err) falló: ' + e2.message) }
      }
      escribirStore(leerStore().map((x) => (x.id === reg.id ? reg : x)))
    }
  } catch (e) { flog('TICK error: ' + e.message) } finally { _corriendo = false }
}

let _timer = null
export function iniciarScheduler({ intervaloMs = 20000 } = {}) {
  if (_timer) return
  // 🔁 RECUPERACIÓN tras reinicio: cualquier mensaje que quedó en 'enviando' es de un
  // proceso anterior que se cortó a media acción → lo devolvemos a 'pendiente' para
  // reintentarlo. Así, si el hub se reinicia en pleno envío, NADA se pierde (los
  // 'pendiente' ya persisten en disco y el barrido los retoma).
  try {
    const store = leerStore()
    let rec = 0
    for (const r of store) { if (r.estado === 'enviando') { r.estado = 'pendiente'; r.resultado = null; rec++ } }
    if (rec) { escribirStore(store); flog(`RECUPERADOS ${rec} mensaje(s) 'enviando' -> 'pendiente' tras reinicio`) }
  } catch (e) { flog('recuperación inicial falló: ' + e.message) }
  flog('scheduler iniciado')
  tick()  // primer barrido inmediato (manda los vencidos que quedaron pendientes)
  _timer = setInterval(tick, intervaloMs)
  if (_timer.unref) _timer.unref()
}

export { CANALES }

// ── CLI mínima: gestionar campañas desde la terminal ──────────────────────────
//   node recordatorios.mjs campana-crear <canal> <destino> <mensaje> [asunto] [rafaga] [espaciado_min] [refresco_min]
//   node recordatorios.mjs campana-listar
//   node recordatorios.mjs campana-parar <id|all|all:canal>
//   node recordatorios.mjs campana-reanudar <id>
// NO arranca el scheduler (eso lo hace el daemon del Hub); solo edita el store/campañas.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const [, , cmd, ...a] = process.argv
  try {
    if (cmd === 'campana-crear') {
      const [canal, destino, mensaje, asunto, rafaga, espaciado_min, refresco_min] = a
      const c = crearCampana({ canal, destino, mensaje, asunto: asunto || undefined, rafaga, espaciado_min, refresco_min, creado_por: 'cli' })
      console.log(JSON.stringify(c, null, 2))
    } else if (cmd === 'campana-listar') {
      console.log(JSON.stringify(listarCampanas(), null, 2))
    } else if (cmd === 'campana-parar') {
      const arg = a[0] || ''
      if (arg === 'all') console.log('paradas:', pararCampanas())
      else if (arg.startsWith('all:')) console.log('paradas:', pararCampanas(arg.slice(4)))
      else console.log('parada:', pararCampana(arg))
    } else if (cmd === 'campana-reanudar') {
      console.log('reanudada:', reanudarCampana(a[0]))
    } else {
      console.log('Comandos: campana-crear | campana-listar | campana-parar <id|all|all:canal> | campana-reanudar <id>')
    }
  } catch (e) { console.error('ERROR:', e.message); process.exit(1) }
}

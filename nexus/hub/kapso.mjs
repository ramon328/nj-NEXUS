// Puente WhatsApp Cloud API (oficial) vía Kapso. Reemplaza a OpenClaw/Baileys, que
// baneaba el número (ver memoria whatsapp-baneo-por-autorespuesta). Aquí SOLO va la
// mecánica de transporte: enviar texto por la API de Kapso, verificar la firma de los
// webhooks entrantes y extraer del payload v2 lo mínimo (remitente + texto). El cerebro
// y el ruteo (cobranza/SII/admin) siguen en server.js /api/chat.
import crypto from 'node:crypto'

const API_KEY = process.env.KAPSO_API_KEY || ''
const PHONE_ID = process.env.KAPSO_PHONE_ID || ''
const SECRET = process.env.KAPSO_WEBHOOK_SECRET || ''
const GRAPH = process.env.META_GRAPH_VERSION || 'v24.0'
// Base del proxy Meta de Kapso (host, sin /platform ni /meta): api.kapso.ai
const HOST = (process.env.KAPSO_API_BASE_URL || 'https://api.kapso.ai').replace(/\/+$/, '')
const META_BASE = `${HOST}/meta/whatsapp/${GRAPH}`

export function kapsoConfigurado() { return Boolean(API_KEY && PHONE_ID) }

// WhatsApp corta el texto en 4096 chars; partimos en trozos por si una respuesta larga.
function trozos(texto, max = 3900) {
  const t = String(texto || '').trim()
  if (t.length <= max) return t ? [t] : []
  const out = []
  let resto = t
  while (resto.length > max) {
    let corte = resto.lastIndexOf('\n', max)
    if (corte < max * 0.5) corte = resto.lastIndexOf(' ', max)
    if (corte < max * 0.5) corte = max
    out.push(resto.slice(0, corte))
    resto = resto.slice(corte).replace(/^\s+/, '')
  }
  if (resto) out.push(resto)
  return out
}

// Envía un texto por WhatsApp vía Kapso (Cloud API oficial). `to` = número E.164 (con o
// sin +). Devuelve el/los message id. Lanza si Kapso responde error.
export async function enviarKapso(to, texto) {
  if (!kapsoConfigurado()) throw new Error('Kapso sin configurar (KAPSO_API_KEY/KAPSO_PHONE_ID)')
  const dest = String(to || '').replace(/[^0-9]/g, '')
  if (!dest) throw new Error('destino vacío')
  const ids = []
  for (const parte of trozos(texto)) {
    const r = await fetch(`${META_BASE}/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: dest, type: 'text', text: { body: parte, preview_url: /https?:\/\//i.test(parte) } }),
    })
    const txt = await r.text()
    let data; try { data = JSON.parse(txt) } catch { data = txt }
    if (!r.ok) throw new Error(`Kapso ${r.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
    const id = data?.messages?.[0]?.id
    if (id) ids.push(id)
  }
  return ids
}

// Envía un mensaje de PLANTILLA (template) aprobada por Meta. Es el ÚNICO tipo de mensaje
// que WhatsApp deja mandar FUERA de la ventana de 24h (para escribirle PRIMERO al usuario:
// alertas, avisos, recordatorios). La plantilla debe existir y estar APPROVED en la WABA
// (crear/revisar: POST/GET .../{WABA}/message_templates). `vars` = { param: valor } para
// plantillas con parámetros NAMED (ej. { nombre: 'Ramón', mensaje: '…' }). Si la plantilla
// no tiene variables, pasar {} y no se manda `components`. opts.idioma = code (def 'es').
// Devuelve el message id. Lanza con el error de Meta si algo falla (ej. plantilla no
// aprobada = 132001, número no válido, etc.).
export async function enviarPlantillaKapso(to, nombrePlantilla, vars = {}, opts = {}) {
  if (!kapsoConfigurado()) throw new Error('Kapso sin configurar (KAPSO_API_KEY/KAPSO_PHONE_ID)')
  const dest = String(to || '').replace(/[^0-9]/g, '')
  if (!dest) throw new Error('destino vacío')
  if (!nombrePlantilla) throw new Error('falta el nombre de la plantilla')
  const idioma = opts.idioma || 'es'
  const params = Object.entries(vars || {}).filter(([, v]) => v != null)
  const template = { name: nombrePlantilla, language: { code: idioma } }
  if (params.length) {
    template.components = [{
      type: 'body',
      parameters: params.map(([param_name, valor]) => ({ type: 'text', parameter_name: param_name, text: String(valor) })),
    }]
  }
  const r = await fetch(`${META_BASE}/${PHONE_ID}/messages`, {
    method: 'POST', headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: dest, type: 'template', template }),
  })
  const txt = await r.text(); let data; try { data = JSON.parse(txt) } catch { data = txt }
  if (!r.ok) throw new Error(`Kapso plantilla ${r.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
  return data?.messages?.[0]?.id || ''
}

// Envía una imagen/documento por WhatsApp vía Kapso. `media` puede ser una URL http(s)
// (se manda por link) o una ruta local (se sube primero y se manda por media_id).
// opts.forceDocument = mandarlo como documento (PDF, sin compresión de imagen).
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', pdf: 'application/pdf' }
export async function enviarMediaKapso(to, media, caption = '', opts = {}) {
  if (!kapsoConfigurado()) throw new Error('Kapso sin configurar')
  const dest = String(to || '').replace(/[^0-9]/g, '')
  if (!dest) throw new Error('destino vacío')
  const ext = String(media || '').split('.').pop().toLowerCase().split('?')[0]
  const mime = MIME[ext] || 'application/octet-stream'
  const esDoc = Boolean(opts.forceDocument) || (!String(mime).startsWith('image/'))
  const tipo = esDoc ? 'document' : 'image'

  // Referencia al medio: por link (URL) o subiéndolo y usando el id (archivo local).
  let ref
  const esURL = /^https?:\/\//i.test(String(media || ''))
  if (esURL) {
    ref = { link: media }
  } else {
    const { readFile } = await import('node:fs/promises')
    const buf = await readFile(media)
    const fd = new FormData()
    fd.append('messaging_product', 'whatsapp')
    fd.append('type', mime)
    fd.append('file', new Blob([buf], { type: mime }), media.split('/').pop() || 'file')
    const up = await fetch(`${META_BASE}/${PHONE_ID}/media`, { method: 'POST', headers: { 'X-API-Key': API_KEY }, body: fd })
    const upTxt = await up.text(); let upData; try { upData = JSON.parse(upTxt) } catch { upData = upTxt }
    if (!up.ok) throw new Error(`Kapso upload ${up.status}: ${typeof upData === 'string' ? upData : JSON.stringify(upData)}`)
    const id = upData?.id || upData?.response?.data?.id || upData?.data?.id
    if (!id) throw new Error('Kapso upload sin media_id')
    ref = { id }
  }

  const contenido = { ...ref }
  if (caption) contenido.caption = String(caption).slice(0, 1024)
  if (esDoc) contenido.filename = (String(media).split('/').pop() || 'archivo').slice(0, 240)
  const r = await fetch(`${META_BASE}/${PHONE_ID}/messages`, {
    method: 'POST', headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: dest, type: tipo, [tipo]: contenido }),
  })
  const txt = await r.text(); let data; try { data = JSON.parse(txt) } catch { data = txt }
  if (!r.ok) throw new Error(`Kapso ${tipo} ${r.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
  return data?.messages?.[0]?.id || ''
}

// Envía una NOTA DE VOZ por WhatsApp. `filePath` debe ser OGG/Opus (así WhatsApp lo
// muestra como mensaje de voz con onda, no como archivo adjunto). Sube el audio y lo
// manda como type:audio. Devuelve el message id.
export async function enviarAudioKapso(to, filePath) {
  if (!kapsoConfigurado()) throw new Error('Kapso sin configurar')
  const dest = String(to || '').replace(/[^0-9]/g, '')
  if (!dest) throw new Error('destino vacío')
  const { readFile } = await import('node:fs/promises')
  const buf = await readFile(filePath)
  const fd = new FormData()
  fd.append('messaging_product', 'whatsapp')
  fd.append('type', 'audio/ogg')
  fd.append('file', new Blob([buf], { type: 'audio/ogg' }), (filePath.split('/').pop() || 'voz.ogg'))
  const up = await fetch(`${META_BASE}/${PHONE_ID}/media`, { method: 'POST', headers: { 'X-API-Key': API_KEY }, body: fd })
  const upTxt = await up.text(); let upData; try { upData = JSON.parse(upTxt) } catch { upData = upTxt }
  if (!up.ok) throw new Error(`Kapso upload audio ${up.status}: ${typeof upData === 'string' ? upData : JSON.stringify(upData)}`)
  const id = upData?.id || upData?.response?.data?.id || upData?.data?.id
  if (!id) throw new Error('Kapso upload audio sin media_id')
  const r = await fetch(`${META_BASE}/${PHONE_ID}/messages`, {
    method: 'POST', headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: dest, type: 'audio', audio: { id } }),
  })
  const txt = await r.text(); let data; try { data = JSON.parse(txt) } catch { data = txt }
  if (!r.ok) throw new Error(`Kapso audio ${r.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
  return data?.messages?.[0]?.id || ''
}

// Marca el mensaje entrante como LEÍDO y muestra el indicador "escribiendo…" en el
// WhatsApp del usuario. Se disipa solo al mandar la respuesta o a los ~25s. Best-effort:
// si falla no pasa nada (es solo cosmético). `wamid` = id del mensaje entrante.
export async function marcarEscribiendo(wamid) {
  if (!kapsoConfigurado() || !wamid) return
  try {
    await fetch(`${META_BASE}/${PHONE_ID}/messages`, {
      method: 'POST', headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: wamid, typing_indicator: { type: 'text' } }),
    })
  } catch { /* cosmético, se ignora */ }
}

// Verifica la firma HMAC-SHA256 del webhook contra el body CRUDO (bytes, antes del JSON).
// Header: X-Webhook-Signature = hex(HMAC-SHA256(secret, rawBody)). Si no hay secret
// configurado devuelve false (fail-closed): sin secret NO confiamos en el entrante.
export function verificarFirma(rawBody, firma) {
  if (!SECRET || !firma || !rawBody) return false
  try {
    const esperado = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex')
    const a = Buffer.from(esperado, 'hex')
    const b = Buffer.from(String(firma).replace(/^sha256=/, ''), 'hex')
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch { return false }
}

// Extrae de un payload v2 de `whatsapp.message.received` lo mínimo para el cerebro.
// Devuelve null si NO es un entrante de texto útil (ej. echo saliente, status, etc.).
export function parsearRecibido(body) {
  const m = body?.message
  if (!m) return null
  const kapso = m.kapso || {}
  // Solo mensajes ENTRANTES (nunca los ecos de lo que nosotros mandamos → evita bucles).
  if (kapso.direction && kapso.direction !== 'inbound') return null
  const de = body?.conversation?.phone_number || ''   // número del remitente (+56…)
  if (!de) return null
  const tipo = m.type || 'text'
  const esAudio = tipo === 'audio'
  let texto = ''
  if (esAudio) {
    // Nota de voz: Kapso ya la transcribe → usamos ese texto. Si no vino, dejamos vacío
    // y el que llame decidirá (bajar media_url y transcribir, o pedir que la repita).
    texto = (kapso.transcript?.text || '').trim()
    if (!texto && kapso.content) {   // respaldo: sacar lo que va tras "Transcript:" del content
      const mt = String(kapso.content).match(/Transcript:\s*([\s\S]+)$/i)
      if (mt) texto = mt[1].trim()
    }
  } else {
    texto = (m.text?.body || kapso.content || '').trim()
  }
  const nombre = body?.conversation?.kapso?.contact_name || ''
  const wamid = m.id || ''
  const mediaUrl = kapso.media_url || kapso.media_data?.url || ''
  return { de, texto, tipo, esAudio, mediaUrl, nombre, wamid, tieneMedia: Boolean(kapso.has_media) }
}

/**
 * Worker de WhatsApp para la captación con IA (vía no oficial — número de empresa
 * vinculado por QR como "WhatsApp Web"). Pensado para correr 24/7 en Render,
 * detrás de una PROXY chilena (IP residencial CL → no banean la línea).
 *
 * Qué hace:
 *   1) Levanta una página web ("/") con el QR para vincular el número desde el
 *      NAVEGADOR (no hace falta terminal). Una vez vinculado muestra "conectado".
 *      La sesión se guarda en WWEBJS_DATA_PATH (en Render: disco persistente →
 *      sobrevive reinicios/deploys, NO hay que re-escanear).
 *   2) Cada minuto revisa la cola: prospects status='approved' y scheduled_send_at
 *      vencido → envía proposed_message, marca 'contacted', guarda el saliente.
 *   3) Mensajes ENTRANTES → busca el prospecto por teléfono, guarda y marca
 *      'replied'. Si la IA contactó primero, responde sola (WA_AUTO_REPLY=1).
 *
 * Env (Render Dashboard o .env local):
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY   (requeridas)
 *   OUTREACH_API_URL                     (https://autosintel.vercel.app/api/outreach)
 *   WA_AUTO_REPLY=1                      (la IA responde sola; 0 = solo guarda)
 *   PROXY_URL                            (http://user:clave@host:puerto  o  http://host:puerto)
 *   WWEBJS_DATA_PATH=/data/.wwebjs_auth  (en Render: ruta del disco persistente)
 *   CHROME_PATH=/usr/bin/chromium        (Chrome del sistema; en Docker ya viene)
 *   QR_TOKEN                             (opcional: protege la página /qr con ?token=)
 *   PORT                                 (lo inyecta Render)
 *   WA_MAX_PER_TICK=5, WA_MIN_DELAY_MS=4000  (anti-ráfaga, opcionales)
 */
import { createClient } from '@supabase/supabase-js'
import pkg from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal'
import qrImage from 'qrcode'
import proxyChain from 'proxy-chain'
import express from 'express'
import 'dotenv/config'

const { Client, LocalAuth } = pkg

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY.')
  process.exit(1)
}
const MAX_PER_TICK = Number(process.env.WA_MAX_PER_TICK || 5)
const MIN_DELAY_MS = Number(process.env.WA_MIN_DELAY_MS || 4000)
const DATA_PATH = process.env.WWEBJS_DATA_PATH || './.wwebjs_auth'

// Auto-respuesta de la IA: la IA SOLO responde a números que ella contactó primero.
const AUTO_REPLY = process.env.WA_AUTO_REPLY === '1'
const OUTREACH_API_URL = (process.env.OUTREACH_API_URL || '').trim()
const REPLY_MIN_MS = Number(process.env.WA_REPLY_MIN_MS || 8000)   // espera "humana" antes de contestar
const REPLY_MAX_MS = Number(process.env.WA_REPLY_MAX_MS || 45000)

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// "+56 9 3294 5240" → "56932945240@c.us"
function toChatId(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null
  return `${digits}@c.us`
}

// Sincroniza la barra de estado del interés (1-2-3-4-5) con lo que hace la IA.
// Solo AVANZA (nunca retrocede): mensaje → respondido → coordinar.
const INTEREST_ORDER = ['interesado', 'mensaje', 'respondido', 'coordinar', 'comprar']
async function advanceInterest(listingId, target) {
  if (!listingId) return
  try {
    const { data } = await sb.from('interests').select('stage').eq('listing_id', listingId).maybeSingle()
    if (!data) return
    if (INTEREST_ORDER.indexOf(target) > INTEREST_ORDER.indexOf(data.stage)) {
      await sb.from('interests').update({ stage: target, updated_at: new Date().toISOString() })
        .eq('listing_id', listingId)
    }
  } catch (e) { console.error('advanceInterest:', e.message) }
}

// ── Proxy chilena (opcional) ────────────────────────────────────────────────
// proxy-chain abre un proxy local anónimo que reenvía a la proxy autenticada
// (Chrome no acepta user:clave en --proxy-server, por eso este puente).
const puppeteerArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-features=IsolateOrigins,site-per-process',
]
if (process.env.PROXY_URL && process.env.PROXY_URL.trim()) {
  try {
    const anon = await proxyChain.anonymizeProxy(process.env.PROXY_URL.trim())
    puppeteerArgs.push(`--proxy-server=${anon}`)
    console.log('🌐 Saliendo por proxy:', process.env.PROXY_URL.replace(/\/\/([^:]+):[^@]+@/, '//$1:****@'))
  } catch (e) {
    console.error('⚠️  No se pudo iniciar la proxy:', e.message, '— sigo SIN proxy')
  }
}

// Versión de WhatsApp Web: por defecto la librería usa la VIVA (1.34.7 la maneja).
// Solo se fija un HTML concreto si seteás WA_WEB_VERSION a propósito (pin obsoleto = cuelgue).
const WA_VERSION = (process.env.WA_WEB_VERSION || '').trim()
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: DATA_PATH }),
  ...(WA_VERSION ? {
    webVersionCache: {
      type: 'remote',
      remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${WA_VERSION}.html`,
    },
  } : {}),
  puppeteer: {
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    args: puppeteerArgs,
  },
})

// Estado para la página /qr.
let currentQr = null
let isReady = false
let connectedNumber = null

client.on('qr', (qr) => {
  currentQr = qr
  isReady = false
  console.log('\n📲 Escaneá este QR con el WhatsApp de la EMPRESA')
  console.log('   (WhatsApp → Dispositivos vinculados → Vincular un dispositivo)')
  console.log('   …o abrí la URL pública del servicio en el navegador y escaneá ahí:\n')
  qrcode.generate(qr, { small: true })
})

client.on('authenticated', () => console.log('✓ Autenticado.'))
client.on('loading_screen', (p, m) => console.log(`⏳ Cargando WhatsApp Web: ${p}% ${m || ''}`))
client.on('auth_failure', (m) => console.error('✗ Falló la autenticación:', m))
client.on('disconnected', (r) => { isReady = false; console.error('✗ Desconectado:', r) })

client.on('ready', async () => {
  isReady = true
  currentQr = null
  connectedNumber = client.info?.wid?.user || null
  console.log('✅ WhatsApp vinculado y listo. Worker en marcha. Número:', connectedNumber)
  await heartbeat(connectedNumber)            // marca "conectado" en la base
  setInterval(() => heartbeat(connectedNumber), 30_000)  // latido cada 30s
  tick()
  setInterval(tick, 60_000)                   // revisa la cola de outreach cada minuto
  sendPending()
  setInterval(sendPending, 8_000)             // envía los mensajes manuales casi al toque
})

// Reporta a outreach_settings que el worker está vivo (la web muestra "conectado").
async function heartbeat(num) {
  try {
    const patch = { wa_last_seen: new Date().toISOString() }
    if (num) patch.whatsapp_number = num
    await sb.from('outreach_settings').update(patch).eq('id', 1)
  } catch (e) { console.error('heartbeat:', e.message) }
}

// ── Entrantes: guardar y marcar 'replied' ──────────────────────────────────
client.on('message', async (msg) => {
  try {
    if (msg.from.endsWith('@g.us')) return // ignorar grupos
    if (msg.from === 'status@broadcast') return
    // Guardamos TODO lo que tenga contenido (texto o adjunto). Solo ignoramos los
    // mensajes de sistema SIN cuerpo (los "" que manda WhatsApp al vincular) → así
    // no se "pierden" mensajes en el chat.
    const body = (msg.body || '').trim() || (msg.hasMedia ? '[archivo adjunto]' : '')
    if (!body) return

    // WhatsApp a veces entrega el remitente como @lid (id privado) en vez de
    // @c.us (teléfono). Resolvemos el TELÉFONO REAL vía el contacto para pegar la
    // respuesta a la conversación que YA teníamos. Si no, se crea un prospecto
    // "entrante" duplicado y la IA no responde (no ve su saliente previo).
    let realPhone = msg.from.replace(/@(c\.us|lid)$/, '')
    if (msg.from.endsWith('@lid')) {
      try {
        const contact = await msg.getContact()
        // El TELÉFONO REAL viene en contact.id.user; contact.number suele repetir
        // el propio id @lid (inservible). Preferimos id.user y caemos a number.
        const idUser = String(contact?.id?.user || '').replace(/\D/g, '')
        const num = String(contact?.number || '').replace(/\D/g, '')
        const resolved = idUser || num
        console.log('lid→contact', JSON.stringify({ from: msg.from, number: contact?.number, idUser: contact?.id?.user }))
        if (resolved && resolved !== realPhone) realPhone = resolved
      } catch (e) { console.error('resolver @lid:', e.message) }
    }
    const tail = realPhone.slice(-8) // match laxo por los últimos 8 dígitos

    const { data: rows } = await sb
      .from('prospects')
      .select('id, listing_id')
      .like('phone', `%${tail}%`)
      .order('contacted_at', { ascending: false, nullsFirst: false }) // prioriza la conversación ya contactada
      .limit(1)
    let prospect = rows?.[0]
    // Fallback: si vino como @lid y no se pudo resolver el teléfono (no matcheó),
    // lo pegamos a la ÚLTIMA conversación a la que le escribimos — casi siempre es
    // quien está respondiendo. Evita perder la respuesta mientras WhatsApp no
    // exponga el teléfono real del @lid.
    if (!prospect && msg.from.endsWith('@lid')) {
      const { data: lastOut } = await sb
        .from('messages').select('prospect_id')
        .eq('direction', 'outbound').order('created_at', { ascending: false }).limit(1)
      const lpid = lastOut?.[0]?.prospect_id
      if (lpid) {
        const { data: cand } = await sb
          .from('prospects').select('id, listing_id, contacted_at').eq('id', lpid).single()
        if (cand?.contacted_at) {
          prospect = { id: cand.id, listing_id: cand.listing_id }
          console.log('@lid sin resolver → pegado a la última conversación contactada', cand.id)
        }
      }
    }
    if (!prospect) {
      // Entrante de un número que NO contactamos: lo guardamos igual para que
      // APAREZCA EN LA BANDEJA. La IA no le responde (no hay saliente previo).
      const { data: created } = await sb
        .from('prospects')
        .insert({ phone: realPhone, source: 'entrante', status: 'replied' })
        .select('id, listing_id')
        .single()
      prospect = created
    }
    if (!prospect) return
    await sb.from('messages').insert({
      prospect_id: prospect.id, direction: 'inbound', role: 'user',
      content: body, status: 'received',
    })
    await sb.from('prospects').update({ status: 'replied', updated_at: new Date().toISOString() })
      .eq('id', prospect.id)
    await advanceInterest(prospect.listing_id, 'respondido')
    console.log(`← entrante de ${realPhone}: ${body.slice(0, 60)}`)
    await maybeAutoReply(prospect.id, msg.from)
  } catch (e) { console.error('error entrante:', e.message) }
})

/**
 * Auto-respuesta: la IA (vía /api/outreach, con el HISTORIAL + el objetivo) redacta
 * la siguiente respuesta y el worker la envía tras una espera "humana". Solo responde
 * si la IA contactó PRIMERO a ese número (seguridad).
 */
async function maybeAutoReply(prospectId, chatId) {
  if (!AUTO_REPLY || !OUTREACH_API_URL) return
  try {
    const { data: p } = await sb.from('prospects')
      .select('objetivo, goal, make, model, year, price_clp, region, url, listing_id, ai_paused')
      .eq('id', prospectId).single()
    if (!p) return
    if (p.ai_paused) { console.log('IA pausada para', prospectId, '→ no respondo'); return }
    const { data: msgs } = await sb.from('messages')
      .select('direction, content, created_at')
      .eq('prospect_id', prospectId).order('created_at', { ascending: true })
    const history = (msgs || []).map(m => ({
      role: m.direction === 'outbound' ? 'assistant' : 'user',
      content: m.content,
    }))
    // SEGURIDAD: la IA SOLO responde si ELLA contactó primero (hay un saliente en el hilo).
    if (!history.some(h => h.role === 'assistant')) {
      console.log('auto-reply: la IA no contactó primero a este número → no respondo')
      return
    }
    const r = await fetch(OUTREACH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        car: { make: p.make, model: p.model, year: p.year, price_clp: p.price_clp, region: p.region, url: p.url },
        objetivo: p.objetivo, goal: p.goal, history,
      }),
    })
    if (!r.ok) { console.error('auto-reply: /api/outreach HTTP', r.status); return }
    const reply = (await r.json()).message
    if (!reply) return
    await sleep(REPLY_MIN_MS + Math.random() * Math.max(0, REPLY_MAX_MS - REPLY_MIN_MS))
    await client.sendMessage(chatId, reply)
    const ts = new Date().toISOString()
    await sb.from('messages').insert({
      prospect_id: prospectId, direction: 'outbound', role: 'assistant', content: reply, status: 'sent',
    })
    await sb.from('prospects').update({ status: 'negotiating', last_sent_at: ts, updated_at: ts }).eq('id', prospectId)
    await advanceInterest(p.listing_id, 'coordinar')
    console.log(`↩ auto-respuesta IA enviada a ${chatId}`)
  } catch (e) { console.error('auto-reply error:', e.message) }
}

// ── Salientes: enviar lo agendado-vencido ──────────────────────────────────
async function tick() {
  if (!isReady) return
  try {
    const nowIso = new Date().toISOString()
    const { data: due, error } = await sb
      .from('prospects')
      .select('id, phone, proposed_message, listing_id')
      .eq('status', 'approved')
      .not('proposed_message', 'is', null)
      .or(`scheduled_send_at.is.null,scheduled_send_at.lte.${nowIso}`)
      .order('scheduled_send_at', { ascending: true })
      .limit(MAX_PER_TICK)
    if (error) { console.error('cola:', error.message); return }
    if (!due?.length) return

    for (const p of due) {
      const chatId = toChatId(p.phone)
      if (!chatId) {
        await sb.from('prospects').update({ status: 'invalid', last_error: 'telefono_invalido' }).eq('id', p.id)
        continue
      }
      try {
        await client.sendMessage(chatId, p.proposed_message)
        const ts = new Date().toISOString()
        await sb.from('messages').insert({
          prospect_id: p.id, direction: 'outbound', role: 'assistant',
          content: p.proposed_message, status: 'sent',
        })
        await sb.from('prospects').update({
          status: 'contacted', contacted_at: ts, last_sent_at: ts, updated_at: ts,
        }).eq('id', p.id)
        await advanceInterest(p.listing_id, 'mensaje')
        console.log(`→ enviado a ${p.phone}`)
      } catch (e) {
        await sb.from('prospects').update({ last_error: String(e.message).slice(0, 200) }).eq('id', p.id)
        console.error(`✗ no se pudo enviar a ${p.phone}:`, e.message)
      }
      await sleep(MIN_DELAY_MS + Math.random() * MIN_DELAY_MS) // pausa anti-ráfaga
    }
  } catch (e) { console.error('tick error:', e.message) }
}

// ── Mensajes manuales escritos desde la app (outbound 'pending') ────────────
// El humano escribe en el Chat → se guarda direction='outbound' status='pending'
// → acá lo enviamos por WhatsApp y lo marcamos 'sent'.
async function sendPending() {
  if (!isReady) return
  try {
    const { data: pend } = await sb
      .from('messages')
      .select('id, prospect_id, content')
      .eq('direction', 'outbound').eq('status', 'pending')
      .order('created_at', { ascending: true }).limit(5)
    if (!pend?.length) return
    for (const m of pend) {
      const { data: pr } = await sb.from('prospects').select('phone').eq('id', m.prospect_id).single()
      const chatId = toChatId(pr?.phone)
      if (!chatId) { await sb.from('messages').update({ status: 'failed' }).eq('id', m.id); continue }
      try {
        await client.sendMessage(chatId, m.content)
        const ts = new Date().toISOString()
        await sb.from('messages').update({ status: 'sent' }).eq('id', m.id)
        await sb.from('prospects').update({ last_sent_at: ts, updated_at: ts }).eq('id', m.prospect_id)
        console.log(`→ manual enviado a ${pr?.phone}`)
      } catch (e) {
        await sb.from('messages').update({ status: 'failed' }).eq('id', m.id)
        console.error('manual send:', e.message)
      }
      await sleep(1500)
    }
  } catch (e) { console.error('sendPending:', e.message) }
}

// ── Página web para vincular por QR desde el navegador ──────────────────────
const app = express()
const PORT = process.env.PORT || 3000
const QR_TOKEN = (process.env.QR_TOKEN || '').trim()

app.get('/health', (_req, res) => res.status(200).json({ ok: true, ready: isReady, number: connectedNumber }))

app.get('/', async (req, res) => {
  if (QR_TOKEN && req.query.token !== QR_TOKEN) {
    res.status(401).send(page('🔒 Falta token', '<p>Agregá <code>?token=…</code> al final de la URL.</p>'))
    return
  }
  let inner
  if (isReady) {
    inner = `<h1 class="ok">✅ WhatsApp conectado</h1>
      <p>Número: <b>+${connectedNumber || '—'}</b></p>
      <p class="muted">El worker está enviando y respondiendo automáticamente.</p>`
  } else if (currentQr) {
    const dataUrl = await qrImage.toDataURL(currentQr, { width: 320, margin: 1 })
    inner = `<h1>📲 Vinculá el WhatsApp</h1>
      <p>WhatsApp → <b>Dispositivos vinculados</b> → <b>Vincular un dispositivo</b>, y escaneá:</p>
      <img src="${dataUrl}" width="320" height="320" alt="QR"/>
      <p class="muted">El QR rota cada ~20s; esta página se recarga sola.</p>`
  } else {
    inner = `<h1>⏳ Iniciando…</h1><p class="muted">Esperando el QR. La página se recarga sola.</p>`
  }
  res.set('Content-Type', 'text/html; charset=utf-8').send(page('NJ · WhatsApp', inner))
})

function page(title, inner) {
  return `<!doctype html><html lang="es"><head>
  <meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="refresh" content="10"/><title>${title}</title>
  <style>body{font-family:system-ui,-apple-system,sans-serif;background:#0b141a;color:#e9edef;
  display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px}
  img{background:#fff;border-radius:12px;padding:12px;margin:8px 0}
  .muted{color:#8696a0;font-size:13px}.ok{color:#25d366}code{color:#53bdeb}</style>
  </head><body><div>${inner}</div></body></html>`
}

app.listen(PORT, () => console.log(`🌐 Página de vínculo escuchando en :${PORT} (Render expone la URL pública)`))

client.initialize()

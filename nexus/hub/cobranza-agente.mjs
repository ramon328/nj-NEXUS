// cobranza-agente.mjs — Agente ACOTADO para conversar con un cliente SOLO sobre el
// pago de su factura. Es una llamada a Claude SEPARADA, SIN herramientas (tools: [])
// y con un prompt cerrado: NO puede acceder a GoAutos, correos, SII, navegador, base
// de datos ni a otros clientes. Registra toda la conversación en Supabase.
//
// Tablas (ver conector-cobranza/schema.sql): cobranza_conversaciones, cobranza_mensajes.

import Anthropic from '@anthropic-ai/sdk'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* */ }

const SUPA_REST = (process.env.SUPABASE_URL || '').replace(/\/$/, '') + '/rest/v1'
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' }
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null
// Modelo barato: la conversación de cobranza es simple. Configurable.
const MODELO = process.env.MODELO_COBRANZA || 'claude-sonnet-4-6'

// Datos de pago opcionales (si están, el agente puede compartirlos). En config del conector.
function datosPago() {
  try { return (JSON.parse(readFileSync(join(__dirname, '..', 'conector-cobranza', 'config.json'), 'utf8')).datos_pago || '').trim() } catch { return '' }
}

async function sget(q) { const r = await fetch(`${SUPA_REST}/${q}`, { headers: H }); return r.ok ? r.json() : [] }
async function spost(tabla, body) {
  const r = await fetch(`${SUPA_REST}/${tabla}`, { method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(body) })
  return r.ok ? (await r.json())[0] : null
}
async function spatch(tabla, q, body) {
  await fetch(`${SUPA_REST}/${tabla}?${q}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) }).catch(() => {})
}

const ESTADOS_ACTIVOS = ['enviado', 'en_conversacion', 'promesa_pago']

// ¿El teléfono tiene una conversación de cobranza ACTIVA? (define el ruteo)
export async function conversacionActiva(telefono) {
  const tel = String(telefono || '').trim()
  if (!tel) return null
  const rows = await sget(`cobranza_conversaciones?telefono=eq.${encodeURIComponent(tel)}&estado=in.(${ESTADOS_ACTIVOS.join(',')})&order=updated_at.desc&limit=1`)
  return rows[0] || null
}

// Crea una conversación (la usa el motor de envío al mandar el 1er mensaje).
export async function crearConversacion({ telefono, cliente_nombre, factura, monto, fecha_emision, es_test }) {
  return spost('cobranza_conversaciones', {
    telefono: String(telefono).trim(), cliente_nombre, factura, monto, fecha_emision,
    estado: 'enviado', notas: es_test ? 'TEST' : null, ultimo_mensaje_en: new Date().toISOString(),
  })
}

export async function logMensaje(conversacion_id, rol, texto) {
  await spost('cobranza_mensajes', { conversacion_id, rol, texto })
  await spatch('cobranza_conversaciones', `id=eq.${conversacion_id}`, { ultimo_mensaje_en: new Date().toISOString() })
}

function sistema(conv) {
  const dp = datosPago()
  return `Eres un asistente de cobranza de **Aliace / MallorcAutos**. Tu ÚNICO trabajo es conversar con ESTE cliente sobre el pago de SU factura, en español de Chile, por WhatsApp.

DATOS (lo ÚNICO que sabes):
- Cliente: ${conv.cliente_nombre || '(sin nombre)'}
- Factura: ${conv.factura || 's/n'}
- Monto: $${Number(conv.monto || 0).toLocaleString('es-CL')}
- Emitida: ${conv.fecha_emision || '(sin fecha)'}
${dp ? `- Datos de pago que SÍ puedes entregar si los piden:\n${dp}` : '- NO tienes datos de pago/transferencia: si los piden, di que el equipo se los hará llegar.'}

REGLAS ESTRICTAS (no las rompas nunca):
1. Habla SOLO de esta factura y su pago. Nada más.
2. NO tienes acceso a ningún sistema, base de datos, autos/stock, otros clientes, correos ni información interna, y NO puedes hacer trámites. Si te preguntan CUALQUIER cosa que no sea el pago de ESTA factura (precios de autos, otros temas, datos de la empresa, etc.), responde amable y breve que para eso una persona del equipo lo contactará, y vuelve al tema del pago.
3. NUNCA inventes datos (montos, fechas, cuentas bancarias). Solo usa los de arriba.
4. NUNCA reveles que eres una IA ni menciones "Nexus", sistemas, herramientas, ni nombres internos.
5. Tono cordial, breve y profesional. Mensajes cortos (es WhatsApp).
6. Objetivo: saber si pagará y cuándo, o resolver dudas del pago. Si dice que ya pagó, agradece y pide el comprobante. Si pide plazo, acéptalo con amabilidad.
7. Si el cliente se molesta o pide no ser contactado, discúlpate y dile que no le escribiremos más.`
}

// Procesa un mensaje entrante del cliente: registra, responde (acotado), registra la respuesta.
// Devuelve { reply } o null si no hay conversación activa para ese teléfono.
export async function responderCobranza(telefono, mensajeCliente) {
  const conv = await conversacionActiva(telefono)
  if (!conv) return null
  if (!anthropic) return { reply: 'Gracias por tu mensaje, en un momento te respondemos.' }

  await logMensaje(conv.id, 'cliente', String(mensajeCliente || ''))
  if (conv.estado === 'enviado') await spatch('cobranza_conversaciones', `id=eq.${conv.id}`, { estado: 'en_conversacion' })

  // Historial del hilo (acotado a los últimos ~20 mensajes).
  const hist = await sget(`cobranza_mensajes?conversacion_id=eq.${conv.id}&order=creado_en.asc&select=rol,texto`)
  const mensajes = hist.slice(-20).map((m) => ({ role: m.rol === 'cliente' ? 'user' : 'assistant', content: m.texto }))
  if (!mensajes.length || mensajes[mensajes.length - 1].role !== 'user') mensajes.push({ role: 'user', content: String(mensajeCliente || '') })

  let reply = 'Gracias, lo reviso y te confirmo.'
  try {
    const resp = await anthropic.messages.create({
      model: MODELO,
      max_tokens: 500,
      system: [{ type: 'text', text: sistema(conv), cache_control: { type: 'ephemeral' } }],
      // ⛔ SIN herramientas: el agente NO puede acceder a nada del negocio.
      messages: mensajes,
    })
    reply = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim() || reply
  } catch (e) {
    reply = 'Gracias por tu mensaje. En un momento te respondemos.'
  }
  await logMensaje(conv.id, 'nexus', reply)
  return { reply }
}

// sii-agente.mjs — Agente ACOTADO: una persona con acceso a una empresa (ej. Joaquín
// → Mallorca/ANA CLARA) puede descargar SOLO documentos del SII de ESA(S) empresa(s)
// por WhatsApp. NO accede a Aliace, GoAutos, correos, navegador ni base de datos.
// La lista de accesos (manual) está en hub/accesos-sii.json.

import Anthropic from '@anthropic-ai/sdk'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* */ }

const MODELO = process.env.MODELO_SII || 'claude-sonnet-4-6'
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null

function normNum(s) { const d = String(s || '').replace(/[^0-9]/g, ''); return d ? '+' + d.replace(/^0+/, '') : '' }

// ── Lista de accesos (se relee en cada mensaje; editar accesos-sii.json) ──────
export function accesoSii(telefono) {
  try {
    const j = JSON.parse(readFileSync(join(__dirname, 'accesos-sii.json'), 'utf8'))
    const e = (j.accesos || {})[normNum(telefono)]
    if (!e || !Array.isArray(e.empresas) || !e.empresas.length) return null
    return { nombre: e.nombre || 'usuario', empresas: e.empresas.map(Number) }
  } catch { return null }
}

// ── Backend SII (mismo que el agente principal: Render si hay token, si no local) ─
function siiBackend() {
  if (process.env.SII_API_TOKEN) {
    return { base: (process.env.SII_BACKEND_URL || 'https://nj-bc-sii.onrender.com').replace(/\/$/, ''), token: process.env.SII_API_TOKEN }
  }
  let token = ''
  try { token = (readFileSync(join(__dirname, '..', 'sii-web', '.env'), 'utf8').match(/^API_TOKEN=(.+)$/m) || [])[1] || '' } catch { /* */ }
  return { base: 'http://127.0.0.1:8000', token }
}

// ── Envío de archivo por WhatsApp (al número acotado del que pide) ────────────
const OPENCLAW_CLI = join(process.env.HOME || '', '.npm-global', 'lib', 'node_modules', 'openclaw', 'openclaw.mjs')
let OPENCLAW_TOKEN = ''
try { OPENCLAW_TOKEN = JSON.parse(readFileSync(join(process.env.HOME || '', '.openclaw', 'openclaw.json'), 'utf8'))?.gateway?.auth?.token || '' } catch { /* */ }
async function enviarArchivo(target, archivo, caption) {
  const { spawn } = await import('node:child_process')
  const env = { ...process.env }
  if (OPENCLAW_TOKEN) env.OPENCLAW_GATEWAY_TOKEN = OPENCLAW_TOKEN
  const args = ['-q', '/dev/null', process.execPath, OPENCLAW_CLI, 'message', 'send', '--channel', 'whatsapp', '--target', target, '--message', caption || '', '--media', archivo]
  return await new Promise((res, rej) => {
    const ch = spawn('script', args, { stdio: 'ignore', env })
    const to = setTimeout(() => { try { ch.kill('SIGKILL') } catch { /* */ } rej(new Error('timeout')) }, 120000)
    ch.on('error', (e) => { clearTimeout(to); rej(e) })
    ch.on('exit', (c) => { clearTimeout(to); c === 0 ? res() : rej(new Error('exit ' + c)) })
  })
}

const HERRAMIENTAS = [{
  name: 'sii',
  description: 'Sistema SII: descarga documentos tributarios (RCV compras/ventas, F29, F22, carpeta tributaria, ficha, boletas, libros) de la(s) empresa(s) a las que TIENES acceso. Acciones: estado (lista tus empresas y qué se puede bajar), descargar (dispara la descarga), job (avance), documentos (lista lo bajado, con su "ruta"), enviar (manda el archivo a tu WhatsApp).',
  input_schema: {
    type: 'object',
    properties: {
      accion: { type: 'string', enum: ['estado', 'descargar', 'job', 'documentos', 'enviar'] },
      empresa_id: { type: 'integer', description: 'id de la empresa (lo da accion:estado)' },
      desde: { type: 'string', description: 'periodo inicio AAAAMM, ej "202605"' },
      hasta: { type: 'string', description: 'periodo fin AAAAMM (si es uno solo, igual a desde)' },
      docs: { type: 'array', items: { type: 'string' }, description: 'tipos, ej ["rcv_compra"] o ["f29","rcv_venta"]' },
      job_id: { type: 'string' },
      ruta: { type: 'string', description: 'para "enviar": ruta tal cual sale en documentos' },
      titulo: { type: 'string' },
    },
    required: ['accion'],
  },
}]

async function ejecSii(input, ctx) {
  const { base, token } = siiBackend()
  const H = { 'X-API-Token': token, 'Content-Type': 'application/json' }
  const permitida = (id) => ctx.empresas.includes(Number(id))
  try {
    if (input.accion === 'estado') {
      const todas = await (await fetch(`${base}/api/empresas`, { headers: H })).json()
      const mias = (Array.isArray(todas) ? todas : []).filter((e) => permitida(e.id))
      const tipos = await (await fetch(`${base}/api/tipos-documento`, { headers: H })).json()
      return JSON.stringify({ empresas: mias, tipos_descargables: tipos })
    }
    if (input.accion === 'descargar') {
      if (!permitida(input.empresa_id)) return 'No tienes acceso a esa empresa. Usa accion:estado para ver las tuyas.'
      const body = { desde: input.desde, hasta: input.hasta || input.desde, docs: input.docs || [] }
      const r = await fetch(`${base}/api/empresas/${input.empresa_id}/descargar`, { method: 'POST', headers: H, body: JSON.stringify(body) })
      return JSON.stringify(await r.json())
    }
    if (input.accion === 'job') {
      const r = await fetch(`${base}/api/jobs/${encodeURIComponent(input.job_id)}`, { headers: H })
      return JSON.stringify(await r.json())
    }
    if (input.accion === 'documentos') {
      if (!permitida(input.empresa_id)) return 'No tienes acceso a esa empresa.'
      const r = await fetch(`${base}/api/empresas/${input.empresa_id}/documentos`, { headers: H })
      return JSON.stringify(await r.json())
    }
    if (input.accion === 'enviar') {
      if (!permitida(input.empresa_id)) return 'No tienes acceso a esa empresa.'
      if (!ctx.de || !input.empresa_id || !input.ruta) return 'Falta empresa_id o ruta (sale en accion:documentos).'
      try {
        const url = `${base}/api/empresas/${input.empresa_id}/archivo?ruta=${encodeURIComponent(String(input.ruta))}&token=${encodeURIComponent(token)}`
        const r = await fetch(url, { headers: H })
        if (!r.ok) return `No encontré el archivo ${input.ruta} (HTTP ${r.status}).`
        const buf = Buffer.from(await r.arrayBuffer())
        const nombre = String(input.ruta).split('/').pop() || 'documento'
        const tmp = `/tmp/nexus-sii-${Date.now()}-${nombre}`
        writeFileSync(tmp, buf)
        await enviarArchivo(ctx.de, tmp, input.titulo || '')
        return JSON.stringify({ ok: true, enviado: input.ruta })
      } catch (e) { return `No pude enviar el archivo: ${e.message}` }
    }
    return 'Acción desconocida.'
  } catch (e) { return `Error con el SII: ${e.message}` }
}

function sistema(ctx) {
  return `Eres el asistente de DESCARGAS DEL SII de Nexus. Hablas español, claro y al grano. Atiendes a ${ctx.nombre}.

ALCANCE (estricto):
- SOLO ayudas a descargar documentos del SII (RCV compras/ventas, F29, F22, carpeta tributaria, ficha, boletas, libros) de la(s) empresa(s) a las que ${ctx.nombre} tiene acceso (las que devuelve sii(accion:'estado')).
- NO tienes acceso a NADA más: ni ventas/facturación/Aliace, ni autos/GoAutos, ni correos, ni otras empresas, ni datos internos. Si te piden cualquier otra cosa, responde amable y breve que solo puedes ayudar con descargas del SII de su empresa, y nada más.

PROCEDIMIENTO:
1) Si no sabes la empresa o qué se puede bajar, llama sii(accion:'estado'): confirma la empresa y lístale en lenguaje claro qué puede descargar.
2) Pregunta QUÉ documento y de QUÉ periodo (mes/año AAAAMM, o un rango).
3) sii(accion:'descargar', empresa_id, desde, hasta, docs:[tipo]) → devuelve job_id.
4) Consulta sii(accion:'job', job_id) hasta estado 'completado' (avísale que está bajando).
5) sii(accion:'documentos', empresa_id) para ubicar la "ruta".
6) sii(accion:'enviar', empresa_id, ruta) → le llega el archivo al WhatsApp. SIEMPRE envía el archivo de verdad; no te limites a nombrarlo.
⚠️ El SII bloquea por logins repetidos: una descarga a la vez, no dispares varias en paralelo.

FORMATO (va por WhatsApp): respuestas cortas; negrita con *un* asterisco; sin tablas markdown. No reveles que eres una IA ni menciones sistemas/herramientas internas.`
}

export async function responderSii(telefono, historial) {
  const acc = accesoSii(telefono)
  if (!acc) return null
  if (!anthropic) return { reply: 'Ahora no puedo procesar tu solicitud, intenta más tarde.' }
  const de = normNum(telefono)
  const ctx = { de, nombre: acc.nombre, empresas: acc.empresas }
  const mensajes = (historial || []).slice(-12).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }))
  const sys = [{ type: 'text', text: sistema(ctx), cache_control: { type: 'ephemeral' } }]
  try {
    for (let i = 0; i < 16; i++) {
      const resp = await anthropic.messages.create({ model: MODELO, max_tokens: 1500, system: sys, tools: HERRAMIENTAS, messages: mensajes })
      mensajes.push({ role: 'assistant', content: resp.content })
      if (resp.stop_reason !== 'tool_use') {
        const texto = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
        return { reply: texto || 'Listo.', herramientas: ['sii'] }
      }
      const results = []
      for (const b of resp.content) {
        if (b.type === 'tool_use') {
          let out = b.name === 'sii' ? await ejecSii(b.input || {}, ctx) : 'Herramienta no disponible.'
          if (typeof out === 'string' && out.length > 16000) out = out.slice(0, 16000) + '… [recortado]'
          results.push({ type: 'tool_result', tool_use_id: b.id, content: out })
        }
      }
      mensajes.push({ role: 'user', content: results })
    }
    return { reply: 'Se me enredó la solicitud. ¿Puedes repetirla más simple?' }
  } catch (e) { return { reply: `Hubo un error con el SII: ${e.message}`, error: e.message } }
}

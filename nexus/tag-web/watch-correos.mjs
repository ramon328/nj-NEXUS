// watch-correos.mjs — VIGILANTE del buzón de Mallorca (ventas@mallorcautos.cl) para
// AVANZAR SOLO los leads de TAG:
//   · Convenio de TAG TICO (from contacto@tagtico.cl, asunto/cuerpo con la PATENTE de
//     un lead en estado "enviado") → convenio_recibido. Señal confiable (trae patente).
//   · Blue Express (notificaciones.blue.cl) SOLO si el envío es de Tag Tico/TAG (no los
//     pedidos personales tipo AliExpress) → deja evento "TAG en camino". Conservador.
// Corre en bucle (cada 10 min) como LaunchAgent aparte. NO toca el hub.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { accessToken } from './enviar.mjs'
import { listar, actualizarEstado, agregarEvento } from './registro.mjs'
import { normPatente } from './autos-tag.mjs'
import { backfill, cacheInfo } from './backfill-tag.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VISTOS = join(__dirname, 'correos-vistos.json')
const INTERVALO = Number(process.env.TAG_WATCH_MS || 10 * 60 * 1000)
const AVISAR_A = process.env.TAG_AVISAR_WA || '+56932945240' // Ramón

// Notificación WhatsApp best-effort (si kapso está disponible).
let enviarKapso = null
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* */ }
try { ({ enviarKapso } = await import('../hub/kapso.mjs')) } catch { /* sin WhatsApp, solo log */ }
async function avisar(txt) {
  console.log('[aviso]', txt)
  if (enviarKapso && AVISAR_A) { try { await enviarKapso(AVISAR_A, txt) } catch (e) { console.log('  (WA falló:', e.message, ')') } }
}

function vistos() { try { return new Set(JSON.parse(readFileSync(VISTOS, 'utf8'))) } catch { return new Set() } }
function guardarVistos(set) { try { writeFileSync(VISTOS, JSON.stringify([...set].slice(-500))) } catch { /* */ } }

const api = (at, p) => fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + p, { headers: { Authorization: 'Bearer ' + at }, signal: AbortSignal.timeout(20000) }).then((r) => r.json())

function cuerpoDe(payload) {
  let out = ''
  const walk = (p) => { if (!p) return
    if ((p.mimeType === 'text/plain' || p.mimeType === 'text/html') && p.body?.data) out += Buffer.from(p.body.data, 'base64').toString('utf8')
    for (const c of p.parts || []) walk(c) }
  walk(payload); return out
}

// ¿Aparece la patente (normalizada) en el texto?
function contienePatente(texto, patente) {
  const t = String(texto || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const p = normPatente(patente)
  return p.length >= 5 && t.includes(p)
}

async function revisar() {
  let at
  try { at = (await accessToken()).at } catch (e) { console.log('[watch] sin token:', e.message); return }
  const seen = vistos()
  // Correos recientes de Tag Tico o Blue Express (últimos 7 días).
  const q = '(from:tagtico.cl OR from:notificaciones.blue.cl) newer_than:7d'
  const lista = await api(at, 'messages?maxResults=25&q=' + encodeURIComponent(q))
  if (lista.error) { console.log('[watch] error Gmail:', JSON.stringify(lista.error).slice(0, 120)); return }
  const pendientes = listar().filter((r) => r.estado === 'enviado' || r.estado === 'convenio_recibido')

  for (const mm of (lista.messages || []).reverse()) {
    if (seen.has(mm.id)) continue
    const d = await api(at, 'messages/' + mm.id + '?format=full')
    const h = Object.fromEntries((d.payload?.headers || []).map((x) => [x.name, x.value]))
    const from = (h.From || '').toLowerCase()
    const asunto = h.Subject || ''
    const cuerpo = cuerpoDe(d.payload)
    const texto = asunto + '\n' + cuerpo

    // 1) Convenio de Tag Tico → convenio_recibido (match por patente del lead)
    if (from.includes('tagtico.cl')) {
      const lead = listar().find((r) => r.estado === 'enviado' && r.patente && contienePatente(texto, r.patente))
      if (lead) {
        actualizarEstado(lead.id, 'convenio_recibido', `Convenio recibido de Tag Tico (auto): "${asunto.slice(0, 80)}"`)
        await avisar(`✅ Convenio de TAG recibido para la patente ${lead.patente} (${lead.id}). El auto queda con TAG asegurado. Asunto: "${asunto.slice(0, 80)}".`)
      }
    }

    // 2) Blue Express, SOLO si el envío es de Tag Tico/TAG (evita pedidos personales)
    if (from.includes('notificaciones.blue.cl')) {
      const esTagShipment = /tag\s*tico|tagtico|\btag\b|peaje/i.test(texto) && !/aliexpress|mercadolibre|temu|shein/i.test(texto)
      if (esTagShipment) {
        const enCamino = /será entregado|en camino|en reparto|en ruta|despachad/i.test(texto)
        const entregado = /ha sido entregado|fue entregado|entrega exitosa/i.test(texto)
        // Empareja con el lead más reciente que espera dispositivo (convenio_recibido).
        const lead = pendientes.filter((r) => r.estado === 'convenio_recibido')[0]
        if (lead && entregado) { actualizarEstado(lead.id, 'activo', `TAG entregado (Blue Express, auto): "${asunto.slice(0, 80)}"`); await avisar(`📦 TAG ENTREGADO (${lead.id}${lead.patente ? ' · ' + lead.patente : ''}). Blue Express: "${asunto.slice(0, 80)}".`) }
        else if (lead && enCamino) { actualizarEstado(lead.id, 'en_camino', `TAG en camino (Blue Express, auto): "${asunto.slice(0, 80)}"`); await avisar(`🚚 TAG en camino (${lead.id}${lead.patente ? ' · ' + lead.patente : ''}). Blue Express: "${asunto.slice(0, 80)}".`) }
        else { await avisar(`🚚 Blue Express avisa un envío que parece TAG pero no pude emparejarlo a un auto: "${asunto.slice(0, 80)}". Revísalo en el tablero.`) }
      }
    }

    seen.add(mm.id)
  }
  guardarVistos(seen)
}

// Refresca el historial de patentes con TAG (para el conteo del Excel) 1 vez al día.
async function refrescarBackfill() {
  try {
    const info = cacheInfo()
    const viejo = !info || (Date.now() - new Date(info.actualizado).getTime() > 24 * 60 * 60 * 1000)
    if (viejo) { const d = await backfill(); console.log(`[backfill] ${d.patentes.length} patentes con TAG · fuente ${d.fuente}`) }
  } catch (e) { console.log('[backfill] error:', e.message) }
}

async function loop() {
  try { await revisar() } catch (e) { console.log('[watch] error:', e.message) }
  try { await refrescarBackfill() } catch { /* */ }
  setTimeout(loop, INTERVALO)
}
console.log(`[watch-correos] vigilando ventas@mallorcautos.cl cada ${Math.round(INTERVALO / 60000)} min`)
loop()

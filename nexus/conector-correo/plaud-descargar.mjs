#!/usr/bin/env node
// plaud-descargar.mjs — Baja los resúmenes/transcripciones de Plaud (correos de
// no-reply@plaud.ai con adjuntos .txt) vía Gmail API y los guarda como notas en el
// Segundo Cerebro (90-Agente/Plaud/). Dedup en estado-plaud.json. Lo corre un daemon.
//   node plaud-descargar.mjs [maxCorreos=10]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const NEXUS = path.join(os.homedir(), 'nexus')
const G = path.join(NEXUS, 'conector-correo', 'google')
const TOKEN_PATH = path.join(G, 'token.json')
const CLIENT_PATH = path.join(G, 'oauth-client.json')
const ESTADO = path.join(NEXUS, 'conector-correo', 'estado-plaud.json')
const DEST = path.join(NEXUS, 'cerebro', '90-Agente', 'Plaud')
const QUERY = 'from:plaud.ai has:attachment'
const MAX = Number(process.argv[2] || 200)

const log = (m) => console.log(`[plaud ${new Date().toISOString()}] ${m}`)
const leerJson = (p, d) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return d } }
const slug = (s) => (s || 'plaud').replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 90)

async function accessToken() {
  const tok = leerJson(TOKEN_PATH, {})
  const cl = (leerJson(CLIENT_PATH, {}).installed) || {}
  if (!tok.refresh_token) throw new Error('No hay Gmail conectado (falta token.json). Conéctalo desde el panel.')
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: cl.client_id, client_secret: cl.client_secret, refresh_token: tok.refresh_token, grant_type: 'refresh_token' }),
  })
  const t = await r.json()
  if (!t.access_token) throw new Error('No pude refrescar el token: ' + JSON.stringify(t).slice(0, 150))
  return t.access_token
}
const gget = async (url, at) => (await fetch(url, { headers: { Authorization: 'Bearer ' + at } })).json()

function adjuntos(payload, out = []) {
  if (!payload) return out
  if (payload.filename && payload.body?.attachmentId) out.push(payload)
  for (const p of payload.parts || []) adjuntos(p, out)
  return out
}

async function main() {
  const at = await accessToken()
  if (!existsSync(DEST)) mkdirSync(DEST, { recursive: true })
  const estado = leerJson(ESTADO, { vistos: [] })
  const vistos = new Set(estado.vistos)

  // Lista TODOS los correos de Plaud (con paginación, no solo la 1ª página).
  const msgs = []
  let page = ''
  do {
    const lista = await gget(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(QUERY)}&maxResults=100${page ? `&pageToken=${page}` : ''}`, at)
    for (const m of lista.messages || []) msgs.push(m)
    page = lista.nextPageToken
    if (msgs.length >= MAX) break   // tope de seguridad (MAX alto por defecto)
  } while (page)

  const bajarAdj = async (id, a) => {
    const d = await gget(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/attachments/${a.body.attachmentId}`, at)
    return Buffer.from(d.data || '', 'base64url').toString('utf8')
  }

  let bajados = 0, documentos = 0
  for (const { id } of msgs) {
    if (vistos.has(id)) continue
    const m = await gget(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, at)
    const hs = Object.fromEntries((m.payload?.headers || []).map((h) => [h.name, h.value]))
    const asunto = hs.Subject || '(sin asunto)'
    const fecha = new Date(Number(m.internalDate || Date.now())).toISOString().slice(0, 10)

    // Baja TODOS los adjuntos de texto (Plaud manda 2: transcripción.txt Y resumen.txt).
    // Clasifica por nombre; si no calza, el .txt más grande = transcripción.
    let transcripcion = '', resumen = ''
    const txts = adjuntos(m.payload).filter((a) => (a.filename || '').toLowerCase().endsWith('.txt'))
    for (const a of txts) {
      const fn = (a.filename || '').toLowerCase()
      const contenido = await bajarAdj(id, a)
      if (fn.includes('transcrip')) transcripcion = contenido
      else if (fn.includes('resumen') || fn.includes('summary')) resumen = contenido
      else if (!transcripcion || contenido.length > transcripcion.length) transcripcion = contenido // .txt sin nombre claro → el más largo es la transcripción
    }
    // Si solo vino uno y no se clasificó como resumen, tómalo como transcripción.
    if (!transcripcion.trim() && !resumen.trim()) { vistos.add(id); continue }

    const titulo = asunto.replace(/^\[Plaud-AutoFlow\]\s*/i, '').replace(/^\d{2}-\d{2}\s*/, '').trim() || asunto
    const cuerpo =
      (resumen.trim() ? `## Resumen\n\n${resumen.trim()}\n\n` : '') +
      (transcripcion.trim() ? `## Transcripción completa\n\n${transcripcion.trim()}\n` : '')
    const nota = `---\ntipo: plaud-grabacion\ntags: [plaud, grabacion, transcripcion]\nautor: plaud\nfecha: ${fecha}\n---\n\n# ${titulo}\n\n${cuerpo}`
    writeFileSync(path.join(DEST, `${fecha} — ${slug(titulo)}.md`), nota)
    vistos.add(id); bajados++
    documentos += (resumen.trim() ? 1 : 0) + (transcripcion.trim() ? 1 : 0)   // cada grabación = transcripción + resumen
    log(`Guardado: ${fecha} — ${slug(titulo)}.md (resumen:${resumen ? 'sí' : 'no'} · transcripción:${transcripcion ? Math.round(transcripcion.length / 1024) + 'KB' : 'no'})`)
  }
  // Totales acumulados: cada correo de Plaud = 2 documentos (transcripción + resumen).
  const totalCorreos = vistos.size
  // Historial de corridas (para que Nexus/plaud_estado sepa CUÁNDO corrió y QUÉ bajó cada vez).
  const corridas = (Array.isArray(estado.corridas) ? estado.corridas : [])
    .concat([{ ts: new Date().toISOString(), revisados: msgs.length, nuevos: bajados, documentos }])
    .slice(-40)
  writeFileSync(ESTADO, JSON.stringify({ vistos: [...vistos].slice(-1000), correos: totalCorreos, documentos_ultima_corrida: documentos, ultima: new Date().toISOString(), corridas }, null, 2))
  log(`Listo. Correos revisados: ${msgs.length} · nuevos: ${bajados} · documentos bajados esta corrida: ${documentos} (transcripción + resumen).`)
}
main().catch((e) => { log('ERROR: ' + e.message); process.exit(1) })

// enviar.mjs — Envío de correo real vía la API de Gmail.
// Prefiere el CORREO DE MALLORCA vinculado (mallorca-token.json, gmail.send);
// si no está vinculado, cae a la cuenta base de Nexus (conector-correo/google).
// Arma un MIME multipart/mixed con adjuntos y lo manda con users.messages.send.
//
// Lo usa la web de vínculo (para probar) y el tool de Meme (solicitud/traspaso TAG).
//
//   import { enviarCorreo, cuentaActiva } from './enviar.mjs'
//   await enviarCorreo({ to, cc, asunto, cuerpo, adjuntos:[{filename, mime, buffer}] })

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HOME = process.env.HOME || ''
const GDIR = join(HOME, 'nexus', 'conector-correo', 'google')
const CLIENT_PATH = join(GDIR, 'oauth-client.json')
// Token del correo de Mallorca (lo escribe la web de vínculo).
export const MALLORCA_TOKEN = join(__dirname, 'mallorca-token.json')
// Token base de Nexus (fallback).
const BASE_TOKEN = join(GDIR, 'token.json')

export function oauthClient() {
  const j = JSON.parse(readFileSync(CLIENT_PATH, 'utf8'))
  return j.installed || j.web || {}
}

// Devuelve la ruta del token activo y si es el de Mallorca.
export function tokenActivo() {
  if (existsSync(MALLORCA_TOKEN)) return { path: MALLORCA_TOKEN, mallorca: true }
  return { path: BASE_TOKEN, mallorca: false }
}

// { email, mallorca } de la cuenta que se usará para enviar (sin pedir token).
export function cuentaActiva() {
  const { path, mallorca } = tokenActivo()
  try { const t = JSON.parse(readFileSync(path, 'utf8')); return { email: t.email || null, mallorca } }
  catch { return { email: null, mallorca } }
}

// access_token fresco del token indicado (o del activo por defecto).
export async function accessToken(tokenPath) {
  const c = oauthClient()
  const path = tokenPath || tokenActivo().path
  const t = JSON.parse(readFileSync(path, 'utf8'))
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: c.client_id, client_secret: c.client_secret,
      refresh_token: t.refresh_token, grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(15000),
  })
  const tok = await r.json()
  if (!tok.access_token) throw new Error('no se pudo refrescar el token de Gmail: ' + JSON.stringify(tok).slice(0, 160))
  return { at: tok.access_token, email: t.email }
}

function encHeader(str) {
  if (/^[\x00-\x7F]*$/.test(str)) return str
  return '=?UTF-8?B?' + Buffer.from(str, 'utf8').toString('base64') + '?='
}

function b64lines(buf) {
  return buf.toString('base64').replace(/.{76}/g, '$&\r\n')
}

function construirMIME({ from, to, cc, replyTo, asunto, cuerpo, adjuntos = [] }) {
  const boundary = 'nexustag_' + Buffer.from(asunto + to).toString('hex').slice(0, 16)
  const L = []
  L.push(`From: ${from}`)
  L.push(`To: ${to}`)
  if (cc) L.push(`Cc: ${cc}`)
  if (replyTo) L.push(`Reply-To: ${replyTo}`)
  L.push(`Subject: ${encHeader(asunto)}`)
  L.push('MIME-Version: 1.0')
  L.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
  L.push('')
  L.push(`--${boundary}`)
  L.push('Content-Type: text/plain; charset="UTF-8"')
  L.push('Content-Transfer-Encoding: base64')
  L.push('')
  L.push(b64lines(Buffer.from(cuerpo, 'utf8')))
  for (const a of adjuntos) {
    const mime = a.mime || 'application/octet-stream'
    L.push(`--${boundary}`)
    L.push(`Content-Type: ${mime}; name="${a.filename}"`)
    L.push('Content-Transfer-Encoding: base64')
    L.push(`Content-Disposition: attachment; filename="${a.filename}"`)
    L.push('')
    L.push(b64lines(a.buffer))
  }
  L.push(`--${boundary}--`)
  L.push('')
  return L.join('\r\n')
}

export async function enviarCorreo({ to, cc, replyTo, asunto, cuerpo, adjuntos = [], fromNombre, tokenPath }) {
  const { at, email } = await accessToken(tokenPath)
  const from = fromNombre ? `${encHeader(fromNombre)} <${email}>` : email
  const raw = construirMIME({ from, to, cc, replyTo, asunto, cuerpo, adjuntos })
  const rawB64 = Buffer.from(raw, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: rawB64 }),
    signal: AbortSignal.timeout(30000),
  })
  const j = await r.json()
  if (!r.ok) throw new Error('Gmail send falló: ' + JSON.stringify(j).slice(0, 200))
  return { id: j.id, cuenta: email }
}

// CLI de prueba: node enviar.mjs correo@destino.cl
if (import.meta.url === `file://${process.argv[1]}`) {
  const to = process.argv[2] || 'ramon@dropout.cl'
  const c = cuentaActiva()
  enviarCorreo({
    to,
    asunto: 'Prueba envío TAG — Nexus',
    cuerpo: `Prueba del sistema de TAG.\nEnviado desde: ${c.email} (${c.mallorca ? 'correo Mallorca' : 'cuenta base'}).\n\n— Nexus`,
    fromNombre: c.mallorca ? 'MallorcAutos' : 'MallorcAutos (vía Nexus)',
  }).then((r) => console.log('OK enviado desde', r.cuenta, '·', r.id)).catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
}

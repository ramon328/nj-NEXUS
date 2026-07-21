// vincular.mjs — Web para VINCULAR el correo de MallorcAutos (Google Workspace) a Nexus.
// "Entrar con Google" real (OAuth, scope gmail.send). No guarda contraseñas: solo un
// refresh_token para que Nexus/Meme ENVÍE correo desde ese buzón.
//
// Dos modos, según variables de entorno:
//  · WEB (compartible desde cualquier teléfono): defines TAG_PUBLIC_URL + TAG_WEB_CLIENT_ID
//    + TAG_WEB_CLIENT_SECRET (cliente OAuth tipo "Aplicación web" de Google Cloud). La URL
//    pública se sirve por Tailscale Funnel bajo una ruta (ej. .../tag).
//  · LOCAL (solo desde el mini): sin esas variables, usa el cliente Desktop y redirect a
//    http://localhost:PORT (loopback).
//
//   node vincular.mjs

import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync, unlinkSync, chmodSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { oauthClient, enviarCorreo, cuentaActiva, MALLORCA_TOKEN } from './enviar.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.TAG_PORT || 3022)

// --- Config de cliente/redirect según modo ---
const PUBLIC_URL = (process.env.TAG_PUBLIC_URL || '').replace(/\/+$/, '') // ej: https://host/tag
const WEB_ID = process.env.TAG_WEB_CLIENT_ID || ''
const WEB_SECRET = process.env.TAG_WEB_CLIENT_SECRET || ''
const WEB_MODE = !!(PUBLIC_URL && WEB_ID && WEB_SECRET)

// BASE = prefijo de ruta público (ej "/tag"); Tailscale lo quita antes de llegar acá,
// pero los enlaces del HTML deben incluirlo. Se deriva de TAG_PUBLIC_URL aunque aún no
// haya credenciales web (para que la página sirva bien bajo /tag). En local puro es "".
const BASE = PUBLIC_URL ? new URL(PUBLIC_URL).pathname.replace(/\/+$/, '') : ''
const REDIRECT = WEB_MODE ? `${PUBLIC_URL}/oauth/callback` : `http://localhost:${PORT}/oauth/callback`
const CLIENT = WEB_MODE ? { client_id: WEB_ID, client_secret: WEB_SECRET } : oauthClient()

const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ')
const HTML = readFileSync(join(__dirname, 'vincular.html'), 'utf8')

const estados = new Set()

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(obj))
}
function redir(res, url) { res.writeHead(302, { Location: url }); res.end() }

function estado() {
  const c = cuentaActiva()
  return { vinculado: !!c.mallorca && !!c.email, email: c.email, mallorca: c.mallorca, modo: WEB_MODE ? 'web' : 'local' }
}

function urlAuth() {
  const state = randomUUID()
  estados.add(state)
  const p = new URLSearchParams({
    client_id: CLIENT.client_id,
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + p.toString()
}

async function intercambiar(code) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: CLIENT.client_id, client_secret: CLIENT.client_secret,
      redirect_uri: REDIRECT, grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(15000),
  })
  const tok = await r.json()
  if (!tok.refresh_token) throw new Error('Google no devolvió refresh_token: ' + JSON.stringify(tok).slice(0, 200))
  const ui = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: 'Bearer ' + tok.access_token }, signal: AbortSignal.timeout(15000),
  }).then((x) => x.json())
  const registro = {
    email: ui.email || '',
    refresh_token: tok.refresh_token,
    access_token: tok.access_token,
    scope: tok.scope,
    vinculado_en: new Date().toISOString(),
  }
  // Guarda las credenciales del cliente que emitió el token (para refrescar luego).
  if (WEB_MODE) { registro.client_id = CLIENT.client_id; registro.client_secret = CLIENT.client_secret }
  writeFileSync(MALLORCA_TOKEN, JSON.stringify(registro, null, 2))
  try { chmodSync(MALLORCA_TOKEN, 0o600) } catch { /* */ }
  return registro.email
}

const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://localhost:${PORT}`)

    if (u.pathname === '/estado') return json(res, 200, estado())
    if (u.pathname === '/config') return json(res, 200, { base: BASE, modo: WEB_MODE ? 'web' : 'local' })

    if (u.pathname === '/oauth/start') return redir(res, urlAuth())

    if (u.pathname === '/oauth/callback') {
      const err = u.searchParams.get('error')
      if (err) return redir(res, `${BASE}/?error=` + encodeURIComponent(err))
      const code = u.searchParams.get('code')
      const state = u.searchParams.get('state')
      if (!code || !state || !estados.has(state)) return redir(res, `${BASE}/?error=estado_invalido`)
      estados.delete(state)
      try {
        const email = await intercambiar(code)
        return redir(res, `${BASE}/?ok=` + encodeURIComponent(email))
      } catch (e) {
        return redir(res, `${BASE}/?error=` + encodeURIComponent(e.message.slice(0, 120)))
      }
    }

    if (u.pathname === '/desvincular' && req.method === 'POST') {
      try { if (existsSync(MALLORCA_TOKEN)) unlinkSync(MALLORCA_TOKEN) } catch { /* */ }
      return json(res, 200, { ok: true })
    }

    if (u.pathname === '/probar' && req.method === 'POST') {
      const c = cuentaActiva()
      if (!c.email) return json(res, 400, { ok: false, error: 'No hay correo vinculado.' })
      try {
        const r = await enviarCorreo({
          to: 'ramon@dropout.cl',
          asunto: 'Prueba de vínculo — correo Mallorca en Nexus',
          cuerpo: `Este correo salió desde ${c.email} (${c.mallorca ? 'correo Mallorca vinculado' : 'cuenta base de Nexus'}).\n\nSi lo ves, Nexus ya puede enviar solicitudes/traspasos de TAG desde este buzón.\n\n— Nexus`,
          fromNombre: c.mallorca ? 'MallorcAutos' : 'MallorcAutos (vía Nexus)',
        })
        return json(res, 200, { ok: true, cuenta: r.cuenta, id: r.id })
      } catch (e) { return json(res, 500, { ok: false, error: e.message }) }
    }

    if (u.pathname === '/' || u.pathname.startsWith('/index')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end(HTML.replaceAll('{{BASE}}', BASE))
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('no encontrado')
  } catch (e) {
    json(res, 500, { ok: false, error: 'error servidor: ' + e.message })
  }
})

server.listen(PORT, '0.0.0.0', () => console.log(`Vincular correo Mallorca en :${PORT} — modo=${WEB_MODE ? 'web' : 'local'} redirect=${REDIRECT}`))

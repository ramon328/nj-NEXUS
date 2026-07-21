// vincular.mjs — Web para VINCULAR el correo de MallorcAutos (Google Workspace) a Nexus.
// "Entrar con Google" real (OAuth, scope gmail.send). No guarda contraseñas: solo
// un refresh_token que permite a Nexus/Meme ENVIAR correo desde ese buzón.
//
// IMPORTANTE: el cliente OAuth de Nexus es tipo Desktop (redirect http://localhost),
// así que el vínculo se hace desde el NAVEGADOR DEL PROPIO MAC MINI (por VNC/Screen
// Sharing). Una sola vez; luego queda guardado en mallorca-token.json.
//
//   node vincular.mjs   → http://localhost:3022

import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync, unlinkSync, chmodSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { oauthClient, enviarCorreo, cuentaActiva, MALLORCA_TOKEN } from './enviar.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.TAG_PORT || 3022)
const REDIRECT = process.env.TAG_REDIRECT || `http://localhost:${PORT}/oauth/callback`
const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ')
const HTML = readFileSync(join(__dirname, 'vincular.html'), 'utf8')

const estados = new Set() // state anti-CSRF de flujos en curso

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(obj))
}
function redir(res, url) { res.writeHead(302, { Location: url }); res.end() }

function estado() {
  const c = cuentaActiva()
  return { vinculado: !!c.mallorca && !!c.email, email: c.email, mallorca: c.mallorca }
}

function urlAuth() {
  const c = oauthClient()
  const state = randomUUID()
  estados.add(state)
  const p = new URLSearchParams({
    client_id: c.client_id,
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
  const c = oauthClient()
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: c.client_id, client_secret: c.client_secret,
      redirect_uri: REDIRECT, grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(15000),
  })
  const tok = await r.json()
  if (!tok.refresh_token) throw new Error('Google no devolvió refresh_token: ' + JSON.stringify(tok).slice(0, 200))
  // email del usuario
  const ui = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: 'Bearer ' + tok.access_token }, signal: AbortSignal.timeout(15000),
  }).then((x) => x.json())
  const email = ui.email || ''
  writeFileSync(MALLORCA_TOKEN, JSON.stringify({
    email,
    refresh_token: tok.refresh_token,
    access_token: tok.access_token,
    scope: tok.scope,
    vinculado_en: new Date().toISOString(),
  }, null, 2))
  try { chmodSync(MALLORCA_TOKEN, 0o600) } catch { /* */ }
  return email
}

const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://localhost:${PORT}`)

    if (u.pathname === '/estado') return json(res, 200, estado())

    if (u.pathname === '/oauth/start') return redir(res, urlAuth())

    if (u.pathname === '/oauth/callback') {
      const err = u.searchParams.get('error')
      if (err) return redir(res, '/?error=' + encodeURIComponent(err))
      const code = u.searchParams.get('code')
      const state = u.searchParams.get('state')
      if (!code || !state || !estados.has(state)) return redir(res, '/?error=estado_invalido')
      estados.delete(state)
      try {
        const email = await intercambiar(code)
        return redir(res, '/?ok=' + encodeURIComponent(email))
      } catch (e) {
        return redir(res, '/?error=' + encodeURIComponent(e.message.slice(0, 120)))
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
      return res.end(HTML)
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('no encontrado')
  } catch (e) {
    json(res, 500, { ok: false, error: 'error servidor: ' + e.message })
  }
})

server.listen(PORT, '0.0.0.0', () => console.log(`Vincular correo Mallorca en http://localhost:${PORT} — redirect=${REDIRECT}`))

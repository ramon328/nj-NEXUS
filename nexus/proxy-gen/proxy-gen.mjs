#!/usr/bin/env node
// proxy-gen.mjs — Proxy FORWARD de salida con IP chilena 🇨🇱, GENERAL (cualquier host).
//
// A diferencia de proxy-cl (que solo deja pasar *.sii.cl para el backend SII), este es
// de uso general: sirve para CUALQUIER proyecto/dev que necesite salir a internet con la
// IP chilena de este Mac. La seguridad la da un TOKEN obligatorio (no es abierto sin auth).
//
// Uso desde cualquier cliente/proyecto:
//   HTTPS_PROXY=http://x:<TOKEN>@<host>:<PORT>
//   HTTP_PROXY=http://x:<TOKEN>@<host>:<PORT>
//   curl -x http://x:<TOKEN>@<host>:<PORT> https://lo-que-sea
// donde <host> = 100.91.97.70 (Tailscale) o el host público del túnel (bore/DuckDNS).
// El usuario del Basic-auth es libre; lo que importa es el password = TOKEN.
//
// ⚠️ OJO SEGURIDAD: al ser allow-all, quien tenga el token sale a internet con TU IP
// residencial. Compártelo solo con gente de confianza y rota el token si se filtra
// (PROXY_GEN_TOKEN en ~/nexus/.env + reiniciar com.nexus.proxy-gen). Se puede acotar a
// ciertos hosts con PROXY_GEN_ALLOW (coma-separado, ej ".sii.cl,.mibanco.cl").

import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { appendFileSync } from 'node:fs'

process.loadEnvFile(path.join(os.homedir(), 'nexus', '.env'))

const PORT = Number(process.env.PROXY_GEN_PORT || 8890)
const TOKEN = process.env.PROXY_GEN_TOKEN || ''
// '*' (por defecto) = permite cualquier host. O una lista coma-separada de sufijos/hosts.
const ALLOW = (process.env.PROXY_GEN_ALLOW || '*')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
const ALLOW_ALL = ALLOW.includes('*')
const LOG = '/tmp/nexus-proxy-gen.log'

function log(m) {
  const line = `[${new Date().toISOString()}] ${m}\n`
  try { appendFileSync(LOG, line) } catch { /* */ }
  process.stdout.write(line)
}

if (!TOKEN) { log('FATAL: falta PROXY_GEN_TOKEN en ~/nexus/.env'); process.exit(1) }

function parseHostPort(authority, defPort) {
  const m = String(authority).replace(/^.*@/, '').match(/^\[?([^\]]+?)\]?(?::(\d+))?$/)
  if (!m) return null
  return { host: m[1].toLowerCase(), port: Number(m[2] || defPort) }
}

function hostPermitido(host) {
  if (ALLOW_ALL) return true
  host = String(host || '').toLowerCase()
  return ALLOW.some((suf) =>
    suf.startsWith('.') ? (host === suf.slice(1) || host.endsWith(suf)) : host === suf)
}

// Token vía Proxy-Authorization: Basic base64(user:TOKEN) (user libre), o X-Proxy-Token.
function autorizado(req) {
  const h = req.headers['proxy-authorization'] || req.headers['authorization'] || ''
  const m = /^Basic\s+(.+)$/i.exec(h)
  if (m) {
    try {
      const dec = Buffer.from(m[1], 'base64').toString('utf8')
      const pass = dec.slice(dec.indexOf(':') + 1)
      if (pass === TOKEN) return true
    } catch { /* */ }
  }
  if ((req.headers['x-proxy-token'] || '') === TOKEN) return true
  return false
}

const server = http.createServer()

// --- HTTP normal (absolute-URI) ---
server.on('request', (req, res) => {
  if (!autorizado(req)) {
    res.writeHead(407, { 'Proxy-Authenticate': 'Basic realm="nexus-proxy-gen"' })
    return res.end('Proxy auth requerido\n')
  }
  let target
  try { target = new URL(req.url) } catch { res.writeHead(400); return res.end('URL inválida\n') }
  if (!hostPermitido(target.hostname)) {
    log(`DENY http ${target.hostname}`)
    res.writeHead(403); return res.end('Destino no permitido\n')
  }
  const opts = {
    host: target.hostname, port: target.port || 80, method: req.method,
    path: target.pathname + target.search,
    headers: { ...req.headers },
  }
  delete opts.headers['proxy-authorization']
  const up = http.request(opts, (r) => { res.writeHead(r.statusCode || 502, r.headers); r.pipe(res) })
  up.on('error', (e) => { log(`ERR http ${target.hostname}: ${e.message}`); res.writeHead(502); res.end('upstream error\n') })
  req.pipe(up)
})

// --- CONNECT (HTTPS tunneling) — lo que usan casi todos los clientes para https ---
server.on('connect', (req, clientSocket, head) => {
  if (!autorizado(req)) {
    clientSocket.write('HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="nexus-proxy-gen"\r\n\r\n')
    return clientSocket.end()
  }
  const hp = parseHostPort(req.url, 443)
  if (!hp || !hostPermitido(hp.host)) {
    log(`DENY connect ${req.url}`)
    clientSocket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
    return clientSocket.end()
  }
  const upstream = net.connect(hp.port, hp.host, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
    if (head && head.length) upstream.write(head)
    upstream.pipe(clientSocket)
    clientSocket.pipe(upstream)
    log(`OK connect ${hp.host}:${hp.port}`)
  })
  const cierra = (e) => { try { clientSocket.end() } catch { /* */ } try { upstream.end() } catch { /* */ } if (e) log(`ERR connect ${hp.host}: ${e.message}`) }
  upstream.on('error', cierra)
  clientSocket.on('error', cierra)
  upstream.setTimeout(120000, () => cierra(new Error('timeout upstream')))
})

server.on('clientError', (err, socket) => { try { socket.end('HTTP/1.1 400 Bad Request\r\n\r\n') } catch { /* */ } })

server.listen(PORT, '0.0.0.0', () => {
  log(`proxy-gen escuchando en 0.0.0.0:${PORT} | allow=${ALLOW_ALL ? '*(todos)' : ALLOW.join(',')} | tailnet=100.91.97.70`)
})

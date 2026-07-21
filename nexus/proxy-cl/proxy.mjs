#!/usr/bin/env node
// proxy.mjs — Proxy FORWARD de salida con IP chilena 🇨🇱 para el backend SII.
//
// Por qué: un backend que NO está en Chile (cloud/Vercel/otro server) es bloqueado
// por el SII (que solo acepta IPs chilenas). Este Mac (IP chilena 190.114.41.105)
// hace de proxy: el backend setea HTTPS_PROXY apuntando aquí y sus consultas al SII
// salen con la IP de este PC.
//
// Seguridad (NO es un proxy abierto):
//  1) Token obligatorio (Proxy-Authorization: Basic, password = PROXY_CL_TOKEN).
//  2) Allowlist de hosts: SOLO destinos *.sii.cl (configurable con PROXY_CL_ALLOW).
//  3) Soporta CONNECT (HTTPS, que es lo que usa el SII) y http normal.
//
// Uso desde el backend:
//   HTTPS_PROXY=http://nexus:<TOKEN>@<host-de-este-mac>:8899
//   HTTP_PROXY=http://nexus:<TOKEN>@<host-de-este-mac>:8899
// donde <host-de-este-mac> = 100.91.97.70 (Tailscale) o 190.114.41.105 (público).

import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { appendFileSync } from 'node:fs'

process.loadEnvFile(path.join(os.homedir(), 'nexus', '.env'))

const PORT = Number(process.env.PROXY_CL_PORT || 8899)
const TOKEN = process.env.PROXY_CL_TOKEN || ''
const ALLOW = (process.env.PROXY_CL_ALLOW || '.sii.cl')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
const LOG = '/tmp/nexus-proxy-cl.log'

function log(m) {
  const line = `[${new Date().toISOString()}] ${m}\n`
  try { appendFileSync(LOG, line) } catch { /* */ }
  process.stdout.write(line)
}

if (!TOKEN) { log('FATAL: falta PROXY_CL_TOKEN en ~/nexus/.env'); process.exit(1) }

// host:port -> {host, port}. Quita credenciales/paths por si acaso.
function parseHostPort(authority, defPort) {
  const m = String(authority).replace(/^.*@/, '').match(/^\[?([^\]]+?)\]?(?::(\d+))?$/)
  if (!m) return null
  return { host: m[1].toLowerCase(), port: Number(m[2] || defPort) }
}

function hostPermitido(host) {
  host = String(host || '').toLowerCase()
  return ALLOW.some((suf) =>
    suf.startsWith('.') ? (host === suf.slice(1) || host.endsWith(suf)) : host === suf)
}

// Token vía Proxy-Authorization: Basic base64(user:TOKEN)  (user es libre).
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
  // Alternativa simple: header X-Proxy-Token
  if ((req.headers['x-proxy-token'] || '') === TOKEN) return true
  return false
}

const server = http.createServer()

// --- HTTP normal (absolute-URI). El SII es https, así que esto es secundario. ---
server.on('request', (req, res) => {
  if (!autorizado(req)) {
    res.writeHead(407, { 'Proxy-Authenticate': 'Basic realm="nexus-proxy-cl"' })
    return res.end('Proxy auth requerido\n')
  }
  let target
  try { target = new URL(req.url) } catch { res.writeHead(400); return res.end('URL inválida\n') }
  if (!hostPermitido(target.hostname)) {
    log(`DENY http ${target.hostname}`)
    res.writeHead(403); return res.end('Destino no permitido (solo *.sii.cl)\n')
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

// --- CONNECT (HTTPS tunneling). Lo que realmente usa el SII. ---
server.on('connect', (req, clientSocket, head) => {
  if (!autorizado(req)) {
    clientSocket.write('HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="nexus-proxy-cl"\r\n\r\n')
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
  upstream.setTimeout(60000, () => cierra(new Error('timeout upstream')))
})

server.on('clientError', (err, socket) => { try { socket.end('HTTP/1.1 400 Bad Request\r\n\r\n') } catch { /* */ } })

// Bind a 0.0.0.0: alcanzable por Tailscale (100.91.97.70) y LAN/público (si hay
// port-forward). La seguridad la dan el token + la allowlist, no el binding.
server.listen(PORT, '0.0.0.0', () => {
  log(`proxy-cl escuchando en 0.0.0.0:${PORT} | allow=${ALLOW.join(',')} | tailnet=100.91.97.70 publico=190.114.41.105`)
})

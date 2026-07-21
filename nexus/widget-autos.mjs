// widget-autos.mjs — últimos autos publicados de MallorcAutos para el widget.
// Corre el conector goautos (publicados), ordena por fecha, cachea 5 min. Funnel /autos.
import http from 'node:http'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import os from 'node:os'

const PORT = Number(process.env.PUERTO_AUTOS || 7698)
const TOKEN = process.env.WIDGET_AUTOS_TOKEN || 'x'
const GO = join(os.homedir(), 'nexus', 'conector-goautos', 'goautos.mjs')
let cache = null, cacheTs = 0

function traer() {
  return new Promise((res) => {
    const ch = spawn('/usr/local/bin/node', [GO, 'publicados', '--limite', '40'], { timeout: 30000 })
    let out = ''
    ch.stdout.on('data', (d) => { out += d })
    ch.on('close', () => { try { res(JSON.parse(out)) } catch { res(null) } })
    ch.on('error', () => res(null))
  })
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x')
  if (u.searchParams.get('t') !== TOKEN) { res.writeHead(401); return res.end('no') }
  if (!cache || Date.now() - cacheTs > 5 * 60 * 1000) {
    const j = await traer()
    if (j && Array.isArray(j.vehiculos)) {
      const autos = j.vehiculos.slice()
        .sort((a, b) => Date.parse(b.creado) - Date.parse(a.creado))
        .slice(0, 6)
        .map((v) => ({ marca: v.marca, modelo: v.modelo, version: v.version, anio: v.anio, precio: v.precio, km: v.km, color: v.color, foto: v.foto, creado: v.creado, vistas: v.vistas, patente: v.patente }))
      cache = { ok: true, concesionaria: j.concesionaria, total: j.total, autos }
      cacheTs = Date.now()
    }
  }
  res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' })
  res.end(JSON.stringify(cache || { ok: false, autos: [] }))
}).listen(PORT, '127.0.0.1', () => console.log(`[autos] http://127.0.0.1:${PORT}`))

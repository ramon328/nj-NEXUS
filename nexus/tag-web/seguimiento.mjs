// seguimiento.mjs — Tablero INTERNO de solicitudes/traspasos de TAG (leads de TAG).
// Lee registro.mjs y permite cambiar estados y agregar notas. NO es público (solo por
// Tailscale/localhost), a diferencia del vinculador (/tag, ese sí es público).
//
//   node seguimiento.mjs   → http://127.0.0.1:3023

import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listar, obtener, actualizarEstado, agregarEvento, resumen, ESTADOS } from './registro.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.TAG_SEG_PORT || 3023)
const HTML = readFileSync(join(__dirname, 'seguimiento.html'), 'utf8')

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(obj))
}

async function body(req) {
  const ch = []
  for await (const c of req) ch.push(c)
  try { return JSON.parse(Buffer.concat(ch).toString('utf8') || '{}') } catch { return {} }
}

const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://127.0.0.1:${PORT}`)

    if (u.pathname === '/api/registros') {
      return json(res, 200, { estados: ESTADOS, resumen: resumen(), registros: listar() })
    }
    if (u.pathname === '/api/estado' && req.method === 'POST') {
      const b = await body(req)
      const r = actualizarEstado(b.id, b.estado, b.detalle)
      return json(res, r.ok ? 200 : 400, r)
    }
    if (u.pathname === '/api/nota' && req.method === 'POST') {
      const b = await body(req)
      if (!b.detalle) return json(res, 400, { ok: false, error: 'Falta la nota.' })
      const r = agregarEvento(b.id, b.detalle)
      return json(res, r.ok ? 200 : 400, r)
    }
    if (u.pathname === '/api/detalle') {
      const reg = obtener(u.searchParams.get('id'))
      return json(res, reg ? 200 : 404, reg || { error: 'no existe' })
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

server.listen(PORT, '0.0.0.0', () => console.log(`Seguimiento de TAG en http://0.0.0.0:${PORT}`))

// server.mjs — Panel de SEGUIMIENTO de cobranza (SOLO LECTURA).
// Muestra los mensajes automáticos (SMS + WhatsApp) enviados/programados a los
// números en seguimiento. Proceso INDEPENDIENTE del Hub: lee recordatorios.json
// y historial.db, nunca escribe nada, no toca el cerebro.
//
//   node server.mjs        → http://127.0.0.1:3021  (y por Tailscale)

import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const HOME = process.env.HOME || ''
const NEXUS = join(HOME, 'nexus')
const STORE = join(NEXUS, 'recordatorios.json')
const DB = join(NEXUS, 'historial.db')
const PORT = Number(process.env.SEG_PORT || 3021)

// Números en seguimiento (editable).
const CONTACTOS = [
  { nombre: 'Melman', num: '+56968301324' },
  { nombre: 'Melhuish', num: '+56952382609' },
]
const NUMS = CONTACTOS.map((c) => c.num)

function leerStore() {
  try { const a = JSON.parse(readFileSync(STORE, 'utf8')); return Array.isArray(a) ? a : [] } catch { return [] }
}

function histRows() {
  let db
  try {
    db = new DatabaseSync(DB)
    const ph = NUMS.map(() => '?').join(',')
    const q = db.prepare(
      `SELECT ts, canal, direccion, contraparte, texto, origen, estado, detalle
       FROM mensajes
       WHERE contraparte IN (${ph}) AND canal IN ('sms','whatsapp')
       ORDER BY ts DESC LIMIT 500`
    )
    return q.all(...NUMS)
  } catch { return [] } finally { try { db?.close() } catch { /* */ } }
}

function construir() {
  const store = leerStore()
  const hist = histRows()
  const contactos = CONTACTOS.map(({ nombre, num }) => {
    const prog = store.filter((r) => r.destino === num && (r.canal === 'sms' || r.canal === 'whatsapp'))
    const h = hist.filter((r) => r.contraparte === num)
    const porCanal = (canal) => {
      const p = prog.filter((r) => r.canal === canal).sort((a, b) => Date.parse(a.cuando) - Date.parse(b.cuando))
      return {
        programados: p.map((r) => ({ id: r.id, cuando: r.cuando, estado: r.estado, resultado: (r.resultado || '').toString().slice(0, 80) })),
        total: p.length,
        enviados: p.filter((r) => r.estado === 'enviado').length,
        pendientes: p.filter((r) => r.estado === 'pendiente').length,
        errores: p.filter((r) => r.estado === 'error').length,
      }
    }
    const sms = porCanal('sms')
    const whatsapp = porCanal('whatsapp')
    const entregados = h.filter((r) => r.origen === 'entrega' && /entregad/i.test(r.estado || '')).length
    const proximo = prog.filter((r) => r.estado === 'pendiente').map((r) => r.cuando).sort()[0] || null
    return {
      nombre, num,
      resumen: {
        programados: sms.total + whatsapp.total,
        enviados: sms.enviados + whatsapp.enviados,
        pendientes: sms.pendientes + whatsapp.pendientes,
        errores: sms.errores + whatsapp.errores,
        entregados,
        proximo,
      },
      canales: { sms, whatsapp },
      historial: h.slice(0, 40).map((r) => ({ ts: r.ts, canal: r.canal, direccion: r.direccion, estado: r.estado, origen: r.origen, detalle: (r.detalle || '').toString().slice(0, 120) })),
    }
  })
  return { generado: new Date().toISOString(), contactos }
}

const PAGINA = readFileSync(join(new URL('.', import.meta.url).pathname, 'index.html'), 'utf8')

const server = createServer((req, res) => {
  try {
    if (req.url.startsWith('/api/seguimiento')) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(construir()))
      return
    }
    if (req.url === '/' || req.url.startsWith('/index')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(PAGINA)
      return
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('no encontrado')
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('error: ' + e.message)
  }
})

server.listen(PORT, '0.0.0.0', () => console.log(`Seguimiento de cobranza en http://0.0.0.0:${PORT}`))

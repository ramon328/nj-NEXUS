// widget-status.mjs — endpoint PÚBLICO (con token) para el widget de Scriptable.
// Devuelve el status de Nexus + subagentes en JSON compacto. Puerto 7696, Funnel /widget.
import http from 'node:http'
import { estadoIAs } from './hub/historial.mjs'

const PORT = Number(process.env.PUERTO_WIDGET || 7696)
const TOKEN = process.env.WIDGET_TOKEN || 'CAMBIAR'
const IAS = [
  { persona: 'Ali',     emoji: '📊', rol: 'Aliace' },
  { persona: 'Meme',    emoji: '🚗', rol: 'Autos' },
  { persona: 'Néstor',  emoji: '✉️', rol: 'Correo' },
  { persona: 'Martes',  emoji: '🧾', rol: 'SII' },
  { persona: 'SAI',     emoji: '🧮', rol: 'Conciliación' },
  { persona: 'Cerebro', emoji: '🧠', rol: 'Cerebro' },
  { persona: 'Nexus',   emoji: '🤖', rol: 'Orquestador' },
]

async function hubOk() {
  try { const r = await fetch('http://127.0.0.1:3000/api/ping', { signal: AbortSignal.timeout(3000) }); return r.ok } catch { return false }
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x')
  if (u.searchParams.get('t') !== TOKEN) { res.writeHead(401); return res.end('no') }
  let estado = []
  try { estado = estadoIAs({ activoSeg: 120 }) } catch { /* */ }
  const porP = Object.fromEntries(estado.map((e) => [e.persona, e]))
  const nexus = await hubOk()
  const agentes = IAS.map((i) => {
    const e = porP[i.persona] || null
    return {
      persona: i.persona, emoji: i.emoji, rol: i.rol,
      activo: e ? e.activo : false,
      ok: e ? e.ultimo_ok : true,
      hace_seg: e ? e.hace_seg : null,
    }
  })
  res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' })
  res.end(JSON.stringify({ ok: true, ts: Date.now(), nexus, agentes }))
}).listen(PORT, '127.0.0.1', () => console.log(`[widget] http://127.0.0.1:${PORT}`))

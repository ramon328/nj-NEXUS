// leads-chileautos.mjs — sirve los LEADS REALES (Supabase AutoHighLevel, mismo proyecto
// que /autos) al widget de iPhone, y recibe el webhook de ChileAutos (POST /hook) para
// el futuro. GET /?t=TOKEN. NO cambiar el formato de salida (el widget lo consume así).
import http from 'node:http'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'

const PORT = Number(process.env.PUERTO_LEADS || 7697)
const TOKEN = process.env.WIDGET_LEADS_TOKEN || 'x'   // widget (GET)
const HOOK = process.env.HOOK_TOKEN || 'x'            // webhook ChileAutos (POST)
const STORE = join(os.homedir(), 'nexus', 'leads-webhook.json')  // solo para /hook

// ── Supabase (AutoHighLevel — mismo proyecto que goautos/autos) ──
const SUPA = 'https://miuiujntdjrjhhcysiba.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdWl1am50ZGpyamhoY3lzaWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwODEzNjcsImV4cCI6MjA1MDY1NzM2N30.CqgUmrnmGSLDc6tg2aCHdD7tB-q9YL2utHPzXSIo6gI'
let _jwt = null, _jwtExp = 0
async function jwt() {
  if (_jwt && Date.now() < _jwtExp) return _jwt
  const g = (JSON.parse(readFileSync(join(os.homedir(), 'nexus', 'credenciales.json'), 'utf8')).goautos) || {}
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: g.usuario, password: g.clave }),
  })
  const j = await r.json()
  if (!j.access_token) throw new Error('login supabase falló: ' + JSON.stringify(j).slice(0, 120))
  _jwt = j.access_token; _jwtExp = Date.now() + 50 * 60 * 1000
  return _jwt
}

// ── mapeo lead real → contrato del widget ──
const STATUS_MAP = { pending: 'New', assigned: 'Contact', completed: 'Sold', cancelled: 'Lost' }
const gnotes = (notes, re) => { const m = (notes || '').match(re); return m ? m[1].trim() : '' }
const esPlaceholder = (n) => { const u = (n || '').toUpperCase(); return !u || u.includes('PROSPECT') || u.includes('CARSALESCONNECT') }

// Deja el teléfono en formato internacional chileno para que el widget abra WhatsApp.
function normTel(t) {
  let s = String(t || '').replace(/[^\d+]/g, '')
  if (!s) return ''
  if (s.startsWith('+')) return s
  s = s.replace(/^56/, '')                       // saca 56 inicial suelto
  if (s.length === 9 && s[0] === '9') return '+56' + s   // móvil chileno 9 díg
  if (s.length === 8) return '+569' + s                  // faltó el 9 del móvil
  return '+56' + s
}

function mapLead(l) {
  const tel = normTel((l.customer && l.customer.phone) || gnotes(l.notes, /Tel[eé]fono:\s*([+\d][\d\s]*)/i))
  let nombre = (l.contact && l.contact.display_name) ||
    (l.customer && (l.customer.full_name || [l.customer.first_name, l.customer.last_name].filter(Boolean).join(' '))) || ''
  if (esPlaceholder(nombre)) nombre = tel || 'Sin nombre'
  const auto = gnotes(l.notes, /Veh[ií]culo:\s*([^\n]+)/i) || '—'
  const fuente = gnotes(l.notes, /Fuente:\s*([^\n]+)/i) ||
    (l.search_params && (l.search_params.chileautos_source || l.search_params.source)) || 'Chileautos'
  const horas = Math.max(0, Math.round((Date.now() - Date.parse(l.created_at)) / 3.6e6))
  const lscore = (l.contact && l.contact.lead_score) || 0
  const nivel = lscore >= 80 ? 'critico' : horas < 6 ? 'critico' : horas < 24 ? 'alto' : 'medio'
  const score = Math.round(lscore || Math.max(0, 100 - horas))
  return {
    id: l.id, status: STATUS_MAP[l.status] || l.status, nombre, telefono: tel,
    auto, tipo: (l.vehicle_id || /Veh[ií]culo:/i.test(l.notes || '')) ? 'ITEM' : 'GENERAL',
    fuente, comentario: '', creado: l.created_at, recibido: l.created_at,
    score, nivel, horas,
  }
}

let cache = null, cacheTs = 0
async function realLeads() {
  if (cache && Date.now() - cacheTs < 60000) return cache
  const H = { apikey: ANON, Authorization: 'Bearer ' + (await jwt()) }
  // total de activos (pending)
  const cr = await fetch(`${SUPA}/rest/v1/leads?select=id&status=eq.pending`, { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } })
  const total = Number((cr.headers.get('content-range') || '').split('/')[1]) || 0
  const sel = 'id,created_at,status,notes,type,vehicle_id,search_params,' +
    'customer:customers(phone,full_name,first_name,last_name),' +
    'contact:unified_contacts(display_name,phone,lead_score)'
  const r = await fetch(`${SUPA}/rest/v1/leads?select=${encodeURIComponent(sel)}&status=eq.pending&order=created_at.desc&limit=30`, { headers: H })
  const rows = await r.json()
  const mapped = (Array.isArray(rows) ? rows : []).map(mapLead)
  const criticos = mapped.filter((l) => l.nivel !== 'medio').slice(0, 6)
  cache = { total, top: mapped.slice(0, 8), criticos }
  cacheTs = Date.now()
  return cache
}

const leerStore = () => { try { return existsSync(STORE) ? JSON.parse(readFileSync(STORE, 'utf8')) : {} } catch { return {} } }

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x')
  // Webhook de ChileAutos (POST /hook) — guarda para el futuro; no afecta al widget.
  if (req.method === 'POST' && u.pathname.endsWith('/hook')) {
    const tok = req.headers['x-webhook-token'] || req.headers['access_token'] || u.searchParams.get('t')
    if (tok !== HOOK) { res.writeHead(401); return res.end('no') }
    let body = ''
    req.on('data', (d) => { body += d; if (body.length > 5e6) req.destroy() })
    req.on('end', () => {
      try {
        const p = JSON.parse(body); const id = p.Identifier || p.identifier
        if (id) { const all = leerStore(); all[id] = { ...p, recibido: new Date().toISOString() }; writeFileSync(STORE, JSON.stringify(all, null, 2)) }
        res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, id }))
      } catch { res.writeHead(400); res.end('bad') }
    })
    return
  }
  // Widget (GET): LEADS REALES
  if (u.searchParams.get('t') !== TOKEN) { res.writeHead(401); return res.end('no') }
  try {
    const d = await realLeads()
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' })
    res.end(JSON.stringify({ ok: true, ts: Date.now(), total_activos: d.total, criticos: d.criticos, top: d.top }))
  } catch (e) {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
    res.end(JSON.stringify({ ok: false, ts: Date.now(), total_activos: 0, criticos: [], top: [], error: String(e.message) }))
  }
}).listen(PORT, '127.0.0.1', () => console.log(`[leads] http://127.0.0.1:${PORT}`))

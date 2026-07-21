#!/usr/bin/env node
// gaia.mjs — Capacidades de la IA "GAIA" de GoAuto Admin PORTADAS a Nexus (Meme).
// Mismo backend Supabase que goautos.mjs (portal GoAuto), acotado SIEMPRE a
// MallorcAutos (client_id=32). Reusa el patrón auth/REST del conector.
//
// LECTURA:  leads, citas, financiamiento, documentos, marketing, equipo,
//           gastos-fijos, config, tasar
// ESCRITURA (simula con --dry): tarea, cotizacion, reserva, lead-estado
//
// Todo devuelve JSON por stdout. Uso: node gaia.mjs <cmd> [--flag valor ...]
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPA = 'https://miuiujntdjrjhhcysiba.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdWl1am50ZGpyamhoY3lzaWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwODEzNjcsImV4cCI6MjA1MDY1NzM2N30.CqgUmrnmGSLDc6tg2aCHdD7tB-q9YL2utHPzXSIo6gI'
const CLIENT_ID = 32
const M = `&client_id=eq.${CLIENT_ID}`   // filtro MallorcAutos

function creds() {
  const g = (JSON.parse(readFileSync(join(__dirname, '..', 'credenciales.json'), 'utf8')).goautos) || {}
  if (!g.usuario || !g.clave) throw new Error('Faltan credenciales de goautos en credenciales.json')
  return g
}
let _jwt = null
async function token() {
  if (_jwt) return _jwt
  const g = creds()
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: g.usuario, password: g.clave }),
  })
  const j = await r.json()
  if (!j.access_token) throw new Error('Login GoAutos falló: ' + JSON.stringify(j).slice(0, 160))
  _jwt = j.access_token
  return _jwt
}
async function rest(path) {
  const jwt = await token()
  const r = await fetch(`${SUPA}/rest/v1/${path}`, { headers: { apikey: ANON, Authorization: 'Bearer ' + jwt } })
  let body = null
  try { body = await r.json() } catch { body = null }
  return { ok: r.ok, status: r.status, body }
}
async function post(path, payload) {
  const jwt = await token()
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: 'Bearer ' + jwt, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  })
  let body = null
  try { body = await r.json() } catch { body = null }
  return { ok: r.ok, status: r.status, body }
}
async function patch(path, payload) {
  const jwt = await token()
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { apikey: ANON, Authorization: 'Bearer ' + jwt, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  })
  let body = null
  try { body = await r.json() } catch { body = null }
  return { ok: r.ok, status: r.status, body }
}

// ── CLI args ───────────────────────────────────────────────────────────────
const A = process.argv.slice(2)
const CMD = A[0]
function arg(n, def = undefined) { const i = A.indexOf('--' + n); return i >= 0 && A[i + 1] && !A[i + 1].startsWith('--') ? A[i + 1] : def }
function has(n) { return A.includes('--' + n) }
const numOr = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d }
const clp = (n) => (Number.isFinite(Number(n)) ? '$' + Number(n).toLocaleString('es-CL') : '—')
const fecha = (s) => { try { return new Date(s).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return s || '—' } }
const lim = () => Math.max(1, Math.min(100, numOr(arg('limite'), 15)))
function rango() {   // filtro de fechas PostgREST sobre una columna
  const desde = arg('desde'), hasta = arg('hasta')
  let f = ''
  if (desde) f += `&{col}=gte.${desde}`
  if (hasta) f += `&{col}=lte.${hasta}`
  return f
}
const salida = (o) => { process.stdout.write(JSON.stringify(o, null, 1)) }

// ── LEADS ────────────────────────────────────────────────────────────────
const LEAD_COMPRA = ['buy-direct', 'buy-consignment', 'search-request']
async function cmdLeads() {
  const sel = 'id,status,type,created_at,notes,search_text,' +
    'customer:customers(first_name,last_name,email,phone,rut),' +
    'vehicle:vehicles(year,price,license_plate,brands(name),models(name)),' +
    'search_brand:brands(name),search_model:models(name)'
  let q = `leads?select=${sel}${M}&order=created_at.desc&limit=${lim()}`
  if (arg('estado')) q += `&status=eq.${arg('estado')}`
  if (arg('tipo')) q += `&type=eq.${arg('tipo')}`
  const cat = (arg('categoria') || '').toLowerCase()
  if (cat === 'compra') q += `&type=in.(${LEAD_COMPRA.join(',')})`
  if (cat === 'venta') q += `&type=not.in.(${LEAD_COMPRA.join(',')})`
  if (arg('desde')) q += `&created_at=gte.${arg('desde')}`
  if (arg('hasta')) q += `&created_at=lte.${arg('hasta')}`
  const r = await rest(q)
  if (!r.ok) return salida({ error: `No pude leer leads (${r.status})`, detalle: r.body })
  let rows = Array.isArray(r.body) ? r.body : []
  const nom = (arg('nombre') || '').toLowerCase()
  if (nom) rows = rows.filter((l) => `${l.customer?.first_name || ''} ${l.customer?.last_name || ''}`.toLowerCase().includes(nom))
  const out = rows.map((l) => ({
    id: l.id, estado: l.status, tipo: l.type, creado: fecha(l.created_at),
    cliente: [l.customer?.first_name, l.customer?.last_name].filter(Boolean).join(' ') || '—',
    telefono: l.customer?.phone || null, email: l.customer?.email || null,
    interes: l.vehicle ? `${l.vehicle.brands?.name || ''} ${l.vehicle.models?.name || ''} ${l.vehicle.year || ''}`.trim() : (l.search_brand?.name ? `busca ${l.search_brand.name} ${l.search_model?.name || ''}`.trim() : null),
    nota: l.notes || l.search_text || null,
  }))
  salida({ total: out.length, leads: out })
}

// ── CITAS / AGENDA ──────────────────────────────────────────────────────
async function cmdCitas() {
  const sel = 'id,slot_start,slot_end,status,service_name,notes,channel,dealership_address,vehicle_id,customer:customers(first_name,last_name,phone)'
  let q = `appointments_public?select=${sel}${M}&order=slot_start.desc&limit=${lim()}`
  if (arg('estado')) q += `&status=eq.${arg('estado')}`
  if (arg('desde')) q += `&slot_start=gte.${arg('desde')}`
  if (arg('hasta')) q += `&slot_start=lte.${arg('hasta')}`
  const r = await rest(q)
  if (!r.ok) return salida({ error: `No pude leer citas (${r.status})`, detalle: r.body })
  let rows = Array.isArray(r.body) ? r.body : []
  const nom = (arg('nombre') || '').toLowerCase()
  if (nom) rows = rows.filter((c) => `${c.customer?.first_name || ''} ${c.customer?.last_name || ''}`.toLowerCase().includes(nom))
  const out = rows.map((c) => ({
    id: c.id, cuando: c.slot_start ? new Date(c.slot_start).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' }) : '—',
    estado: c.status || null, servicio: c.service_name || null,
    cliente: c.customer ? [c.customer.first_name, c.customer.last_name].filter(Boolean).join(' ') : '—',
    telefono: c.customer?.phone || null, canal: c.channel || null, nota: c.notes || null, vehicle_id: c.vehicle_id || null,
  }))
  salida({ total: out.length, citas: out })
}

// ── FINANCIAMIENTO ──────────────────────────────────────────────────────
async function cmdFinanciamiento() {
  const conPagos = has('pagos')
  // financing NO tiene client_id → se acota por join interno a vehicles (client_id=32).
  const sel = 'id,downpayment,monthly_installment,total_installments,payment_day,start_date,notes,' +
    'customer:customers(first_name,last_name),veh:vehicles!inner(client_id,brands(name),models(name),year,license_plate)' +
    (conPagos ? ',pagos:financing_payment(id,amount,installment_number,due_date,payment_status,is_paid)' : '')
  let q = `financing?select=${sel}&veh.client_id=eq.${CLIENT_ID}&order=created_at.desc&limit=${lim()}`
  if (arg('customer_id')) q += `&customer_id=eq.${numOr(arg('customer_id'), 0)}`
  if (arg('vehicle_id')) q += `&vehicle_id=eq.${numOr(arg('vehicle_id'), 0)}`
  const r = await rest(q)
  if (!r.ok) return salida({ error: `No pude leer financiamiento (${r.status})`, detalle: r.body })
  const rows = Array.isArray(r.body) ? r.body : []
  const out = rows.map((f) => ({
    id: f.id, cliente: [f.customer?.first_name, f.customer?.last_name].filter(Boolean).join(' ') || '—',
    vehiculo: f.veh ? `${f.veh.brands?.name || ''} ${f.veh.models?.name || ''} ${f.veh.year || ''}`.trim() : null,
    pie: f.downpayment ?? null, cuota_mensual: f.monthly_installment ?? null, total_cuotas: f.total_installments ?? null,
    dia_pago: f.payment_day ?? null, inicio: f.start_date ? fecha(f.start_date) : null,
    pagos: conPagos && Array.isArray(f.pagos) ? { total: f.pagos.length, pagadas: f.pagos.filter((p) => p.is_paid).length } : undefined,
  }))
  salida({ total: out.length, financiamientos: out })
}

// ── DOCUMENTOS (cotizaciones / reservas / cierres / plantillas / docs) ──
const DOC_TABLA = {
  cotizaciones: 'vehicles_quotations', cotizacion: 'vehicles_quotations',
  reservas: 'vehicles_reservations', reserva: 'vehicles_reservations',
  cierres: 'vehicles_close_deal', plantillas: 'document_templates',
  documentos: 'vehicles_documents', documento: 'vehicles_documents',
}
async function cmdDocumentos() {
  const tipo = (arg('tipo') || 'cotizaciones').toLowerCase()
  const tabla = DOC_TABLA[tipo] || 'vehicles_documents'
  let q
  if (tabla === 'document_templates') {
    q = `${tabla}?select=*${M}&order=created_at.desc&limit=${lim()}`
  } else {
    // quotations/reservations/close_deal/documents NO tienen client_id → acotar por vehicle.
    const j = ',veh:vehicles!inner(client_id,brands(name),models(name),year,license_plate,price),customer:customers(first_name,last_name)'
    q = `${tabla}?select=*${j}&veh.client_id=eq.${CLIENT_ID}&order=created_at.desc&limit=${lim()}`
    if (arg('vehicle_id')) q += `&vehicle_id=eq.${numOr(arg('vehicle_id'), 0)}`
  }
  const r = await rest(q)
  if (!r.ok) return salida({ error: `No pude leer ${tipo} (${r.status})`, detalle: r.body })
  const rows = Array.isArray(r.body) ? r.body : []
  const out = rows.map((d) => ({
    id: d.id, estado: d.status || null,
    vehiculo: d.veh ? `${d.veh.brands?.name || ''} ${d.veh.models?.name || ''} ${d.veh.year || ''}`.trim() : null,
    cliente: d.customer ? [d.customer.first_name, d.customer.last_name].filter(Boolean).join(' ') : null,
    monto: d.estimated_price ?? d.reservation_agreed_price ?? d.reservation_amount ?? d.price ?? null,
    fecha: fecha(d.quotation_date || d.reservation_date || d.created_at),
    nombre: d.name || d.title || null, notas: d.notes || null,
  }))
  salida({ tipo, total: out.length, documentos: out })
}

// ── MARKETING (estado de integraciones + publicaciones) ─────────────────
async function cmdMarketing() {
  const plat = (arg('plataforma') || '').toLowerCase()
  const one = async (tabla, filtro = M) => (await rest(`${tabla}?select=*${filtro}&limit=${lim()}`)).body
  if (!plat) {
    const chk = async (tabla, filtro = M) => { const r = await rest(`${tabla}?select=id${filtro}&limit=1`); return r.ok && Array.isArray(r.body) && r.body.length > 0 }
    return salida({
      conexiones: {
        instagram: await chk('instagram_integrations'),
        mercadolibre: await chk('meli_integration', `&user_id=eq.${CLIENT_ID}`),
        facebook: await chk('fb_marketplace_integration'),
        chileautos: await chk('chileautos_integration'),
      },
      nota: 'Pide una plataforma concreta para ver sus publicaciones.',
    })
  }
  if (plat === 'instagram') return salida({ plataforma: plat, integracion: await one('instagram_integrations') })
  if (plat === 'mercadolibre' || plat === 'meli') return salida({ plataforma: 'mercadolibre', integracion: await one('meli_integration', `&user_id=eq.${CLIENT_ID}`), publicaciones: await one('meli_post') })
  if (plat === 'facebook' || plat === 'fb') return salida({ plataforma: 'facebook', integracion: await one('fb_marketplace_integration'), publicaciones: await one('fb_marketplace_post') })
  if (plat === 'chileautos') return salida({ plataforma: plat, integracion: await one('chileautos_integration'), publicaciones: await one('chileautos_listing') })
  if (plat === 'emails' || plat === 'email') return salida({ plataforma: 'emails', historial: await one('marketing_emails_history') })
  return salida({ error: `Plataforma desconocida: ${plat}` })
}

// ── EQUIPO (usuarios / roles / comisiones) ──────────────────────────────
async function cmdEquipo() {
  const r = await rest(`users?select=id,first_name,last_name,email,rol,phone${M}&limit=${lim()}`)
  if (!r.ok) return salida({ error: `No pude leer el equipo (${r.status})`, detalle: r.body })
  const usuarios = (Array.isArray(r.body) ? r.body : []).map((u) => ({
    id: u.id, nombre: [u.first_name, u.last_name].filter(Boolean).join(' ') || '—', email: u.email || null, rol: u.rol || null, telefono: u.phone || null,
  }))
  const out = { total: usuarios.length, usuarios }
  if (has('comisiones')) {
    // seller_commission_tiers NO tiene client_id → acotar por join a users (vendedor) del cliente 32.
    const tiers = await rest(`seller_commission_tiers?select=*,vendedor:users!inner(client_id,first_name,last_name)&vendedor.client_id=eq.${CLIENT_ID}&order=created_at`)
    out.tramos_comision = Array.isArray(tiers.body) ? tiers.body : tiers.body
  }
  salida(out)
}

// ── GASTOS FIJOS MENSUALES ──────────────────────────────────────────────
async function cmdGastosFijos() {
  let q = `fixed_monthly_expenses?select=*${M}&limit=${lim()}`
  if (!has('todos')) q += '&is_active=eq.true'
  const r = await rest(q)
  if (!r.ok) return salida({ error: `No pude leer gastos fijos (${r.status})`, detalle: r.body })
  const rows = Array.isArray(r.body) ? r.body : []
  const total = rows.reduce((a, g) => a + (Number(g.amount ?? 0) || 0), 0)
  salida({ total_gastos: rows.length, total_mensual: total, total_mensual_fmt: clp(total), gastos: rows.map((g) => ({ id: g.id, nombre: g.title || g.description || '—', monto: g.amount ?? null, activo: g.is_active })) })
}

// ── CONFIG / CATÁLOGOS ──────────────────────────────────────────────────
const CONFIG_TABLA = {
  estados: `clients_vehicles_states?select=id,name,order,color${M}&order=order`,
  marcas: 'brands?select=id,name&order=name',
  modelos: 'models?select=id,name,brands(name)&order=name&limit=200',
  colores: 'colors?select=id,name&order=name',
  condiciones: 'conditions?select=id,name',
  combustibles: 'fuel_types?select=id,name',
  categorias: 'categories?select=id,name',
  sucursales: `dealerships?select=*${M}`,
  legal: `legal_info?select=*${M}`,
  comisiones: `seller_commission_tiers?select=*,vendedor:users!inner(client_id,first_name,last_name)&vendedor.client_id=eq.${CLIENT_ID}&order=created_at`,
}
async function cmdConfig() {
  const ent = (arg('entidad') || 'estados').toLowerCase()
  const path = CONFIG_TABLA[ent]
  if (!path) return salida({ error: `Entidad desconocida: ${ent}`, disponibles: Object.keys(CONFIG_TABLA) })
  const r = await rest(path.includes('limit') ? path : `${path}&limit=${lim()}`)
  salida({ entidad: ent, total: Array.isArray(r.body) ? r.body.length : 0, datos: r.body })
}

// ── TASACIÓN (Edge Function car_appraiser) ──────────────────────────────
async function cmdTasar() {
  const query = A.slice(1).filter((x) => !x.startsWith('--')).join(' ') || arg('query') || ''
  if (!query) return salida({ error: 'Falta la descripción del auto a tasar (marca, modelo, año, versión, km).' })
  const jwt = await token()
  const r = await fetch(`${SUPA}/functions/v1/car_appraiser`, {
    method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + jwt, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, client_id: CLIENT_ID }),
  })
  let body = null
  try { body = await r.json() } catch { body = null }
  if (!r.ok) return salida({ error: `La tasación falló (${r.status})`, detalle: body })
  salida({ ok: true, tasacion: body })
}

// ── ESCRITURAS (simulan con --dry) ──────────────────────────────────────
async function cmdTarea() {
  const title = arg('titulo')
  if (!title) return salida({ error: 'Falta --titulo.' })
  const fila = {
    client_id: CLIENT_ID, title, description: arg('descripcion') || null,
    priority: arg('prioridad') || 'medium', due_date: arg('vence') || null,
    category: arg('categoria') || 'general', vehicle_id: arg('vehicle_id') ? numOr(arg('vehicle_id'), null) : null,
    status: 'pending', source_type: 'ai',
  }
  if (has('dry')) return salida({ simulacion: true, accion: 'crear tarea', fila })
  const r = await post('tasks', fila)
  if (!r.ok) return salida({ error: `No pude crear la tarea (${r.status})`, detalle: r.body })
  salida({ ok: true, tarea: Array.isArray(r.body) ? r.body[0] : r.body })
}

async function cmdCotizacion() {
  const vid = numOr(arg('vehicle_id'), 0), cid = numOr(arg('customer_id'), 0), precio = numOr(arg('precio'), 0)
  if (!vid || !cid || !precio) return salida({ error: 'Faltan --vehicle_id, --customer_id y --precio.' })
  const dias = numOr(arg('validez'), 30)
  // vehicles_quotations NO tiene client_id ni status; se aísla por el vehicle_id (del cliente 32).
  const fila = { vehicle_id: vid, customer_id: cid, estimated_price: precio, validity_period: dias, quotation_date: new Date().toISOString(), notes: arg('notas') || null }
  if (has('dry')) return salida({ simulacion: true, accion: 'crear cotización', fila })
  const r = await post('vehicles_quotations', fila)
  if (!r.ok) return salida({ error: `No pude crear la cotización (${r.status})`, detalle: r.body })
  salida({ ok: true, cotizacion: Array.isArray(r.body) ? r.body[0] : r.body })
}

async function cmdReserva() {
  const vid = numOr(arg('vehicle_id'), 0), cid = numOr(arg('customer_id'), 0), precio = numOr(arg('precio'), 0)
  if (!vid || !cid || !precio) return salida({ error: 'Faltan --vehicle_id, --customer_id y --precio.' })
  const dias = numOr(arg('validez'), 3)
  const exp = new Date(Date.now() + dias * 86400000).toISOString()
  // vehicles_reservations NO tiene client_id; se aísla por el vehicle_id (del cliente 32).
  const fila = { vehicle_id: vid, customer_id: cid, reservation_agreed_price: precio, reservation_amount: precio, status: 'active', reservation_date: new Date().toISOString(), expiration_date: exp, notes: arg('notas') || null }
  // resolver estado "Reservado"
  const est = await rest(`clients_vehicles_states?select=id,name${M}&name=ilike.*reservado*&limit=1`)
  const reservadoId = Array.isArray(est.body) && est.body[0] ? est.body[0].id : null
  if (has('dry')) return salida({ simulacion: true, accion: 'crear reserva + marcar vehículo Reservado', fila, estado_reservado_id: reservadoId })
  const r = await post('vehicles_reservations', fila)
  if (!r.ok) return salida({ error: `No pude crear la reserva (${r.status})`, detalle: r.body })
  let vehiculoActualizado = null
  if (reservadoId) {
    const pv = await patch(`vehicles?id=eq.${vid}${M}`, { status_id: reservadoId, state_updated_at: new Date().toISOString() })
    vehiculoActualizado = pv.ok
  }
  salida({ ok: true, reserva: Array.isArray(r.body) ? r.body[0] : r.body, vehiculo_marcado_reservado: vehiculoActualizado })
}

async function cmdLeadEstado() {
  const id = numOr(arg('id'), 0), estado = arg('estado')
  const VALIDOS = ['pending', 'assigned', 'completed', 'cancelled']
  if (!id || !VALIDOS.includes(estado)) return salida({ error: `Falta --id y --estado (uno de: ${VALIDOS.join(', ')}).` })
  const prev = await rest(`leads?select=id,status${M}&id=eq.${id}&limit=1`)
  if (!Array.isArray(prev.body) || !prev.body[0]) return salida({ error: `No encontré el lead ${id} en MallorcAutos.` })
  if (has('dry')) return salida({ simulacion: true, accion: 'cambiar estado de lead', lead_id: id, de: prev.body[0].status, a: estado })
  const r = await patch(`leads?id=eq.${id}${M}`, { status: estado })
  if (!r.ok) return salida({ error: `No pude actualizar el lead (${r.status})`, detalle: r.body })
  salida({ ok: true, lead_id: id, de: prev.body[0].status, a: estado })
}

// ── Introspección (debug): columnas reales de una tabla ─────────────────
async function cmdCols() {
  const t = arg('tabla')
  const r = await rest(`${t}?select=*${has('raw') ? '' : M}&limit=1`)
  salida({ tabla: t, status: r.status, columnas: Array.isArray(r.body) && r.body[0] ? Object.keys(r.body[0]) : r.body })
}

// ── Router ───────────────────────────────────────────────────────────────
const CMDS = {
  _cols: cmdCols,
  leads: cmdLeads, citas: cmdCitas, financiamiento: cmdFinanciamiento, documentos: cmdDocumentos,
  marketing: cmdMarketing, equipo: cmdEquipo, 'gastos-fijos': cmdGastosFijos, config: cmdConfig, tasar: cmdTasar,
  tarea: cmdTarea, cotizacion: cmdCotizacion, reserva: cmdReserva, 'lead-estado': cmdLeadEstado,
}
;(async () => {
  const fn = CMDS[CMD]
  if (!fn) { salida({ error: `Comando desconocido: ${CMD}`, comandos: Object.keys(CMDS) }); process.exit(1) }
  try { await fn() } catch (e) { salida({ error: String(e.message || e) }); process.exit(1) }
})()

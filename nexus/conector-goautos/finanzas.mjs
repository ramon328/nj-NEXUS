// finanzas.mjs — Finanzas de MallorcAutos calculadas DIRECTO desde GoAutos (Supabase).
//
// POR QUÉ: hasta ahora el COSTO / GASTOS / TOTAL invertido / MARGEN de cada auto salían
// de un Excel de OneDrive mantenido a mano (conector-mallorca/mallorca.py). Ese Excel se
// desactualiza y hay que cargarlo a mano. TODO ese dato ya vive en GoAutos:
//   · COMPRA  → vehicles_purchases.purchase_price   (autos propios)
//   · CONSIGN → vehicles_consignments.agreed_price  (autos en consignación)
//   · GASTOS  → vehicles_extras type ∈ {expense, document}  (los otros tipos NO son costo:
//               reservation_payment / reservation_additional / sale_additional / income)
//   · VENTA   → vehicles_sales.sale_price (aprobada y vigente: reverted_at null)
//   · PV      → vehicles.price (precio publicado)
//
// IVA: el monto de cada gasto va CON IVA. Si el gasto genera crédito fiscal
// (genera_credito_fiscal=true) el IVA es recuperable, así que al COSTO se le carga el
// NETO (monto / 1.19); si no, se carga el monto completo. Esto replica cómo GoAutos
// arma el costo real del auto (verificado contra ventas cuya venta = costo total).
//
//   total_invertido = costo_compra + gastos_neto
//   margen (vendido)     = sale_price      − total_invertido
//   margen estimado (stock) = precio_publicado − total_invertido
//
// Todo se ACOTA a MallorcAutos (client_id=32); es SOLO LECTURA.
//
// Uso (imprime JSON, mismo formato que usaba mallorca.py para que el Hub no cambie):
//   node finanzas.mjs stock                    (stock valorizado: total invertido + lista)
//   node finanzas.mjs auto --patente RGVG27    (costo/gastos/total/PV/margen de UN auto)
//   node finanzas.mjs auto --id 4810
//   node finanzas.mjs ventas [--mes 2026-06]   (ventas y márgenes; opcional por mes)

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// URL + anon key públicas del bundle GoAutos (NO son el proyecto Aliace).
// Override opcional: GOAUTOS_SUPABASE_URL / GOAUTOS_SUPABASE_ANON_KEY.
const SUPA = process.env.GOAUTOS_SUPABASE_URL || 'https://miuiujntdjrjhhcysiba.supabase.co'
const ANON = process.env.GOAUTOS_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdWl1am50ZGpyamhoY3lzaWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwODEzNjcsImV4cCI6MjA1MDY1NzM2N30.CqgUmrnmGSLDc6tg2aCHdD7tB-q9YL2utHPzXSIo6gI'
const CLIENT_ID = 32
const TIPOS_COSTO = new Set(['expense', 'document'])  // los extras que SÍ son costo (820 = 463 expense + 357 document)

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

// Trae TODAS las filas de una ruta PostgREST paginando de a 1000 (el header Range).
async function traerTodo(ruta) {
  const jwt = await token()
  const filas = []
  const paso = 1000
  for (let desde = 0; ; desde += paso) {
    const r = await fetch(`${SUPA}/rest/v1/${ruta}`, {
      headers: { apikey: ANON, Authorization: 'Bearer ' + jwt, Range: `${desde}-${desde + paso - 1}` },
    })
    const lote = await r.json()
    if (!Array.isArray(lote)) throw new Error('GoAutos respondió: ' + JSON.stringify(lote).slice(0, 160))
    filas.push(...lote)
    if (lote.length < paso) return filas
  }
}

const num = (v) => (v == null || v === '' ? 0 : (Number(v) || 0))
const normPat = (p) => String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const soloFecha = (s) => (s ? String(s).slice(0, 10) : null)

// Aporte al COSTO de un extra: neto de IVA si genera crédito fiscal, si no el monto completo.
function costoExtra(e) {
  const m = num(e.amount)
  return e.genera_credito_fiscal ? m / 1.19 : m
}

// ── Carga TODO el dataset de finanzas de MallorcAutos, una sola vez ───────────────
async function cargar() {
  const vehiculos = await traerTodo(
    `vehicles?client_id=eq.${CLIENT_ID}&select=id,license_plate,price,year,status_id,is_consigned,show_in_stock,stock_type,created_at,brands(name),models(name)`
  )
  const ids = new Set(vehiculos.map((v) => v.id))
  const soloNuestros = (filas) => filas.filter((f) => ids.has(f.vehicle_id))

  // Estados (status_id → nombre) para etiquetar (Publicado/Reservado/Vendido…).
  let estados = {}
  try {
    const st = await traerTodo(`clients_vehicles_states?select=id,name&client_id=eq.${CLIENT_ID}`)
    for (const s of st) estados[s.id] = s.name
  } catch { /* no crítico */ }

  const compras = soloNuestros(await traerTodo('vehicles_purchases?select=vehicle_id,purchase_price,status,id'))
  const consig = soloNuestros(await traerTodo('vehicles_consignments?select=vehicle_id,agreed_price,id'))
  const ventas = soloNuestros(await traerTodo('vehicles_sales?select=vehicle_id,sale_price,sale_date,status,reverted_at'))
  const extras = soloNuestros(await traerTodo('vehicles_extras?select=vehicle_id,type,amount,title,genera_credito_fiscal'))

  // Índices por vehículo.
  const compraDe = new Map()   // vehicle_id → purchase_price (la última fila, mayor id)
  for (const c of compras) {
    const prev = compraDe.get(c.vehicle_id)
    if (!prev || c.id > prev.id) compraDe.set(c.vehicle_id, { id: c.id, precio: num(c.purchase_price) })
  }
  const consigDe = new Map()   // vehicle_id → agreed_price (la última)
  for (const c of consig) {
    const prev = consigDe.get(c.vehicle_id)
    if (!prev || c.id > prev.id) consigDe.set(c.vehicle_id, { id: c.id, precio: num(c.agreed_price) })
  }
  const ventaDe = new Map()    // vehicle_id → {sale_price, sale_date} (aprobada y vigente)
  for (const v of ventas) {
    if (v.status === 'approved' && !v.reverted_at) ventaDe.set(v.vehicle_id, { precio: num(v.sale_price), fecha: soloFecha(v.sale_date) })
  }
  const extrasDe = new Map()   // vehicle_id → [extras que son costo]
  for (const e of extras) {
    if (!TIPOS_COSTO.has(e.type)) continue
    if (!extrasDe.has(e.vehicle_id)) extrasDe.set(e.vehicle_id, [])
    extrasDe.get(e.vehicle_id).push(e)
  }

  // Arma la ficha financiera de cada auto.
  const autos = vehiculos.map((v) => {
    const consignado = v.is_consigned === true
    const compra = compraDe.get(v.id)
    const cons = consigDe.get(v.id)
    // Costo de adquisición: compra si existe; si es consignado sin compra, el precio acordado.
    const costoCompra = compra ? compra.precio : (cons ? cons.precio : 0)
    const items = extrasDe.get(v.id) || []
    const gastos = items.reduce((a, e) => a + costoExtra(e), 0)
    const total = costoCompra + gastos
    const venta = ventaDe.get(v.id) || null
    const pv = num(v.price)
    return {
      id: v.id,
      patente: v.license_plate ? String(v.license_plate).toUpperCase() : null,
      marca: v.brands?.name || null,
      modelo: v.models?.name || null,
      anio: v.year ?? null,
      estado: estados[v.status_id] || null,
      consignado,
      en_stock: v.show_in_stock === true,
      vendido: !!venta,
      costo: Math.round(costoCompra),
      gastos: Math.round(gastos),
      gastos_items: items.length,
      total_invertido: Math.round(total),
      pv_esperado: pv || null,
      venta: venta ? Math.round(venta.precio) : null,
      fecha_venta: venta ? venta.fecha : null,
      margen: venta ? Math.round(venta.precio - total) : null,           // realizado (vendido)
      margen_estimado: !venta && pv ? Math.round(pv - total) : null,     // estimado (en stock, vs PV)
      _gastos_detalle: items.map((e) => ({ titulo: e.title || null, tipo: e.type, monto: Math.round(num(e.amount)), credito_fiscal: !!e.genera_credito_fiscal, aporte_costo: Math.round(costoExtra(e)) })),
    }
  })
  return autos
}

// ── Comandos ──────────────────────────────────────────────────────────────────────

function cmdStock(autos) {
  // Stock valorizado = autos DISPONIBLES (en stock y NO vendidos).
  const enStock = autos.filter((a) => a.en_stock && !a.vendido)
  let costo = 0, gastos = 0, total = 0
  const lista = enStock.map((a) => {
    costo += a.costo; gastos += a.gastos; total += a.total_invertido
    return { patente: a.patente, marca: a.marca, modelo: a.modelo, anio: a.anio, estado: a.estado, consignado: a.consignado, costo: a.costo, gastos: a.gastos, total_invertido: a.total_invertido, pv_esperado: a.pv_esperado, margen_estimado: a.margen_estimado }
  })
  lista.sort((x, y) => (y.total_invertido || 0) - (x.total_invertido || 0))
  return {
    fuente: 'GoAutos (Supabase, en vivo)', vista: 'stock valorizado',
    autos_en_stock: enStock.length,
    costo_total: Math.round(costo), gastos_total: Math.round(gastos), total_invertido: Math.round(total),
    autos: lista,
  }
}

function cmdAuto(autos, { patente, id }) {
  let a = null
  if (id) a = autos.find((x) => x.id === Number(id))
  else if (patente) { const p = normPat(patente); a = autos.find((x) => normPat(x.patente) === p) }
  if (!a) return { fuente: 'GoAutos (Supabase, en vivo)', encontrado: false, aviso: `No encontré ese auto en MallorcAutos (${patente || id}).` }
  const { _gastos_detalle, en_stock, ...ficha } = a
  return {
    fuente: 'GoAutos (Supabase, en vivo)', encontrado: true, ...ficha,
    precio_publicado: a.pv_esperado,
    gastos_detalle: _gastos_detalle,
    nota: a.vendido
      ? 'Margen REALIZADO = venta − total invertido (costo + gastos neto de IVA recuperable).'
      : 'Margen ESTIMADO = precio publicado − total invertido (costo + gastos neto de IVA recuperable).',
  }
}

function cmdVentas(autos, { mes }) {
  const filtro = (mes || '').trim()
  let vendidos = autos.filter((a) => a.vendido)
  if (filtro) vendidos = vendidos.filter((a) => String(a.fecha_venta || '').startsWith(filtro))
  vendidos.sort((x, y) => String(y.fecha_venta || '').localeCompare(String(x.fecha_venta || '')))
  let venta = 0, costoTot = 0, margen = 0
  const detalle = vendidos.map((a) => {
    venta += a.venta || 0; costoTot += a.total_invertido || 0; margen += a.margen || 0
    return { patente: a.patente, marca: a.marca, modelo: a.modelo, fecha: a.fecha_venta, venta: a.venta, total_invertido: a.total_invertido, margen: a.margen }
  })
  return {
    fuente: 'GoAutos (Supabase, en vivo)', vista: 'ventas y márgenes',
    filtro_mes: filtro || null, ventas_contadas: vendidos.length,
    venta_total: Math.round(venta), costo_total: Math.round(costoTot), margen_total: Math.round(margen),
    detalle: detalle.slice(0, 80),
  }
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2)
  const arg = (k, d) => { const i = rest.indexOf('--' + k); return i >= 0 ? rest[i + 1] : d }
  const salir = (o) => { console.log(JSON.stringify(o, null, 2)); process.exit(0) }
  try {
    const autos = await cargar()
    if (cmd === 'stock') salir(cmdStock(autos))
    else if (cmd === 'auto') salir(cmdAuto(autos, { patente: arg('patente'), id: arg('id') }))
    else if (cmd === 'ventas') salir(cmdVentas(autos, { mes: arg('mes') }))
    else salir({ error: 'Comando desconocido', comandos: ['stock', 'auto --patente X | --id N', 'ventas [--mes YYYY-MM]'] })
  } catch (e) {
    salir({ error: String(e && e.message || e) })
  }
}
main()

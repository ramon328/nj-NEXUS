// goautos.mjs — Conector de GoAutos para Nexus (lectura directa de Supabase).
//
// POR QUÉ: la SPA de GoAutos (admin) renderiza las tablas por JS y a veces no
// carga los datos al raspar el DOM. Los datos viven en Supabase, así que entramos
// directo con las credenciales de GoAutos (Supabase Auth) y consultamos por API.
// Es confiable, rápido y no depende de que la página renderice.
//
// Uso (devuelve JSON):
//   node goautos.mjs resumen                 (total, en_stock=disponibles, vendidos)
//   node goautos.mjs stock [--limite 20]      (solo disponibles: en stock y NO vendidos)
//   node goautos.mjs vehiculos [--limite 20]  (todos, marca cada uno con vendido:true/false)
//   node goautos.mjs sucursales               (locales físicos de MallorcAutos)
//   node goautos.mjs buscar --texto "audi"
//   node goautos.mjs editar --id 4810 --estado Reservado --ubicacion local --precio 22900000
//   node goautos.mjs crear --marca Toyota --modelo Hilux --anio 2020 --patente ABCD12 --foto /ruta.jpg
//   node goautos.mjs vender --id 4810 --precio 22900000 --rut 12.345.678-9 --nombre Juan --apellido Pérez --pago efectivo
//   node goautos.mjs vender --id 4810 --precio 22900000 --dry   (simula: no escribe nada, muestra qué haría)
//   node goautos.mjs gasto --id 4810 --titulo "Cambio de neumáticos" --monto 280000 --categoria neumaticos   (monto CON IVA)
//
// "En stock" = DISPONIBLE = en stock y NO vendido. Un auto está vendido si tiene
// una venta aprobada vigente en `vehicles_sales` (ver idsVendidos()).
//
// LECTURA + EDICIÓN. La edición (`editar`) toca SOLO autos de MallorcAutos: se
// verifica client_id=32 antes de escribir y el propio UPDATE va filtrado por
// client_id=32, así es imposible modificar otra automotora del portal.
// Campos editables/creables (ver EDITABLES y crearVehiculo): estado (status_id),
// ubicacion (online/local), sucursal, precio, precio_min, descuento, km, anio,
// duenos, patente, transmision, traccion, version, descripcion, en_stock,
// publicado, video, condicion (nuevo/usado/semi-nuevo), tipo/carroceria (Suv,
// Sedan, Pickup, Camioneta…), motor, chasis/vin, llaves, consignado, prenda,
// iva_exento, facturable, transferencia, rev_tecnica, permiso_circulacion,
// gases/emisiones, permiso_municipal, comuna_permiso, etiqueta.
// VENTAS (`vender`): registra la nota de venta de un auto de MallorcAutos (crea el
// documento + la venta aprobada y lo marca "Vendido"). Igual que la edición, valida
// client_id=32 sobre el vehículo antes de escribir. Trae --dry para simular.
// GASTOS (`gasto`): agrega un gasto al auto (vehicles_extras type='expense'). El monto
// SIEMPRE va CON IVA; genera_credito_fiscal marca si el IVA es recuperable. SOLO Mallorca.
// Credenciales (email+clave) en ~/nexus/credenciales.json → goautos.

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'
import { leerCav, guardarCav, contarCav } from './cav-store.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Supabase de GoAutos (URL + anon key son públicas, vienen del bundle del cliente).
const SUPA = 'https://miuiujntdjrjhhcysiba.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdWl1am50ZGpyamhoY3lzaWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwODEzNjcsImV4cCI6MjA1MDY1NzM2N30.CqgUmrnmGSLDc6tg2aCHdD7tB-q9YL2utHPzXSIo6gI'

function creds() {
  const ruta = join(__dirname, '..', 'credenciales.json')
  const g = (JSON.parse(readFileSync(ruta, 'utf8')).goautos) || {}
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

async function rest(path, { count = false } = {}) {
  const jwt = await token()
  const headers = { apikey: ANON, Authorization: 'Bearer ' + jwt }
  if (count) headers.Prefer = 'count=exact'
  const r = await fetch(`${SUPA}/rest/v1/${path}`, { headers })
  const total = (r.headers.get('content-range') || '').split('/')[1]
  const body = await r.json()
  return { ok: r.ok, status: r.status, total, body }
}

// Escritura (PATCH). `return=representation` devuelve la fila ya actualizada.
async function patch(path, payload) {
  const jwt = await token()
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: ANON, Authorization: 'Bearer ' + jwt,
      'Content-Type': 'application/json', Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })
  let body = null
  try { body = await r.json() } catch { body = null }
  return { ok: r.ok, status: r.status, body }
}

// Inserción (POST). `return=representation` devuelve la fila ya creada.
async function post(path, payload) {
  const jwt = await token()
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: ANON, Authorization: 'Bearer ' + jwt,
      'Content-Type': 'application/json', Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })
  let body = null
  try { body = await r.json() } catch { body = null }
  return { ok: r.ok, status: r.status, body }
}

// ⚠️ MallorcAutos = cliente 32 en GoAutos. El usuario (ramon@dropout.cl) es
// SUPER-ADMIN y vería las 60 automotoras del portal. Por exigencia del negocio,
// TODO se acota SIEMPRE a MallorcAutos con este filtro. No quitar.
const CLIENT_ID = 32
const SOLO_MALLORCA = `&client_id=eq.${CLIENT_ID}`

async function contar(filtro = '') {
  const r = await rest(`vehicles?select=id${SOLO_MALLORCA}${filtro}&limit=1`, { count: true })
  return Number(r.total || 0)
}

// ── VENDIDOS ────────────────────────────────────────────────────────────────
// "Vendido" NO se puede deducir de `status_id` (cada automotora usa su propio set
// de estados, con ids distintos) ni de `show_in_stock` (los vendidos quedan igual
// en true). La fuente de verdad es la tabla `vehicles_sales`: un auto está vendido
// si tiene una venta `approved` y NO revertida (`reverted_at` nulo).
// Devuelve el array de vehicle_id vendidos de MallorcAutos.
async function idsVendidos() {
  const r = await rest(
    'vehicles_sales?select=vehicle_id,veh:vehicles!vehicles_sales_vehicle_id_fkey!inner(client_id)' +
    `&veh.client_id=eq.${CLIENT_ID}&status=eq.approved&reverted_at=is.null`
  )
  const ids = (Array.isArray(r.body) ? r.body : []).map((x) => x.vehicle_id)
  return [...new Set(ids)]
}

// Filtro PostgREST para EXCLUIR los vehículos vendidos (vacío si no hay ninguno).
function filtroNoVendidos(vendidos) {
  return vendidos.length ? `&id=not.in.(${vendidos.join(',')})` : ''
}

// En MallorcAutos `is_published` no se usa (siempre null); el estado real de
// inventario es `show_in_stock` (true=está en stock/publicado) y `stock_type`.
const SELECT_VEH = 'id,year,price,discount_percentage,mileage,show_in_stock,stock_type,status_id,views,created_at,main_image,gallery,transmission,traction,owners,license_plate,version_name,condition_id,category_id,version_id,engine_number,chassis_number,keys,min_price,has_lien,is_consigned,iva_exento,is_billable,transfer_value,tech_inspection_expiry,circulation_permit_expiry,emissions_expiry,municipality_permit_expiry,permit_municipality,video_url,label,brands(name),models(name),fuel_types(name),colors(name)'
const TRANSMISION = { automatic: 'Automática', manual: 'Mecánica', cvt: 'CVT', dct: 'Doble embrague' }

// Catálogo de ESTADOS por automotora (clients_vehicles_states). Cada auto tiene
// status_id que apunta acá (Chillan, Revisión Mecánica, Preparación, Listo para la
// foto, Publicado, Reservado, Vendido, Archivado…). Se carga una vez.
let CAT_ESTADOS = {}        // id -> nombre
let CAT_ESTADOS_LISTA = []  // [{id, nombre, orden}]
async function cargarEstados() {
  if (CAT_ESTADOS_LISTA.length) return CAT_ESTADOS_LISTA
  const r = await rest(`clients_vehicles_states?select=id,name,order&client_id=eq.${CLIENT_ID}&order=order`)
  CAT_ESTADOS_LISTA = (Array.isArray(r.body) ? r.body : []).map((s) => ({ id: s.id, nombre: s.name, orden: s.order }))
  for (const s of CAT_ESTADOS_LISTA) CAT_ESTADOS[s.id] = s.nombre
  return CAT_ESTADOS_LISTA
}
// Resuelve un estado por nombre (fuzzy, sin tildes/mayúsculas) o por id.
function resolverEstado(txt) {
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const q = norm(txt)
  if (!q) return null
  if (/^\d+$/.test(q)) return CAT_ESTADOS_LISTA.find((s) => String(s.id) === q) || null
  return CAT_ESTADOS_LISTA.find((s) => norm(s.nombre) === q)
    || CAT_ESTADOS_LISTA.find((s) => norm(s.nombre).includes(q) || q.includes(norm(s.nombre))) || null
}
// Catálogo de SUCURSALES (dealerships) de MallorcAutos. Se carga una vez.
let CAT_SUCURSALES = []  // [{id, nombre, direccion}]
async function cargarSucursales() {
  if (CAT_SUCURSALES.length) return CAT_SUCURSALES
  const r = await rest(`dealerships?select=id,name,address&client_id=eq.${CLIENT_ID}&order=id`)
  CAT_SUCURSALES = (Array.isArray(r.body) ? r.body : []).map((s) => ({ id: s.id, nombre: s.name, direccion: s.address }))
  return CAT_SUCURSALES
}

// ── EDICIÓN ───────────────────────────────────────────────────────────────────
// Mapa de campos "amigables" → columna real de `vehicles` + parser/validador.
// Solo lo que está acá se puede editar (whitelist). Nada toca otra automotora:
// el propio UPDATE va filtrado por client_id=32 (ver editarVehiculo()).
const _norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
const _num = (x) => { const n = Number(String(x).replace(/[^\d.-]/g, '')); if (!Number.isFinite(n)) throw new Error(`valor numérico inválido: ${x}`); return n }
const _bool = (x) => {
  const s = _norm(x)
  if (['true', '1', 'si', 'yes', 'y'].includes(s)) return true
  if (['false', '0', 'no', 'n'].includes(s)) return false
  throw new Error(`valor booleano inválido (usa si/no): ${x}`)
}
const _ubicacion = (x) => {
  const s = _norm(x).replace(/\s/g, '')
  if (['local', 'enlocal', 'dealership', 'sucursal', 'fisico'].includes(s)) return 'dealership'
  if (['online', 'web', 'enlinea', 'linea', 'internet'].includes(s)) return 'online'
  throw new Error(`ubicación inválida (usa: local | online): ${x}`)
}
const _transmision = (x) => {
  const s = _norm(x)
  const map = { automatica: 'automatic', automatico: 'automatic', auto: 'automatic', at: 'automatic', mecanica: 'manual', manual: 'manual', mt: 'manual', cvt: 'cvt', dct: 'dct', dobleembrague: 'dct' }
  const v = map[s.replace(/\s/g, '')] || (['automatic', 'manual', 'cvt', 'dct'].includes(s) ? s : null)
  if (!v) throw new Error(`transmisión inválida (automática/mecánica/cvt/dct): ${x}`)
  return v
}
// Fecha → ISO 8601 (timestamptz). Acepta "2026-08-31", "31/08/2026", "31-08-2026"
// y "08/2026" (mes/año → día 1). Sirve para los vencimientos de documentos.
const _fecha = (x) => {
  const s = String(x).trim()
  let m
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}T00:00:00+00:00`
  if ((m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/))) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}T00:00:00+00:00`
  if ((m = s.match(/^(\d{1,2})[/\-](\d{4})$/))) return `${m[2]}-${String(m[1]).padStart(2, '0')}-01T00:00:00+00:00`
  throw new Error(`fecha inválida (usa dd/mm/aaaa o aaaa-mm-dd): ${x}`)
}
// status_id se resuelve por nombre/id con resolverEstado() ya existente.
// dealership_id se valida contra el catálogo de sucursales.
async function _sucursalId(x) {
  await cargarSucursales()
  const q = _norm(x)
  if (/^\d+$/.test(q)) { const s = CAT_SUCURSALES.find((s) => String(s.id) === q); if (s) return s.id }
  const s = CAT_SUCURSALES.find((s) => _norm(s.nombre) === q) || CAT_SUCURSALES.find((s) => _norm(s.nombre).includes(q))
  if (!s) throw new Error(`sucursal no reconocida: ${x}. Válidas: ${CAT_SUCURSALES.map((s) => `${s.nombre}(${s.id})`).join(', ')}`)
  return s.id
}

// flag CLI (--xxx) → { col, parse }. parse puede ser async.
const EDITABLES = {
  estado: { col: 'status_id', parse: (x) => { const e = resolverEstado(x); if (!e) throw new Error(`estado no reconocido: ${x}. Válidos: ${CAT_ESTADOS_LISTA.map((s) => s.nombre).join(', ')}`); return e.id }, esEstado: true },
  ubicacion: { col: 'stock_type', parse: _ubicacion },
  stock_type: { col: 'stock_type', parse: _ubicacion },
  sucursal: { col: 'dealership_id', parse: _sucursalId },
  precio: { col: 'price', parse: _num },
  precio_min: { col: 'min_price', parse: _num },
  descuento: { col: 'discount_percentage', parse: _num },
  km: { col: 'mileage', parse: _num },
  anio: { col: 'year', parse: _num },
  duenos: { col: 'owners', parse: _num },
  patente: { col: 'license_plate', parse: (x) => String(x).toUpperCase().trim() },
  transmision: { col: 'transmission', parse: _transmision },
  traccion: { col: 'traction', parse: (x) => String(x).trim() },
  version: { col: 'version_name', parse: (x) => String(x).trim() },
  descripcion: { col: 'description', parse: (x) => String(x) },
  en_stock: { col: 'show_in_stock', parse: _bool },
  publicado: { col: 'is_published', parse: _bool },
  video: { col: 'video_url', parse: (x) => String(x).trim() },
  // — Ficha completa (identidad, legal, documentos) —
  condicion: { col: 'condition_id', parse: (x) => resolverCondicion(x).then((id) => { if (id == null) throw new Error(`condición inválida (nuevo/usado/semi-nuevo): ${x}`); return id }) },
  tipo: { col: 'category_id', parse: (x) => resolverCategoria(x).then((id) => { if (id == null) throw new Error(`tipo/carrocería no reconocido: ${x}`); return id }) },
  carroceria: { col: 'category_id', parse: (x) => resolverCategoria(x).then((id) => { if (id == null) throw new Error(`tipo/carrocería no reconocido: ${x}`); return id }) },
  motor: { col: 'engine_number', parse: (x) => String(x).trim() },
  chasis: { col: 'chassis_number', parse: (x) => String(x).trim() },
  vin: { col: 'chassis_number', parse: (x) => String(x).trim() },
  llaves: { col: 'keys', parse: _num },
  consignado: { col: 'is_consigned', parse: _bool },
  prenda: { col: 'has_lien', parse: _bool },
  iva_exento: { col: 'iva_exento', parse: _bool },
  facturable: { col: 'is_billable', parse: _bool },
  transferencia: { col: 'transfer_value', parse: _num },
  rev_tecnica: { col: 'tech_inspection_expiry', parse: _fecha },
  permiso_circulacion: { col: 'circulation_permit_expiry', parse: _fecha },
  gases: { col: 'emissions_expiry', parse: _fecha },
  emisiones: { col: 'emissions_expiry', parse: _fecha },
  permiso_municipal: { col: 'municipality_permit_expiry', parse: _fecha },
  comuna_permiso: { col: 'permit_municipality', parse: (x) => String(x).trim() },
  etiqueta: { col: 'label', parse: (x) => String(x).trim() },
}

// Aplica una edición a UN vehículo, garantizando que sea de MallorcAutos.
// `cambios` = objeto { flagAmigable: valorCrudo }. Devuelve {ok, antes, despues, error}.
async function editarVehiculo(id, cambios) {
  id = _num(id)
  // 1) Verificar que el auto exista y sea de MallorcAutos (client 32) ANTES de tocar.
  const pre = await rest(`vehicles?select=${SELECT_VEH},client_id${SOLO_MALLORCA}&id=eq.${id}&limit=1`)
  const actual = Array.isArray(pre.body) ? pre.body[0] : null
  if (!actual) return { ok: false, error: `Vehículo ${id} no existe o NO pertenece a MallorcAutos (client ${CLIENT_ID}). No se edita nada.` }
  // 2) Construir payload validando cada campo contra la whitelist.
  const payload = {}
  const aplicados = {}
  for (const [flag, valor] of Object.entries(cambios)) {
    const spec = EDITABLES[flag]
    if (!spec) return { ok: false, error: `Campo no editable: "${flag}". Editables: ${Object.keys(EDITABLES).join(', ')}` }
    const val = await spec.parse(valor)
    payload[spec.col] = val
    aplicados[flag] = val
    if (spec.esEstado) payload.state_updated_at = new Date().toISOString()
  }
  if (!Object.keys(payload).length) return { ok: false, error: 'No se indicó ningún campo a cambiar.' }
  payload.updated_at = new Date().toISOString()
  // 3) UPDATE doblemente acotado: por id Y por client_id=32 (imposible tocar otra automotora).
  const up = await patch(`vehicles?id=eq.${id}${SOLO_MALLORCA}&select=${SELECT_VEH}`, payload)
  if (!up.ok) return { ok: false, error: `Falló el UPDATE (HTTP ${up.status}): ${JSON.stringify(up.body).slice(0, 200)}` }
  const despues = Array.isArray(up.body) ? up.body[0] : up.body
  if (!despues) return { ok: false, error: 'El UPDATE no afectó ninguna fila (el auto no es de MallorcAutos).' }
  return { ok: true, id, cambios_aplicados: aplicados, antes: fmtVeh(actual, true), despues: fmtVeh(despues, true) }
}

// Actualiza/registra la ADQUISICIÓN (precio de compra + datos del vendedor) de un
// auto EXISTENTE de MallorcAutos, escribiendo en vehicles_purchases — SIN navegador.
// Si ya hay registro de compra para el auto, lo ACTUALIZA; si no, lo crea.
// Datos del vendedor (nombre/RUT/teléfono/dirección) van en `notes` (mismo patrón
// que la creación, que guarda "Comprado a: X").
async function editarAdquisicion(id, d, dry = false) {
  id = _num(id)
  const pre = await rest(`vehicles?select=id,client_id${SOLO_MALLORCA}&id=eq.${id}&limit=1`)
  const veh = Array.isArray(pre.body) ? pre.body[0] : null
  if (!veh) return { ok: false, error: `Vehículo ${id} no existe o NO pertenece a MallorcAutos (client ${CLIENT_ID}). No se toca nada.` }
  const precio = _num(d.precio_compra ?? d.precio_adquisicion ?? d.precio)

  // VENDEDOR → se CREA/encuentra como `customer` (mismo formato que la venta:
  // resolverCliente) y se linkea por customer_id. NO va en notas.
  let vendedor = null, vendedorCreado = false, vendedorPreview = null
  const esEmpresa = !!d.empresa
  const hayVendedor = d.proveedor || d.proveedor_nombre || d.proveedor_rut || d.empresa
  if (hayVendedor) {
    let nombre = d.proveedor_nombre, apellido = d.proveedor_apellido
    if (!esEmpresa && !nombre && !apellido && d.proveedor) {
      // Parte el nombre completo en nombre + apellido (chileno: 2 apellidos al final).
      const ws = String(d.proveedor).trim().split(/\s+/).filter(Boolean)
      if (ws.length >= 4) { nombre = ws.slice(0, ws.length - 2).join(' '); apellido = ws.slice(-2).join(' ') }
      else if (ws.length === 3) { nombre = ws[0]; apellido = ws.slice(1).join(' ') }
      else if (ws.length === 2) { nombre = ws[0]; apellido = ws[1] }
      else { nombre = ws[0] || ''; apellido = '.' }   // 1 palabra → apellido placeholder
    }
    const res = await resolverCliente({
      rut: d.proveedor_rut, empresa: d.empresa, nombre, apellido,
      telefono: d.proveedor_fono, direccion: d.proveedor_dir, email: d.proveedor_email,
    }, dry)
    vendedor = res.cliente
    vendedorCreado = res.creado
    vendedorPreview = res.cliente_a_crear || null
  }

  const campos = {}
  if (precio != null && !Number.isNaN(precio)) campos.purchase_price = precio
  if (vendedor) { campos.customer_id = vendedor.id; campos.notes = null }   // vendedor va en customer_id, NO en nota
  if (precio == null && !hayVendedor) return { ok: false, error: 'No indicaste precio de compra ni datos del vendedor.' }

  const ex = await rest(`vehicles_purchases?select=id,customer_id&vehicle_id=eq.${id}&order=id.desc&limit=1`)
  const existente = Array.isArray(ex.body) ? ex.body[0] : null

  if (dry) {
    return { ok: true, simulado: true, id, accion: existente ? 'actualizaría' : 'registraría',
      precio_compra: campos.purchase_price ?? null,
      vendedor: vendedor ? { id: vendedor.id, ya_existe: true } : (vendedorPreview ? { se_crearia: vendedorPreview } : null) }
  }
  if (!Object.keys(campos).length) return { ok: false, error: 'Nada que guardar.' }
  let r
  if (existente) {
    r = await patch(`vehicles_purchases?id=eq.${existente.id}&select=id,purchase_price,customer_id`, { ...campos })
  } else {
    r = await post('vehicles_purchases?select=id,purchase_price,customer_id', { vehicle_id: id, purchase_date: new Date().toISOString(), status: 'completed', ...campos })
  }
  if (!r.ok) return { ok: false, error: `No se pudo guardar la adquisición (HTTP ${r.status}): ${JSON.stringify(r.body).slice(0, 180)}` }
  const fila = Array.isArray(r.body) ? r.body[0] : r.body
  return {
    ok: true, id, accion: existente ? 'actualizada' : 'registrada', adquisicion: fila,
    vendedor: vendedor ? { id: vendedor.id, nombre: [vendedor.first_name, vendedor.last_name].filter(Boolean).join(' ') || vendedor.company_name, rut: vendedor.rut, creado: vendedorCreado } : null,
  }
}

// ── CLIENTES (customers) — ver / crear / editar, SOLO MallorcAutos ────────────
const CLIENTE_COLS = { nombre: 'first_name', apellido: 'last_name', empresa: 'company_name', rut: 'rut', email: 'email', telefono: 'phone', direccion: 'address' }
async function gestionarCliente(accion, d, dry = false) {
  accion = _norm(accion || 'buscar')
  if (accion === 'crear' || accion === 'agregar') {
    const esEmpresa = !!d.empresa
    const res = await resolverCliente({ rut: d.rut, email: d.email, empresa: d.empresa, nombre: d.nombre, apellido: d.apellido, telefono: d.telefono, direccion: d.direccion, tipo_cliente: esEmpresa ? 'company' : 'person' }, dry)
    if (dry) return { ok: true, simulado: true, ...(res.cliente ? { ya_existe: res.cliente } : { se_crearia: res.cliente_a_crear }) }
    return { ok: true, accion: res.creado ? 'creado' : 'ya_existia', cliente: res.cliente }
  }
  if (accion === 'editar' || accion === 'actualizar') {
    let id = _num(d.id)
    if (!id && d.rut) { const r = await rest(`customers?select=id&client_id=eq.${CLIENT_ID}&rut=eq.${encodeURIComponent(String(d.rut).trim())}&limit=1`); id = (Array.isArray(r.body) ? r.body[0] : null)?.id }
    if (!id) return { ok: false, error: 'Falta id o rut del cliente a editar.' }
    const payload = {}
    for (const [k, col] of Object.entries(CLIENTE_COLS)) if (d[k] != null && d[k] !== '') payload[col] = String(d[k]).trim()
    if (!Object.keys(payload).length) return { ok: false, error: 'No indicaste qué cambiar del cliente.' }
    payload.updated_at = new Date().toISOString()
    if (dry) return { ok: true, simulado: true, id, cambios: payload }
    const r = await patch(`customers?id=eq.${id}&client_id=eq.${CLIENT_ID}&select=*`, payload)
    if (!r.ok) return { ok: false, error: `No se pudo editar el cliente (HTTP ${r.status}): ${JSON.stringify(r.body).slice(0, 160)}` }
    const c = Array.isArray(r.body) ? r.body[0] : r.body
    if (!c) return { ok: false, error: 'El cliente no existe o no es de MallorcAutos.' }
    return { ok: true, accion: 'editado', cliente: c }
  }
  // buscar (por defecto)
  let q = `customers?select=id,first_name,last_name,company_name,rut,phone,email,address,customer_type&client_id=eq.${CLIENT_ID}`
  if (d.id) q += `&id=eq.${_num(d.id)}`
  else if (d.rut) q += `&rut=eq.${encodeURIComponent(String(d.rut).trim())}`
  else if (d.texto || d.nombre) { const tx = encodeURIComponent('*' + String(d.texto || d.nombre).trim() + '*'); q += `&or=(first_name.ilike.${tx},last_name.ilike.${tx},company_name.ilike.${tx})` }
  q += '&order=id.desc&limit=20'
  const r = await rest(q)
  return { ok: true, clientes: Array.isArray(r.body) ? r.body : [] }
}

// ── EDITAR una VENTA (nota de venta) existente, SOLO MallorcAutos ─────────────
const VENTA_COLS = {
  precio: { col: 'sale_price', n: true }, estado: { col: 'status' }, pago: { col: 'payment_method' },
  fecha: { col: 'sale_date', fecha: true }, cliente_id: { col: 'customer_id', n: true },
  comision: { col: 'commission_amount', n: true }, comision_pct: { col: 'commission_percentage', n: true },
  financiera: { col: 'financiera' }, transferencia: { col: 'transfer_value', n: true }, notas: { col: 'approval_notes' },
}
async function editarVenta(id, cambios) {
  id = _num(id)
  // Verificar que la venta sea de un auto de MallorcAutos ANTES de tocar.
  const pre = await rest(`vehicles_sales?select=id,vehicle_id,veh:vehicles!vehicles_sales_vehicle_id_fkey!inner(client_id)&id=eq.${id}&veh.client_id=eq.${CLIENT_ID}&limit=1`)
  const venta = Array.isArray(pre.body) ? pre.body[0] : null
  if (!venta) return { ok: false, error: `Venta ${id} no existe o NO es de MallorcAutos. No se toca nada.` }
  const payload = {}
  for (const [k, spec] of Object.entries(VENTA_COLS)) {
    if (cambios[k] == null || cambios[k] === '') continue
    payload[spec.col] = spec.n ? _num(cambios[k]) : (spec.fecha ? _fechaVenta(cambios[k]) : String(cambios[k]))
  }
  if (!Object.keys(payload).length) return { ok: false, error: `No indicaste qué cambiar de la venta. Editables: ${Object.keys(VENTA_COLS).join(', ')}` }
  payload.updated_at = new Date().toISOString()
  const r = await patch(`vehicles_sales?id=eq.${id}&select=*`, payload)
  if (!r.ok) return { ok: false, error: `No se pudo editar la venta (HTTP ${r.status}): ${JSON.stringify(r.body).slice(0, 160)}` }
  return { ok: true, accion: 'editada', venta: Array.isArray(r.body) ? r.body[0] : r.body }
}

// ── CREACIÓN (subir un auto NUEVO) ────────────────────────────────────────────
// Igual que la edición, TODO se crea SIEMPRE bajo MallorcAutos (client_id=32).
// Resuelve marca por nombre → slug (brand_id es texto, ej "toyota").
async function resolverMarca(nombre) {
  if (!nombre) return null
  const q = _norm(nombre)
  const r = await rest(`brands?select=id,name&or=(id.eq.${encodeURIComponent(q)},name.ilike.${encodeURIComponent('*' + nombre + '*')})&limit=20`)
  const a = Array.isArray(r.body) ? r.body : []
  if (!a.length) return null
  return (a.find((b) => _norm(b.name) === q || _norm(b.id) === q) || a[0]).id
}
// Resuelve modelo dentro de una marca → {id, name} | null (exacto, si no el primero).
async function resolverModelo(nombre, brandSlug) {
  if (!nombre) return null
  const q = _norm(nombre)
  const r = await rest(`models?select=id,name&brand_id=eq.${encodeURIComponent(brandSlug)}&name=ilike.${encodeURIComponent('*' + nombre + '*')}&order=name&limit=30`)
  const a = Array.isArray(r.body) ? r.body : []
  if (!a.length) return null
  return a.find((m) => _norm(m.name) === q) || a[0]
}
async function resolverColor(nombre) {
  if (!nombre) return null
  const r = await rest(`colors?select=id,name&name=ilike.${encodeURIComponent('*' + nombre + '*')}&limit=8`)
  const a = Array.isArray(r.body) ? r.body : []
  return (a.find((c) => _norm(c.name) === _norm(nombre)) || a[0])?.id ?? null
}
async function resolverCombustible(nombre) {
  if (!nombre) return null
  const q = _norm(nombre)
  const r = await rest('fuel_types?select=id,name')
  const a = Array.isArray(r.body) ? r.body : []
  return (a.find((c) => _norm(c.name) === q || _norm(c.name).includes(q) || q.includes(_norm(c.name))))?.id ?? null
}
// Condición: nuevo / usado / semi-nuevo (tabla `conditions`: nuevo=1, semi-nuevo=2, usado=3).
async function resolverCondicion(nombre) {
  if (!nombre) return null
  const q = _norm(nombre).replace(/\s|-/g, '')
  const map = { nuevo: 1, '0km': 1, cerokm: 1, usado: 3, seminuevo: 2 }
  if (map[q] != null) return map[q]
  const r = await rest('conditions?select=id,name')
  const a = Array.isArray(r.body) ? r.body : []
  return (a.find((c) => _norm(c.name).replace(/\s|-/g, '') === q || _norm(c.name).includes(_norm(nombre))))?.id ?? null
}
// Tipo / carrocería (tabla `categories`: Suv, Sedan, Hatchback, Pickup, Camioneta, Coupé, Van…).
let CAT_CATEGORIAS = []  // [{id, name}]
async function cargarCategorias() {
  if (!CAT_CATEGORIAS.length) { const r = await rest('categories?select=id,name&order=name'); CAT_CATEGORIAS = Array.isArray(r.body) ? r.body : [] }
  return CAT_CATEGORIAS
}
async function resolverCategoria(nombre) {
  if (!nombre) return null
  await cargarCategorias()
  const q = _norm(nombre)
  const syn = { camioneta: 'pickup', '4x4': 'pickup', jeep: 'suv', todoterreno: 'suv', auto: 'sedan', deportivo: 'coupé', furgon: 'van' }
  const qq = syn[q] || q
  return (CAT_CATEGORIAS.find((c) => _norm(c.name) === qq)
    || CAT_CATEGORIAS.find((c) => _norm(c.name).includes(qq) || qq.includes(_norm(c.name))))?.id ?? null
}
// Catálogo de condiciones (id → nombre) para enriquecer la ficha al mostrarla.
let CAT_COND = {}
async function cargarCondiciones() {
  if (Object.keys(CAT_COND).length) return CAT_COND
  const r = await rest('conditions?select=id,name')
  for (const c of (Array.isArray(r.body) ? r.body : [])) CAT_COND[c.id] = c.name
  return CAT_COND
}
// Versión dentro de un modelo → {id, name} (la columna version_id apunta a `versions`).
async function resolverVersionId(nombre, modelId) {
  if (!nombre || !modelId) return null
  const q = _norm(nombre)
  const r = await rest(`versions?select=id,name&model_id=eq.${modelId}&order=name&limit=300`)
  const a = Array.isArray(r.body) ? r.body : []
  if (!a.length) return null
  return a.find((v) => _norm(v.name) === q) || a.find((v) => _norm(v.name).includes(q) || q.includes(_norm(v.name))) || null
}

// Sube una foto/documento local al bucket público `vehicle-images` y devuelve su URL pública.
async function subirFoto(ruta) {
  const buf = readFileSync(ruta)
  const ext = (String(ruta).split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'pdf' ? 'application/pdf' : 'image/jpeg'
  const key = `main/${globalThis.crypto.randomUUID()}.${ext}`
  const jwt = await token()
  const r = await fetch(`${SUPA}/storage/v1/object/vehicle-images/${key}`, {
    method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + jwt, 'Content-Type': mime }, body: buf,
  })
  if (!r.ok) throw new Error(`subida de foto falló (HTTP ${r.status}): ${(await r.text()).slice(0, 150)}`)
  return `${SUPA}/storage/v1/object/public/vehicle-images/${key}`
}

// Forma de adquisición → 'compra' | 'consignacion' | null.
const _adquisicion = (x) => {
  if (!x) return null
  const s = _norm(x).replace(/\s/g, '')
  if (['compra', 'comprado', 'comprada', 'propio', 'propia', 'adquirido', 'comprar'].includes(s)) return 'compra'
  if (['consignacion', 'consignado', 'consignada', 'consigna', 'enconsignacion'].includes(s)) return 'consignacion'
  return null
}
// Campos OBLIGATORIOS de documentos según la config del cliente en GoAutos
// (clients.required_vehicle_fields). Para MallorcAutos: rev. técnica, permiso de
// circulación y gases son obligatorios. Se lee una vez.
let REQ_FIELDS = null
async function cargarReqFields() {
  if (REQ_FIELDS) return REQ_FIELDS
  const r = await rest(`clients?select=required_vehicle_fields&id=eq.${CLIENT_ID}&limit=1`)
  const row = Array.isArray(r.body) ? r.body[0] : null
  REQ_FIELDS = (row && row.required_vehicle_fields) || {}
  return REQ_FIELDS
}

// Crea UN vehículo en MallorcAutos. `d` = datos amigables. Devuelve {ok, creado, ...}.
// Exige los MISMOS campos obligatorios que GoAutos pide para publicar (incluye
// kilometraje, combustible, tipo, color, condición y los documentos que el cliente
// marque obligatorios) Y la forma de adquisición (compra o consignación) con su
// precio: así ningún auto entra sin costo registrado (ni como compra ni consignado).
async function crearVehiculo(d) {
  if (!d.marca) return { ok: false, error: 'Falta la MARCA del auto.' }
  if (!d.modelo) return { ok: false, error: 'Falta el MODELO del auto.' }
  if (!d.anio) return { ok: false, error: 'Falta el AÑO del auto.' }
  const brandSlug = await resolverMarca(d.marca)
  if (!brandSlug) return { ok: false, error: `Marca no encontrada en GoAutos: "${d.marca}". Confírmame la marca.` }
  const mo = await resolverModelo(d.modelo, brandSlug)
  if (!mo) return { ok: false, error: `Modelo "${d.modelo}" no encontrado para ${d.marca}. Dime el modelo exacto como aparece en GoAutos.` }

  // ── OBLIGATORIOS para publicar (mismos que exige GoAutos) ──
  // Juntamos TODO lo que falte para pedirlo de una sola vez.
  const faltan = []
  const tipoTxt = d.tipo || d.carroceria
  if (d.km == null || d.km === '') faltan.push('kilometraje')
  if (!d.combustible) faltan.push('combustible (gasolina/diésel/híbrido/eléctrico)')
  if (!tipoTxt) faltan.push('tipo/carrocería (suv, sedán, pickup…)')
  if (!d.color) faltan.push('color')
  if (!d.condicion) faltan.push('condición (nuevo/usado/semi-nuevo)')
  const req = await cargarReqFields()
  if (req.tech_inspection_expiry && !d.rev_tecnica) faltan.push('vencimiento de la revisión técnica')
  if (req.circulation_permit_expiry && !d.permiso_circulacion) faltan.push('vencimiento del permiso de circulación')
  if (req.emissions_expiry && !d.gases) faltan.push('vencimiento de la revisión de gases')
  if (req.municipality_permit_expiry && !d.permiso_municipal) faltan.push('vencimiento del permiso municipal')
  // Adquisición: compra o consignación (con su precio) — para que el auto entre con costo.
  const adq = _adquisicion(d.adquisicion)
  const precioAdq = d.precio_compra ?? d.precio_consignacion ?? d.precio_adquisicion
  if (!adq) faltan.push('forma de adquisición: ¿el auto es COMPRADO o CONSIGNADO? (con su precio)')
  else if (precioAdq == null || precioAdq === '') faltan.push(adq === 'compra' ? 'precio de compra del auto' : 'precio acordado de la consignación')
  // Catálogos requeridos: si vienen pero no calzan en GoAutos, también es "falta".
  let fuelId = null, colorId = null, catId = null, condId = null
  if (d.combustible) { fuelId = await resolverCombustible(d.combustible); if (fuelId == null) faltan.push(`combustible no reconocido ("${d.combustible}")`) }
  if (d.color) { colorId = await resolverColor(d.color); if (colorId == null) faltan.push(`color no reconocido ("${d.color}")`) }
  if (tipoTxt) { catId = await resolverCategoria(tipoTxt); if (catId == null) faltan.push(`tipo/carrocería no reconocido ("${tipoTxt}")`) }
  if (d.condicion) { condId = await resolverCondicion(d.condicion); if (condId == null) faltan.push(`condición no reconocida ("${d.condicion}")`) }
  if (faltan.length) return { ok: false, error: `Faltan datos OBLIGATORIOS para publicar el auto en GoAutos: ${faltan.join('; ')}.`, faltan }

  // Estado inicial: Chillan (ingreso) por defecto; ubicación: en el local por defecto.
  let status_id = 1727
  if (d.estado) { const e = resolverEstado(d.estado); if (e) status_id = e.id }
  const stock_type = d.ubicacion ? _ubicacion(d.ubicacion) : 'dealership'
  const esConsignado = adq === 'consignacion'
  // Sube fotos (la 1ª = portada; todas van a la galería).
  const urls = []
  let fotosFallidas = 0
  for (const f of (d.fotos || [])) { try { urls.push(await subirFoto(f)) } catch { fotosFallidas++ } }
  const payload = {
    client_id: CLIENT_ID, brand_id: brandSlug, model_id: mo.id, year: _num(d.anio),
    status_id, stock_type, vehicle_type: 'car', dealership_id: 39,
    mileage: _num(d.km), fuel_type_id: fuelId, color_id: colorId, category_id: catId, condition_id: condId,
    is_consigned: esConsignado, is_online_consignment: false,
    show_in_stock: true, has_lien: false, is_billable: false,
    keys: 1, state_updated_at: new Date().toISOString(),
  }
  if (d.precio != null && d.precio !== '') payload.price = _num(d.precio)
  if (d.duenos != null && d.duenos !== '') payload.owners = _num(d.duenos)
  if (d.patente) payload.license_plate = String(d.patente).toUpperCase().trim()
  if (d.version) { payload.version_name = String(d.version).trim(); const ver = await resolverVersionId(d.version, mo.id); if (ver) payload.version_id = ver.id }
  if (d.descripcion) payload.description = String(d.descripcion)
  if (d.transmision) payload.transmission = _transmision(d.transmision)
  if (d.traccion) payload.traction = String(d.traccion).trim()
  if (d.motor) payload.engine_number = String(d.motor).trim()
  if (d.chasis) payload.chassis_number = String(d.chasis).trim()
  if (d.llaves != null && d.llaves !== '') payload.keys = _num(d.llaves)
  if (d.precio_min != null && d.precio_min !== '') payload.min_price = _num(d.precio_min)
  if (d.descuento != null && d.descuento !== '') payload.discount_percentage = _num(d.descuento)
  if (d.transferencia != null && d.transferencia !== '') payload.transfer_value = _num(d.transferencia)
  if (d.prenda != null && d.prenda !== '') payload.has_lien = _bool(d.prenda)
  if (d.iva_exento != null && d.iva_exento !== '') payload.iva_exento = _bool(d.iva_exento)
  if (d.facturable != null && d.facturable !== '') payload.is_billable = _bool(d.facturable)
  if (d.rev_tecnica) payload.tech_inspection_expiry = _fecha(d.rev_tecnica)
  if (d.permiso_circulacion) payload.circulation_permit_expiry = _fecha(d.permiso_circulacion)
  if (d.gases) payload.emissions_expiry = _fecha(d.gases)
  if (d.permiso_municipal) payload.municipality_permit_expiry = _fecha(d.permiso_municipal)
  if (d.comuna_permiso) payload.permit_municipality = String(d.comuna_permiso).trim()
  if (d.etiqueta) payload.label = String(d.etiqueta).trim()
  if (urls.length) { payload.main_image = urls[0]; payload.gallery = urls }
  const jwt = await token()
  const r = await fetch(`${SUPA}/rest/v1/vehicles?select=${SELECT_VEH}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: 'Bearer ' + jwt, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  })
  let body = null; try { body = await r.json() } catch { body = null }
  if (!r.ok) return { ok: false, error: `INSERT falló (HTTP ${r.status}): ${JSON.stringify(body).slice(0, 220)}` }
  const veh = Array.isArray(body) ? body[0] : body
  // ── ADQUISICIÓN: registrar la compra o la consignación (deja el costo del auto) ──
  let adquisicion = null
  try {
    if (adq === 'compra') {
      const pp = { vehicle_id: veh.id, purchase_price: _num(precioAdq), purchase_date: d.fecha_compra ? _fechaVenta(d.fecha_compra) : new Date().toISOString(), status: 'completed', notes: d.proveedor ? `Comprado a: ${String(d.proveedor).trim()}` : null }
      const pr = await post('vehicles_purchases?select=id', pp)
      adquisicion = pr.ok ? { tipo: 'compra', precio: pp.purchase_price, id: (Array.isArray(pr.body) ? pr.body[0] : pr.body)?.id } : { tipo: 'compra', error: `no se pudo registrar la compra (HTTP ${pr.status}): ${JSON.stringify(pr.body).slice(0, 160)}` }
    } else {
      const cc = { vehicle_id: veh.id, agreed_price: _num(precioAdq), metodo_consignacion: 'precio_garantizado', consignment_date: d.fecha_compra ? _fechaVenta(d.fecha_compra) : new Date().toISOString(), notes: d.proveedor ? `Consignado por: ${String(d.proveedor).trim()}` : null }
      const cr = await post('vehicles_consignments?select=id', cc)
      adquisicion = cr.ok ? { tipo: 'consignacion', precio: cc.agreed_price, id: (Array.isArray(cr.body) ? cr.body[0] : cr.body)?.id } : { tipo: 'consignacion', error: `no se pudo registrar la consignación (HTTP ${cr.status}): ${JSON.stringify(cr.body).slice(0, 160)}` }
    }
  } catch (e) { adquisicion = { tipo: adq, error: e.message } }
  return {
    ok: true, creado: fmtVeh(veh, true), marca_usada: brandSlug, modelo_usado: mo.name,
    adquisicion,
    fotos_pedidas: (d.fotos || []).length, fotos_subidas: urls.length, fotos_fallidas: fotosFallidas,
    aviso_foto: (d.fotos || []).length && !urls.length ? 'OJO: el auto se creó SIN foto (falló la subida). Avísale al usuario que la foto no quedó.' : undefined,
  }
}

// ── NOTA DE VENTA (registrar la venta de un auto) ─────────────────────────────
// Replica el flujo del admin de GoAutos (registerVehicleSale): crea el DOCUMENTO
// de venta (vehicles_documents type='sale'), la VENTA (vehicles_sales, aprobada
// porque la registra el admin) y marca el auto como "Vendido". SOLO MallorcAutos:
// se valida client_id=32 sobre el vehículo antes de escribir nada.
//
// Métodos de pago válidos en el portal: cash, tarjeta, transfer, check, credit,
// financing, mixed. Mapeamos sinónimos en español.
const _pago = (x) => {
  if (!x) return 'cash'
  const s = _norm(x).replace(/\s/g, '')
  const map = {
    efectivo: 'cash', cash: 'cash', contado: 'cash',
    tarjeta: 'tarjeta', debito: 'tarjeta',
    credito: 'credit', credit: 'credit',
    transferencia: 'transfer', transfer: 'transfer', transferencia_bancaria: 'transfer',
    cheque: 'check', check: 'check',
    financiamiento: 'financing', financiado: 'financing', financing: 'financing',
    mixto: 'mixed', mixed: 'mixed',
  }
  return map[s] || s
}
// Fecha de venta → ISO fijando las 12:00 LOCAL (igual que buildSaleDateISO del
// admin), para que una fecha "dd/mm/aaaa" no salte de día al pasar a UTC.
const _fechaVenta = (x) => {
  const ymd = _fecha(x).slice(0, 10)   // _fecha valida y normaliza a aaaa-mm-dd
  return new Date(`${ymd}T12:00:00`).toISOString()
}
// "Abono 1:545000, Pie:100000" → [{title, amount}] (desglose de pago, opcional).
function parseAbonos(x) {
  if (!x) return []
  return String(x).split(',').map((p) => p.trim()).filter(Boolean).map((p, i) => {
    const idx = p.lastIndexOf(':')
    const title = idx >= 0 ? p.slice(0, idx).trim() : `Pago ${i + 1}`
    const amount = _num(idx >= 0 ? p.slice(idx + 1) : p)
    return { title, amount }
  })
}

// Encuentra (o crea) al COMPRADOR en MallorcAutos. Acepta: cliente_id | rut |
// email para buscar; nombre+apellido (persona) o empresa para crear. El cliente
// es OPCIONAL: una venta sin comprador es válida (mov. interno/stock propio).
// Con `dry=true` busca pero NO crea (devuelve pendiente:true si habría que crear).
async function resolverCliente(d, dry = false) {
  if (d.cliente_id) {
    const r = await rest(`customers?select=*&id=eq.${_num(d.cliente_id)}&client_id=eq.${CLIENT_ID}&limit=1`)
    const c = Array.isArray(r.body) ? r.body[0] : null
    if (!c) throw new Error(`Cliente ${d.cliente_id} no existe en MallorcAutos.`)
    return { cliente: c, creado: false }
  }
  const rut = d.rut ? String(d.rut).trim() : null
  const email = d.email ? String(d.email).trim().toLowerCase() : null
  // Buscar por rut o email entre los clientes de MallorcAutos.
  if (rut || email) {
    const ors = []
    if (rut) ors.push(`rut.eq.${encodeURIComponent(rut)}`)
    if (email) ors.push(`email.eq.${encodeURIComponent(email)}`)
    const r = await rest(`customers?select=*&client_id=eq.${CLIENT_ID}&or=(${ors.join(',')})&limit=1`)
    const c = Array.isArray(r.body) ? r.body[0] : null
    if (c) return { cliente: c, creado: false }
  }
  // No se encontró. ¿Hay datos para crear uno nuevo?
  const esEmpresa = !!d.empresa || ['company', 'empresa'].includes(_norm(d.tipo_cliente))
  const hayDatos = d.nombre || d.apellido || d.empresa || rut || email
  if (!hayDatos) return { cliente: null, creado: false }   // venta sin comprador
  if (esEmpresa) {
    if (!d.empresa) throw new Error('Para crear un cliente EMPRESA falta el nombre (--empresa).')
  } else if (!d.nombre || !d.apellido) {
    throw new Error('No encontré al cliente. Para crearlo necesito nombre y apellido (--nombre, --apellido) o el --cliente_id.')
  }
  const payload = {
    client_id: CLIENT_ID,
    customer_type: esEmpresa ? 'company' : 'person',
    first_name: d.nombre ? String(d.nombre).trim() : null,
    last_name: d.apellido ? String(d.apellido).trim() : null,
    company_name: d.empresa ? String(d.empresa).trim() : null,
    email, phone: d.telefono ? String(d.telefono).trim() : null,
    rut, address: d.direccion ? String(d.direccion).trim() : null,
  }
  if (dry) return { cliente: null, creado: false, pendiente: true, cliente_a_crear: payload }
  const r = await post('customers?select=*', payload)
  if (!r.ok) throw new Error(`No se pudo crear el cliente (HTTP ${r.status}): ${JSON.stringify(r.body).slice(0, 180)}`)
  return { cliente: Array.isArray(r.body) ? r.body[0] : r.body, creado: true }
}

// Registra la venta (nota de venta) de UN auto de MallorcAutos. `d` = datos
// amigables. Devuelve {ok, venta_id, documento_id, ...}. NO crea trade-in (parte
// de pago) ni comisiones: eso se gestiona aparte en GoAutos.
async function crearNotaVenta(d, dry = false) {
  // 1) El auto debe existir y ser de MallorcAutos ANTES de tocar nada.
  const id = _num(d.id)
  const pre = await rest(`vehicles?select=${SELECT_VEH},client_id${SOLO_MALLORCA}&id=eq.${id}&limit=1`)
  const veh = Array.isArray(pre.body) ? pre.body[0] : null
  if (!veh) return { ok: false, error: `Vehículo ${id} no existe o NO pertenece a MallorcAutos (client ${CLIENT_ID}). No se registra venta.` }
  // 2) Precio de venta obligatorio y > 0.
  const precio = _num(d.precio)
  if (!precio || precio <= 0) return { ok: false, error: 'El precio de venta debe ser mayor a 0 (--precio).' }
  // 3) Un auto no puede tener dos ventas (vehicle_id es UNIQUE en vehicles_sales).
  const ex = await rest(`vehicles_sales?select=id,status,sale_price,sale_date&vehicle_id=eq.${id}&limit=1`)
  const exV = Array.isArray(ex.body) ? ex.body[0] : null
  if (exV) return { ok: false, error: `El auto ${id} YA tiene una venta registrada (venta ${exV.id}, estado "${exV.status}", $${exV.sale_price}). Para corregirla, edítala en GoAutos en vez de crear otra.` }
  // 4) Comprador (opcional): buscar o crear.
  const cli = await resolverCliente(d, dry)
  const customerId = cli.cliente ? cli.cliente.id : null
  // 5) Datos de la venta.
  const saleDate = d.fecha ? _fechaVenta(d.fecha) : new Date().toISOString()
  const abonos = parseAbonos(d.abonos)
  const ventaPayload = {
    vehicle_id: id, customer_id: customerId, sale_price: precio, sale_date: saleDate,
    payment_method: _pago(d.pago), seller_id: null, status: 'approved',
    commission_amount: 0, commission_percentage: 0, commission_status: null,
    has_trade_in: false, trade_in_vehicle_id: null, trade_in_value: 0,
    payment_breakdown: abonos.length ? JSON.stringify(abonos) : null,
    financiera: d.financiera ? String(d.financiera).trim() : null,
    financing_commission: null,
    transfer_value: (d.transferencia != null && d.transferencia !== '') ? _num(d.transferencia) : (veh.transfer_value ?? 0),
    transfer_value_charged: (d.transferencia_cobrada != null && d.transferencia_cobrada !== '') ? _bool(d.transferencia_cobrada) : true,
  }
  const estadoVendido = resolverEstado('vendido')
  // En modo simulación, no escribimos nada: devolvemos lo que haríamos.
  if (dry) {
    return {
      ok: true, simulacion: true,
      auto: fmtVeh(veh, true),
      cliente: cli.cliente ? { id: cli.cliente.id, nombre: [cli.cliente.first_name, cli.cliente.last_name].filter(Boolean).join(' ') || cli.cliente.company_name, rut: cli.cliente.rut } : (cli.pendiente ? { se_crearia: cli.cliente_a_crear } : null),
      documento_a_crear: { vehicle_id: id, type: 'sale', client_id: CLIENT_ID, customer_id: customerId, status: 'completed', notes: d.notas || null, document_date: saleDate },
      venta_a_crear: ventaPayload,
      auto_pasaria_a: estadoVendido ? estadoVendido.nombre : '(no se encontró estado Vendido)',
    }
  }
  // 6) DOCUMENTO de venta: reusar el existente (type='sale') o crear uno nuevo.
  let documentId
  const exDoc = await rest(`vehicles_documents?select=id&vehicle_id=eq.${id}&type=eq.sale&client_id=eq.${CLIENT_ID}&limit=1`)
  const exDocRow = Array.isArray(exDoc.body) ? exDoc.body[0] : null
  if (exDocRow) {
    await patch(`vehicles_documents?id=eq.${exDocRow.id}`, { customer_id: customerId, status: 'completed', notes: d.notas || null, updated_at: new Date().toISOString(), document_date: saleDate })
    documentId = exDocRow.id
  } else {
    const dr = await post('vehicles_documents?select=id', { vehicle_id: id, type: 'sale', client_id: CLIENT_ID, customer_id: customerId, status: 'completed', notes: d.notas || null, document_date: saleDate })
    if (!dr.ok) return { ok: false, error: `No se pudo crear el documento de venta (HTTP ${dr.status}): ${JSON.stringify(dr.body).slice(0, 200)}` }
    documentId = (Array.isArray(dr.body) ? dr.body[0] : dr.body).id
  }
  // 7) VENTA (vehicles_sales). Lleva el document_id recién resuelto.
  const sr = await post('vehicles_sales?select=id', { ...ventaPayload, document_id: documentId })
  if (!sr.ok) return { ok: false, error: `No se pudo crear la venta (HTTP ${sr.status}): ${JSON.stringify(sr.body).slice(0, 220)}` }
  const saleId = (Array.isArray(sr.body) ? sr.body[0] : sr.body).id
  // 8) Marcar el auto como "Vendido" (un trigger de la BD también lo hace al
  //    insertar una venta aprobada; lo dejamos explícito por si acaso, es idempotente).
  let estadoCambiado = false
  if (estadoVendido) {
    const up = await patch(`vehicles?id=eq.${id}${SOLO_MALLORCA}&select=id`, { status_id: estadoVendido.id, state_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    estadoCambiado = up.ok
  }
  // 9) Si había una reserva activa, marcarla como completada (igual que el admin).
  let reservaCompletada = false
  const resv = await rest(`vehicles_reservations?select=id&vehicle_id=eq.${id}&status=eq.active&limit=1`)
  const resvRow = Array.isArray(resv.body) ? resv.body[0] : null
  if (resvRow) { const ur = await patch(`vehicles_reservations?id=eq.${resvRow.id}`, { status: 'completed', updated_at: new Date().toISOString() }); reservaCompletada = ur.ok }
  // 10) Releer el auto para devolver la ficha ya en estado Vendido.
  const post_ = await rest(`vehicles?select=${SELECT_VEH}&id=eq.${id}&limit=1`)
  const vehPost = Array.isArray(post_.body) ? post_.body[0] : veh
  return {
    ok: true,
    venta_id: saleId,
    documento_id: documentId,
    estado_venta: 'approved',
    precio_venta: precio,
    fecha_venta: saleDate.slice(0, 10),
    metodo_pago: ventaPayload.payment_method,
    auto_marcado_vendido: estadoCambiado,
    reserva_completada: reservaCompletada,
    cliente: cli.cliente ? { id: cli.cliente.id, nombre: [cli.cliente.first_name, cli.cliente.last_name].filter(Boolean).join(' ') || cli.cliente.company_name, rut: cli.cliente.rut, creado: cli.creado } : null,
    auto: fmtVeh(vehPost, true),
  }
}

// ── GASTOS (agregar un gasto a un auto) ───────────────────────────────────────
// Replica el formulario de "gastos/transacciones" del auto en el admin de GoAutos
// (vehicles_extras type='expense'). El MONTO SIEMPRE va CON IVA incluido; el flag
// genera_credito_fiscal indica si la factura tiene IVA recuperable (entonces el
// sistema descuenta el IVA y carga el neto al costo). SOLO MallorcAutos: se valida
// client_id=32 sobre el vehículo antes de escribir.
const _asume = (x) => {
  const s = _norm(x).replace(/\s/g, '')
  if (['dealership', 'automotora', 'mallorca', 'nosotros', 'propio', 'empresa'].includes(s)) return 'dealership'
  if (['customer', 'cliente', 'comprador', 'consignador', 'dueno', 'dueño'].includes(s)) return 'customer'
  throw new Error(`"asume" inválido (usa: automotora | cliente): ${x}`)
}
// Categorías de gasto (tabla transaction_categories type='expense'): Publicidad,
// Combustible, Comision, Detailing/Limpieza, Documentacion, Estacionamiento,
// Impuestos, Inspeccion Tecnica, Mantenimiento, Neumaticos, Pintura, Reparaciones,
// Repuestos, Seguro, Transporte, Otros. Se cargan una vez.
let CAT_GASTOS = []  // [{id, label}]
async function cargarCategoriasGasto() {
  if (CAT_GASTOS.length) return CAT_GASTOS
  const r = await rest('transaction_categories?select=id,label_es&type=eq.expense&is_active=eq.true&order=sort_order')
  CAT_GASTOS = (Array.isArray(r.body) ? r.body : []).map((c) => ({ id: c.id, label: c.label_es }))
  return CAT_GASTOS
}
async function resolverCategoriaGasto(nombre) {
  if (!nombre) return null
  await cargarCategoriasGasto()
  const q = _norm(nombre).replace(/\s/g, '')
  if (/^\d+$/.test(q)) { const c = CAT_GASTOS.find((c) => String(c.id) === q); if (c) return c }
  const syn = {
    taller: 'reparaciones', mecanica: 'reparaciones', mecanico: 'reparaciones', arreglo: 'reparaciones',
    lavado: 'detailing/limpieza', limpieza: 'detailing/limpieza', detailing: 'detailing/limpieza', pulido: 'detailing/limpieza',
    bencina: 'combustible', petroleo: 'combustible', gasolina: 'combustible', diesel: 'combustible',
    revisiontecnica: 'inspeccion tecnica', revision: 'inspeccion tecnica', planta: 'inspeccion tecnica', gases: 'inspeccion tecnica',
    traspaso: 'documentacion', transferencia: 'documentacion', papeles: 'documentacion', notaria: 'documentacion',
    patente: 'impuestos', permiso: 'impuestos', permisocirculacion: 'impuestos',
    marketing: 'publicidad', aviso: 'publicidad', foto: 'publicidad',
    neumatico: 'neumaticos', ruedas: 'neumaticos', llantas: 'neumaticos',
    repuesto: 'repuestos', pieza: 'repuestos',
    mantencion: 'mantenimiento', servicio: 'mantenimiento',
    flete: 'transporte', grua: 'transporte', traslado: 'transporte',
  }
  const qq = syn[q] || _norm(nombre)
  return CAT_GASTOS.find((c) => _norm(c.label) === qq)
    || CAT_GASTOS.find((c) => _norm(c.label).includes(qq) || qq.includes(_norm(c.label)))
    || null
}

// Agrega UN gasto a un auto de MallorcAutos. `d` = datos amigables. El monto entra
// CON IVA. Devuelve {ok, gasto_id, ...}.
async function crearGasto(d, dry = false) {
  const id = _num(d.id)
  const pre = await rest(`vehicles?select=id,year,license_plate,client_id,brands(name),models(name)${SOLO_MALLORCA}&id=eq.${id}&limit=1`)
  const veh = Array.isArray(pre.body) ? pre.body[0] : null
  if (!veh) return { ok: false, error: `Vehículo ${id} no existe o NO pertenece a MallorcAutos (client ${CLIENT_ID}). No se agrega gasto.` }
  const titulo = (d.titulo ?? '').toString().trim()
  if (!titulo) return { ok: false, error: 'Falta el TÍTULO del gasto (--titulo), ej "Cambio de neumáticos".' }
  if (d.monto == null || d.monto === '') return { ok: false, error: 'Falta el MONTO del gasto (--monto), CON IVA incluido.' }
  const monto = _num(d.monto)
  if (!(monto > 0)) return { ok: false, error: 'El monto del gasto debe ser mayor a 0 (y CON IVA incluido).' }
  let categoryId = null, categoriaNombre = null
  if (d.categoria) {
    const c = await resolverCategoriaGasto(d.categoria)
    if (!c) { await cargarCategoriasGasto(); return { ok: false, error: `Categoría de gasto no reconocida: "${d.categoria}". Válidas: ${CAT_GASTOS.map((x) => x.label).join(', ')}` } }
    categoryId = c.id; categoriaNombre = c.label
  }
  const asume = d.asume ? _asume(d.asume) : 'dealership'
  const creditoFiscal = (d.credito_fiscal != null && d.credito_fiscal !== '') ? _bool(d.credito_fiscal) : false
  const auto = { id: veh.id, marca: veh.brands?.name || null, modelo: veh.models?.name || null, anio: veh.year, patente: veh.license_plate || null }
  // N° de factura: vehicles_extras no tiene columna propia → lo guardamos en la
  // descripción ("Factura N° X"). Solo aplica cuando el gasto es con factura.
  const nroFactura = d.nro_factura ? String(d.nro_factura).trim() : ''
  const descUsuario = d.descripcion ? String(d.descripcion).trim() : ''
  const descripcion = nroFactura
    ? (`Factura N° ${nroFactura}` + (descUsuario ? ` — ${descUsuario}` : ''))
    : descUsuario
  const payload = {
    vehicle_id: id, title: titulo, description: descripcion,
    type: 'expense', amount: monto, category_id: categoryId,
    assumed_by: asume, genera_credito_fiscal: creditoFiscal,
  }
  if (d.fecha) payload.created_at = _fechaVenta(d.fecha)   // gasto retroactivo (opcional)
  if (dry) {
    return { ok: true, simulacion: true, auto, gasto_a_crear: { ...payload, categoria: categoriaNombre, monto_con_iva: monto } }
  }
  const r = await post('vehicles_extras?select=*', payload)
  if (!r.ok) return { ok: false, error: `No se pudo agregar el gasto (HTTP ${r.status}): ${JSON.stringify(r.body).slice(0, 200)}` }
  const g = Array.isArray(r.body) ? r.body[0] : r.body
  return {
    ok: true, gasto_id: g.id, auto, titulo, monto: monto,
    con_factura: creditoFiscal, nro_factura: nroFactura || null,
    categoria: categoriaNombre, asume, genera_credito_fiscal: creditoFiscal,
    descripcion: payload.description || null,
  }
}

function fmtVeh(v, ext = false) {
  // `foto` = portada (URL pública directa de Supabase storage, bucket público
  // `vehicle-images`): se puede mandar tal cual a WhatsApp. Puede venir null.
  // NOTA: NO devolvemos la galería completa en los listados — son 15+ URLs por
  // auto y el Hub corta la salida a 16k chars (rompería el JSON). Para la foto
  // por auto basta la portada. (Galería completa: usar `gallery(id)` si se agrega.)
  const galeria = Array.isArray(v.gallery) ? v.gallery.filter(Boolean) : []
  const out = {
    id: v.id,
    marca: v.brands?.name || null,
    modelo: v.models?.name || null,
    anio: v.year,
    precio: v.price,
    km: v.mileage,
    en_stock: v.show_in_stock,
    tipo_stock: v.stock_type,
    vistas: v.views,
    creado: v.created_at,
    foto: v.main_image || galeria[0] || null,
    // Detalles para la ficha (caption de WhatsApp):
    version: v.version_name || null,
    transmision: v.transmission ? (TRANSMISION[v.transmission] || v.transmission) : null,
    traccion: v.traction || null,
    combustible: v.fuel_types?.name || null,
    color: v.colors?.name || null,
    duenos: v.owners ?? null,
    patente: v.license_plate || null,
    estado: CAT_ESTADOS[v.status_id] || null,   // Chillan / Publicado / Reservado / Vendido / etc.
    estado_id: v.status_id ?? null,
  }
  // Ficha COMPLETA (solo al crear/editar/ver un auto puntual; no en listados grandes).
  if (ext) {
    const soloFecha = (s) => (s ? String(s).slice(0, 10) : null)   // "2026-08-31"
    const cat = CAT_CATEGORIAS.find((c) => c.id === v.category_id)
    Object.assign(out, {
      tipo: cat ? cat.name : null,                 // carrocería: Suv / Sedan / Pickup…
      condicion: CAT_COND[v.condition_id] || null,  // nuevo / usado / semi-nuevo
      precio_min: v.min_price ?? null,
      descuento: v.discount_percentage ?? null,
      consignado: v.is_consigned === true,          // propio (false) vs consignado (true)
      iva_exento: v.iva_exento === true,
      facturable: v.is_billable === true,
      valor_transferencia: v.transfer_value ?? null,
      motor: v.engine_number || null,
      chasis: v.chassis_number || null,
      llaves: v.keys ?? null,
      prenda: v.has_lien === true,                  // gravamen/prenda
      rev_tecnica: soloFecha(v.tech_inspection_expiry),
      permiso_circulacion: soloFecha(v.circulation_permit_expiry),
      gases: soloFecha(v.emissions_expiry),
      permiso_municipal: soloFecha(v.municipality_permit_expiry),
      comuna_permiso: v.permit_municipality || null,
      video: v.video_url || null,
      etiqueta: v.label || null,
    })
  }
  return out
}

async function main() {
  let [cmd, ...rest_] = process.argv.slice(2)
  await cargarEstados().catch(() => {})   // catálogo de estados (id → nombre)
  // Alias: "publicados"/"publicado" = el ESTADO "Publicado" (status_id), NO el
  // comando 'publicaciones' (que es "disponibles en stock" e incluye autos en
  // Preparación/Chillan). Este alias evita justamente ese error de mezcla.
  let estadoForzado = null
  if (cmd === 'publicados' || cmd === 'publicado') { cmd = 'por-estado'; estadoForzado = 'Publicado' }
  const arg = (k, d) => { if (k === 'estado' && estadoForzado) return estadoForzado; const i = rest_.indexOf('--' + k); return i >= 0 ? rest_[i + 1] : d }
  const has = (k) => rest_.includes('--' + k)

  if (cmd === 'resumen') {
    const vendidos = await idsVendidos()
    const fNV = filtroNoVendidos(vendidos)
    const total = await contar('')
    const con_flag_stock = await contar('&show_in_stock=eq.true')
    // EN STOCK real = en stock y NO vendido (= disponible para la venta).
    const disponibles = await contar('&show_in_stock=eq.true' + fNV)
    const online = await contar('&show_in_stock=eq.true&stock_type=eq.online' + fNV)
    const en_local = await contar('&show_in_stock=eq.true&stock_type=eq.dealership' + fNV)
    console.log(JSON.stringify({
      concesionaria: 'MallorcAutos',
      total_vehiculos: total,
      en_stock: disponibles,        // autos disponibles: en stock y NO vendidos
      disponibles,                  // alias explícito (mismo valor que en_stock)
      vendidos: vendidos.length,    // con venta aprobada vigente (no revertida)
      fuera_de_stock: total - con_flag_stock,
      online,                       // de los disponibles
      en_local,                     // de los disponibles
    }, null, 2))
    return
  }

  if (cmd === 'vehiculos' || cmd === 'publicaciones' || cmd === 'stock') {
    const limite = Math.min(Number(arg('limite', 50)), 200)
    const vendidos = await idsVendidos()
    const soldSet = new Set(vendidos)
    let filtro = ''
    // publicaciones / stock = solo DISPONIBLES (en stock y NO vendidos).
    // vehiculos = todos (pero marcando cuáles están vendidos).
    if (cmd !== 'vehiculos' || has('stock')) filtro += '&show_in_stock=eq.true' + filtroNoVendidos(vendidos)
    // Si además piden un ESTADO concreto (ej. "publicados"=Publicado), filtrar por
    // status_id para no mezclar autos en Preparación/Chillan/etc.
    const estArg = arg('estado', '')
    if (estArg) { const e = resolverEstado(estArg); if (e) filtro += `&status_id=eq.${e.id}` }
    const r = await rest(`vehicles?select=${SELECT_VEH}${SOLO_MALLORCA}${filtro}&order=created_at.desc&limit=${limite}`, { count: true })
    const filas = (Array.isArray(r.body) ? r.body : []).map((v) => ({ ...fmtVeh(v), vendido: soldSet.has(v.id) }))
    console.log(JSON.stringify({ concesionaria: 'MallorcAutos', total: Number(r.total || filas.length), devueltos: filas.length, vehiculos: filas }, null, 2))
    return
  }

  if (cmd === 'vendidos') {
    // Autos VENDIDOS (venta aprobada vigente) con el detalle de la venta: precio y fecha.
    const limite = Math.min(Number(arg('limite', 50)), 200)
    const vs = await rest(
      'vehicles_sales?select=vehicle_id,sale_price,sale_date,veh:vehicles!vehicles_sales_vehicle_id_fkey!inner(client_id)' +
      `&veh.client_id=eq.${CLIENT_ID}&status=eq.approved&reverted_at=is.null&order=sale_date.desc&limit=${limite}`,
      { count: true }
    )
    const ventas = Array.isArray(vs.body) ? vs.body : []
    const ids = ventas.map((s) => s.vehicle_id)
    const porId = {}
    if (ids.length) {
      const r = await rest(`vehicles?select=${SELECT_VEH}&id=in.(${ids.join(',')})`)
      for (const v of (Array.isArray(r.body) ? r.body : [])) porId[v.id] = v
    }
    const filas = ventas.map((s) => {
      const base = porId[s.vehicle_id] ? fmtVeh(porId[s.vehicle_id]) : { id: s.vehicle_id }
      return { ...base, vendido: true, precio_venta: s.sale_price, fecha_venta: s.sale_date }
    })
    console.log(JSON.stringify({ concesionaria: 'MallorcAutos', total: Number(vs.total || filas.length), devueltos: filas.length, vehiculos: filas }, null, 2))
    return
  }

  if (cmd === 'estados') {
    // Lista los estados de la automotora con cuántos autos hay en cada uno.
    const filas = []
    for (const s of CAT_ESTADOS_LISTA) filas.push({ estado: s.nombre, id: s.id, autos: await contar(`&status_id=eq.${s.id}`) })
    console.log(JSON.stringify({ concesionaria: 'MallorcAutos', estados: filas }, null, 2))
    return
  }

  if (cmd === 'por-estado') {
    // Autos de UN estado (Publicado, Reservado, Vendido, Chillan, etc.) con máximo detalle.
    const e = resolverEstado(arg('estado', ''))
    if (!e) { console.log(JSON.stringify({ error: 'Estado no reconocido', estados_validos: CAT_ESTADOS_LISTA.map((s) => s.nombre) }, null, 2)); return }
    const limite = Math.min(Number(arg('limite', 50)), 200)
    const r = await rest(`vehicles?select=${SELECT_VEH}${SOLO_MALLORCA}&status_id=eq.${e.id}&order=created_at.desc&limit=${limite}`, { count: true })
    let filas = (Array.isArray(r.body) ? r.body : []).map(fmtVeh)
    if (/vendid/i.test(e.nombre) && filas.length) {   // si es Vendido, suma precio/fecha de venta
      const vs = await rest(`vehicles_sales?select=vehicle_id,sale_price,sale_date&vehicle_id=in.(${filas.map((f) => f.id).join(',')})&status=eq.approved&reverted_at=is.null`)
      const venta = {}
      for (const s of (Array.isArray(vs.body) ? vs.body : [])) venta[s.vehicle_id] = s
      filas = filas.map((f) => venta[f.id] ? { ...f, precio_venta: venta[f.id].sale_price, fecha_venta: venta[f.id].sale_date } : f)
    }
    console.log(JSON.stringify({ concesionaria: 'MallorcAutos', estado: e.nombre, total: Number(r.total || filas.length), devueltos: filas.length, vehiculos: filas }, null, 2))
    return
  }

  if (cmd === 'buscar') {
    const texto = arg('texto', '')
    if (!texto) { console.log(JSON.stringify({ error: 'Falta --texto' })); return }
    const q = encodeURIComponent('*' + texto + '*')
    // PostgREST no filtra por recurso embebido en un OR de nivel superior:
    // resolvemos marca y modelo a IDs primero, y luego filtramos vehicles por esos IDs.
    // OJO: un ilike del TEXTO COMPLETO no matchea "subaru forester" (la marca es
    // "Subaru", el modelo "FORESTER"): ningún nombre contiene el string entero → daba
    // CERO y Nexus respondía "no existe" con un auto que sí está. Por eso resolvemos
    // marca/modelo por CADA PALABRA y luego cruzamos.
    const tokens = String(texto).trim().split(/\s+/).filter((t) => t.length >= 2)
    const orNombre = tokens.map((t) => `name.ilike.${encodeURIComponent('*' + t + '*')}`).join(',')
    const br = tokens.length ? await rest(`brands?select=id&or=(${orNombre})&limit=50`) : { body: [] }
    const mo = tokens.length ? await rest(`models?select=id&or=(${orNombre})&limit=300`) : { body: [] }
    const brandIds = (Array.isArray(br.body) ? br.body : []).map((x) => x.id)
    const modelIds = (Array.isArray(mo.body) ? mo.body : []).map((x) => x.id)
    // Filtro de vehículos: marca Y modelo → intersección (el auto específico, ej.
    // Subaru + Forester); solo uno → ese; ninguno → cae a descripción (texto libre).
    let filtro
    if (brandIds.length && modelIds.length) filtro = `&brand_id=in.(${brandIds.join(',')})&model_id=in.(${modelIds.join(',')})`
    else if (modelIds.length) filtro = `&model_id=in.(${modelIds.join(',')})`
    else if (brandIds.length) filtro = `&brand_id=in.(${brandIds.join(',')})`
    else filtro = `&description=ilike.${q}`
    // SIEMPRE acotado a MallorcAutos (client 32) + el filtro de marca/modelo.
    let r = await rest(`vehicles?select=${SELECT_VEH}${SOLO_MALLORCA}${filtro}&order=created_at.desc&limit=30`, { count: true })
    // Si la intersección marca+modelo quedó vacía (palabras que matchearon una marca
    // y un modelo NO relacionados), reintenta como OR para no dar un falso "no existe".
    if (brandIds.length && modelIds.length && !(Array.isArray(r.body) && r.body.length)) {
      r = await rest(`vehicles?select=${SELECT_VEH}${SOLO_MALLORCA}&or=(brand_id.in.(${brandIds.join(',')}),model_id.in.(${modelIds.join(',')}))&order=created_at.desc&limit=30`, { count: true })
    }
    const soldSet = new Set(await idsVendidos())
    const filas = (Array.isArray(r.body) ? r.body : []).map((v) => ({ ...fmtVeh(v), vendido: soldSet.has(v.id) }))
    console.log(JSON.stringify({ concesionaria: 'MallorcAutos', q: texto, total: Number(r.total || filas.length), devueltos: filas.length, vehiculos: filas }, null, 2))
    return
  }

  if (cmd === 'sucursales') {
    await cargarSucursales()
    console.log(JSON.stringify({ concesionaria: 'MallorcAutos', sucursales: CAT_SUCURSALES }, null, 2))
    return
  }

  if (cmd === 'crear') {
    // Uso: crear --marca Toyota --modelo Hilux --anio 2020 [--patente .. --precio .. --km ..
    //      --color blanco --combustible diesel --transmision automatica --duenos 1 --version ..
    //      --ubicacion local|online --estado Chillan --foto /ruta1 --foto /ruta2]
    // Crea SIEMPRE bajo MallorcAutos (client 32). Estado por defecto: Chillan; ubicación: local.
    const fotos = []
    rest_.forEach((tk, i) => { if (tk === '--foto' && rest_[i + 1]) fotos.push(rest_[i + 1]) })
    const fs = arg('fotos'); if (fs) String(fs).split(',').forEach((f) => f.trim() && fotos.push(f.trim()))
    await cargarCategorias().catch(() => {}); await cargarCondiciones().catch(() => {})
    const d = {
      marca: arg('marca'), modelo: arg('modelo'), anio: arg('anio') || arg('año'),
      patente: arg('patente'), precio: arg('precio'), km: arg('km'), color: arg('color'),
      combustible: arg('combustible'), transmision: arg('transmision'), traccion: arg('traccion'),
      duenos: arg('duenos'), version: arg('version'), descripcion: arg('descripcion'),
      ubicacion: arg('ubicacion'), estado: arg('estado'), fotos,
      // Ficha completa:
      condicion: arg('condicion'), tipo: arg('tipo') || arg('carroceria'),
      motor: arg('motor'), chasis: arg('chasis') || arg('vin'), llaves: arg('llaves'),
      precio_min: arg('precio_min'), descuento: arg('descuento'), transferencia: arg('transferencia'),
      consignado: arg('consignado'), prenda: arg('prenda'), iva_exento: arg('iva_exento'), facturable: arg('facturable'),
      rev_tecnica: arg('rev_tecnica'), permiso_circulacion: arg('permiso_circulacion'),
      gases: arg('gases') || arg('emisiones'), permiso_municipal: arg('permiso_municipal'),
      comuna_permiso: arg('comuna_permiso'), etiqueta: arg('etiqueta'),
      // Adquisición (obligatoria): compra o consignación + su precio.
      adquisicion: arg('adquisicion') || arg('adquisición'),
      precio_compra: arg('precio_compra'), precio_consignacion: arg('precio_consignacion'),
      precio_adquisicion: arg('precio_adquisicion'), proveedor: arg('proveedor'), fecha_compra: arg('fecha_compra'),
    }
    const res = await crearVehiculo(d).catch((e) => ({ ok: false, error: e.message }))
    console.log(JSON.stringify({ concesionaria: 'MallorcAutos', ...res }, null, 2))
    return
  }

  if (cmd === 'vender' || cmd === 'nota-venta') {
    // Uso: vender --id N --precio 22900000 [--pago efectivo|transferencia|tarjeta|credito|cheque|financiamiento|mixto]
    //      [--cliente_id N | --rut 12.345.678-9 | --nombre X --apellido Y [--empresa Z] --email e --telefono t --direccion d]
    //      [--fecha dd/mm/aaaa] [--financiera "Forum"] [--abonos "Pie:1000000,Saldo:21900000"]
    //      [--transferencia 745000] [--transferencia_cobrada si|no] [--notas "..."] [--dry]
    // Registra la venta (nota de venta) de UN auto de MallorcAutos y lo marca Vendido.
    const id = arg('id')
    if (!id) { console.log(JSON.stringify({ error: 'Falta --id del auto a vender.', uso: 'vender --id N --precio 22900000 [--rut .. --nombre .. --apellido .. --pago efectivo --fecha dd/mm/aaaa]' })); return }
    await cargarCategorias().catch(() => {}); await cargarCondiciones().catch(() => {})
    const d = {
      id, precio: arg('precio'), pago: arg('pago') || arg('metodo'), fecha: arg('fecha'),
      cliente_id: arg('cliente_id') || arg('cliente'), rut: arg('rut'), nombre: arg('nombre'),
      apellido: arg('apellido'), empresa: arg('empresa'), tipo_cliente: arg('tipo_cliente'),
      email: arg('email'), telefono: arg('telefono') || arg('fono'), direccion: arg('direccion'),
      financiera: arg('financiera'), abonos: arg('abonos'), notas: arg('notas') || arg('nota'),
      transferencia: arg('transferencia'), transferencia_cobrada: arg('transferencia_cobrada'),
    }
    // --dry / --simular / --simulacion: previsualiza sin escribir nada (alias defensivos).
    const res = await crearNotaVenta(d, has('dry') || has('simular') || has('simulacion')).catch((e) => ({ ok: false, error: e.message }))
    console.log(JSON.stringify({ concesionaria: 'MallorcAutos', ...res }, null, 2))
    return
  }

  if (cmd === 'gasto' || cmd === 'agregar-gasto') {
    // Uso: gasto --id N --titulo "Cambio de neumáticos" --monto 250000 (CON IVA)
    //      [--categoria neumaticos] [--descripcion ".."] [--asume automotora|cliente]
    //      [--credito_fiscal si|no] [--fecha dd/mm/aaaa] [--dry]
    // Agrega un gasto al auto en MallorcAutos. El monto SIEMPRE va con IVA incluido.
    const id = arg('id')
    if (!id) { console.log(JSON.stringify({ error: 'Falta --id del auto.', uso: 'gasto --id N --titulo "Neumáticos" --monto 250000 (CON IVA) [--categoria neumaticos --asume automotora|cliente --credito_fiscal si|no --fecha dd/mm/aaaa]' })); return }
    const d = {
      id, titulo: arg('titulo') || arg('title'), monto: arg('monto') || arg('amount'),
      categoria: arg('categoria') || arg('categoría'), descripcion: arg('descripcion') || arg('descripción'),
      asume: arg('asume') || arg('asumido'),
      // "con factura" = IVA recuperable = genera_credito_fiscal. Alias: factura/con_factura.
      credito_fiscal: arg('credito_fiscal') || arg('iva_recuperable') || arg('credito') || arg('factura') || arg('con_factura'),
      nro_factura: arg('nro_factura') || arg('factura_numero') || arg('num_factura') || arg('numero_factura'),
      fecha: arg('fecha'),
    }
    const res = await crearGasto(d, has('dry') || has('simular') || has('simulacion')).catch((e) => ({ ok: false, error: e.message }))
    console.log(JSON.stringify({ concesionaria: 'MallorcAutos', ...res }, null, 2))
    return
  }

  if (cmd === 'categorias-gasto' || cmd === 'categorias-gastos') {
    await cargarCategoriasGasto()
    console.log(JSON.stringify({ concesionaria: 'MallorcAutos', categorias_gasto: CAT_GASTOS }, null, 2))
    return
  }

  if (cmd === 'editar') {
    // Uso: editar --id N --<campo> <valor> [--<campo> <valor> ...]
    // Ej:  editar --id 4810 --estado Reservado --ubicacion local --precio 22900000
    const id = arg('id')
    if (!id) { console.log(JSON.stringify({ error: 'Falta --id', editables: Object.keys(EDITABLES) })); return }
    await cargarCategorias().catch(() => {}); await cargarCondiciones().catch(() => {})
    // Recolecta todos los --flag valor que sean campos editables conocidos.
    const cambios = {}
    for (const flag of Object.keys(EDITABLES)) { const v = arg(flag); if (v !== undefined) cambios[flag] = v }
    if (!Object.keys(cambios).length) {
      console.log(JSON.stringify({ error: 'No indicaste qué cambiar.', uso: 'editar --id N --estado Reservado --ubicacion local --precio 22900000', editables: Object.keys(EDITABLES) }))
      return
    }
    const res = await editarVehiculo(id, cambios).catch((e) => ({ ok: false, error: e.message }))
    console.log(JSON.stringify({ concesionaria: 'MallorcAutos', ...res }, null, 2))
    return
  }

  if (cmd === 'adquisicion') {
    // Datos de adquisición (precio de compra + vendedor) de un auto EXISTENTE.
    // Ej: adquisicion --id 5169 --precio_compra 15000000 --proveedor "Matías Silva" --proveedor_rut 18.973.697-5 --proveedor_fono "+56962941802" --proveedor_dir "Uspallata 15599, Los Andes"
    const id = arg('id')
    if (!id) { console.log(JSON.stringify({ error: 'Falta --id' })); return }
    const res = await editarAdquisicion(id, {
      precio_compra: arg('precio_compra') ?? arg('precio'),
      proveedor: arg('proveedor') ?? arg('vendedor'),
      proveedor_nombre: arg('proveedor_nombre') ?? arg('nombre'),
      proveedor_apellido: arg('proveedor_apellido') ?? arg('apellido'),
      empresa: arg('empresa'),
      proveedor_rut: arg('proveedor_rut') ?? arg('rut'),
      proveedor_fono: arg('proveedor_fono') ?? arg('fono') ?? arg('telefono'),
      proveedor_dir: arg('proveedor_dir') ?? arg('direccion'),
      proveedor_email: arg('proveedor_email') ?? arg('email'),
    }, has('simular') || has('dry')).catch((e) => ({ ok: false, error: e.message }))
    console.log(JSON.stringify({ concesionaria: 'MallorcAutos', ...res }, null, 2))
    return
  }

  if (cmd === 'cliente' || cmd === 'clientes') {
    // Ver/crear/editar clientes (incl. vendedores), SOLO MallorcAutos.
    const accion = arg('accion') || 'buscar'
    const d = {
      id: arg('id'), rut: arg('rut'), texto: arg('texto'),
      nombre: arg('nombre'), apellido: arg('apellido'), empresa: arg('empresa'),
      telefono: arg('telefono') ?? arg('fono'), email: arg('email'), direccion: arg('direccion'),
    }
    const res = await gestionarCliente(accion, d, has('simular') || has('dry')).catch((e) => ({ ok: false, error: e.message }))
    console.log(JSON.stringify({ concesionaria: 'MallorcAutos', ...res }, null, 2))
    return
  }

  if (cmd === 'editar-venta') {
    // Editar una nota de venta existente (vehicles_sales), SOLO MallorcAutos.
    const id = arg('id')
    if (!id) { console.log(JSON.stringify({ error: 'Falta --id de la venta' })); return }
    const cambios = {
      precio: arg('precio'), estado: arg('estado'), pago: arg('pago'), fecha: arg('fecha'),
      cliente_id: arg('cliente_id'), comision: arg('comision'), comision_pct: arg('comision_pct'),
      financiera: arg('financiera'), transferencia: arg('transferencia'), notas: arg('notas'),
    }
    const res = await editarVenta(id, cambios).catch((e) => ({ ok: false, error: e.message }))
    console.log(JSON.stringify({ concesionaria: 'MallorcAutos', ...res }, null, 2))
    return
  }

  if (cmd === 'ficha') {
    // Ficha COMPLETA de UN auto (incluye motor, chasis, tipo/carrocería, color,
    // combustible, patente, año, precio, iva_exento). Es la fuente para armar la
    // FACTURA AUTOMÁTICA sin pedir el CAV. Por --id, o por --texto (si hay 1 match).
    const id = arg('id')
    if (!id) { console.log(JSON.stringify({ error: 'Falta --id. Ubica el auto primero con: buscar --texto "raptor"' })); return }
    const r = await rest(`vehicles?select=${SELECT_VEH},client_id${SOLO_MALLORCA}&id=eq.${id}&limit=1`)
    const veh = (Array.isArray(r.body) ? r.body : r)?.[0] || null
    if (!veh) { console.log(JSON.stringify({ error: `No existe el auto id ${id} en MallorcAutos` })); return }
    const f = fmtVeh(veh, true)
    // Mezclar con el CAV guardado de esa patente (si ya leímos su CAV alguna vez):
    // GoAutos manda en lo suyo; el CAV aporta lo que GoAutos no tiene (PBV, tipo…).
    const cav = leerCav(f.patente) || {}
    const df = {
      tipo: f.tipo || cav.tipo || null,
      marca: f.marca || cav.marca || null,
      modelo: [f.modelo, f.version].filter(Boolean).join(' ') || cav.modelo || null,
      motor: f.motor || cav.motor || null,
      chasis: f.chasis || cav.chasis || null,
      color: f.color || cav.color || null,
      combustible: f.combustible || cav.combustible || null,
      pbv: cav.pbv || null,                 // SOLO del CAV: GoAutos no lo tiene
      patente: f.patente || cav.patente || null,
      anio: f.anio || cav.anio || null,
      precio: f.precio ?? null,
      iva_exento: f.iva_exento === true,
    }
    const faltantes = ['tipo', 'motor', 'chasis', 'color', 'combustible', 'pbv', 'patente', 'anio'].filter((k) => !df[k])
    console.log(JSON.stringify({
      concesionaria: 'MallorcAutos', auto: f, datos_factura: df,
      cav_guardado: Boolean(cav.patente),
      cav_fuente: cav.fuente || null,
      faltantes,
      nota: faltantes.length
        ? `Para la factura faltan: ${faltantes.join(', ')}. Pídelos o sácalos del CAV; el PBV NUNCA está en GoAutos. Cuando los tengas, guárdalos con: guardar-cav --patente ${df.patente || 'XXXX'} --pbv "…" (así el próximo no los pide).`
        : 'datos_factura está COMPLETO: arma la descripción del auto sin pedir el CAV.',
    }, null, 2))
    return
  }

  if (cmd === 'guardar-cav') {
    // Guarda en la memoria de Nexus los datos del CAV de un auto (por patente), para
    // que las próximas facturas de ESE auto no pidan el CAV ni el PBV.
    const patente = arg('patente')
    if (!patente) { console.log(JSON.stringify({ error: 'Falta --patente' })); return }
    try {
      const g = guardarCav({
        patente, tipo: arg('tipo'), marca: arg('marca'), modelo: arg('modelo'),
        motor: arg('motor'), chasis: arg('chasis'), vin: arg('vin'), color: arg('color'),
        combustible: arg('combustible'), pbv: arg('pbv'), anio: arg('anio'), fuente: arg('fuente') || 'CAV',
      })
      console.log(JSON.stringify({ ok: true, guardado: g, total_cav_guardados: contarCav(),
        nota: 'Datos del CAV guardados. Las próximas facturas de esta patente ya no los van a pedir.' }, null, 2))
    } catch (e) { console.log(JSON.stringify({ ok: false, error: e.message })) }
    return
  }

  console.log(JSON.stringify({
    error: 'Comando desconocido',
    comandos: [
      'ficha --id N | --texto "raptor" (ficha COMPLETA con motor/chasis → datos para la factura)',
      'resumen', 'vehiculos [--limite N] (todos)', 'stock / publicaciones (solo disponibles, no vendidos)',
      'vendidos', 'estados', 'por-estado --estado X', 'sucursales', 'buscar --texto X',
      'editar --id N --estado X --ubicacion local|online --precio N ... (SOLO MallorcAutos)',
      'crear --marca X --modelo Y --anio N [--patente .. --precio .. --foto /ruta ...] (SOLO MallorcAutos)',
      'vender --id N --precio N [--rut .. --nombre .. --apellido .. --pago efectivo --fecha dd/mm/aaaa --dry] (registra nota de venta y marca Vendido)',
      'gasto --id N --titulo "X" --monto N [--categoria .. --asume automotora|cliente --credito_fiscal si|no --fecha dd/mm/aaaa --dry] (agrega un gasto al auto; el monto va CON IVA)',
      'categorias-gasto (lista las categorías de gasto)',
    ],
    editables: Object.keys(EDITABLES),
  }))
}

main().catch((e) => { console.log(JSON.stringify({ error: e.message })); process.exit(1) })

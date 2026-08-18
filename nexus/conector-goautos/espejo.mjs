// espejo.mjs — ESPEJO GoAutos → BD MallorcAutos (Supabase cwspnqzrhdunwmqontjp,
// la que usa la app nj-mallorc-autos.vercel.app y el flujo de Joaquín).
//
// GoAutos es la FUENTE DE VERDAD del inventario. Cada vez que Nexus (o una persona
// en el portal) sube/edita/vende/gasta en GoAutos, esa info se refleja acá para que
// la app tenga los mismos autos, compras, ventas, consignaciones y gastos.
//
// Reemplaza al `node supabase/sync-goauto.mjs` de la app (que no vive en este mac):
// mismo mapeo de campos, mismos estados y mismas categorías que ya usaba la app.
//
// NO PISA lo que es del lado de la app / de Nexus:
//   • gastos ya existentes (los `gox_` con su categoría corregida a mano y los `nx_`
//     que registra el tool `gasto` de Nexus) se conservan; solo se AGREGAN los nuevos.
//   • soap, publicadoEn, qrRuta, notas y el `documento` de compra/venta ya guardado
//     se conservan (GoAutos no los tiene o la persona los corrigió en la app).
//
// Uso:
//   node espejo.mjs sync   [--dry] [--verbose]   ← todos los autos (para el cron)
//   node espejo.mjs auto --id 6545 [--dry]       ← un auto (lo llama goautos.mjs)
//   node espejo.mjs estado                       ← qué dice el último sync
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── GoAutos (mismas credenciales que goautos.mjs) ────────────────────────────
const SUPA = process.env.GOAUTOS_SUPABASE_URL || 'https://miuiujntdjrjhhcysiba.supabase.co'
const ANON = process.env.GOAUTOS_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdWl1am50ZGpyamhoY3lzaWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwODEzNjcsImV4cCI6MjA1MDY1NzM2N30.CqgUmrnmGSLDc6tg2aCHdD7tB-q9YL2utHPzXSIo6gI'
const CLIENT_ID = 32   // MallorcAutos. No tocar: la cuenta ve las 60 automotoras del portal.

let _jwt = null
async function token() {
  if (_jwt) return _jwt
  const g = (JSON.parse(readFileSync(join(__dirname, '..', 'credenciales.json'), 'utf8')).goautos) || {}
  if (!g.usuario || !g.clave) throw new Error('Faltan credenciales de goautos en credenciales.json')
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: g.usuario, password: g.clave }),
  })
  const j = await r.json()
  if (!j.access_token) throw new Error('Login GoAutos falló: ' + JSON.stringify(j).slice(0, 160))
  _jwt = j.access_token
  return _jwt
}
async function go(path) {
  const jwt = await token()
  const r = await fetch(`${SUPA}/rest/v1/${path}`, { headers: { apikey: ANON, Authorization: 'Bearer ' + jwt } })
  const body = await r.json().catch(() => null)
  if (!r.ok) throw new Error(`GoAutos HTTP ${r.status}: ${JSON.stringify(body).slice(0, 180)}`)
  return Array.isArray(body) ? body : []
}

// ── BD MallorcAutos (la de la app) ──────────────────────────────────────────
function envEspejo() {
  // Las credenciales viven en conector-gastos/.env (chmod 600, fuera de git).
  const out = {}
  try {
    const txt = readFileSync(join(__dirname, '..', 'conector-gastos', '.env'), 'utf8')
    for (const l of txt.split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) out[m[1]] = m[2] }
  } catch { /* usa el env del proceso */ }
  const url = (process.env.GASTOS_SUPA_URL || out.GASTOS_SUPA_URL || '').replace(/\/$/, '')
  const key = process.env.GASTOS_SUPA_SERVICE || out.GASTOS_SUPA_SERVICE || out.GASTOS_SUPA_ANON || ''
  if (!url || !key) throw new Error('Faltan credenciales de la BD MallorcAutos (conector-gastos/.env)')
  return { url, key }
}
const EP = envEspejo()
const HDR = { apikey: EP.key, Authorization: `Bearer ${EP.key}`, 'Content-Type': 'application/json' }
async function db(path, opts = {}) {
  const r = await fetch(`${EP.url}/rest/v1/${path}`, { ...opts, headers: { ...HDR, ...(opts.headers || {}) } })
  const txt = await r.text()
  let body; try { body = txt ? JSON.parse(txt) : null } catch { body = txt }
  if (!r.ok) throw new Error(`BD HTTP ${r.status}: ${typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200)}`)
  return body
}

// ── Mapeos (los MISMOS que ya usa la app) ───────────────────────────────────
// Estados de GoAutos (clients_vehicles_states del cliente 32) → estados de la app.
const ESTADOS = {
  1727: 'chillan', 10: 'revision', 15: 'preparacion', 20: 'foto',
  25: 'publicado', 40: 'reservado', 30: 'vendido', 234: 'archivado',
}
const TRANSMISION = { automatic: 'Automática', manual: 'Manual', cvt: 'CVT', dct: 'Doble embrague' }
// Categorías de gasto por vehículo de la app (ajustes.categoriasGastoVehiculo).
const CAT_VEH = ['Mantenimiento', 'Documentación', 'DyP', 'Repuestos', 'Transferencia', 'Seguros', 'Otros']

const cap = (s) => { const t = String(s || '').trim(); return t ? t[0].toUpperCase() + t.slice(1) : '' }
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const nombreCliente = (c) => !c ? '' : ([c.first_name, c.last_name].filter(Boolean).join(' ').trim() || c.company_name || '').trim()
const contraparte = (c) => ({ rut: (c && c.rut) || '', nombre: nombreCliente(c), correo: (c && c.email) || '', telefono: (c && c.phone) || '' })
// ¿Es la misma persona que ya estaba guardada? (mismo RUT y mismo nombre, ignorando
// mayúsculas, tildes y espacios de más). Si lo es, se deja la ficha tal como estaba:
// no tiene sentido reescribir 100 autos porque alguien cambió "JUAN PEREZ" a "Juan Perez".
const _rut = (x) => String(x || '').replace(/[.\-\s]/g, '').toLowerCase()
const _nom = (x) => norm(x).replace(/\s+/g, ' ').trim()
const mismaContraparte = (a, b) => !!a && !!b && _rut(a.rut) === _rut(b.rut) && _nom(a.nombre) === _nom(b.nombre)
// Contraparte final: la de GoAutos, salvo que sea la misma que ya estaba.
const contraparteFinal = (previa, c) => { const nueva = contraparte(c); return mismaContraparte(previa, nueva) ? previa : nueva }

// Fecha (YYYY-MM-DD). Los timestamps con zona se pasan a hora de CHILE (si no, una
// venta cargada de noche quedaba fechada al día siguiente); las fechas "planas"
// (2026-08-05T00:00:00, sin zona) se cortan tal cual.
function fecha(x) {
  if (!x) return ''
  const s = String(x)
  if (!/[Zz]|[+-]\d\d:?\d\d$/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  return isNaN(d) ? s.slice(0, 10) : d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

// Categoría del gasto: la app clasifica por el TEXTO del gasto (título+descripción),
// no por la categoría de GoAutos. Se replica esa regla; lo que no calza va a "Otros".
function categoriaGasto(extra) {
  if (extra.type === 'document') return 'Documentación'
  const t = norm(`${extra.title || ''} ${extra.description || ''}`)
  if (/transferencia|traspaso|dominio/.test(t)) return 'Transferencia'
  if (/mantencion|mantenimiento/.test(t)) return 'Mantenimiento'
  if (/neumatico|bateria|repuesto|llanta/.test(t)) return 'Repuestos'
  if (/seguro|soap/.test(t) && !/revision|permiso/.test(t)) return 'Seguros'
  if (/dyp|desabolladura|abolladura|pintura|latoneria/.test(t)) return 'DyP'
  if (/revision tecnica|permiso de circulacion|padron|documento|documentacion|gases/.test(t)) return 'Documentación'
  return 'Otros'
}
// "documento" = cómo respalda el gasto: con factura con IVA recuperable (afecta) o no.
const documentoGasto = (x) => (x.genera_credito_fiscal === true ? 'afecta' : 'sinfactura')

function mapGasto(extra) {
  return {
    id: `gox_${extra.id}`,
    fecha: fecha(extra.created_at),
    monto: Math.round(Number(extra.amount) || 0),
    categoria: categoriaGasto(extra),
    documento: documentoGasto(extra),
    descripcion: [extra.title, extra.description].filter((x) => String(x || '').trim()).join(' — ').trim(),
  }
}

// ── Arma la fila del espejo para un auto ────────────────────────────────────
// `actual` = fila que ya está en la BD (para no pisar lo editado en la app).
// GoAutos manda, pero no borra: si GoAutos viene vacío, se conserva lo que ya tenía
// la app, y si el dato de la app es MÁS específico (color "BLANCO PERLADO NEGRO" vs
// "blanco"), también se conserva. Así el sync no empobrece fichas trabajadas a mano.
function preferir(actualValor, nuevoValor) {
  const a = String(actualValor == null ? '' : actualValor).trim()
  const b = String(nuevoValor == null ? '' : nuevoValor).trim()
  if (!b) return actualValor == null ? nuevoValor : actualValor
  if (a && norm(a).replace(/\s+/g, ' ').includes(norm(b).replace(/\s+/g, ' '))) return actualValor
  return nuevoValor
}

function armarFila(v, ctx, actual) {
  const compraGo = ctx.purch.get(v.id) || null
  const ventaGo = ctx.sales.get(v.id) || null
  const consGo = ctx.cons.get(v.id) || null
  // Gastos: solo los COSTOS del auto (expense + document). Los abonos de reserva,
  // adicionales de venta e ingresos no son gasto y quedan fuera (igual que la app).
  const extras = (ctx.extras.get(v.id) || []).filter((e) => e.type === 'expense' || e.type === 'document')
  const previos = Array.isArray(actual && actual.gastos) ? actual.gastos : []
  const yaEstan = new Set(previos.map((g) => g.id))
  const nuevos = extras.filter((e) => !yaEstan.has(`gox_${e.id}`)).map(mapGasto)
  // Los previos mandan (pueden traer categoría corregida a mano o ser gastos `nx_`
  // cargados por Nexus); solo se suman los nuevos, al final y sin reordenar (si se
  // reordenaran, cada sync "cambiaría" todos los autos sin que cambie nada de fondo).
  const gastos = [...previos, ...nuevos]

  const esConsignado = !!(consGo || v.is_consigned)
  const estado = ventaGo ? 'vendido' : (ESTADOS[v.status_id] || 'stock')
  const fotos = [...new Set([v.main_image, ...(Array.isArray(v.gallery) ? v.gallery : [])].filter((x) => String(x || '').trim()))]

  const compra = compraGo ? {
    fecha: fecha(compraGo.purchase_date),
    monto: Math.round(Number(compraGo.purchase_price) || 0),
    // Si la app/una persona ya definió cómo se documentó la compra, se respeta.
    documento: (actual && actual.compra && actual.compra.documento) || (compraGo.genera_credito_fiscal === true ? 'afecta' : 'sinfactura'),
    contraparte: contraparteFinal(actual && actual.compra && actual.compra.contraparte, ctx.cust.get(compraGo.customer_id)),
  } : ((actual && actual.compra) || null)

  const venta = ventaGo ? {
    fecha: fecha(ventaGo.sale_date),
    monto: Math.round(Number(ventaGo.sale_price) || 0),
    documento: (actual && actual.venta && actual.venta.documento) || (v.iva_exento === false ? 'afecta' : 'exenta'),
    contraparte: contraparteFinal(actual && actual.venta && actual.venta.contraparte, ctx.cust.get(ventaGo.customer_id)),
  } : ((actual && actual.venta) || null)

  const consignante = consGo && ctx.cust.get(consGo.customer_id)
    ? contraparteFinal(actual && actual.consignante, ctx.cust.get(consGo.customer_id))
    : ((actual && actual.consignante) || null)

  return {
    id: `go_${v.id}`,
    goautoId: v.id,
    patente: preferir(actual && actual.patente, (v.license_plate || '').toUpperCase().trim()),
    marca: (v.brands && v.brands.name) || '',
    modelo: (v.models && v.models.name) || '',
    version: preferir(actual && actual.version, v.version_name || ''),
    anio: Number(v.year) || 0,
    km: Number(v.mileage) || 0,
    color: preferir(actual && actual.color, cap(v.colors && v.colors.name)),
    combustible: preferir(actual && actual.combustible, cap(v.fuel_types && v.fuel_types.name)),
    vin: preferir(actual && actual.vin, v.chassis_number || ''),
    motor: preferir(actual && actual.motor, v.engine_number || null),
    revTecnica: String(v.tech_inspection_expiry || '').slice(0, 10),
    permisoCirc: String(v.circulation_permit_expiry || '').slice(0, 10),
    // GoAutos no lleva SOAP ni dónde está publicado: es dato de la app, no se pisa.
    soap: (actual && actual.soap) || '',
    municipalidad: preferir(actual && actual.municipalidad, v.permit_municipality || ''),
    estado,
    consignacion: esConsignado,
    precioConsignador: esConsignado ? Math.round(Number(consGo && consGo.agreed_price) || 0) : 0,
    precioPublicado: Math.round(Number(v.price) || 0),
    publicadoEn: (actual && actual.publicadoEn) || [],
    notas: (actual && actual.notas) || 'Importado desde GoAuto.',
    compra, venta, consignante, gastos,
    transmision: preferir(actual && actual.transmision, TRANSMISION[v.transmission] || ''),
    descripcion: preferir(actual && actual.descripcion, v.description || ''),
    fotos,
  }
}

// ── Trae de GoAutos todo lo de MallorcAutos (o solo un auto) ────────────────
const SELECT_VEH = 'id,year,price,mileage,status_id,main_image,gallery,transmission,license_plate,version_name,engine_number,chassis_number,is_consigned,iva_exento,tech_inspection_expiry,circulation_permit_expiry,permit_municipality,description,brands(name),models(name),fuel_types(name),colors(name)'

async function traer({ soloId = null } = {}) {
  const filtro = soloId ? `&id=eq.${Number(soloId)}` : ''
  const vehiculos = await go(`vehicles?select=${SELECT_VEH}&client_id=eq.${CLIENT_ID}${filtro}&limit=2000`)
  const ids = vehiculos.map((v) => v.id)
  const extras = new Map(), purch = new Map(), sales = new Map(), cons = new Map(), cust = new Map()
  for (let i = 0; i < ids.length; i += 60) {
    const inl = `(${ids.slice(i, i + 60).join(',')})`
    if (!ids.length) break
    for (const e of await go(`vehicles_extras?select=id,vehicle_id,title,description,amount,type,genera_credito_fiscal,created_at&vehicle_id=in.${inl}&limit=5000`)) {
      if (!extras.has(e.vehicle_id)) extras.set(e.vehicle_id, [])
      extras.get(e.vehicle_id).push(e)
    }
    // Compra / venta / consignación: si hubiera más de una fila, manda la última.
    for (const p of await go(`vehicles_purchases?select=id,vehicle_id,customer_id,purchase_price,purchase_date,genera_credito_fiscal&vehicle_id=in.${inl}&order=id&limit=2000`)) purch.set(p.vehicle_id, p)
    for (const s of await go(`vehicles_sales?select=id,vehicle_id,customer_id,sale_price,sale_date,status&vehicle_id=in.${inl}&order=id&limit=2000`)) { if (s.status !== 'reverted') sales.set(s.vehicle_id, s) }
    for (const c of await go(`vehicles_consignments?select=id,vehicle_id,customer_id,agreed_price,consignment_date&vehicle_id=in.${inl}&order=id&limit=2000`)) cons.set(c.vehicle_id, c)
  }
  const cids = [...new Set([...purch.values(), ...sales.values(), ...cons.values()].map((x) => x.customer_id).filter(Boolean))]
  for (let i = 0; i < cids.length; i += 80) {
    for (const c of await go(`customers?select=id,rut,first_name,last_name,company_name,email,phone&id=in.(${cids.slice(i, i + 80).join(',')})&limit=500`)) cust.set(c.id, c)
  }
  return { vehiculos, ctx: { extras, purch, sales, cons, cust } }
}

// Compara lo que hay con lo que debería haber: si no cambió nada, no se escribe
// (así `updatedAt` de la app solo se mueve cuando de verdad cambió algo).
const CAMPOS = ['patente', 'marca', 'modelo', 'version', 'anio', 'km', 'color', 'combustible', 'vin', 'motor',
  'revTecnica', 'permisoCirc', 'soap', 'municipalidad', 'estado', 'consignacion', 'precioConsignador',
  'precioPublicado', 'publicadoEn', 'notas', 'compra', 'venta', 'consignante', 'gastos', 'transmision', 'descripcion', 'fotos']
// JSON estable: ordena las claves para que un mismo dato con las claves en otro
// orden (la app las guarda distinto) NO se vea como un cambio y reescriba el auto.
function estable(x) {
  if (Array.isArray(x)) return x.map(estable)
  if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map((k) => [k, estable(x[k])]))
  return x === undefined || x === '' ? (x === '' ? '' : null) : x
}
const igual = (a, b) => JSON.stringify(estable(a)) === JSON.stringify(estable(b))

function cambios(nueva, actual) {
  if (!actual) return ['(auto nuevo)']
  const dif = []
  for (const k of CAMPOS) {
    const a = actual[k] === undefined ? null : actual[k]
    const b = nueva[k] === undefined ? null : nueva[k]
    if (!igual(a, b)) dif.push(k)
  }
  return dif
}

// ── Sync ────────────────────────────────────────────────────────────────────
export async function sincronizar({ soloId = null, dry = false, verbose = false } = {}) {
  const { vehiculos, ctx } = await traer({ soloId })
  if (!vehiculos.length) return { ok: false, error: soloId ? `El auto ${soloId} no existe o no es de MallorcAutos.` : 'GoAutos no devolvió autos.' }
  const filtroId = soloId ? `&id=eq.go_${Number(soloId)}` : ''
  const actuales = new Map((await db(`vehiculos?select=*&limit=2000${filtroId}`)).map((r) => [r.goautoId, r]))

  const aEscribir = [], detalle = []
  for (const v of vehiculos) {
    const fila = armarFila(v, ctx, actuales.get(v.id))
    const dif = cambios(fila, actuales.get(v.id))
    if (!dif.length) continue
    aEscribir.push(fila)
    detalle.push({ auto: `${fila.patente || 's/patente'} ${fila.marca} ${fila.modelo}`.trim(), id: fila.id, nuevo: !actuales.has(v.id), cambios: dif })
  }

  if (!dry && aEscribir.length) {
    // Upsert por `id` (go_<goautoId>): inserta los que faltan y actualiza el resto.
    for (let i = 0; i < aEscribir.length; i += 50) {
      await db('vehiculos?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(aEscribir.slice(i, i + 50).map((f) => ({ ...f, updatedAt: new Date().toISOString() }))),
      })
    }
  }
  const resumen = {
    ok: true, dry,
    autos_goautos: vehiculos.length,
    autos_espejo: actuales.size,
    nuevos: detalle.filter((d) => d.nuevo).length,
    actualizados: detalle.filter((d) => !d.nuevo).length,
    sin_cambios: vehiculos.length - detalle.length,
  }
  if (verbose || dry || soloId) resumen.detalle = detalle.slice(0, 60)

  // Deja constancia del sync donde la app lo muestra (Ajustes → Integración GoAuto).
  if (!dry && !soloId) {
    const conCompra = vehiculos.filter((v) => ctx.purch.has(v.id)).length
    const conVenta = vehiculos.filter((v) => ctx.sales.has(v.id)).length
    const gastos = [...ctx.extras.values()].flat().filter((e) => e.type === 'expense' || e.type === 'document').length
    await db('ajustes?on_conflict=clave', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ clave: 'ultimaSyncGoAuto', valor: { fecha: new Date().toISOString(), vehiculos: vehiculos.length, conCompra, conVenta, gastos, por: 'nexus' }, updatedAt: new Date().toISOString() }]),
    }).catch(() => {})
  }
  return resumen
}

// Espeja UN auto. La usa goautos.mjs después de crear/editar/vender/gastar: nunca
// tumba la operación principal, si falla solo lo informa.
export async function espejarAuto(id, { dry = false } = {}) {
  try {
    return await sincronizar({ soloId: id, dry })
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────
const esCli = process.argv[1] && process.argv[1].endsWith('espejo.mjs')
if (esCli) {
  const argv = process.argv.slice(2)
  const cmd = (argv[0] || '').toLowerCase()
  const arg = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined }
  const has = (n) => argv.includes('--' + n)
  try {
    if (cmd === 'sync' || cmd === 'sincronizar') {
      console.log(JSON.stringify(await sincronizar({ dry: has('dry') || has('simular'), verbose: has('verbose') }), null, 2))
    } else if (cmd === 'auto') {
      const id = arg('id')
      if (!id) console.log(JSON.stringify({ error: 'Falta --id del auto.' }))
      else console.log(JSON.stringify(await sincronizar({ soloId: id, dry: has('dry') || has('simular') }), null, 2))
    } else if (cmd === 'estado') {
      const r = await db('ajustes?select=valor,updatedAt&clave=eq.ultimaSyncGoAuto')
      console.log(JSON.stringify(r[0] || { aviso: 'nunca se ha corrido un sync' }, null, 2))
    } else {
      console.log(JSON.stringify({ error: 'Comando desconocido', comandos: ['sync [--dry] [--verbose]', 'auto --id N [--dry]', 'estado'] }))
    }
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: e.message }))
    process.exit(1)
  }
}

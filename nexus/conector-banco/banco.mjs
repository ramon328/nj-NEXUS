// Conector BANCO — agente "Leo". Consulta las cuentas bancarias REALES vía Rail.
//
// POR QUÉ CONTRA RAIL Y NO CONTRA SU SUPABASE: la base de bank-nucleo tiene RLS por
// usuario, así que la anon key devuelve [] para un agente server-to-server (verificado),
// y la Edge Function `export-movements` exige un BOOTSTRAP_SECRET que no tenemos.
// Rail, en cambio, entrega TODO lo necesario y además trae el RUT del titular
// (`holder_id`), así que no hace falta su tabla `companies` para atribuir por empresa.
//
// ⚠️ SOLO LECTURA — POR DISEÑO. La rail_sk_live puede además DESCONECTAR links y
// disparar sincronizaciones. Este módulo usa EXCLUSIVAMENTE GET: nunca borra, nunca
// mueve plata, nunca toca una conexión. No agregues métodos de escritura acá.
//
// OJO base: api.rail.cl (el dominio de la doc) es un deploy muerto; el vivo es
// rail-api-zbpq.onrender.com (lo dice el propio repo bank-nucleo).
//
// Config en ~/nexus/.env:
//   RAIL_API_BASE    = https://rail-api-zbpq.onrender.com   (opcional)
//   RAIL_SECRET_KEY  = rail_sk_live_...
//
// CLI:
//   node banco.mjs empresas
//   node banco.mjs saldos --rut 77271121-2
//   node banco.mjs movimientos --rut 77271121-2 [--buscar copec] [--desde 2026-07-01] [--limite 30]
//   node banco.mjs resumen --rut 77271121-2 [--anio 2026]

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function envDe(clave) {
  if (process.env[clave]) return process.env[clave]
  try {
    const txt = readFileSync(join(__dirname, '..', '.env'), 'utf8')
    const m = txt.match(new RegExp('^' + clave + '=(.*)$', 'm'))
    return m ? m[1].trim() : ''
  } catch { return '' }
}

const BASE = (envDe('RAIL_API_BASE') || 'https://rail-api-zbpq.onrender.com').replace(/\/+$/, '')
const SK = envDe('RAIL_SECRET_KEY')

// Montos en "minor units" con signo (negativo = egreso). CLP NO se divide por 100
// (exponente 0); USD/EUR sí. Esto lo confirma el propio repo bank-nucleo.
const EXPONENTE = { CLP: 0, USD: 2, EUR: 2 }
export function fmt(minor, moneda = 'CLP') {
  const mon = (moneda || 'CLP').toUpperCase()
  const e = EXPONENTE[mon] ?? 0
  const v = Number(minor || 0) / Math.pow(10, e)
  const s = Math.abs(v).toLocaleString('es-CL', { minimumFractionDigits: e, maximumFractionDigits: e })
  return (v < 0 ? '-' : '') + (mon === 'CLP' ? '$' + s : s + ' ' + mon)
}

const normRut = (r) => String(r || '').replace(/[.\-\s]/g, '').toUpperCase()

// ── Fuente TEK (nuestra API propia — REEMPLAZA a Rail para las empresas conectadas
//    por nosotros: hoy ANA CLARA). SOLO LECTURA, localhost, auth por token. ────────
const TEK_BASE = (envDe('TEK_API_BASE') || 'http://127.0.0.1:7692').replace(/\/+$/, '')
function tekToken() {
  if (process.env.TEK_API_TOKEN) return process.env.TEK_API_TOKEN
  try { return readFileSync(join(__dirname, '..', 'conector-tek', 'data', '.api-token'), 'utf8').trim() } catch { return '' }
}
// Empresas servidas por tek (RUT normalizado → nombre). Crece con el widget de conexión.
const TEK_EMPRESAS = { '772711212': 'ANA CLARA SPA' }
// Ruteamos a tek si la empresa es una servida por tek. Sin rut → default a tek (ANA CLARA).
const enTek = (rut) => !rut || !!TEK_EMPRESAS[normRut(rut)]

async function tekGet(path) {
  const r = await fetch(`${TEK_BASE}${path}`, { headers: { 'x-api-token': tekToken() } })
  const txt = await r.text()
  let j; try { j = JSON.parse(txt) } catch { throw new Error(`tek-api respondió no-JSON (HTTP ${r.status}): ${txt.slice(0, 120)}`) }
  if (r.status >= 400) throw new Error(`tek-api HTTP ${r.status}: ${j.error || txt.slice(0, 120)}`)
  return j
}

// Montos de tek: vienen en unidades ENTERAS de la moneda (pesos para CLP, dólares para
// USD), NO en minor units → NO usamos fmt() (que divide por 100 en USD/EUR).
function fmtTek(amount, moneda = 'CLP') {
  const mon = (moneda || 'CLP').toUpperCase()
  const v = Number(amount || 0)
  const dec = mon === 'CLP' ? 0 : 2
  const s = Math.abs(v).toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  return (v < 0 ? '-' : '') + (mon === 'CLP' ? '$' + s : s + ' ' + mon)
}

async function tekSaldos() {
  const d = await tekGet('/saldos')
  const cuentas = (d.cuentas || []).map((c) => {
    const bal = Number(c.balance || 0), mon = c.moneyType || 'CLP'
    return {
      banco: 'Santander', rut: '77.271.121-2', cuenta: c.accountType, tipo: 'cuenta', moneda: mon, numero: c.accountNumber,
      disponible: bal, disponible_fmt: fmtTek(bal, mon),
      actual: bal, actual_fmt: fmtTek(bal, mon),
      ...(c.creditLine ? { linea_credito: Number(c.creditLine), linea_credito_fmt: fmtTek(Number(c.creditLine), mon) } : {}),
    }
  })
  const totalCLP = (d.cuentas || []).filter((c) => (c.moneyType || 'CLP') === 'CLP').reduce((s, c) => s + Number(c.balance || 0), 0)
  return {
    conexiones: [{ banco: 'Santander', estado: 'active', ultima_sync: d.actualizado }],
    cuentas, total_disponible_clp: totalCLP, total_disponible_clp_fmt: fmtTek(totalCLP, 'CLP'),
    fuente: 'tek', nota: 'total_disponible_clp = cuentas CLP.',
  }
}

async function tekMovimientos({ buscar, desde, hasta, limite = 30 } = {}) {
  const qs = new URLSearchParams()
  if (desde) qs.set('desde', desde); if (hasta) qs.set('hasta', hasta); if (buscar) qs.set('q', buscar)
  const d = await tekGet('/movimientos' + (qs.toString() ? '?' + qs.toString() : ''))
  const movs = (d.movimientos || []).map((m) => {
    const monto = Number(m.abono || 0) - Number(m.cargo || 0)   // ingreso +, egreso −
    return {
      fecha: m.fecha, descripcion: m.descripcion, tipo: null,
      monto_fmt: fmtTek(monto, 'CLP'), monto, signo: monto < 0 ? 'egreso' : 'ingreso',
      estado: 'confirmado', banco: 'Santander', cuenta: m.cuenta, ultimos4: String(m.cuenta || '').slice(-4),
    }
  })
  const total = movs.length
  return { total_encontrados: total, mostrando: Math.min(total, Number(limite) || 30), movimientos: movs.slice(0, Number(limite) || 30), fuente: 'tek' }
}

async function tekResumen({ anio } = {}) {
  const d = await tekGet('/movimientos?desde=' + (anio ? `${anio}-01-01` : '2026-01-01'))
  const porMes = new Map()
  for (const m of d.movimientos || []) {
    const f = String(m.fecha || '').slice(0, 10); if (!f) continue
    const mes = f.slice(0, 7)
    const r = porMes.get(mes) || { mes, moneda: 'CLP', ingresos: 0, egresos: 0, n: 0 }
    r.ingresos += Number(m.abono || 0); r.egresos += Number(m.cargo || 0); r.n++
    porMes.set(mes, r)
  }
  const filas = [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes)).map((r) => ({
    ...r, neto: r.ingresos - r.egresos,
    ingresos_fmt: fmtTek(r.ingresos, 'CLP'), egresos_fmt: fmtTek(r.egresos, 'CLP'), neto_fmt: fmtTek(r.ingresos - r.egresos, 'CLP'),
  }))
  return { resumen_mensual: filas, fuente: 'tek' }
}

const tekLink = (d) => ({ id: 'tek-ana-clara', banco: 'Santander', rut: '77.271.121-2', tipo_titular: 'company', estado: 'active', sana: true, ultima_sync: d?.actualizado || null, error: null, fuente: 'tek' })

// GET a Rail. Respeta el rate limit (429 → espera y reintenta, nunca < 5s).
async function rail(path) {
  if (!SK) throw new Error('Falta RAIL_SECRET_KEY en ~/nexus/.env (la llave rail_sk_live_… de Rail).')
  for (let intento = 0; intento < 3; intento++) {
    const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${SK}` } })
    if (r.status === 429) {
      const espera = Math.max(Number(r.headers.get('Retry-After') || 5), 5)
      await new Promise((res) => setTimeout(res, espera * 1000))
      continue
    }
    const txt = await r.text()
    let j
    try { j = JSON.parse(txt) } catch { throw new Error(`Rail respondió no-JSON (HTTP ${r.status}): ${txt.slice(0, 120)}`) }
    if (r.status === 401) throw new Error('Rail rechazó la credencial (401): RAIL_SECRET_KEY inválida.')
    if (j?.error) throw new Error(`Rail: ${j.error.message || j.error.code}`)
    return Array.isArray(j) ? j : (j.data ?? j)
  }
  throw new Error('Rail está limitando las consultas (429). Reintenta en un minuto.')
}

// ── Links (conexiones bancarias) ──────────────────────────────────────
export async function links() {
  const out = []
  // tek (nuestras conexiones: hoy ANA CLARA) — best-effort, no rompe si no responde.
  try { const d = await tekGet('/saldos'); out.push(tekLink(d)) } catch { /* tek abajo */ }
  // Rail (resto de empresas) — best-effort: si no hay SK o está caído, seguimos con tek.
  try {
    const ls = await rail('/v1/links')
    for (const l of ls || []) out.push({
      id: l.id, banco: l.institution?.name || l.institution?.id, rut: l.holder_id, tipo_titular: l.holder_type,
      estado: l.status, sana: l.status === 'active', ultima_sync: l.last_sync_at,
      error: l.last_error || null, accion_requerida: l.required_action || null, pausada: l.is_paused || false,
    })
  } catch { /* Rail sin SK o caído → solo tek */ }
  return out
}

// Empresas = RUTs titulares con banco conectado (Rail ya trae el RUT).
export async function empresas() {
  const ls = await links()
  const porRut = new Map()
  for (const l of ls) {
    const k = normRut(l.rut)
    const e = porRut.get(k) || { rut: l.rut, bancos: [], conexiones_sanas: 0, conexiones_con_problema: 0 }
    e.bancos.push({ banco: l.banco, estado: l.estado, ultima_sync: l.ultima_sync })
    if (l.sana) e.conexiones_sanas++; else e.conexiones_con_problema++
    porRut.set(k, e)
  }
  return { empresas: [...porRut.values()], nota: 'El RUT es el titular de la conexión bancaria (holder_id de Rail).' }
}

function filtrarLinks(ls, { rut, banco }) {
  let out = ls
  if (rut) { const q = normRut(rut); out = out.filter((l) => normRut(l.rut) === q) }
  if (banco) { const q = String(banco).toLowerCase(); out = out.filter((l) => String(l.banco || '').toLowerCase().includes(q)) }
  return out
}

async function cuentasDe(ls) {
  const out = []
  for (const l of ls) {
    let accs = []
    try { accs = await rail(`/v1/accounts?link_id=${encodeURIComponent(l.id)}`) } catch { accs = [] }
    for (const a of accs || []) {
      if (a.status && a.status !== 'active') continue
      out.push({ ...a, _banco: l.banco, _rut: l.rut, _link: l.id })
    }
  }
  return out
}

// ── Saldos ────────────────────────────────────────────────────────────
export async function saldos({ rut, banco } = {}) {
  if (enTek(rut) && (!banco || /santander/i.test(String(banco)))) {
    try { return await tekSaldos() } catch (e) { if (!SK) return { error: `No pude leer el banco (tek): ${e.message}` } }
  }
  const ls = filtrarLinks(await links(), { rut, banco })
  if (!ls.length) return { error: `No hay conexión bancaria para ${rut || banco || 'ese filtro'}. Usa accion:empresas para ver las disponibles.` }
  const accs = await cuentasDe(ls)
  const cuentas = accs.map((a) => {
    const b = a.balance || {}
    const esTarjeta = a.type === 'credit_card'
    return {
      banco: a._banco, rut: a._rut, cuenta: a.name || a.official_name, tipo: a.type,
      moneda: a.currency, ultimos4: a.last_4,
      disponible: b.available, disponible_fmt: fmt(b.available, a.currency),
      actual: b.current, actual_fmt: fmt(b.current, a.currency),
      ...(esTarjeta ? { cupo_total: b.limit, cupo_total_fmt: fmt(b.limit, a.currency), nota: 'Tarjeta: "disponible" es cupo libre, "actual" es la deuda.' } : {}),
      actualizado: a.refreshed_at,
    }
  })
  // Total en caja = solo cuentas CLP que NO son tarjeta (el cupo no es plata tuya).
  const totalCLP = accs
    .filter((a) => (a.currency || 'CLP') === 'CLP' && a.type !== 'credit_card')
    .reduce((s, a) => s + Number(a.balance?.available || 0), 0)
  return {
    conexiones: ls.map((l) => ({ banco: l.banco, estado: l.estado, ultima_sync: l.ultima_sync })),
    cuentas,
    total_disponible_clp: totalCLP,
    total_disponible_clp_fmt: fmt(totalCLP, 'CLP'),
    nota: 'total_disponible_clp = cuentas CLP, SIN contar cupos de tarjeta.',
  }
}

// ── Movimientos ───────────────────────────────────────────────────────
async function movsDeCuenta(accId, maxPag = 4) {
  let out = []
  for (let p = 1; p <= maxPag; p++) {
    let ms = []
    try { ms = await rail(`/v1/accounts/${encodeURIComponent(accId)}/movements?page=${p}&confirmed_only=false`) } catch { break }
    if (!ms?.length) break
    out = out.concat(ms)
    if (ms.length < 30) break
  }
  return out
}

const fechaMov = (m) => String(m.post_date || m.transaction_date || m.date || m.created_at || '').slice(0, 10)

export async function movimientos({ rut, banco, buscar, desde, hasta, limite = 30 } = {}) {
  if (enTek(rut) && (!banco || /santander/i.test(String(banco)))) {
    try { return await tekMovimientos({ buscar, desde, hasta, limite }) } catch (e) { if (!SK) return { error: `No pude leer movimientos (tek): ${e.message}` } }
  }
  const ls = filtrarLinks(await links(), { rut, banco })
  if (!ls.length) return { error: `No hay conexión bancaria para ${rut || banco || 'ese filtro'}. Usa accion:empresas.` }
  const accs = await cuentasDe(ls)
  let todos = []
  for (const a of accs) {
    const ms = await movsDeCuenta(a.id)
    todos = todos.concat(ms.map((m) => ({ ...m, _cuenta: a.name || a.official_name, _last4: a.last_4, _banco: a._banco })))
  }
  if (buscar) {
    const q = String(buscar).toLowerCase()
    todos = todos.filter((m) => `${m.description || ''} ${m.type || ''}`.toLowerCase().includes(q))
  }
  if (desde) todos = todos.filter((m) => fechaMov(m) >= desde)
  if (hasta) todos = todos.filter((m) => fechaMov(m) <= hasta)
  todos.sort((a, b) => fechaMov(b).localeCompare(fechaMov(a)))
  const total = todos.length
  return {
    total_encontrados: total,
    mostrando: Math.min(total, Number(limite) || 30),
    movimientos: todos.slice(0, Number(limite) || 30).map((m) => ({
      fecha: fechaMov(m), descripcion: m.description, tipo: m.type,
      monto_fmt: fmt(m.amount, m.currency), monto: m.amount,
      signo: (m.direction === 'outbound' || Number(m.amount) < 0) ? 'egreso' : 'ingreso',
      estado: m.status, banco: m._banco, cuenta: m._cuenta, ultimos4: m._last4,
    })),
  }
}

// ── Resumen por mes ───────────────────────────────────────────────────
export async function resumen({ rut, banco, anio } = {}) {
  if (enTek(rut) && (!banco || /santander/i.test(String(banco)))) {
    try { return await tekResumen({ anio }) } catch (e) { if (!SK) return { error: `No pude armar el resumen (tek): ${e.message}` } }
  }
  const ls = filtrarLinks(await links(), { rut, banco })
  if (!ls.length) return { error: `No hay conexión bancaria para ${rut || banco || 'ese filtro'}. Usa accion:empresas.` }
  const accs = await cuentasDe(ls)
  const porMes = new Map()
  for (const a of accs) {
    for (const m of await movsDeCuenta(a.id)) {
      const f = fechaMov(m)
      if (!f) continue
      if (anio && !f.startsWith(String(anio))) continue
      const mes = f.slice(0, 7), cur = m.currency || 'CLP', k = `${mes}_${cur}`
      const r = porMes.get(k) || { mes, moneda: cur, ingresos: 0, egresos: 0, n: 0 }
      const amt = Number(m.amount || 0)
      if (amt >= 0) r.ingresos += amt; else r.egresos += Math.abs(amt)
      r.n++
      porMes.set(k, r)
    }
  }
  const filas = [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes)).map((r) => ({
    ...r, neto: r.ingresos - r.egresos,
    ingresos_fmt: fmt(r.ingresos, r.moneda), egresos_fmt: fmt(r.egresos, r.moneda),
    neto_fmt: fmt(r.ingresos - r.egresos, r.moneda),
  }))
  return { resumen_mensual: filas }
}

// ── CLI ───────────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('banco.mjs')) {
  const [, , cmd, ...rest] = process.argv
  const arg = (n) => { const i = rest.indexOf('--' + n); return i >= 0 ? rest[i + 1] : undefined }
  const opts = { rut: arg('rut'), banco: arg('banco'), anio: arg('anio'), buscar: arg('buscar'),
                 desde: arg('desde'), hasta: arg('hasta'), limite: arg('limite') }
  const fns = { empresas, conexiones: links, saldos, movimientos, resumen }
  const fn = fns[cmd]
  if (!fn) {
    console.log(JSON.stringify({ error: 'Comando desconocido', comandos: Object.keys(fns) }, null, 2)); process.exit(1)
  }
  try { console.log(JSON.stringify(await fn(opts), null, 2)) }
  catch (e) { console.log(JSON.stringify({ error: e.message }, null, 2)); process.exit(1) }
}

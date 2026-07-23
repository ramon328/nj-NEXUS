// Conector BANCO — agente "Leo". Consulta las cuentas bancarias REALES.
//
// FUENTE ÚNICA = NUESTRA API tek (Santander Empresa, localhost, SOLO LECTURA).
// Rail quedó FUERA de Nexus (23-jul, pedido de Ramón): ya no consultamos rail.cl ni
// dependemos de RAIL_SECRET_KEY. Todo sale de:
//   - la bóveda cifrada por usuario (credenciales.mjs) → qué empresas tiene conectadas
//     CADA usuario (las que vinculó por el widget).
//   - la tek-api (http://127.0.0.1:7692) → saldos/movimientos REALES. Hoy sirve
//     ANA CLARA (la conexión leíble). Las demás empresas quedan "lectura pendiente"
//     (vinculadas, pero falta habilitar la lectura por-empresa, que hace un login al
//     banco por empresa; se construye aparte para no machacar el antifraude).
//
// ⚠️ SOLO LECTURA — POR DISEÑO. Este módulo NUNCA mueve plata ni toca conexiones.
//
// CLI:
//   node banco.mjs empresas   --user nico
//   node banco.mjs saldos     [--rut 77271121-2]
//   node banco.mjs movimientos [--buscar copec] [--desde 2026-07-01] [--limite 30]
//   node banco.mjs resumen    [--anio 2026]

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cred from '../conector-tek/credenciales.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

function envDe(clave) {
  if (process.env[clave]) return process.env[clave]
  try {
    const txt = readFileSync(join(__dirname, '..', '.env'), 'utf8')
    const m = txt.match(new RegExp('^' + clave + '=(.*)$', 'm'))
    return m ? m[1].trim() : ''
  } catch { return '' }
}

const normRut = (r) => String(r || '').replace(/[.\-\s]/g, '').toUpperCase()
const RUT_ANA_CLARA = '772711212'
// ¿La empresa/rut pedida es ANA CLARA? (la única que la tek-api lee HOY). Match por RUT
// tributario de ANA CLARA o por nombre (en la bóveda el rut es el de login, no el de la empresa).
const esAnaClara = (rut, empresa) => (rut && normRut(rut) === RUT_ANA_CLARA) || /ana\s*clara/i.test(String(empresa || ''))

// ── tek-api (nuestra API propia — SOLO LECTURA, localhost, auth por token) ─────────
const TEK_BASE = (envDe('TEK_API_BASE') || 'http://127.0.0.1:7692').replace(/\/+$/, '')
function tekToken() {
  if (process.env.TEK_API_TOKEN) return process.env.TEK_API_TOKEN
  try { return readFileSync(join(__dirname, '..', 'conector-tek', 'data', '.api-token'), 'utf8').trim() } catch { return '' }
}
async function tekGet(path) {
  const r = await fetch(`${TEK_BASE}${path}`, { headers: { 'x-api-token': tekToken() } })
  const txt = await r.text()
  let j; try { j = JSON.parse(txt) } catch { throw new Error(`tek-api respondió no-JSON (HTTP ${r.status}): ${txt.slice(0, 120)}`) }
  if (r.status >= 400) throw new Error(`tek-api HTTP ${r.status}: ${j.error || txt.slice(0, 120)}`)
  return j
}

// Montos de tek: unidades ENTERAS de la moneda (pesos para CLP). NO son minor units.
export function fmt(amount, moneda = 'CLP') {
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
      banco: 'Santander', rut: '77.271.121-2', empresa: 'ANA CLARA SPA', cuenta: c.accountType, tipo: 'cuenta', moneda: mon, numero: c.accountNumber,
      disponible: bal, disponible_fmt: fmt(bal, mon),
      actual: bal, actual_fmt: fmt(bal, mon),
      ...(c.creditLine ? { linea_credito: Number(c.creditLine), linea_credito_fmt: fmt(Number(c.creditLine), mon) } : {}),
    }
  })
  const totalCLP = (d.cuentas || []).filter((c) => (c.moneyType || 'CLP') === 'CLP').reduce((s, c) => s + Number(c.balance || 0), 0)
  return {
    empresa: 'ANA CLARA SPA', conexiones: [{ banco: 'Santander', empresa: 'ANA CLARA SPA', estado: 'active', ultima_sync: d.actualizado }],
    cuentas, total_disponible_clp: totalCLP, total_disponible_clp_fmt: fmt(totalCLP, 'CLP'),
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
      monto_fmt: fmt(monto, 'CLP'), monto, signo: monto < 0 ? 'egreso' : 'ingreso',
      estado: 'confirmado', banco: 'Santander', empresa: 'ANA CLARA SPA', cuenta: m.cuenta, ultimos4: String(m.cuenta || '').slice(-4),
    }
  })
  const total = movs.length
  return { empresa: 'ANA CLARA SPA', total_encontrados: total, mostrando: Math.min(total, Number(limite) || 30), movimientos: movs.slice(0, Number(limite) || 30), fuente: 'tek' }
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
    ingresos_fmt: fmt(r.ingresos, 'CLP'), egresos_fmt: fmt(r.egresos, 'CLP'), neto_fmt: fmt(r.ingresos - r.egresos, 'CLP'),
  }))
  return { empresa: 'ANA CLARA SPA', resumen_mensual: filas, fuente: 'tek' }
}

// Mensaje honesto para una empresa vinculada pero cuya lectura aún no está habilitada.
function lecturaPendiente(empresa, rut) {
  return { error: `La empresa ${empresa || rut || 'pedida'} está VINCULADA en Nexus, pero todavía no tengo habilitada la lectura de sus saldos/movimientos por nuestra API (eso requiere un login al banco por empresa, que se está construyendo). Hoy la única empresa con lectura en vivo es ANA CLARA.`, lectura: 'pendiente' }
}

// ── Conexiones (SALUD) — de NUESTRA bóveda, por usuario ────────────────
export async function links({ userId } = {}) {
  const out = []
  // ANA CLARA: la conexión que SÍ se lee hoy (tek-api). Best-effort.
  let anaViva = false
  try { const d = await tekGet('/saldos'); out.push({ id: 'tek-ana-clara', banco: 'Santander', empresa: 'ANA CLARA SPA', rut: '77.271.121-2', estado: 'active', sana: true, lectura: 'disponible', ultima_sync: d?.actualizado || null, fuente: 'tek' }); anaViva = true } catch { /* tek abajo */ }
  // Empresas que ESTE usuario vinculó por el widget (bóveda cifrada).
  for (const c of (userId ? cred.listar(userId) : [])) {
    if (anaViva && esAnaClara(null, c.empresa)) continue   // ANA CLARA ya está arriba (leíble)
    out.push({ id: 'vault', banco: c.banco, empresa: c.empresa, rut: c.rut, estado: 'active', sana: true, lectura: 'pendiente', fuente: 'vault' })
  }
  return out
}

// ── Empresas con banco conectado ──────────────────────────────────────
export async function empresas({ userId } = {}) {
  const ls = await links({ userId })
  return {
    empresas: ls.map((l) => ({ empresa: l.empresa, rut: l.rut, banco: l.banco, lectura: l.lectura })),
    fuente: 'tek',
    nota: 'Empresas conectadas al banco. "lectura: disponible" = puedo darte saldos/movimientos ya; "pendiente" = está vinculada pero la lectura por-empresa aún no está habilitada.',
  }
}

// ── Saldos ────────────────────────────────────────────────────────────
export async function saldos({ userId, rut, banco, empresa } = {}) {
  if (esAnaClara(rut, empresa) || (!rut && !empresa)) {
    if (!banco || /santander/i.test(String(banco))) {
      try { return await tekSaldos() } catch (e) { return { error: `No pude leer el banco (tek): ${e.message}` } }
    }
  }
  return lecturaPendiente(empresa, rut)
}

// ── Movimientos ───────────────────────────────────────────────────────
export async function movimientos({ userId, rut, banco, empresa, buscar, desde, hasta, limite = 30 } = {}) {
  if (esAnaClara(rut, empresa) || (!rut && !empresa)) {
    if (!banco || /santander/i.test(String(banco))) {
      try { return await tekMovimientos({ buscar, desde, hasta, limite }) } catch (e) { return { error: `No pude leer movimientos (tek): ${e.message}` } }
    }
  }
  return lecturaPendiente(empresa, rut)
}

// ── Resumen por mes ───────────────────────────────────────────────────
export async function resumen({ userId, rut, banco, empresa, anio } = {}) {
  if (esAnaClara(rut, empresa) || (!rut && !empresa)) {
    if (!banco || /santander/i.test(String(banco))) {
      try { return await tekResumen({ anio }) } catch (e) { return { error: `No pude armar el resumen (tek): ${e.message}` } }
    }
  }
  return lecturaPendiente(empresa, rut)
}

// ── CLI ───────────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('banco.mjs')) {
  const [, , cmd, ...rest] = process.argv
  const arg = (n) => { const i = rest.indexOf('--' + n); return i >= 0 ? rest[i + 1] : undefined }
  const opts = { userId: arg('user'), rut: arg('rut'), banco: arg('banco'), empresa: arg('empresa'), anio: arg('anio'), buscar: arg('buscar'),
                 desde: arg('desde'), hasta: arg('hasta'), limite: arg('limite') }
  const fns = { empresas, conexiones: links, saldos, movimientos, resumen }
  const fn = fns[cmd]
  if (!fn) {
    console.log(JSON.stringify({ error: 'Comando desconocido', comandos: Object.keys(fns) }, null, 2)); process.exit(1)
  }
  try { console.log(JSON.stringify(await fn(opts), null, 2)) }
  catch (e) { console.log(JSON.stringify({ error: e.message }, null, 2)); process.exit(1) }
}

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
import { writeFileSync, statSync, existsSync, unlinkSync } from 'node:fs'
import { spawn } from 'node:child_process'
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

// Cuánto puede tener el dato antes de ir a buscar lo nuevo al banco (default 3 h).
const MOVS_FRESH_MS = (Number(envDe('TEK_MOVS_FRESH_MIN')) || 180) * 60_000
// Mínimo entre dos intentos de entrar al banco a refrescar movimientos (candado anti-quemado).
const MOVS_GAP_MS = (Number(envDe('TEK_MOVS_REFRESCO_GAP_MIN')) || 30) * 60_000

// MOVIMIENTOS DE ANA CLARA. Antes esto era caché PURA: devolvía lo último capturado sin ir
// nunca a buscar lo nuevo y —peor— SIN DECIR de cuándo era el dato. El 19-08-2026 Joaquín
// pidió "los últimos movimientos" y se le mostraron los del 10-08 como si fueran de hoy: 9
// días de atraso invisibles, con pagos reales del 17 y 18 que no aparecían. En plata, un dato
// viejo presentado como actual es peor que no tener dato.
// Ahora: (1) si lo guardado está viejo se entra al banco a buscar lo nuevo —igual que hacen
// las demás empresas—, y (2) la respuesta SIEMPRE dice a qué fecha están los datos, aunque el
// refresco no haya podido entrar.
async function tekMovimientos({ buscar, desde, hasta, limite = 30, refrescar = true } = {}) {
  const pedir = async () => {
    const qs = new URLSearchParams()
    if (desde) qs.set('desde', desde); if (hasta) qs.set('hasta', hasta); if (buscar) qs.set('q', buscar)
    return tekGet('/movimientos' + (qs.toString() ? '?' + qs.toString() : ''))
  }
  let d = await pedir()
  const tsDe = (x) => Date.parse(String(x || '')) || 0
  let refresco = null
  // ⛔ CANDADO ANTI-QUEMADO: preguntar por los movimientos NO puede gatillar un login cada
  // vez. Si cinco personas preguntan cinco veces, son cinco logins y Santander marca la
  // cuenta. Se intenta como mucho uno cada MOVS_GAP_MS (default 30 min), lo consiga o no.
  const selloRefresco = join(TEK_DIR, 'data', '.ultimo-refresco-movs')
  const ultimoIntento = (() => { try { return Number(readFileSync(selloRefresco, 'utf8').trim()) || 0 } catch { return 0 } })()
  const puedeIntentar = (Date.now() - ultimoIntento) >= MOVS_GAP_MS
  if (refrescar && !puedeIntentar && (Date.now() - tsDe(d.actualizado)) >= MOVS_FRESH_MS) refresco = 'en_espera'
  if (refrescar && puedeIntentar && (Date.now() - tsDe(d.actualizado)) >= MOVS_FRESH_MS) {
    try { writeFileSync(selloRefresco, String(Date.now())) } catch { /* */ }
    // Misma vía que el resto de las empresas: lector rápido por endpoint y, si la sesión está
    // muerta, el camino largo (que sí puede loguear). Si no entra, seguimos con lo guardado.
    try { refresco = (await movimientosEmpresaVivo('ANA CLARA SPA')) ? 'ok' : 'no_entro' }
    catch { refresco = 'no_entro' }
    if (refresco === 'ok') { try { d = await pedir() } catch { /* nos quedamos con lo que había */ } }
    // Marca "quedó pendiente traer lo nuevo": es lo que mira el reintentador de login para
    // saber si HACE FALTA volver a entrar. Si el refresco entró, se borra — así el reintento
    // no gasta logins por una consulta que ya quedó servida con datos frescos.
    const marca = join(TEK_DIR, 'data', '.movs-pendiente-refresco')
    try { if (refresco === 'ok') { if (existsSync(marca)) unlinkSync(marca) } else writeFileSync(marca, String(Date.now())) } catch { /* */ }
  }
  const movs = (d.movimientos || []).map((m) => {
    const monto = Number(m.abono || 0) - Number(m.cargo || 0)   // ingreso +, egreso −
    return {
      fecha: m.fecha, descripcion: m.descripcion, tipo: null,
      monto_fmt: fmt(monto, 'CLP'), monto, signo: monto < 0 ? 'egreso' : 'ingreso',
      estado: 'confirmado', banco: 'Santander', empresa: 'ANA CLARA SPA', cuenta: m.cuenta, ultimos4: String(m.cuenta || '').slice(-4),
    }
  })
  // Si el refresco entró pero la API todavía no lo tiene (escribe en otro archivo), sumamos
  // los movimientos recientes de la caché de empresa: lo que importa es que NO falte nada.
  const cEmp = leerMovsCache('ANA CLARA SPA')
  if (Array.isArray(cEmp?.movimientos)) {
    // SOLO lo POSTERIOR a lo que ya trae el acumulador. Mezclar los dos históricos completos
    // duplicaba movimientos (los dos formatos escriben la glosa distinto y el dedup no los
    // reconocía): al usuario le aparecían dos veces el mismo Uber. Lo que falta es lo NUEVO.
    const tope = movs.reduce((a, m) => (String(m.fecha || '') > a ? String(m.fecha || '') : a), '')
    const clave = (m) => `${String(m.fecha || '').slice(0, 10)}|${String(m.descripcion || '').replace(/\s+/g, ' ').trim().toLowerCase()}|${m.monto}`
    const yaEstan = new Set(movs.map(clave))
    for (const m of cEmp.movimientos.map((x) => mapMovEmpresa(x, 'ANA CLARA SPA'))) {
      if (tope && String(m.fecha || '').slice(0, 10) <= tope.slice(0, 10)) continue
      if (!yaEstan.has(clave(m))) { movs.push({ ...m, ultimos4: String(m.cuenta || '').slice(-4) }); yaEstan.add(clave(m)) }
    }
  }
  movs.sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')))
  const total = movs.length
  // A qué fecha están los datos de verdad = el movimiento más nuevo que tenemos.
  const ultimaFecha = movs.length ? String(movs[0].fecha || '').slice(0, 10) : null
  const hoyCL = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const diasAtraso = ultimaFecha ? Math.round((Date.parse(hoyCL) - Date.parse(ultimaFecha)) / 86400000) : null
  const desactualizado = diasAtraso != null && diasAtraso >= 2
  return {
    empresa: 'ANA CLARA SPA', total_encontrados: total, mostrando: Math.min(total, Number(limite) || 30),
    movimientos: movs.slice(0, Number(limite) || 30), fuente: 'tek',
    datos_al: ultimaFecha, dias_atraso: diasAtraso, actualizado: d.actualizado || null,
    refresco: refresco === 'ok' ? 'entré al banco y traje lo último'
      : refresco === 'no_entro' ? 'no pude entrar al banco ahora (sesión dormida): esto es lo último guardado'
      : refresco === 'en_espera' ? 'hace poco ya intenté entrar al banco y no se pudo; espero un rato antes de reintentar (candado anti-bloqueo)'
      : 'dato reciente, no hizo falta entrar al banco',
    desactualizado,
    instruccion: desactualizado
      ? `⚠️ OBLIGATORIO: estos movimientos llegan hasta el ${ultimaFecha} (${diasAtraso} días de atraso) porque no se pudo entrar al banco. DÍSELO AL USUARIO ARRIBA DE TODO, antes de la lista, con esas palabras. ⛔ NUNCA los presentes como "los últimos movimientos" a secas ni afirmes que después de esa fecha no hubo movimientos: no lo sabes. Ofrécele avisarle cuando la sesión del banco despierte.`
      : `Los datos llegan hasta el ${ultimaFecha || 'la última captura'}. Menciónalo al pasar (ej. "al ${ultimaFecha}") para que se sepa a qué fecha están.`,
  }
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

// ── LECTURA POR EMPRESA (CUALQUIERA vinculada, vía la sesión de su dueño) ──────────
// Cache-first: sirve el último saldo al instante (data/emp-<slug>.json) y lo refresca en
// vivo con la sesión del dueño (que el corazón mantiene; si está dormida, se activa on-
// demand con 1 login). Así CUALQUIER empresa —incluidas las NUEVAS que se vinculen— da
// datos sola, sin depender de nadie ni de config manual.
const TEK_DIR = join(__dirname, '..', 'conector-tek')
const EMP_FRESH_MS = (Number(envDe('TEK_EMP_FRESH_MIN')) || 240) * 60_000
// Ventana en la que se prefiere el dato guardado ANTES que gastar un login, cuando la sesión
// está dormida. Solo aplica si la sesión NO está viva: con sesión viva se lee en vivo igual,
// porque leer no cuesta nada.
const GRACIA_SIN_LOGIN_MS = (Number(envDe('TEK_GRACIA_SIN_LOGIN_MIN')) || 30) * 60_000
// ¿La sesión de esa persona está viva? Mismo criterio que la puerta (12 min de frescura del
// session-<user>.json). Si no se puede saber, se asume MUERTA: preferir el caché es lo seguro.
function sesionViva(user) {
  try {
    const slug = String(user || 'ramon').toLowerCase().replace(/[^a-z0-9]/g, '')
    const f = join(TEK_DIR, slug === 'ramon' ? 'session.json' : `session-${slug}.json`)
    return Date.now() - statSync(f).mtimeMs < 12 * 60_000
  } catch { return false }
}
// Marca de tiempo SIEMPRE en hora de Chile y ya formateada. Nunca se entrega ISO con "Z":
// el modelo la mostraba tal cual y salían 4 horas de más (Ramón vio "05:00 hrs" a la 1:00 AM).
const tsCL = (t) => (t ? new Date(t).toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' }) : undefined)
const empSlug = (e) => String(e || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const empCacheFile = (e) => join(TEK_DIR, 'data', `emp-${empSlug(e)}.json`)
function leerEmpCache(e) { try { return JSON.parse(readFileSync(empCacheFile(e), 'utf8')) } catch { return null } }

// Lanza leer-saldos.mjs para UNA empresa (reusa la sesión del dueño; on-demand login si duerme).
function runLeerSaldos(user, empresa, { movs = false } = {}) {
  return new Promise((resolve) => {
    // Con movs:true además trae los movimientos recientes (TEK_LEER_MOVS) acotados a 7 días
    // (TEK_DESDE): sin acotar, el lector pide 4 tramos mensuales y tarda de más.
    const env = { ...process.env }
    if (movs) {
      env.TEK_LEER_MOVS = '1'
      const d = new Date(Date.now() - 7 * 864e5)
      env.TEK_DESDE = d.toISOString().slice(0, 10)
    }
    const h = spawn(process.execPath, [join(TEK_DIR, 'leer-saldos.mjs'), '--user', user, '--empresas', empresa], { cwd: TEK_DIR, env })
    let out = ''
    h.stdout.on('data', (d) => { out += d }); h.stderr.on('data', () => {})
    // 60s NO alcanzaba para el caso FRÍO y era un corte a ciegas: medido el 11-08-2026,
    // un login en frío tarda 70-90s, así que la lectura se mataba SIEMPRE justo antes de
    // entregar y caía al caché ("no pude refrescar en vivo"). Con la sesión ya establecida
    // la misma lectura tarda 29s. 150s cubre el frío sin dejar el proceso colgado.
    // Ajustable con TEK_LECTURA_TIMEOUT_MS.
    const TOPE_LECTURA = Number(process.env.TEK_LECTURA_TIMEOUT_MS) || 150_000
    const kill = setTimeout(() => { try { h.kill('SIGKILL') } catch { /* */ } }, TOPE_LECTURA)
    h.on('exit', () => { clearTimeout(kill); try { const j = JSON.parse(out); resolve({ ok: j.ok, empresa: (j.empresas || [])[0], estado_login: j.estado_login }) } catch { resolve({ ok: false }) } })
  })
}

// Saldo de una empresa: cache si está fresco; si no, refresca en vivo y cachea; si el banco
// no responde, sirve el último dato conocido (marcado). NUNCA queda sin dato si ya lo leyó una vez.
async function saldoEmpresa(empresa) {
  const cached = leerEmpCache(empresa)
  if (cached && Date.now() - (cached._ts || 0) < EMP_FRESH_MS) return { ...cached, _fuente: 'cache' }
  const owner = cred.dueñoDeEmpresa(empresa)
  if (!owner) return cached ? { ...cached, _stale: true } : { error: `"${empresa}" no está conectada a ninguna sesión de banco.` }
  // 💤 NO QUEMAR UN LOGIN POR UN DATO DE HACE UN RATO (11-08-2026, pedido de Ramón).
  // Si la sesión está MUERTA (habría que loguear) pero lo guardado tiene menos de
  // GRACIA_SIN_LOGIN, se sirve eso. Un saldo de hace 20 min casi nunca cambia la decisión
  // de quien pregunta, y un login sí cuesta: cupo (4/hora) y riesgo de rebote del antifraude.
  // Si el dato es más viejo que eso, ahí sí vale la pena entrar.
  if (!sesionViva(owner) && cached && Date.now() - (cached._ts || 0) < GRACIA_SIN_LOGIN_MS) {
    const min = Math.round((Date.now() - (cached._ts || 0)) / 60000)
    return { ...cached, _fuente: 'cache', _sin_login: true,
      _nota: `dato de hace ${min} min. La sesión del banco está dormida y no la desperté por esto (un login se gasta y se puede quemar). Si necesitas el saldo AL SEGUNDO, pídemelo explícito y entro.` }
  }
  const r = await runLeerSaldos(owner, empresa)
  if (r.ok && r.empresa) {
    const out = { empresa, cuentas: r.empresa.cuentas || [], total_clp: r.empresa.total_clp || 0, _ts: Date.now(), _fuente: 'vivo' }
    try { writeFileSync(empCacheFile(empresa), JSON.stringify(out, null, 2)) } catch { /* */ }
    return out
  }
  if (cached) return { ...cached, _stale: true, _nota: 'no pude refrescar ahora (banco); te muestro el último dato conocido' }
  return { error: `No pude leer "${empresa}" ahora mismo (${r.estado_login || 'banco no disponible'}). Reintenta en un rato — su sesión se activa cuando la necesites.` }
}

// Saldo SOLO de caché (NUNCA abre el banco): para "todas" → instantáneo, jamás cuelga.
// Devuelve el último dato guardado (marcado _stale si ya pasó su frescura), o null si nunca
// se leyó esa empresa. Así "dame todos los saldos" no dispara 9 logins en serie.
function saldoEmpresaCache(empresa) {
  const cached = leerEmpCache(empresa)
  if (!cached) return null
  const fresco = Date.now() - (cached._ts || 0) < EMP_FRESH_MS
  return fresco ? { ...cached, _fuente: 'cache' } : { ...cached, _stale: true, _nota: 'último dato conocido (se refresca en la mañana o al consultar esa empresa puntual)' }
}

// ── MOVIMIENTOS / RESUMEN por empresa (desde el caché emp-<slug>-movs.json, que refresca
//    el lector cada mañana con TEK_LEER_MOVS). Mismo trato que la cartola de ANA CLARA. ──
const movsCacheFile = (e) => join(TEK_DIR, 'data', `emp-${empSlug(e)}-movs.json`)
function leerMovsCache(e) { try { return JSON.parse(readFileSync(movsCacheFile(e), 'utf8')) } catch { return null } }
function mapMovEmpresa(m, empresa) {
  // DOS FORMATOS conviven (11-08-2026): el lector viejo guarda abono/cargo por separado; el
  // lector por ENDPOINT (movs-rapido.mjs) guarda un solo "monto" ya con signo. Si solo se
  // miraba abono/cargo, los del endpoint salían TODOS en $0 — peor que no mostrarlos.
  const monto = (m.monto != null && m.abono == null && m.cargo == null)
    ? Number(m.monto || 0)
    : Number(m.abono || 0) - Number(m.cargo || 0)   // ingreso +, egreso −
  return { fecha: m.fecha, descripcion: m.descripcion, tipo: null, monto, monto_fmt: fmt(monto, 'CLP'), signo: monto < 0 ? 'egreso' : 'ingreso', estado: 'confirmado', banco: 'Santander', empresa, cuenta: m.cuenta, ...(m.documento ? { documento: m.documento } : {}) }
}
// LEE EN VIVO si lo guardado está viejo (11-08-2026). Antes esto era SOLO caché y el caché
// lo llenaba el cron de la mañana; al eliminarse los crons (decisión de Ramón: "que entre al
// banco enseguida"), los movimientos se habrían congelado para siempre. Ahora, si no hay
// dato o está más viejo que EMP_FRESH_MS, entra al banco igual que los saldos.
// Usa el LECTOR POR ENDPOINT (movs-rapido.mjs): cambia de empresa y pide el rango con una
// sola llamada. Medido el 11-08-2026: 0,4 s la lectura, ~31 s con cambio de empresa incluido,
// contra >150 s de la vía anterior (que además ni alcanzaba y caía al caché).
// Ese lector NO loguea a propósito: si la sesión está muerta devuelve sesion_muerta y acá se
// cae a la vía completa (que sí puede loguear), para no dejar al usuario sin dato.
function movimientosEmpresaVivo(empresa) {
  const owner = cred.dueñoDeEmpresa(empresa)
  if (!owner) return Promise.resolve(false)
  return new Promise((resolve) => {
    const h = spawn(process.execPath, [join(TEK_DIR, 'movs-rapido.mjs'), '--user', owner, '--empresa', empresa, '--dias', '30'], { cwd: TEK_DIR })
    let out = ''
    h.stdout.on('data', (d) => { out += d }); h.stderr.on('data', () => {})
    const kill = setTimeout(() => { try { h.kill('SIGKILL') } catch { /* */ } }, 120_000)
    h.on('exit', async () => {
      clearTimeout(kill)
      let j = null
      try { const m = out.match(/RESULTADO:\s*(\{[\s\S]*\})/); if (m) j = JSON.parse(m[1]) } catch { /* */ }
      if (j?.ok) return resolve(true)
      // Sesión dormida → el camino largo (puede loguear). Cualquier otro fallo NO se reintenta:
      // "empresa_equivocada" significa dato de otra empresa y hay que dejarlo pasar como error.
      if (j?.estado === 'sesion_muerta') {
        try { const r = await runLeerSaldos(owner, empresa, { movs: true }); return resolve(Boolean(r.ok)) } catch { return resolve(false) }
      }
      resolve(false)
    })
    h.on('error', () => resolve(false))
  })
}
async function movimientosEmpresa(empresa, { buscar, desde, hasta, limite = 30 } = {}) {
  let c = leerMovsCache(empresa)
  const viejo = !c || !Array.isArray(c.movimientos) || (Date.now() - (c._ts || 0) >= EMP_FRESH_MS)
  if (viejo) { try { if (await movimientosEmpresaVivo(empresa)) c = leerMovsCache(empresa) } catch { /* sirve lo que haya */ } }
  if (!c || !Array.isArray(c.movimientos)) return { error: `No pude leer los MOVIMIENTOS de ${empresa} del banco ahora (la sesión pudo no levantar). Reintenta en un momento; no tengo dato guardado de esa empresa.`, sin_cache: true }
  let movs = c.movimientos.slice()
  if (buscar) { const q = String(buscar).toLowerCase(); movs = movs.filter((m) => `${m.descripcion || ''}`.toLowerCase().includes(q)) }
  if (desde) movs = movs.filter((m) => (m.fecha || '') >= desde)
  if (hasta) movs = movs.filter((m) => (m.fecha || '') <= hasta)
  movs.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
  const total = movs.length
  // TOTALES CALCULADOS POR EL CÓDIGO, NO POR EL MODELO (11-08-2026). Al resumir movimientos
  // a mano, Nexus reportó "3x Global Card = $18.000.000" cuando eran 4 por $25.000.000: se
  // comió uno de $7 millones. En cifras financieras no se admite que el modelo sume de ojo.
  const mapeados = movs.map((m) => mapMovEmpresa(m, empresa))
  const ingresos = mapeados.filter((m) => m.monto > 0).reduce((a, m) => a + m.monto, 0)
  const egresos = mapeados.filter((m) => m.monto < 0).reduce((a, m) => a + m.monto, 0)
  // Agrupado por descripción normalizada: para que "3 transferencias de X" salga contado bien.
  const porGlosa = {}
  for (const m of mapeados) {
    const k = String(m.descripcion || '').replace(/^\d+\s*/, '').slice(0, 40).trim() || '(sin glosa)'
    if (!porGlosa[k]) porGlosa[k] = { glosa: k, veces: 0, total: 0 }
    porGlosa[k].veces++; porGlosa[k].total += m.monto
  }
  const agrupado = Object.values(porGlosa).sort((a, b) => Math.abs(b.total) - Math.abs(a.total)).slice(0, 12)
    .map((g) => ({ ...g, total_fmt: fmt(g.total, 'CLP') }))
  return { empresa, total_encontrados: total, mostrando: Math.min(total, Number(limite) || 30),
    movimientos: mapeados.slice(0, Number(limite) || 30),
    totales: { n: total, ingresos, ingresos_fmt: fmt(ingresos, 'CLP'), egresos, egresos_fmt: fmt(egresos, 'CLP'), neto: ingresos + egresos, neto_fmt: fmt(ingresos + egresos, 'CLP') },
    agrupado_por_glosa: agrupado,
    instruccion: '⛔ NO sumes ni cuentes movimientos tú: usa "totales" y "agrupado_por_glosa", que vienen calculados. Si agrupas por tu cuenta te equivocas (pasó: dijiste 3 movimientos cuando eran 4).',
    actualizado: tsCL(c._ts), actualizado_nota: 'hora de Chile, mostrala TAL CUAL', fuente: 'cache' }
}
function resumenEmpresa(empresa, { anio } = {}) {
  const c = leerMovsCache(empresa)
  if (!c || !Array.isArray(c.movimientos)) return { error: `Todavía no tengo movimientos de ${empresa} para el resumen por mes (se leen en el refresco de cada mañana). En ANA CLARA tengo el resumen completo.`, sin_cache: true }
  const porMes = new Map()
  for (const m of c.movimientos) {
    const f = String(m.fecha || '').slice(0, 10); if (!f) continue
    if (anio && !f.startsWith(String(anio))) continue
    const mes = f.slice(0, 7)
    const r = porMes.get(mes) || { mes, moneda: 'CLP', ingresos: 0, egresos: 0, n: 0 }
    r.ingresos += Number(m.abono || 0); r.egresos += Number(m.cargo || 0); r.n++
    porMes.set(mes, r)
  }
  const filas = [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes)).map((r) => ({ ...r, neto: r.ingresos - r.egresos, ingresos_fmt: fmt(r.ingresos, 'CLP'), egresos_fmt: fmt(r.egresos, 'CLP'), neto_fmt: fmt(r.ingresos - r.egresos, 'CLP') }))
  return { empresa, resumen_mensual: filas, fuente: 'cache' }
}

// Da forma uniforme (*_fmt) a un saldo de empresa leído por sesión.
function shapeSaldoEmpresa(empresa, r) {
  const cuentas = (r.cuentas || []).map((c) => ({
    banco: 'Santander', empresa, cuenta: c.tipo, numero: c.numero, moneda: c.moneda || 'CLP',
    disponible: c.saldo, disponible_fmt: fmt(c.saldo, c.moneda), actual: c.saldo, actual_fmt: fmt(c.saldo, c.moneda),
    ...(c.linea_credito != null ? { linea_credito: c.linea_credito, linea_credito_fmt: fmt(c.linea_credito, c.moneda) } : {}),
  }))
  const totalCLP = r.total_clp ?? cuentas.filter((c) => (c.moneda || 'CLP') === 'CLP').reduce((s, c) => s + Number(c.disponible || 0), 0)
  return {
    empresa, cuentas, total_disponible_clp: totalCLP, total_disponible_clp_fmt: fmt(totalCLP, 'CLP'),
    fuente: r._fuente || 'sesion', actualizado: tsCL(r._ts), actualizado_nota: 'hora de Chile, mostrala TAL CUAL',
    ...(r._stale ? { nota: r._nota || 'último dato conocido (no pude refrescar ahora)' } : {}),
  }
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
    // Toda empresa conectada da SALDOS (cache-first + refresco por su sesión).
    out.push({ id: 'vault', banco: c.banco, empresa: c.empresa, rut: c.rut, estado: 'active', sana: true, lectura: 'disponible', fuente: 'vault' })
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
  // CUALQUIER otra empresa vinculada → lectura por su sesión (cache-first).
  if (empresa) {
    const r = await saldoEmpresa(empresa)
    if (r.error) return { error: r.error }
    return shapeSaldoEmpresa(empresa, r)
  }
  return { error: 'Dime de qué empresa quieres el saldo (usa accion:empresas para ver las conectadas).' }
}

// Saldos de TODAS las empresas conectadas por un usuario — SOLO CACHÉ (último dato conocido).
// NO abre el banco (abrir 9 sesiones en serie colgaba el turno hasta ~27 min). Cada empresa
// da su último saldo guardado; el que nunca se leyó sale marcado. Para el saldo EN VIVO de
// una empresa puntual, se pregunta por esa empresa (ahí sí refresca con su sesión).
// vivo:true → refresca EN VIVO todas las empresas antes de armar el cuadro. Solo tiene
// sentido con la sesión despierta: cada empresa son ~30 s (cambio de empresa + endpoint),
// así que 9 empresas ≈ 4-5 min. Por defecto NO se hace: "dame todos los saldos" tiene que
// contestar al instante con el último dato y su hora, no colgar al usuario 5 minutos.
// Se pide explícito ("léelos todos en vivo") y Nexus avisa cuánto va a tardar.

// Fuerza la lectura EN VIVO de una empresa, ignorando la frescura del caché y la gracia de
// "no gastar login": se usa solo cuando alguien pide explícitamente el dato al segundo.
async function saldoEmpresaVivoForzado(empresa) {
  const owner = cred.dueñoDeEmpresa(empresa)
  if (!owner) return false
  const r = await runLeerSaldos(owner, empresa)
  if (r.ok && r.empresa) {
    const out = { empresa, cuentas: r.empresa.cuentas || [], total_clp: r.empresa.total_clp || 0, _ts: Date.now(), _fuente: 'vivo' }
    try { writeFileSync(empCacheFile(empresa), JSON.stringify(out, null, 2)) } catch { /* */ }
    return true
  }
  return false
}
export async function saldosTodas({ userId, vivo = false } = {}) {
  const conns = userId ? cred.listar(userId) : []
  if (vivo) {
    for (const c of conns) {
      try { await saldoEmpresaVivoForzado(c.empresa) } catch { /* una que falle no bota al resto */ }
    }
  }
  const vistas = new Set(); const empresasOut = []
  for (const c of conns) {
    // Dedup normalizando (ANA CLARA SPA y ANA CLARA = la misma empresa) → no la muestres 2 veces.
    const key = empSlug(c.empresa).replace(/(spa|sa|ltda|limitada|asociadoslimitada)$/, ''); if (vistas.has(key)) continue; vistas.add(key)
    // TODAS uniformes: usamos el caché de leer-saldos (mismo formato y misma fecha para las 4).
    // Ana Clara: solo si aún NO está en ese caché caemos a la tek-api. Antes Ana Clara SIEMPRE
    // salía de la tek-api (quedaba en 24-jul) mientras las otras eran de hoy → dato mezclado.
    const r = saldoEmpresaCache(c.empresa)
    if (!r && esAnaClara(null, c.empresa)) { try { const t = await tekSaldos(); empresasOut.push(t); continue } catch { /* */ } }
    empresasOut.push(r ? { ...shapeSaldoEmpresa(c.empresa, r), _ts: r._ts || null, actualizado: tsCL(r._ts) } : { empresa: c.empresa, sin_dato: true, nota: 'aún sin leer — se actualiza en el refresco de la mañana o al consultar esa empresa puntual' })
  }
  const totalCLP = empresasOut.reduce((s, e) => s + Number(e.total_disponible_clp || 0), 0)
  // Hora del dato MÁS VIEJO (para que el modelo diga "actualizado a las …" y no lo pase por "ahora").
  const tss = empresasOut.map((e) => e._ts || 0).filter(Boolean)
  const masViejo = tss.length ? Math.min(...tss) : 0
  // "actualizado" YA FORMATEADO en hora de CHILE (no ISO/UTC), para que el modelo lo muestre tal
  // cual sin equivocarse de zona (el _ts crudo es epoch; el ISO terminaba en Z = UTC = +4h de más).
  const actualizadoCL = masViejo ? new Date(masViejo).toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' }) : null
  return { empresas: empresasOut, total_disponible_clp: totalCLP, total_disponible_clp_fmt: fmt(totalCLP, 'CLP'), fuente: 'cache', actualizado_ts: masViejo || null, actualizado: actualizadoCL, nota: `Saldos = último dato guardado (no abre los bancos en vivo para no colgarse). Actualizado: ${actualizadoCL || '?'} (hora de Chile — mostrala TAL CUAL). Para el saldo EN VIVO de una empresa, pregunta por esa empresa puntual.` }
}

// ── Movimientos ───────────────────────────────────────────────────────
export async function movimientos({ userId, rut, banco, empresa, buscar, desde, hasta, limite = 30, refrescar = true } = {}) {
  if (esAnaClara(rut, empresa) || (!rut && !empresa)) {
    if (!banco || /santander/i.test(String(banco))) {
      try { return await tekMovimientos({ buscar, desde, hasta, limite, refrescar }) } catch (e) { return { error: `No pude leer movimientos (tek): ${e.message}` } }
    }
  }
  if (empresa) return movimientosEmpresa(empresa, { buscar, desde, hasta, limite })
  return { error: 'Dime de qué empresa quieres los movimientos.' }
}

// ── Resumen por mes ───────────────────────────────────────────────────
export async function resumen({ userId, rut, banco, empresa, anio } = {}) {
  if (esAnaClara(rut, empresa) || (!rut && !empresa)) {
    if (!banco || /santander/i.test(String(banco))) {
      try { return await tekResumen({ anio }) } catch (e) { return { error: `No pude armar el resumen (tek): ${e.message}` } }
    }
  }
  if (empresa) return resumenEmpresa(empresa, { anio })
  return { error: 'Dime de qué empresa quieres el resumen.' }
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

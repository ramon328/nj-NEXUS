// test-reservo.mjs — batería de pruebas de robustez del conector Reservo.
// Golpea TODOS los endpoints + casos de fallo. Reporta PASS/FAIL/WARN.
// Uso: node test-reservo.mjs            (contra el local 127.0.0.1:PORT)
//      node test-reservo.mjs --pub      (contra la URL pública HTTPS)
import os from 'node:os'
import path from 'node:path'
process.loadEnvFile(path.join(os.homedir(), 'nexus', '.env'))

const TOKEN = process.env.RESERVO_TOKEN
const LOCAL = `http://127.0.0.1:${process.env.RESERVO_PORT || 8896}`
const PUB = (process.env.RESERVO_PUBLIC_BASE || '').replace(/\/reservo$/, '') + '/reservo'
const usarPub = process.argv.includes('--pub')
const BASE = usarPub ? PUB : LOCAL
const mesActual = new Date().toISOString().slice(0, 7)
const [y, m] = mesActual.split('-').map(Number)
const mesAnt = new Date(y, m - 2, 1).toISOString().slice(0, 7)

let pass = 0, fail = 0, warn = 0
const fails = []
const c = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', x: '\x1b[0m' }

async function hit(pathr, { method = 'GET', token = TOKEN, body = null, ms = 45000 } = {}) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms)
  const t0 = Date.now()
  try {
    const r = await fetch(BASE + pathr, {
      method, signal: ctrl.signal,
      headers: { ...(token ? { 'X-Token': token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const txt = await r.text()
    let json = null; try { json = JSON.parse(txt) } catch {}
    return { status: r.status, ct: r.headers.get('content-type') || '', txt, json, ms: Date.now() - t0 }
  } catch (e) { return { status: 0, ct: '', txt: '', json: null, ms: Date.now() - t0, err: e.name === 'AbortError' ? 'TIMEOUT' : e.message } }
  finally { clearTimeout(t) }
}

function check(nombre, cond, detalle = '') {
  if (cond) { pass++; console.log(`${c.g}✓${c.x} ${nombre} ${c.d}${detalle}${c.x}`) }
  else { fail++; fails.push(nombre + (detalle ? ' — ' + detalle : '')); console.log(`${c.r}✗ ${nombre}${c.x} ${detalle}`) }
}
function soft(nombre, cond, detalle = '') {
  if (cond) { pass++; console.log(`${c.g}✓${c.x} ${nombre} ${c.d}${detalle}${c.x}`) }
  else { warn++; console.log(`${c.y}⚠ ${nombre}${c.x} ${detalle}`) }
}
const esJson = (r) => r.ct.includes('application/json') && r.json !== null

console.log(`\n${c.d}══ Pruebas Reservo · ${usarPub ? 'PÚBLICO ' + BASE : 'LOCAL ' + BASE} · mes ${mesActual} ══${c.x}\n`)

// ── 1. SALUD / AUTENTICACIÓN ─────────────────────────────────────────────────
console.log(`${c.d}— salud & auth —${c.x}`)
{
  const r = await hit('/health')
  check('health con token', r.status === 200 && r.json?.ok === true, `sesión_viva=${r.json?.sesion_viva} ${r.ms}ms`)
  soft('sesión de Reservo viva', r.json?.sesion_viva === true, r.json?.need2fa ? '2FA pendiente!' : '')
}
{ const r = await hit('/health', { token: '' }); check('health sin token → ok:true sin filtrar', r.status === 200 && r.json?.sesion_viva === undefined) }
{ const r = await hit('/r/data2/caja/', { token: 'MALO' }); check('token inválido → 401 JSON', r.status === 401 && esJson(r)) }
{ const r = await hit('/r/data2/caja/', { token: '' }); check('sin token → 401 JSON', r.status === 401 && esJson(r)) }

// ── 2. API v2 (/r/data) ──────────────────────────────────────────────────────
console.log(`\n${c.d}— API v2 /r/data —${c.x}`)
const rango = `fecha_inicial=${mesActual}-01&fecha_final=${mesActual}-28`
// citas/ventas SIEMPRE con filtro de fecha (como la app); planes/cliente son acotados de por sí.
const consultas = [['citas', '&' + rango], ['ventas', '&' + rango], ['planes', ''], ['cliente', '']]
for (const [ep, extra] of consultas) {
  const r = await hit(`/r/data/${ep}/?all=1${extra}`, { ms: 60000 })
  const arr = r.json?.resultados
  check(`data/${ep}/?all=1${extra ? ' +mes' : ''}`, r.status === 200 && esJson(r) && Array.isArray(arr), `${arr?.length ?? '?'} regs, ${r.ms}ms`)
  if (r.json?.cantidad_elementos != null) soft(`  ${ep}: sin páginas perdidas`, r.json.cantidad_elementos === arr?.length, `dice ${r.json.cantidad_elementos}, trajo ${arr?.length}`)
}
// 🛡️ consulta gigante SIN filtro debe RECHAZARSE RÁPIDO (413), no colgarse 90s.
{
  const r = await hit('/r/data/citas/?all=1', { ms: 15000 })
  check('citas SIN filtro → 413 rápido (no cuelga)', r.status === 413 && esJson(r), `status ${r.status}, ${r.ms}ms`)
}

// ── 3. data2 LECTURAS ────────────────────────────────────────────────────────
console.log(`\n${c.d}— data2 lecturas (mes actual) —${c.x}`)
const derivados = ['caja/', 'comisiones/', 'deuda/', 'agendas/', 'bloqueos/', 'estado_resultado/',
  'ocupacion_personal_box/', 'nuevos_pacientes/', 'atenciones_por_profesional/', 'citas_por_estado/', 'gastos_por_categoria/']
for (const ep of derivados) {
  const r = await hit(`/r/data2/${ep}?mes=${mesActual}`, { ms: 60000 })
  check(`data2/${ep}`, r.status === 200 && esJson(r), `${r.ms}ms`)
}
{ const r = await hit(`/r/data2/cumpleanos/?fecha=${new Date().toISOString().slice(0, 10)}`); check('data2/cumpleanos/', r.status === 200 && esJson(r), `${r.ms}ms`) }

// ── 4. CASOS BORDE (que NO deben colgar ni tirar HTML) ───────────────────────
console.log(`\n${c.d}— casos borde —${c.x}`)
{ const r = await hit(`/r/data2/caja/?mes=${mesAnt}`); check('mes anterior (cerrado)', r.status === 200 && esJson(r)) }
{ const r = await hit('/r/data2/caja/?mes=2019-01'); check('mes viejísimo sin data → JSON, no crash', r.status === 200 && esJson(r)) }
{ const r = await hit('/r/data2/caja/?mes=2099-12'); check('mes futuro sin data → JSON, no crash', r.status === 200 && esJson(r)) }
{ const r = await hit('/r/data2/caja/?mes=basura'); check('mes malformado → 400 JSON', r.status === 400 && esJson(r), `status ${r.status}`) }
{ const r = await hit('/r/data2/inventado/'); check('endpoint data2 inexistente → 404 JSON', r.status === 404 && esJson(r)) }
{ const r = await hit('/r/data2/paciente/00000000-0000-0000-0000-000000000000/'); check('paciente uuid inexistente → 404 JSON', r.status === 404 && esJson(r), `status ${r.status}`) }
{ const r = await hit('/r/data2/ocupacion_personal_box/?desde=01/07/2026&hasta=19/07/2026'); check('ocupación con rango ?desde/?hasta', r.status === 200 && esJson(r)) }
{ const r = await hit('/nada'); check('ruta random → 404 JSON', r.status === 404 && esJson(r)) }

// ── 5. ESCRITURA (debe estar BLINDADA) ───────────────────────────────────────
console.log(`\n${c.d}— escritura (blindaje) —${c.x}`)
{ const r = await hit('/r/data2/cita/crear/', { token: 'MALO', method: 'POST', body: {} }); check('crear sin token válido → 401', r.status === 401 && esJson(r)) }
{ const r = await hit('/r/data2/cita/crear/', { method: 'GET' }); check('crear con GET → 405', r.status === 405 && esJson(r)) }
{ const r = await hit('/r/data2/cita/crear/', { method: 'POST', body: {} }); check('crear sin campos → 400', r.status === 400 && esJson(r)) }
{ const r = await hit('/r/data2/cita/crear/', { method: 'POST', body: { profesional_uuid: 'x', fecha: '2026-08-01', hora: '10:00', tratamiento_uuid: 'y', paciente_uuid: 'z' } }); check('crear gateado (RESERVO_ESCRITURA≠1) → 501, NO golpea', r.status === 501 && esJson(r)) }
{ const r = await hit('/r/data2/cita/estado/', { method: 'POST', body: { cita_uuid: 'x' } }); check('estado sin "estado" → 400', r.status === 400 && esJson(r)) }

// ── 6. CONCURRENCIA (10 requests simultáneas no deben tumbarlo) ──────────────
console.log(`\n${c.d}— concurrencia —${c.x}`)
{
  const t0 = Date.now()
  const rs = await Promise.all(Array.from({ length: 10 }, () => hit(`/r/data2/citas_por_estado/?mes=${mesActual}`, { ms: 60000 })))
  const ok = rs.filter((r) => r.status === 200 && esJson(r)).length
  check('10 requests simultáneas', ok === 10, `${ok}/10 OK en ${Date.now() - t0}ms (caché comparte)`)
}

// ── 7. RESUMEN ───────────────────────────────────────────────────────────────
console.log(`\n${c.d}${'─'.repeat(50)}${c.x}`)
console.log(`${c.g}PASS ${pass}${c.x}  ${warn ? c.y : c.d}WARN ${warn}${c.x}  ${fail ? c.r : c.d}FAIL ${fail}${c.x}`)
if (fails.length) { console.log(`\n${c.r}Fallos:${c.x}`); fails.forEach((f) => console.log('  • ' + f)) }
process.exit(fail ? 1 : 0)

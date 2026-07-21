// healthcheck.mjs — vigía del conector Reservo. Corre cada 15 min (LaunchAgent).
// Prueba lo CRÍTICO (rápido, sin ?all=1 pesado) y avisa por WhatsApp SOLO cuando
// el estado CAMBIA (sano→roto o roto→sano). Sin flood.
import os from 'node:os'
import path from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
process.loadEnvFile(path.join(os.homedir(), 'nexus', '.env'))

const TOKEN = process.env.RESERVO_TOKEN
const BASE = `http://127.0.0.1:${process.env.RESERVO_PORT || 8896}`
const ESTADO = path.join(os.homedir(), 'nexus', 'conector-reservo', '.health-estado.json')
const TEL = '+56932945240'
const mes = new Date().toISOString().slice(0, 7)

async function hit(pathr, ms = 20000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(BASE + pathr, { signal: ctrl.signal, headers: { 'X-Token': TOKEN } })
    const txt = await r.text(); let json = null; try { json = JSON.parse(txt) } catch {}
    return { status: r.status, json, ok: r.ok }
  } catch (e) { return { status: 0, json: null, ok: false, err: e.name === 'AbortError' ? 'TIMEOUT' : e.message } }
  finally { clearTimeout(t) }
}

const problemas = []
async function probar(nombre, pathr, valida) {
  const r = await hit(pathr)
  let ok = r.status === 200 && r.json != null
  if (ok && valida) { try { ok = valida(r.json) } catch { ok = false } }
  if (!ok) problemas.push(`${nombre} (HTTP ${r.status}${r.err ? ' ' + r.err : ''})`)
  return ok
}

// 1) salud + sesión de Reservo (lo más crítico)
{
  const r = await hit('/health')
  if (r.status !== 200 || r.json?.ok !== true) problemas.push('proxy caído (/health)')
  else if (r.json.sesion_viva === false) problemas.push(r.json.need2fa ? 'sesión Reservo pide 2FA' : 'sesión Reservo caída (sin re-login)')
}
// 2) endpoints clave responden JSON (rápidos, cacheados)
await probar('caja', `/r/data2/caja/?mes=${mes}`)
await probar('comisiones', `/r/data2/comisiones/?mes=${mes}`, (j) => Array.isArray(j.resultados))
await probar('ocupación', `/r/data2/ocupacion_personal_box/?mes=${mes}`, (j) => j.porcentaje_ocupacion_total != null)
await probar('citas mes', `/r/data/citas/?all=1&fecha_inicial=${mes}-01&fecha_final=${mes}-28`, (j) => Array.isArray(j.resultados))
// 3) blindaje de escritura sigue puesto (que NO se haya abierto solo)
{
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const r = await fetch(BASE + '/r/data2/cita/crear/', { method: 'POST', signal: ctrl.signal, headers: { 'X-Token': TOKEN, 'Content-Type': 'application/json' }, body: '{}' })
    if (r.status !== 400 && r.status !== 501) problemas.push(`blindaje escritura raro (HTTP ${r.status})`)
  } catch { problemas.push('blindaje escritura no responde') } finally { clearTimeout(t) }
}

// ── comparar con el estado anterior; avisar SOLO en el cambio ────────────────
const sano = problemas.length === 0
let previo = { sano: true }
try { if (existsSync(ESTADO)) previo = JSON.parse(readFileSync(ESTADO, 'utf8')) } catch {}
const stamp = new Date().toISOString()
writeFileSync(ESTADO, JSON.stringify({ sano, problemas, ts: stamp }))

async function avisar(msg) {
  try { const k = await import(path.join(os.homedir(), 'nexus', 'hub', 'kapso.mjs')); await k.enviarKapso(TEL, msg) }
  catch (e) { console.error('no pude avisar por WhatsApp:', e.message) }
}

if (!sano && previo.sano) {
  await avisar('🔴 API Reservo con problemas:\n• ' + problemas.join('\n• ') + '\n\n(El token sigue fijo; reviso yo, pero avisá si urge.)')
  console.log('ALERTA enviada:', problemas.join(', '))
} else if (sano && !previo.sano) {
  await avisar('🟢 API Reservo recuperada, todo OK de nuevo.')
  console.log('RECUPERACIÓN enviada')
} else {
  console.log(stamp, sano ? 'OK' : 'sigue roto: ' + problemas.join(', '))
}
process.exit(sano ? 0 : 1)

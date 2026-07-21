// bajar-historica.mjs — Orquestador ONE-SHOT de la descarga de CARTOLA HISTÓRICA (ene-jun
// 2026) para completar el acumulador enero→hoy. Lo dispara el LaunchAgent com.nexus.tek-historica
// (agendado). Flujo:
//   1) login-humano.mjs (TEK_CARTOLA_HIST=bajar) → baja las tablas crudas de cada mes.
//   2) Si el banco está caliente (error-seguridad) o no bajó nada → SALE sin marcar hecho
//      (el agente reintenta en la próxima corrida; NO machaca: 1 vez por disparo).
//   3) Si bajó data → parse-carthist.mjs (parsea + fusiona al acumulador + vuelca al cerebro).
//   4) Éxito → escribe .historica-done y se AUTODESACTIVA (bootout del LaunchAgent).
import { spawnSync } from 'node:child_process'
import { writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const NODE = process.execPath
const DONE = join(DIR, 'data', '.historica-done')
const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a)

if (existsSync(DONE)) { log('ya está hecho (.historica-done); nada que hacer'); process.exit(0) }

const MESES = process.env.TEK_CARTOLA_MESES || '1,2,3,4,5,6'
log('descargando cartola histórica meses', MESES, '2026…')
const r = spawnSync(NODE, [join(DIR, 'login-humano.mjs')], {
  cwd: DIR, encoding: 'utf8', timeout: 400_000,
  env: { ...process.env, TEK_EMPRESA: 'ANA CLARA', TEK_CARTOLA_HIST: 'bajar', TEK_CARTOLA_ANIO: '2026', TEK_CARTOLA_MESES: MESES },
})
const out = (r.stdout || '') + (r.stderr || '')
const m = out.match(/RESULTADO:\s*(\{.*\})\s*$/m)
let res = {}; try { res = m ? JSON.parse(m[1]) : {} } catch {}
const totalFilas = res?.carthist?.filas_total ?? (res?.carthist?.filas_por_mes || []).reduce((a, x) => a + (x.filas || 0), 0)

if (/error-seguridad/.test(res.url || '') || res.estado === 'error_seguridad') {
  log('banco CALIENTE (error-seguridad) — no bajó. Reintenta en la próxima corrida.'); process.exit(1)
}
if (totalFilas === 0) { log('bajó 0 filas (sesión o navegación falló) — reintenta luego. estado:', res.estado); process.exit(1) }

log('bajó', totalFilas, 'filas en', filas.length, 'meses. Parseando + fusionando…')
const p = spawnSync(NODE, [join(DIR, 'parse-carthist.mjs')], { cwd: DIR, encoding: 'utf8', timeout: 60_000 })
log('parse:', (p.stdout || '').trim() || (p.stderr || '').trim())

// éxito → marcar hecho y autodesactivar el LaunchAgent (una sola vez)
writeFileSync(DONE, new Date().toISOString())
try {
  const uid = process.getuid()
  spawnSync('launchctl', ['bootout', `gui/${uid}/com.nexus.tek-historica`], { encoding: 'utf8' })
  log('LaunchAgent com.nexus.tek-historica desactivado (trabajo cumplido).')
} catch (e) { log('no pude autodesactivar el agente:', e.message) }
log('LISTO — cartola histórica fusionada al acumulador y volcada al cerebro.')

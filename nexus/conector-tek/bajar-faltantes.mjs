// bajar-faltantes.mjs — Orquestador AUTÓNOMO de la cartola histórica: baja los meses que
// FALTAN (uno por sesión = consulta fresca que sí toma el mes), con auto-reparación:
//   • limpia los locks del perfil de Chrome entre corridas (evita "browser has been closed")
//   • mata procesos colgados antes de cada intento
//   • reintenta cada mes hasta MAX_RETRY veces si no trae datos reales (cargos>0)
//   • si el banco tira error-seguridad → BACKOFF largo antes de reintentar (no machaca)
//   • guarda incremental (guardarMerge en login-humano) → no se pierde lo logrado
//   • al terminar, actualiza el cerebro
// Corre hasta que TODOS los meses objetivo tengan resumen real, o se agoten los intentos.
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync, rmSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const NODE = process.execPath
const RESUMEN = join(DIR, 'data', 'carthist-resumen.json')
const PROFILE = join(DIR, 'chrome-profile')
const ANIO = process.env.TEK_CARTOLA_ANIO || '2026'
const MESES = (process.env.MESES || '1,2,3,4,5,6').split(',').map(Number)
const MAX_RETRY = 4
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const tieneMes = (m) => { try { return (JSON.parse(readFileSync(RESUMEN, 'utf8')).meses || []).some((x) => x.mes === m && x.cargos > 0) } catch { return false } }
function limpiar() {
  try { spawnSync('pkill', ['-9', '-f', 'login-humano.mjs']) } catch {}
  try { for (const f of readdirSync(PROFILE)) if (/^Singleton/.test(f)) rmSync(join(PROFILE, f), { force: true }) } catch {}
  try { if (existsSync(join(DIR, 'session.lock'))) rmSync(join(DIR, 'session.lock'), { force: true }) } catch {}
}

async function bajarMes(m) {
  limpiar(); await sleep(4000)
  const r = spawnSync(NODE, [join(DIR, 'login-humano.mjs')], {
    cwd: DIR, encoding: 'utf8', timeout: 260_000,
    env: { ...process.env, TEK_EMPRESA: 'ANA CLARA', TEK_CARTOLA_HIST: 'bajar', TEK_CARTOLA_ANIO: ANIO, TEK_CARTOLA_MESES: String(m) },
  })
  const out = (r.stdout || '') + (r.stderr || '')
  if (/error-seguridad/.test(out)) return 'error_seguridad'
  if (/Target page, context or browser has been closed|browserType\.launchPersistentContext/.test(out)) return 'perfil'
  return tieneMes(m) ? 'ok' : 'sin_datos'
}

const pendientes = () => MESES.filter((m) => !tieneMes(m))
log('objetivo meses', MESES.join(','), '· ya tengo:', MESES.filter(tieneMes).join(',') || 'ninguno')

let ronda = 0
while (pendientes().length && ronda < MAX_RETRY) {
  ronda++
  for (const m of pendientes()) {
    log(`ronda ${ronda} · bajando mes ${m}…`)
    const res = await bajarMes(m)
    log(`  mes ${m} -> ${res}`)
    if (res === 'error_seguridad') { log('  banco caliente → backoff 8 min'); await sleep(8 * 60_000) }
    else await sleep(6000)   // respiro entre meses
  }
}

const faltan = pendientes()
log('FIN. meses logrados:', MESES.filter(tieneMes).join(',') || 'ninguno', '· faltan:', faltan.join(',') || 'ninguno')
// actualizar el cerebro con lo que haya
try { spawnSync(NODE, [join(DIR, 'cerebro-cartolas.mjs')], { cwd: DIR, encoding: 'utf8', timeout: 60_000 }); log('cerebro actualizado') } catch (e) { log('cerebro falló', e.message) }
console.log('RESULTADO:', JSON.stringify({ logrados: MESES.filter(tieneMes), faltan }))
process.exit(faltan.length ? 1 : 0)

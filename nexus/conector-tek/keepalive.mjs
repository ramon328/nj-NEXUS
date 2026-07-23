// keepalive.mjs — LATIDO de la sesión del banco (la 3ª pata de Rail: mantener viva la
// sesión y refrescar cookies antes de que expire, en vez de re-loguear). Corre cada
// ~7 min por LaunchAgent. NUNCA loguea: si hay sesión viva la mantiene (navegación
// suave que resetea el timer de inactividad ~10-15 min); si está muerta, se abstiene
// (no lanza Chrome al pedo). Así una sola entrada dura horas y casi no re-logueamos
// → la IP residencial no se calienta → no hay muro antifraude.
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, statSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
const NODE = '/usr/local/bin/node'
const OFF = join(DATA, '.keepalive-off')        // marca de "sesión muerta, no insistir"
const OFF_TTL = 20 * 60 * 1000                  // tras muerte, no relanzar por 20 min
const log = (...a) => console.log(new Date().toISOString(), ...a)

const leer = (f) => { try { return JSON.parse(readFileSync(join(DATA, f), 'utf8')) } catch { return null } }

// 1) ¿alguna vez logueamos? sin session.json no hay nada que mantener.
if (!existsSync(join(DIR, 'session.json'))) { log('sin session.json → nunca se logueó, nada que latir'); process.exit(0) }

// 2) ¿la sesión parece viva? (estado.json = último snapshot). Si el banco nos botó
//    (error-seguridad/logout) o no está 'ok', no lanzamos Chrome.
const est = leer('estado.json') || {}
const urlViva = !/error-seguridad|\/logout|\/login/i.test(String(est.url || ''))
const pareceViva = est.estado === 'ok' && urlViva

// 3) back-off: si marcamos muerte hace poco, esperamos (salvo que el estado sea MÁS
//    nuevo que la marca → alguien re-logueó, reactivamos).
if (existsSync(OFF)) {
  const offTs = statSync(OFF).mtimeMs
  const estTs = est.actualizado ? Date.parse(est.actualizado) : 0
  const reactivar = pareceViva && estTs > offTs
  if (!reactivar && Date.now() - offTs < OFF_TTL) { log('back-off activo (sesión marcada muerta hace poco), salto'); process.exit(0) }
}

if (!pareceViva) { writeFileSync(OFF, String(Date.now())); log('estado no-vivo (', est.estado, ') → marco muerta, no lanzo'); process.exit(0) }

// 4) Latido real: login-humano en modo keep-alive (reusa la sesión, NO loguea). Lock
//    corto: si hay una operación real en curso, cedemos rápido (no encolamos 8 min).
log('sesión parece viva → lanzo latido…')
const h = spawn(NODE, [join(DIR, 'login-humano.mjs')], {
  cwd: DIR,
  env: { ...process.env, TEK_KEEPALIVE: '1', TEK_LOCK_WAIT_MS: '6000' },
})
let out = ''
h.stdout.on('data', (d) => { out += d })
h.stderr.on('data', (d) => { out += d })
const kill = setTimeout(() => { try { h.kill('SIGKILL') } catch { /* */ } }, 90_000)
h.on('exit', () => {
  clearTimeout(kill)
  const m = out.match(/RESULTADO:\s*(\{.*\})\s*$/m)
  let r = {}; try { r = m ? JSON.parse(m[1]) : {} } catch { /* */ }
  if (r.estado === 'keepalive_ok') { try { if (existsSync(OFF)) unlinkSync(OFF) } catch { /* */ } ; log('✓ latido OK — sesión mantenida viva') }
  else if (r.estado === 'sesion_muerta') { writeFileSync(OFF, String(Date.now())); log('✗ sesión muerta → back-off (no re-logueo, eso es tarea del login normal)') }
  else if (r.estado === 'ocupado') { log('· banco ocupado por otra operación, no importa (la actividad la mantiene igual)') }
  else log('· latido resultado:', r.estado || 'desconocido')
})

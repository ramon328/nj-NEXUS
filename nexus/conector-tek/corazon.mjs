// corazon.mjs — EL CORAZÓN: daemon PERSISTENTE (LaunchAgent KeepAlive=true), ÚNICO guardián
// de las sesiones de banco. Las mantiene vivas con un latido interno frecuente y confiable.
//
// LECCIÓN APRENDIDA (24-jul): un SOLO latido mantiene la sesión viva sin problemas (probado
// 23 min seguidos). Lo que la MATA es tener DOS guardianes tocándola a la vez (se pisan) o un
// hueco largo entre toques. Por eso: (1) este daemon es el ÚNICO que late (reemplaza al cron),
// instancia única vía launchd KeepAlive; (2) cadencia interna fija con reintento; (3) NO abre
// el banco para sesiones que ya sabemos muertas (evita churn); (4) coordina con las
// operaciones por el MISMO candado (nunca dos navegadores sobre el mismo perfil).
//
// Reglas de oro: el latido NUNCA loguea (solo reusa+navega). Reestablecer una sesión muerta
// (1 login) se hace SOLO en la ventana fría de la mañana, con cooldown de 3 h → no machaca.
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
const NODE = '/usr/local/bin/node'
const POKE_MS = Number(process.env.TEK_CORAZON_POKE_MS || 180_000)                 // latir cada usuario cada 3 min
const TICK_MS = 20_000                                                              // revisar quién toca latir
const DEAD_BACKOFF_MS = 10 * 60_000                                                 // no re-tocar una sesión muerta por 10 min
const RELOGIN_COOLDOWN = Number(process.env.TEK_CORAZON_RELOGIN_MS || 3 * 3600_000) // reintento de login: máx 1 cada 3 h
const AUTO_RELOGIN = process.env.TEK_CORAZON_RELOGIN !== '0'                        // self-heal ON por defecto
function ventanaFria() { const h = new Date().getHours(); return h >= 5 && h < 10 } // reestablecer solo de madrugada

const log = (...a) => console.log(new Date().toISOString(), ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const lastPoke = {}     // user → ts del último toque
const deadUntil = {}    // user → ts hasta el cual NO tocamos (sesión muerta conocida)
const lastLogin = {}    // user → ts del último intento de RE-LOGIN

function usuarios() {
  const out = []
  if (existsSync(join(DIR, 'session.json'))) out.push('ramon')
  try { for (const f of readdirSync(DIR)) { const m = f.match(/^session-(.+)\.json$/); if (m) out.push(m[1]) } } catch { /* */ }
  return [...new Set(out)]
}

// login-humano para un usuario. keepaliveOnly=true → solo toque (NUNCA loguea).
function correr(user, keepaliveOnly) {
  return new Promise((resolve) => {
    const env = { ...process.env, TEK_USER: user, TEK_LOCK_WAIT_MS: '8000' }
    if (keepaliveOnly) env.TEK_KEEPALIVE = '1'
    const h = spawn(NODE, [join(DIR, 'login-humano.mjs')], { cwd: DIR, env })
    let out = ''
    h.stdout.on('data', (d) => { out += d }); h.stderr.on('data', (d) => { out += d })
    const kill = setTimeout(() => { try { h.kill('SIGKILL') } catch { /* */ } }, 320_000)
    h.on('exit', () => {
      clearTimeout(kill)
      const m = out.match(/RESULTADO:\s*(\{.*\})\s*$/m); let r = {}; try { r = m ? JSON.parse(m[1]) : {} } catch { /* */ }
      resolve(r.estado || 'desconocido')
    })
  })
}

async function atender(user) {
  const now = Date.now()
  // ¿sesión muerta conocida? No la tocamos (evita churn). Solo reestablecer en ventana fría.
  if (deadUntil[user] && now < deadUntil[user]) {
    if (AUTO_RELOGIN && ventanaFria() && now - (lastLogin[user] || 0) > RELOGIN_COOLDOWN) {
      lastLogin[user] = now
      log(`[${user}] muerta → reestablezco (ventana fría, 1 login)…`)
      const est2 = await correr(user, false)
      if (est2 === 'logueado') { delete deadUntil[user]; log(`[${user}] ✓ REESTABLECIDA`) }
      else { deadUntil[user] = now + DEAD_BACKOFF_MS; log(`[${user}] reestablecer → ${est2} (espero)`) }
    }
    return
  }
  // toque normal (jamás loguea)
  const est = await correr(user, true)
  if (est === 'keepalive_ok') log(`[${user}] ✓ viva`)
  else if (est === 'ocupado') log(`[${user}] · en uso por una operación (sigue caliente), ok`)
  else if (est === 'keepalive_omitido') log(`[${user}] · omitido`)
  else if (est === 'sesion_muerta') { deadUntil[user] = now + DEAD_BACKOFF_MS; log(`[${user}] ✗ muerta → no la toco por 10 min (reestablezco en ventana fría)`) }
  else { deadUntil[user] = now + DEAD_BACKOFF_MS; log(`[${user}] · ${est} → back-off`) }
}

log(`❤️  corazón (ÚNICO guardián) encendido. poke=${POKE_MS / 1000}s, self-heal=${AUTO_RELOGIN} (solo ventana fría 05-10h)`)
for (;;) {
  for (const user of usuarios()) {
    if (Date.now() - (lastPoke[user] || 0) >= POKE_MS) {
      lastPoke[user] = Date.now()
      try { await atender(user) } catch (e) { log(`[${user}] error:`, e.message) }
    }
  }
  await sleep(TICK_MS)
}

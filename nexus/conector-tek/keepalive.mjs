// keepalive.mjs — LATIDO de TODAS las sesiones de banco (la 3ª pata de Rail: mantener
// vivas las sesiones y refrescar cookies antes de que expiren, en vez de re-loguear).
// Corre cada ~7 min por LaunchAgent. Recorre cada usuario con sesión persistida
// (ramon → session.json; otros → session-<user>.json) y le da un "toque" suave que
// resetea el timer de inactividad (~10-15 min). NUNCA loguea: si una sesión está muerta,
// se abstiene (back-off) — reabrirla es tarea de un login normal (en frío). Así una sola
// entrada por usuario dura horas y casi no re-logueamos → la IP no se calienta.
import { readFileSync, writeFileSync, existsSync, statSync, unlinkSync, readdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
const NODE = '/usr/local/bin/node'
const OFF_TTL = 20 * 60 * 1000     // tras marcar muerta, no reintentar por 20 min
const log = (...a) => console.log(new Date().toISOString(), ...a)
const leer = (f) => { try { return JSON.parse(readFileSync(join(DATA, f), 'utf8')) } catch { return null } }

// Usuarios con sesión persistida (perfil + session-*.json).
function usuarios() {
  const out = []
  if (existsSync(join(DIR, 'session.json'))) out.push({ user: 'ramon', sess: join(DIR, 'session.json'), slug: 'ramon' })
  try {
    for (const f of readdirSync(DIR)) {
      const m = f.match(/^session-(.+)\.json$/)
      if (m) out.push({ user: m[1], sess: join(DIR, f), slug: m[1] })
    }
  } catch { /* */ }
  return out
}

function poke({ user, sess, slug }) {
  return new Promise((resolve) => {
    const off = join(DATA, '.keepalive-off-' + slug)
    // back-off: si marcamos muerta hace poco y la sesión NO se refrescó desde entonces, saltar.
    if (existsSync(off)) {
      const offTs = statSync(off).mtimeMs
      const sessTs = existsSync(sess) ? statSync(sess).mtimeMs : 0
      if (sessTs <= offTs && Date.now() - offTs < OFF_TTL) { log(`[${user}] back-off, salto`); return resolve() }
    }
    // señal barata extra para ramon: si el último snapshot está muerto, no lanzo Chrome.
    if (user === 'ramon') {
      const est = leer('estado.json') || {}
      const urlDead = /error-seguridad|\/logout|\/login/i.test(String(est.url || ''))
      if ((est.estado && est.estado !== 'ok') || urlDead) { try { writeFileSync(off, String(Date.now())) } catch { /* */ }; log('[ramon] estado no-vivo → marco, salto'); return resolve() }
    }
    log(`[${user}] latido…`)
    const h = spawn(NODE, [join(DIR, 'login-humano.mjs')], { cwd: DIR, env: { ...process.env, TEK_KEEPALIVE: '1', TEK_USER: user, TEK_LOCK_WAIT_MS: '6000' } })
    let out = ''
    h.stdout.on('data', (d) => { out += d }); h.stderr.on('data', (d) => { out += d })
    const kill = setTimeout(() => { try { h.kill('SIGKILL') } catch { /* */ } }, 90_000)
    h.on('exit', () => {
      clearTimeout(kill)
      const m = out.match(/RESULTADO:\s*(\{.*\})\s*$/m); let r = {}; try { r = m ? JSON.parse(m[1]) : {} } catch { /* */ }
      if (r.estado === 'keepalive_ok') { try { if (existsSync(off)) unlinkSync(off) } catch { /* */ }; log(`[${user}] ✓ sesión mantenida viva`) }
      else if (r.estado === 'sesion_muerta') { try { writeFileSync(off, String(Date.now())) } catch { /* */ }; log(`[${user}] ✗ sesión muerta → back-off (no re-logueo)`) }
      else if (r.estado === 'ocupado') { log(`[${user}] banco ocupado por otra operación, ok`) }
      else log(`[${user}] · resultado:`, r.estado || 'desconocido')
      resolve()
    })
  })
}

const us = usuarios()
if (!us.length) { log('sin sesiones persistidas que mantener'); process.exit(0) }
log(`latido de ${us.length} sesión(es): ${us.map((u) => u.user).join(', ')}`)
// Secuencial (una sesión de banco a la vez; el lock de login-humano lo garantiza igual).
for (const u of us) { await poke(u) }

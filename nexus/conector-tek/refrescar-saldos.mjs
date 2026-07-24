// refrescar-saldos.mjs — REFRESCO DIARIO de los saldos de TODAS las empresas conectadas.
// Corre cada mañana (LaunchAgent, ventana fría): por cada usuario del vault entra UNA vez
// (reusa la sesión si el corazón la tiene viva; si no, 1 login en frío) y lee todas sus
// empresas → deja los cachés data/emp-<slug>.json frescos. Así el banco tool sirve saldos
// reales todo el día sin que nadie tenga que pedirlos. leer-saldos ya escribe los cachés.
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cred from './credenciales.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const NODE = '/usr/local/bin/node'
const log = (...a) => console.log(new Date().toISOString(), ...a)

function leerUsuario(user) {
  return new Promise((resolve) => {
    log(`[${user}] refrescando saldos…`)
    const h = spawn(NODE, [join(DIR, 'leer-saldos.mjs'), '--user', user], { cwd: DIR })
    let out = ''
    h.stdout.on('data', (d) => { out += d }); h.stderr.on('data', () => {})
    const kill = setTimeout(() => { try { h.kill('SIGKILL') } catch { /* */ } }, 400_000)
    h.on('exit', () => {
      clearTimeout(kill)
      let j = {}; try { j = JSON.parse(out) } catch { /* */ }
      log(`[${user}] → ${j.ok ? `${j.conectan}/${j.total} empresas leídas y cacheadas` : `no pude (${j.estado_login || 'banco'})`}`)
      resolve()
    })
  })
}

const users = cred.usuarios()
log(`refresco diario de saldos: usuarios = ${users.join(', ') || '(ninguno)'}`)
for (const u of users) { await leerUsuario(u) }   // secuencial (una sesión de banco a la vez)
log('refresco diario terminado')

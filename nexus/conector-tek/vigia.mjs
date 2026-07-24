// vigia.mjs — AGENTE VIGÍA del banco. Monitorea (solo lectura, NO toca el banco) el estado
// de las sesiones y la frescura de los datos, y escribe data/estado-banco.json para que
// Nexus / el Centro lo muestren. Corre por LaunchAgent cada ~15 min y también a demanda.
//
// Qué vigila:
//   - Sesiones por usuario: ¿el corazón las mantiene vivas? (por la frescura de session-<user>.json)
//   - Datos por empresa: ¿saldos y movimientos frescos? (emp-<slug>.json / emp-<slug>-movs.json)
//   - Refresco diario: cuándo corrió por última vez.
// NO loguea ni refresca (eso lo hacen el corazón + refresco diario + on-demand). Solo REPORTA.
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cred from './credenciales.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
const now = Date.now()
const min = (ms) => Math.round(ms / 60000)
const ageMin = (f) => { try { return min(now - statSync(f).mtimeMs) } catch { return null } }
const slug = (e) => String(e || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Estado REAL de la sesión: lo dice el log del corazón (última línea por usuario: ✓ viva /
// ✗ muerta / en uso). Más fiable que el mtime del session file (que se toca aún en pokes muertos).
let corazonLog = ''
try { corazonLog = readFileSync('/tmp/tek-corazon.log', 'utf8') } catch { /* */ }
function estadoSesion(user) {
  const f = user === 'ramon' ? join(DIR, 'session.json') : join(DIR, `session-${slug(user)}.json`)
  if (!existsSync(f)) return { user, estado: 'nunca' }
  const lineas = corazonLog.split('\n').filter((l) => l.includes(`[${user}]`))
  const ult = lineas[lineas.length - 1] || ''
  let estado = 'desconocido'
  if (/✓ viva|mantenida viva|REESTABLECIDA/.test(ult)) estado = 'viva'
  else if (/en uso por una operación/.test(ult)) estado = 'en uso'
  else if (/muerta|reestablecer →/.test(ult)) estado = 'dormida'
  return { user, estado, edad_min: ageMin(f) }
}

const users = cred.usuarios()
const sesiones = users.map(estadoSesion)

// Datos por empresa: frescura de saldos y movimientos.
const empresas = []
for (const u of users) {
  for (const c of cred.listar(u)) {
    if (empresas.some((e) => e.empresa === c.empresa)) continue
    const anaClara = /ana\s*clara/i.test(c.empresa)
    const sf = anaClara ? join(DATA, 'saldos.json') : join(DATA, `emp-${slug(c.empresa)}.json`)
    const mf = join(DATA, `emp-${slug(c.empresa)}-movs.json`)
    empresas.push({
      empresa: c.empresa, dueño: u,
      saldos: existsSync(sf) ? `hace ${ageMin(sf)} min` : 'sin dato',
      movimientos: anaClara ? 'vía tek-api' : (existsSync(mf) ? `hace ${ageMin(mf)} min` : 'pendiente (refresco 06:48)'),
    })
  }
}

let refresco = null
try { const e = readdirSync('/tmp').includes('tek-refresco.log') ? statSync('/tmp/tek-refresco.log').mtimeMs : null; refresco = e ? `hace ${min(now - e)} min` : 'aún no' } catch { /* */ }

const salud = sesiones.some((s) => s.estado === 'viva') ? 'ok' : 'sesiones dormidas (se activan al usarse)'
const estado = {
  generado: new Date(now).toISOString(),
  salud,
  sesiones,
  empresas,
  refresco_diario: refresco,
  nota: 'Sesiones vivas = el corazón las mantiene. Dormidas = se reactivan solas cuando alguien pide el banco (on-demand) o en el refresco de las 06:48. Datos siempre disponibles por caché.',
}
try { writeFileSync(join(DATA, 'estado-banco.json'), JSON.stringify(estado, null, 2)) } catch { /* */ }
console.log(new Date(now).toISOString(), 'vigía:', salud, '|', sesiones.map((s) => `${s.user}:${s.estado}`).join(' '))

// alertar.mjs — Mándale una ALERTA a un usuario de Nexus por WhatsApp, incluso FUERA de la
// ventana de 24h. WhatsApp solo deja escribir primero fuera de las 24h con una PLANTILLA
// aprobada por Meta (ver [[kapso-migracion-plan]] y la memoria de plantillas): aquí usamos
// `alerta_nexus` (HEADER "Alerta de Nexus" + body con {{nombre}} y {{mensaje}} + footer).
//
// Uso:
//   node alertar.mjs "+56932945240" "El SII devolvió 401 al bajar el RCV"   → a un número
//   node alertar.mjs --todos "Mantención de Nexus hoy 22:00"                → a todos los usuarios
//   node alertar.mjs --dry  "+569…" "prueba"                               → no envía, muestra
// También se puede importar: `import { alertarUsuario, alertarTodos } from './alertar.mjs'`.
import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* opcional */ }
const kapso = await import('./kapso.mjs')

const PLANTILLA = process.env.KAPSO_PLANTILLA_ALERTA || 'alerta_nexus'
const IDIOMA = process.env.KAPSO_PLANTILLA_ALERTA_IDIOMA || 'es'
const LOGDIR = join(__dirname, '..', 'logs')
const LOG = join(LOGDIR, 'alertar.log')

// Registro base de usuarios de Nexus (nombre por número). Se completa con usuarios.json.
const BASE = [
  { nombre: 'Ramon', numero: '+56932945240' },
  { nombre: 'Nico', numero: '+56975481858' },
]

function log(msg) {
  const ts = new Date().toISOString()
  try { mkdirSync(LOGDIR, { recursive: true }) } catch { /* */ }
  try { appendFileSync(LOG, `${ts}  ${msg}\n`) } catch { /* */ }
  console.log(msg)
}
const norm = (n) => String(n || '').replace(/[^0-9]/g, '')

// Lista de usuarios: BASE + usuarios.json (clave = número, valor.nombre), dedup por número.
export function usuariosNexus() {
  const mapa = new Map()
  for (const u of BASE) mapa.set(norm(u.numero), { nombre: u.nombre, numero: u.numero })
  try {
    const j = JSON.parse(readFileSync(join(__dirname, '..', 'usuarios.json'), 'utf8'))
    for (const [numero, info] of Object.entries(j || {})) {
      const k = norm(numero)
      if (k && !mapa.has(k)) mapa.set(k, { nombre: info?.nombre || 'Hola', numero })
    }
  } catch { /* sin registro extra */ }
  return [...mapa.values()]
}

// Nombre conocido para un número (o "Hola" si no está en el registro).
function nombreDe(numero) {
  const k = norm(numero)
  return usuariosNexus().find(u => norm(u.numero) === k)?.nombre || 'Hola'
}

// Envía una alerta a UN usuario. `mensaje` = el texto de la alerta (lo variable). `nombre`
// opcional (si no, se busca en el registro). opts.dry = no envía. Devuelve el message id.
export async function alertarUsuario(numero, mensaje, nombre, opts = {}) {
  const msg = String(mensaje || '').trim()
  if (!msg) throw new Error('alerta vacía')
  const quien = nombre || nombreDe(numero)
  if (opts.dry) { log(`[DRY] alerta a ${quien} (${numero}): ${msg}`); return 'dry' }
  const id = await kapso.enviarPlantillaKapso(numero, PLANTILLA, { nombre: quien, mensaje: msg }, { idioma: IDIOMA })
  log(`alerta enviada a ${quien} (${numero}) id=${id}`)
  return id
}

// Envía la misma alerta a TODOS los usuarios de Nexus. Devuelve {ok, fallos}.
export async function alertarTodos(mensaje, opts = {}) {
  const lista = usuariosNexus()
  let ok = 0; const fallos = []
  for (const u of lista) {
    try { await alertarUsuario(u.numero, mensaje, u.nombre, opts); ok++ }
    catch (e) { fallos.push({ numero: u.numero, error: e.message }); log(`FALLO a ${u.numero}: ${e.message}`) }
  }
  return { ok, total: lista.length, fallos }
}

// --- CLI ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const dry = args.includes('--dry')
  const todos = args.includes('--todos')
  const rest = args.filter(a => a !== '--dry' && a !== '--todos')
  try {
    if (todos) {
      const mensaje = rest.join(' ')
      if (!mensaje) { console.error('Uso: node alertar.mjs --todos "mensaje"'); process.exit(1) }
      const r = await alertarTodos(mensaje, { dry })
      log(`Listo: ${r.ok}/${r.total} enviadas${r.fallos.length ? `, ${r.fallos.length} con error` : ''}`)
    } else {
      const [numero, ...m] = rest
      const mensaje = m.join(' ')
      if (!numero || !mensaje) { console.error('Uso: node alertar.mjs "+569…" "mensaje"  |  --todos "mensaje"'); process.exit(1) }
      await alertarUsuario(numero, mensaje, null, { dry })
    }
  } catch (e) {
    log(`ERROR: ${e.message}`)
    if (/132001|does not exist|not.*approved|PENDING/i.test(e.message)) {
      log('→ La plantilla "alerta_nexus" aún no está APPROVED en Meta. Revisa el estado y reintenta cuando quede aprobada.')
    }
    process.exit(1)
  }
}

// recordatorios-cerebro.mjs — Digest CADA 10 DÍAS de la lista personal de recordatorios.
// Lee el apartado "Recordatorios" del Segundo Cerebro (una nota por persona) y le manda
// a cada uno (Ramón / Nico) SUS pendientes por WhatsApp vía Kapso (la API oficial; el
// canal OpenClaw está baneado, ver [[whatsapp-baneo-por-autorespuesta]]).
//
// Se dispara a diario (LaunchAgent com.nexus.recordatorios-cerebro) pero SOLO envía si
// pasaron ≥10 días desde el último envío (gate en recordatorios-cerebro-track.json). Así
// sobrevive a reinicios/suspensión sin depender de un StartInterval frágil.
//   node recordatorios-cerebro.mjs            → respeta el gate de 10 días
//   node recordatorios-cerebro.mjs --force    → envía ahora, ignora el gate
//   node recordatorios-cerebro.mjs --dry      → no envía nada, solo muestra qué haría
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HOME = process.env.HOME || ''
// Cargar el .env compartido (trae KAPSO_API_KEY / KAPSO_PHONE_ID, igual que el hub).
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* opcional */ }
const kapso = await import('./kapso.mjs')

const CEREBRO = `http://127.0.0.1:${Number(process.env.PUERTO_CEREBRO || 8081)}`
const TRACK = join(__dirname, '..', 'recordatorios-cerebro-track.json')
const LOGDIR = join(__dirname, '..', 'logs')
const LOG = join(LOGDIR, 'recordatorios-cerebro.log')
const CADA_DIAS = 10

const FORCE = process.argv.includes('--force')
const DRY = process.argv.includes('--dry')

const PERSONAS = [
  { nombre: 'Ramon', numero: '+56932945240' },
  { nombre: 'Nico', numero: '+56975481858' },
]

function log(msg) {
  const ts = new Date().toISOString()
  try { mkdirSync(LOGDIR, { recursive: true }) } catch { /* */ }
  try { appendFileSync(LOG, `${ts}  ${msg}\n`) } catch { /* */ }
  console.log(msg)
}
function hoyCL() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }) }
function diasDesde(iso) {
  if (!iso) return Infinity
  const a = new Date(iso + 'T00:00:00Z').getTime()
  const b = new Date(hoyCL() + 'T00:00:00Z').getTime()
  return Math.round((b - a) / 86400000)
}

// Saca los pendientes ("- [ ] …") de la nota de la persona.
async function pendientesDe(persona) {
  const ruta = `90-Agente/Recordatorios/Recordatorios — ${persona}.md`
  try {
    const r = await fetch(`${CEREBRO}/nota?ruta=${encodeURIComponent(ruta)}`, { signal: AbortSignal.timeout(7000) })
    if (r.status === 404) return []
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const { contenido = '' } = await r.json()
    return contenido.split('\n')
      .map((l) => l.match(/^\s*-\s*\[\s\]\s*(.+?)\s*$/))
      .filter(Boolean)
      .map((m) => m[1].trim())
  } catch (e) {
    log(`FALLO leyendo recordatorios de ${persona}: ${e.message}`)
    return null   // null = error de lectura (distinto de "0 pendientes")
  }
}

function armarMensaje(persona, items) {
  const cab = `📌 *Tus recordatorios* (${persona}) — repaso de cada 10 días`
  const cuerpo = items.map((t) => `• ${t}`).join('\n')
  const pie = `\n\n_Cuando completes uno, dime "listo con…" o márcalo. Para agregar: "guarda en recordatorios …"._`
  return `${cab}\n\n${cuerpo}${pie}`
}

async function main() {
  const track = existsSync(TRACK) ? (JSON.parse(readFileSync(TRACK, 'utf8')) || {}) : {}
  const dias = diasDesde(track.ultimo_envio)
  if (!FORCE && dias < CADA_DIAS) {
    log(`gate: solo ${dias} días desde el último envío (${track.ultimo_envio}); faltan ${CADA_DIAS - dias}. No envío.`)
    return
  }

  let algoEnviado = false
  for (const p of PERSONAS) {
    const items = await pendientesDe(p.nombre)
    if (items === null) continue                 // error de lectura: no marcar, reintenta mañana
    if (!items.length) { log(`${p.nombre}: sin pendientes, no le mando nada.`); continue }
    const msg = armarMensaje(p.nombre, items)
    if (DRY) { log(`[DRY] a ${p.nombre} (${p.numero}) — ${items.length} pendiente(s):\n${msg}`); algoEnviado = true; continue }
    try {
      const ids = await kapso.enviarKapso(p.numero, msg)
      log(`OK ${p.nombre}: enviado (${items.length} pendiente(s)) ids=${JSON.stringify(ids)}`)
      algoEnviado = true
    } catch (e) {
      // Fuera de la ventana de 24h Meta exige plantilla → puede fallar. Se reintenta en el próximo ciclo.
      log(`FALLO enviando a ${p.nombre}: ${e.message}`)
    }
  }

  if (algoEnviado && !DRY) {
    writeFileSync(TRACK, JSON.stringify({ ultimo_envio: hoyCL(), ts: Date.now() }, null, 2))
    log(`gate actualizado: ultimo_envio=${hoyCL()}`)
  }
}

main().catch((e) => { log('ERROR fatal: ' + e.message); process.exit(1) })

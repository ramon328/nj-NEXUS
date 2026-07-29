// auto-fix-banco.mjs — AUTO-DIAGNÓSTICO Y ARREGLO de errores del banco con Claude Code headless.
// Cuando una operación del banco falla por NAVEGACIÓN/MAPEO (no por plata), esto le pasa a un
// `claude -p` el CONTEXTO completo (sistema + error + screenshots + log + condiciones) con un
// PROMPT bien definido, para que diagnostique, aplique el fix mínimo al mapeo y lo VERIFIQUE con
// el dry-run (que NO envía nada). Los cambios de plata quedan prohibidos por el prompt.
//
// Uso:  node auto-fix-banco.mjs [ruta-incidente.json]     (si no, toma el último de data/incidentes/)
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const DIR = dirname(fileURLToPath(import.meta.url))
const INC_DIR = join(DIR, 'data', 'incidentes')
const CLAUDE = process.env.CLAUDE_BIN || `${process.env.HOME}/.local/bin/claude`
const MODEL = process.env.AUTOFIX_MODEL || 'claude-opus-4-8'
const log = (...a) => console.log(new Date().toISOString(), '[auto-fix]', ...a)

// ── elegir incidente ──────────────────────────────────────────────
function ultimoIncidente() {
  try {
    const fs = readdirSync(INC_DIR).filter((f) => f.endsWith('.json')).map((f) => join(INC_DIR, f))
    fs.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
    return fs[0] || null
  } catch { return null }
}
const incPath = process.argv[2] || ultimoIncidente()
if (!incPath || !existsSync(incPath)) { log('no hay incidente para arreglar.'); process.exit(0) }
const inc = JSON.parse(readFileSync(incPath, 'utf8'))

// ── PROMPT (contexto del sistema + error + condiciones + reglas) ──────────────
const SISTEMA = `Sos un ingeniero senior de automatización web arreglando el sistema bancario "tek" de Nexus.
Automatiza Santander Empresa (Office Banking) con Playwright/patchright, todo en /Users/AIagenteia/nexus/conector-tek.

ARQUITECTURA (lo que tenés que saber):
- login-humano.mjs (monolito grande) maneja el navegador. Hay UNA ventana persistente por usuario
  (banco-navegador.mjs, daemons tek-nav-*); las operaciones se CONECTAN por CDP a esa ventana.
- El menú de Santander es un SHADOW DOM CERRADO → NO se puede clickear por texto plano en el menú;
  se usan clics por XPath / getByText en frames, y NUNCA clics por coordenada de píxel (frágiles).
- Flujos: masiva (Transferencias→Transferencias Masivas→Importación), transferencia individual
  (Transferencias→A Tercero mismo Banco→Creación), nómina (Pagos Masivos), lecturas (saldos/
  pendientes/comprobantes), scrape de contactos (A Tercero→Creación→paso destino→Buscar destinatario).
- Cambio de empresa: sesión fresca aterriza en el selector (entrarEmpresa elige); a media sesión
  se usa el botón "Empresa / Rol". La empresa REAL se lee del header "RUT empresa:".
- HAY DRY-RUN que navega SIN enviar nada: TEK_MASIVA_DRY=1 (masiva), TEK_NOMINA=mapear (nómina),
  TEK_TRANSFERIR=mapear y TEK_CREAR=mapear (transferencia). Ej:
    TEK_USER=nico TEK_EMPRESA="ANA CLARA" TEK_MASIVA=subir TEK_MASIVA_FILE=/tmp/dummy.xlsx \\
      TEK_MASIVA_DRY=1 TEK_FORCE_EMPRESA=1 node login-humano.mjs
- Existe util esperarTexto(page, regex, ms) = esperar por CONDICIÓN (mejor que sleep fijo).

REGLAS OBLIGATORIAS (no negociables):
1) ⛔ PLATA: NO modifiques la lógica de ENVÍO ni de ANTI-DUPLICADO (transferir.mjs 'ejecutar',
   masiva.mjs 'ejecutarMasivo', ni el submit/confirmación en login-humano). Arreglá SOLO
   NAVEGACIÓN / MAPEO / SELECTORES / ESPERAS. Si el fix tocaría plata, NO lo apliques: reportá.
2) Robustez: esperas por CONDICIÓN (esperarTexto) y locators por texto/rol; JAMÁS clic por píxel fijo.
3) VERIFICÁ tu fix con el dry-run correspondiente (NO envía nada) ANTES de darlo por bueno.
   Si el dry-run no llega a poder correr (banco caído/cuenta bloqueada), NO apliques a ciegas:
   dejá el fix propuesto y explicá cómo verificarlo.
4) Cambios MÍNIMOS y quirúrgicos. Corré \`node --check <archivo>\` tras editar.
5) Al terminar, escribí un resumen claro: qué causaba el error, qué cambiaste (archivo:línea) y
   cómo lo verificaste (o por qué no pudiste y qué falta).`

const contexto = [
  '## INCIDENTE A DIAGNOSTICAR Y ARREGLAR', '',
  '```json', JSON.stringify(inc, null, 2), '```', '',
]
// adjuntar cola del log si viene referenciado
if (inc.log && existsSync(inc.log)) {
  try { contexto.push('## Cola del log del incidente', '```', readFileSync(inc.log, 'utf8').split('\n').slice(-60).join('\n'), '```', '') } catch {}
}
// listar screenshots relevantes (Claude puede abrirlos con Read)
if (Array.isArray(inc.screenshots) && inc.screenshots.length) {
  contexto.push('## Screenshots (ábrelos con Read para ver la pantalla del banco):')
  for (const s of inc.screenshots) if (existsSync(s)) contexto.push('- ' + s)
  contexto.push('')
}
contexto.push('## TAREA', 'Diagnosticá por qué falló (mirá screenshots + log), aplicá el fix MÍNIMO de',
  'navegación/mapeo respetando las reglas, verificá con el dry-run, y reportá.')

const prompt = contexto.join('\n')

// ── invocar claude -p headless en el dir del banco ───────────────────────────
mkdirSync(join(DIR, 'data', 'auto-fix-logs'), { recursive: true })
const outLog = join(DIR, 'data', 'auto-fix-logs', `fix-${Date.now()}.log`)
log(`arreglando incidente ${incPath} con ${MODEL} → log ${outLog}`)

const args = ['-p', '--model', MODEL, '--dangerously-skip-permissions', '--add-dir', DIR,
  '--append-system-prompt', SISTEMA, prompt]

// Modo DRY: imprime el prompt y el comando, NO invoca a Claude (para revisar el prompt).
if (process.env.TEK_AUTOFIX_DRY === '1') {
  console.log('=== SYSTEM PROMPT ===\n' + SISTEMA + '\n\n=== USER PROMPT ===\n' + prompt)
  console.log('\n=== COMANDO ===\n' + CLAUDE + ' -p --model ' + MODEL + ' --dangerously-skip-permissions --add-dir ' + DIR + ' --append-system-prompt <SISTEMA> <PROMPT>')
  process.exit(0)
}
const h = spawn(CLAUDE, args, { cwd: DIR, env: { ...process.env } })
let out = ''
h.stdout.on('data', (d) => { out += d; process.stdout.write(d) })
h.stderr.on('data', (d) => { out += d })
h.on('exit', (code) => {
  writeFileSync(outLog, `INCIDENTE: ${incPath}\nMODEL: ${MODEL}\nEXIT: ${code}\n\n=== PROMPT ===\n${prompt}\n\n=== SALIDA CLAUDE ===\n${out}`)
  log(`terminó (exit ${code}). Resumen en ${outLog}`)
  process.exit(code || 0)
})

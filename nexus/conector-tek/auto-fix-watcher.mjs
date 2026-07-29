// auto-fix-watcher.mjs — SIEMPRE ATENTO: vigila data/incidentes/ y, cuando aparece un error de
// mapeo del banco, corre el auto-fix (Claude headless diagnostica + arregla + VERIFICA con dry-run)
// de a UNO por vez (serial, con lock — nunca dos Claude editando el mismo archivo). Al terminar,
// avisa a Ramón el resultado. LaunchAgent com.nexus.tek-autofix-watcher (KeepAlive).
//
// Seguridad: el auto-fix solo toca NAVEGACIÓN/MAPEO (el prompt prohíbe la lógica de plata); y el
// re-ejecutar la operación real de PLATA NO es automático (se avisa "ya lo arreglé, reintentá").
import { readdirSync, existsSync, writeFileSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const DIR = dirname(fileURLToPath(import.meta.url))
const INC_DIR = join(DIR, 'data', 'incidentes')
const NUM_RAMON = process.env.AUTOFIX_AVISAR_A || '56932945240'
const POLL_MS = Number(process.env.AUTOFIX_POLL_MS || 30000)
const ACTIVO = process.env.TEK_AUTOFIX === '1'   // solo arregla si está encendido (opt-in)
const log = (...a) => console.log(new Date().toISOString(), '[watcher]', ...a)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sh = (cmd, args, opts = {}) => new Promise((res) => {
  const h = spawn(cmd, args, { cwd: DIR, ...opts }); let out = ''
  h.stdout?.on('data', (d) => { out += d }); h.stderr?.on('data', (d) => { out += d })
  h.on('exit', (code) => res({ code, out })); h.on('error', () => res({ code: -1, out }))
})

async function avisar(texto) {
  // best-effort: WhatsApp por kapso (si se puede) + notificación local
  try { const kapso = await import('../hub/kapso.mjs'); await kapso.enviarKapso(NUM_RAMON, texto) } catch { /* */ }
  try { await sh('/usr/bin/osascript', ['-e', `display notification "${texto.replace(/"/g, "'").slice(0, 180)}" with title "🤖 Auto-fix banco"`]) } catch { /* */ }
}

function incidentesPendientes() {
  try {
    return readdirSync(INC_DIR)
      .filter((f) => f.endsWith('.json') && !existsSync(join(INC_DIR, f + '.done')))
      .map((f) => join(INC_DIR, f))
      .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs)   // más viejo primero
  } catch { return [] }
}

async function procesar(incPath) {
  let inc = {}; try { inc = JSON.parse(readFileSync(incPath, 'utf8')) } catch {}
  log(`arreglando incidente (${inc.flujo}/${inc.estado})…`)
  await avisar(`🤖 Detecté un error en el banco (flujo *${inc.flujo}*, ${inc.estado}). Lo estoy arreglando solo, te aviso cuando termine.`)
  const r = await sh(process.execPath, [join(DIR, 'auto-fix-banco.mjs'), incPath])
  writeFileSync(incPath + '.done', new Date().toISOString())
  // Resumen: últimas líneas de la salida de Claude (su reporte final)
  const resumen = String(r.out || '').split('\n').filter(Boolean).slice(-12).join('\n').slice(-700)
  const ok = /verific|dry.?run|form_ok|arregl|apliqu/i.test(resumen) && !/no pude|no aplic|falló/i.test(resumen)
  await avisar(`${ok ? '✅' : '⚠️'} Auto-fix del flujo *${inc.flujo}* terminó.\n${resumen}\n\n${ok ? 'Reintentá la operación cuando quieras — debería funcionar.' : 'No pude verificar del todo; revisá el log data/auto-fix-logs/.'}`)
  log(`incidente procesado (ok=${ok}).`)
}

log(`watcher encendido (auto-editar=${ACTIVO ? 'ON' : 'OFF (solo avisa)'}, poll=${POLL_MS}ms, aviso a ${NUM_RAMON}).`)
for (;;) {
  try {
    const pend = incidentesPendientes()
    // SIEMPRE ATENTO: avisa cada incidente nuevo apenas aparece (aunque el auto-editar esté OFF).
    for (const p of pend) {
      const flag = p + '.avisado'
      if (!existsSync(flag)) {
        let inc = {}; try { inc = JSON.parse(readFileSync(p, 'utf8')) } catch {}
        writeFileSync(flag, new Date().toISOString())
        await avisar(`🔎 Detecté un error en el banco: flujo *${inc.flujo}*, ${inc.estado}.${ACTIVO ? ' Lo arreglo solo y te aviso.' : ' (Auto-arreglo APAGADO — activalo con TEK_AUTOFIX=1 cuando el banco esté arriba, o corré `node auto-fix-banco.mjs` a mano.)'}`)
      }
    }
    // AUTO-EDITAR: solo si está encendido Y el banco está operativo (si no, no puede verificar).
    if (ACTIVO && pend.length) await procesar(pend[0])
  } catch (e) { log('error en la vuelta:', e.message) }
  await sleep(POLL_MS)
}

// abrir-login-asistido.mjs — DISPARADOR del login asistido on-demand.
//
// Cuando una operación necesita el banco y NO hay sesión viva, esto:
//   1. Genera un PIN NUEVO de un solo uso (8 dígitos) y lo escribe en el archivo OTP
//      que lee serve-novnc (:6081, ruta pública /vnc). Sin este PIN vigente, la URL /vnc
//      queda inútil (muestra "sin sesión activa").
//   2. Abre el login REAL del banco en el mini (login-humano en modo asistido) para que
//      el humano lo maneje por la URL /vnc (mouse+tecleo reales = pasa BioCatch).
//   3. Devuelve { url, pin } para que el hub se lo mande al usuario por WhatsApp.
//   4. El PIN se INVALIDA solo cuando el login termina (login-humano vacía el OTP al salir,
//      vía TEK_OTP_FILE) → la URL vuelve a quedar inútil. Cero exposición fuera de la ventana.
//
// Uso (CLI):   TEK_EMPRESA="ANA CLARA" TEK_MOTIVO="transferencia" node abrir-login-asistido.mjs
// Uso (mód):   import { abrirLoginAsistido } from './abrir-login-asistido.mjs'
//
// Pre-rellenado (default) = pre-llena RUT+clave con tecleo realista y el humano solo da
// Aceptar + Superclave. Manual (TEK_ASSIST_MANUAL=1) = form vacío, el humano teclea todo.
import { spawn } from 'node:child_process'
import { writeFileSync, chmodSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const DIR = dirname(fileURLToPath(import.meta.url))
const OTP_FILE = process.env.NOVNC_OTP_FILE || '/Users/AIagenteia/nexus/novnc-web/.novnc-otp'
const VNC_URL = process.env.TEK_VNC_URL || 'https://mac-mini-de-nicolas.tailee0068.ts.net/vnc'

/**
 * Prepara el acceso (PIN nuevo) y abre el login asistido del banco en el mini.
 * @param {object} opts { empresa, motivo, manual }
 * @returns {Promise<{url,pin,empresa,motivo,pid}>}
 */
export async function abrirLoginAsistido(opts = {}) {
  const empresa = opts.empresa || process.env.TEK_EMPRESA || 'ANA CLARA'
  const motivo = opts.motivo || process.env.TEK_MOTIVO || ''
  const manual = opts.manual ?? (process.env.TEK_ASSIST_MANUAL === '1')

  // 1) PIN nuevo de un solo uso
  const pin = String(crypto.randomInt(10_000_000, 100_000_000))   // 8 dígitos
  writeFileSync(OTP_FILE, pin, { mode: 0o600 })
  try { chmodSync(OTP_FILE, 0o600) } catch { /* */ }

  // 2) Abrir el login asistido (form real del banco en el mini). Detached: corre solo; el
  //    humano lo maneja por /vnc. TEK_OTP_FILE hace que login-humano vacíe el PIN al terminar.
  const env = {
    ...process.env,
    TEK_ASSIST: '1',
    ...(manual ? { TEK_ASSIST_MANUAL: '1' } : {}),
    TEK_EMPRESA: empresa,
    ...(motivo ? { TEK_MOTIVO: motivo } : {}),
    TEK_OTP_FILE: OTP_FILE,
  }
  const child = spawn(process.execPath, [join(DIR, 'login-humano.mjs')], {
    cwd: DIR, env, detached: true, stdio: 'ignore',
  })
  child.unref()

  return { url: VNC_URL, pin, empresa, motivo, pid: child.pid, modo: manual ? 'manual' : 'pre-rellenado' }
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('abrir-login-asistido.mjs')) {
  abrirLoginAsistido()
    .then((r) => console.log('RESULTADO:', JSON.stringify(r)))
    .catch((e) => { console.log('ERROR:', e.message); process.exit(1) })
}

export default { abrirLoginAsistido }

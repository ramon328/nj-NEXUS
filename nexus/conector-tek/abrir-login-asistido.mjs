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
// Desde el 03-ago-2026 la mecánica vive en puerta.mjs (la puerta única del banco); este
// archivo queda como la entrada simple "solo abrime el banco" (CLI + tool reconectar_banco).
// La diferencia con puerta.abrirAsistido: acá NO viaja ninguna operación enganchada.
//
// Uso (CLI):   TEK_EMPRESA="ANA CLARA" TEK_USER=joaquin node abrir-login-asistido.mjs
// Uso (mód):   import { abrirLoginAsistido } from './abrir-login-asistido.mjs'
//
// Pre-rellenado (default) = pre-llena RUT+clave con tecleo realista y el humano solo da
// Aceptar + Superclave. Manual (TEK_ASSIST_MANUAL=1) = form vacío, el humano teclea todo.
import * as puerta from './puerta.mjs'

/**
 * Prepara el acceso (PIN nuevo) y abre el login asistido del banco en el mini.
 * @param {object} opts { empresa, user, motivo, manual }
 * @returns {Promise<{url,pin,empresa,motivo,pid}>}
 */
export async function abrirLoginAsistido(opts = {}) {
  const empresa = opts.empresa || process.env.TEK_EMPRESA || 'ANA CLARA SPA'
  const motivo = opts.motivo || process.env.TEK_MOTIVO || ''
  // SESIÓN POR PERSONA: cada uno entra con SU login, también en ANA CLARA. Antes acá se
  // forzaba 'ramon' y por eso Joaquín se quedaba sin poder operar. Ver [[tek-sesion-por-persona]].
  const userId = (opts.user || process.env.TEK_USER || 'ramon').toLowerCase().trim() || 'ramon'
  const r = puerta.abrirAsistido({ userId, empresa, motivo, manual: opts.manual, etiqueta: 'reconectar' })
  return {
    url: r.url, pin: r.pin, empresa: r.empresa, userId: r.userId, motivo,
    pid: r.pid, en_vuelo: !!r.en_vuelo, ocupado: !!r.ocupado, nota: r.nota,
    modo: (opts.manual ?? (process.env.TEK_ASSIST_MANUAL === '1')) ? 'manual' : 'pre-rellenado',
  }
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('abrir-login-asistido.mjs')) {
  abrirLoginAsistido()
    .then((r) => console.log('RESULTADO:', JSON.stringify(r)))
    .catch((e) => { console.log('ERROR:', e.message); process.exit(1) })
}

export default { abrirLoginAsistido }

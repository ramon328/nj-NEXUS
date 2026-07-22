// comprobantes.mjs — Capa de lógica de tek para DESCARGAR comprobantes de pago desde
// Santander Empresa (Transferencias → Consultas Histórica → Histórico). SOLO LECTURA:
// lista las transferencias hechas y baja el PDF de una. NO mueve plata ni autoriza nada.
// Usa el MISMO lock de sesión que la masiva (una sola operación bancaria a la vez).
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import * as credenciales from './credenciales.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const LOCK_FILE = join(DIR, 'data', '.masiva.lock')   // mismo lock que masiva: única sesión de banco

function bancoOcupado() {
  try {
    if (!existsSync(LOCK_FILE)) return false
    const ts = Number(readFileSync(LOCK_FILE, 'utf8')) || 0
    if (Date.now() - ts > 12 * 60_000) { try { unlinkSync(LOCK_FILE) } catch { /* */ } return false }
    return true
  } catch { return false }
}
function tomarLock() { try { mkdirSync(join(DIR, 'data'), { recursive: true }); writeFileSync(LOCK_FILE, String(Date.now())) } catch { /* */ } }
function soltarLock() { try { unlinkSync(LOCK_FILE) } catch { /* */ } }

// Corre login-humano con TEK_COMPROBANTES=<modo> y devuelve el objeto `comprob` del RESULTADO.
function correr(modo, extraEnv = {}, userId = 'ramon', empresa = 'ANA CLARA SPA') {
  if (!credenciales.tieneConexion(userId, empresa)) {
    return Promise.resolve({ ok: false, estado: 'sin_conexion', error: `"${userId}" no tiene banco conectado para "${empresa}".` })
  }
  if (bancoOcupado()) {
    return Promise.resolve({ ok: false, estado: 'ocupado', error: 'Hay una operación bancaria en curso. Espera ~2 min y reintenta.' })
  }
  tomarLock()
  return new Promise((resolve) => {
    const env = { ...process.env, TEK_COMPROBANTES: modo, TEK_EMPRESA: empresa.replace(/ SPA$/i, '').trim() || 'ANA CLARA', TEK_USER: userId, ...extraEnv }
    const hijo = spawn(process.execPath, [join(DIR, 'login-humano.mjs')], { cwd: DIR, env })
    let out = '', err = ''
    hijo.stdout.on('data', (d) => { out += d.toString() })
    hijo.stderr.on('data', (d) => { err += d.toString() })
    const to = setTimeout(() => { try { hijo.kill('SIGKILL') } catch {} }, 11 * 60_000)
    const fin = () => {
      clearTimeout(to); soltarLock()
      let resultado = null
      const lineas = out.split('\n')
      for (let i = lineas.length - 1; i >= 0; i--) {
        const idx = lineas[i].indexOf('RESULTADO:')
        if (idx >= 0) { try { resultado = JSON.parse(lineas[i].slice(idx + 'RESULTADO:'.length).trim()); break } catch {} }
      }
      const comprob = resultado?.comprob || null
      // Si el banco botó la sesión por seguridad, avísalo claro (login flageado / expiró).
      const seguridad = /logout\/error-seguridad|device|error-seguridad/i.test(resultado?.url || comprob?.url || '')
      resolve({ ok: Boolean(comprob) && !seguridad, estado: seguridad ? 'sesion_caida' : (comprob?.estado || resultado?.estado || 'sin_resultado'), comprob, stderr: err.slice(-300) })
    }
    hijo.on('close', fin)
    hijo.on('error', (e) => { clearTimeout(to); soltarLock(); resolve({ ok: false, estado: 'spawn_error', error: e.message }) })
  })
}

/** Lista las transferencias/comprobantes del histórico (para que el usuario elija cuál). */
export async function listarComprobantes() {
  const r = await correr('listar')
  return { ...r, filas: r.comprob?.filas || [], total: r.comprob?.total_filas || 0 }
}

/** Baja el PDF del comprobante de la fila `idx` (1-based). Devuelve { ok, pdf }. */
export async function bajarComprobante(idx = 1) {
  const r = await correr('bajar', { TEK_COMPROB_IDX: String(Math.max(1, parseInt(idx, 10) || 1)) })
  return { ...r, pdf: r.comprob?.pdf || null }
}

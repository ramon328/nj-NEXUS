// comprobantes.mjs — Capa de lógica de tek para DESCARGAR comprobantes de pago desde
// Santander Empresa (Transferencias → Consultas Histórica → Histórico). SOLO LECTURA:
// lista las transferencias hechas y baja el PDF de una. NO mueve plata ni autoriza nada.
// Usa el MISMO lock de sesión que la masiva (una sola operación bancaria a la vez).
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import * as credenciales from './credenciales.mjs'
import * as puerta from './puerta.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
// Lock POR PERSONA (igual que login-humano): la operación de una persona NO bloquea a otra —
// usan sesiones distintas. Antes el lock era global (.masiva.lock) → una op de Nico marcaba
// "banco ocupado" a una de Ramón aunque su sesión estuviera libre.
function lockFile(userId) {
  const slug = String(userId || 'ramon').toLowerCase().replace(/[^a-z0-9]/g, '') || 'ramon'
  return join(DIR, 'data', slug === 'ramon' ? '.masiva.lock' : `.lock-${slug}`)
}
function bancoOcupado(lf) {
  try {
    if (!existsSync(lf)) return false
    const ts = Number(readFileSync(lf, 'utf8')) || 0
    if (Date.now() - ts > 12 * 60_000) { try { unlinkSync(lf) } catch { /* */ } return false }
    return true
  } catch { return false }
}
function tomarLock(lf) { try { mkdirSync(join(DIR, 'data'), { recursive: true }); writeFileSync(lf, String(Date.now())) } catch { /* */ } }
function soltarLock(lf) { try { unlinkSync(lf) } catch { /* */ } }

// Corre login-humano con TEK_COMPROBANTES=<modo> y devuelve el objeto `comprob` del RESULTADO.
function correr(modo, extraEnv = {}, userId = 'ramon', empresa = 'ANA CLARA SPA') {
  userId = (userId || 'ramon').toLowerCase()
  if (!credenciales.tieneConexion(userId, empresa)) {
    return Promise.resolve({ ok: false, estado: 'sin_conexion', error: `"${userId}" no tiene banco conectado para "${empresa}".` })
  }
  const lf = lockFile(userId)
  if (bancoOcupado(lf)) {
    return Promise.resolve({ ok: false, estado: 'ocupado', error: 'Hay una operación bancaria en curso para esta persona. Espera ~2 min y reintenta.' })
  }
  tomarLock(lf)
  return new Promise((resolve) => {
    const env = { ...process.env, TEK_COMPROBANTES: modo, TEK_EMPRESA: empresa.replace(/ SPA$/i, '').trim() || 'ANA CLARA', TEK_USER: userId, ...extraEnv }
    // AUTO-LOGIN CON CLICS HUMANOS: el spawn de abajo es login-humano en MODO AUTO — si la
    // sesión está viva la reusa, si está dormida LOGUEA SOLO (mouse que viaja a los botones +
    // clic real, lo que ya pasó BioCatch) y corre la operación. Solo si ese login no pudo
    // entrar por sí mismo (Superclave / rebote antifraude) caemos al ASISTIDO (link + PIN).
    const hijo = spawn(process.execPath, [join(DIR, 'login-humano.mjs')], { cwd: DIR, env })
    let out = '', err = ''
    hijo.stdout.on('data', (d) => { out += d.toString() })
    hijo.stderr.on('data', (d) => { err += d.toString() })
    const to = setTimeout(() => { try { hijo.kill('SIGKILL') } catch {} }, 11 * 60_000)
    const fin = () => {
      clearTimeout(to); soltarLock(lf)
      let resultado = null
      const lineas = out.split('\n')
      for (let i = lineas.length - 1; i >= 0; i--) {
        const idx = lineas[i].indexOf('RESULTADO:')
        if (idx >= 0) { try { resultado = JSON.parse(lineas[i].slice(idx + 'RESULTADO:'.length).trim()); break } catch {} }
      }
      const comprob = resultado?.comprob || null
      // Si el banco botó la sesión por seguridad, avísalo claro (login flageado / expiró).
      const seguridad = /logout\/error-seguridad|device|error-seguridad/i.test(resultado?.url || comprob?.url || '')
      // ¿El login automático NO pudo entrar solo (pide Superclave / lo rebotó el antifraude)?
      // → recién ahí abrimos el ASISTIDO: le mandamos link+PIN al usuario y la operación queda
      //   enganchada a ESE login (se ejecuta sola cuando entra).
      if (!comprob && process.env.TEK_SIN_ASISTIDO !== '1' && (seguridad || puerta.loginNecesitaHumano(resultado))) {
        const jobFile = join(DIR, 'data', `.job-comp-${Date.now().toString(36)}.json`)
        const ab = puerta.abrirAsistido({
          userId, empresa, motivo: modo === 'bajar' ? 'bajar los comprobantes' : 'ver los comprobantes',
          env: { ...env, TEK_RESULTADO_FILE: jobFile }, etiqueta: `comprobantes:${modo}:${userId}`,
        })
        if (ab.ocupado) return resolve({ ok: false, estado: 'ocupado', ocupado: true, error: ab.nota })
        return resolve({
          ok: false, estado: 'necesita_login', necesita_login: true,
          url: ab.url, pin: ab.pin, userId, empresa, job: ab.en_vuelo ? null : jobFile,
          nota: 'El login automático no pudo entrar solo (probable Superclave o seguridad). Te abrí el login para que entres vos; apenas entres sigo con los comprobantes.',
        })
      }
      resolve({ ok: Boolean(comprob) && !seguridad, estado: seguridad ? 'sesion_caida' : (comprob?.estado || resultado?.estado || 'sin_resultado'), comprob, stderr: err.slice(-300) })
    }
    hijo.on('close', fin)
    hijo.on('error', (e) => { clearTimeout(to); soltarLock(lf); resolve({ ok: false, estado: 'spawn_error', error: e.message }) })
  })
}

/** Lista las transferencias/comprobantes del histórico (para que el usuario elija cuál). */
export async function listarComprobantes({ userId, empresa } = {}) {
  const r = await correr('listar', {}, userId, empresa)
  return { ...r, filas: r.comprob?.filas || [], total: r.comprob?.total_filas || 0 }
}

/**
 * Baja el/los PDF de comprobantes. `spec` = número (1), array [1,3,5], o 'todos'.
 * Descarga TODOS en una sola sesión de banco. Devuelve { ok, comprobantes: [{idx, pdf}], ok_count }.
 */
export async function bajarComprobantes(spec = '1', { userId, empresa } = {}) {
  const idxStr = Array.isArray(spec) ? spec.join(',') : String(spec)
  const r = await correr('bajar', { TEK_COMPROB_IDX: idxStr }, userId, empresa)
  const comprobantes = r.comprob?.comprobantes || []
  return { ...r, comprobantes, ok_count: r.comprob?.ok_count ?? comprobantes.filter((c) => c.pdf).length, total: r.comprob?.total_filas || 0 }
}

/** Compat: baja UN comprobante (fila 1-based). Devuelve { ok, pdf }. */
export async function bajarComprobante(idx = 1) {
  const r = await bajarComprobantes(String(Math.max(1, parseInt(idx, 10) || 1)))
  const c = (r.comprobantes || [])[0]
  return { ...r, pdf: c?.pdf || null }
}

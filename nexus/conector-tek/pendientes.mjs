// pendientes.mjs — Capa de lógica de tek para LISTAR las transferencias/masivas "Por Autorizar"
// (pendientes de aprobación) de una PERSONA en Santander Empresa. SOLO LECTURA: navega a
// Transferencias → Autorización (individuales) + Transferencias Masivas → Liberación (lotes) y
// devuelve las filas pendientes. NO autoriza, NO libera, NO mueve plata (jamás toca Superclave).
// Reusa la sesión viva de esa persona (el corazón la mantiene) o la abre si está dormida.
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import * as credenciales from './credenciales.mjs'
import * as puerta from './puerta.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))

// Lock POR PERSONA (igual que login-humano/comprobantes/masiva): la lectura de una persona NO
// bloquea operaciones de otra.
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

/**
 * Lista las transferencias/masivas PENDIENTES DE APROBACIÓN ("Por Autorizar") de una persona.
 * Reusa su sesión viva (corazón) o la abre si está dormida. Devuelve { ok, estado, filas, total }.
 * `empresa` = de qué empresa mirar (la lista es por empresa en el banco). Default: ANA CLARA.
 */
export function listarPendientes({ userId, empresa, asistido = true } = {}) {
  userId = (userId || 'ramon').toLowerCase()
  empresa = empresa || 'ANA CLARA SPA'
  if (!credenciales.tieneConexion(userId, empresa)) {
    return Promise.resolve({ ok: false, estado: 'sin_conexion', error: `"${userId}" no tiene banco conectado para "${empresa}".` })
  }
  const lf = lockFile(userId)
  if (bancoOcupado(lf)) {
    return Promise.resolve({ ok: false, estado: 'ocupado', error: 'Hay una operación bancaria en curso para esta persona. Espera ~2 min y reintenta.' })
  }
  tomarLock(lf)
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      TEK_VER_PENDIENTES: '1',
      TEK_USER: userId,
      TEK_EMPRESA: empresa.replace(/ SPA$/i, '').trim() || 'ANA CLARA',
    }
    // Sesión dormida → login asistido con la consulta enganchada (mismo criterio que
    // transferir/masiva): le llega el link, entra, y la lista se lee sola.
    const sesion = puerta.estadoSesion(userId)
    if (asistido && !sesion.viva) {
      soltarLock(lf)   // el candado real lo toma login-humano (candado.mjs) dentro del proceso
      const jobFile = join(DIR, 'data', `.job-pend-${Date.now().toString(36)}.json`)
      const ab = puerta.abrirAsistido({
        userId, empresa, motivo: 'ver las transferencias pendientes de autorizar',
        env: { ...env, TEK_RESULTADO_FILE: jobFile }, etiqueta: `pendientes:${userId}`,
      })
      if (ab.ocupado) return resolve({ ok: false, estado: 'ocupado', ocupado: true, error: ab.nota })
      return resolve({
        ok: false, estado: 'necesita_login', necesita_login: true,
        url: ab.url, pin: ab.pin, userId, empresa, job: jobFile,
        nota: 'La sesión del banco está dormida: le abrí el login. Apenas entre, leo las pendientes solo.',
      })
    }
    const hijo = spawn(process.execPath, [join(DIR, 'login-humano.mjs')], { cwd: DIR, env })
    let out = '', err = ''
    hijo.stdout.on('data', (d) => { out += d.toString() })
    hijo.stderr.on('data', (d) => { err += d.toString() })
    const to = setTimeout(() => { try { hijo.kill('SIGKILL') } catch {} }, 8 * 60_000)
    const fin = () => {
      clearTimeout(to); soltarLock(lf)
      let resultado = null
      const lineas = out.split('\n')
      for (let i = lineas.length - 1; i >= 0; i--) {
        const idx = lineas[i].indexOf('RESULTADO:')
        if (idx >= 0) { try { resultado = JSON.parse(lineas[i].slice(idx + 'RESULTADO:'.length).trim()); break } catch {} }
      }
      const p = resultado?.pendientes || null
      const seguridad = /logout\/error-seguridad|device|error-seguridad|sesion_muerta/i.test((resultado?.url || '') + ' ' + (resultado?.estado || ''))
      if (!p && seguridad) return resolve({ ok: false, estado: 'sesion_caida', error: 'La sesión del banco se cayó/expiró. Reintentar en un momento.' })
      if (!p) return resolve({ ok: false, estado: resultado?.estado || 'sin_resultado', error: 'No pude leer las pendientes.', stderr: err.slice(-300) })
      resolve({ ok: true, estado: 'ok', filas: p.filas || [], total: p.total ?? (p.filas || []).length, llego: p.llego !== false, texto: p.texto || '' })
    }
    hijo.on('close', fin)
    hijo.on('error', (e) => { clearTimeout(to); soltarLock(lf); resolve({ ok: false, estado: 'spawn_error', error: e.message }) })
  })
}

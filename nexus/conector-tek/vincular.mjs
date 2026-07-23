// vincular.mjs — Vinculación de banco POR USUARIO. Prueba las credenciales que el usuario
// ingresó en el widget: hace login en un perfil EFÍMERO (no toca la sesión compartida) y
// devuelve las EMPRESAS asociadas al RUT (algunas cuentas tienen varias, para elegir cuál).
// NO guarda nada: el guardado (cifrado) lo hace conectar-web.mjs tras la elección.
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'

const DIR = dirname(fileURLToPath(import.meta.url))
const LOCK = join(DIR, 'data', '.masiva.lock')   // mismo lock: una sola sesión de banco a la vez

function bancoOcupado() {
  try {
    if (!existsSync(LOCK)) return false
    const ts = Number(readFileSync(LOCK, 'utf8')) || 0
    if (Date.now() - ts > 12 * 60_000) { try { unlinkSync(LOCK) } catch { /* */ } return false }
    return true
  } catch { return false }
}
function tomarLock() { try { mkdirSync(join(DIR, 'data'), { recursive: true }); writeFileSync(LOCK, String(Date.now())) } catch { /* */ } }
function soltarLock() { try { unlinkSync(LOCK) } catch { /* */ } }

/**
 * Loguea con las creds dadas y devuelve las empresas del RUT.
 * @returns { ok, empresas:[{contrato,rut,empresa,rol}], estado? }
 */
export async function listarEmpresas({ rut, clave, banco = 'Santander' } = {}) {
  if (!rut || !clave) return { ok: false, error: 'Faltan RUT o clave.' }
  if (bancoOcupado()) return { ok: false, estado: 'ocupado', error: 'Hay una operación bancaria en curso. Reintenta en ~2 min.' }
  tomarLock()
  return await new Promise((resolve) => {
    const env = { ...process.env, TEK_VINCULAR: 'empresas', TEK_RUT: String(rut), TEK_CLAVE: String(clave), TEK_BANCO: banco, TEK_FORZAR_LOGIN: '1' }
    const hijo = spawn(process.execPath, [join(DIR, 'login-humano.mjs')], { cwd: DIR, env })
    let out = '', err = ''
    hijo.stdout.on('data', (d) => { out += d.toString() })
    hijo.stderr.on('data', (d) => { err += d.toString() })
    const to = setTimeout(() => { try { hijo.kill('SIGKILL') } catch {} }, 11 * 60_000)
    hijo.on('close', () => {
      clearTimeout(to); soltarLock()
      let r = null
      const L = out.split('\n')
      for (let i = L.length - 1; i >= 0; i--) { const idx = L[i].indexOf('RESULTADO:'); if (idx >= 0) { try { r = JSON.parse(L[i].slice(idx + 'RESULTADO:'.length).trim()); break } catch {} } }
      const v = r?.vincular
      if (v?.empresas?.length) return resolve({ ok: true, empresas: v.empresas })
      if (/error-seguridad|device_trust|device/i.test((r?.url || '') + ' ' + (r?.estado || ''))) return resolve({ ok: false, estado: 'sesion_caida', error: 'El banco bloqueó el intento (seguridad/antifraude). Reintenta en un rato.' })
      if (/sin_form|clave|login/i.test(r?.estado || '')) return resolve({ ok: false, estado: 'login_fallido', error: 'No pude entrar: revisa el RUT y la clave.' })
      resolve({ ok: false, estado: r?.estado || 'sin_empresas', error: 'Entré pero no pude leer las empresas.', stderr: err.slice(-200) })
    })
    hijo.on('error', (e) => { clearTimeout(to); soltarLock(); resolve({ ok: false, error: e.message }) })
  })
}

// candado.mjs — UN solo navegador por perfil de banco.
//
// Por qué existe: el perfil de Chrome de cada persona (chrome-profile-<user>) es un
// directorio de datos que Chrome asume suyo en exclusiva. Si dos procesos lo abren a la
// vez, el banco ve dos navegadores sobre la misma sesión y la corta. Eso se documentó el
// 24-jul en corazon.mjs y volvió a pasar el 27-jul: siete scripts manejaban el perfil sin
// pedir permiso, así que el latido del corazón podía entrar encima de una captura en curso.
//
// El protocolo (pid + ts en JSON, creación atómica con 'wx') es el que ya usaba
// login-humano.mjs; acá está extraído para que TODOS los que abren el navegador usen el
// mismo archivo y se excluyan de verdad.
//
// Uso:
//   import { crearCandado } from './candado.mjs'
//   const candado = crearCandado()
//   if (!await candado.adquirir()) { /* otro tiene el banco: salir sin abrir nada */ }
//   try { ...manejar el navegador... } finally { candado.soltar() }
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const ESPERA_DEFECTO = 8 * 60_000   // cuánto esperamos a que el otro termine
const COLGADO_MS = 12 * 60_000      // un candado más viejo que esto se considera basura

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function rutaCandado(user = process.env.TEK_USER) {
  const u = String(user || 'ramon').toLowerCase().replace(/[^a-z0-9]/g, '') || 'ramon'
  return join(DIR, u === 'ramon' ? 'session.lock' : `session-${u}.lock`)
}

export function crearCandado({ user, log = () => {} } = {}) {
  const LOCK = rutaCandado(user)
  let mio = false

  function vivo() {
    try {
      const j = JSON.parse(readFileSync(LOCK, 'utf8'))
      if (!j.pid) return false
      try { process.kill(j.pid, 0) } catch { return false }   // el dueño murió → candado huérfano
      return Date.now() - (j.ts || 0) <= COLGADO_MS
    } catch { return false }
  }

  // Ojo con el default: un TEK_LOCK_WAIT_MS=0 explícito ("no esperes nada") tiene que valer 0,
  // no caer al defecto de 8 min por ser falsy (eso hacía que un proceso de prueba se quedara
  // 8 minutos esperando el candado y después abriera el banco sin que nadie lo esperara).
  async function adquirir(esperaMs) {
    if (esperaMs == null) {
      const env = Number(process.env.TEK_LOCK_WAIT_MS)
      esperaMs = Number.isFinite(env) && process.env.TEK_LOCK_WAIT_MS !== '' ? env : ESPERA_DEFECTO
    }
    const t0 = Date.now(); let aviso = false
    for (;;) {
      // 'wx' crea en modo exclusivo y falla si ya existe: solo un proceso puede ganar.
      // Chequear-y-después-escribir sería una carrera y dejaría pasar dos navegadores.
      try {
        writeFileSync(LOCK, JSON.stringify({ pid: process.pid, ts: Date.now() }), { flag: 'wx' })
        mio = true
        return true
      } catch (e) {
        if (e && e.code !== 'EEXIST') { mio = true; return true }   // fallo raro de fs → no bloqueamos el banco por esto
      }
      if (!vivo()) { try { unlinkSync(LOCK) } catch {} continue }
      if (Date.now() - t0 > esperaMs) return false
      if (!aviso) { log('ya hay una sesión de banco activa — espero a que termine (NO abro otra)'); aviso = true }
      await sleep(5000 + Math.floor(Math.random() * 2000))   // jitter: rompe empates entre procesos
    }
  }

  function soltar() {
    if (!mio) return
    try { const j = JSON.parse(readFileSync(LOCK, 'utf8')); if (j.pid === process.pid) unlinkSync(LOCK) } catch {}
    mio = false
  }

  process.on('exit', soltar)
  return { adquirir, soltar, vivo, ruta: LOCK }
}

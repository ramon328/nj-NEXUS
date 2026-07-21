// actualizar.mjs — ORQUESTADOR de re-login BAJO DEMANDA para Santander.
// Regla pedida por Ramón:
//   1) Si el sistema NO se usa y el token venció → NO se re-loguea (esto solo corre
//      cuando alguien PIDE data; en idle no se llama nunca).
//   2) Si se NECESITA data y el token venció → se dispara login para token nuevo.
//
// Estrategia (barato→caro, sin machacar el banco):
//   a) Corre fetch-santander: si la sesión sigue viva, trae data y listo (sin login).
//   b) Si fetch dice "sesion_expirada" → intenta login-humano (AUTO). Si entra, vuelve
//      a fetchear. Si el banco pide Superclave/MFA → marca "necesita_superclave" y NO
//      reintenta (cooldown), para no gastar logins ni arriesgar bloqueo.
//   Candado: un solo pipeline a la vez. Cooldown tras pedir Superclave: 25 min.
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const DIR = '/Users/AIagenteia/nexus/conector-tek'
const DATA = join(DIR, 'data')
const LOCK = join(DATA, '.pipeline.lock')
const ESTADO = join(DATA, 'estado.json')
const NODE = '/usr/local/bin/node'
const COOLDOWN_MS = 25 * 60 * 1000     // no reintentar login si hace <25min pidió Superclave
const LOCK_TTL_MS = 8 * 60 * 1000      // candado viejo se ignora tras 8min

const log = (...a) => console.log('·', ...a)
const leerEstado = () => { try { return JSON.parse(readFileSync(ESTADO, 'utf8')) } catch { return {} } }
const escribirEstado = (o) => { try { writeFileSync(ESTADO, JSON.stringify({ ...leerEstado(), ...o }, null, 2)) } catch {} }

function lockeado() {
  if (!existsSync(LOCK)) return false
  try { if (Date.now() - statSync(LOCK).mtimeMs > LOCK_TTL_MS) return false } catch {}
  return true
}
const lock = () => { try { writeFileSync(LOCK, String(process.pid)) } catch {} }
const unlock = () => { try { existsSync(LOCK) && unlinkSync(LOCK) } catch {} }

// corre un script hijo y devuelve el JSON de su línea "RESULTADO: {...}"
function correr(script, env = {}, timeoutMs = 200_000) {
  return new Promise((resolve) => {
    const h = spawn(NODE, [join(DIR, script)], { cwd: DIR, env: { ...process.env, ...env } })
    let out = ''
    const kill = setTimeout(() => { try { h.kill('SIGKILL') } catch {} }, timeoutMs)
    h.stdout.on('data', (d) => { out += d })
    h.stderr.on('data', (d) => { out += d })
    h.on('exit', () => {
      clearTimeout(kill)
      const m = out.match(/RESULTADO:\s*(\{.*\})\s*$/m)
      let r = {}; try { r = m ? JSON.parse(m[1]) : {} } catch {}
      resolve(r)
    })
  })
}

async function main() {
  const forzar = process.env.TEK_FORZAR === '1'   // saltar cooldown (uso manual)
  if (lockeado()) { console.log('RESULTADO:', JSON.stringify({ estado: 'ya_en_curso' })); return }

  // cooldown: si hace poco pidió Superclave y nadie la puso, no re-intentamos solos.
  const est = leerEstado()
  if (!forzar && est.estado === 'necesita_superclave' && est.intento && (Date.now() - Date.parse(est.intento) < COOLDOWN_MS)) {
    console.log('RESULTADO:', JSON.stringify({ estado: 'necesita_superclave', enfriando: true, desde: est.intento }))
    return
  }

  lock(); escribirEstado({ estado: 'corriendo', arranque: new Date().toISOString() })
  try {
    // Login + captura en UNA sola sesión headful (reabrir el navegador se bloquea).
    // login-humano.mjs con TEK_CAPTURAR=1 entra y saca saldos+movimientos en vivo.
    log('login + captura (una sola sesión)…')
    const lg = await correr('login-humano.mjs', { TEK_CAPTURAR: '1' }, 320_000)
    if (lg.estado === 'logueado') {
      // capturarData ya escribió estado.json = ok con conteos
      log('OK:', JSON.stringify(lg.cap || {}))
      // Volcar la cartola fresca al SEGUNDO CEREBRO (idempotente, se sobreescribe).
      try { await correr('cerebro-cartolas.mjs', {}, 30_000); log('cerebro cartolas actualizado') }
      catch (e) { log('cerebro export falló:', e.message) }
      console.log('RESULTADO:', JSON.stringify({ estado: 'ok', ...(lg.cap || {}) }))
      return
    }
    // no entró: clasificar el motivo para /health
    if (/mfa/i.test(lg.estado || '')) {
      escribirEstado({ estado: 'necesita_superclave', intento: new Date().toISOString(), detalle: lg.estado })
      console.log('RESULTADO:', JSON.stringify({ estado: 'necesita_superclave', nota: 'abrir VNC y poner Superclave' }))
    } else if (/device_trust|bloqueado/i.test(lg.estado || '')) {
      escribirEstado({ estado: 'bloqueado', intento: new Date().toISOString(), detalle: lg.estado })
      console.log('RESULTADO:', JSON.stringify({ estado: 'bloqueado', nota: 'Incapsula flageó; reintentar más tarde' }))
    } else if (/credencial/i.test(lg.estado || '')) {
      escribirEstado({ estado: 'error_credenciales', intento: new Date().toISOString(), detalle: lg.estado })
      console.log('RESULTADO:', JSON.stringify({ estado: 'error_credenciales', nota: 'revisar RUT/clave en .creds.json' }))
    } else {
      escribirEstado({ estado: 'error', intento: new Date().toISOString(), detalle: lg.estado || 'sin_resultado' })
      console.log('RESULTADO:', JSON.stringify({ estado: 'error', login: lg.estado || null }))
    }
  } finally { unlock() }
}
main().catch((e) => { unlock(); console.log('ERROR:', e.message); process.exit(1) })

// reintentar-login.mjs — REINTENTA EL LOGIN DEL BANCO DESPUÉS DE UN REBOTE.
//
// El hallazgo (19-08-2026, capturas en shots/): el login humanizado FUNCIONA — teclea el RUT
// y la clave y aprieta Aceptar (h03-lleno.png). Lo que pasa es que Santander a veces contesta
// el primer intento con el muro genérico del antifraude ("la señal que estás usando no te
// permitirá ingresar… reinicia tu wifi"). NO es bloqueo de cuenta ni credenciales malas.
//
// Y así entraba antes: el 17-08 rebotó a las 17:27 (fin-error_seguridad.png) y a las 18:01
// ENTRÓ (fin-logueado.png) — con un segundo intento pasado el enfriamiento. El 18-08 y el
// 19-08 hubo UN solo intento cada día, nadie reintentó, y la sesión quedó muerta desde
// entonces. Por eso "el banco no funciona": no falta acceso, falta el reintento.
//
// Esto reintenta SOLO cuando hace falta de verdad (hay un pago esperando o alguien pidió
// datos del banco hace poco), respetando los enfriamientos y con tope diario.
//
// ⚠️ APAGADO por defecto. Se enciende con TEK_REINTENTO_LOGIN=1 (decisión de Ramón).
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
try { process.loadEnvFile(join(DIR, '..', '.env')) } catch { /* opcional */ }

const ENCENDIDO = process.env.TEK_REINTENTO_LOGIN === '1'
const DRY = process.argv.includes('--dry')
const USER = process.env.TEK_REINTENTO_USER || 'ramon'
const EMPRESA = process.env.TEK_REINTENTO_EMPRESA || 'ANA CLARA SPA'
const MAX_DIA = Number(process.env.TEK_REINTENTO_MAX_DIA || 3)      // tope de reintentos por día
const COOLDOWN_MS = Number(process.env.TEK_LOGIN_DT_COOLDOWN_MS || 25 * 60_000)
const GAP_MS = Number(process.env.TEK_LOGIN_MIN_GAP_MS || 8 * 60_000)
const NECESIDAD_MS = Number(process.env.TEK_REINTENTO_NECESIDAD_MIN || 240) * 60_000

const leerJson = (f, def) => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return def } }
const log = (m) => console.log(`${new Date().toISOString()} ${m}`)
const hoyCL = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

if (!ENCENDIDO && !DRY) { log('reintento APAGADO (TEK_REINTENTO_LOGIN≠1)'); process.exit(0) }

// ── ¿Hace falta entrar al banco? ────────────────────────────────────────────
// Sí, si hay un pago esperando o si alguien pidió datos del banco hace poco. Si nadie
// necesita nada, NO se toca el banco: los logins se gastan solo cuando sirven.
const pendientes = (leerJson(join(DATA, 'lotes-pendientes.json'), { pendientes: [] }).pendientes || [])
  .filter((p) => p.estado === 'pendiente')
// OJO: la señal NO es "alguien preguntó", es "alguien preguntó y NO se le pudo dar el dato
// fresco". banco.mjs deja esta marca solo cuando el refresco no entró, y la borra cuando sí.
// Si no, cada consulta servida bien igual haría reintentar el login y gastaría los cupos.
const selloMovs = (() => { try { return Number(readFileSync(join(DATA, '.movs-pendiente-refresco'), 'utf8').trim()) || 0 } catch { return 0 } })()
const pidieronDatos = selloMovs && (Date.now() - selloMovs) < NECESIDAD_MS
if (!pendientes.length && !pidieronDatos) { log('nadie necesita el banco ahora — no reintento'); process.exit(0) }

// ── ¿La sesión ya está arriba? ──────────────────────────────────────────────
const ses = leerJson(join(DATA, 'sesiones.json'), { sesiones: {} }).sesiones || {}
if (ses[USER] && ses[USER].viva === true) { log(`sesión de ${USER} ya viva — nada que hacer`); process.exit(0) }

// ── Enfriamientos del banco (los mismos que respeta el login) ───────────────
const hist = leerJson(join(DATA, `login-hist-${USER}.json`), { logins: [], device_trust: [] })
const ahora = Date.now()
const dt = (hist.device_trust || []).filter((t) => ahora - t < COOLDOWN_MS)
if (dt.length) { log(`enfriando tras validación de dispositivo (faltan ${Math.ceil((COOLDOWN_MS - (ahora - Math.max(...dt))) / 60000)} min)`); process.exit(0) }
const ultimo = (hist.logins || []).map((x) => (typeof x === 'number' ? x : Number(x?.t) || 0)).reduce((a, b) => Math.max(a, b), 0)
if (ultimo && ahora - ultimo < GAP_MS) { log(`muy pegado al último intento (faltan ${Math.ceil((GAP_MS - (ahora - ultimo)) / 60000)} min)`); process.exit(0) }

// ── Tope propio: no más de MAX_DIA reintentos al día ────────────────────────
const RUTA_CUENTA = join(DATA, '.reintentos-login.json')
const cuenta = leerJson(RUTA_CUENTA, {})
const hechos = cuenta[hoyCL()] || 0
if (hechos >= MAX_DIA) { log(`ya van ${hechos} reintentos hoy (tope ${MAX_DIA}) — no insisto más`); process.exit(0) }

const porQue = pendientes.length ? `${pendientes.length} pago(s) esperando` : 'pidieron datos del banco hace poco'
log(`reintentando login de ${USER} (${porQue}) — intento ${hechos + 1}/${MAX_DIA}`)
if (DRY) { log('[DRY] hasta acá llegaría: no se abre el banco'); process.exit(0) }

cuenta[hoyCL()] = hechos + 1
try { writeFileSync(RUTA_CUENTA, JSON.stringify(cuenta)) } catch { /* */ }

// El lector normal: si la sesión está muerta hace el login (teclado y mouse humanizados).
const h = spawn(process.execPath, [join(DIR, 'leer-saldos.mjs'), '--user', USER, '--empresas', EMPRESA], { cwd: DIR })
let out = ''
h.stdout.on('data', (d) => { out += d })
const kill = setTimeout(() => { try { h.kill('SIGKILL') } catch { /* */ } }, 180_000)
h.on('exit', async () => {
  clearTimeout(kill)
  let j = null; try { j = JSON.parse(out) } catch { /* */ }
  const ok = Boolean(j && j.ok)
  log(ok ? '✅ el banco quedó ARRIBA' : `no entró todavía (${(j && j.estado_login) || 'sin detalle'}) — se reintenta en la próxima pasada`)
  // Si entró y había pagos esperando, avisar a quien corresponda: ya se pueden subir.
  if (ok && pendientes.length) {
    try {
      const kapso = await import('../hub/kapso.mjs')
      const NUM = { ramon: '+56932945240', nico: '+56975481858', joaquin: '+56958589915' }
      const avisados = new Set()
      for (const p of pendientes) {
        for (const num of [p.de, NUM[p.dueño_sesion]]) {
          if (!num || avisados.has(num)) continue
          avisados.add(num)
          try { await kapso.enviarKapso(num, `🏦 El banco quedó arriba. El pago de $${Number(p.total || 0).toLocaleString('es-CL')} (${p.empresa}) que había quedado esperando ya se puede subir — dime "súbelo" y lo hago.`) } catch { /* */ }
        }
      }
    } catch { /* */ }
  }
})

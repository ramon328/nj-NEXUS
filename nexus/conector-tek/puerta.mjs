// puerta.mjs — LA PUERTA ÚNICA DEL BANCO (tek).
//
// Todo lo que toque Santander (transferir, masiva, pendientes, comprobantes, saldos)
// pasa por acá para responder tres preguntas, SIEMPRE de la misma forma:
//
//   1. ¿CON QUÉ SESIÓN opero?   → elegirSesion(): cada persona con SU login.
//   2. ¿ESTÁ VIVA esa sesión?   → estadoSesion(): sin abrir el navegador.
//   3. Si no está viva, ¿cómo entro? → abrirAsistido(): PIN nuevo + URL /vnc, y la
//      OPERACIÓN QUE SE PIDIÓ VIAJA CON EL LOGIN (mismo proceso login-humano), así
//      que cuando el humano termina de entrar, lo que pidió se ejecuta SOLO.
//
// Por qué existe (03-ago-2026): Joaquín quiso transferir y no pasó nada — el sistema
// forzaba la sesión de ramon para ANA CLARA (regla vieja [[tek-anaclara-siempre-ramon]]),
// esa sesión estaba dormida, y el link /vnc + PIN nunca le llegó porque dependía de que
// el modelo se acordara de llamar reconectar_banco. Ahora: sesión POR PERSONA y el
// link+PIN sale del propio flujo, no del criterio del modelo.
//
// Ver [[tek-login-asistido-ondemand]], [[tek-endpoints-anaclara-mapeados]].
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, statSync, existsSync, chmodSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import * as credenciales from './credenciales.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
try { mkdirSync(DATA, { recursive: true }) } catch { /* */ }

export const URL_VNC = process.env.TEK_VNC_URL || 'https://mac-mini-de-nicolas.tailee0068.ts.net/vnc'
const OTP_FILE = process.env.NOVNC_OTP_FILE || '/Users/AIagenteia/nexus/novnc-web/.novnc-otp'
const ESTADO_NOVNC = OTP_FILE.replace(/[^/]*$/, '.novnc-estado')
const ASISTIDO_FILE = join(DATA, '.login-asistido.json')

// El banco corta la sesión por inactividad ~10-15 min. Un session-<user>.json tocado hace
// menos que esto = sesión probablemente reusable (login-humano igual la re-verifica al entrar).
const FRESCA_MIN = Number(process.env.TEK_SESION_FRESCA_MIN || 12)
// Un login asistido en vuelo dura como mucho esto (5 min de espera humana + la operación).
const ASISTIDO_VENTANA_MS = Number(process.env.TEK_ASISTIDO_VENTANA_MS || 10 * 60_000)
// Vuelta atrás de emergencia: si esto es 1, ANA CLARA vuelve a operarse SIEMPRE con ramon.
const SOLO_RAMON = process.env.TEK_ANACLARA_SOLO_RAMON === '1'

export const slugUsuario = (u) => String(u || 'ramon').toLowerCase().replace(/[^a-z0-9]/g, '') || 'ramon'
const pidVivo = (pid) => { if (!pid) return false; try { process.kill(pid, 0); return true } catch { return false } }

/** ¿El navegador del banco de esta persona está tomado por otro proceso? (candado.mjs) */
function candadoTomado(slug) {
  const lock = join(DIR, slug === 'ramon' ? 'session.lock' : `session-${slug}.lock`)
  try {
    const j = JSON.parse(readFileSync(lock, 'utf8'))
    if (!pidVivo(j.pid)) return false                       // dueño muerto → candado huérfano
    return Date.now() - (j.ts || 0) <= 12 * 60_000          // más viejo que eso = basura
  } catch { return false }
}

// ── 1. ¿Con qué sesión opero? ────────────────────────────────────────────────
/**
 * Resuelve QUIÉN entra al banco y a QUÉ empresa, para cualquier operación.
 *
 * Regla (03-ago-2026, pedido de Ramón): **cada persona opera con SU propia sesión**,
 * también en ANA CLARA. Joaquín entra con el banco de Joaquín, Nico con el de Nico.
 * Solo si quien pide NO tiene esa empresa conectada se cae al dueño canónico del vault.
 *
 * @param {object} o
 * @param {string} o.usuario  usuario de Nexus que pide (ramon | nico | joaquin…)
 * @param {string} [o.empresa] empresa pedida (texto libre; se resuelve al nombre real)
 * @param {boolean} [o.admin] si es fundador (puede elegir cualquiera de SUS empresas)
 * @returns {{userId, empresa, propia, nota}}
 */
export function elegirSesion({ usuario, empresa, admin = false } = {}) {
  const quien = slugUsuario(usuario)
  let emp = String(empresa || '').trim()

  // Un usuario acotado (no fundador) opera SOLO su empresa principal (hoy ANA CLARA SPA).
  if (!admin) {
    const suyas = (credenciales.listar(quien) || []).map((c) => c.empresa).filter(Boolean)
    emp = suyas[0] || 'ANA CLARA SPA'
  } else if (emp) {
    // Fundador: "Ltda" vs "LIMITADA", "ana clara" vs "ANA CLARA SPA" → nombre canónico suyo.
    const canon = credenciales.resolverEmpresa(quien, emp)
    if (canon) emp = canon
  }
  if (!emp) emp = (credenciales.listar(quien) || [])[0]?.empresa || 'ANA CLARA SPA'

  // ¿Quién tiene ESA empresa conectada? Primero el que pide (su sesión), si no el dueño.
  let userId = quien
  let propia = true
  let nota = `sesión propia de ${quien}`
  if (!credenciales.tieneConexion(quien, emp)) {
    const dueño = credenciales.dueñoDeEmpresa(emp)
    userId = dueño || 'ramon'
    propia = false
    nota = `${quien} no tiene "${emp}" conectada → se opera con la sesión de ${userId}`
  }
  // Kill-switch de emergencia (volver a la regla vieja sin tocar código).
  if (SOLO_RAMON && /ana\s*clara|mallorca/i.test(emp)) {
    userId = 'ramon'; propia = quien === 'ramon'
    nota = 'TEK_ANACLARA_SOLO_RAMON=1 → ANA CLARA se opera con la sesión de ramon'
  }
  return { userId, empresa: emp, propia, nota }
}

// ── 2. ¿Está viva la sesión? (sin abrir el navegador) ────────────────────────
/**
 * Estado de la sesión de un usuario, leyendo disco (instantáneo, no toca el banco).
 * Dos fuentes: el "corazón" (data/sesiones.json, si está latiendo) y la FRESCURA del
 * storageState (session-<user>.json se reescribe en cada operación/login exitoso).
 * @returns {{viva, seguro, edad_min, latido_min, restante_min, fuente}}
 */
export function estadoSesion(userId = 'ramon') {
  const slug = slugUsuario(userId)
  const sesionFile = join(DIR, slug === 'ramon' ? 'session.json' : `session-${slug}.json`)
  let edadMin = null
  try { edadMin = (Date.now() - statSync(sesionFile).mtimeMs) / 60_000 } catch { /* nunca entró */ }

  let corazon = null, latidoMin = null
  try {
    const s = JSON.parse(readFileSync(join(DATA, 'sesiones.json'), 'utf8'))
    corazon = s?.sesiones?.[slug] || null
    if (corazon?.ultimo_latido) latidoMin = (Date.now() - Date.parse(corazon.ultimo_latido)) / 60_000
  } catch { /* el corazón puede estar pausado */ }

  // El corazón manda solo si está latiendo de verdad (< 6 min). Si está pausado (hoy lo
  // está, ver PAUSADO-descanso-ip.txt), su "muerta" es información vieja: vale la frescura.
  const corazonFresco = latidoMin != null && latidoMin < 6
  const viva = corazonFresco ? !!corazon.viva : (edadMin != null && edadMin < FRESCA_MIN)
  return {
    viva,
    seguro: corazonFresco,                                   // ¿lo sabemos o lo estimamos?
    edad_min: edadMin == null ? null : Math.round(edadMin),
    latido_min: latidoMin == null ? null : Math.round(latidoMin),
    restante_min: corazonFresco ? (corazon.restante_min ?? null) : (edadMin == null ? null : Math.max(0, Math.round(FRESCA_MIN - edadMin))),
    fuente: corazonFresco ? 'corazon' : (edadMin == null ? 'sin_sesion' : 'frescura'),
  }
}

// ── 3. ¿Este resultado es un problema de SESIÓN (se arregla entrando)? ────────
const ESTADOS_SESION = /sesion_caida|sesion_muerta|error_segurid|device_trust|login_throttle|timeout_asistido|sin_form|sin_boton_aceptar|error_credenciales|pide_mfa|mfa_sin_codigo|keepalive_omitido|no_logueado|sin_sesion|no tiene banco conectado/i
/**
 * ¿El resultado de una operación falló por FALTA DE SESIÓN (y se arregla con un login
 * asistido)? Ojo: "ocupado" NO entra — ahí hay que esperar, no abrir otro login.
 */
export function esFalloSesion(res) {
  if (!res || res.ok) return false
  if (res.ocupado || res.ya_intentada || res.ya_pendiente || res.pendiente) return false
  const s = String(res.estado || res.error || '')
  return ESTADOS_SESION.test(s)
}

// ── 4. Login asistido on-demand (+ la operación viaja con él) ────────────────
/** Info del login asistido en vuelo (si lo hay): mismo PIN, no se pisa. */
export function asistidoEnVuelo() {
  try {
    const j = JSON.parse(readFileSync(ASISTIDO_FILE, 'utf8'))
    if (!j?.ts || Date.now() - j.ts > ASISTIDO_VENTANA_MS) return null
    if (!pidVivo(j.pid)) return null
    // El PIN sigue siendo el bueno solo si el archivo OTP no se vació (login-humano lo
    // borra al salir) y no lo pisó otro flujo.
    let otp = ''
    try { otp = readFileSync(OTP_FILE, 'utf8').trim() } catch { /* */ }
    if (!otp || otp !== j.pin) return null
    return j
  } catch { return null }
}

/**
 * Abre el login REAL del banco en el mini para que lo maneje un humano por /vnc, y le
 * ENGANCHA la operación pedida: login-humano corre las acciones (TEK_CREAR, TEK_MASIVA,
 * TEK_VER_PENDIENTES…) apenas el humano aterriza en el portal → "entrá y sigue solo".
 *
 * @param {object} o
 * @param {string} o.userId  sesión con la que se entra (ramon | nico | joaquin)
 * @param {string} o.empresa empresa del banco
 * @param {string} [o.motivo] para qué es (aviso al usuario)
 * @param {object} [o.env]   variables TEK_* de la operación que debe seguir sola
 * @param {boolean} [o.manual] true = form vacío, el humano teclea RUT+clave
 * @param {string} [o.etiqueta] nombre corto de la operación (para el log/estado)
 * @returns {{ok, url, pin, empresa, userId, pid, en_vuelo, ocupado}}
 */
export function abrirAsistido({ userId = 'ramon', empresa = 'ANA CLARA SPA', motivo = '', env = {}, manual, etiqueta = '' } = {}) {
  const slug = slugUsuario(userId)

  // Una sola pantalla, un solo login asistido a la vez.
  // OJO: la operación viaja DENTRO del proceso de login. Si ya hay uno corriendo NO se le
  // puede enganchar otra cosa — devolver el mismo PIN prometiendo una operación que nadie
  // va a hacer sería mentirle al usuario. Solo es "el mismo" si es LA MISMA operación.
  const enVuelo = asistidoEnVuelo()
  if (enVuelo) {
    const misma = (enVuelo.etiqueta || '') === etiqueta && slug === slugUsuario(enVuelo.userId)
    if (misma) {
      return {
        ok: true, en_vuelo: true, ocupado: false, url: URL_VNC, pin: enVuelo.pin,
        userId: enVuelo.userId, empresa: enVuelo.empresa, etiqueta: enVuelo.etiqueta || '',
        nota: 'Ya había un login abierto para ESTA misma operación: es el MISMO link y el MISMO PIN.',
      }
    }
    return {
      ok: false, en_vuelo: true, ocupado: true, url: URL_VNC, pin: null,
      userId: enVuelo.userId, empresa: enVuelo.empresa, etiqueta: enVuelo.etiqueta || '',
      nota: `La pantalla del banco está ocupada con el login de ${enVuelo.userId} (${enVuelo.empresa}${enVuelo.motivo ? ' · ' + enVuelo.motivo : ''}). Hay que esperar a que termine o se venza.`,
    }
  }

  // ¿El navegador de ESTA persona ya lo tiene otro proceso (una operación en curso, el
  // corazón, una captura)? Entonces NO spawneamos: login-humano se quedaría minutos esperando
  // el candado con un PIN vivo y el usuario mirando una pantalla que no abre nada.
  const ocupadoPorOtro = candadoTomado(slug)
  if (ocupadoPorOtro) {
    return {
      ok: false, en_vuelo: false, ocupado: true, url: URL_VNC, pin: null, userId: slug, empresa,
      nota: `El navegador del banco de ${slug} está ocupado con otra operación. Hay que esperar a que termine (un par de minutos).`,
    }
  }

  // PIN NUEVO de un solo uso para /vnc. Sin PIN vigente la URL no muestra nada.
  const pin = String(crypto.randomInt(10_000_000, 100_000_000))
  writeFileSync(OTP_FILE, pin, { mode: 0o600 })
  try { chmodSync(OTP_FILE, 0o600) } catch { /* */ }
  try { writeFileSync(ESTADO_NOVNC, JSON.stringify({ ok: false, estado: 'esperando', ts: Date.now() })) } catch { /* */ }

  const esManual = manual ?? (process.env.TEK_ASSIST_MANUAL === '1')
  const hijo = spawn(process.execPath, [join(DIR, 'login-humano.mjs')], {
    cwd: DIR,
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      ...env,                              // ← la operación que debe seguir sola
      TEK_ASSIST: '1',
      ...(esManual ? { TEK_ASSIST_MANUAL: '1' } : {}),
      TEK_USER: slug,
      TEK_EMPRESA: empresa,
      ...(motivo ? { TEK_MOTIVO: env.TEK_MOTIVO || motivo } : {}),
      TEK_OTP_FILE: OTP_FILE,
      // El asistido lo maneja una persona de verdad: el candado anti-quemado (pensado para
      // los logins AUTOMÁTICOS) no aplica — si no, el link llegaría y el banco no abriría.
      TEK_IGNORAR_THROTTLE: '1',
    },
  })
  hijo.unref()

  try {
    writeFileSync(ASISTIDO_FILE, JSON.stringify({
      pin, pid: hijo.pid, userId: slug, empresa, motivo, etiqueta, ts: Date.now(),
    }, null, 2), { mode: 0o600 })
  } catch { /* */ }

  return { ok: true, en_vuelo: false, url: URL_VNC, pin, userId: slug, empresa, pid: hijo.pid, etiqueta }
}

/**
 * Texto listo para mandarle al usuario por WhatsApp cuando hay que entrar al banco.
 * Se arma acá (no en el prompt) para que SIEMPRE salga con la URL y el PIN de verdad.
 */
export function textoLoginAsistido({ url, pin, empresa, motivo, sigueSola = true, ocupado = false, nota = '' }) {
  if (ocupado) return `⏳ La pantalla del banco está ocupada con otro login en curso. ${nota} Esperá un par de minutos y pedímelo de nuevo.`
  return [
    `🏦 Para ${motivo || 'esta operación'} en *${empresa}* hay que entrar al banco (el login lo tenés que hacer vos: así pasa la seguridad).`,
    ``,
    `👉 ${url}`,
    `🔑 PIN (un solo uso): *${pin}*`,
    ``,
    `Abrí el link, poné el PIN y logueate normal (clave + Superclave).`,
    sigueSola ? `Cuando entres, *sigo yo solo* y te aviso cómo quedó. ✅` : `Cuando entres, avisame y sigo.`,
  ].join('\n')
}

export default { elegirSesion, estadoSesion, esFalloSesion, abrirAsistido, asistidoEnVuelo, textoLoginAsistido, URL_VNC, slugUsuario }

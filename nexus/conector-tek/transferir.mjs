// transferir.mjs — Capa de lógica de tek para transferencias PERSONA-A-PERSONA
// ("envíale $X a <nombre>"). Resuelve el nombre contra la libreta local, arma un
// BORRADOR validado, y —solo si se pide explícito— lanza login-humano.mjs para
// CREAR la transferencia en Santander Empresa.
//
// ⚠️ IMPORTANTE (blindaje): esto SOLO crea la transferencia PENDIENTE (aprieta "Crear").
// La plata NO se mueve hasta la "Liberación", que este módulo JAMÁS toca. Nunca se
// loguea la clave del banco (login-humano.mjs la saca de la bóveda cifrada solo).
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs'
import * as beneficiarios from './beneficiarios.mjs'
import * as credenciales from './credenciales.mjs'
import * as puerta from './puerta.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
mkdirSync(DATA, { recursive: true })

const soloDigitos = (s) => String(s || '').replace(/\D/g, '')

// ── Anti-bucle de envíos ──────────────────────────────────────────────────────
// El asistente del hub a veces llama tek_transferir accion:'enviar' varias veces
// en el mismo turno (reintenta solo). Sin freno eso abre N procesos, re-loguea y
// puede crear la misma transferencia varias veces. Acá: 1 en vuelo, y la misma
// (empresa+rut+cuenta+monto) no se vuelve a mandar si ya corrió hace poco.
const ENVIO_LOCK = join(DATA, '.transfer-envio.lock')
const ENVIO_RECIENTES = join(DATA, '.transfer-recientes.json')
const COOLDOWN_OK_MS = 60 * 60_000      // ya creada / ya pendiente → 1 h sin repetir
const COOLDOWN_FAIL_MS = 60 * 60_000    // cualquier intento terminado → 1 h (antes 10 min: reintentos duplicaban $1)
const LOCK_COLGADO_MS = 12 * 60_000
const ULTIMA_FILE = join(DATA, '.ultima-transferencia.json')

function guardarUltima(info) {
  try { writeFileSync(ULTIMA_FILE, JSON.stringify({ ...info, ts: Date.now() }, null, 2), { mode: 0o600 }) } catch {}
}
export function leerUltimaTransferencia() {
  try { return JSON.parse(readFileSync(ULTIMA_FILE, 'utf8')) } catch { return null }
}

function huellaEnvio(borrador, empresa) {
  const b = borrador.beneficiario || {}
  // Cuenta sin ceros a la izquierda: "007031422978" y "7031422978" son la misma.
  const cta = soloDigitos(b.cuenta).replace(/^0+/, '') || '0'
  return [
    String(empresa || '').toUpperCase().replace(/\s+/g, ' ').trim(),
    soloDigitos(b.rut).toUpperCase(),
    cta,
    String(borrador.monto || 0),
  ].join('|')
}

function leerRecientes() {
  try { return JSON.parse(readFileSync(ENVIO_RECIENTES, 'utf8')) } catch { return {} }
}
function guardarRecientes(map) {
  try { writeFileSync(ENVIO_RECIENTES, JSON.stringify(map, null, 2), { mode: 0o600 }) } catch {}
}
function registrarReciente(huella, estado) {
  const map = leerRecientes()
  map[huella] = { estado, ts: Date.now() }
  // limpia entradas viejas (> 2 h)
  for (const [k, v] of Object.entries(map)) {
    if (!v?.ts || Date.now() - v.ts > 2 * 3600_000) delete map[k]
  }
  guardarRecientes(map)
}
function recienteBloquea(huella) {
  const v = leerRecientes()[huella]
  if (!v?.ts) return null
  const edad = Date.now() - v.ts
  // En curso: bloquear mientras el lock viva, o hasta 12 min si el lock se perdió.
  if (v.estado === 'en_curso' && edad < LOCK_COLGADO_MS) {
    return {
      ok: false, estado: 'ocupado', pendiente: false, ocupado: true, ya_intentada: true,
      error: 'Ya hay una transferencia en curso con los mismos datos. NO se lanza otra (anti-bucle). Esperá a que termine.',
    }
  }
  const ok = v.estado === 'creada' || v.estado === 'ya_pendiente' || v.estado === 'posible_creada'
  if (ok && edad < COOLDOWN_OK_MS) {
    return {
      ok: true, estado: v.estado === 'posible_creada' ? 'creada' : v.estado, pendiente: true,
      ya_pendiente: v.estado === 'ya_pendiente',
      ya_intentada: true,
      nota: v.estado === 'posible_creada'
        ? `Esta misma transferencia probablemente YA se creó hace ${Math.round(edad / 60000)} min (el banco a veces confirma y la verificación falla). NO se vuelve a enviar — revisá Por Autorizar.`
        : `Ya se ${v.estado === 'creada' ? 'creó' : 'detectó pendiente'} esta misma transferencia hace ${Math.round(edad / 60000)} min. NO se vuelve a enviar (anti-duplicado).`,
    }
  }
  // Estados PRE-CREACIÓN: la sesión se cayó, faltó un dato, o no apareció el botón ANTES de
  // confirmar → el banco NO creó nada → se puede reintentar de inmediato (no bloquear).
  const RETRYABLE = new Set(['sesion_caida', 'falta_rut', 'sin_form', 'sin_boton_crear', 'tefun_lleno_sin_crear'])
  if (RETRYABLE.has(v.estado)) return null
  // CUALQUIER otro resultado reciente AMBIGUO (tefun_no_confirmada, modal_sin_aceptar, sin_resultado…)
  // sí bloquea 1 h: reintentar a ciegas es lo que duplicó los $1 a Joaquín.
  if (!ok && v.estado !== 'en_curso' && edad < COOLDOWN_FAIL_MS) {
    return {
      ok: false, estado: 'ya_intentada', pendiente: false, ya_intentada: true,
      error: `Esta misma transferencia ya se intentó hace ${Math.round(edad / 60000)} min (resultado: ${v.estado}). NO se reintenta sola — pedí confirmación EXPLÍCITA al usuario solo si quiere otro intento a sabiendas de posible duplicado.`,
    }
  }
  return null
}

function pidVivo(pid) {
  if (!pid) return false
  try { process.kill(pid, 0); return true } catch { return false }
}
function envioEnCurso() {
  if (!existsSync(ENVIO_LOCK)) return false
  try {
    const j = JSON.parse(readFileSync(ENVIO_LOCK, 'utf8'))
    // Preferimos el PID del hijo (login-humano): sobrevive si el hub recarga módulos
    // o el padre async se pierde. Si aún no spawneó, vale el pid del padre.
    const vivo = pidVivo(j.childPid) || pidVivo(j.pid)
    if (!vivo) return false
    if (Date.now() - (j.ts || 0) > LOCK_COLGADO_MS) return false
    return j
  } catch { return false }
}
function tomarEnvioLock(huella) {
  try {
    writeFileSync(ENVIO_LOCK, JSON.stringify({ pid: process.pid, ts: Date.now(), huella }), { flag: 'wx', mode: 0o600 })
    return true
  } catch (e) {
    if (e?.code !== 'EEXIST') return true
    if (!envioEnCurso()) { try { unlinkSync(ENVIO_LOCK) } catch {} ; return tomarEnvioLock(huella) }
    return false
  }
}
function actualizarEnvioLock(patch) {
  try {
    const j = JSON.parse(readFileSync(ENVIO_LOCK, 'utf8'))
    if (j.pid !== process.pid) return
    writeFileSync(ENVIO_LOCK, JSON.stringify({ ...j, ...patch, ts: Date.now() }), { mode: 0o600 })
  } catch {}
}
function soltarEnvioLock() {
  try {
    const j = JSON.parse(readFileSync(ENVIO_LOCK, 'utf8'))
    if (j.pid === process.pid) unlinkSync(ENVIO_LOCK)
  } catch {}
}

// Tope de seguridad por transferencia (CLP). Sobre esto marcamos supera_tope para que
// Nexus confirme con más cuidado (no bloquea, solo avisa). Igual estilo que TOPE_PAGO_CLP.
export const TOPE_TRANSFER_CLP = Number(process.env.TEK_TOPE_TRANSFER || 1_000_000)

// Sobre este monto conviene SUGERIR transferencia masiva (parte el monto en líneas y esquiva topes
// diarios por transferencia). Nexus lo propone al usuario; no obliga.
export const UMBRAL_SUGERIR_MASIVA_CLP = Number(process.env.TEK_UMBRAL_MASIVA || 3_000_000)

const clp = (n) => '$' + Number(n || 0).toLocaleString('es-CL')
// Normaliza un RUT a "12345678-9" (sin puntos, guion antes del DV). El form del banco
// pide el RUT en ese formato.
function normRutFmt(rut) {
  const s = String(rut || '').replace(/[.\s]/g, '').replace(/-/g, '').toUpperCase()
  if (s.length < 2) return String(rut || '').trim()
  return s.slice(0, -1) + '-' + s.slice(-1)
}

/** Wrapper de la libreta: resuelve una persona por nombre/alias (con desambiguación). */
export function resolver(nombre) {
  return beneficiarios.buscar(nombre)
}

/** Da de alta / actualiza un beneficiario en la libreta local (para recordarlo la próxima). */
export function guardarBeneficiario(b) {
  try { return beneficiarios.guardar(b) } catch (e) { return { ok: false, error: e.message } }
}

/**
 * Arma el BORRADOR de una transferencia persona-a-persona. NO ejecuta nada.
 * Devuelve:
 *  - { ok:false, ambiguo:true, candidatos, error }  si hay varios contactos que calzan
 *  - { ok:false, error }                             si no resuelve o el monto es inválido
 *  - { ok:true, borrador:{ beneficiario, monto, motivo, origen, supera_tope, tope } }
 */
export function armarBorrador({ userId, nombre, monto, motivo, rut, banco, cuenta, tipo_cuenta, email } = {}) {
  let b, nuevo = false
  const rutFmt = normRutFmt(rut)
  const cuentaDig = soloDigitos(cuenta)

  // Beneficiario NUEVO por datos completos: si viene RUT + número de cuenta, se transfiere
  // DIRECTO a esa cuenta sin exigir que esté en la libreta ni pre-inscrito en el banco (el
  // form "A Tercero" del banco toma los datos inline). Así Nexus no obliga a "cargarlo primero".
  if (rutFmt && cuentaDig) {
    b = {
      id: null,
      nombre: String(nombre || '').trim() || 'Beneficiario',
      rut: rutFmt,
      banco: String(banco || '').trim() || 'Santander',
      tipo_cuenta: String(tipo_cuenta || '').trim() || 'Cuenta Corriente',
      cuenta: String(cuenta || '').trim(),
      email: email || null,
    }
    nuevo = true
  } else {
    const r = resolver(nombre)
    if (!r.ok) {
      // Propagamos la ambigüedad tal cual (con candidatos) para que Nexus pregunte cuál.
      if (r.ambiguo) return { ok: false, ambiguo: true, candidatos: r.candidatos, error: r.error }
      return { ok: false, error: r.error, falta_datos: true }
    }
    b = r.beneficiario
  }

  const m = Math.trunc(Number(monto))
  if (!Number.isFinite(m) || m <= 0) {
    return { ok: false, error: 'Monto inválido (debe ser un entero en CLP > 0).' }
  }

  const borrador = {
    tipo: 'transferencia_persona',
    beneficiario: {
      id: b.id,
      nombre: b.nombre,
      rut: b.rut,
      banco: b.banco,
      tipo_cuenta: b.tipo_cuenta,
      cuenta: b.cuenta,
      email: b.email || null,
    },
    monto: m,
    moneda: 'CLP',
    motivo: (motivo && String(motivo).trim()) || 'Transferencia',
    origen: userId,
    nuevo,                       // true = beneficiario no guardado (datos dados a mano)
    supera_tope: m > TOPE_TRANSFER_CLP,
    tope: TOPE_TRANSFER_CLP,
    sugerir_masiva: m > UMBRAL_SUGERIR_MASIVA_CLP,   // monto grande → mejor por masiva
    umbral_masiva: UMBRAL_SUGERIR_MASIVA_CLP,
  }
  return { ok: true, borrador }
}

/** Texto lindo del borrador para confirmar por WhatsApp (o web). NO ejecuta nada. */
export function textoBorrador(borrador) {
  const b = borrador.beneficiario
  const cuentaLinda = [b.banco, b.tipo_cuenta, b.cuenta].filter(Boolean).join(' · ')
  return [
    `💸 Voy a CREAR transferencia de *${clp(borrador.monto)}* a *${b.nombre}* (${cuentaLinda}).`,
    `Queda *pendiente por liberar* (no se mueve la plata hasta la Liberación).`,
    borrador.motivo ? `Motivo: ${borrador.motivo}` : '',
    borrador.supera_tope ? `⚠️ Supera el tope de seguridad (${clp(borrador.tope)}): confirmá con cuidado.` : '',
    `¿Confirmo?`,
  ].filter(Boolean).join('\n')
}

/**
 * Traduce el RESULTADO crudo de login-humano al veredicto de la transferencia, registra el
 * anti-duplicado y guarda la "última". Se usa igual venga el resultado por stdout (envío
 * normal) o por archivo (login asistido que corrió suelto).
 */
function interpretarCreacion(resultado, { huella, borrador, empresa }) {
  const b = borrador.beneficiario || {}
  // El estado real de la creación va anidado en `crear`. SOLO 'creada' cuenta como
  // éxito (el banco confirmó la solicitud). 'no_creada' / 'crear_click' NO son éxito:
  // antes se daba por bueno con solo apretar "Crear" → falso positivo (no llegaba nada).
  const crear = resultado.crear || null
  const estado = crear?.estado || resultado.estado
  // 'creada' = se creó (por autorizar). 'ya_pendiente' = YA existía una a este beneficiario,
  // NO se duplicó (también es un resultado OK: la transferencia ya está en el banco).
  const yaPendiente = estado === 'ya_pendiente'
  const ok = estado === 'creada' || yaPendiente
  const limitePV = estado === 'limite_primera_vez'
  const limiteDia = estado === 'limite_diario'
  // Falso negativo histórico: aviso $50M + verificación fallida aunque el banco SÍ creó.
  // Marcamos posible_creada → mismo anti-duplicado que creada (no reenviar 1 h).
  let estadoReg = estado || 'desconocido'
  if (estado === 'tefun_no_confirmada' && (crear?.aviso_info || /50[.\s]?000[.\s]?000|por su seguridad/i.test(crear?.alerta_banco || ''))) {
    estadoReg = 'posible_creada'
  }
  registrarReciente(huella, estadoReg)
  if (ok || estadoReg === 'posible_creada') {
    guardarUltima({
      huella, estado: ok ? estado : 'posible_creada',
      empresa, monto: borrador.monto,
      beneficiario: b.nombre, rut: b.rut, cuenta: b.cuenta, banco: b.banco,
      nota: ok
        ? 'Transferencia CREADA — queda pendiente por liberar (no movió plata).'
        : 'Probable creación (banner/aviso); verificar Por Autorizar. NO reenviar.',
    })
  }
  return {
    ok: ok || estadoReg === 'posible_creada',
    estado: estadoReg === 'posible_creada' ? 'creada' : estado,
    resultado,
    pendiente: ok || estadoReg === 'posible_creada',
    ya_pendiente: yaPendiente,
    posible_creada: estadoReg === 'posible_creada',
    limite_primera_vez: limitePV,
    limite_diario: limiteDia,
    limite_monto: limitePV || limiteDia,
    aviso_info: !!(crear?.aviso_info),
    alerta_banco: crear?.alerta_banco || null,
    nota: crear?.nota || (estadoReg === 'posible_creada'
      ? 'El banco probablemente YA creó esta transferencia; la verificación automática falló antes. Revisá Por Autorizar. NO se reenvía.'
      : null),
    motivo: crear?.pista || crear?.motivo || (crear?.faltan ? `faltan campos: ${crear.faltan.join(', ')}` : null),
  }
}

/**
 * Cierra un job de transferencia que corrió ENGANCHADO a un login asistido: lee el
 * resultado que dejó login-humano en disco y lo interpreta igual que un envío normal.
 * @returns {null|object} null si todavía no terminó
 */
export function leerResultadoAsistido({ jobFile, borrador, empresa }) {
  let resultado = null
  try { resultado = JSON.parse(readFileSync(jobFile, 'utf8')) } catch { return null }
  if (!resultado || !resultado.estado) return null
  const huella = huellaEnvio(borrador, empresa)
  return interpretarCreacion(resultado, { huella, borrador, empresa })
}

/**
 * EJECUTA el borrador: lanza login-humano.mjs (TEK_CREAR=crear) que loguea, navega, llena
 * el form y aprieta "Crear" → deja la transferencia PENDIENTE. NO libera, NO mueve plata.
 * Devuelve { ok, estado, resultado } parseando el último `RESULTADO: {json}` del stdout.
 */
export function ejecutar(borrador, { userId, empresa, asistido = true } = {}) {
  return new Promise((resolve) => {
    if (!borrador || !borrador.beneficiario) {
      return resolve({ ok: false, error: 'Borrador inválido.' })
    }
    // SESIÓN POR PERSONA (03-ago-2026): quien pide transfiere con SU propio login del banco,
    // también en ANA CLARA. Antes se forzaba ramon y, si esa sesión dormía, Joaquín se quedaba
    // sin poder transferir. La elección la hace la puerta (puerta.elegirSesion) en el hub; acá
    // solo respetamos el kill-switch de emergencia.
    if (process.env.TEK_ANACLARA_SOLO_RAMON === '1' && /ana\s*clara|mallorca/i.test(empresa || '')) {
      userId = 'ramon'; empresa = 'ANA CLARA SPA'
    }
    // Chequeo previo: el usuario tiene que tener el banco conectado (creds cifradas).
    if (!credenciales.tieneConexion(userId, empresa)) {
      return resolve({ ok: false, error: `"${userId}" no tiene banco conectado${empresa ? ` para "${empresa}"` : ''}.` })
    }

    const huella = huellaEnvio(borrador, empresa)

    // ¿Ya le mandamos el link del login asistido para ESTA misma transferencia y sigue abierto?
    // Entonces no es "ocupado": es la MISMA operación esperando que la persona entre. Le
    // devolvemos el MISMO link y el MISMO PIN (uno nuevo invalidaría el que ya tiene).
    const yaAbierto = puerta.asistidoEnVuelo()
    if (yaAbierto && yaAbierto.etiqueta === `transferencia:${huella}`) {
      return resolve({
        ok: false, estado: 'necesita_login', necesita_login: true, ocupado: false,
        url: puerta.URL_VNC, pin: yaAbierto.pin, userId: yaAbierto.userId, empresa,
        nota: 'El login del banco para esta transferencia YA está abierto esperándote. Es el mismo link y el mismo PIN.',
      })
    }

    // Misma transferencia ya creada / ya intentada hace poco → NO abrir el banco otra vez.
    const bloqueo = recienteBloquea(huella)
    if (bloqueo) return resolve(bloqueo)

    // Ya hay un envío en curso (otro proceso del hub reintentando) → NO spawnear otro.
    const enCurso = envioEnCurso()
    if (enCurso) {
      return resolve({
        ok: false, estado: 'ocupado', pendiente: false, ocupado: true,
        error: 'Ya hay una transferencia en curso en el banco. NO se lanza otra (anti-bucle). Esperá a que termine.',
      })
    }
    if (!tomarEnvioLock(huella)) {
      return resolve({
        ok: false, estado: 'ocupado', pendiente: false, ocupado: true,
        error: 'No pude tomar el turno de envío (otra transferencia acaba de empezar). NO reintentes sola.',
      })
    }
    // Marca YA el fingerprint como en vuelo (antes del spawn). Así otro turno del hub
    // que llegue en paralelo ve ya_intentada/en_curso aunque el lock se pierda.
    registrarReciente(huella, 'en_curso')

    const b = borrador.beneficiario
    // Santander→Santander usa el form "A Tercero mismo Banco"; a CUALQUIER otro banco (ej.
    // Falabella) usa "A Tercero otros Bancos" (form distinto, con selector de banco destino).
    const esOtroBanco = !/santander/i.test(b.banco || '')
    const env = {
      ...process.env,
      // Sin TEK_FORZAR_LOGIN: login-humano intenta REUSAR la sesión viva primero (si ya
      // hay una del capture/otro flujo, la usa y NO reloguea) y solo loguea si no sirve.
      TEK_CREAR: 'crear',
      TEK_TRANSFER_TIPO: esOtroBanco ? 'otros' : 'mismo',
      TEK_DEST_BANCO: esOtroBanco ? (b.banco || '') : '',
      TEK_MONTO: String(borrador.monto),
      TEK_MOTIVO: borrador.motivo || 'Transferencia',
      TEK_DEST_CUENTA: soloDigitos(b.cuenta),   // dígitos, sin guiones
      TEK_DEST_MONEDA: 'PESOS',
      TEK_DEST_RUT: b.rut,
      TEK_DEST_NOMBRE: b.nombre,
      TEK_DEST_EMAIL: b.email || '',
      TEK_DEST_MSG: borrador.motivo || 'Transferencia',
    }
    if (empresa) env.TEK_EMPRESA = empresa
    if (userId) env.TEK_USER = userId

    // ── SESIÓN DORMIDA → LOGIN ASISTIDO CON LA TRANSFERENCIA ENGANCHADA ──────────
    // Si la sesión de esta persona no está fresca, el login automático no pasa el antifraude
    // (ver [[tek-login-asistido-ondemand]]): en vez de gastar 3 min para fallar, abrimos el
    // login humano por /vnc y le MANDAMOS la transferencia en el mismo proceso. Cuando la
    // persona entra, login-humano sigue solo hasta crear la pendiente. Devolvemos YA el
    // link + PIN (sin bloquear el turno del chat).
    const sesion = puerta.estadoSesion(userId)
    if (asistido && !sesion.viva) {
      // El proceso corre suelto (el humano tarda lo que tarda): que deje el resultado en
      // disco para poder contarle a la persona cómo quedó sin adivinar.
      const jobFile = join(DATA, `.job-transf-${Date.now().toString(36)}.json`)
      const ab = puerta.abrirAsistido({
        userId, empresa, motivo: `transferir $${Number(borrador.monto).toLocaleString('es-CL')} a ${b.nombre}`,
        env: { ...env, TEK_RESULTADO_FILE: jobFile }, etiqueta: `transferencia:${huella}`,
      })
      if (ab.ocupado) {
        soltarEnvioLock()
        registrarReciente(huella, 'sesion_caida')   // pre-creación: se puede reintentar ya
        return resolve({ ok: false, estado: 'ocupado', ocupado: true, error: ab.nota })
      }
      actualizarEnvioLock({ childPid: ab.pid })
      return resolve({
        ok: false, estado: 'necesita_login', necesita_login: true, pendiente: false,
        // en_vuelo (carrera: el mismo envío pedido dos veces a la vez) = la transferencia
        // viaja con AQUEL proceso y escribe en SU archivo; este no lo escribe nadie.
        url: ab.url, pin: ab.pin, userId, empresa, job: ab.en_vuelo ? null : jobFile,
        nota: 'La sesión del banco está dormida: le abrí el login para que entre. La transferencia queda enganchada y se crea sola apenas entre.',
      })
    }

    const hijo = spawn(process.execPath, [join(DIR, 'login-humano.mjs')], { cwd: DIR, env })
    actualizarEnvioLock({ childPid: hijo.pid })

    let out = '', err = ''
    hijo.stdout.on('data', (d) => { out += d.toString() })
    hijo.stderr.on('data', (d) => { err += d.toString() })

    // Timeout ~11 min (login-humano tiene su propio hard_timeout a los 10 min).
    const to = setTimeout(() => { try { hijo.kill('SIGKILL') } catch {} }, 11 * 60_000)

    const terminar = (code) => {
      clearTimeout(to)
      soltarEnvioLock()
      // Buscamos la ÚLTIMA línea `RESULTADO: {json}` del stdout.
      let resultado = null
      const lineas = out.split('\n')
      for (let i = lineas.length - 1; i >= 0; i--) {
        const idx = lineas[i].indexOf('RESULTADO:')
        if (idx >= 0) {
          try { resultado = JSON.parse(lineas[i].slice(idx + 'RESULTADO:'.length).trim()); break } catch {}
        }
      }
      if (!resultado) {
        registrarReciente(huella, 'sin_resultado')
        return resolve({ ok: false, estado: 'sin_resultado', error: `login-humano no devolvió RESULTADO (code ${code}).`, stderr: err.slice(-500) })
      }
      resolve(interpretarCreacion(resultado, { huella, borrador, empresa }))
    }

    hijo.on('close', terminar)
    hijo.on('error', (e) => {
      clearTimeout(to)
      soltarEnvioLock()
      registrarReciente(huella, 'spawn_error')
      resolve({ ok: false, estado: 'spawn_error', error: e.message })
    })
  })
}

// ── CLI ──────────────────────────────────────────────────────────────────────────
// node transferir.mjs borrador <userId> <nombre> <monto> ['motivo']  → imprime confirmación (NO ejecuta)
// node transferir.mjs enviar   <userId> <nombre> <monto> ['motivo']  → arma + EJECUTA (crea pendiente)
if (process.argv[1] && process.argv[1].endsWith('transferir.mjs')) {
  const [cmd, userId, nombre, monto, ...resto] = process.argv.slice(2)
  const motivo = resto.join(' ') || undefined

  if (cmd === 'borrador') {
    const r = armarBorrador({ userId, nombre, monto, motivo })
    if (!r.ok) { console.log(JSON.stringify(r, null, 2)); process.exit(1) }
    console.log(textoBorrador(r.borrador))
  } else if (cmd === 'enviar') {
    const r = armarBorrador({ userId, nombre, monto, motivo })
    if (!r.ok) { console.log(JSON.stringify(r, null, 2)); process.exit(1) }
    console.log(textoBorrador(r.borrador))
    console.log('\n⏳ Ejecutando (crea PENDIENTE, no libera)…')
    const res = await ejecutar(r.borrador, { userId, empresa: process.env.TEK_EMPRESA })
    console.log(JSON.stringify(res, null, 2))
    process.exit(res.ok ? 0 : 1)
  } else {
    console.log("uso: node transferir.mjs [borrador | enviar] <userId> <nombre> <monto> ['motivo']")
    process.exit(1)
  }
}

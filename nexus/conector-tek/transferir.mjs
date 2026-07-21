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
import * as beneficiarios from './beneficiarios.mjs'
import * as credenciales from './credenciales.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))

// Tope de seguridad por transferencia (CLP). Sobre esto marcamos supera_tope para que
// Nexus confirme con más cuidado (no bloquea, solo avisa). Igual estilo que TOPE_PAGO_CLP.
export const TOPE_TRANSFER_CLP = Number(process.env.TEK_TOPE_TRANSFER || 1_000_000)

const clp = (n) => '$' + Number(n || 0).toLocaleString('es-CL')
// Deja la cuenta con puros dígitos (el form del banco no quiere guiones ni espacios).
const soloDigitos = (s) => String(s || '').replace(/\D/g, '')

/** Wrapper de la libreta: resuelve una persona por nombre/alias (con desambiguación). */
export function resolver(nombre) {
  return beneficiarios.buscar(nombre)
}

/**
 * Arma el BORRADOR de una transferencia persona-a-persona. NO ejecuta nada.
 * Devuelve:
 *  - { ok:false, ambiguo:true, candidatos, error }  si hay varios contactos que calzan
 *  - { ok:false, error }                             si no resuelve o el monto es inválido
 *  - { ok:true, borrador:{ beneficiario, monto, motivo, origen, supera_tope, tope } }
 */
export function armarBorrador({ userId, nombre, monto, motivo } = {}) {
  const r = resolver(nombre)
  if (!r.ok) {
    // Propagamos la ambigüedad tal cual (con candidatos) para que Nexus pregunte cuál.
    if (r.ambiguo) return { ok: false, ambiguo: true, candidatos: r.candidatos, error: r.error }
    return { ok: false, error: r.error }
  }

  const m = Math.trunc(Number(monto))
  if (!Number.isFinite(m) || m <= 0) {
    return { ok: false, error: 'Monto inválido (debe ser un entero en CLP > 0).' }
  }

  const b = r.beneficiario
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
    supera_tope: m > TOPE_TRANSFER_CLP,
    tope: TOPE_TRANSFER_CLP,
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
 * EJECUTA el borrador: lanza login-humano.mjs (TEK_CREAR=crear) que loguea, navega, llena
 * el form y aprieta "Crear" → deja la transferencia PENDIENTE. NO libera, NO mueve plata.
 * Devuelve { ok, estado, resultado } parseando el último `RESULTADO: {json}` del stdout.
 */
export function ejecutar(borrador, { userId, empresa } = {}) {
  return new Promise((resolve) => {
    if (!borrador || !borrador.beneficiario) {
      return resolve({ ok: false, error: 'Borrador inválido.' })
    }
    // Chequeo previo: el usuario tiene que tener el banco conectado (creds cifradas).
    if (!credenciales.tieneConexion(userId, empresa)) {
      return resolve({ ok: false, error: `"${userId}" no tiene banco conectado${empresa ? ` para "${empresa}"` : ''}.` })
    }

    const b = borrador.beneficiario
    const env = {
      ...process.env,
      // Sin TEK_FORZAR_LOGIN: login-humano intenta REUSAR la sesión viva primero (si ya
      // hay una del capture/otro flujo, la usa y NO reloguea) y solo loguea si no sirve.
      TEK_CREAR: 'crear',
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

    const hijo = spawn(process.execPath, [join(DIR, 'login-humano.mjs')], { cwd: DIR, env })

    let out = '', err = ''
    hijo.stdout.on('data', (d) => { out += d.toString() })
    hijo.stderr.on('data', (d) => { err += d.toString() })

    // Timeout ~11 min (login-humano tiene su propio hard_timeout a los 10 min).
    const to = setTimeout(() => { try { hijo.kill('SIGKILL') } catch {} }, 11 * 60_000)

    const terminar = (code) => {
      clearTimeout(to)
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
        return resolve({ ok: false, estado: 'sin_resultado', error: `login-humano no devolvió RESULTADO (code ${code}).`, stderr: err.slice(-500) })
      }
      // El estado real de la creación va anidado en `crear` (crear_click = apretó "Crear").
      const crear = resultado.crear || null
      const estado = crear?.estado || resultado.estado
      const ok = estado === 'crear_click' || estado === 'logueado'
      resolve({ ok, estado, resultado, pendiente: crear?.estado === 'crear_click' })
    }

    hijo.on('close', terminar)
    hijo.on('error', (e) => { clearTimeout(to); resolve({ ok: false, estado: 'spawn_error', error: e.message }) })
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

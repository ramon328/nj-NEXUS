// transferir-api.mjs — CREAR la SOLICITUD de transferencia llamando el endpoint
// DIRECTO por fetch dentro de la sesión viva del navegador, SIN clickear el
// formulario (la causa #1 de fallas). Idea de Ramón; plan original del propio
// login-humano.mjs ("descubrir la API real y llamarla directo, sin leer HTML").
//
// ⚠️ BLINDAJE (no negociable):
//   • Solo crea la SOLICITUD → queda "Por Autorizar". La plata NO se mueve.
//   • Solo ANA CLARA (TEK_API_EMPRESA_OK). Cualquier otra empresa → aborta.
//   • Tope de monto chico (TOPE_MONTO). Sobre eso → aborta.
//   • Dry-run por defecto: muestra el body que MANDARÍA, sin mandarlo.
//   • NO inventa el payload: usa el "molde" grabado (data/xhr-payloads.json) y
//     reemplaza los valores exactos de la captura por los nuevos.
//
// Requisitos previos (una sola vez):
//   1) Login limpio con TEK_LOG_XHR=1 y hacer UNA transferencia $1 por formulario.
//      Eso graba el molde en data/xhr-payloads.json (postData de crearTransferencia).
//   2) Anotar en data/transfer-api-map.json los valores usados en esa captura:
//      { "monto": "1", "cuenta": "<cta joaquin>", "rut": "<rut joaquin>" }
//   Con eso el replay ya es determinista.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HOSTS, MATCH } from './endpoints.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
const PAY_FILE = join(DATA, 'xhr-payloads.json')
const MAP_FILE = join(DATA, 'transfer-api-map.json')

const EMPRESA_OK = (process.env.TEK_API_EMPRESA_OK || 'ANA CLARA').toUpperCase()
const TOPE_MONTO = Number(process.env.TEK_API_TOPE_MONTO || 5000)   // montos chicos
const soloDigitos = (s) => String(s || '').replace(/\D/g, '')

function leerMolde() {
  if (!existsSync(PAY_FILE)) return null
  let all = {}
  try { all = JSON.parse(readFileSync(PAY_FILE, 'utf8')) } catch { return null }
  const clave = Object.keys(all).find((k) => /crearTransferencia/i.test(k))
  return clave ? all[clave] : null
}
function leerMapa() {
  try { return JSON.parse(readFileSync(MAP_FILE, 'utf8')) } catch { return null }
}

// Construye el body nuevo a partir del molde grabado, reemplazando los valores
// EXACTOS de la captura (monto/cuenta/rut) por los pedidos. Robusto: no depende
// de conocer los nombres de los campos internos del banco.
function armarBody(moldePost, mapa, { monto, cuenta, rut }) {
  let s = String(moldePost || '')
  if (!s) return null
  const reps = [
    [mapa.monto, String(monto)],
    [mapa.cuenta, String(cuenta)],
    [soloDigitos(mapa.cuenta), soloDigitos(cuenta)],
    [mapa.rut, String(rut)],
    [soloDigitos(mapa.rut), soloDigitos(rut)],
  ]
  for (const [de, a] of reps) {
    if (!de || de === a) continue
    s = s.split(String(de)).join(String(a))
  }
  return s
}

/**
 * Crea la solicitud de transferencia por llamada directa al endpoint.
 * @param {import('patchright').Page} page  página con la sesión viva del banco
 * @param {object} opts { empresa, monto, cuenta, rut, contentType?, dry }
 * @returns {Promise<object>} resultado normalizado
 */
export async function transferirDirecto(page, opts = {}) {
  const { empresa = '', monto, cuenta, rut } = opts
  const dry = opts.dry !== false   // dry-run por defecto

  // ── candados ──
  if (String(empresa).toUpperCase().indexOf(EMPRESA_OK) === -1) {
    return { estado: 'empresa_no_permitida', ok: false, nota: `La API directa solo opera ${EMPRESA_OK}. Empresa pedida: "${empresa}".` }
  }
  const montoNum = Number(soloDigitos(monto))
  if (!montoNum || montoNum <= 0) return { estado: 'monto_invalido', ok: false, nota: 'Monto vacío o cero.' }
  if (montoNum > TOPE_MONTO) {
    return { estado: 'monto_sobre_tope', ok: false, nota: `Monto ${montoNum} sobre el tope de la API directa (${TOPE_MONTO}). Usá el flujo por formulario para montos mayores.` }
  }
  if (!cuenta || !rut) return { estado: 'faltan_datos', ok: false, nota: 'Falta cuenta o rut del destino.' }

  // ── molde ──
  const molde = leerMolde()
  const mapa = leerMapa()
  if (!molde || !molde.postData) {
    return { estado: 'sin_molde', ok: false, nota: 'No hay molde grabado. Hacé UNA transferencia $1 por formulario con TEK_LOG_XHR=1 para grabar data/xhr-payloads.json, y anotá los valores en transfer-api-map.json.' }
  }
  if (!mapa || !mapa.monto || !mapa.cuenta || !mapa.rut) {
    return { estado: 'sin_mapa', ok: false, nota: 'Falta data/transfer-api-map.json con {monto,cuenta,rut} usados en la captura, para poder reemplazar bien.' }
  }

  const body = armarBody(molde.postData, mapa, { monto: montoNum, cuenta, rut })
  if (!body || body === molde.postData) {
    return { estado: 'no_sustituido', ok: false, nota: 'No se pudo reemplazar los valores en el molde (¿el mapa no coincide con lo grabado?). No mando nada por seguridad.' }
  }

  const url = molde.url || `https://${HOSTS.EOB}/TEFUN.UI.Services/api/CreacionTransferenciaUnitaria/crearTransferencia`
  const contentType = opts.contentType || molde.headers?.['content-type'] || 'application/json; charset=UTF-8'

  if (dry) {
    return { estado: 'dry_run', ok: true, dry: true, url, contentType, body, nota: 'DRY-RUN: este es el body que se mandaría. No se envió nada. Pasá dry:false para crear la solicitud (queda Por Autorizar).' }
  }

  // ── envío directo DESDE la página (lleva cookies + token + contexto Incapsula) ──
  const resp = await page.evaluate(async ({ url, body, contentType }) => {
    try {
      const r = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': contentType, 'X-Requested-With': 'XMLHttpRequest' },
        body,
      })
      const txt = await r.text().catch(() => '')
      return { status: r.status, ok: r.ok, txt: txt.slice(0, 4000) }
    } catch (e) { return { status: 0, ok: false, error: String(e && e.message || e) } }
  }, { url, body, contentType }).catch((e) => ({ status: 0, ok: false, error: e.message }))

  let parsed = null
  try { parsed = JSON.parse(resp.txt) } catch { /* */ }
  const codigo = parsed?.Result?.Transferencia?.CodigoTransferencia || null
  const rebotada = /login|sesi[oó]n|wslogin/i.test(resp.txt || '') && resp.status !== 200

  return {
    estado: rebotada ? 'sesion_caida' : (resp.ok && codigo ? 'creada' : (resp.ok ? 'respondio' : 'error_http')),
    ok: !!resp.ok,
    pendiente: !!codigo,           // Por Autorizar
    codigoTransferencia: codigo,
    httpStatus: resp.status,
    raw: (resp.txt || resp.error || '').slice(0, 800),
    nota: codigo ? 'Solicitud creada, queda Por Autorizar (la plata NO se mueve).' : 'El banco respondió pero sin código de transferencia; revisar raw.',
  }
}

export default { transferirDirecto }

// movimientos-api.mjs — LEE los movimientos recientes de una cuenta llamando el endpoint
// DIRECTO por fetch dentro de la sesión viva del banco (SIN navegar la cartola, que es lo
// pesado que arriesga antifraude/timeout). Mismo patrón que transferir-api.mjs, pero SOLO
// LECTURA (no mueve ni firma nada).
//
// Endpoint: POST eob.officebanking.cl/CTA.UI.Services/api/SaldoCuentaCorriente/ObtenerMovimientos
//   → devuelve { Result: { Detalle: [ ...movimientos... ], CCC, Divisa, FechaDesde, FechaHasta } }
//
// Necesita el MOLDE (request-body) grabado en data/xhr-payloads.json. Se captura solo la
// PRÓXIMA vez que el sistema lea movimientos por cartola (el grabador de payloads ya lo agarra).
// Hasta que exista el molde, devuelve { estado: 'sin_molde' } con instrucciones.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const PAY_FILE = join(DIR, 'data', 'xhr-payloads.json')
const URL_MOVS = 'https://eob.officebanking.cl/CTA.UI.Services/api/SaldoCuentaCorriente/ObtenerMovimientos'

const soloDigitos = (s) => String(s || '').replace(/\D/g, '')

function leerMolde() {
  if (!existsSync(PAY_FILE)) return null
  let all = {}
  try { all = JSON.parse(readFileSync(PAY_FILE, 'utf8')) } catch { return null }
  const k = Object.keys(all).find((x) => /ObtenerMovimientos/i.test(x))
  return k ? all[k] : null
}

// Reemplaza en el molde (JSON) la CUENTA y el RANGO DE FECHAS por los pedidos. Detecta los
// campos por nombre común (case-insensitive), porque el molde exacto lo confirmamos cuando se
// capture. NO inventa: si un campo no está, lo deja como en la captura.
function armarBody(moldePost, { cuenta, ccc, desde, hasta } = {}) {
  let obj = null
  try { obj = JSON.parse(String(moldePost || '')) } catch { return { body: null, reemplazos: [], nota: 'el molde no es JSON — revisar formato al capturarlo' } }
  const reemplazos = []
  const setSi = (rx, val, etq) => {
    if (val == null || val === '') return
    for (const k of Object.keys(obj)) {
      if (rx.test(k)) { obj[k] = String(val); reemplazos.push(`${etq}:${k}`) }
    }
  }
  // Cuenta / CCC (número de cuenta de esa empresa)
  if (ccc) setSi(/^ccc$|cuentacorrientecodigo|codigocuenta/i, ccc, 'ccc')
  if (cuenta) setSi(/^cuenta$|numerocuenta|cuentanumero|nrocuenta|cuentaorigen/i, soloDigitos(cuenta), 'cuenta')
  // Rango de fechas
  if (desde) setSi(/fechadesde|^desde$|fechainicio|fechaini/i, desde, 'desde')
  if (hasta) setSi(/fechahasta|^hasta$|fechafin|fechater/i, hasta, 'hasta')
  return { body: JSON.stringify(obj), reemplazos, molde_campos: Object.keys(obj) }
}

/**
 * Lee los movimientos de una cuenta llamando el endpoint DENTRO de la sesión viva.
 * @param {import('patchright').Page} page  página con la sesión del banco (logueada)
 * @param {object} opts { cuenta, ccc?, desde?, hasta?, dry? }  fechas en 'YYYY-MM-DDT00:00:00'
 * @returns {Promise<object>} { estado, movimientos?, total?, body?, reemplazos? }
 */
export async function leerMovimientosDirecto(page, opts = {}) {
  const molde = leerMolde()
  if (!molde || !molde.postData) {
    return { estado: 'sin_molde', ok: false, nota: 'Todavía no está el molde de ObtenerMovimientos. Se captura solo la próxima vez que el sistema lea movimientos por cartola (o en el refresco de la mañana con TEK_LEER_MOVS=1). Después este lector funciona sin navegar.' }
  }
  const { body, reemplazos, molde_campos } = armarBody(molde.postData, opts)
  if (!body) return { estado: 'molde_no_json', ok: false, nota: 'El molde no es JSON parseable; revisar al capturarlo.' }
  const url = molde.url || URL_MOVS
  const contentType = molde.headers?.['content-type'] || 'application/json; charset=UTF-8'

  if (opts.dry !== false && opts.dry) {
    return { estado: 'dry_run', ok: true, dry: true, url, body, reemplazos, molde_campos, nota: 'DRY: este es el body que se mandaría. No se llamó nada.' }
  }

  const resp = await page.evaluate(async ({ url, body, contentType }) => {
    try {
      const r = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': contentType, 'X-Requested-With': 'XMLHttpRequest' }, body })
      const txt = await r.text().catch(() => '')
      return { status: r.status, ok: r.ok, txt: txt.slice(0, 200000) }
    } catch (e) { return { status: 0, ok: false, error: String(e && e.message || e) } }
  }, { url, body, contentType }).catch((e) => ({ status: 0, ok: false, error: e.message }))

  let parsed = null
  try { parsed = JSON.parse(resp.txt) } catch { /* */ }
  const detalle = parsed?.Result?.Detalle || parsed?.Result?.detalle || null
  const rebotada = /login|sesi[oó]n|wslogin/i.test(resp.txt || '') && resp.status !== 200
  return {
    estado: rebotada ? 'sesion_caida' : (resp.ok && Array.isArray(detalle) ? 'ok' : (resp.ok ? 'respondio' : 'error_http')),
    ok: resp.ok && Array.isArray(detalle),
    httpStatus: resp.status,
    total: Array.isArray(detalle) ? detalle.length : 0,
    movimientos: detalle || [],
    reemplazos,
    raw: Array.isArray(detalle) ? undefined : (resp.txt || resp.error || '').slice(0, 500),
  }
}

export default { leerMovimientosDirecto }

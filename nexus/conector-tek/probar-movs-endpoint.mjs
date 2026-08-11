// probar-movs-endpoint.mjs — PRUEBA (solo lectura): ¿se pueden sacar los MOVIMIENTOS
// llamando el endpoint directo, en vez de navegar la interfaz cada vez?
//
// El endpoint ObtenerMovimientos exige DOS cosas atadas a la sesión:
//   · authorization: Bearer <token>   (de la sesión)
//   · DatosHash                        (lo genera la app al abrir la cartola de esa cuenta)
// Ninguna se puede inventar. PERO se pueden CAPTURAR una vez (dejando que la app cargue la
// cartola) y después REUSAR para pedir cualquier rango de fechas sin volver a navegar.
//
// Esta prueba mide exactamente eso:
//   1) cuánto tarda la carga normal (navegar + que la app pida los movimientos)
//   2) cuánto tarda un 2º pedido REUSANDO token+hash (que es lo que se ganaría)
//
// NO mueve plata, NO autoriza nada. Usa el candado: si el banco está ocupado, se sale.
import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crearCandado } from './candado.mjs'
const { chromium } = patchright

const DIR = dirname(fileURLToPath(import.meta.url))
const PROFILE = join(DIR, 'chrome-profile')
const EMPRESA = process.env.TEK_EMPRESA || 'IMPORTADORA JURI Y JURI'
const t0 = Date.now()
const seg = () => ((Date.now() - t0) / 1000).toFixed(1) + 's'
const log = (...a) => console.log('[' + seg() + ']', ...a)

const candado = crearCandado({ log: (m) => console.error('[candado]', m) })
if (!await candado.adquirir()) { console.log('RESULTADO:', JSON.stringify({ estado: 'ocupado' })); process.exit(0) }

let ctx
try {
  ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false, channel: 'chrome', viewport: { width: 1360, height: 860 },
    locale: 'es-CL', timezoneId: 'America/Santiago',
  })
  const page = ctx.pages()[0] || await ctx.newPage()

  // ── 1) Espiar la petición REAL de la app para quedarnos con token + hash + cuenta ──
  let capturado = null
  let respuestaApp = null
  const oauth = []
  page.on('request', (req) => {
    // Cambio de empresa: la app pide un token nuevo por CONTRATO. Si capturamos ese cuerpo,
    // se podría cambiar de empresa por API en vez de navegar el selector (lo que hoy cuesta
    // ~4 min por empresa). Solo se OBSERVA: no se dispara nada.
    if (/oauth_login_empresa\/oauth2\/refresh|users\/\d+\/compan/i.test(req.url())) {
      try { oauth.push({ url: req.url().slice(0, 110), metodo: req.method(), body: (req.postData() || '').slice(0, 300) }) } catch { /* */ }
    }
    if (!/ObtenerMovimientos/i.test(req.url())) return
    try {
      const h = req.headers()
      capturado = { url: req.url(), auth: h.authorization || '', cookie: h.cookie || '', body: JSON.parse(req.postData() || '{}') }
      log('✓ capturé la petición de la app (token + DatosHash)')
    } catch (e) { log('no pude leer la petición:', e.message) }
  })
  page.on('response', async (r) => {
    if (!/ObtenerMovimientos/i.test(r.url()) || respuestaApp) return
    try { const j = await r.json(); respuestaApp = (j?.Result?.Detalle || []).length; log('✓ la app recibió', respuestaApp, 'movimientos') } catch { /* */ }
  })

  log('abriendo el banco (reusa la sesión viva)…')
  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(6000)
  const url = page.url()
  if (/login|error-seguridad|empresas\.officebanking/i.test(url)) {
    console.log('RESULTADO:', JSON.stringify({ estado: 'sesion_muerta', url }))
    await ctx.close(); candado.soltar(); process.exit(0)
  }
  log('dentro del banco:', url.slice(0, 60))

  // ── 2) Navegar a la cartola para que la app dispare ObtenerMovimientos ─────────
  const tNav = Date.now()
  await page.goto('https://eob.officebanking.cl/CTA.UI.Web/saldoctacte/', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  for (let i = 0; i < 30 && !capturado; i++) await page.waitForTimeout(1000)
  const segNav = ((Date.now() - tNav) / 1000).toFixed(1)
  if (!capturado) {
    console.log('RESULTADO:', JSON.stringify({ estado: 'no_capture', nota: 'la app no pidió ObtenerMovimientos al cargar la cartola', url: page.url() }))
    await ctx.close(); candado.soltar(); process.exit(0)
  }
  log(`navegación + carga de la app: ${segNav}s`)

  // ── 3) LO QUE IMPORTA: repetir el pedido REUSANDO token+hash, con otro rango ──
  const body = { ...capturado.body }
  const hasta = new Date()
  const desde = new Date(Date.now() - 30 * 864e5)
  body.FechaDesde = desde.toISOString()
  body.FechaHasta = hasta.toISOString()
  const tRe = Date.now()
  const res = await page.evaluate(async ({ url, auth, body }) => {
    const r = await fetch(url, {
      method: 'POST', credentials: 'include',
      headers: { 'content-type': 'application/json', accept: '*/*', authorization: auth },
      body: JSON.stringify(body),
    })
    const j = await r.json().catch(() => null)
    return { status: r.status, n: (j?.Result?.Detalle || []).length, muestra: (j?.Result?.Detalle || []).slice(0, 2) }
  }, { url: capturado.url, auth: capturado.auth, body })
  const segRe = ((Date.now() - tRe) / 1000).toFixed(1)

  log(`⚡ pedido REUSANDO el endpoint: ${segRe}s → HTTP ${res.status}, ${res.n} movimientos (30 días)`)
  if (res.muestra?.length) for (const m of res.muestra) log('   ·', m.FechaContableMovimiento || m.Fecha, m.Importe ?? m.Monto, String(m.Descripcion || '').slice(0, 40))

  console.log('RESULTADO:', JSON.stringify({
    estado: 'ok', oauth_capturado: oauth.slice(0,4), navegacion_seg: Number(segNav), reuso_seg: Number(segRe),
    movs_app: respuestaApp, movs_reuso: res.n, http: res.status,
    veredicto: res.status === 200 && res.n > 0 ? 'SE PUEDE reusar el endpoint' : 'el reuso NO devolvió datos',
  }))
} catch (e) {
  console.log('RESULTADO:', JSON.stringify({ estado: 'error', error: e.message }))
} finally {
  try { await ctx?.close() } catch { /* */ }
  candado.soltar()
}

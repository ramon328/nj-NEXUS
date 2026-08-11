// movs-rapido.mjs — MOVIMIENTOS por ENDPOINT DIRECTO (solo lectura). Rápido y sin navegar.
//
// POR QUÉ: leer movimientos navegando la interfaz tardaba >150 s y ni siquiera alcanzaba
// (se mataba el proceso y caía al caché). Medido el 11-08-2026: cargar la cartola UNA vez
// toma ~2 s y, reusando el token + DatosHash que la app genera, pedir CUALQUIER rango de
// fechas toma **0,5 s**. De 150 s a 10 s de punta a punta.
//
// CÓMO: el endpoint ObtenerMovimientos exige dos cosas atadas a la sesión —un Bearer y un
// DatosHash que la app calcula al abrir la cartola—. No se inventan: se dejan generar una
// vez y se REUSAN. Las llamadas salen del propio navegador logueado, así que para el banco
// son idénticas a las de su app (mismo origen, mismas cookies, mismo token).
//
// ⚠️ SOLO LECTURA: no transfiere, no autoriza, no toca plata. Respeta el candado de sesión.
//
// Uso:  node movs-rapido.mjs --user ramon --empresa "IMPORTADORA JURI" [--dias 30]
import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync, readFileSync } from 'node:fs'
import { crearCandado } from './candado.mjs'
const { chromium } = patchright

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d }
const USER = (arg('user', 'ramon') || 'ramon').toLowerCase()
const EMPRESA = arg('empresa', '')
const DIAS = Number(arg('dias', 30)) || 30
const PROFILE = join(DIR, USER === 'ramon' ? 'chrome-profile' : `chrome-profile-${USER}`)
const slug = (e) => String(e || '').toLowerCase().replace(/[^a-z0-9]/g, '')

const salir = (o) => { console.log('RESULTADO:', JSON.stringify(o)); process.exit(0) }

const candado = crearCandado({ user: USER, log: () => {} })
if (!await candado.adquirir()) salir({ ok: false, estado: 'ocupado' })

let ctx
try {
  ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false, channel: 'chrome', viewport: { width: 1360, height: 860 },
    locale: 'es-CL', timezoneId: 'America/Santiago',
  })
  const page = ctx.pages()[0] || await ctx.newPage()

  let cap = null
  page.on('request', (req) => {
    if (!/ObtenerMovimientos/i.test(req.url()) || cap) return
    try { cap = { url: req.url(), auth: req.headers().authorization || '', body: JSON.parse(req.postData() || '{}') } } catch { /* */ }
  })

  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(5000)
  if (/login|error-seguridad|empresas\.officebanking/i.test(page.url())) {
    salir({ ok: false, estado: 'sesion_muerta', nota: 'La sesión del banco no está viva. Hay que loguear antes (esto NO loguea a propósito: es un lector barato).' })
  }

  // ── CAMBIO DE EMPRESA (11-08-2026) ────────────────────────────────────────────────
  // Sin esto el lector devolvía los movimientos de la empresa que estuviera abierta CON EL
  // NOMBRE DE OTRA (se pidió FOOD EXPERT y salieron los de ACE). Se usa el mecanismo YA
  // PROBADO de login-humano —volver al selector y entrar por la fila— con clics de mouse
  // reales (regla de oro del banco: el mouse VIAJA, nunca teleport). El endpoint directo
  // se usa DESPUÉS, que es donde está la ganancia de velocidad.
  if (EMPRESA) {
    const enSelector = async () => {
      const t = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
      return /seleccion-empresa|listado de empresas|selecciona.*empresa|selector de empresas/i.test(page.url() + ' ' + t)
    }
    if (!await enSelector()) {
      await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
      await page.waitForTimeout(4500)
      const btnRol = page.getByText(/Empresa\s*\/\s*Rol/i).first()
      if (await btnRol.count().catch(() => 0)) { await btnRol.click({ delay: 60 }).catch(() => {}); await page.waitForTimeout(2500) }
      const volver = page.getByText(/volver al?\s*selector de empresas/i).first()
      if (await volver.count().catch(() => 0)) { await volver.click({ delay: 60 }).catch(() => {}); await page.waitForTimeout(4500) }
    }
    if (!await enSelector()) salir({ ok: false, estado: 'sin_selector', nota: 'No pude llegar al selector de empresas para cambiar a ' + EMPRESA })
    // Fila de la empresa objetivo → su botón "Entrar". Se busca la FILA exacta, no un
    // ancestro que englobe todas (ese bug entraba siempre a la primera de la lista).
    const fila = page.locator('tr, [role="row"], [class*="row"], li').filter({ hasText: new RegExp(EMPRESA.split(' ').slice(0, 2).join('.*'), 'i') }).first()
    let entrar = fila.getByText(/entrar/i).first()
    if (!(await entrar.count().catch(() => 0))) entrar = fila.locator('a, button, [role="button"], [class*="btn"]').last()
    if (!(await entrar.count().catch(() => 0))) salir({ ok: false, estado: 'empresa_no_esta', nota: `No encontré "${EMPRESA}" en el listado de empresas de ${USER}.` })
    await entrar.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {})
    const box = await entrar.boundingBox().catch(() => null)
    if (box) { await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5, { steps: 18 }); await page.waitForTimeout(180); await page.mouse.down(); await page.waitForTimeout(70); await page.mouse.up() }
    else await entrar.click({ delay: 60 }).catch(() => {})
    await page.waitForTimeout(8000)
  }

  // Cargar la cartola UNA vez para que la app genere el token y el DatosHash.
  await page.goto('https://eob.officebanking.cl/CTA.UI.Web/saldoctacte/', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  for (let i = 0; i < 25 && !cap; i++) await page.waitForTimeout(1000)
  if (!cap) salir({ ok: false, estado: 'sin_captura', nota: 'La app no pidió los movimientos al cargar la cartola; no pude tomar el token/hash.' })

  // Ya con token+hash: pedir el rango que se quiera, directo. Esto es lo que tarda ~0,5 s.
  const body = { ...cap.body }
  body.FechaDesde = new Date(Date.now() - DIAS * 864e5).toISOString()
  body.FechaHasta = new Date().toISOString()
  const t = Date.now()
  const res = await page.evaluate(async ({ url, auth, body }) => {
    const r = await fetch(url, {
      method: 'POST', credentials: 'include',
      headers: { 'content-type': 'application/json', accept: '*/*', authorization: auth },
      body: JSON.stringify(body),
    })
    const j = await r.json().catch(() => null)
    return { status: r.status, detalle: j?.Result?.Detalle || [] }
  }, { url: cap.url, auth: cap.auth, body })
  const ms = Date.now() - t

  if (res.status !== 200) salir({ ok: false, estado: 'http_' + res.status })

  // Normalizar al mismo formato que ya usa el resto (fecha, descripcion, monto con signo).
  const movimientos = res.detalle.map((m) => {
    const bruto = Number(m.Importe ?? m.Monto ?? 0)
    const esCargo = m.EsCargo === true || bruto < 0
    const monto = esCargo ? -Math.abs(bruto) : Math.abs(bruto)
    return {
      fecha: String(m.FechaContableMovimiento || m.Fecha || '').slice(0, 10),
      descripcion: String(m.Descripcion || '').trim(),
      monto, signo: monto < 0 ? 'egreso' : 'ingreso',
      saldo: m.NuevoSaldo != null ? Number(m.NuevoSaldo) : undefined,
      documento: m.NroDocumento || undefined,
      cuenta: body.NumeroCuenta || undefined,
    }
  }).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))

  // ⛔ GUARDIA DE IDENTIDAD — OBLIGATORIA ANTES DE GUARDAR.
  // Este lector NO cambia de empresa: lee la que esté abierta en la sesión. Si se le pide
  // otra, devolvería los movimientos de la abierta CON EL NOMBRE EQUIVOCADO. Pasó de verdad
  // el 11-08-2026: se pidió FOOD EXPERT y entregó los de ACE (cuenta 98510656), idénticos.
  // Un movimiento bancario bajo la empresa equivocada es peor que no tener el dato.
  // Contraste: la cuenta leída tiene que ser la de esa empresa según cuentas-origen.json.
  const cuentaLeida = String(body.NumeroCuenta || '').replace(/\D/g, '')
  if (EMPRESA) {
    let esperada = ''
    try {
      const orig = JSON.parse(readFileSync(join(DATA, 'cuentas-origen.json'), 'utf8'))
      esperada = String(orig[EMPRESA] || '').replace(/\D/g, '')
    } catch { /* sin tabla → no se puede validar */ }
    if (esperada && cuentaLeida && !esperada.endsWith(cuentaLeida) && !cuentaLeida.endsWith(esperada)) {
      salir({ ok: false, estado: 'empresa_equivocada', empresa_pedida: EMPRESA,
        cuenta_leida: cuentaLeida, cuenta_esperada: esperada, total_leidos: movimientos.length,
        nota: `La sesión está parada en OTRA empresa (leí la cuenta ${cuentaLeida} y ${EMPRESA} es la ${esperada}). NO guardo nada: entregar estos movimientos como si fueran de ${EMPRESA} sería un dato falso. Hay que entrar a esa empresa primero.` })
    }
    const out = { empresa: EMPRESA, cuenta: cuentaLeida, movimientos, total: movimientos.length, _ts: Date.now(), _fuente: 'endpoint' }
    try { writeFileSync(join(DATA, `emp-${slug(EMPRESA)}-movs.json`), JSON.stringify(out, null, 2)) } catch { /* */ }
  }
  salir({ ok: true, estado: 'ok', empresa: EMPRESA || null, dias: DIAS, total: movimientos.length, ms_endpoint: ms, movimientos: movimientos.slice(0, 5) })
} catch (e) {
  salir({ ok: false, estado: 'error', error: e.message })
} finally {
  try { await ctx?.close() } catch { /* */ }
  candado.soltar()
}

// capturar-movimientos.mjs — SOLO LECTURA. Reusa la sesión viva y captura los
// MOVIMIENTOS reales desde la cartola correcta (Cuentas Corrientes → Saldos y
// movimientos), interceptando el endpoint interno:
//   eob.officebanking.cl/CTA.UI.Services/api/SaldoCuentaCorriente/ObtenerMovimientos
//   → .Result.Detalle[]  (Importe/Monto, EsCargo, EsAbono, FechaContableMovimiento,
//      Descripcion, NuevoSaldo, NroDocumento, NroMovimiento, GlosaSucursal)
// OJO: el banco online solo entrega ~90 días. Para 2026 completo hace falta cartola
// histórica / PDF mensual (otro flujo). Acá traemos el máximo online (90 días) por cuenta.
// Normaliza a {fecha, descripcion, cargo, abono, saldo, documento, sucursal, nroMov, cuenta}.
// NO firma NI transfiere.
import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
const { chromium } = patchright
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = '/Users/AIagenteia/nexus/conector-tek'
const PROFILE = join(DIR, 'chrome-profile')
const DATA = join(DIR, 'data')
mkdirSync(DATA, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log('·', ...a)
const PRIVADO = 'privado.officebanking.cl'
const CARTOLA = 'https://privado.officebanking.cl/portal-fob?type=EOB&dest=TRNCNA_SDOCTACTE'

// rango: banco tope 90 días. desde = max(TEK_DESDE, hoy-88) para no exceder.
const hoy = new Date()
const iso = (d) => d.toISOString().slice(0, 10)
const cl = (isoStr) => `${isoStr.slice(8, 10)}/${isoStr.slice(5, 7)}/${isoStr.slice(0, 4)}`
const pedido = process.env.TEK_DESDE || '2026-01-01'
const min90 = new Date(hoy.getTime() - 88 * 864e5)
const desdeISO = pedido > iso(min90) ? pedido : iso(min90)   // no pedir más de 90 días
const hastaISO = iso(hoy)

function normFecha(s) {
  const t = String(s || '')
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = t.match(/(\d{2})[/-](\d{2})[/-](\d{4})/); if (m) return `${m[3]}-${m[2]}-${m[1]}`
  m = t.match(/(\d{2})[/-](\d{2})[/-](\d{2})\b/); if (m) return `20${m[3]}-${m[2]}-${m[1]}`
  return ''
}
const numDe = (v) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : Math.abs(n) }

function normalizar(detalle, cuenta) {
  return (detalle || []).map((r) => {
    const monto = numDe(r.Monto ?? r.Importe)
    const esCargo = r.EsCargo === true || r.EsCargo === 'true' || r.EsCargo === 1
    const esAbono = r.EsAbono === true || r.EsAbono === 'true' || r.EsAbono === 1
    return {
      fecha: normFecha(r.FechaContableMovimiento || r.FechaContable),
      descripcion: String(r.Descripcion || r.DetalleMovimiento || '').trim(),
      cargo: esCargo ? monto : 0,
      abono: esAbono ? monto : 0,
      saldo: numDe(r.NuevoSaldo),
      documento: String(r.NroDocumento || '').trim(),
      sucursal: String(r.GlosaSucursal || r.Sucursal || '').trim(),
      nroMov: String(r.NroMovimiento || '').trim(),
      cuenta,
    }
  })
}

async function main() {
  setTimeout(() => { console.log('RESULTADO:', JSON.stringify({ estado: 'hard_timeout' })); process.exit(2) }, 260_000).unref?.()
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false, channel: 'chrome', viewport: { width: 1360, height: 860 },
    locale: 'es-CL', timezoneId: 'America/Santiago',
  })
  const page = ctx.pages()[0] || await ctx.newPage()

  // interceptar movimientos y saldos
  const movsPorLote = []
  let saldos = null
  ctx.on('response', async (r) => {
    try {
      const url = r.url()
      if (/ObtenerMovimientos/i.test(url)) {
        const b = JSON.parse(await r.text())
        const det = b?.Result?.Detalle || b?.Detalle || []
        if (Array.isArray(det) && det.length) { movsPorLote.push(det); log(`  ↯ ObtenerMovimientos: ${det.length} filas`) }
      } else if (/account_summary/i.test(url)) {
        const b = JSON.parse(await r.text())
        if (b?.listCustAccount) saldos = b.listCustAccount
      }
    } catch {}
  })

  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  await sleep(6000)
  if (!page.url().includes(PRIVADO) || /\/login/i.test(page.url())) {
    console.log('RESULTADO:', JSON.stringify({ estado: 'sesion_expirada' })); await ctx.close(); return
  }
  // entrar a ANA CLARA si hay listado
  const t0 = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
  if (/listado de empresas|selecciona.*empresa/i.test(t0)) {
    const entrar = page.locator('tr,[role="row"],[class*="row"],li').filter({ hasText: /ANA CLARA/i }).first().getByText(/entrar/i).first()
    await entrar.click({ timeout: 6000 }).catch(() => {}); await sleep(8000)
  }

  // ir a la cartola por MENÚ (el goto directo no inicializa el iframe SPA):
  // Cuentas Corrientes → Saldos y movimientos, con clic de mouse REAL.
  const clickTexto = async (re) => {
    const loc = page.getByText(re).first()
    const box = await loc.boundingBox().catch(() => null)
    if (!box) return false
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 12 }).catch(() => {})
    await sleep(220); await page.mouse.down(); await sleep(70); await page.mouse.up()
    return true
  }
  const esVisible = async (re) => page.getByText(re).first().isVisible().catch(() => false)
  // asegura que "Saldos y movimientos" esté visible alternando el acordeón (estado impredecible)
  log('menú Cuentas Corrientes…')
  let itemRe = /Saldos y movimientos/i
  for (let intento = 0; intento < 4 && !(await esVisible(itemRe)); intento++) {
    await clickTexto(/^Cuentas Corrientes$/i); await sleep(2800)
  }
  let okCart = false
  if (await esVisible(itemRe)) okCart = await clickTexto(itemRe)
  else { itemRe = /Cartola|Movimientos/i; if (await esVisible(itemRe)) okCart = await clickTexto(itemRe) }
  log('clic Saldos y movimientos:', okCart)
  await sleep(12000)   // carga el iframe eob + auto-consulta la 1ª cuenta (rango por defecto)

  // localizar el iframe eob de la cartola
  const frameEob = () => page.frames().find((f) => /eob\.officebanking\.cl\/CTA\.UI\.Web\/saldoctacte/i.test(f.url()))

  // fijar el rango DESDE→HASTA (máx 90 días) y Consultar, por cada cuenta del selector
  const desdeCL = cl(desdeISO), hastaCL = cl(hastaISO)
  log('rango:', desdeCL, '→', hastaCL, '(tope 90 días del banco)')

  async function consultarRango(f) {
    // inputs de fecha: type=text o date; probamos varios selectores dentro del iframe
    const inputs = f.locator('input[type="date"], input[type="text"], input[placeholder*="/" i], input[class*="fecha" i]')
    const n = await inputs.count().catch(() => 0)
    if (n >= 2) {
      // los primeros dos suelen ser Desde/Hasta
      for (const [idx, val] of [[0, desdeISO], [1, hastaISO]]) {
        const el = inputs.nth(idx)
        const tipo = await el.getAttribute('type').catch(() => 'text')
        const v = tipo === 'date' ? val : cl(val)
        await el.click().catch(() => {})
        await el.fill('').catch(() => {})
        await el.fill(v).catch(() => {})
        await el.evaluate((e) => e.dispatchEvent(new Event('change', { bubbles: true }))).catch(() => {})
        await sleep(400)
      }
      const btn = f.locator('button:has-text("Consultar"), a:has-text("Consultar"), input[value*="onsult" i]').first()
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); log('  Consultar clickeado'); return true }
    }
    return false
  }

  let f = frameEob()
  if (f) { await consultarRango(f).catch(() => {}); await sleep(9000) }
  else log('  ⚠ no encontré el iframe eob (uso lo auto-cargado)')

  // ── (opcional) recorrer las demás cuentas del selector ──
  try {
    f = frameEob()
    if (f) {
      const sel = f.locator('select').first()
      const opts = await sel.locator('option').count().catch(() => 0)
      for (let i = 1; i < Math.min(opts, 4); i++) {
        await sel.selectOption({ index: i }).catch(() => {})
        await sleep(2000)
        const f2 = frameEob(); if (f2) { await consultarRango(f2).catch(() => {}); await sleep(8000) }
      }
    }
  } catch {}

  // consolidar
  const vistos = new Set()
  const movimientos = []
  for (const det of movsPorLote) {
    for (const m of normalizar(det, saldos?.[0]?.accountNumber || '')) {
      const k = m.nroMov + '|' + m.fecha + '|' + m.saldo
      if (!vistos.has(k)) { vistos.add(k); movimientos.push(m) }
    }
  }
  movimientos.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))

  const actualizado = new Date().toISOString()
  if (saldos) writeFileSync(join(DATA, 'saldos.json'), JSON.stringify({ actualizado, empresa: 'ANA CLARA SPA', cuentas: saldos }, null, 2))
  writeFileSync(join(DATA, 'movimientos.json'), JSON.stringify({ actualizado, desde: desdeISO, hasta: hastaISO, limite_banco_dias: 90, total: movimientos.length, movimientos }, null, 2))
  writeFileSync(join(DATA, 'estado.json'), JSON.stringify({ estado: 'ok', actualizado, empresa: 'ANA CLARA SPA', desde: desdeISO, hasta: hastaISO, saldos: saldos?.length || 0, movimientos: movimientos.length, url: page.url() }, null, 2))
  await page.screenshot({ path: join(DATA, 'fin-movimientos.png') }).catch(() => {})
  log(`captura: ${saldos?.length || 0} saldos, ${movimientos.length} movimientos`)
  console.log('RESULTADO:', JSON.stringify({ estado: 'ok', saldos: saldos?.length || 0, movimientos: movimientos.length, desde: desdeISO, hasta: hastaISO, muestra: movimientos.slice(0, 3) }))
  try { await ctx.storageState({ path: join(DIR, 'session.json') }) } catch {}
  await ctx.close()
}
main().catch((e) => { console.log('ERROR:', e.message); process.exit(1) })

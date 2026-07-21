// explorar-form-transf.mjs — SOLO LECTURA. Reusa la sesión viva y:
//  1) abre Transferencias → "A Tercero mismo Banco" → Creación y vuelca el FORM real
//     (inputs/selects/labels + screenshots + endpoints), sin llenar ni enviar NADA.
//  2) intenta llegar a la CARTOLA de movimientos (Cuentas Corrientes) y captura el JSON
//     interno + el HTML de la tabla, para descubrir de dónde salen los movimientos 2026.
// NO clickea firmar/autorizar/enviar. NO mueve plata.
import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
const { chromium } = patchright
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = '/Users/AIagenteia/nexus/conector-tek'
const PROFILE = join(DIR, 'chrome-profile')
const OUT = join(DIR, 'descubrimiento')
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log('·', ...a)
const PRIVADO = 'privado.officebanking.cl'

const netJson = []   // JSON del banco interceptado (url, status, keys, arrays)
function keysDe(body) {
  const arrays = []
  const walk = (o, path, d) => {
    if (!o || d > 6) return
    if (Array.isArray(o)) { if (o.length && typeof o[0] === 'object') arrays.push({ path, len: o.length, keys: Object.keys(o[0]).slice(0, 20) }); o.slice(0, 2).forEach((x, i) => walk(x, path + '[' + i + ']', d + 1)); return }
    if (typeof o === 'object') for (const k of Object.keys(o)) walk(o[k], path + '.' + k, d + 1)
  }
  walk(body, '', 0)
  return arrays
}

// clic real por texto (mouse hasta la caja) — humano-lite, sesión ya viva.
async function clickBox(page, box) {
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 14 }).catch(() => {})
  await sleep(180 + Math.random() * 280)
  await page.mouse.down(); await sleep(55 + Math.random() * 70); await page.mouse.up()
}
async function clickTexto(page, re, opts = {}) {
  const loc = page.getByText(re, { exact: !!opts.exact }).first()
  const box = await loc.boundingBox().catch(() => null)
  if (!box) return false
  await clickBox(page, box)
  return true
}
// Clic en la "Creación" (u opción) que pertenece a la COLUMNA de un header dado:
// busca la caja del header y la caja de `opcion` más cercana debajo y en su misma columna.
async function clickOpcionDeColumna(page, headerRe, opcionRe) {
  const heads = await page.getByText(headerRe, { exact: true }).all()
  let hbox = null
  for (const h of heads) { const b = await h.boundingBox().catch(() => null); if (b) { hbox = b; break } }
  if (!hbox) return false
  const ops = await page.getByText(opcionRe, { exact: true }).all()
  let best = null, bestDy = 1e9
  for (const o of ops) {
    const b = await o.boundingBox().catch(() => null); if (!b) continue
    const dx = Math.abs(b.x - hbox.x), dy = b.y - hbox.y
    if (dx < 140 && dy > 0 && dy < 120 && dy < bestDy) { best = b; bestDy = dy }
  }
  if (!best) return false
  await clickBox(page, best)
  return true
}

async function dumpForms(page, tag) {
  const forms = []
  for (const f of page.frames()) {
    const campos = await f.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 }
      const inputs = [...document.querySelectorAll('input,select,textarea')].filter(vis).map((el) => ({
        tag: el.tagName.toLowerCase(), type: el.type || '', id: el.id || '', name: el.name || '',
        placeholder: el.placeholder || '', maxlength: el.getAttribute('maxlength') || '',
        label: (el.labels?.[0]?.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 50),
        opciones: el.tagName === 'SELECT' ? [...el.options].map((o) => o.text).slice(0, 20) : undefined,
      }))
      const botones = [...document.querySelectorAll('button,a[role="button"],input[type="submit"],[class*="btn"]')].filter(vis).map((b) => (b.innerText || b.value || '').trim()).filter((t) => t && t.length < 40).slice(0, 40)
      const titulos = [...document.querySelectorAll('h1,h2,h3,legend,[class*="title"],[class*="titulo"]')].filter(vis).map((h) => (h.innerText || '').trim()).filter(Boolean).slice(0, 15)
      return { url: location.href, inputs, botones, titulos }
    }).catch(() => null)
    if (campos && (campos.inputs.length || campos.botones.length || campos.titulos.length)) forms.push(campos)
  }
  writeFileSync(join(OUT, `form-${tag}.json`), JSON.stringify({ cuando: new Date().toISOString(), url: page.url(), forms }, null, 2))
  await page.screenshot({ path: join(OUT, `${tag}.png`), fullPage: false }).catch(() => {})
  const nIn = forms.reduce((a, f) => a + f.inputs.length, 0)
  log(`  [${tag}] ${nIn} inputs, ${forms.length} frames con contenido`)
  return forms
}

async function main() {
  setTimeout(() => { console.log('RESULTADO:', JSON.stringify({ estado: 'hard_timeout' })); process.exit(2) }, 300_000).unref?.()
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false, channel: 'chrome', viewport: { width: 1360, height: 860 },
    locale: 'es-CL', timezoneId: 'America/Santiago',
  })
  ctx.on('response', async (r) => {
    try {
      const url = r.url()
      if (!/officebanking\.cl|santander\.cl/i.test(url)) return
      if (!/json/i.test(r.headers()['content-type'] || '')) return
      let body = null; try { body = JSON.parse(await r.text()) } catch { return }
      const u = new URL(url)
      const arrays = keysDe(body)
      netJson.push({ url: u.origin + u.pathname, status: r.status(), arrays })
    } catch {}
  })
  // capturar nuevas pestañas (algunas opciones abren target=_blank / legacy)
  let ultimaPage = null
  ctx.on('page', async (p) => { ultimaPage = p; try { await p.waitForLoadState('domcontentloaded', { timeout: 15000 }) } catch {} })
  const activa = () => ultimaPage && !ultimaPage.isClosed() ? ultimaPage : page
  const page = ctx.pages()[0] || await ctx.newPage()

  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  await sleep(6000)
  if (!page.url().includes(PRIVADO) || /\/login/i.test(page.url())) {
    console.log('RESULTADO:', JSON.stringify({ estado: 'sesion_expirada', url: page.url() })); await ctx.close(); return
  }
  // entrar a ANA CLARA si hay listado de empresas
  const t0 = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
  if (/listado de empresas|selecciona.*empresa/i.test(t0)) {
    const fila = page.locator('tr,[role="row"],[class*="row"],li').filter({ hasText: /ANA CLARA/i }).first()
    const entrar = fila.getByText(/entrar/i).first()
    await entrar.click({ timeout: 6000 }).catch(() => {})
    await sleep(8000)
  }
  log('dashboard, url:', page.url())
  await dumpForms(page, '00-dashboard')

  // ── (1) TRANSFERENCIAS → A Tercero mismo Banco → Creación (SOLO abrir el form) ──
  try {
    await clickTexto(page, /^Transferencias$/i)
    await sleep(3500)
    await page.screenshot({ path: join(OUT, '10-transf-menu.png') }).catch(() => {})
    // clic REAL en la "Creación" de la columna "A Tercero mismo Banco"
    const okBloque = await clickOpcionDeColumna(page, /^A Tercero mismo Banco$/i, /^Creaci[oó]n$/i)
    log('clic "A Tercero mismo Banco → Creación":', okBloque)
    await sleep(9000)
    await dumpForms(activa(), '11-form-tercero-mismo-banco')
  } catch (e) { log('transf falló:', e.message) }

  // ── (2) CARTOLA / MOVIMIENTOS (Cuentas Corrientes) — descubrir endpoint/tabla ──
  try {
    const pg = page  // volver al menú principal para la cartola
    await pg.bringToFront().catch(() => {})
    await clickTexto(pg, /^Cuentas Corrientes$/i)
    await sleep(3000)
    await pg.screenshot({ path: join(OUT, '20-ctacte-menu.png') }).catch(() => {})
    // clic REAL en "Saldos y movimientos" / cartola
    let okCart = await clickTexto(pg, /Saldos y movimientos/i)
    if (!okCart) okCart = await clickTexto(pg, /Cartola|Movimientos/i)
    log('clic cartola/movimientos:', okCart)
    await sleep(10000)
    const pc = activa()
    await pc.screenshot({ path: join(OUT, '21-cartola.png') }).catch(() => {})
    // volcar HTML de tablas visibles en todos los frames (por si movimientos vienen en HTML)
    const tablas = []
    for (const f of pc.frames()) {
      const info = await f.evaluate(() => {
        const ts = [...document.querySelectorAll('table')].filter((t) => t.getBoundingClientRect().height > 20)
        return ts.slice(0, 3).map((t) => ({ filas: t.querySelectorAll('tr').length, headers: [...t.querySelectorAll('th')].map((h) => (h.innerText || '').trim()).slice(0, 12), muestra: (t.querySelector('tbody tr')?.innerText || '').slice(0, 200) }))
      }).catch(() => [])
      if (info.length) tablas.push({ frame: f.url(), tablas: info })
    }
    writeFileSync(join(OUT, 'cartola-tablas.json'), JSON.stringify({ url: pc.url(), tablas }, null, 2))
    log('tablas en cartola:', tablas.reduce((a, x) => a + x.tablas.length, 0))
  } catch (e) { log('cartola falló:', e.message) }

  writeFileSync(join(OUT, 'net-json.json'), JSON.stringify(netJson, null, 2))
  console.log('RESULTADO:', JSON.stringify({ estado: 'ok', endpoints_json: netJson.length }))
  try { await ctx.storageState({ path: join(DIR, 'session.json') }) } catch {}
  await ctx.close()
}
main().catch((e) => { console.log('ERROR:', e.message); process.exit(1) })

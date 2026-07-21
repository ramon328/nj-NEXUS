// mapear-transf.mjs — SOLO LECTURA. Reusa la sesión viva (perfil persistente) y:
//  1) cierra el popup "Actualiza tu Clave" que tapa el dashboard,
//  2) entra Transferencias → "A Tercero mismo Banco" → Creación,
//  3) vuelca el FORM REAL (inputs/selects/labels/botones) + screenshots + endpoints JSON.
// NO llena, NO firma, NO envía. NO mueve plata.
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

const netJson = []
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

// Cierra el popup "Actualiza tu Clave / Protege la seguridad de tu empresa".
// Prueba: Escape, botón de cerrar (×/aria-label), y textos "más tarde/ahora no/omitir".
async function cerrarPopupClave(page) {
  for (let intento = 0; intento < 3; intento++) {
    let cerrado = false
    for (const p of [page, ...page.frames()]) {
      // ¿sigue el popup?
      const hay = await p.evaluate(() => /Actualiza tu Clave|Protege la seguridad/i.test(document.body?.innerText || '')).catch(() => false)
      if (!hay) continue
      // 1) botón de cerrar por texto
      for (const re of [/^m[aá]s tarde$/i, /^ahora no$/i, /^omitir$/i, /^recordar/i, /^cancelar$/i, /^cerrar$/i, /^continuar$/i, /^saltar$/i]) {
        const b = p.getByText(re, { exact: false }).first()
        const box = await b.boundingBox().catch(() => null)
        if (box) { await clickBox(page, box); cerrado = true; break }
      }
      if (cerrado) break
      // 2) icono × / aria-label close
      const x = p.locator('[aria-label*="cerrar" i],[aria-label*="close" i],button.close,[class*="close" i],[class*="cerrar" i]').first()
      const xb = await x.boundingBox().catch(() => null)
      if (xb) { await clickBox(page, xb); cerrado = true; break }
    }
    if (!cerrado) await page.keyboard.press('Escape').catch(() => {})
    await sleep(1500)
    const sigue = await page.evaluate(() => /Actualiza tu Clave|Protege la seguridad/i.test(document.body?.innerText || '')).catch(() => false)
    let sigueFrame = false
    for (const f of page.frames()) { const s = await f.evaluate(() => /Actualiza tu Clave|Protege la seguridad/i.test(document.body?.innerText || '')).catch(() => false); if (s) sigueFrame = true }
    if (!sigue && !sigueFrame) { log('popup de clave cerrado'); return true }
  }
  log('popup de clave: no se pudo cerrar (sigo igual)')
  return false
}

async function dumpForms(page, tag) {
  const forms = []
  for (const f of page.frames()) {
    const campos = await f.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 }
      const inputs = [...document.querySelectorAll('input,select,textarea')].filter(vis).map((el) => ({
        tag: el.tagName.toLowerCase(), type: el.type || '', id: el.id || '', name: el.name || '',
        placeholder: el.placeholder || '', maxlength: el.getAttribute('maxlength') || '',
        label: (el.labels?.[0]?.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 60),
        opciones: el.tagName === 'SELECT' ? [...el.options].map((o) => o.text).slice(0, 30) : undefined,
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
  return { forms, nIn }
}

async function main() {
  setTimeout(() => { console.log('RESULTADO:', JSON.stringify({ estado: 'hard_timeout' })); process.exit(2) }, 240_000).unref?.()
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
      netJson.push({ url: u.origin + u.pathname, status: r.status(), arrays: keysDe(body) })
    } catch {}
  })
  let ultimaPage = null
  ctx.on('page', async (p) => { ultimaPage = p; try { await p.waitForLoadState('domcontentloaded', { timeout: 15000 }) } catch {} })
  const activa = () => ultimaPage && !ultimaPage.isClosed() ? ultimaPage : page
  const page = ctx.pages()[0] || await ctx.newPage()

  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  await sleep(6000)
  if (!page.url().includes(PRIVADO) || /\/login/i.test(page.url())) {
    console.log('RESULTADO:', JSON.stringify({ estado: 'sesion_expirada', url: page.url() })); await ctx.close(); return
  }
  const t0 = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
  if (/listado de empresas|selecciona.*empresa/i.test(t0)) {
    const fila = page.locator('tr,[role="row"],[class*="row"],li').filter({ hasText: /ANA CLARA/i }).first()
    await fila.getByText(/entrar/i).first().click({ timeout: 6000 }).catch(() => {})
    await sleep(8000)
  }
  log('dashboard, url:', page.url())

  // (0) cerrar el popup de clave que tapa todo
  await cerrarPopupClave(page)
  await sleep(1500)
  await dumpForms(page, '00b-dashboard-limpio')

  // (1) TRANSFERENCIAS → A Tercero mismo Banco → Creación (solo abrir + volcar)
  let res = { estado: 'ok', inputs_form: 0 }
  try {
    const okMenu = await clickTexto(page, /^Transferencias$/i)
    log('clic Transferencias:', okMenu)
    await sleep(3500)
    await page.screenshot({ path: join(OUT, '10-transf-menu.png') }).catch(() => {})
    const okBloque = await clickOpcionDeColumna(page, /^A Tercero mismo Banco$/i, /^Creaci[oó]n$/i)
    log('clic "A Tercero mismo Banco → Creación":', okBloque)
    await sleep(9000)
    const d = await dumpForms(activa(), '11-form-tercero-mismo-banco')
    res.inputs_form = d.nIn
    // por si el form quedó en otra columna, probar también "A Otros Bancos" solo si no salió nada
    if (d.nIn === 0) {
      await page.bringToFront().catch(() => {})
      await clickTexto(page, /^Transferencias$/i); await sleep(3000)
      const ok2 = await clickOpcionDeColumna(page, /^A Otros Bancos$/i, /^Creaci[oó]n$/i)
      log('fallback "A Otros Bancos → Creación":', ok2)
      await sleep(9000)
      const d2 = await dumpForms(activa(), '12-form-otros-bancos')
      res.inputs_form = d2.nIn
    }
  } catch (e) { log('transf falló:', e.message); res.estado = 'error_transf'; res.msg = e.message }

  writeFileSync(join(OUT, 'net-json.json'), JSON.stringify(netJson, null, 2))
  console.log('RESULTADO:', JSON.stringify({ ...res, endpoints_json: netJson.length }))
  try { await ctx.storageState({ path: join(DIR, 'session.json') }) } catch {}
  await sleep(1200)
  await ctx.close()
}
main().catch((e) => { console.log('ERROR:', e.message); process.exit(1) })

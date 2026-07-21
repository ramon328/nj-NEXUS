// entrar-creacion.mjs — SOLO LECTURA. Reusa la sesión viva y entra a
// Transferencias → "A Tercero mismo Banco" → Creación por CLIC DE PIXEL (el mega-menú
// usa shadow DOM cerrado, invisible a los selectores). Vuelca el form real + screenshot
// + endpoints de red (para construir el envío después). NO llena, NO envía, NO mueve plata.
import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
const { chromium } = patchright
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = '/Users/AIagenteia/nexus/conector-tek'
const PROFILE = join(DIR, 'chrome-profile')
const OUT = join(DIR, 'data')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rnd = (a, b) => a + Math.random() * (b - a)
const log = (...a) => console.log('·', ...a)
const PRIVADO = 'privado.officebanking.cl'

const net = []
async function main() {
  setTimeout(() => { console.log('RESULTADO:', JSON.stringify({ estado: 'hard_timeout' })); process.exit(2) }, 120_000).unref?.()
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false, channel: 'chrome', viewport: { width: 1360, height: 860 },
    locale: 'es-CL', timezoneId: 'America/Santiago',
  })
  ctx.on('request', (r) => { const u = r.url(); if (/officebanking\.cl|santander\.cl/i.test(u) && r.method() !== 'OPTIONS') net.push({ m: r.method(), u: u.slice(0, 140) }) })
  const page = ctx.pages()[0] || await ctx.newPage()

  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  await sleep(6000)
  if (!page.url().includes(PRIVADO) || /\/login|error-seguridad|logout/i.test(page.url())) {
    console.log('RESULTADO:', JSON.stringify({ estado: 'sesion_expirada', url: page.url() })); await ctx.close(); return
  }
  log('dashboard OK:', page.url())

  // 1) abrir el menú Transferencias (clic real por texto, ya sabemos que engancha)
  const menu = page.getByText(/^transferencias?$/i).first()
  const mb = await menu.boundingBox().catch(() => null)
  if (mb) { await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2, { steps: 12 }); await sleep(rnd(200, 400)); await page.mouse.down(); await sleep(60); await page.mouse.up() }
  await sleep(4500)
  await page.screenshot({ path: join(OUT, 'creacion-00-menu.png') }).catch(() => {})

  // 2) clic de PIXEL en "Creación" de la columna "A Tercero mismo Banco"
  //    (posición fija del mega-menú a viewport 1360x860; ver data/transf-01-menu.png)
  const CX = 320, CY = 232
  await page.mouse.move(CX - 40, CY - 30, { steps: 10 }); await sleep(rnd(180, 320))
  await page.mouse.move(CX, CY, { steps: 8 }); await sleep(rnd(150, 300))
  await page.mouse.down(); await sleep(60); await page.mouse.up()
  log('clic pixel Creación (320,232)')
  await sleep(9000)
  await page.screenshot({ path: join(OUT, 'creacion-01-form.png'), fullPage: false }).catch(() => {})

  // 3) volcar inputs/botones de todos los frames
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
  writeFileSync(join(OUT, 'creacion-form.json'), JSON.stringify({ cuando: new Date().toISOString(), url: page.url(), forms }, null, 2))
  writeFileSync(join(OUT, 'creacion-net.json'), JSON.stringify(net.slice(-60), null, 2))
  const nIn = forms.reduce((a, f) => a + f.inputs.length, 0)

  // ── PASO 2 (TEK_AVANZAR=1): llenar monto+motivo y "Continuar" para MAPEAR el destino.
  //    NO envía ni crea nada: solo avanza el wizard a la pantalla de datos del destinatario.
  if (process.env.TEK_AVANZAR === '1') {
    const fr = page.frames().find((f) => /TEF\.UI\.Web/i.test(f.url()))
    if (fr) {
      const monto = String(process.env.TEK_MONTO || '1000')
      await fr.locator('#txtMonto').click().catch(() => {}); await sleep(rnd(300, 600))
      await fr.locator('#txtMonto').type(monto, { delay: rnd(90, 170) }).catch(() => {})
      await sleep(rnd(400, 900))
      await fr.locator('#mensaje-100').click().catch(() => {}); await sleep(rnd(200, 500))
      await fr.locator('#mensaje-100').type('Prueba tek', { delay: rnd(60, 130) }).catch(() => {})
      await sleep(rnd(400, 900))
      await page.screenshot({ path: join(OUT, 'creacion-01b-lleno.png') }).catch(() => {})
      const cont = fr.getByText(/^continuar$/i).first()
      const cb = await cont.boundingBox().catch(() => null)
      if (cb) { await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2, { steps: 12 }); await sleep(rnd(200, 450)); await page.mouse.down(); await sleep(60); await page.mouse.up(); log('Continuar clickeado') }
      else log('no encontré botón Continuar en el iframe')
      await sleep(9000)
      await page.screenshot({ path: join(OUT, 'creacion-02-destino.png') }).catch(() => {})
      const forms2 = []
      for (const f of page.frames()) {
        const c = await f.evaluate(() => {
          const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 }
          const inputs = [...document.querySelectorAll('input,select,textarea')].filter(vis).map((el) => ({ tag: el.tagName.toLowerCase(), type: el.type || '', id: el.id || '', name: el.name || '', placeholder: el.placeholder || '', maxlength: el.getAttribute('maxlength') || '', label: (el.labels?.[0]?.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 60), opciones: el.tagName === 'SELECT' ? [...el.options].map((o) => o.text).slice(0, 40) : undefined }))
          const botones = [...document.querySelectorAll('button,a[role="button"],input[type="submit"],[class*="btn"]')].filter(vis).map((b) => (b.innerText || b.value || '').trim()).filter((t) => t && t.length < 40).slice(0, 40)
          const titulos = [...document.querySelectorAll('h1,h2,h3,legend,[class*="title"],[class*="titulo"]')].filter(vis).map((h) => (h.innerText || '').trim()).filter(Boolean).slice(0, 15)
          return { url: location.href, inputs, botones, titulos }
        }).catch(() => null)
        if (c && (c.inputs.length || c.botones.length || c.titulos.length)) forms2.push(c)
      }
      writeFileSync(join(OUT, 'creacion-destino.json'), JSON.stringify({ cuando: new Date().toISOString(), url: page.url(), forms: forms2 }, null, 2))
      log('paso 2 (destino) mapeado:', forms2.reduce((a, f) => a + f.inputs.length, 0), 'inputs')
    }
  }

  console.log('RESULTADO:', JSON.stringify({ estado: 'ok', inputs: nIn, url: page.url() }))
  try { await ctx.storageState({ path: join(DIR, 'session.json') }) } catch {}
  await sleep(800)
  await ctx.close()
}
main().catch((e) => { console.log('ERROR:', e.message); process.exit(1) })

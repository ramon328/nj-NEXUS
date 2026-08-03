// RECON — SIN CREDENCIALES. Sale por el túnel SOCKS (Claro móvil), llega hasta la
// pantalla de login del banco, caza endpoints y detecta el muro device_trust.
// NO escribe nada en el banco, NO pone clave, perfil temporal (no toca sesión de Ramón).
import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
import { rmSync, writeFileSync } from 'node:fs'
const { chromium } = patchright

const PROXY = process.env.TEK_PROXY_URL || 'socks5://127.0.0.1:1080'
const PROFILE = '/tmp/tek-recon-' + process.pid
const LANDING = 'https://empresas.officebanking.cl/'
const DT_RE = /revisa tu conexi[oó]n|reinicia tu wifi|no te permitir[aá] ingresar/i

const endpoints = {}
const dtText = []
const log = (...a) => console.log('[recon]', ...a)

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome',
  proxy: { server: PROXY },
  viewport: { width: 1360, height: 860 }, locale: 'es-CL', timezoneId: 'America/Santiago',
})
const page = ctx.pages()[0] || await ctx.newPage()

page.on('response', (resp) => {
  try {
    const url = resp.url()
    if (!/officebanking\.cl|santander\.cl|biocatch|recaptcha|google\.com\/recaptcha/i.test(url)) return
    const u = new URL(url)
    const clave = `${resp.request().method()} ${u.host}${u.pathname}`
    if (!endpoints[clave]) endpoints[clave] = { url: u.href.slice(0, 200), status: resp.status(), ct: (resp.headers()['content-type'] || '').split(';')[0], hits: 0 }
    endpoints[clave].hits++
  } catch { /* */ }
})

let estado = 'sin_determinar'
try {
  log('salida por', PROXY)
  await page.goto(LANDING, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(e => log('goto:', e.message))
  // warmup humano: mover mouse, esperar el redirect/iframe de wslogin
  for (const [x, y] of [[300, 300], [700, 400], [500, 600], [900, 500]]) { await page.mouse.move(x, y, { steps: 6 }); await page.waitForTimeout(400) }
  await page.waitForTimeout(6000)
  // recolecta texto de todos los frames para ver device_trust y/o el form
  for (const f of page.frames()) {
    try { const t = await f.evaluate(() => document.body ? document.body.innerText : ''); if (DT_RE.test(t)) dtText.push(f.url().slice(0, 80)) } catch { /* */ }
  }
  const urls = page.frames().map(f => f.url())
  const hayFormHost = urls.some(u => /wslogin\.officebanking\.cl/i.test(u))
  const hayLoginInput = await page.locator('#office-banking-login, #doLoginButton, input[type=password]').count().catch(() => 0)
  const enPrivado = /privado\.officebanking\.cl/i.test(page.url())
  await page.screenshot({ path: '/tmp/recon-claro.png' }).catch(() => {})

  if (dtText.length) estado = 'device_trust'
  else if (enPrivado) estado = 'sesion_viva_o_paso'
  else if (hayLoginInput > 0) estado = 'LLEGO_AL_FORM'
  else if (hayFormHost) estado = 'iframe_wslogin_presente_sin_input'
  else estado = 'no_llego_al_form'

  log('URL final:', page.url())
  log('frames:', JSON.stringify(urls.map(u => u.replace(/https:\/\//, '')).slice(0, 8)))
  log('device_trust visible:', dtText.length ? 'SÍ en ' + dtText.join(',') : 'NO')
  log('input de login presente:', hayLoginInput)
} catch (e) { estado = 'error'; log('ERR', e.message) }

writeFileSync('/tmp/recon-endpoints.json', JSON.stringify(endpoints, null, 2))
log('RESULTADO', JSON.stringify({ estado, endpoints_cazados: Object.keys(endpoints).length }))
console.log('\n=== ENDPOINTS CAZADOS ===')
for (const [k, v] of Object.entries(endpoints)) console.log(`${v.status}  ${k}  (${v.ct})`)
await ctx.close().catch(() => {})
try { rmSync(PROFILE, { recursive: true, force: true }) } catch { /* */ }
process.exit(0)

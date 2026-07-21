// descubrir.mjs — SOLO LECTURA. Comprueba si la sesión guardada del banco sigue
// viva y, si lo está, entra a la CARTOLA (portal-fob dest=TRNCART_CON) y captura
// los endpoints internos + cuerpos JSON que sirven los MOVIMIENTOS, para poder
// construir la API encima. No firma ni transfiere nada.
import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
const { chromium } = patchright
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = '/Users/AIagenteia/nexus/conector-tek'
const PROFILE = join(DIR, 'chrome-profile')
const OUT = join(DIR, 'descubrimiento')
mkdirSync(OUT, { recursive: true })
const HOME = 'https://privado.officebanking.cl/dashboard'
const CARTOLA = 'https://privado.officebanking.cl/portal-fob?type=EOB&dest=TRNCART_CON'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log('·', ...a)

const capturas = []   // { url, method, status, ctype, sample }
const DATOS_RE = /consolidado|cartola|movimiento|estado.?cuenta|cuenta|saldo|account|cash_mgt|transacc/i

async function main() {
  setTimeout(() => { console.log('RESULTADO:', JSON.stringify({ estado: 'hard_timeout' })); process.exit(2) }, 120_000).unref?.()
  const headless = process.env.TEK_HEADLESS !== '0'   // por defecto headless (silencioso)
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless, channel: 'chrome',
    viewport: { width: 1360, height: 860 }, locale: 'es-CL', timezoneId: 'America/Santiago',
  })
  const page = ctx.pages()[0] || await ctx.newPage()

  ctx.on('response', async (r) => {
    try {
      const req = r.request()
      const url = r.url()
      const ct = (r.headers()['content-type'] || '')
      if (!/officebanking\.cl|santander\.cl/i.test(url)) return
      if (!/json/i.test(ct)) return
      const u = new URL(url)
      if (!DATOS_RE.test(u.pathname + u.search)) return
      let sample = null
      try { const t = await r.text(); sample = t.slice(0, 4000) } catch {}
      capturas.push({ method: req.method(), url: u.origin + u.pathname, search: u.search, status: r.status(), ctype: ct, sample })
      log(`  ↯ ${req.method()} ${u.origin}${u.pathname} [${r.status()}]`)
    } catch {}
  })

  const fin = async (estado, extra = {}) => {
    writeFileSync(join(OUT, 'capturas.json'), JSON.stringify({ estado, cuando: new Date().toISOString?.() || null, capturas }, null, 2))
    try { await page.screenshot({ path: join(OUT, `fin-${estado}.png`) }) } catch {}
    console.log('RESULTADO:', JSON.stringify({ estado, url: page.url(), n_capturas: capturas.length, ...extra }))
    try { await ctx.close() } catch {}
  }

  log('voy al home privado…')
  await page.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch((e) => log('goto:', e.message))
  await sleep(6000)
  const url = page.url()
  const bounced = /login|empresas\.officebanking|wslogin|seleccion-empresa/i.test(url) ||
    /ingresa|iniciar sesi|clave|usuario/i.test((await page.evaluate(() => document.body?.innerText?.slice(0, 400) || '').catch(() => '')))
  if (bounced) return fin('sesion_expirada', { nota: 'la sesión guardada ya no sirve; hace falta login asistido (Superclave por VNC)', url_landing: url })

  log('sesión viva → abro la cartola…')
  await page.goto(CARTOLA, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch((e) => log('goto cartola:', e.message))
  await sleep(9000)
  // intento asentar y disparar la consulta por defecto de la cartola
  await page.evaluate(() => window.scrollBy(0, 300)).catch(() => {})
  await sleep(6000)
  return fin('capturado')
}
main().catch((e) => { console.log('ERROR:', e.message); process.exit(1) })

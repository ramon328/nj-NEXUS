// fetch-santander.mjs — EXTRACTOR SOLO LECTURA de Santander Empresa (ANA CLARA).
// Requiere una sesión VIVA en el perfil chrome-profile (correr login-humano antes).
// Entra al home, captura SALDOS (account_summary) y abre la CARTOLA por cada cuenta
// para traer los MOVIMIENTOS desde DESDE (por defecto 2026-01-01) hasta hoy.
// Intercepta el JSON interno del banco y lo normaliza. NO firma ni transfiere.
//
// Salida: data/saldos.json, data/movimientos.json, data/estado.json, data/raw-*.json
// Env: TEK_DESDE=YYYY-MM-DD (default 2026-01-01), TEK_HEADLESS=1|0 (default 1)
import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
const { chromium } = patchright
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = '/Users/AIagenteia/nexus/conector-tek'
const PROFILE = join(DIR, 'chrome-profile')
const DATA = join(DIR, 'data')
mkdirSync(DATA, { recursive: true })
const HOME = 'https://privado.officebanking.cl/dashboard'
const CARTOLA = 'https://privado.officebanking.cl/portal-fob?type=EOB&dest=TRNCART_CON'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log('·', ...a)
const hoy = () => new Date().toISOString().slice(0, 10)
const DESDE = process.env.TEK_DESDE || '2026-01-01'

// heurísticas para reconocer datos en el JSON interceptado
const looksMonto = (v) => typeof v === 'number' || /^-?[\d.,]+$/.test(String(v || ''))
const KEYS_MOV = /fecha|glosa|descrip|detalle|monto|cargo|abono|saldo|movim|referen|documento|serie/i
const KEYS_SALDO = /saldo|disponible|cuenta|numero|producto|moneda|cta/i
const DEVICE_RE = /revisa tu conexi[oó]n|reinicia tu wifi|no te permitir[aá] ingresar|tardando en cargar/i
async function bloqueado(page) { try { return DEVICE_RE.test(await page.evaluate(() => document.body?.innerText || '')) } catch { return false } }

const raw = []            // toda captura JSON del banco (para depurar/refinar)
function guardarRaw(tag, url, status, body) { raw.push({ tag, url, status, body }) }

// Busca recursivamente el primer array de "objetos-fila" que matchee un set de keys.
function encontrarFilas(obj, keyRe, prof = 0) {
  if (!obj || prof > 8) return null
  if (Array.isArray(obj)) {
    if (obj.length && typeof obj[0] === 'object' && obj[0] &&
        Object.keys(obj[0]).some((k) => keyRe.test(k))) return obj
    for (const it of obj) { const r = encontrarFilas(it, keyRe, prof + 1); if (r) return r }
    return null
  }
  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) { const r = encontrarFilas(obj[k], keyRe, prof + 1); if (r) return r }
  }
  return null
}

async function main() {
  setTimeout(() => { console.log('RESULTADO:', JSON.stringify({ estado: 'hard_timeout' })); process.exit(2) }, 180_000).unref?.()
  // HEADFUL por defecto: headless dispara el bloqueo Incapsula/BioCatch del banco.
  const headless = process.env.TEK_HEADLESS === '1'
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless, channel: 'chrome',
    viewport: { width: 1360, height: 860 }, locale: 'es-CL', timezoneId: 'America/Santiago',
  })
  const page = ctx.pages()[0] || await ctx.newPage()

  let saldosFilas = null, movsFilas = null
  ctx.on('response', async (r) => {
    try {
      const url = r.url()
      if (!/officebanking\.cl|santander\.cl/i.test(url)) return
      if (!/json/i.test(r.headers()['content-type'] || '')) return
      const u = new URL(url)
      if (!/consolidado|cartola|movim|estado.?cuenta|cuenta|saldo|account|cash_mgt|transacc|summary/i.test(u.pathname + u.search)) return
      let body = null; try { body = JSON.parse(await r.text()) } catch { return }
      guardarRaw(u.pathname, u.origin + u.pathname + u.search, r.status(), body)
      const fs = encontrarFilas(body, KEYS_MOV); if (fs && !movsFilas) { movsFilas = fs; log(`  ↯ movimientos (${fs.length}) ${u.pathname}`) }
      const sl = encontrarFilas(body, KEYS_SALDO); if (sl && !saldosFilas) { saldosFilas = sl; log(`  ↯ saldos (${sl.length}) ${u.pathname}`) }
    } catch {}
  })

  const fin = async (estado, extra = {}) => {
    writeFileSync(join(DATA, 'raw-capturas.json'), JSON.stringify(raw, null, 2))
    const meta = { estado, actualizado: new Date().toISOString(), desde: DESDE, hasta: hoy(), url: page.url(), ...extra }
    writeFileSync(join(DATA, 'estado.json'), JSON.stringify(meta, null, 2))
    if (saldosFilas) writeFileSync(join(DATA, 'saldos.json'), JSON.stringify({ actualizado: meta.actualizado, cuentas: saldosFilas }, null, 2))
    if (movsFilas) writeFileSync(join(DATA, 'movimientos.json'), JSON.stringify({ actualizado: meta.actualizado, desde: DESDE, hasta: hoy(), movimientos: movsFilas }, null, 2))
    try { await page.screenshot({ path: join(DATA, `fin-${estado}.png`) }) } catch {}
    console.log('RESULTADO:', JSON.stringify({ estado, saldos: saldosFilas?.length || 0, movimientos: movsFilas?.length || 0, ...extra }))
    try { await ctx.close() } catch {}
  }

  // 1) HOME → dispara account_summary (saldos)
  log('home privado…')
  await page.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch((e) => log('goto:', e.message))
  await sleep(7000)
  // sesión REALMENTE muerta = login / error-seguridad / wslogin
  if (/\/login|error-seguridad|wslogin\.|empresas\.officebanking/i.test(page.url()))
    return fin('sesion_expirada', { nota: 'no hay sesión viva; correr login-humano.mjs primero' })
  if (await bloqueado(page)) return fin('bloqueado', { nota: 'Incapsula/BioCatch flageó la conexión (correr headful, no headless)' })

  // 1b) SELECCIÓN DE EMPRESA → entrar a ANA CLARA (logueado pero falta elegir empresa)
  const objetivo = process.env.TEK_EMPRESA || 'ANA CLARA'
  const bodyTxt = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
  if (/seleccion-empresa|listado de empresas|selecciona.*empresa/i.test(page.url() + ' ' + bodyTxt)) {
    log(`selección de empresa → entro a "${objetivo}"…`)
    await page.evaluate((obj) => {
      const entrars = [...document.querySelectorAll('a,button,[role="button"],span,div')].filter((el) => {
        const t = (el.innerText || '').trim(); return /^entrar/i.test(t) && t.length < 14
      })
      for (const el of entrars) { let n = el; for (let i = 0; i < 7 && n; i++) { if (new RegExp(obj, 'i').test(n.innerText || '')) { el.click(); return } n = n.parentElement } }
    }, objetivo).catch(() => {})
    await sleep(9000)
    log('empresa activa, url:', page.url())
  }

  // 2) CARTOLA → movimientos. Intento fijar el rango de fechas y consultar.
  log('cartola…')
  await page.goto(CARTOLA, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch((e) => log('goto cartola:', e.message))
  await sleep(9000)
  // La cartola legacy (COPE/Knockout) suele traer inputs de fecha dd/mm/aaaa.
  const [dd1, mm1, yy1] = DESDE.split('-').reverse().join('/').length ? [DESDE.slice(8, 10), DESDE.slice(5, 7), DESDE.slice(0, 4)] : []
  const desdeCL = `${DESDE.slice(8, 10)}/${DESDE.slice(5, 7)}/${DESDE.slice(0, 4)}`
  const hastaCL = `${hoy().slice(8, 10)}/${hoy().slice(5, 7)}/${hoy().slice(0, 4)}`
  try {
    for (const f of page.frames()) {
      const fechas = f.locator('input[type="text"], input[class*="fecha" i], input[placeholder*="/" i]')
      const n = await fechas.count().catch(() => 0)
      if (n >= 2) {
        await fechas.nth(0).fill(desdeCL).catch(() => {})
        await fechas.nth(1).fill(hastaCL).catch(() => {})
        const btn = f.locator('button:has-text("Consultar"), button:has-text("Buscar"), input[value*="onsult" i]').first()
        if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); log('  consulté cartola', desdeCL, '→', hastaCL) }
        break
      }
    }
  } catch (e) { log('driving fechas falló:', e.message) }
  await sleep(9000)
  return fin('ok')
}
main().catch((e) => { console.log('ERROR:', e.message); process.exit(1) })

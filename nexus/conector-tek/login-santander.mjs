// login-santander.mjs — Login a Santander EMPRESA (Office Banking) para `tek`,
// portando la lógica PROBADA de rail (rail-api/src/banks/santander/empresa/session.ts)
// pero manejando el navegador OBSCURA por CDP (en vez de Patchright + Chrome real).
//
// Flujo (idéntico a rail): empresas.officebanking.cl → warmup anti-BioCatch →
// abrir el form (Ingresar/modal) → auto-fill RUT+clave char-by-char con jitter →
// clic "Aceptar" (#doLoginButton) → esperar aterrizar en privado.officebanking.cl.
// El reCAPTCHA es invisible (se auto-resuelve con buen score); el MFA/Superclave,
// si aparece, lo resuelve Ramón (headful equivalente: reportamos y paramos).
//
// ⚠️ Esto SOLO loguea y lee estado. NO navega a transferencias ni paga. Pruebas.
//
// Requiere: obscura serve --stealth --port 9222 --user-agent "<macOS Chrome UA>"
//           corriendo, y Playwright (el de ~/nexus/conector-navegador/node_modules).
// Chrome REAL vía Patchright (fork anti-CDP que usa rail para evadir Akamai/Incapsula/
// BioCatch). Chrome-for-Testing lo flaguean; el Chrome instalado (channel:'chrome') no.
import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
const { chromium } = patchright
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = '/Users/AIagenteia/nexus/conector-tek'
const SHOTS = join(DIR, 'shots')
const CDP = process.env.TEK_CDP || 'http://127.0.0.1:9222'
const LANDING_URL = 'https://empresas.officebanking.cl/'
const PRIVADO_HOST = 'privado.officebanking.cl'
const INTERSTITIAL_STALL_MS = 45_000
// OJO: sobre texto VISIBLE (innerText), no textContent — la SPA tiene el componente
// "fuera de línea" oculto en el DOM y matcheaba en falso. Frase específica del banco.
const DEVICE_TRUST_TEXT_RE = /revisa tu conexi[oó]n a internet|reinicia tu wifi|no te permitir[aá] ingresar a tu sitio privado/i

mkdirSync(SHOTS, { recursive: true })
const log = (...a) => console.log('·', ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rnd = (a, b) => a + Math.random() * (b - a)

async function humanType(page, text) {
  for (const ch of text) { await page.keyboard.type(ch); await sleep(60 + Math.random() * 140) }
}
async function firstVisible(page, sels) {
  for (const f of page.frames()) for (const s of sels) {
    const l = f.locator(s).first()
    if (await l.isVisible().catch(() => false)) return l
  }
  return null
}
// Device-trust REAL = el texto "reinicia tu wifi / revisa tu conexión" está VISIBLE
// (getByText+isVisible), no oculto en el DOM de la SPA. Así no da falso positivo.
async function hasDeviceTrust(page) {
  for (const re of [/revisa tu conexi[oó]n a internet/i, /reinicia tu wifi/i, /no te permitir[aá] ingresar a tu sitio privado/i]) {
    for (const f of page.frames()) {
      const el = f.getByText(re).first()
      if (await el.isVisible().catch(() => false)) return true
    }
  }
  return false
}
// Abre el modal de login (selector EXACTO de rail: app-login-button > button.button-action-default-icon).
async function tryOpenModal(page) {
  const sels = ['app-login-button > button.button-action-default-icon', 'app-login-button button', 'button.button-action-default-icon', 'app-login-button']
  for (const s of sels) {
    const l = page.locator(s).first()
    if (await l.isVisible().catch(() => false)) { await l.click({ timeout: 2500, force: true }).catch(() => {}); return true }
  }
  const ing = page.getByRole('button', { name: /ingresar/i }).first()
  if (await ing.isVisible().catch(() => false)) { await ing.click({ timeout: 2500, force: true }).catch(() => {}); return true }
  return false
}
async function autofill(page, rut, password, shot) {
  // Form real (rail): iframe de wslogin.officebanking.cl → #office-banking-login.
  const rutSel = ['#office-banking-login #username', '#username', 'input[name="username" i]']
  const passSel = ['#office-banking-login #password', '#password', 'input[type="password"]']
  const deadline = Date.now() + 60_000
  let abrió = false
  while (Date.now() < deadline) {
    // (NO abortamos por device-trust acá: el componente offline vive oculto en la SPA
    //  y daba falso positivo. El form vive en el iframe wslogin.officebanking.cl.)
    const passLoc = await firstVisible(page, passSel)
    const rutLoc = await firstVisible(page, rutSel)
    if (passLoc && rutLoc) {
      await page.mouse.move(280 + Math.random() * 240, 260 + Math.random() * 220, { steps: 12 }).catch(() => {})
      await sleep(rnd(350, 850))
      await rutLoc.click(); await rutLoc.fill('').catch(() => {}); await humanType(page, rut)
      await sleep(rnd(450, 1150))
      await passLoc.click(); await humanType(page, password)
      return { filled: true }
    }
    const opened = await tryOpenModal(page)   // click "Ingresar" → abre iframe wslogin
    if (opened && !abrió) { abrió = true; await sleep(3500); await shot('02a-modal.png') }
    // el iframe de wslogin tarda en montar
    await page.waitForTimeout(1800).catch(() => {})
  }
  return { filled: false, deviceTrust: await hasDeviceTrust(page) }
}
async function clickAceptar(page) {
  const sels = ['#doLoginButton', '#office-banking-login button[type="submit"]', 'button[type="submit"]', 'button:has-text("Aceptar")', 'button:has-text("Ingresar")']
  for (const f of page.frames()) for (const s of sels) {
    const l = f.locator(s).first()
    if (await l.isVisible().catch(() => false)) {
      await sleep(rnd(500, 1300))
      await l.click({ timeout: 5000 }).catch(async () => { await l.click({ force: true, timeout: 5000 }).catch(() => {}) })
      return true
    }
  }
  return false
}

async function main() {
  // Guard anti-cuelgue: pase lo que pase, el proceso muere a los 5 min.
  setTimeout(() => { console.log('RESULTADO:', JSON.stringify({ estado: 'hard_timeout' })); process.exit(2) }, 300_000).unref?.()
  const { rut, password } = JSON.parse(readFileSync(join(DIR, '.creds.json'), 'utf8'))
  const headless = process.env.TEK_HEADLESS !== '0'   // default headless; TEK_HEADLESS=0 → headful
  const useProfile = process.env.TEK_PROFILE === '1'  // usar el PERFIL REAL de Chrome (con Alison + dispositivo confiado)
  let ctx, page
  if (useProfile) {
    const userDataDir = join(process.env.HOME, 'Library/Application Support/Google/Chrome')
    ctx = await chromium.launchPersistentContext(userDataDir, {
      headless, channel: 'chrome',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      viewport: { width: 1280, height: 800 }, locale: 'es-CL', timezoneId: 'America/Santiago',
    })
    page = ctx.pages()[0] || await ctx.newPage()
  } else {
    const b = await chromium.launch({ headless, channel: 'chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] })
    ctx = await b.newContext({ locale: 'es-CL', timezoneId: 'America/Santiago', viewport: { width: 1280, height: 800 } })
    page = await ctx.newPage()
  }
  const cerrarBrowser = async () => { try { await ctx.close() } catch { /* */ } }
  const shot = (n) => page.screenshot({ path: join(SHOTS, n) }).catch(() => {})

  await page.goto(LANDING_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch((e) => log('goto landing:', e.message))
  await sleep(6000)   // la SPA Angular hidrata tras DOMContentLoaded
  // Warmup para BioCatch/Akamai antes de tocar el form (igual que rail).
  await page.mouse.move(400, 300, { steps: 15 }).catch(() => {})
  await page.mouse.wheel(0, 280).catch(() => {})
  await sleep(rnd(900, 2200))
  await page.mouse.move(600, 420, { steps: 10 }).catch(() => {})
  await shot('01-landing.png')

  const af = await autofill(page, rut, password, shot)
  await shot('02-form.png')
  if (af.deviceTrust) { console.log('RESULTADO:', JSON.stringify({ estado: 'device_trust', nota: 'Santander flageó la conexión/dispositivo (página fuera de línea). Es transitorio.' })); await cerrarBrowser(); return }
  if (!af.filled) { console.log('RESULTADO:', JSON.stringify({ estado: 'sin_form', nota: 'No apareció el formulario de login (ver shots/02-form.png).' })); await cerrarBrowser(); return }
  log('credenciales tipeadas')
  const clicked = await clickAceptar(page)
  log('Aceptar clickeado:', clicked)
  await sleep(8000)
  await shot('03-tras-aceptar.png')

  // Esperar el HOME de privado (login OK) vs /login (interstitial device-trust) vs MFA.
  const deadline = Date.now() + 90_000
  let privadoLoginSince = null
  while (Date.now() < deadline) {
    if (page.isClosed()) break
    if (await hasDeviceTrust(page)) { await shot('99-device-trust.png'); console.log('RESULTADO:', JSON.stringify({ estado: 'device_trust', url: page.url() })); await cerrarBrowser(); return }
    let onHome = false, onPrivadoLogin = false
    try { const u = new URL(page.url()); const priv = u.host.includes(PRIVADO_HOST); onHome = priv && !u.pathname.startsWith('/login'); onPrivadoLogin = priv && u.pathname.startsWith('/login') } catch {}
    if (onHome) { await sleep(1500); await shot('10-home.png'); console.log('RESULTADO:', JSON.stringify({ estado: 'logueado', url: page.url().split('?')[0] })); await cerrarBrowser(); return }
    // ¿Pide MFA/Superclave/coordenadas? escanear texto
    let texto = ''
    for (const f of page.frames()) texto += (await f.locator('body').innerText().catch(() => '') || '').slice(0, 500) + ' '
    texto = texto.replace(/\s+/g, ' ')
    if (/superclave|clave din[aá]mica|coordenada|tarjeta de coordenad|token|clave sms|c[oó]digo de seguridad|segundo factor/i.test(texto)) {
      await shot('20-mfa.png')
      console.log('RESULTADO:', JSON.stringify({ estado: 'pide_mfa', pista: texto.slice(0, 300), url: page.url() }))
      await cerrarBrowser(); return
    }
    if (/clave.*incorrect|usuario.*incorrect|datos.*inv[aá]lid|no coincide|bloquead/i.test(texto)) {
      await shot('21-error-cred.png')
      console.log('RESULTADO:', JSON.stringify({ estado: 'error_credenciales', pista: texto.slice(0, 200) }))
      await cerrarBrowser(); return
    }
    if (onPrivadoLogin) { privadoLoginSince ??= Date.now(); if (Date.now() - privadoLoginSince >= INTERSTITIAL_STALL_MS) { await shot('99-interstitial.png'); console.log('RESULTADO:', JSON.stringify({ estado: 'device_trust', nota: 'pegado en /login del host privado' })); await cerrarBrowser(); return } }
    else privadoLoginSince = null
    await sleep(1200)
  }
  await shot('30-timeout.png')
  console.log('RESULTADO:', JSON.stringify({ estado: 'timeout', url: page.url(), nota: 'no llegó al home ni pidió MFA claro; ver shots/30-timeout.png' }))
  await cerrarBrowser()
}
main().catch((e) => { console.log('ERROR:', e.message); process.exit(1) })

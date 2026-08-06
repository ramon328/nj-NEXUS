// login-humano.mjs — Login Santander Empresa con comportamiento HUMANO al máximo,
// para intentar pasar Incapsula + BioCatch. Perfil de Chrome PROPIO de tek que
// persiste (acumula cookies de confianza), Chrome real vía Patchright.
//
// ★★★ REGLA DE ORO DEL BANCO (verificado 04-ago-2026 en producción) ★★★
//   TODO clic en el banco tiene que ser un CLIC REAL: el mouse VIAJA hasta el elemento
//   (curva humana + overshoot + temblor) y recién ahí down→up. NUNCA teleport-click
//   (loc.click() directo), NUNCA el.click() por DOM, NUNCA dispatchEvent en botones.
//   BioCatch puntúa el MOVIMIENTO, no solo el clic — un clic sin viaje del mouse es la
//   huella de bot. Esa es LA CLAVE por la que el login automático pasó. Usar SIEMPRE
//   clickHumano()/moveToLoc()+clickReal(); el .click() crudo solo como último fallback.
//   (Los .click() de FOCO de campos de texto son tolerables; los de BOTONES, jamás.)
//
// Humanización: mouse Bézier con ease-in-out + overshoot + micro-jitter + drift de
// "lectura"; tecleo con dwell (down→up), pausas irregulares y algún typo+corrección;
// warmup (mover, scrollear, hover) antes de tocar el form; espera a que la red asiente
// antes de "Aceptar". Guarda la sesión (storageState) al entrar para reusarla.
//
// Modos (env):
//   TEK_ASSIST=1  → llena el form pero NO clickea Aceptar: espera a que un humano
//                   (por VNC) haga el clic + Superclave. Ideal para la 1ª vez: pasa
//                   BioCatch (sos vos) y deja la CONFIANZA sembrada en el perfil.
//   TEK_HEADLESS=1→ headless (por defecto HEADFUL, mucho mejor para BioCatch).
//   TEK_PROFILE_REAL=1 → usa tu perfil Default de Chrome (Alison) en vez del de tek.
//
// ⚠️ SOLO loguea/lee estado y guarda la sesión. NO transfiere.
import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
const { chromium } = patchright
import { readFileSync, mkdirSync, writeFileSync, unlinkSync, existsSync, cpSync, rmSync, chmodSync } from 'node:fs'
import { spawn, execFile } from 'node:child_process'
import { join } from 'node:path'
import { obtener as obtenerCreds } from '/Users/AIagenteia/nexus/conector-tek/credenciales.mjs'
import { crearCandado } from '/Users/AIagenteia/nexus/conector-tek/candado.mjs'
import { registrarIncidente } from '/Users/AIagenteia/nexus/conector-tek/incidente.mjs'

const DIR = '/Users/AIagenteia/nexus/conector-tek'
const DATA = join(DIR, 'data')
const SHOTS = join(DIR, 'shots')
const PROFILE_TEK = join(DIR, 'chrome-profile')     // perfil propio de tek (persiste)
const SESSION_FILE = join(DIR, 'session.json')
mkdirSync(SHOTS, { recursive: true })
mkdirSync(PROFILE_TEK, { recursive: true })
const LANDING = 'https://empresas.officebanking.cl/'
const PRIVADO = 'privado.officebanking.cl'
// PIN one-shot de la URL /vnc: al TERMINAR este login (éxito o timeout, como sea que salga),
// vaciar el archivo del PIN → la URL pública queda inútil hasta el próximo pedido. Atado a la
// vida del proceso de login, no a un timer frágil.
if (process.env.TEK_OTP_FILE) { process.on('exit', () => { try { writeFileSync(process.env.TEK_OTP_FILE, '') } catch { /* */ } }) }
const log = (...a) => console.log('·', ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rnd = (a, b) => a + Math.random() * (b - a)
const ri = (a, b) => Math.floor(rnd(a, b))
const chance = (p) => Math.random() < p

// ── CANDADO de sesión (safeguard): evita DOS navegadores sobre el MISMO perfil
//    (lo corrompe) y evita re-loguear en paralelo (gatilla el antifraude). Si ya hay
//    una sesión de banco activa, ESPERAMOS a que termine en vez de abrir otra.
// Lock POR PERSONA: la sesión es por persona (session-<user>.json), así que el lock también.
// Antes era global (session.lock) → una operación de Nico bloqueaba una de Ramón aunque usan
// sesiones/navegadores distintos ("banco ocupado" / sesión activa no usada). Ahora cada persona
// tiene su propio lock y corren en paralelo. TEK_USER ya está seteado por quien nos invoca.
// El protocolo vive en candado.mjs para que TODOS los scripts que abren el navegador usen
// el mismo archivo; tenerlo acá adentro dejaba a los demás sin forma de excluirse.
const candado = crearCandado({ log: (m) => log(m) })
const adquirirLock = (esperaMs) => candado.adquirir(esperaMs)
const soltarLock = () => candado.soltar()

// Posición virtual del mouse (Playwright no la expone; la trackeamos).
let mx = 680, my = 430
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

// Un tramo de curva Bézier cúbica con ease-in-out + micro-jitter + velocidad variable.
// Realismo (04-ago): el paso de tiempo es log-normal (no uniforme, que es huella de bot),
// el temblor escala con la lentitud (más tembloroso al desacelerar cerca del objetivo), y en
// tramos largos hay alguna micro-pausa a mitad de camino (el humano no viaja de un tirón).
async function curve(page, x1, y1) {
  const x0 = mx, y0 = my
  const dist = Math.hypot(x1 - x0, y1 - y0)
  const jitter = Math.min(3.2, dist / 110)
  const cx1 = x0 + (x1 - x0) * rnd(0.2, 0.45) + rnd(-70, 70)
  const cy1 = y0 + (y1 - y0) * rnd(0.2, 0.45) + rnd(-70, 70)
  const cx2 = x0 + (x1 - x0) * rnd(0.55, 0.85) + rnd(-70, 70)
  const cy2 = y0 + (y1 - y0) * rnd(0.55, 0.85) + rnd(-70, 70)
  const steps = Math.max(18, Math.min(70, Math.round(dist / rnd(9, 16)) + ri(10, 22)))
  const pausaEn = dist > 260 && chance(0.5) ? ri(Math.round(steps * 0.35), Math.round(steps * 0.6)) : -1
  for (let i = 1; i <= steps; i++) {
    const t = easeInOut(i / steps)
    const mt = 1 - t
    // el temblor crece al frenar (fase final): la mano corrige fino cerca del blanco
    const tr = jitter * (0.5 + (1 - Math.min(i, steps - i) / steps) * 0.9)
    const bx = mt * mt * mt * x0 + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * x1 + rnd(-tr, tr)
    const by = mt * mt * mt * y0 + 3 * mt * mt * t * cy1 + 3 * mt * t * t * cy2 + t * t * t * y1 + rnd(-tr, tr)
    await page.mouse.move(bx, by).catch(() => {})
    const edge = Math.min(i, steps - i) / steps
    // paso de tiempo tipo log-normal: la mayoría cortos, algunos largos (no uniforme = humano)
    const base = Math.exp(rnd(1.4, 2.5)) / 6
    await sleep(base + (1 - edge) * rnd(2, 9))
    if (i === pausaEn) await sleep(rnd(60, 180))   // duda a mitad de camino
  }
  mx = x1; my = y1
}
// Mover con overshoot + corrección (humano sobrepasa el objetivo y corrige). En objetivos
// lejanos casi siempre hay overshoot; en cercanos, a veces.
async function moveTo(page, x, y) {
  const dist = Math.hypot(x - mx, y - my)
  const pOver = dist > 200 ? 0.75 : 0.45
  if (chance(pOver)) {
    const k = Math.min(30, 8 + dist / 20)
    await curve(page, x + rnd(-k, k), y + rnd(-k * 0.7, k * 0.7)); await sleep(rnd(40, 130)); await curve(page, x, y)
  } else await curve(page, x, y)
}
async function moveToLoc(page, loc) {
  // Si el botón está fuera de vista, primero lo traemos (si no, no hay caja y cae a click crudo).
  try { await loc.scrollIntoViewIfNeeded({ timeout: 2500 }) } catch { /* */ }
  const box = await loc.boundingBox().catch(() => null)
  if (!box) return false
  // Apuntamos a un punto interior con sesgo al centro (no siempre al mismo píxel = humano).
  await moveTo(page, box.x + box.width * rnd(0.32, 0.68), box.y + box.height * rnd(0.34, 0.66))
  await sleep(rnd(90, 280))
  return true
}
// Clic real con settle previo: micro-ajuste antes de apretar (la mano se asienta), down→up
// con dwell variable, y de vez en cuando un temblor mínimo bajo el dedo.
async function clickReal(page) {
  if (chance(0.7)) { await page.mouse.move(mx + rnd(-1.5, 1.5), my + rnd(-1.5, 1.5)).catch(() => {}); await sleep(rnd(30, 90)) }
  await page.mouse.down()
  await sleep(rnd(45, 130))
  await page.mouse.up()
}
// Micro-drift del mouse mientras "lee".
async function idle(page, ms) { const end = Date.now() + ms; while (Date.now() < end) { await page.mouse.move(mx + rnd(-5, 5), my + rnd(-4, 4)).catch(() => {}); await sleep(rnd(220, 620)) } }
// Pulso DENTRO del mismo navegador (misma pestaña del form). Resetea el idle del banco
// sin abrir otro Chrome ni relogin — eso es lo que el corazón NO puede hacer mientras el
// candado está tomado por la transferencia. Nunca navega: no saca del formulario.
async function pulsoSesion(page, ms) {
  const end = Date.now() + Math.max(0, ms)
  while (Date.now() < end) {
    const queda = end - Date.now()
    if (queda <= 0) break
    await idle(page, Math.min(1800, queda))
    if (Date.now() >= end) break
    await sleep(Math.min(1200, end - Date.now()))
  }
}
// CLICK HUMANO sobre un locator: mueve el mouse con curva hasta el elemento, hover breve
// y clic real (down→up). Si no consigue la caja, cae a un click normal. Devuelve bool.
// ★ ESTA es la forma canónica de clickear en el banco (ver REGLA DE ORO arriba): el mouse
//   VIAJA al botón y hace clic real. Todo botón sensible (Aceptar, Crear, Continuar,
//   Confirmar, Superclave) DEBE pasar por acá — nunca por loc.click() directo.
async function clickHumano(page, loc) {
  try {
    if (await moveToLoc(page, loc)) { await sleep(rnd(140, 380)); await clickReal(page); return true }
  } catch {}
  return await loc.click({ timeout: 4000 }).then(() => true).catch(() => false)
}
// Scroll suave (rueda) como lectura humana.
async function scrollHumano(page, dy) { const pasos = ri(3, 6); for (let i = 0; i < pasos; i++) { await page.mouse.wheel(0, dy / pasos + rnd(-20, 20)).catch(() => {}); await sleep(rnd(180, 460)) } }
// Tipeo humano dentro de un input localizado (clic real + dwell + pausas).
async function typeHumano(page, loc, texto) {
  if (!(await clickHumano(page, loc))) { await loc.fill(texto).catch(() => {}); return }
  await sleep(rnd(150, 380))
  try { await loc.fill('') } catch {}
  await humanType(page, texto)
}

// TECLEO REAL en un campo del formulario (pedido de Ramón 06-ago): mouse que VIAJA al campo +
// clic real + teclas isTrusted (como el humano), NUNCA `.value=` por JS (eso lo marca BioCatch).
// Clickea el campo ANTES de teclear para que el foco sea el correcto (así no se descuadran los
// campos, que fue por lo que antes se cayó a JS-injection). Verifica el valor y reintenta; si la
// máscara igual se lo come, cae a JS-injection como ÚLTIMO recurso (para no dejar el campo vacío
// y frenar la operación). Devuelve true si el campo quedó con el valor.
async function tipearReal(page, loc, valTxt, label = 'campo') {
  if (valTxt == null || valTxt === '') return true
  const val = String(valTxt)
  const norm = (s) => String(s || '').replace(/\s/g, '')
  const normNum = (s) => String(s || '').replace(/[^0-9kK]/gi, '')
  if (!(await loc.count().catch(() => 0))) { log('tipearReal: no vi ' + label); return false }
  for (let intento = 1; intento <= 2; intento++) {
    if (!(await moveToLoc(page, loc).catch(() => false))) { await loc.click().catch(() => {}) }
    else { await sleep(rnd(120, 300)); await clickReal(page).catch(() => {}) }
    await sleep(rnd(150, 320))
    await page.keyboard.press('Meta+A').catch(() => {}); await page.keyboard.press('Backspace').catch(() => {})
    await sleep(rnd(120, 260))
    await humanType(page, val)
    await sleep(rnd(220, 480))
    const got = await loc.inputValue().catch(() => '')
    if (norm(got) === norm(val) || (normNum(val) && normNum(got) === normNum(val))) { log(label + ' tecleado ✓'); return true }
    log(`${label}: quedó "${got}" ≠ "${val}" → reintento tecleo (${intento})`)
  }
  // Último recurso: setter nativo + eventos (NO deja el campo vacío). Se registra para auditar.
  const ok = await loc.evaluate((el, value) => {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value') && Object.getOwnPropertyDescriptor(proto, 'value').set
    el.focus(); setter ? setter.call(el, value) : (el.value = value)
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('blur', { bubbles: true }))
    return el.value === value
  }, val).catch(() => false)
  log(label + ': tecleo no cuajó → fallback JS ' + (ok ? 'ok' : 'falló'))
  return ok
}

// Tecleo con dwell (down→up), pausas irregulares y algún typo+backspace.
async function humanType(page, text) {
  // Tecleo con teclas REALES (isTrusted vía keyboard.press — NUNCA .value/inyección) para que
  // BioCatch lo vea como humano. Modelamos DWELL (keydown→keyup) + FLIGHT (gap entre teclas) con
  // distribución variable y un "ritmo" por-sesión (cada login teclea a distinta velocidad → no la
  // MISMA huella siempre). Dígitos algo más rápidos, repetir tecla más lento, ráfagas y pausas.
  const speed = rnd(0.8, 1.35)          // <1 rápido, >1 lento (varía por sesión)
  let prev = ''
  for (const ch of text) {
    if (chance(0.03)) { // typo + corrección (tecla vecina, luego backspace)
      await page.keyboard.press('asdfghjkl'[ri(0, 8)], { delay: ri(45, 95) }).catch(() => {}); await sleep(rnd(140, 320)); await page.keyboard.press('Backspace').catch(() => {}); await sleep(rnd(90, 210))
    }
    const dwell = Math.round(ri(48, 120) * speed)   // cuánto mantiene apretada la tecla
    await page.keyboard.press(ch, { delay: dwell }).catch(async () => { await page.keyboard.type(ch).catch(() => {}) })
    let flight = rnd(55, 165) * speed               // gap hasta la próxima tecla
    if (ch === prev) flight *= 1.25                 // repetir la misma tecla = más lento
    if (/\d/.test(ch)) flight *= 0.9                // dígitos (RUT) un pelín más rápidos
    await sleep(Math.round(flight))
    if (chance(0.08)) await sleep(rnd(280, 820))         // pausa de "pensar"
    else if (chance(0.10)) await sleep(rnd(20, 60))      // micro-ráfaga (tecleo rápido)
    prev = ch
  }
}

// Verifica que un campo quedó con el valor esperado (las máscaras se comen teclas).
// Compara solo dígitos/dv; si no coincide, limpia y re-tipea limpio (hasta 3 veces).
async function ensureValue(page, loc, expected, label = 'campo') {
  const norm = (s) => (s || '').replace(/[^0-9kK]/gi, '')
  const objetivo = norm(expected)
  for (let intento = 1; intento <= 3; intento++) {
    const val = norm(await loc.inputValue().catch(() => ''))
    if (val === objetivo) return true
    log(`⚠ ${label}: quedó "${val}" ≠ "${objetivo}" → recorrijo (intento ${intento})`)
    await loc.click().catch(() => {})
    await page.keyboard.press('Meta+A').catch(() => {}); await page.keyboard.press('Backspace').catch(() => {})
    await sleep(rnd(200, 420))
    for (const ch of objetivo.split('')) { await page.keyboard.press(ch, { delay: ri(60, 130) }).catch(() => {}); await sleep(rnd(70, 150)) }
    await sleep(rnd(300, 600))
  }
  // Último recurso: si el tecleo carácter-a-carácter sigue comiéndose un dígito (máscara
  // agresiva), lo seteo con fill() y disparo los eventos input/change para que el form lo tome.
  // El RUT no es lo que puntúa BioCatch (eso es el mouse/Aceptar); mejor un RUT correcto por
  // fill que un login rechazado por "datos inválidos" (que además dispara falsos avisos de clave).
  if (norm(await loc.inputValue().catch(() => '')) !== objetivo) {
    try {
      await loc.click().catch(() => {})
      await page.keyboard.press('Meta+A').catch(() => {}); await page.keyboard.press('Backspace').catch(() => {})
      await loc.fill(objetivo).catch(() => {})
      await loc.evaluate((el) => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur && el.blur() }).catch(() => {})
      await sleep(rnd(300, 600))
    } catch { /* */ }
  }
  const ok = norm(await loc.inputValue().catch(() => '')) === objetivo
  if (!ok) log(`✗ ${label}: no pude dejarlo correcto`)
  return ok
}

async function firstVisible(page, sels) {
  for (const f of page.frames()) for (const s of sels) {
    const l = f.locator(s).first()
    if (await l.isVisible().catch(() => false)) return l
  }
  return null
}
async function textoVisible(page, re) {
  for (const f of page.frames()) { const el = f.getByText(re).first(); if (await el.isVisible().catch(() => false)) return true }
  return false
}
const DEVICE_RE = /revisa tu conexi[oó]n|reinicia tu wifi|no te permitir[aá] ingresar/i
const MFA_RE = /superclave|clave din[aá]mica|coordenada|tarjeta de coordenad|c[oó]digo de seguridad|segundo factor/i
// La sesión se CAYÓ/finalizó (expiró, o el banco la botó) — pantalla "SU SESIÓN HA FINALIZADO"
// o URL de logout/login. Se usa para CORTAR flujos (transferencia/masiva) que si no se cuelgan
// esperando una confirmación que nunca llega. Devuelve estado claro "no se creó nada".
const SESION_FIN_RE = /sesi[oó]n ha finalizado|volver a ingresar a la p[aá]gina|debe volver a ingresar/i
async function sesionCaida(page) {
  try { if (/error-seguridad|\/logout|\/login(?!-)/i.test(page.url())) return true } catch { /* */ }
  return await textoVisible(page, SESION_FIN_RE)
}

// ── HIGIENE DE COOKIES ANTI-BOT (Incapsula/Imperva) ──────────────────────────────────────
// Tras rebotar por bot, las cookies de reputación (_abck/bm_*) quedan con MAL score y el
// perfil llega "fichado". Las borramos ANTES de un login fresco → Incapsula mintea unas
// nuevas y NEUTRAS al cargar la página (corriendo su JS en el navegador real). Se conservan
// las cookies de SESIÓN y device-trust del banco (NO tocamos las de officebanking auth).
const ANTIBOT_COOKIE_RE = /^(_abck|bm_sv|bm_mi|bm_s|bm_sz|ak_bmsc|_px|_pxvid|_pxhd|incap_ses|visid_incap|nlbi_|reese84|TS[0-9a-f]{6,})/i
async function limpiarCookiesAntibot(ctx, log) {
  try {
    const todas = await ctx.cookies()
    const quemadas = todas.filter((c) => ANTIBOT_COOKIE_RE.test(c.name))
    if (!quemadas.length) { log('higiene: sin cookies antibot que limpiar'); return 0 }
    for (const c of quemadas) { try { await ctx.clearCookies({ name: c.name, domain: c.domain }) } catch { /* */ } }
    const nombres = [...new Set(quemadas.map((c) => c.name))].slice(0, 8).join(', ')
    log(`higiene: limpiadas ${quemadas.length} cookies antibot (${nombres}) — device-trust y sesión intactos`)
    return quemadas.length
  } catch (e) { log('higiene cookies falló:', e.message); return 0 }
}

// ── THROTTLE DE LOGIN (anti-quemado de cuenta) ────────────────────────────────────────────
// Santander marca la CUENTA tras ~7 logins en poco rato. Este es el ÚNICO lugar por donde pasan
// los logins reales → ningún llamador (API, tools, un bug, o un humano dale-que-dale) puede
// pasarse. Persiste el historial por usuario y REHÚSA loguear si: hubo device_trust reciente
// (cooldown), pasó muy poco del último login (gap mínimo), o ya hubo demasiados en la última hora.
const LOGIN_MAX_HORA = Number(process.env.TEK_LOGIN_MAX_HORA || 4)          // tope de logins/hora por cuenta
const LOGIN_MIN_GAP_MS = Number(process.env.TEK_LOGIN_MIN_GAP_MS || 8 * 60_000)   // gap mínimo entre logins
const LOGIN_DT_COOLDOWN_MS = Number(process.env.TEK_LOGIN_DT_COOLDOWN_MS || 25 * 60_000) // tras device_trust
function histLoginPath(slug) { return join(DATA, `login-hist-${slug}.json`) }
function leerHistLogin(slug) { try { return JSON.parse(readFileSync(histLoginPath(slug), 'utf8')) } catch { return { logins: [], device_trust: [] } } }
function guardarHistLogin(slug, h) { try { writeFileSync(histLoginPath(slug), JSON.stringify(h)) } catch { /* */ } }
function registrarDeviceTrust(slug) {
  const h = leerHistLogin(slug)
  h.device_trust = (h.device_trust || []).filter((t) => Date.now() - t < 6 * 3600_000)
  h.device_trust.push(Date.now()); guardarHistLogin(slug, h)
}
// null = se puede loguear (y REGISTRA el intento). {motivo, esperaMin} = NO loguear.
function chequearThrottleLogin(slug) {
  const now = Date.now(); const h = leerHistLogin(slug)
  h.logins = (h.logins || []).filter((t) => now - t < 3600_000)
  const dt = (h.device_trust || []).filter((t) => now - t < LOGIN_DT_COOLDOWN_MS)
  if (dt.length) return { motivo: 'cooldown_device_trust', esperaMin: Math.ceil((LOGIN_DT_COOLDOWN_MS - (now - Math.max(...dt))) / 60000) }
  if (h.logins.length && now - Math.max(...h.logins) < LOGIN_MIN_GAP_MS) return { motivo: 'gap_minimo', esperaMin: Math.ceil((LOGIN_MIN_GAP_MS - (now - Math.max(...h.logins))) / 60000) }
  if (h.logins.length >= LOGIN_MAX_HORA) return { motivo: 'max_por_hora', esperaMin: Math.ceil((3600_000 - (now - Math.min(...h.logins))) / 60000) }
  h.logins.push(now); guardarHistLogin(slug, h); return null
}
const ERR_RE = /clave.*incorrect|usuario.*incorrect|datos.*inv[aá]lid|no coincide|bloquead|revisa los datos/i

// ── MAPEO (TEK_MAPEAR=1): captura API interna + menú + bundles, SOLO LECTURA ──
const MAPA = join(DIR, 'mapa-banco')
const _api = new Map(), _bundles = new Set()
// acciones que mueven plata / firman → NUNCA se clickean
const PELIGRO = /transferir|transferencia|pagar|pago\b|firmar|firma|autoriz|aprob|n[oó]mina|masiv|abonar|rescatar|invertir|eliminar|crear|nuevo\b/i
const SEGURO = /saldo|cuenta|cartola|movimiento|posici[oó]n|resumen|inicio|producto|tarjeta|cr[eé]dito|dep[oó]sito|l[ií]nea|comprobante|hist[oó]r|consulta|detalle/i
function regNet(method, url, status) {
  try {
    const u = new URL(url)
    if (/\.(png|jpe?g|svg|css|woff2?|gif|ico|map)(\?|$)/i.test(u.pathname)) return
    if (/\.js(\?|$)/i.test(u.pathname)) { _bundles.add(u.origin + u.pathname); return }
    // ignorar puro tracking
    if (/doubleclick|google-?anal|googletagmanager|dynatrace|\.fls\.|hotjar|facebook|\.g\.doubleclick/i.test(u.host)) return
    const key = `${method} ${u.host}${u.pathname.replace(/\/[0-9a-f-]{6,}/gi, '/{id}').replace(/\/\d{3,}/g, '/{n}')}`
    const e = _api.get(key) || { n: 0, statuses: new Set() }
    e.n++; if (status) e.statuses.add(status); _api.set(key, e)
  } catch {}
}
async function mapear(page, log, shot) {
  const { writeFileSync, mkdirSync } = await import('node:fs')
  mkdirSync(join(MAPA, 'shots'), { recursive: true })
  const msnap = (n) => page.screenshot({ path: join(MAPA, 'shots', n) }).catch(() => {})
  log('MAPEO: dejo asentar…'); await sleep(8000); await msnap('00-seleccion.png')

  // ── PASO 1: si estamos en "Listado de Empresas", ENTRAR a ANA CLARA ──
  const objetivo = process.env.TEK_EMPRESA || 'ANA CLARA'
  if (/seleccion-empresa|listado de empresas/i.test(page.url() + ' ' + (await page.evaluate(() => document.body.innerText).catch(() => '')))) {
    log(`selección de empresa detectada → entro a "${objetivo}"…`)
    const clicked = await page.evaluate((obj) => {
      const entrars = [...document.querySelectorAll('a,button,[role="button"],span,div')].filter((el) => {
        const t = (el.innerText || '').trim(); return /^entrar/i.test(t) && t.length < 14
      })
      for (const el of entrars) {
        let n = el
        for (let i = 0; i < 7 && n; i++) { if (new RegExp(obj, 'i').test(n.innerText || '')) { el.click(); return true } n = n.parentElement }
      }
      return false
    }, objetivo).catch(() => false)
    log(clicked ? '  clic en Entrar (ANA CLARA) ✓ — cargando banco…' : '  ⚠ no encontré el Entrar de ' + objetivo)
    await sleep(9000); await msnap('01-dashboard.png')
  }

  const empresa = await page.evaluate(() => {
    const t = document.body.innerText || ''
    const m = t.match(/(ANA CLARA[^\n]{0,30})/i) || t.match(/(77\.?271\.?121)/)
    return m ? m[1].trim() : null
  }).catch(() => null)
  log('empresa activa:', empresa || '(?)', '| url:', page.url())

  // menú: clickables con texto (incluye componentes Angular)
  const menu = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 }
    const out = [], seen = new Set()
    const sel = 'a,button,[role="menuitem"],[role="tab"],[class*="menu"] *[class*="item"],li[class*="nav"],[class*="sidebar"] a,[class*="option"]'
    for (const el of document.querySelectorAll(sel)) {
      const t = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ')
      if (t && t.length >= 2 && t.length < 55 && vis(el) && !seen.has(t)) { seen.add(t); out.push({ texto: t, href: el.getAttribute?.('href') || '' }) }
    }
    return out
  }).catch(() => [])
  log(`menú: ${menu.length} ítems`)

  // visitar SOLO secciones de lectura para descubrir su API
  const seguras = menu.filter((i) => SEGURO.test(i.texto) && !PELIGRO.test(i.texto)).slice(0, 16)
  const visitadas = []
  for (const it of seguras) {
    try {
      const antes = _api.size
      const loc = page.getByText(it.texto, { exact: true }).first()
      if (!(await loc.isVisible().catch(() => false))) continue
      await loc.click({ timeout: 6000 }).catch(() => {}); await sleep(4500)
      visitadas.push({ seccion: it.texto, nuevas: _api.size - antes, url: page.url() })
      log(`  ✓ ${it.texto} (+${_api.size - antes})`)
      await msnap('sec-' + it.texto.replace(/[^a-z0-9]/gi, '_').slice(0, 28) + '.png')
    } catch (e) { log(`  ✗ ${it.texto}`) }
  }

  const endpoints = [...(_api.entries())].map(([k, v]) => ({ endpoint: k, veces: v.n, status: [...v.statuses] })).sort((a, b) => a.endpoint.localeCompare(b.endpoint))
  const porHost = {}; for (const e of endpoints) { const h = e.endpoint.split(' ')[1].split('/')[0]; (porHost[h] ||= []).push(e.endpoint) }
  writeFileSync(join(MAPA, 'mapa-banco.json'), JSON.stringify({
    empresa, url_final: page.url(),
    resumen: { endpoints: endpoints.length, hosts: Object.keys(porHost), bundles: _bundles.size, menu: menu.length, visitadas: visitadas.length },
    menu, secciones_visitadas: visitadas, endpoints, por_host: porHost, bundles: [..._bundles],
  }, null, 2))
  log(`MAPA guardado: ${endpoints.length} endpoints, ${_bundles.size} bundles, empresa=${empresa}`)
  return { endpoints: endpoints.length, hosts: Object.keys(porHost), menu: menu.length, visitadas: visitadas.length, empresa }
}

// ── CAPTURA DE DATA (TEK_CAPTURAR=1): en la MISMA sesión viva, entra a ANA CLARA,
// abre la cartola y saca saldos + movimientos desde TEK_DESDE (default 2026-01-01).
// Reabrir el navegador en otro proceso hace que Incapsula flagee → por eso va acá.
const KEYS_MOV = /fecha|glosa|descrip|detalle|monto|cargo|abono|saldo|movim|referen|documento|serie|date|amount|transaction|movement|debit|credit/i
const KEYS_SALDO = /saldo|disponible|cuenta|numero|producto|moneda|cta|account|balance|money|credit/i
function encontrarFilas(obj, keyRe, prof = 0) {
  if (!obj || prof > 8) return null
  if (Array.isArray(obj)) {
    if (obj.length && typeof obj[0] === 'object' && obj[0] && Object.keys(obj[0]).some((k) => keyRe.test(k))) return obj
    for (const it of obj) { const r = encontrarFilas(it, keyRe, prof + 1); if (r) return r }
    return null
  }
  if (typeof obj === 'object') { for (const k of Object.keys(obj)) { const r = encontrarFilas(obj[k], keyRe, prof + 1); if (r) return r } }
  return null
}
// normaliza una fila cruda de ObtenerMovimientos.Result.Detalle
const _numMov = (v) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : Math.abs(n) }
function _normFechaMov(s) {
  const t = String(s || '')
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = t.match(/(\d{2})[/-](\d{2})[/-](\d{4})/); if (m) return `${m[3]}-${m[2]}-${m[1]}`
  m = t.match(/(\d{2})[/-](\d{2})[/-](\d{2})\b/); if (m) return `20${m[3]}-${m[2]}-${m[1]}`
  return ''
}
function _normMov(r, cuenta) {
  const monto = _numMov(r.Monto ?? r.Importe)
  const esCargo = r.EsCargo === true || r.EsCargo === 'true' || r.EsCargo === 1
  const esAbono = r.EsAbono === true || r.EsAbono === 'true' || r.EsAbono === 1
  return {
    fecha: _normFechaMov(r.FechaContableMovimiento || r.FechaContable),
    descripcion: String(r.Descripcion || r.DetalleMovimiento || '').trim(),
    cargo: esCargo ? monto : 0, abono: esAbono ? monto : 0,
    saldo: _numMov(r.NuevoSaldo), documento: String(r.NroDocumento || '').trim(),
    sucursal: String(r.GlosaSucursal || r.Sucursal || '').trim(),
    nroMov: String(r.NroMovimiento || '').trim(), cuenta,
  }
}
async function capturarData(ctx, page, log) {
  mkdirSync(DATA, { recursive: true })
  // el banco online solo entrega ~90 días → no pedir más atrás que hoy-88
  const pedido = process.env.TEK_DESDE || '2026-01-01'
  const hoyD = new Date(), iso = (d) => d.toISOString().slice(0, 10)
  const min90 = iso(new Date(hoyD.getTime() - 88 * 864e5))
  const DESDE = pedido > min90 ? pedido : min90
  const hoy = iso(hoyD)
  const objetivo = process.env.TEK_EMPRESA || 'ANA CLARA'
  const raw = []; let saldosFilas = null; const lotesMov = []
  const onResp = async (r) => {
    try {
      const url = r.url()
      if (/ObtenerMovimientos/i.test(url)) {
        const b = JSON.parse(await r.text()); const det = b?.Result?.Detalle || b?.Detalle || []
        if (Array.isArray(det) && det.length) { lotesMov.push(det); raw.push({ url, n: det.length }); log(`  ↯ ObtenerMovimientos: ${det.length} filas`) }
        return
      }
      if (/account_summary/i.test(url)) {
        const b = JSON.parse(await r.text())
        if (b?.listCustAccount && !saldosFilas) { saldosFilas = b.listCustAccount; log(`  ↯ saldos (${saldosFilas.length})`) }
      }
    } catch {}
  }
  ctx.on('response', onResp)
  // 1) DASHBOARD → entrar a la empresa correcta (dispara account_summary = saldos)
  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  await sleep(8000)
  await entrarEmpresa(page, log, objetivo)
  const empresaActiva = await page.evaluate(() => {
    const m = (document.body?.innerText || '').match(/Empresa:\s*([^\n]+)/i); return m ? m[1].trim() : ''
  }).catch(() => '')
  log('empresa activa:', empresaActiva || '(?)')
  if (!/portal-fob|dashboard/i.test(page.url())) { await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {}) }
  await sleep(rnd(4000, 6000)); await idle(page, rnd(1000, 2200))
  // 2) CARTOLA por MENÚ (el goto directo NO inicializa el iframe SPA): Cuentas Corrientes
  //    → Saldos y movimientos. El acordeón tiene estado impredecible → alterno hasta ver el ítem.
  const esVisible = async (re) => page.getByText(re).first().isVisible().catch(() => false)
  let itemRe = /Saldos y movimientos/i
  for (let i = 0; i < 4 && !(await esVisible(itemRe)); i++) { await clickHumano(page, page.getByText(/^Cuentas Corrientes$/i).first()); await sleep(rnd(2400, 3200)) }
  if (!(await esVisible(itemRe))) itemRe = /Cartola|Movimientos/i
  const okCart = (await esVisible(itemRe)) ? await clickHumano(page, page.getByText(itemRe).first()) : false
  log('clic Saldos y movimientos:', okCart)
  await sleep(rnd(11000, 13_000))   // carga iframe eob + auto-consulta 1ª cuenta
  // 3) fijar rango y Consultar dentro del iframe eob de la cartola.
  //    Consultamos MES A MES dentro de la ventana de 90 días: la cartola tiende a
  //    paginar/limitar por rango, así que un rango mensual devuelve más filas que uno
  //    de 90 días de una sola vez. El acumulador anual junta todo sin perder nada.
  const eob = () => page.frames().find((f) => /eob\.officebanking\.cl\/CTA\.UI\.Web\/saldoctacte/i.test(f.url()))
  const mesesRango = (desde, hasta) => {
    const out = []; let [y, m] = desde.split('-').map(Number)
    const [hy, hm] = hasta.split('-').map(Number)
    let guardia = 0
    while ((y < hy || (y === hy && m <= hm)) && guardia++ < 24) {
      const pad = (n) => String(n).padStart(2, '0')
      const d = `${y}-${pad(m)}-01`
      const finMes = new Date(y, m, 0).getDate()
      const h = `${y}-${pad(m)}-${pad(finMes)}`
      out.push({ d: d < desde ? desde : d, h: h > hasta ? hasta : h })
      m++; if (m > 12) { m = 1; y++ }
    }
    return out.reverse()   // de más reciente a más viejo
  }
  const consultar = async (f, d, h) => {
    const fechas = f.locator('input[type="date"], input[type="text"], input[placeholder*="/" i], input[class*="fecha" i]')
    if ((await fechas.count().catch(() => 0)) < 2) return false
    for (const [idx, val] of [[0, d], [1, h]]) {
      const el = fechas.nth(idx); const tipo = await el.getAttribute('type').catch(() => 'text')
      const v = tipo === 'date' ? val : `${val.slice(8, 10)}/${val.slice(5, 7)}/${val.slice(0, 4)}`
      await el.click().catch(() => {}); await el.fill('').catch(() => {}); await el.fill(v).catch(() => {})
      await el.evaluate((e) => e.dispatchEvent(new Event('change', { bubbles: true }))).catch(() => {}); await sleep(400)
    }
    const btn = f.locator('button:has-text("Consultar"), a:has-text("Consultar"), input[value*="onsult" i]').first()
    if (await btn.isVisible().catch(() => false)) { await clickHumano(page, btn); log('consulté cartola', d, '→', h); return true }
    return false
  }
  const meses = mesesRango(DESDE, hoy)
  log(`consultaré ${meses.length} tramos mensuales (${DESDE}→${hoy})`)
  let f = eob()
  if (f) { for (const mm of meses) { await consultar(f, mm.d, mm.h).catch(() => {}); await sleep(rnd(6000, 8000)); f = eob() || f } }
  else log('  ⚠ sin iframe eob (uso lo auto-cargado)')
  // 4) recorrer las demás cuentas del selector (si hay), mes a mes también
  try {
    f = eob()
    if (f) { const sel = f.locator('select').first(); const nop = await sel.locator('option').count().catch(() => 0)
      for (let i = 1; i < Math.min(nop, 4); i++) {
        await sel.selectOption({ index: i }).catch(() => {}); await sleep(2000)
        for (const mm of meses) { const f2 = eob(); if (f2) { await consultar(f2, mm.d, mm.h).catch(() => {}); await sleep(rnd(5000, 7000)) } }
      } }
  } catch {}
  ctx.off('response', onResp)
  // consolidar movimientos (dedup por nroMov+fecha+saldo)
  const vistos = new Set(); const movs = []
  for (const det of lotesMov) for (const m of det.map((x) => _normMov(x, saldosFilas?.[0]?.accountNumber || ''))) {
    const k = m.nroMov + '|' + m.fecha + '|' + m.saldo; if (!vistos.has(k)) { vistos.add(k); movs.push(m) }
  }
  movs.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
  const actualizado = new Date().toISOString()
  // ── ACUMULADOR ANUAL: fusiona esta captura en cartola-anual.json (nunca pierde lo
  //    ya capturado) y guarda los últimos 50 movimientos CRUDOS. Ver almacen.mjs.
  //    IMPORTANTE: solo acumulamos si la captura trajo algo, para no marcar una
  //    corrida vacía (sesión caída) como snapshot bueno.
  let anual = null
  if (movs.length) {
    try {
      const alm = await import('/Users/AIagenteia/nexus/conector-tek/almacen.mjs')
      const meta = { empresa: empresaActiva || 'ANA CLARA SPA', desde: DESDE, hasta: hoy }
      anual = alm.fusionar(movs, meta)
      alm.guardarUltimos(lotesMov.flat(), meta, 50)
      log(`acumulador anual: ${anual.total} movs del año (+${anual.nuevos} nuevos) rango ${anual.min || '?'}→${anual.max || '?'}`)
    } catch (e) { log('acumulador falló:', e.message) }
  }
  writeFileSync(join(DATA, 'raw-capturas.json'), JSON.stringify(raw, null, 2))
  writeFileSync(join(DATA, 'estado.json'), JSON.stringify({ estado: 'ok', actualizado, empresa: empresaActiva || 'ANA CLARA SPA', desde: DESDE, hasta: hoy, limite_banco_dias: 90, saldos: saldosFilas?.length || 0, movimientos: movs.length, movimientos_anual: anual?.total ?? null, url: page.url() }, null, 2))
  if (saldosFilas) writeFileSync(join(DATA, 'saldos.json'), JSON.stringify({ actualizado, empresa: empresaActiva || 'ANA CLARA SPA', cuentas: saldosFilas }, null, 2))
  // movimientos.json = SOLO la última captura (compat). El acumulado del año vive en cartola-anual.json.
  writeFileSync(join(DATA, 'movimientos.json'), JSON.stringify({ actualizado, desde: DESDE, hasta: hoy, limite_banco_dias: 90, total: movs.length, movimientos: movs }, null, 2))
  await page.screenshot({ path: join(DATA, 'fin-captura.png') }).catch(() => {})
  log(`captura: ${saldosFilas?.length || 0} saldos, ${movs.length} movimientos (desde ${DESDE}); anual=${anual?.total ?? '—'}`)
  return { saldos: saldosFilas?.length || 0, movimientos: movs.length, anual: anual?.total ?? 0 }
}

// entra a la empresa objetivo si estamos en el "Listado de Empresas".
// IMPORTANTE: matchea la FILA exacta del "Entrar" (closest tr), no un ancestro que
// engloba todas las filas (ese bug entraba siempre a la 1ª empresa de la lista).
async function entrarEmpresa(page, log, objetivo) {
  const t = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
  if (!/seleccion-empresa|listado de empresas|selecciona.*empresa/i.test(page.url() + ' ' + t)) return
  log(`entro a "${objetivo}"…`)
  // "Leo" la lista como humano: pausa + un scroll suave antes de decidir.
  await idle(page, rnd(1400, 2800))
  if (chance(0.6)) await scrollHumano(page, rnd(120, 260))
  await sleep(rnd(500, 1200))
  // Localizo la FILA de la empresa objetivo y su botón "Entrar" (locator, no JS click).
  const filaRe = new RegExp(objetivo, 'i')
  const fila = page.locator('tr, [role="row"], [class*="row"], li').filter({ hasText: filaRe }).first()
  let entrar = fila.getByText(/entrar/i).first()
  if (!(await entrar.count().catch(() => 0))) entrar = fila.locator('a, button, [role="button"], [class*="btn"], [class*="link"]').last()
  const ok = await clickHumano(page, entrar)
  log('  entrar (mouse real):', ok)
  await sleep(rnd(7500, 10500))
}

// Cierra popups que tapan el dashboard ("Actualiza tu Clave", nag de seguridad).
// NUNCA clickea "Cambiar Clave" (eso arranca el cambio de clave): solo cierra/omite.
async function cerrarPopups(page, log) {
  for (let i = 0; i < 3; i++) {
    // El popup "Actualiza tu Clave" es un IFRAME de campaña, HIJO del documento principal.
    // Detectamos SOLO desde el frame principal (evaluar frames cross-origin puede colgar).
    const hay = await page.evaluate(() =>
      /Actualiza tu Clave|Protege la seguridad/i.test(document.body?.innerText || '')
      || !!document.querySelector('iframe[src*="campna" i], iframe[src*="campana" i]'),
    ).catch(() => false)
    if (!hay) return true
    let done = false
    // 1) botón de descarte en el frame principal (por si el modal es nativo). Usamos count()
    //    (instantáneo): boundingBox() ESPERA hasta 30s por regex si el texto no está → hang.
    for (const re of [/^m[aá]s tarde/i, /^ahora no/i, /^omitir/i, /^recordar/i, /^saltar/i, /^no gracias/i]) {
      const b = page.getByText(re, { exact: false }).first()
      if (await b.count().catch(() => 0)) { await b.click({ force: true, timeout: 1500 }).catch(() => {}); done = true; break }
    }
    // 2) quitar el iframe de campaña (+ su modal/backdrop) del DOM principal — es lo que tapa.
    if (!done) {
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('iframe[src*="campna" i], iframe[src*="campana" i]')) {
          const cont = el.closest('[class*="modal" i],[class*="overlay" i],[class*="popup" i]') || el
          try { cont.remove() } catch { cont.style.display = 'none' }
        }
        document.querySelectorAll('.modal-backdrop,[class*="backdrop" i],[class*="modal" i][style*="block"]').forEach((e) => { try { if (/campna|backdrop/i.test(e.outerHTML.slice(0, 200))) e.remove() } catch { /* */ } })
      }).catch(() => {})
      done = true
    }
    await page.keyboard.press('Escape').catch(() => {})
    await sleep(1500)
  }
  log && log('popup: intenté cerrarlo (quité el iframe de campaña del DOM)')
  return true
}

// ESPERA POR CONDICIÓN (robustez anti-flaky): espera hasta que un texto/elemento APAREZCA
// visible en CUALQUIER frame, hasta `ms`. Devuelve true si apareció, false si venció. Reemplaza
// los `sleep(9000)` a ciegas: espera lo justo que tarde la pantalla, ni de más ni de menos —
// que es la causa #1 de que un mapeo "funcione un día y se rompa al otro". Uso:
//   if (!await esperarTexto(page, /Importaci[oó]n/i, 15000)) log('no cargó el menú')
async function esperarTexto(page, re, ms = 12000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    for (const f of page.frames()) {
      try {
        const loc = f.getByText(re).first()
        if ((await loc.count()) && (await loc.isVisible().catch(() => false))) return true
      } catch { /* frame cross-origin o navegando */ }
    }
    await sleep(400)
  }
  return false
}

// Clic en la opción (p.ej. "Creación") que pertenece a la COLUMNA de un header
// (p.ej. "A Tercero mismo Banco"): elige la opción más cercana debajo y alineada.
async function clickColumna(page, headerRe, opcionRe, log) {
  // el menú de Transferencias carga en un IFRAME → hay que buscar en TODOS los frames,
  // no solo en el principal. Reintenta por si el frame pinta con retardo.
  for (let intento = 0; intento < 4; intento++) {
    for (const f of page.frames()) {
      let hbox = null
      const heads = await f.getByText(headerRe).all().catch(() => [])
      for (const h of heads) { const b = await h.boundingBox().catch(() => null); if (b) { hbox = b; break } }
      if (!hbox) continue
      const ops = await f.getByText(opcionRe).all().catch(() => [])
      let bestLoc = null, bestDy = 1e9
      for (const o of ops) {
        const b = await o.boundingBox().catch(() => null); if (!b) continue
        const dx = Math.abs(b.x - hbox.x), dy = b.y - hbox.y     // misma columna, justo debajo
        if (dx < 190 && dy > 0 && dy < 90 && dy < bestDy) { bestLoc = o; bestDy = dy }
      }
      if (bestLoc) { log && log('columna: header+opción OK (frame), clic'); return clickHumano(page, bestLoc) }
    }
    await sleep(2000)
  }
  log && log('columna: no encontré header/opción en ningún frame')
  return false
}

// ── MAPEO DE TRANSFERENCIAS (TEK_TRANSFERIR=mapear): SOLO LECTURA. Va a Transferencias
// y vuelca la estructura del formulario (inputs/selects/botones) + screenshots.
// NO llena ni envía NADA. Para poder construir la transferencia con seguridad.
async function mapearTransferencia(ctx, page, log) {
  mkdirSync(DATA, { recursive: true })
  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  await sleep(8000)
  await entrarEmpresa(page, log, process.env.TEK_EMPRESA || 'ANA CLARA')
  await sleep(rnd(3000, 5000)); await idle(page, rnd(900, 1800))
  // cerrar el popup "Actualiza tu Clave" que intercepta los clics del dashboard
  await cerrarPopups(page, log)
  await sleep(rnd(800, 1600))
  // clic en el menú "Transferencias" con MOUSE REAL (no JS click)
  const menu = page.getByText(/^transferencias?$/i).first()
  const clic = await clickHumano(page, menu)
  log('clic Transferencias (mouse real):', clic)
  await sleep(rnd(6000, 8500)); await idle(page, rnd(800, 1600))
  await page.screenshot({ path: join(DATA, 'transf-01-menu.png') }).catch(() => {})
  // entrar de verdad a "A Tercero mismo Banco → Creación" (la columna correcta)
  let entro = await clickColumna(page, /^A Tercero mismo Banco$/i, /^Creaci[oó]n$/i, log)
  // Fallback ROBUSTO (menú = shadow DOM cerrado): clic en la "Creación" que SIGUE al header
  // de la sección de terceros, por XPath en cualquier frame (igual criterio que crearTransferencia).
  for (let i = 0; i < 6 && !entro; i++) {
    for (const sec of ['A Tercero mismo Banco', 'A Tercero otros Banco', 'Transferencias Express', 'A Tercero']) {
      for (const f of page.frames()) {
        const loc = f.locator(`xpath=//*[contains(normalize-space(.),${JSON.stringify(sec)})]/following::*[normalize-space(text())="Creación" or normalize-space(text())="Creacion"][1]`).first()
        if ((await loc.count().catch(() => 0)) && (await loc.isVisible().catch(() => false))) {
          const ok = await clickHumano(page, loc).catch(() => false)
          if (ok !== false) { entro = true; log('mapear: clic Creación directo (XPath, sección ' + sec + ')'); break }
        }
      }
      if (entro) break
    }
    if (!entro) await sleep(2000)
  }
  log('clic "A Tercero mismo Banco → Creación":', entro)
  await sleep(rnd(8000, 10500)); await idle(page, rnd(800, 1600))
  // volcar formularios visibles de todos los frames
  const forms = []
  for (const f of page.frames()) {
    const campos = await f.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 }
      const inputs = [...document.querySelectorAll('input,select,textarea')].filter(vis).map((el) => ({
        tag: el.tagName.toLowerCase(), type: el.type || '', id: el.id || '', name: el.name || '',
        placeholder: el.placeholder || '', label: (el.labels?.[0]?.innerText || '').trim().slice(0, 40),
        opciones: el.tagName === 'SELECT' ? [...el.options].map((o) => o.text).slice(0, 12) : undefined,
      }))
      const botones = [...document.querySelectorAll('button,a[role="button"],input[type="submit"],[class*="btn"]')].filter(vis).map((b) => (b.innerText || b.value || '').trim()).filter((t) => t && t.length < 30).slice(0, 25)
      const titulos = [...document.querySelectorAll('h1,h2,h3,[class*="title"],[class*="titulo"]')].filter(vis).map((h) => (h.innerText || '').trim()).filter(Boolean).slice(0, 10)
      return { url: location.href, inputs, botones, titulos }
    }).catch(() => null)
    if (campos && (campos.inputs.length || campos.botones.length)) forms.push(campos)
  }
  writeFileSync(join(DATA, 'transf-form.json'), JSON.stringify({ cuando: new Date().toISOString(), url: page.url(), forms }, null, 2))
  await page.screenshot({ path: join(DATA, 'transf-02-form.png') }).catch(() => {})
  log(`transferencias mapeadas: ${forms.reduce((a, f) => a + f.inputs.length, 0)} inputs`)
  return { inputs: forms.reduce((a, f) => a + f.inputs.length, 0), url: page.url() }
}

// Vuelca inputs/botones/títulos visibles de TODOS los frames (reutilizable).
async function volcarFrames(page) {
  const forms = []
  for (const f of page.frames()) {
    const c = await f.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 }
      const inputs = [...document.querySelectorAll('input,select,textarea')].filter(vis).map((el) => ({ tag: el.tagName.toLowerCase(), type: el.type || '', id: el.id || '', name: el.name || '', placeholder: el.placeholder || '', maxlength: el.getAttribute('maxlength') || '', label: (el.labels?.[0]?.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 60), opciones: el.tagName === 'SELECT' ? [...el.options].map((o) => o.text).slice(0, 40) : undefined }))
      const botones = [...document.querySelectorAll('button,a[role="button"],input[type="submit"],[class*="btn"]')].filter(vis).map((b) => (b.innerText || b.value || '').trim()).filter((t) => t && t.length < 40).slice(0, 40)
      const titulos = [...document.querySelectorAll('h1,h2,h3,legend,[class*="title"],[class*="titulo"]')].filter(vis).map((h) => (h.innerText || '').trim()).filter(Boolean).slice(0, 15)
      return { url: location.href, inputs, botones, titulos }
    }).catch(() => null)
    if (c && (c.inputs.length || c.botones.length || c.titulos.length)) forms.push(c)
  }
  return forms
}

// ── CREAR TRANSFERENCIA (TEK_CREAR=mapear): TODO en una sola sesión viva (login→form).
// Entra a "A Tercero mismo Banco → Creación" por clic de PIXEL (shadow DOM cerrado),
// llena PASO 1 (monto+motivo) y "Continuar" para llegar/mapear el PASO 2 (destino).
// Se DETIENE en el destino: NO llena beneficiario, NO confirma, NO mueve plata.
async function crearTransferencia(page, log) {
  mkdirSync(DATA, { recursive: true })
  // El anti-bucle (1 sola transferencia, sin reintentos del hub) vive en transferir.mjs
  // ANTES de spawnear este proceso. Acá solo creamos; no abrimos otra si ya hay una en curso.
  // sleepLargo = espera CON pulso de mouse (mantiene viva la sesión del banco en ESTE Chrome).
  const sleepLargo = (ms) => pulsoSesion(page, ms)
  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  await sleepLargo(8000)
  // FORZAR empresa (TEK_FORCE_EMPRESA=1): si la sesión ya está DENTRO de otra empresa,
  // entrarEmpresa no re-cambia. Hay que VOLVER AL SELECTOR primero. Antes solo se clickeaba
  // "Empresa / Rol" y faltaba el "Volver a selector de empresas" → nunca llegaba al selector
  // → transfería desde la empresa equivocada. Ahora usa irAlSelectorEmpresas (mecanismo probado
  // por leer-saldos, que sí cambia bien entre las empresas).
  if (process.env.TEK_FORCE_EMPRESA === '1') {
    try { const ok = await irAlSelectorEmpresas(page, log); log('forzar empresa → selector: ' + (ok ? 'ok' : 'NO llegué al selector')) } catch (e) { log('forzar empresa error: ' + e.message) }
    await sleepLargo(rnd(2500, 4000))
  }
  await entrarEmpresa(page, log, process.env.TEK_EMPRESA || 'ANA CLARA')
  await sleepLargo(rnd(3000, 5000)); await idle(page, rnd(800, 1600))
  // abrir menú Transferencias (clic por texto, engancha) + clic de PIXEL en "Creación"
  const menu = page.getByText(/^transferencias?$/i).first()
  await clickHumano(page, menu)
  await sleepLargo(rnd(4000, 5500))
  await page.screenshot({ path: join(DATA, 'crear-00-menu.png') }).catch(() => {})
  const tipoOtros = /otro/i.test(process.env.TEK_TRANSFER_TIPO || '')
  // GENÉRICO: reconoce los DOS formularios de transferencia del banco (hay tipos de cuenta
  // distintos): TEF.UI.Web (clásico, ANA CLARA) y TEFUN.UI.Web (unificado "Express", Nico y ramas).
  const fr = () => page.frames().find((f) => /TEF(UN)?\.UI\.Web/i.test(f.url()))
  // GENÉRICO (sirve para CUALQUIER empresa, hoy y las futuras): el menú de Transferencias es
  // un panel con TEXTO clickeable. Clickeamos "Creación" de la sección de transferencia a
  // terceros — el layout/nombre de la sección varía por empresa ("Transferencias Express",
  // "A Tercero mismo/otros Banco"), así que probamos por texto en ese orden y, si no, la 1ª.
  const clicCreacion = async () => {
    const secciones = tipoOtros
      ? ['Transferencias Express', 'A Tercero otros Banco', 'otros Banco']
      : ['Transferencias Express', 'A Tercero mismo Banco', 'A Tercero']
    for (const sec of secciones) {
      const loc = page.locator(`xpath=//*[contains(normalize-space(.),${JSON.stringify(sec)})]/following::*[normalize-space(text())="Creación"][1]`).first()
      if ((await loc.count().catch(() => 0)) && (await loc.isVisible().catch(() => false))) { await clickHumano(page, loc); log('clic Creación (texto:', sec + ')'); return true }
    }
    const first = page.getByText(/^Creación$/i).first()
    if (await first.isVisible().catch(() => false)) { await clickHumano(page, first); log('clic Creación (1ª del panel)'); return true }
    return false
  }
  await clicCreacion()
  await sleepLargo(9000)
  await page.screenshot({ path: join(DATA, 'crear-01-form.png') }).catch(() => {})
  let f1 = fr()
  // Fallback al clic por PÍXEL (layout conocido de ANA CLARA) si el texto no cargó el iframe.
  if (!f1) {
    const yCreacion = tipoOtros ? 320 : 232
    await page.mouse.move(280, yCreacion - 30, { steps: 10 }); await sleep(rnd(150, 320))
    await page.mouse.move(320, yCreacion, { steps: 8 }); await sleep(rnd(150, 300))
    await page.mouse.down(); await sleep(60); await page.mouse.up()
    log('fallback: clic pixel Creación (' + yCreacion + ')')
    await sleepLargo(9000); f1 = fr()
  }
  if (!f1) { log('no cargó el iframe de creación'); writeFileSync(join(DATA, 'crear-form.json'), JSON.stringify({ url: page.url(), forms: await volcarFrames(page) }, null, 2)); return { estado: 'sin_form', url: page.url() } }
  writeFileSync(join(DATA, 'crear-form.json'), JSON.stringify({ paso: 1, url: page.url(), forms: await volcarFrames(page) }, null, 2))
  // PASO 1: detectar el TIPO de formulario y llenar con los campos correctos (hay 2 tipos
  // de cuenta → 2 formularios). TEF = clásico (ANA CLARA); TEFUN = unificado/Express (Nico).
  const esTEFUN = /TEFUN\.UI\.Web/i.test(f1.url())
  log('form de transferencia:', esTEFUN ? 'TEFUN (unificado/Express)' : 'TEF (clásico)')
  const monto = String(process.env.TEK_MONTO || '1000')
  const motivoTxt = process.env.TEK_MOTIVO || 'Prueba tek'
  if (esTEFUN) {
    // Cuenta origen: elegir la cuenta real del dropdown (la 1ª que no sea el placeholder).
    try { const sel = f1.locator('select').first(); if (await sel.count().catch(() => 0)) { const nop = await sel.locator('option').count().catch(() => 0); if (nop > 1) await sel.selectOption({ index: 1 }).catch(() => {}); await sleep(rnd(700, 1300)) } } catch { /* */ }
    await f1.locator('#montoTEFinput').click().catch(() => {}); await sleep(rnd(300, 600))
    await f1.locator('#montoTEFinput').type(monto, { delay: rnd(90, 170) }).catch(() => {})
    await sleep(rnd(400, 900))
    await f1.locator('#motivoInputText').click().catch(() => {}); await sleep(rnd(200, 500))
    await f1.locator('#motivoInputText').type(motivoTxt, { delay: rnd(60, 130) }).catch(() => {})
    await sleep(rnd(400, 900))
    // "A Terceros": radio CUSTOM (no <input radio>). Buscamos el control del radio dentro del
    // contenedor del texto y lo clickeamos por JS; si no, click de texto+padres. Logueamos el
    // HTML para ver la estructura si falla.
    const marcado = await f1.evaluate(() => {
      const hoja = [...document.querySelectorAll('*')].find((e) => e.childElementCount === 0 && /^\s*A\s*Terceros\s*$/i.test(e.textContent || ''))
      if (!hoja) return { ok: false, motivo: 'sin-texto' }
      let cont = hoja
      for (let i = 0; i < 5 && cont; i++) {
        const radio = cont.querySelector('input[type=radio], [role=radio], [class*=radio i] > input, [class*=radio i]')
        if (radio) { radio.click(); return { ok: true, via: 'radio', html: cont.outerHTML.slice(0, 260) } }
        cont = cont.parentElement
      }
      hoja.click(); hoja.parentElement && hoja.parentElement.click()
      return { ok: true, via: 'texto', html: (hoja.parentElement && hoja.parentElement.outerHTML || '').slice(0, 260) }
    }).catch((e) => ({ ok: false, err: String(e).slice(0, 120) }))
    log('A Terceros →', JSON.stringify(marcado).slice(0, 240))
    try { writeFileSync(join(DATA, 'terceros-debug.json'), JSON.stringify(marcado, null, 2)) } catch { /* */ }
    await sleep(rnd(900, 1500))
    await page.screenshot({ path: join(DATA, 'crear-01c-terceros.png') }).catch(() => {})
    // El destino del form TEFUN se llena en el PASO 2 (tras "Continuar"), abajo.
  } else {
    await f1.locator('#txtMonto').click().catch(() => {}); await sleep(rnd(300, 600))
    await f1.locator('#txtMonto').type(monto, { delay: rnd(90, 170) }).catch(() => {})
    await sleep(rnd(400, 900))
    await f1.locator('#mensaje-100').click().catch(() => {}); await sleep(rnd(200, 500))
    await f1.locator('#mensaje-100').type(motivoTxt, { delay: rnd(60, 130) }).catch(() => {})
    await sleep(rnd(400, 900))
  }
  await page.screenshot({ path: join(DATA, 'crear-01b-lleno.png') }).catch(() => {})
  // Continuar → PASO 2 (destino)
  const cont = f1.getByText(/^continuar$/i).first()
  const cb = await cont.boundingBox().catch(() => null)
  if (cb) { await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2, { steps: 12 }); await sleep(rnd(200, 450)); await page.mouse.down(); await sleep(60); await page.mouse.up(); log('Continuar → paso 2') }
  else log('no vi el botón Continuar')
  await sleepLargo(9000)
  await page.screenshot({ path: join(DATA, 'crear-02-destino.png') }).catch(() => {})
  const forms2 = await volcarFrames(page)
  writeFileSync(join(DATA, 'crear-destino.json'), JSON.stringify({ paso: 2, url: page.url(), forms: forms2 }, null, 2))
  const nIn = forms2.reduce((a, f) => a + f.inputs.length, 0)
  log(`paso 2 (destino) mapeado: ${nIn} inputs`)
  // GUARD sesión caída: si el banco finalizó la sesión al pasar al destino, cortar YA (no colgarse).
  if (await sesionCaida(page)) { log('ABORT: sesión finalizada en paso destino'); return { estado: 'sesion_caida', pendiente: false, nota: 'La sesión del banco se finalizó a mitad de la creación (paso destino). NO se creó nada — reintentar con sesión fresca.', url: page.url() } }

  // SCRAPEO de contactos guardados (TEK_SCRAPE_DEST=1): clic "Buscar destinatario" → vuelca la
  // lista de destinatarios inscritos de ESTA empresa. NO llena nada, NO transfiere.
  if (process.env.TEK_SCRAPE_DEST === '1') {
    // Capturar la empresa REAL en pantalla ANTES de abrir el modal (que tapa el header).
    // Así sabemos en qué empresa cayó de verdad (verifica que el cambio de empresa funcionó).
    let empresaReal = '', rutEmpresaReal = ''
    for (const f of page.frames()) {
      const t = await f.evaluate(() => document.body?.innerText || '').catch(() => '')
      const mr = t.match(/RUT empresa:\s*([\d.]+-[\dkK])/i)
      const me = t.match(/Empresa:\s*([^\n]{3,60})/i)
      if (mr) rutEmpresaReal = mr[1].trim()
      if (me) empresaReal = me[1].trim()
      if (mr || me) break
    }
    log(`scrape: empresa en pantalla = "${empresaReal}" (RUT ${rutEmpresaReal || '?'})`)
    let clicBuscar = false
    for (const f of page.frames()) {
      const b = f.getByText(/^\s*Buscar destinatario\s*$/i).first()
      if (await b.count().catch(() => 0)) { await clickHumano(page, b).catch(() => {}); clicBuscar = true; log('scrape: clic "Buscar destinatario"'); break }
    }
    await sleepLargo(5000)
    // pestaña "Todos" (ver TODOS los beneficiarios, no solo Favoritos)
    for (const f of page.frames()) {
      const t = f.getByText(/^\s*Todos\s*$/i).first()
      if ((await t.count().catch(() => 0)) && (await t.isVisible().catch(() => false))) { await clickHumano(page, t).catch(() => {}); log('scrape: pestaña "Todos"'); break }
    }
    await sleepLargo(3500)
    await page.screenshot({ path: join(DATA, 'scrape-destinatarios.png') }).catch(() => {})
    // Tabla del modal: columnas RUT · NOMBRE · CUENTA · BANCO · EMAIL, con PAGINACIÓN.
    // Extraemos filas con RUT (≥3 celdas), clic "Siguiente", repetimos hasta que no haya
    // filas nuevas (dedupe por RUT) o se acabe el tope. NO llena, NO transfiere.
    const extraerPagina = async () => {
      const out = []; let vac = false
      for (const f of page.frames()) {
        const r = await f.evaluate(() => {
          const norm = (s) => (s || '').replace(/\s+/g, ' ').trim()
          const rutRe = /\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]/
          const vac = /no existen beneficiarios/i.test(document.body?.innerText || '')
          const rows = []
          for (const tr of document.querySelectorAll('table tr, [role="row"]')) {
            const cels = [...tr.querySelectorAll('td,th,[role="cell"]')].map((c) => norm(c.innerText)).filter(Boolean)
            if (cels.length >= 3 && rutRe.test(cels[0] || '')) rows.push(cels)
          }
          return { vac, rows }
        }).catch(() => ({ vac: false, rows: [] }))
        if (r.vac) vac = true
        out.push(...r.rows)
      }
      return { vac, rows: out }
    }
    const porRut = new Map(); let vacio = false
    const MAXPAG = Number(process.env.TEK_SCRAPE_MAXPAG || 80)
    let pag = 0
    for (; pag < MAXPAG; pag++) {
      const { vac, rows } = await extraerPagina()
      if (vac) vacio = true
      let nuevos = 0
      for (const cels of rows) {
        const rut = (cels[0] || '').match(/\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]/)?.[0]
        if (!rut || porRut.has(rut)) continue
        porRut.set(rut, { rut, nombre: cels[1] || '', cuenta: cels[2] || '', banco: cels[3] || '', email: cels[4] || '', crudo: cels })
        nuevos++
      }
      if (nuevos === 0 && pag > 0) break   // página sin filas nuevas → fin
      // clic "Siguiente" del paginador (robusto: texto exacto → contiene → flecha/next;
      // scroll a la vista + click forzado, sin exigir isVisible).
      let avanzo = false
      for (const f of page.frames()) {
        let sig = f.getByText(/^\s*Siguiente\s*$/i).last()
        if (!(await sig.count().catch(() => 0))) sig = f.getByText(/Siguiente/i).last()
        if (!(await sig.count().catch(() => 0))) sig = f.locator('[class*="next" i],[aria-label*="siguiente" i],[title*="siguiente" i],[class*="paginat" i] a:last-child, [class*="pager" i] a:last-child').last()
        if (await sig.count().catch(() => 0)) {
          await sig.scrollIntoViewIfNeeded().catch(() => {})
          const ok = await sig.click({ force: true, timeout: 3000 }).then(() => true).catch(() => false)
          if (ok) { avanzo = true; break }
        }
      }
      if (!avanzo) { log('scrape: no encontré "Siguiente" → fin en pág ' + (pag + 1)); break }
      await sleepLargo(2400)
    }
    const contactos = [...porRut.values()]
    writeFileSync(join(DATA, 'scrape-destinatarios.json'), JSON.stringify({ empresa: process.env.TEK_EMPRESA, empresa_real: empresaReal, rut_empresa: rutEmpresaReal, cuando: new Date().toISOString(), paginas: pag + 1, vacio, contactos }, null, 2))
    log(`scrape: ${contactos.length} contactos en ${pag + 1} páginas (empresa real: ${empresaReal || '?'}, vacio=${vacio})`)
    return { estado: 'scrape_destinatarios', contactos: contactos.length, paginas: pag + 1, vacio, empresa_real: empresaReal, rut_empresa: rutEmpresaReal, url: page.url() }
  }

  const modo = process.env.TEK_CREAR   // 'mapear' | 'llenar' | 'crear'
  if (modo === 'llenar' || modo === 'crear') {
    const f2 = page.frames().find((f) => /TEF(UN)?\.UI\.Web/i.test(f.url())) || f1
    // ── DESTINO del form NUEVO (TEFUN, paso 2): campos con placeholder VACÍO → llenar por ID.
    //    Banco destino = SELECT; rut/nombre/cuenta/mail/mensaje = inputs. Uno a uno (foco limpio).
    if (esTEFUN) {
      // Llenado por JS por ID (setter nativo + eventos): robusto contra foco/máscara y evita
      // que un campo se meta en otro. Cada campo por su ID exacto.
      // TECLEO REAL (mouse + teclas isTrusted) por ID; si no cuaja, tipearReal cae a JS solo.
      const setIdJS = async (id, valTxt) => {
        if (valTxt == null || valTxt === '') return
        await tipearReal(page, f2.locator('#' + id).first(), valTxt, 'TEFUN #' + id)
        await sleep(rnd(300, 600))
      }
      // Banco destino: es un DROPDOWN CUSTOM (no <select>). Abrir + elegir Santander (o el del
      // beneficiario). RUT/Nombre suelen HABILITARSE recién al elegir el banco.
      try {
        const bancoTxt = process.env.TEK_DEST_BANCO || 'Santander'
        const key = bancoTxt.replace(/^\s*banco\s+/i, '').trim()   // "Banco Falabella" → "Falabella"; "Santander" → "Santander"
        const combo = f2.getByText(/Seleccione\s+Banco\s+Destino/i).first()
        if (await combo.count().catch(() => 0)) { await clickHumano(page, combo); await sleep(rnd(1400, 2200)) }
        await page.screenshot({ path: join(DATA, 'crear-02a-banco-abierto.png') }).catch(() => {})
        // si el dropdown trae buscador, tipear el nombre del banco para filtrar
        for (const f of page.frames()) { const s = f.locator('input[type="search"], input[placeholder*="banco" i], input[placeholder*="buscar" i]').first(); if (await s.isVisible().catch(() => false)) { await s.type(key, { delay: rnd(70, 140) }).catch(() => {}); await sleep(rnd(900, 1400)); break } }
        // elegir la opción que contenga el nombre distintivo del banco (Falabella, Santander, BCI…)
        const reBanco = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        const opt = f2.getByText(reBanco).filter({ hasNotText: /Seleccione/i }).first()
        if (await opt.count().catch(() => 0)) { await clickHumano(page, opt); log('banco destino: elegí', bancoTxt); await sleep(rnd(1400, 2200)) }
        else log('banco destino: no vi la opción', key)
      } catch (e) { log('banco destino falló:', e.message) }
      // Cuenta/mail/mensaje PRIMERO; RUT y NOMBRE al FINAL: al elegir el banco destino el form
      // RE-RENDERIZA y BORRA esos dos campos (bug visto con OTROS bancos, ej. Falabella dejaba
      // RUT/Nombre en "CAMPO OBLIGATORIO"). Llenándolos último no se pisan con el re-render.
      await setIdJS('inputCuentaDestinoDigitada', process.env.TEK_DEST_CUENTA)
      await setIdJS('correoDestinatarioOB', process.env.TEK_DEST_EMAIL)
      await setIdJS('mensajeText1', process.env.TEK_DEST_MSG)
      await setIdJS('rutDestinatario', process.env.TEK_DEST_RUT)
      await setIdJS('nombreDestinatario', process.env.TEK_DEST_NOMBRE)
      // VERIFICAR que RUT/Nombre quedaron (el re-render del banco los puede borrar) y REINTENTAR.
      const leerIdJS = async (id) => f2.evaluate((x) => { const el = document.getElementById(x); return el ? el.value : null }, id).catch(() => null)
      for (let intento = 0; intento < 3; intento++) {
        const rv = await leerIdJS('rutDestinatario')
        if (rv && String(rv).replace(/\D/g, '').length >= 7) break
        log(`RUT vacío tras banco (intento ${intento + 1}) rut="${rv}" → re-lleno`)
        await sleep(rnd(700, 1200))
        await setIdJS('rutDestinatario', process.env.TEK_DEST_RUT)
        await setIdJS('nombreDestinatario', process.env.TEK_DEST_NOMBRE)
      }
      await sleep(rnd(600, 1000))
      await page.screenshot({ path: join(DATA, 'crear-02b-destino-tefun.png') }).catch(() => {})
      try { writeFileSync(join(DATA, 'crear-tefun-fill.json'), JSON.stringify({ ts: new Date().toISOString() })) } catch { /* */ }
      // ── SUBMIT TEFUN (Express): en el paso 2 el botón es CREAR (no Continuar).
      //    Flujo real visto en capturas: llenar destino → Crear → modal aviso → Aceptar → queda pendiente.
      //    El código viejo buscaba Continuar dos veces, no apretaba Crear a tiempo y el Aceptar
      //    fallaba → tefun_no_confirmada con el modal todavía abierto.
      const clickBtnTEFUN = async (re) => {
        const frames = [f2, ...page.frames().filter((f) => f !== f2), page]
        for (const fr of frames) {
          const b = fr.getByRole('button', { name: re }).first()
          if (await b.isVisible({ timeout: 500 }).catch(() => false)) {
            // HUMANO PRIMERO: el mouse viaja hasta el botón (curva + overshoot) y clic real.
            // Este es el clic que CREA la transferencia → el que más mira BioCatch. Solo si el
            // movimiento humano falla caemos al click() directo (teleport), como red de seguridad.
            if (await clickHumano(page, b)) return true
            try { await b.click({ timeout: 3000 }); return true } catch { /* */ }
          }
          const t = fr.getByText(re).first()
          if (await t.isVisible({ timeout: 400 }).catch(() => false)) {
            if (await clickHumano(page, t)) return true
            try { await t.click({ timeout: 3000 }); return true } catch { /* */ }
          }
        }
        // Fallback DOM: botón visible cuyo texto calza
        for (const fr of page.frames()) {
          const ok = await fr.evaluate((src) => {
            const re = new RegExp(src, 'i')
            const btn = [...document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]')]
              .find((e) => e.offsetParent !== null && re.test((e.innerText || e.textContent || e.value || '').replace(/\s+/g, ' ').trim()))
            if (!btn) return false
            btn.click()
            return true
          }, re.source).catch(() => false)
          if (ok) return true
        }
        return false
      }
      if (modo !== 'crear') {
        await clickBtnTEFUN(/^\s*(crear|continuar)\s*$/i)
        await sleepLargo(rnd(4000, 6000))
        return { estado: 'tefun_lleno_sin_crear', url: page.url() }
      }
      const leerAlerta = async () => {
        for (const f of page.frames()) {
          const t = await f.evaluate(() => {
            const m = [...document.querySelectorAll('[class*="modal" i],[role="dialog"],[class*="alert" i],[class*="popup" i],[class*="swal" i]')]
              .find((e) => e.offsetParent !== null && (e.innerText || '').trim().length > 8)
            return m ? (m.innerText || '').replace(/\s+/g, ' ').trim() : ''
          }).catch(() => '')
          if (t) return t
        }
        return ''
      }
      const botonVisible = async (re) => {
        for (const fr of [f2, ...page.frames()]) {
          if (await fr.getByRole('button', { name: re }).first().isVisible({ timeout: 300 }).catch(() => false)) return true
          if (await fr.getByText(re).first().isVisible({ timeout: 300 }).catch(() => false)) return true
        }
        return false
      }
      // GUARDA: RUT vacío → no enviar
      const rutEnForm = await f2.evaluate(() => { const el = document.getElementById('rutDestinatario'); return el ? el.value : '' }).catch(() => '')
      if (!rutEnForm || String(rutEnForm).replace(/\D/g, '').length < 7) {
        log('ABORT TEFUN: RUT destinatario vacío → NO envío (evita falso positivo).')
        return { estado: 'falta_rut', pendiente: false, nota: 'El RUT del destinatario no se cargó en el formulario del banco (re-render al elegir banco destino). NO se envió nada — reintentar.', url: page.url() }
      }

      // 1) CREAR (o Continuar si el form viejo todavía lo muestra)
      const hayCrear = await botonVisible(/^\s*crear\s*$/i)
      const hayCont = await botonVisible(/^\s*continuar\s*$/i)
      log(`TEFUN botones: Crear=${hayCrear} Continuar=${hayCont}`)
      let clickOk = false
      if (hayCrear) {
        clickOk = await clickBtnTEFUN(/^\s*crear\s*$/i)
        log('TEFUN → Crear', clickOk)
      } else if (hayCont) {
        clickOk = await clickBtnTEFUN(/^\s*continuar\s*$/i)
        log('TEFUN → Continuar (form sin Crear)', clickOk)
      } else {
        clickOk = await clickBtnTEFUN(/^\s*(crear|continuar|confirmar|transferir)\s*$/i)
        log('TEFUN → botón final genérico', clickOk)
      }
      if (!clickOk) {
        await page.screenshot({ path: join(DATA, 'crear-05a-alerta.png') }).catch(() => {})
        return { estado: 'sin_boton_crear', pendiente: false, nota: 'No vi el botón Crear/Continuar en el paso 2 de TEFUN.', url: page.url() }
      }
      await sleepLargo(rnd(3500, 5500))
      await page.screenshot({ path: join(DATA, 'crear-05a-alerta.png') }).catch(() => {})
      // GUARD sesión caída tras Crear: si el banco finalizó la sesión, cortar (no se confirmó).
      if (await sesionCaida(page)) { log('ABORT: sesión finalizada tras Crear'); return { estado: 'sesion_caida', pendiente: false, nota: 'La sesión se finalizó tras apretar Crear. NO se pudo confirmar la creación — reintentar con sesión fresca.', url: page.url() } }

      // 2) Modal de aviso (50M/4h, tope, etc.) → SIEMPRE Aceptar si aparece
      let alerta = await leerAlerta()
      log('TEFUN alerta:', (alerta || '(ninguna)').slice(0, 160))
      const clase = clasificarAlerta(alerta)
      if (clase === 'ya_pendiente') {
        await aceptarModalAlerta(page, log)
        log('ANTI-DUP: ya hay una pendiente a este beneficiario → NO creo otra')
        return { estado: 'ya_pendiente', pendiente: true, nota: 'Ya existe una transferencia PENDIENTE a este beneficiario por el mismo monto; NO se creó otra (anti-duplicado). Revisala/autorizala en el banco.', url: page.url() }
      }
      const eraLimitePV = clase === 'limite_primera_vez'
      const eraLimiteDia = clase === 'limite_diario'
      if (alerta) {
        const cerrado = await aceptarModalAlerta(page, log)
        log('TEFUN modal Aceptar →', cerrado)
        if (!cerrado) {
          await page.screenshot({ path: join(DATA, 'crear-06-tefun-resultado.png') }).catch(() => {})
          return {
            estado: 'modal_sin_aceptar', pendiente: false, alerta_banco: alerta.slice(0, 240),
            nota: 'Salió el aviso del banco pero no pude apretar Aceptar. NO se confirmó la creación.',
            url: page.url(),
          }
        }
        await sleepLargo(rnd(2500, 4000))
      }

      // 3) Tras Aceptar a veces pide otro Crear/Continuar/Confirmar
      for (let i = 0; i < 3; i++) {
        const otraAlerta = await leerAlerta()
        if (otraAlerta) {
          await aceptarModalAlerta(page, log)
          await sleep(rnd(1500, 2500))
          continue
        }
        if (await botonVisible(/^\s*(crear|continuar|confirmar|finalizar)\s*$/i)) {
          const cual = (await botonVisible(/^\s*crear\s*$/i)) ? /^\s*crear\s*$/i
            : (await botonVisible(/^\s*continuar\s*$/i)) ? /^\s*continuar\s*$/i
              : /^\s*(confirmar|finalizar)\s*$/i
          log('TEFUN post-modal →', await clickBtnTEFUN(cual))
          await sleepLargo(rnd(3000, 5000))
          const a2 = await leerAlerta()
          if (a2) { await aceptarModalAlerta(page, log); await sleep(rnd(1500, 2500)) }
        } else break
      }

      await page.screenshot({ path: join(DATA, 'crear-06-tefun-resultado.png') }).catch(() => {})
      // 4) Confirmar creación. PRIMERO el banner de éxito en la misma pantalla
      //    ("La transferencia ha sido creada con éxito"). Antes solo mirábamos la lista
      //    de Autorización → falso tefun_no_confirmada aunque el banco YA la creó.
      const textoPagina = async () => {
        let t = ''
        for (const fr of page.frames()) {
          t += ' ' + (await fr.evaluate(() => (document.body && document.body.innerText) || '').catch(() => ''))
        }
        return t.replace(/\s+/g, ' ').trim()
      }
      const body = await textoPagina()
      const exitoEnPantalla = /transferencia\s+ha\s+sido\s+creada\s+con\s+[eé]xito|creada\s+con\s+[eé]xito|solicitud\s+creada|queda(r[aá])?\s+pendiente\s+por\s+autoriz/i.test(body)
      if (exitoEnPantalla) {
        log('TEFUN resultado: CREADA (banner de éxito en pantalla)')
        return { estado: 'creada', pendiente: true, via: 'banner_exito', url: page.url() }
      }
      // GUARD sesión caída antes de verificar: si murió acá, existePendiente navegaría sobre una
      // sesión muerta y se COLGARÍA (era la causa del "sin_resultado" de 5 min). Cortar con estado claro.
      if (await sesionCaida(page)) { log('ABORT: sesión finalizada antes de verificar'); return { estado: 'sesion_caida', pendiente: false, nota: 'La sesión se finalizó antes de poder verificar. Revisá "Por Autorizar" en el banco por las dudas, pero lo más probable es que NO se haya creado. NO reintentar a ciegas.', url: page.url() } }
      const creada = await existePendiente(page, log, process.env.TEK_DEST_RUT, monto, process.env.TEK_DEST_CUENTA)
      log('TEFUN resultado:', creada ? 'CREADA (verificada en Autorización)' : (eraLimitePV ? 'TOPE 1ª vez' : eraLimiteDia ? 'EXCESO límite diario' : 'NO confirmada'))
      if (creada) return { estado: 'creada', pendiente: true, via: 'lista_autorizacion', url: page.url() }
      if (eraLimitePV) return { estado: 'limite_primera_vez', pendiente: false, alerta_banco: (alerta || '').slice(0, 240), nota: 'El banco NO deja la 1ª transferencia a esta cuenta NUEVA sobre $250.000 (protección antifraude, primeras 24h). La cuenta NO está bloqueada. Opciones: enviar $250.000 o menos ahora, o esperar 24h desde el primer envío para el monto completo.', url: page.url() }
      if (eraLimiteDia) return { estado: 'limite_diario', pendiente: false, alerta_banco: (alerta || '').slice(0, 240), nota: 'El banco frenó por EXCESO de límite/monto diario (el giro supera el cupo del día, típico $5.000.000). La cuenta NO está bloqueada ni el destinatario es nuevo. Opciones: bajar el monto, partirlo en varios días, o usar TRANSFERENCIA MASIVA (que parte el monto en líneas).', url: page.url() }
      // aviso_info ($50M/4h) NO es bloqueo: si llegamos acá es fallo de VERIFICACIÓN, no de creación segura.
      const avisoInfo = clase === 'aviso_info'
      return {
        estado: 'tefun_no_confirmada', pendiente: false,
        aviso_info: avisoInfo,
        alerta_banco: (alerta || '').slice(0, 240) || null,
        nota: avisoInfo
          ? 'El aviso del banco era INFORMACIÓN ($50M / próxima en 4h), no un bloqueo. No pude verificar en la lista Por Autorizar: pedile al usuario que la revise — puede haberse creado igual. NO reintentar a ciegas.'
          : 'No pude verificar la creación en la lista Por Autorizar. Pedile al usuario revisar pendientes antes de reintentar.',
        url: page.url(),
      }
    }
    const val = async (sel) => f2.locator(sel).first().inputValue().catch(() => '')
    // TECLEO REAL (mouse + teclas isTrusted). Antes era loc.type sin verificar; ahora tipearReal
    // clickea el campo, teclea real, verifica y solo cae a JS si la máscara se lo come.
    const setVal = async (sel, valTxt) => {
      if (valTxt == null || valTxt === '') return
      await tipearReal(page, f2.locator(sel).first(), valTxt, sel)
    }
    // TECLEO REAL por PLACEHOLDER (prefijo, case-insensitive) en cualquier frame. Clickea el campo
    // ANTES de teclear (por eso ya no se descuadran los campos — el problema que había llevado a
    // la inyección JS). Verifica y cae a JS solo como último recurso (dentro de tipearReal).
    const fillByPlaceholder = async (phPrefix, valTxt) => {
      if (valTxt == null || valTxt === '') return false
      for (const f of page.frames()) {
        const loc = f.locator(`input[placeholder^="${phPrefix}" i], textarea[placeholder^="${phPrefix}" i]`).first()
        if (await loc.count().catch(() => 0) && await loc.isVisible().catch(() => false)) {
          return await tipearReal(page, loc, valTxt, phPrefix)
        }
      }
      log('fillByPlaceholder: no vi', phPrefix)
      return false
    }
    const valByPlaceholder = async (phPrefix) => {
      for (const f of page.frames()) {
        const v = await f.evaluate((ph) => {
          const el = [...document.querySelectorAll('input,textarea')]
            .find((e) => (e.placeholder || '').toLowerCase().startsWith(ph.toLowerCase()) && e.offsetParent !== null)
          return el ? el.value : null
        }, phPrefix).catch(() => null)
        if (v != null) return v
      }
      return ''
    }
    // EMAIL robusto y CASE-INSENSITIVE: mismo banco usa placeholder "Ingrese Email" (E
    // mayúscula), otros bancos "Ingrese email" (minúscula). getByPlaceholder con regex /i
    // matchea ambos. fill() + verifica + reintenta con type (antes quedaba vacío → el banco
    // rechazaba "El correo del destinatario no tiene formato correcto").
    // Placeholder EXACTO por CSS (probado en Santander): cubre "Ingrese email" (otros bancos,
    // minúscula) y "Ingrese Email" (mismo banco, mayúscula). Exacto = no engancha inputs
    // ocultos ni el campo "nombre" (el getByPlaceholder con regex sí lo hacía).
    const emailLocator = () => f2.locator('input[placeholder="Ingrese email"], input[placeholder="Ingrese Email"]').first()
    const llenarEmail = async () => {
      const emailVal = process.env.TEK_DEST_EMAIL || ''
      if (!emailVal) return
      // Busca el campo email en CUALQUIER frame (no solo f2): en algunas empresas (TEF clásico,
      // ej. IMP JURI) vive en otro frame y con el locator viejo quedaba vacío → "faltan email".
      let loc = emailLocator()
      if (!(await loc.count().catch(() => 0))) {
        for (const f of page.frames()) {
          const c = f.locator('#email, input[placeholder="Ingrese email"], input[placeholder="Ingrese Email"]').first()
          if (await c.count().catch(() => 0)) { loc = c; break }
        }
      }
      if (!(await loc.count().catch(() => 0))) { log('✗ no vi el campo email en ningún frame'); return }
      await tipearReal(page, loc, emailVal, 'email')   // mouse real + teclas reales + verifica
      await page.keyboard.press('Tab').catch(() => {})
    }

    if (tipoOtros) {
      // ── OTROS BANCOS: elegir BANCO DESTINO + cuenta/rut/nombre/email/mensaje (SIN moneda
      //    ni tipo de cuenta; "Tipo transferencia" queda en "En línea" por defecto). ──
      const bancoTxt = process.env.TEK_DEST_BANCO || ''
      if (bancoTxt) {
        // 1) BANCO DESTINO: dropdown "Seleccione Banco Destino" → elegir el banco por nombre.
        const bancoDrop = f2.getByText(/seleccione banco destino/i).first()
        if (await bancoDrop.count().catch(() => 0)) { await clickHumano(page, bancoDrop); await sleep(rnd(900, 1500)) }
        const key = bancoTxt.replace(/^banco\s+/i, '').trim()   // "Banco Falabella" → "Falabella"
        // si el dropdown trae buscador, tipear el nombre para filtrar
        for (const f of page.frames()) {
          const search = f.locator('input[type="search"], input[placeholder*="banco" i], input[placeholder*="buscar" i]').first()
          if (await search.isVisible().catch(() => false)) { await search.type(key, { delay: rnd(80, 150) }).catch(() => {}); await sleep(rnd(800, 1300)); break }
        }
        let elegido = false
        const keyRe = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        for (const f of page.frames()) {
          const opt = f.getByText(keyRe).filter({ hasNotText: /seleccione/i }).first()
          if (await opt.isVisible().catch(() => false)) { await clickHumano(page, opt); elegido = true; break }
        }
        log('banco destino elegido (' + key + '):', elegido)
        await sleep(rnd(700, 1100))
      }
      // 2) cuenta / rut / nombre / email / mensaje — por PLACEHOLDER exacto vía JS (robusto,
      //    sin corrimiento de foco). El email caía en "nombre" y el mensaje en "email" con type().
      await fillByPlaceholder('Ingrese cuenta destino', process.env.TEK_DEST_CUENTA); await sleep(rnd(800, 1300))
      await fillByPlaceholder('Ingrese RUT', process.env.TEK_DEST_RUT); await sleep(rnd(300, 600))
      await fillByPlaceholder('Ingrese nombre', process.env.TEK_DEST_NOMBRE); await sleep(rnd(300, 600))
      const emOk = await fillByPlaceholder('Ingrese email', process.env.TEK_DEST_EMAIL); await sleep(rnd(300, 600))
      await fillByPlaceholder('Ingrese mensaje', process.env.TEK_DEST_MSG || process.env.TEK_MOTIVO || 'Transferencia')
      log('otros bancos: campos por placeholder llenados · email ok=' + emOk)
    } else {
      // ── MISMO BANCO (Santander→Santander): cuenta + MONEDA (autocomplete) + rut/nombre/email/mensaje ──
      await setVal('input[placeholder*="cuenta destino" i]', process.env.TEK_DEST_CUENTA)
      await page.keyboard.press('Tab').catch(() => {})
      await sleep(rnd(1200, 2000))
      const monedaTxt = process.env.TEK_DEST_MONEDA || 'PESOS'
      const monLoc = f2.locator('#moneda').first()
      if (await monLoc.count().catch(() => 0)) {
        await monLoc.click().catch(() => {}); await sleep(rnd(250, 500))
        await monLoc.fill('').catch(() => {})
        await monLoc.type(monedaTxt, { delay: rnd(90, 160) }).catch(() => {})
        await sleep(rnd(1000, 1600))
        let elegida = false
        for (const f of page.frames()) {
          const opt = f.getByText(/pesos\s+de\s+chile|pesos\s+chilenos|\bCLP\b/i).filter({ hasNotText: /ingrese/i }).first()
          if (await opt.isVisible().catch(() => false)) { await clickHumano(page, opt); elegida = true; break }
        }
        if (!elegida) { await monLoc.press('ArrowDown').catch(() => {}); await sleep(350); await monLoc.press('Enter').catch(() => {}) }
        await sleep(rnd(500, 900))
      }
      await setVal('#rut', process.env.TEK_DEST_RUT)
      await setVal('#nombre', process.env.TEK_DEST_NOMBRE)
      await llenarEmail()
      await setVal('#mensaje', process.env.TEK_DEST_MSG || process.env.TEK_MOTIVO || 'Transferencia')
    }
    await sleep(rnd(600, 1200))
    await page.screenshot({ path: join(DATA, 'crear-03-destino-lleno.png') }).catch(() => {})
    writeFileSync(join(DATA, 'crear-destino-lleno.json'), JSON.stringify({ url: page.url(), forms: await volcarFrames(page) }, null, 2))

    // 4) VERIFICAR que los campos clave quedaron poblados ANTES de apretar Crear
    //    (la moneda llegaba tarde por el autocomplete → esperamos hasta 8s a que asiente)
    let campos = {}
    for (let i = 0; i < 8; i++) {
      const emailV = await emailLocator().inputValue().catch(() => '')
      if (tipoOtros) {
        // otros bancos: NO hay moneda; exigimos cuenta/rut/nombre/email (el banco destino se
        // eligió del dropdown). Leemos por placeholder (mismos campos que se llenaron por JS).
        campos = {
          cuenta: await valByPlaceholder('Ingrese cuenta destino'),
          rut: await valByPlaceholder('Ingrese RUT'),
          nombre: await valByPlaceholder('Ingrese nombre'),
          email: await valByPlaceholder('Ingrese email'),
        }
        if (campos.cuenta && campos.rut && campos.nombre && campos.email) break
      } else {
        campos = {
          cuenta: await val('input[placeholder*="cuenta destino" i]'),
          moneda: await val('#moneda'),
          rut: await val('#rut'),
          nombre: await val('#nombre'),
          email: emailV,
        }
        if (campos.cuenta && campos.moneda && campos.rut && campos.nombre && campos.email) break
      }
      await sleep(1000)
    }
    log('destino poblado:', JSON.stringify(campos))
    const faltan = Object.entries(campos).filter(([, v]) => !v).map(([k]) => k)
    if (faltan.length) {
      log('✗ faltan campos antes de Crear:', faltan.join(','))
      await page.screenshot({ path: join(DATA, 'crear-04-resultado.png') }).catch(() => {})
      return { estado: 'no_creada', motivo: 'campos_incompletos', faltan, campos, url: page.url() }
    }

    if (modo === 'llenar') { log('LLENO paso 2 — DETENIDO antes de Crear (revisá el screenshot)'); return { estado: 'lleno_sin_crear', url: page.url() } }

    // 5) CREAR (crea la transferencia PENDIENTE, no libera, no mueve plata)
    const crearBtn = f2.getByText(/^crear$/i).first()
    const bb = await crearBtn.boundingBox().catch(() => null)
    if (bb) { await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 12 }); await sleep(rnd(250, 550)); await page.mouse.down(); await sleep(60); await page.mouse.up(); log('CREAR clickeado') }
    else { log('no vi el botón Crear'); return { estado: 'sin_boton_crear', url: page.url() } }

    // 5b) Si sale un MODAL de aviso (antifraude / info de 1ª transferencia a cuenta nueva),
    //     leerlo y apretarle "Aceptar". Misma rutina robusta que TEFUN (todos los frames).
    let alertaBanco = ''
    for (let k = 0; k < 3; k++) {
      let m = ''
      for (const f of page.frames()) {
        const t = await f.evaluate(() => {
          const el = [...document.querySelectorAll('[class*="modal" i],[role="dialog"],[class*="alert" i],[class*="popup" i],[class*="swal" i]')]
            .find((e) => e.offsetParent !== null && (e.innerText || '').trim().length > 8)
          return el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : ''
        }).catch(() => '')
        if (t) { m = t; break }
      }
      if (!m) break
      alertaBanco = m
      const cerrado = await aceptarModalAlerta(page, log)
      log('TEF modal →', alertaBanco.slice(0, 100), cerrado ? '(Aceptar)' : '(sin botón)')
      if (!cerrado) break
      await sleep(rnd(800, 1500))
    }

    // 6) DETECTAR EL RESULTADO REAL — NO dar por creada solo por haber apretado el botón.
    const OK_RE = /pendiente|autoriz|por\s+liberar|comprobante|solicitud\s+(de\s+)?transfer|se\s+(ha\s+)?cre[oó]|ha\s+sido\s+creada|creada\s+con\s+[eé]xito|creada|exitos|realizada con [eé]xito|registrada/i
    const ERRC_RE = /obligatori|requerid|debe\s+ingresar|ingrese\s+un|inv[aá]lid|no\s+coincide|insuficient|excede|no\s+se\s+pudo|rechaz|super[oó]\s+el\s+monto|fuera\s+de\s+horario|monto\s+m[ií]nimo/i
    let veredicto = null, pista = ''
    const dlv = Date.now() + 30_000
    while (Date.now() < dlv) {
      let txt = ''
      for (const f of page.frames()) txt += (await f.locator('body').innerText().catch(() => '') || '').slice(0, 1400) + ' '
      txt = txt.replace(/\s+/g, ' ')
      if (ERRC_RE.test(txt)) { veredicto = 'no_creada'; pista = (txt.match(new RegExp('.{0,50}(?:' + ERRC_RE.source + ').{0,50}', 'i')) || [''])[0].trim(); break }
      if (OK_RE.test(txt)) { veredicto = 'creada'; pista = (txt.match(new RegExp('.{0,40}(?:' + OK_RE.source + ').{0,50}', 'i')) || [''])[0].trim(); break }
      await sleep(1500)
    }
    await page.screenshot({ path: join(DATA, 'crear-04-resultado.png') }).catch(() => {})
    writeFileSync(join(DATA, 'crear-resultado.json'), JSON.stringify({ url: page.url(), veredicto, pista, forms: await volcarFrames(page) }, null, 2))
    if (!veredicto) {
      // sin texto claro: si SIGUE visible el botón "Crear" del mismo form → no avanzó.
      const sigueForm = await f2.getByText(/^crear$/i).first().isVisible().catch(() => false)
      veredicto = sigueForm ? 'no_creada' : 'creada'
      pista = sigueForm ? 'el formulario no avanzó (sigue el botón Crear)' : 'avanzó, sin texto reconocible'
    }
    // Si NO se creó y el banco había mostrado un aviso de LÍMITE, reportar el MOTIVO EXACTO
    // (cuenta nueva $250k vs. exceso de límite/monto diario) → Nexus no reintenta a ciegas.
    if (veredicto === 'no_creada') {
      const claseTEF = clasificarAlerta(alertaBanco)
      if (claseTEF === 'limite_primera_vez') { log('TEF: TOPE 1ª vez'); return { estado: 'limite_primera_vez', pendiente: false, alerta_banco: alertaBanco.slice(0, 240), nota: 'El banco NO deja la 1ª transferencia a esta cuenta NUEVA sobre $250.000 (protección antifraude, primeras 24h). La cuenta NO está bloqueada. Opciones: enviar $250.000 o menos ahora, o esperar 24h para el monto completo.', url: page.url() } }
      if (claseTEF === 'limite_diario') { log('TEF: EXCESO límite diario'); return { estado: 'limite_diario', pendiente: false, alerta_banco: alertaBanco.slice(0, 240), nota: 'El banco frenó por EXCESO de límite/monto diario (el giro supera el cupo del día, típico $5.000.000). La cuenta NO está bloqueada ni el destinatario es nuevo. Opciones: bajar el monto, partirlo en varios días, o usar TRANSFERENCIA MASIVA.', url: page.url() } }
    }
    log(`resultado creación: ${veredicto} — ${pista}`)
    return { estado: veredicto, pista, url: page.url() }
  }
  return { estado: 'mapeado_destino', inputs_destino: nIn, url: page.url() }
}

// VER TRANSFERENCIAS PENDIENTES / CREADAS (TEK_VER_PENDIENTES=1) — SOLO LECTURA. Entra a la
// empresa, abre Transferencias → Autorización (Transferencias Express) y vuelca la lista para
// ver qué transferencias quedaron "por autorizar". NUNCA autoriza ni libera (no toca Superclave).
async function verPendientes(page, log) {
  const filas = []
  // Parsea CUALQUIER tabla visible con montos ($) en filas → {rut,nombre,banco,monto,estado,fecha}.
  const parseTabla = async (tipo) => {
    for (const f of page.frames()) {
      const rows = await f.evaluate(() => {
        const out = []
        for (const tr of document.querySelectorAll('tr')) {
          const cells = [...tr.querySelectorAll('td')].map((td) => (td.innerText || '').replace(/\s+/g, ' ').trim()).filter((c) => c !== '')
          if (cells.length >= 2 && /\$\s?[\d.]+/.test(cells.join(' '))) out.push(cells)
        }
        return out
      }).catch(() => [])
      for (const cells of rows) {
        const j = cells.join(' | ')
        const monto = (j.match(/\$\s?[\d.]+/) || [])[0] || ''
        if (!monto) continue
        const rut = (j.match(/\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/) || [])[0] || ''
        const fecha = (j.match(/\d{4}\/\d{2}\/\d{2}(?:\s+\d{2}:\d{2}:\d{2})?/) || [])[0] || ''
        const estado = (j.match(/por autorizar|por confirmar|por liberar|autorizada|liberada|rechazada|eliminada|pendiente[a-zñ ]*/i) || [''])[0].trim()
        const banco = (j.match(/banco [^|]+/i) || [''])[0].trim()
        const nombre = cells.find((c) => /[a-zñáéíóú]/i.test(c) && !/banco|santander|\$|autoriz|pendiente|liberar|confirmar|rechaz|cuenta corriente|moneda extranjera|l[ií]nea de cr[eé]dito/i.test(c) && !/\d{4}\/\d{2}/.test(c) && c.replace(/[^a-záéíóúñ]/gi, '').length >= 5) || ''
        // Solo filas que parezcan una TRANSFERENCIA (RUT, fecha o estado pendiente) — descarta saldos.
        if (!rut && !fecha && !/autoriz|confirmar|liberar|pendiente|rechaz/i.test(estado)) continue
        filas.push({ tipo, rut, nombre, banco, monto, estado, fecha })
      }
    }
  }
  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  await sleep(8000)
  await entrarEmpresa(page, log, process.env.TEK_EMPRESA || 'ANA CLARA')
  await sleep(rnd(3000, 4500))
  try { await cerrarPopups(page, log) } catch { /* */ }   // saca el modal "Actualiza tu Clave"
  await sleep(rnd(1200, 2200))
  // Abre el menú Transferencias y clickea el 1er item de la lista que matchee.
  const irA = async (labels) => {
    const menu = page.getByText(/^transferencias?$/i).first()
    await clickHumano(page, menu); await sleep(rnd(3500, 5000))
    for (const lab of labels) {
      // El item del menú es un TEXTO dentro de un <a> (o li con handler): clickear el texto NO
      // dispara el router del SPA. Buscamos el ANCESTRO clickable real y lo clickeamos de verdad.
      const clicked = await page.evaluate((rx) => {
        const re = new RegExp('^\\s*' + rx + '\\s*$', 'i')
        const hit = [...document.querySelectorAll('a,[role="menuitem"],li,span,div,button')]
          .find((e) => re.test((e.textContent || '').replace(/\s+/g, ' ').trim()) && e.offsetParent !== null)
        if (!hit) return false
        const target = hit.closest('a,[href],[role="menuitem"],button') || hit
        target.scrollIntoView({ block: 'center' })
        target.click()
        return true
      }, lab).catch(() => false)
      if (clicked) { await sleep(rnd(8000, 11_000)); return lab }
    }
    return null
  }
  // 1) INDIVIDUAL: la lista de pendientes está en "Autorización" o "Liberación" según el rol/menú.
  const it1 = await irA(['Autorizaci[oó]n', 'Liberaci[oó]n'])
  log('pendientes individual → item:', it1 || '(no encontrado)')
  await page.screenshot({ path: join(DATA, 'pend-01-lista.png') }).catch(() => {})
  try { await parseTabla('transferencia') } catch (e) { log('parse individual falló:', e.message) }
  let txt = ''
  for (const f of page.frames()) txt += (await f.locator('body').innerText().catch(() => '') || '') + '\n'
  try { writeFileSync(join(DATA, 'pendientes.txt'), txt) } catch { /* */ }
  // 2) MASIVA (best-effort): "Consulta" (Transferencias Masivas) muestra los lotes y su estado.
  try {
    const it2 = await irA(['Consulta'])
    log('pendientes masiva → item:', it2 || '(no encontrado)')
    if (it2) await parseTabla('masiva')
    await page.screenshot({ path: join(DATA, 'pend-02-masiva.png') }).catch(() => {})
  } catch (e) { log('masiva consulta (best-effort) falló:', e.message) }
  // Nos quedamos con las PENDIENTES (por autorizar/confirmar/liberar) — o todas si no traen estado.
  const pend = filas.filter((f) => !f.estado || /autoriz|confirmar|liberar|pendiente/i.test(f.estado))
  const out = pend.length ? pend : filas
  // ¿Llegamos DE VERDAD a una lista de pendientes? (para NO decir "no hay" cuando la nav falló o
  // la sesión se cayó — que devolvería filas vacías sin haber abierto la lista).
  const llego = out.length > 0 || /autorizaci[oó]n transferencias|rut destinatario|por autorizar|por liberar|registros por autorizar|seleccione los registros|no hay registros|no existen registros/i.test(txt)
  log(`pendientes: ${filas.length} filas, ${pend.length} pendientes, llego_a_lista=${llego}`)
  return { estado: 'pendientes_vistos', filas: out, total: out.length, llego, texto: txt.slice(0, 3500), url: page.url() }
}

// ¿Existe YA una transferencia pendiente al RUT destino (y monto)? Verificación REAL en la
// lista de Autorización. Devuelve true/false. Anti-duplicado + confirmación de creación.
// Clasifica el texto de un modal/alerta que muestra el banco tras dar Crear/Continuar en una
// transferencia. Distingue DOS antifraudes de monto: (a) 1ª transferencia a una cuenta NUEVA
// (tope $250.000 por 24h) y (b) EXCESO de límite/monto diario (cuenta conocida, giro grande sobre
// el cupo del día, típico $5.000.000). También "ya hay una pendiente" y errores de datos.
// Devuelve: 'ya_pendiente' | 'limite_primera_vez' | 'limite_diario' | 'aviso_info' | 'error' | 'ok' | null.
function clasificarAlerta(texto) {
  const t = String(texto || '').toLowerCase().replace(/\s+/g, ' ')
  if (!t) return null
  if (/pendientes?\s+a\s+este\s+beneficiario/.test(t)) return 'ya_pendiente'
  // AVISO INFORMATIVO (no bloquea): "primera transferencia a cuenta nueva no podrá exceder
  // $50.000.000" + "próxima en 4 hrs". Hay que ACEPTARLO y seguir; el monto de $1 pasa igual.
  if (/50[.\s]?000[.\s]?000/.test(t) && /(4\s*h|4\s*hor)/.test(t) && /primera|nueva\s+cuenta/.test(t)) return 'aviso_info'
  if (/le\s+informamos|por\s+su\s+seguridad/.test(t) && /pr[oó]xima\s+transferencia/.test(t) && !/\$?\s*250[.\s]?000/.test(t)) return 'aviso_info'
  // (a) CUENTA NUEVA: menciona $250.000, o "primera transferencia / nuevo destinatario" + tope/24h.
  const habla250 = /\$?\s*250[.\s]?000/.test(t)
  const primeraVez = /(primera|1[ªa.]?)\s+transferencia|nuevo\s+(destinatario|beneficiario)|reci[eé]n\s+(agregad|inscrit|cread)/.test(t)
  const topeMonto = /monto\s+m[aá]xim|excede|supera|no\s+puede\s+(ser\s+)?superior|l[ií]mite\s+de\s+monto|permitido/.test(t)
  const veinticuatro = /24\s*h|24\s*hor|primeras?\s+24/.test(t)
  if (habla250 || (primeraVez && (topeMonto || veinticuatro) && !/50[.\s]?000[.\s]?000/.test(t))) return 'limite_primera_vez'
  // (b) EXCESO DE LÍMITE / MONTO DIARIO (cuenta conocida): "límite diario", "monto diario",
  //     "excede/supera el límite/cupo/máximo", "$5.000.000", "cupo diario/insuficiente".
  const limiteDiario = /l[ií]mite\s+(diario|del?\s+d[ií]a|de\s+transfer|permitido|disponible|autorizado)|monto\s+diario|m[aá]ximo\s+diario|excede\s+(el\s+)?(l[ií]mite|monto|m[aá]xim|cupo|saldo\s+disponible)|supera\s+(el\s+)?(l[ií]mite|monto|m[aá]xim|cupo)|cupo\s+(diario|disponible|insuficiente)|\$?\s*5[.\s]?000[.\s]?000/.test(t)
  if (limiteDiario) return 'limite_diario'
  if (/pendiente|por\s+autoriz|por\s+liberar|se\s+(ha\s+)?cre[oó]|creada|exitos|realizada/.test(t)) return 'ok'
  if (/obligatori|requerid|inv[aá]lid|no\s+coincide|rechaz|no\s+se\s+pudo|error/.test(t)) return 'error'
  return null
}

// Apreta "Aceptar" en el modal/alerta de seguridad del banco (TEF y TEFUN).
// Fallo recurrente: el aviso $50M/4h queda abierto → tefun_no_confirmada. Causas típicas:
// modal position:fixed (offsetParent=null), botón en iframe (coords mal sumadas), o Angular
// ignorando .click() sin force. Acá: force+iframe offset+DOM events+verificación de cierre.
async function aceptarModalAlerta(page, log) {
  const hayModal = async () => {
    for (const f of page.frames()) {
      const t = await f.evaluate(() => {
        const visibles = (e) => {
          const r = e.getBoundingClientRect()
          return r.width > 40 && r.height > 40
        }
        const m = [...document.querySelectorAll('[class*="modal" i],[role="dialog"],[class*="alert" i],[class*="popup" i],[class*="swal" i],[class*="overlay" i],.ui-dialog')]
          .find((e) => visibles(e) && /aceptar/i.test(e.innerText || ''))
        if (m) return (m.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200)
        // A veces el diálogo no trae "modal" en la clase: basta un botón Aceptar grande centrado
        const btn = [...document.querySelectorAll('button, a, [role="button"], .btn, input[type="button"]')]
          .find((e) => visibles(e) && /^\s*aceptar\s*$/i.test((e.innerText || e.textContent || e.value || '').replace(/\s+/g, ' ').trim()))
        return btn ? 'aceptar' : ''
      }).catch(() => '')
      if (t) return t
    }
    return ''
  }
  const clickCoords = async (fr, localX, localY) => {
    // Coords del evaluate son del viewport del frame; page.mouse usa el page → sumar offset del iframe.
    let ox = 0, oy = 0
    try {
      if (fr !== page.mainFrame()) {
        const el = await fr.frameElement()
        const fb = await el.boundingBox()
        if (fb) { ox = fb.x; oy = fb.y }
      }
    } catch { /* main frame u orphan */ }
    await page.mouse.move(ox + localX, oy + localY, { steps: 8 })
    await sleep(rnd(160, 320)); await page.mouse.down(); await sleep(50); await page.mouse.up()
  }
  const clickAceptarEn = async (fr) => {
    const sels = [
      fr.getByRole('button', { name: /^\s*aceptar\s*$/i }).first(),
      fr.locator('button, a, [role="button"], .btn, input[type="button"], input[type="submit"]').filter({ hasText: /^\s*aceptar\s*$/i }).first(),
      fr.getByText(/^\s*aceptar\s*$/i).first(),
    ]
    for (const loc of sels) {
      if (!(await loc.isVisible({ timeout: 350 }).catch(() => false))) continue
      try { await loc.click({ timeout: 2500, force: true }); return true } catch { /* sigue */ }
      try { await loc.evaluate((el) => { el.click(); el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })) }); return true } catch { /* sigue */ }
      const bb = await loc.boundingBox().catch(() => null)
      if (bb) {
        // boundingBox de Playwright YA viene en coords de página
        await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 8 })
        await sleep(rnd(160, 300)); await page.mouse.down(); await sleep(50); await page.mouse.up()
        return true
      }
    }
    // DOM + eventos de puntero (Angular/Santander a veces ignora locator.click)
    const domOk = await fr.evaluate(() => {
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim()
      const esAceptar = (el) => {
        const t = norm(el.innerText || el.textContent || el.value || '')
        return /^\s*aceptar\s*$/i.test(t) || (t.length <= 12 && /^aceptar$/i.test(t))
      }
      const visto = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
      const disparar = (el) => {
        try { el.scrollIntoView({ block: 'center', inline: 'center' }) } catch { /* */ }
        const r = el.getBoundingClientRect()
        const x = r.left + r.width / 2, y = r.top + r.height / 2
        for (const tipo of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
          el.dispatchEvent(new MouseEvent(tipo, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }))
        }
        try { el.click() } catch { /* */ }
        // ng-click / onclick legado
        try { if (typeof el.onclick === 'function') el.onclick() } catch { /* */ }
      }
      const candidatos = [...document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"], .btn, [ng-click], [onclick]')]
        .filter((e) => visto(e) && esAceptar(e))
      for (const btn of candidatos) { disparar(btn); return { ok: true, x: btn.getBoundingClientRect().left + btn.getBoundingClientRect().width / 2, y: btn.getBoundingClientRect().top + btn.getBoundingClientRect().height / 2 } }
      // Hoja de texto "Aceptar" dentro de un contenedor clickeable
      const hoja = [...document.querySelectorAll('span, div, label, p, td')]
        .find((e) => e.childElementCount === 0 && visto(e) && esAceptar(e))
      if (hoja) {
        const clickable = hoja.closest('button, a, [role="button"], .btn, [ng-click]') || hoja
        disparar(clickable)
        const r = clickable.getBoundingClientRect()
        return { ok: true, x: r.left + r.width / 2, y: r.top + r.height / 2 }
      }
      return { ok: false }
    }).catch(() => ({ ok: false }))
    if (domOk?.ok) {
      if (domOk.x != null) await clickCoords(fr, domOk.x, domOk.y)
      return true
    }
    return false
  }

  let alguna = false
  for (let k = 0; k < 6; k++) {
    const antes = await hayModal()
    if (!antes) return alguna
    let ok = false
    const frames = [...page.frames()].reverse()
    for (const fr of frames) {
      if (await clickAceptarEn(fr)) { ok = true; break }
    }
    // Último recurso: coords locales del frame + offset del iframe
    if (!ok) {
      for (const fr of frames) {
        const box = await fr.evaluate(() => {
          const esAceptar = (el) => /^\s*aceptar\s*$/i.test((el.innerText || el.textContent || el.value || '').replace(/\s+/g, ' ').trim())
          const btn = [...document.querySelectorAll('button, a, [role="button"], .btn, input[type="button"], span, div')]
            .find((b) => esAceptar(b) && b.getBoundingClientRect().width > 0)
          if (!btn) return null
          const r = (btn.closest('button, a, [role="button"], .btn') || btn).getBoundingClientRect()
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        }).catch(() => null)
        if (box) {
          await clickCoords(fr, box.x, box.y)
          ok = true; break
        }
      }
    }
    if (!ok) {
      if (log) log('  modal → Aceptar NO encontrado (intento ' + (k + 1) + ')')
      // Dump de botones visibles para diagnosticar el próximo fallo
      try {
        const dump = []
        for (const fr of frames) {
          const rows = await fr.evaluate(() => [...document.querySelectorAll('button, a, [role="button"], .btn, input[type="button"]')]
            .filter((e) => e.getBoundingClientRect().width > 0)
            .slice(0, 30)
            .map((e) => ({ tag: e.tagName, txt: (e.innerText || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 40), cls: (e.className || '').toString().slice(0, 60) }))
          ).catch(() => [])
          dump.push(...rows)
        }
        writeFileSync(join(DATA, 'crear-modal-botones.json'), JSON.stringify({ ts: new Date().toISOString(), dump }, null, 2))
      } catch { /* */ }
      break
    }
    alguna = true
    if (log) log('  modal → Aceptar (intento ' + (k + 1) + ')')
    await sleep(rnd(1800, 2800))
    // Si el modal sigue, reintentar (click "fantasma" que no cerró)
    if (!(await hayModal())) return true
  }
  return alguna && !(await hayModal())
}

async function existePendiente(page, log, rutDest, monto, cuentaDest) {
  try {
    const r = await verPendientes(page, log)
    const txt = (r.texto || '')
    const txtDig = txt.replace(/\D/g, '')
    const cuentaNorm = String(cuentaDest || '').replace(/\D/g, '').replace(/^0+/, '') || ''
    const cuentaRaw = String(cuentaDest || '').replace(/\D/g, '')
    // Casar por cuenta (con/sin ceros a la izquierda) o cola de 6–8 dígitos.
    if (cuentaRaw.length >= 6) {
      const tails = [cuentaRaw.slice(-8), cuentaRaw.slice(-7), cuentaRaw.slice(-6), cuentaNorm.slice(-8), cuentaNorm.slice(-7)].filter((t) => t && t.length >= 6)
      const hay = txtDig.includes(cuentaRaw) || (cuentaNorm && txtDig.includes(cuentaNorm)) || tails.some((t) => txtDig.includes(t))
      // Refuerzo: RUT + monto en la misma página (misma transferencia)
      const rutNorm = String(rutDest || '').replace(/[^0-9kK]/g, '')
      const montoDig = String(monto || '').replace(/\D/g, '')
      const hayRutMonto = rutNorm.length >= 7 && montoDig && txt.replace(/[.\-\s]/g, '').includes(rutNorm) && (txtDig.includes(montoDig) || txt.includes('$' + Number(monto).toLocaleString('es-CL')) || txt.includes('$ ' + montoDig) || txt.includes('$'+montoDig))
      const ok = hay || hayRutMonto
      log(`existePendiente cuenta=${cuentaRaw} tails=${tails.join(',')}:`, hay, 'rut+monto:', !!hayRutMonto, '→', ok)
      return ok
    }
    const rutNorm = String(rutDest || '').replace(/[^0-9kK]/g, '')
    const rutFmt = rutNorm.length > 1 ? rutNorm.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + rutNorm.slice(-1) : rutNorm
    const hayRut = rutNorm && (txt.replace(/[.\-\s]/g, '').includes(rutNorm) || txt.includes(rutFmt))
    log(`existePendiente rut=${rutFmt} (sin cuenta):`, hayRut)
    return !!hayRut
  } catch (e) { log('existePendiente falló:', e.message); return false }
}

// MODO SUPERCLAVE (Opción B, TEK_SUPERCLAVE=1): cuando el banco pide el 2º factor tras
// "Aceptar", volcamos el prompt (para ver qué pide), esperamos el/los código(s) en un
// archivo (que escribe el asistente cuando el humano se los pasa), los tecleamos humano
// en el/los input(s) visibles y confirmamos. Soporta 1 código o varias coordenadas
// (separadas por espacio/coma, en el orden en que aparecen los casilleros).
async function llenarSuperclave(page, log) {
  const SC_FILE = process.env.TEK_SC_FILE || '/tmp/tek-sc.txt'
  try { writeFileSync(SC_FILE, '') } catch {}   // limpiar código viejo antes de pedir
  // 1) volcar el prompt del 2º factor (screenshot + inputs) para saber qué pide
  const campos = []
  for (const f of page.frames()) {
    const ins = await f.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 }
      return [...document.querySelectorAll('input')].filter(vis)
        .filter((el) => !['hidden', 'checkbox', 'radio', 'submit', 'button'].includes(el.type))
        .map((el) => ({ type: el.type || '', id: el.id || '', name: el.name || '', ph: el.placeholder || '', ml: el.getAttribute('maxlength') || '' }))
    }).catch(() => [])
    if (ins.length) campos.push({ frame: f.url(), inputs: ins })
  }
  writeFileSync(join(SHOTS, 'mfa-prompt.json'), JSON.stringify(campos, null, 2))
  await page.screenshot({ path: join(SHOTS, 'mfa-prompt.png') }).catch(() => {})
  const nInputs = campos.reduce((a, c) => a + c.inputs.length, 0)
  log(`SUPERCLAVE_LISTA inputs=${nInputs} — esperando código en ${SC_FILE}`)
  // 2) esperar el/los código(s) (hasta 4 min)
  const dl = Date.now() + 240_000
  let code = ''
  while (Date.now() < dl) {
    if (page.isClosed()) return false
    try { code = readFileSync(SC_FILE, 'utf8').trim() } catch { code = '' }
    if (code) break
    await sleep(1500)
  }
  if (!code) { log('superclave: no llegó el código en 4 min'); return false }
  const partes = code.split(/[\s,;]+/).filter(Boolean)
  log(`superclave recibida (${partes.length} valor/es) — tecleando…`)
  // 3) llenar el/los input(s) visibles vacíos, en orden, tecleo humano
  let idx = 0
  for (const f of page.frames()) {
    if (idx >= partes.length) break
    const locs = f.locator('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button])')
    const n = await locs.count().catch(() => 0)
    for (let i = 0; i < n && idx < partes.length; i++) {
      const el = locs.nth(i)
      if (!(await el.isVisible().catch(() => false))) continue
      if (await el.inputValue().catch(() => 'x')) continue   // ya tiene algo
      await el.click().catch(() => {}); await sleep(rnd(160, 360))
      await humanType(page, partes[idx]); idx++
    }
  }
  log(`superclave: tecleé ${idx}/${partes.length} valor(es)`)
  await sleep(rnd(500, 1100))
  // 4) confirmar
  const btn = await firstVisible(page, ['button:has-text("Aceptar")', 'button:has-text("Continuar")', 'button:has-text("Ingresar")', 'button:has-text("Validar")', 'button:has-text("Enviar")', 'button[type="submit"]', '#doLoginButton'])
  if (btn) { await moveToLoc(page, btn); await sleep(rnd(220, 520)); await clickReal(page); log('superclave confirmada (Aceptar)') }
  else log('superclave: no encontré botón de confirmar (probá por VNC)')
  try { writeFileSync(SC_FILE, '') } catch {}
  return true
}

// ── IMPORTACIÓN MASIVA (Transferencias Masivas → Importación) ───────────────────
// TEK_MASIVA=map   → navega y VUELCA la pantalla (busca link "descargar plantilla" +
//                    input de archivo) para construir el formato exacto.
// TEK_MASIVA=subir + TEK_MASIVA_FILE=<ruta .xlsx> → sube el archivo (crea el LOTE;
//                    NO libera, no mueve plata: la liberación es aparte y manual).
async function masivaImportar(page, log) {
  mkdirSync(DATA, { recursive: true })
  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  await sleep(8000)
  await entrarEmpresa(page, log, process.env.TEK_EMPRESA || 'ANA CLARA')
  await sleep(rnd(3000, 5000)); await idle(page, rnd(800, 1600))
  // Cerrar el popup "Actualiza tu Clave" que intercepta los clics del dashboard (aparece en
  // algunas sesiones, ej. Nico). Sin esto, el clic en "Importación" no aterriza y la subida
  // queda en sin_frame_importacion. En sesiones sin popup (ej. Ana Clara) es no-op.
  try { await cerrarPopups(page, log) } catch { /* */ }
  await sleep(rnd(800, 1600))
  const menu = page.getByText(/^transferencias?$/i).first()
  await clickHumano(page, menu)
  await sleep(rnd(4000, 5500))
  await page.screenshot({ path: join(DATA, 'masiva-00-menu.png') }).catch(() => {})
  // "Transferencias Masivas → Importación" por TEXTO (geometría header+columna).
  let entro = await clickColumna(page, /^Transferencias Masivas$/i, /^Importaci[oó]n$/i, log)
  // Fallback ROBUSTO: "Importación" es ÚNICA en este menú (solo cuelga de Transferencias
  // Masivas), así que la clickeamos DIRECTO en cualquier frame, reintentando ~20s (el flyout
  // puede tardar en pintar). Reemplaza al viejo clic por píxel, que apuntaba a otra fila.
  for (let i = 0; i < 10 && !entro; i++) {
    for (const f of page.frames()) {
      const loc = f.getByText(/^\s*Importaci[oó]n\s*$/i).first()
      if (await loc.count().catch(() => 0)) {
        const ok = await clickHumano(page, loc).catch(() => false)
        if (ok !== false) { entro = true; log('masiva: clic Importación directo (frame)'); break }
      }
    }
    if (!entro) await sleep(2000)
  }
  if (!entro) log('masiva: NO pude clickear Importación (ni columna ni directo)')
  await sleep(9000); await idle(page, rnd(800, 1600))
  await page.screenshot({ path: join(DATA, 'masiva-01-import.png') }).catch(() => {})
  // Volcar pantalla: inputs (file), links (plantilla), botones, texto.
  const dump = []
  for (const f of page.frames()) {
    const d = await f.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 }
      const inputs = [...document.querySelectorAll('input')].map((e) => ({ type: e.type, id: e.id, name: e.name, accept: e.getAttribute('accept') || '', vis: vis(e) }))
      const links = [...document.querySelectorAll('a')].map((a) => ({ text: (a.innerText || '').trim().slice(0, 70), href: a.href || '' })).filter((x) => x.text || /\.xls|plantilla|formato|descarg/i.test(x.href))
      const botones = [...document.querySelectorAll('button,[role="button"],[class*="btn"]')].map((b) => (b.innerText || '').trim()).filter((t) => t && t.length < 45)
      const textos = (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 900)
      return { url: location.href, inputs, links, botones, textos }
    }).catch(() => null)
    if (d && (d.inputs.length || d.links.length || d.botones.length)) dump.push(d)
  }
  writeFileSync(join(DATA, 'masiva-import.json'), JSON.stringify({ url: page.url(), dump }, null, 2))
  log('masiva importación mapeada · frames con contenido:', dump.length)

  const archivo = process.env.TEK_MASIVA_FILE
  if (process.env.TEK_MASIVA === 'subir' && archivo) {
    // Frame de la importación (eob TEFM) — el que tiene el input de archivo. La navegación al
    // form es FLAKY (~1 de cada 2 se queda en el dashboard, carrera con el latido cuando se
    // comparte la sesión de ramon): si no aparece, RE-NAVEGO completo (dashboard → re-entrar
    // empresa → reabrir menú → Importación) y reintento hasta 3 veces en total. Antes fallaba
    // al primer traspié → el lote no se subía y el usuario veía "no se creó".
    const buscarFrameImport = async () => {
      for (const f of page.frames()) {
        if (await f.locator('input[type="file"]').first().count().catch(() => 0)) return f
      }
      return null
    }
    const reabrirImportacion = async () => {
      await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
      await sleep(6000)
      await entrarEmpresa(page, log, process.env.TEK_EMPRESA || 'ANA CLARA')
      await sleep(rnd(2500, 4000))
      try { await cerrarPopups(page, log) } catch { /* */ }
      await clickHumano(page, page.getByText(/^transferencias?$/i).first())
      await sleep(rnd(3500, 5000))
      let ok = await clickColumna(page, /^Transferencias Masivas$/i, /^Importaci[oó]n$/i, log)
      for (let i = 0; i < 10 && !ok; i++) {
        for (const f of page.frames()) {
          const loc = f.getByText(/^\s*Importaci[oó]n\s*$/i).first()
          if (await loc.count().catch(() => 0)) { const c = await clickHumano(page, loc).catch(() => false); if (c !== false) { ok = true; break } }
        }
        if (!ok) await sleep(2000)
      }
      await sleep(9000)
    }
    let imp = await buscarFrameImport()
    for (let intento = 1; !imp && intento <= 2; intento++) {
      log(`masiva: no apareció el form de importación → re-navego (intento ${intento + 1}/3)`)
      await reabrirImportacion()
      imp = await buscarFrameImport()
    }
    if (!imp) {
      log('masiva: no encontré el frame de importación (tras 3 intentos)')
      try { registrarIncidente({ flujo: 'masiva', estado: 'sin_frame_importacion', url: page.url(), empresa: process.env.TEK_EMPRESA, user: process.env.TEK_USER, screenshots: ['masiva-00-menu.png', 'masiva-01-import.png', 'masiva-import.json'] }) } catch { /* */ }
      return { estado: 'sin_frame_importacion', url: page.url() }
    }

    // DRY-RUN (TEK_MASIVA_DRY=1): llegamos al FORMULARIO de importación → paramos acá.
    // NO se adjunta archivo, NO se importa, NO se confirma. Solo verifica que la navegación
    // (incl. selector de empresa + cierre de popup) llega bien para esta sesión/empresa.
    if (process.env.TEK_MASIVA_DRY === '1') {
      await page.screenshot({ path: join(DATA, 'masiva-dry-form.png') }).catch(() => {})
      log('masiva DRY: llegué al FORMULARIO de importación (frame OK). NO subo nada ni confirmo.')
      return { estado: 'form_ok', frame_importacion: true, url: page.url() }
    }

    // 1) CONCEPTO ASOCIADO — único campo editable del panel; lo elige el usuario. Si NO se
    //    puede fijar el pedido, ABORTAMOS (no subimos con un concepto equivocado). Todo lo
    //    demás queda por defecto (cuenta origen desde archivo, "Liberada a pago", etc.).
    const concepto = process.env.TEK_MASIVA_CONCEPTO
    if (concepto) {
      let elegido = false
      const CONCEPTOS = ['Pago de Asignaciones', 'Pago de Dividendos', 'Pago de Pensiones', 'Pago de Proveedores', 'Pago de Reembolsos', 'Pago de Remuneraciones', 'Pago de Subsidios', 'Pago de Viáticos', 'Pago Extraordinarios', 'Transferencias Masivas']
      const rxOf = (c) => new RegExp('^\\s*' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i')
      const rx = rxOf(concepto)
      // Cuenta opciones VISIBLES del combo: popup ABIERTO → varias; CERRADO → 1 (solo el valor
      // seleccionado). NO usar una opción fija como centinela: si el concepto elegido ES esa
      // opción (p.ej. "Transferencias Masivas"), queda visible como valor y daba falso "abierto".
      const visiblesCombo = async () => {
        let n = 0
        for (const c of CONCEPTOS) {
          const l = imp.getByText(rxOf(c)).first()
          if ((await l.count().catch(() => 0)) && (await l.isVisible().catch(() => false))) { n++; if (n >= 3) return n }
        }
        return n
      }
      // Reintenta la selección COMPLETA (abrir → clic → verificar) hasta 3 veces: un clic que
      // no aterriza NO debe abortar el lote; recién si tras 3 intentos no se confirma, abortamos.
      for (let vuelta = 0; vuelta < 3 && !elegido; vuelta++) {
        try {
          // Abrir el combo (clic en el valor actual / caret). Reintenta hasta ver varias opciones.
          for (let k = 0; k < 4 && (await visiblesCombo()) < 3; k++) {
            let label = imp.getByText(/^\s*Pago de Asignaciones\s*$/i).first()
            if (!(await label.count().catch(() => 0))) label = imp.getByText(rx).first()   // por si ya tiene otro valor
            if (await label.count().catch(() => 0)) { await label.click({ timeout: 3000 }).catch(() => {}) }
            await sleep(rnd(700, 1200))
          }
          // Clic en la opción pedida — la VISIBLE (hay un valor + la lista; elegir el de la lista).
          const cands = await imp.getByText(rx).all().catch(() => [])
          for (const c of cands) {
            if (await c.isVisible().catch(() => false)) { await c.scrollIntoViewIfNeeded().catch(() => {}); await c.click({ timeout: 4000 }).catch(() => {}); break }
          }
          await sleep(rnd(800, 1300))
          // VERIFICAR: popup CERRADO (≤1 opción visible) Y el valor mostrado ES el concepto pedido.
          const cerrado = (await visiblesCombo()) <= 1
          const valorOK = await imp.getByText(rx).first().isVisible().catch(() => false)
          elegido = cerrado && valorOK
          log(elegido ? ('concepto elegido: ' + concepto) : `concepto: intento ${vuelta + 1} no confirmado (cerrado=${cerrado} valorOK=${valorOK})`)
        } catch (e) { log(`concepto: intento ${vuelta + 1} error:`, e.message) }
        if (!elegido) { await page.keyboard.press('Escape').catch(() => {}); await sleep(rnd(900, 1400)) }
      }
      await page.screenshot({ path: join(DATA, 'masiva-02a-concepto.png') }).catch(() => {})
      if (!elegido) {
        writeFileSync(join(DATA, 'masiva-resultado.json'), JSON.stringify({ estado: 'concepto_no_seteado', concepto, url: page.url() }, null, 2))
        return { estado: 'concepto_no_seteado', creado: false, concepto, nota: 'No pude fijar el concepto en el banco (el dropdown no cerró la selección); NO subí el lote para no usar uno equivocado.', url: page.url() }
      }
    }

    // 2) Adjuntar el .xlsx.
    const fileInput = imp.locator('input[type="file"]').first()
    await fileInput.setInputFiles(archivo).catch((e) => log('setInputFiles falló:', e.message))
    log('archivo adjuntado:', archivo)
    await sleep(5000)
    await page.screenshot({ path: join(DATA, 'masiva-02b-adjunto.png') }).catch(() => {})

    // 3) "Importar" → crea el LOTE. ⚠️ NO autoriza ni libera (eso pide Superclave y es un
    //    paso manual aparte): el lote queda pendiente. NUNCA tocamos botones de liberar/autorizar.
    let clicImportar = false
    let btnImp = imp.getByRole('button', { name: /^\s*importar\s*$/i }).first()
    if (!(await btnImp.count().catch(() => 0))) btnImp = imp.getByText(/^\s*Importar\s*$/i).first()
    if (await btnImp.count().catch(() => 0)) {
      await btnImp.scrollIntoViewIfNeeded().catch(() => {})   // el botón vive bajo el fold: hay que traerlo a la vista
      await sleep(rnd(500, 900))
      await btnImp.click({ timeout: 5000 }).catch(async () => { await clickHumano(page, btnImp) })
      clicImportar = true
    }
    log(clicImportar ? 'clic Importar' : 'no encontré botón Importar')
    await sleep(8000)
    await page.screenshot({ path: join(DATA, 'masiva-03-importado.png') }).catch(() => {})
    // GUARD sesión caída: si el banco finalizó la sesión durante la importación, cortar YA con
    // estado claro (no confirmar a ciegas ni colgarse leyendo una pantalla de "sesión finalizada").
    if (await sesionCaida(page)) { log('masiva ABORT: sesión finalizada tras importar'); return { estado: 'sesion_caida', creado: false, nota: 'La sesión del banco se finalizó durante la importación del lote. NO se creó nada — reintentar con sesión fresca.', url: page.url() } }

    const textoTodo = async () => (await Promise.all(page.frames().map((f) => f.evaluate(() => document.body.innerText || '').catch(() => '')))).join(' ')

    // 3.5) ¿El banco RECHAZÓ el/los registros? (0 aceptados). Si es así, capturamos el MOTIVO
    //      real (link "Ver registros rechazados") y NO confirmamos (no hay nada que crear).
    let rechazoDetalle = ''
    const preTxt = (await textoTodo().catch(() => '')).replace(/\s+/g, ' ')
    const hayRechazo = /no existen registros aceptados/i.test(preTxt) || /ver registros rechazados/i.test(preTxt)
    if (hayRechazo) {
      for (const fr of page.frames()) {
        const link = fr.getByText(/ver registros rechazados/i).first()
        if ((await link.count().catch(() => 0)) && (await link.isVisible().catch(() => false))) {
          await link.scrollIntoViewIfNeeded().catch(() => {})
          await link.click({ timeout: 4000 }).catch(async () => { await clickHumano(page, link) })
          await sleep(rnd(2500, 4000)); break
        }
      }
      await page.screenshot({ path: join(DATA, 'masiva-06-rechazo.png') }).catch(() => {})
      rechazoDetalle = (await textoTodo().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1400)
      try { writeFileSync(join(DATA, 'masiva-rechazo.json'), JSON.stringify({ detalle: rechazoDetalle, forms: await volcarFrames(page) }, null, 2)) } catch { /* */ }
      log('masiva: registro RECHAZADO por el banco — motivo capturado')
    }

    // 4) CONFIRMAR (SOLO si NO hubo rechazo) → crea el LOTE (queda "por liberar"). Tras "Importar"
    //    el banco muestra la previsualización con "Continuar" (y a veces un "Aceptar" final).
    //    ⛔ BLINDAJE: si pide Superclave o Autorizar/Liberar, NOS DETENEMOS (no autorizamos).
    const rxConfirm = /^\s*(continuar|confirmar|aceptar)\s*$/i
    const rxProhibido = /(super\s?clave|clave din[aá]mica|tarjeta de coordenada|coordenada[s]? de seguridad|token de seguridad|segundo factor|ingrese.{0,25}(clave|c[oó]digo))/i
    const botonesConfirm = []
    for (let paso = 0; !hayRechazo && paso < 3; paso++) {
      const txtAhora = await textoTodo().catch(() => '')
      if (rxProhibido.test(txtAhora)) { log('masiva: pantalla de autorización/Superclave → me DETENGO (no autorizo; el lote queda pendiente)'); break }
      let btn = null
      for (const fr of page.frames()) {
        const c = fr.getByRole('button', { name: rxConfirm }).first()
        if ((await c.count().catch(() => 0)) && (await c.isVisible().catch(() => false))) { btn = c; break }
        const c2 = fr.getByText(rxConfirm).first()
        if ((await c2.count().catch(() => 0)) && (await c2.isVisible().catch(() => false))) { btn = c2; break }
      }
      if (!btn) break
      const etiqueta = (((await btn.innerText().catch(() => '')) || '')).trim()
      await btn.scrollIntoViewIfNeeded().catch(() => {})
      await btn.click({ timeout: 4000 }).catch(async () => { await clickHumano(page, btn) })
      botonesConfirm.push(etiqueta || '¿?')
      log('masiva: clic "' + etiqueta + '"')
      await sleep(rnd(4500, 6500))
      await page.screenshot({ path: join(DATA, `masiva-05-confirm-${paso}.png`) }).catch(() => {})
    }
    await sleep(2000)
    await page.screenshot({ path: join(DATA, 'masiva-04-final.png') }).catch(() => {})

    // 5) Resultado: texto de TODAS las frames → éxito / rechazos / aún en previsualización.
    const resumen = (((await textoTodo().catch(() => '')) || '')).replace(/\s+/g, ' ').slice(0, 1600)
    writeFileSync(join(DATA, 'masiva-resultado.json'), JSON.stringify({ url: page.url(), concepto, clicImportar, botonesConfirm, resumen, forms: await volcarFrames(page) }, null, 2))
    const sigueEnForm = /Caracter[ií]sticas importaci[oó]n/i.test(resumen) && /Examinar/i.test(resumen)
    // El banco RECHAZÓ el/los registros (0 aceptados) → señal inequívoca en pantalla.
    const rechazado = hayRechazo || /no existen registros aceptados/i.test(resumen)
    const enPreview = /registros aceptados/i.test(resumen) && /por confirmar/i.test(resumen) && !rechazado
    const exito = !rechazado && /(n[uú]mero de lote|lote\s*n[°º:]|comprobante|se ingres[oó]|ingresad[oa] correctamente|importaci[oó]n exitosa|realizad[oa].{0,15}exitosa|registros? aprobad|por autorizar|pendiente de (autoriz|liberaci)|por liberar|env[ií]o exitoso|procesad[oa] (con )?[eé]xito)/i.test(resumen)
    const errorVal = rechazado || /(no fue posible|formato incorrecto|archivo inv[aá]lid|fueron rechazad|con errores de)/i.test(resumen)
    const creado = exito && !errorVal && !sigueEnForm && !enPreview
    return {
      estado: creado ? 'lote_creado_pendiente' : (rechazado ? 'rechazado_por_banco' : (enPreview ? 'en_previsualizacion' : (sigueEnForm ? 'sin_confirmar_en_form' : (clicImportar ? 'importado_sin_confirmar' : 'no_importado')))),
      creado, rechazado, concepto, clicImportar, botonesConfirm, sigueEnForm, en_preview: enPreview, error_detectado: errorVal,
      rechazo_detalle: rechazoDetalle || undefined,
      nota: rechazado ? ('El banco RECHAZÓ el registro (0 aceptados). ' + (rechazoDetalle ? 'Motivo del banco: ' + rechazoDetalle.slice(0, 300) : 'Suele ser porque la CUENTA, el RUT o el banco del beneficiario no son válidos. Revisa esos datos.')) : undefined,
      resumen: resumen.slice(0, 700), url: page.url(),
    }
  }
  return { estado: 'mapeado_import', url: page.url() }
}

// ── COMPROBANTES DE PAGO (TEK_COMPROBANTES): Transferencias → Consultas Histórica →
// Histórico. Lista las transferencias hechas y baja el comprobante (PDF) de una.
//   map    → navega y VUELCA la pantalla (filtros + tabla + botones) para mapear.
//   listar → devuelve las filas (fecha, beneficiario, monto, estado) para que el usuario elija.
//   bajar  → descarga el PDF del comprobante de la fila TEK_COMPROB_IDX (1-based) a DATA.
async function comprobantesConsulta(page, log) {
  mkdirSync(DATA, { recursive: true })
  log('comprob: goto dashboard…')
  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch((e) => log('comprob: goto err', e.message))
  await sleep(6000)
  log('comprob: cerrarPopups…')
  await cerrarPopups(page, log)
  log('comprob: entrarEmpresa…')
  await entrarEmpresa(page, log, process.env.TEK_EMPRESA || 'ANA CLARA')
  await sleep(rnd(2000, 3500)); await idle(page, rnd(600, 1200))
  await cerrarPopups(page, log)
  // Abrir el mega-menú de Transferencias y VERIFICAR que abrió (aparece "Histórico"). Reintenta:
  // a veces el primer clic no despliega el menú (timing/popup) y caíamos al dashboard.
  const verHistorico = async () => {
    for (const f of page.frames()) {
      const h = f.getByText(/^\s*Hist[oó]rico\s*$/i).first()
      if ((await h.count().catch(() => 0)) && (await h.isVisible().catch(() => false))) return h
    }
    return null
  }
  let histLoc = null
  for (let intento = 0; intento < 4 && !histLoc; intento++) {
    log(`comprob: abrir menú Transferencias (intento ${intento + 1})…`)
    await cerrarPopups(page, log)
    const menu = page.getByText(/^transferencias?$/i).first()
    await clickHumano(page, menu)
    await sleep(rnd(4500, 6500)); await idle(page, rnd(600, 1200))
    histLoc = await verHistorico()
    if (!histLoc) { await page.keyboard.press('Escape').catch(() => {}); await sleep(1200) }
  }
  await page.screenshot({ path: join(DATA, 'comprob-00-menu.png') }).catch(() => {})
  // Clic en "Histórico" (único en el menú); fallback al clickColumna posicional.
  let entro = false
  if (histLoc) {
    await histLoc.scrollIntoViewIfNeeded().catch(() => {})
    await histLoc.click({ timeout: 4000 }).catch(async () => { await clickHumano(page, histLoc) })
    entro = true
  } else {
    entro = await clickColumna(page, /Consultas Hist[oó]rica/i, /^Hist[oó]rico$/i, log)
  }
  log('clic Consultas Histórica → Histórico:', entro)
  await sleep(rnd(8000, 10500)); await idle(page, rnd(800, 1600))
  await page.screenshot({ path: join(DATA, 'comprob-01-historico.png') }).catch(() => {})

  // Frame del histórico (el que tenga tabla/filas).
  const impFrame = page.frames().find((f) => f !== page.mainFrame() && /officebanking/i.test(f.url())) || page.mainFrame()
  // Muchas consultas necesitan apretar "Consultar"/"Buscar" para cargar el rango por defecto.
  for (const fr of page.frames()) {
    const b = fr.getByRole('button', { name: /^\s*(consultar|buscar)\s*$/i }).first()
    if ((await b.count().catch(() => 0)) && (await b.isVisible().catch(() => false))) { await b.click({ timeout: 3000 }).catch(() => {}); await sleep(rnd(4000, 6000)); break }
  }
  await page.screenshot({ path: join(DATA, 'comprob-02-lista.png') }).catch(() => {})

  // Extrae las FILAS de transferencias de la(s) tabla(s) de todos los frames (genérico).
  const filas = []
  for (const fr of page.frames()) {
    const rows = await fr.evaluate(() => {
      const out = []
      for (const tr of document.querySelectorAll('table tr, [role="row"]')) {
        const cels = [...tr.querySelectorAll('td,[role="cell"]')].map((c) => (c.innerText || '').replace(/\s+/g, ' ').trim())
        if (cels.filter(Boolean).length >= 3) out.push(cels)
      }
      return out.slice(0, 60)
    }).catch(() => [])
    for (const r of rows) filas.push(r)
  }
  const dump = await volcarFrames(page)
  // Estructura de la columna de comprobante/impresión (última(s) celda(s) con la acción por fila).
  let accionInfo = null
  for (const fr of page.frames()) {
    const info = await fr.evaluate(() => {
      const tbl = [...document.querySelectorAll('table')].find((t) => t.querySelectorAll('tr').length > 2)
      if (!tbl) return null
      const headers = [...tbl.querySelectorAll('th')].map((t) => (t.innerText || '').trim())
      const dataRow = [...tbl.querySelectorAll('tr')].find((tr) => tr.querySelectorAll('td').length >= 5)
      if (!dataRow) return null
      const tds = [...dataRow.querySelectorAll('td')]
      return { headers, lastCellsHTML: tds.slice(-3).map((td) => (td.outerHTML || '').replace(/\s+/g, ' ').slice(0, 500)) }
    }).catch(() => null)
    if (info && (info.headers?.length || info.lastCellsHTML?.length)) { accionInfo = info; break }
  }
  writeFileSync(join(DATA, 'comprob-historico.json'), JSON.stringify({ url: page.url(), entro, total_filas: filas.length, filas: filas.slice(0, 40), accionInfo, dump }, null, 2))
  log('comprobantes/histórico · filas detectadas:', filas.length)

  // MAP: abrir el popover de "Impresos" de la 1ª FILA (no el "Descargar" de arriba) para ver
  // las opciones del comprobante individual.
  if (process.env.TEK_COMPROBANTES === 'map') {
    for (const fr of page.frames()) {
      const icon = fr.locator('td[data-th="Impresos"] a.btn-inner-table, td.td-btn-inner-table a.btn-popover').first()
      if (await icon.count().catch(() => 0)) { await icon.scrollIntoViewIfNeeded().catch(() => {}); await icon.click({ timeout: 4000 }).catch(() => {}); await sleep(2800); break }
    }
    await page.screenshot({ path: join(DATA, 'comprob-04-popover.png') }).catch(() => {})
    let popover = null
    for (const fr of page.frames()) {
      const p = await fr.evaluate(() => {
        const els = [...document.querySelectorAll('#list-popover, .popover, [id*="popover"], [class*="popover"]')].filter((e) => (e.innerText || '').trim())
        const el = els.map((e) => e.closest('.popover') || e).find((e) => /comprobante|pdf|descargar|imprimir/i.test(e.innerText || ''))
        return el ? (el.outerHTML || '').replace(/\s+/g, ' ').slice(0, 1200) : (els[0] ? els[0].outerHTML.replace(/\s+/g, ' ').slice(0, 1200) : null)
      }).catch(() => null)
      if (p) { popover = p; break }
    }
    writeFileSync(join(DATA, 'comprob-popover.json'), JSON.stringify({ popover }, null, 2))
    log('popover fila capturado:', Boolean(popover))
  }

  // BAJAR: descarga el/los comprobante(s) PDF. TEK_COMPROB_IDX = "3" (una) | "1,3,5" (varias)
  // | "todos". Descarga TODAS las pedidas en la MISMA sesión (mucho más rápido que 1 login c/u).
  if (process.env.TEK_COMPROBANTES === 'bajar') {
    // Frame con la columna "Impresos" (ícono "⋮" por fila).
    let impFr = null, nIconos = 0
    for (const fr of page.frames()) {
      const c = await fr.locator('td[data-th="Impresos"] a.btn-inner-table, td.td-btn-inner-table a.btn-popover').count().catch(() => 0)
      if (c > 0) { impFr = fr; nIconos = c; break }
    }
    if (!impFr) return { estado: 'sin_tabla', comprobantes: [], total_filas: filas.length, url: page.url() }
    const spec = String(process.env.TEK_COMPROB_IDX || '1').toLowerCase().trim()
    let indices
    if (spec === 'todos' || spec === 'all' || spec === '*') indices = Array.from({ length: nIconos }, (_, i) => i + 1)
    else indices = [...new Set(spec.split(/[,\s]+/).map((s) => parseInt(s, 10)).filter((n) => n >= 1 && n <= nIconos))]
    log('comprobantes a bajar:', indices.join(',') || '(ninguno válido)')

    // Descarga el comprobante de UNA fila (1-based). Devuelve la ruta del PDF o null.
    const bajarUno = async (idx) => {
      const dest = join(DATA, `comprobante-${idx}.pdf`)
      try { if (existsSync(dest)) unlinkSync(dest) } catch { /* */ }
      const iconos = impFr.locator('td[data-th="Impresos"] a.btn-inner-table, td.td-btn-inner-table a.btn-popover')
      if ((await iconos.count().catch(() => 0)) < idx) return null
      const icon = iconos.nth(idx - 1)
      await icon.scrollIntoViewIfNeeded().catch(() => {})
      await icon.click({ timeout: 4000 }).catch(async () => { await clickHumano(page, icon) })
      await sleep(1500)
      // "Comprobante Transferencia" VISIBLE (hay un template oculto con el mismo texto).
      let opt = null
      for (const f2 of page.frames()) {
        const cands = await f2.getByText(/comprobante\s*transferencia/i).all().catch(() => [])
        for (const c of cands) { if (await c.isVisible().catch(() => false)) { opt = c; break } }
        if (opt) break
      }
      if (!opt) { await page.keyboard.press('Escape').catch(() => {}); return null }
      const [dl, pop] = await Promise.all([
        page.waitForEvent('download', { timeout: 14000 }).catch(() => null),
        page.context().waitForEvent('page', { timeout: 14000 }).catch(() => null),
        opt.click({ timeout: 4000 }).catch(() => {}),
      ])
      let pdf = null
      if (dl) { await dl.saveAs(dest).catch(() => {}); if (existsSync(dest)) pdf = dest }
      if (!pdf && pop) {
        await pop.waitForLoadState('domcontentloaded').catch(() => {})
        const u = pop.url()
        try {
          if (/\.pdf|comprobante|blob:/i.test(u)) { const resp = await pop.context().request.get(u).catch(() => null); if (resp && resp.ok()) { writeFileSync(dest, await resp.body()); pdf = existsSync(dest) ? dest : null } }
          if (!pdf) { await pop.pdf({ path: dest }).catch(() => {}); if (existsSync(dest)) pdf = dest }
        } catch { /* */ }
        await pop.close().catch(() => {})
      }
      await page.keyboard.press('Escape').catch(() => {})
      return pdf
    }

    const comprobantes = []
    for (const idx of indices) {
      let pdf = null
      try { pdf = await bajarUno(idx) } catch (e) { log(`comprobante ${idx} falló:`, e.message) }
      comprobantes.push(pdf ? { idx, pdf } : { idx, pdf: null, error: 'no se pudo bajar' })
      await sleep(rnd(1200, 2000))
    }
    await page.screenshot({ path: join(DATA, 'comprob-03-bajado.png') }).catch(() => {})
    const okN = comprobantes.filter((c) => c.pdf).length
    return { estado: okN ? 'descargados' : 'sin_pdf', comprobantes, ok_count: okN, pedidos: indices.length, total_filas: filas.length, url: page.url() }
  }

  return { estado: 'listado', filas: filas.slice(0, 40), total_filas: filas.length, url: page.url() }
}

// ── VINCULAR: LISTAR EMPRESAS del login (TEK_VINCULAR=empresas) ──────────────────
// Tras el login, algunos RUT tienen VARIAS empresas asociadas (para elegir). Este modo
// abre el selector "Empresa / Rol" del header (o detecta la pantalla de selección) y
// VUELCA las empresas disponibles, para que el usuario elija en el widget. SOLO LECTURA.
async function listarEmpresasBanco(page, log) {
  mkdirSync(DATA, { recursive: true })
  // Esperar a que TERMINE el redireccionamiento post-login (la pantalla "Redireccionando…"
  // aparece un rato; leer antes daba 0 empresas). Esperamos hasta ver la app real.
  for (let i = 0; i < 24; i++) {
    await sleep(1500)
    const u = page.url()
    const t = await page.evaluate(() => (document.body?.innerText || '').slice(0, 400)).catch(() => '')
    const enApp = /privado\.officebanking/i.test(u) && !/\/login|redireccionando|validate_user/i.test(u + ' ' + t)
    const listo = enApp && /(empresa|saldo|transferenc|selector|contrato|inicio|tus datos|cuenta)/i.test(t + ' ' + u)
    if (listo) { log('vincular: app cargada tras redirect (' + ((i + 1) * 1.5) + 's)'); break }
    if (/error-seguridad/i.test(u)) { log('vincular: muro antifraude'); break }
  }
  await sleep(1500)
  await page.screenshot({ path: join(DATA, 'vincular-00-post-login.png') }).catch(() => {})
  // Un login con VARIAS empresas cae directo en el "selector de empresas". Si no (sesión en
  // dashboard), abrimos "Empresa / Rol" → "Volver a selector de empresas" para ver la lista.
  const txt0 = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
  let enSeleccion = /selector de empresas|seleccion-empresa|selecciona.*empresa|listado de empresas/i.test(page.url() + ' ' + txt0)
  if (!enSeleccion) {
    const btn = page.getByText(/Empresa\s*\/\s*Rol/i).first()
    if (await btn.count().catch(() => 0)) { await btn.click({ timeout: 4000 }).catch(() => {}); await sleep(2200) }
    const volver = page.getByText(/volver al?\s*selector de empresas/i).first()
    if (await volver.count().catch(() => 0)) { await volver.click({ timeout: 4000 }).catch(() => {}); await sleep(4500); enSeleccion = true }
  }
  await page.screenshot({ path: join(DATA, 'vincular-01-empresas.png') }).catch(() => {})
  // Extrae las EMPRESAS: filas/tarjetas con nombre de empresa (SPA/SA/LTDA), "Contrato:" o RUT.
  const empresas = []
  for (const fr of page.frames()) {
    const arr = await fr.evaluate(() => {
      const out = []
      for (const el of document.querySelectorAll('tr, [role="row"], li, [class*="empresa" i], [class*="card" i], [class*="item" i], [role="option"]')) {
        const t = (el.innerText || '').replace(/\s+/g, ' ').trim()
        if (t && t.length >= 6 && t.length < 140 && /(s\.?p\.?a|s\.?a\.?\b|ltda|limitada|e\.?i\.?r\.?l|contrato\s*:?\s*\d|\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])/i.test(t)) out.push(t)
      }
      return out
    }).catch(() => [])
    empresas.push(...arr)
  }
  const uniq = [...new Set(empresas)]
  // Parseo cada fila "Contrato RUT Empresa Rol Entrar" → estructura. Descarta el encabezado.
  const parsed = uniq.map((t) => {
    const m = t.match(/^(\d{10,})\s+([\d.]+-[\dkK])\s+(.+?)\s+(Usuario|Administrador|Admin|Aprobador|Consulta|Firmante|[A-Za-zÁÉÍÓÚÑñ]+)\s+Entrar\s*$/i)
    if (m) return { contrato: m[1], rut: m[2], empresa: m[3].trim(), rol: m[4] }
    return null
  }).filter(Boolean)
  writeFileSync(join(DATA, 'vincular-empresas.json'), JSON.stringify({ url: page.url(), enSeleccion, empresas: parsed, crudo: uniq, dump: await volcarFrames(page) }, null, 2))
  log('vincular: empresas parseadas:', parsed.length)
  return { estado: 'empresas', empresas: parsed, enSeleccion, url: page.url() }
}

// ── CARTOLA HISTÓRICA (Cuentas Corrientes → Cartola/Histórico) ──────────────────
// El banco online da ~90 días en "Saldos y movimientos"; los meses viejos (ene-mar 2026)
// salen de la CARTOLA HISTÓRICA (estados mensuales, normalmente descargables). Este flujo
// primero MAPEA el submenú de Cuentas Corrientes (para ubicar la opción exacta) y la
// pantalla de la cartola histórica (selector de mes + descarga).
//   TEK_CARTOLA_HIST=map   → navega y VUELCA submenú + pantalla (screenshots + JSON).
//   TEK_CARTOLA_HIST=bajar → además intenta seleccionar mes(es) y descargar.
async function cartolaHistorica(page, log) {
  mkdirSync(DATA, { recursive: true })
  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  await sleep(8000)
  await entrarEmpresa(page, log, process.env.TEK_EMPRESA || 'ANA CLARA')
  await sleep(rnd(3000, 5000)); await idle(page, rnd(800, 1600))
  await cerrarPopups(page, log)
  // clic por texto (mouse real) reutilizable
  const clickTexto = async (re) => {
    const loc = page.getByText(re).first()
    const box = await loc.boundingBox().catch(() => null)
    if (!box) return false
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 12 }).catch(() => {})
    await sleep(220); await page.mouse.down(); await sleep(70); await page.mouse.up()
    return true
  }
  const esVisible = async (re) => page.getByText(re).first().isVisible().catch(() => false)
  // 1) abrir el acordeón "Cuentas Corrientes" y VOLCAR su submenú
  log('abriendo Cuentas Corrientes…')
  for (let i = 0; i < 3 && !(await esVisible(/cartola|hist[oó]ric|saldos y movimientos/i)); i++) { await clickTexto(/^Cuentas Corrientes$/i); await sleep(2600) }
  await page.screenshot({ path: join(DATA, 'carthist-00-submenu.png') }).catch(() => {})
  const submenu = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 }
    return [...document.querySelectorAll('a,button,li,span,[role="menuitem"]')]
      .filter((e) => vis(e) && (e.innerText || '').trim().length > 1 && (e.innerText || '').trim().length < 45)
      .map((e) => (e.innerText || '').trim())
      .filter((t, i, arr) => arr.indexOf(t) === i)
      .slice(0, 80)
  }).catch(() => [])
  writeFileSync(join(DATA, 'carthist-submenu.json'), JSON.stringify({ url: page.url(), submenu }, null, 2))
  log('submenú Cuentas Corrientes:', submenu.filter((t) => /cartola|hist|movim|saldo|estado/i.test(t)).join(' · ') || '(sin ítems obvios)')

  // 2) entrar a la opción de cartola histórica (probamos varios nombres)
  const CAND = [/Cartola\s+Hist[oó]rica/i, /Cartolas?\b/i, /Estado\s+de\s+cuenta/i, /Hist[oó]rico/i, /Cartola\s+Mensual/i]
  let entro = false, usada = null
  for (const re of CAND) { if (await esVisible(re)) { entro = await clickTexto(re); usada = re.source; if (entro) break } }
  log('clic cartola histórica (' + usada + '):', entro)
  await sleep(11000); await idle(page, rnd(800, 1500))
  await page.screenshot({ path: join(DATA, 'carthist-01-pantalla.png') }).catch(() => {})
  // 3) volcar la pantalla (selector de mes/período, botones de descarga, links a PDF)
  const dump = []
  for (const f of page.frames()) {
    const d = await f.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 }
      const selects = [...document.querySelectorAll('select')].map((s) => ({ id: s.id, name: s.name, opciones: [...s.options].map((o) => o.text).slice(0, 40) }))
      const inputs = [...document.querySelectorAll('input')].map((e) => ({ type: e.type, id: e.id, placeholder: e.placeholder || '', vis: vis(e) }))
      const botones = [...document.querySelectorAll('button,a[role="button"],[class*="btn"]')].map((b) => (b.innerText || '').trim()).filter((t) => t && t.length < 40).slice(0, 40)
      const links = [...document.querySelectorAll('a')].map((a) => ({ text: (a.innerText || '').trim().slice(0, 50), href: a.href || '' })).filter((x) => x.text || /\.pdf|cartola|descarg/i.test(x.href)).slice(0, 40)
      const textos = (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 700)
      return { url: location.href, selects, inputs, botones, links, textos }
    }).catch(() => null)
    if (d && (d.selects.length || d.botones.length || d.links.length)) dump.push(d)
  }
  writeFileSync(join(DATA, 'carthist-pantalla.json'), JSON.stringify({ url: page.url(), entro, usada, dump }, null, 2))
  log('cartola histórica mapeada · frames:', dump.length)
  if (process.env.TEK_CARTOLA_HIST !== 'bajar') return { estado: entro ? 'mapeado_cartola_hist' : 'no_encontre_opcion', usada, url: page.url() }

  // ── BAJAR: cada Cartola Histórica es una CARTOLA MENSUAL oficial (N° NN, con Saldo
  //    inicial / Cargos / Abonos / Saldo final) + botón "Descargar" (PDF). La tabla de
  //    detalle está VIRTUALIZADA (~60 filas visibles), por eso no se scrapea completa.
  //    Por cada mes: seleccionamos la cartola, extraemos el RESUMEN (confiable) y
  //    DESCARGAMOS el PDF oficial a la carpeta de cartolas del cerebro. ──
  const MESNOM = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const anio = process.env.TEK_CARTOLA_ANIO || '2026'
  const meses = (process.env.TEK_CARTOLA_MESES || '1,2,3,4,5,6,7').split(',').map((x) => Number(x.trim())).filter(Boolean)
  const PDFDIR = join(process.env.HOME, 'nexus', 'cerebro', '70 — Base de datos', 'Cartolas ANA CLARA', 'PDF')
  mkdirSync(PDFDIR, { recursive: true })
  const fEob = () => page.frames().find((f) => /eob\.officebanking\.cl.*(CTLHT|Cartola|Historic|saldoctacte)/i.test(f.url()))
    || page.frames().find((f) => /eob\.officebanking\.cl/i.test(f.url()))
    || page.mainFrame()
  const num = (s) => Number(String(s || '').replace(/[^\d-]/g, '')) || 0
  // texto combinado de TODOS los frames (la cabecera de la cartola vive en un frame
  // distinto al de la tabla) -> asi el resumen no sale en 0.
  const withTimeout = (p, ms, dflt) => Promise.race([Promise.resolve(p).catch(() => dflt), new Promise((r) => setTimeout(() => r(dflt), ms))])
  const textoTodosFrames = async () => (await Promise.all(page.frames().map((fr) => withTimeout(fr.evaluate(() => document.body ? document.body.innerText : ''), 6000, '')))).join('\n').replace(/\u00a0/g, ' ')
  const locEnFrames = async (re) => { for (const fr of page.frames()) { const l = fr.getByText(re).first(); if (await l.isVisible().catch(() => false)) return l } return null }
  const resumenMeses = []
  const guardarMerge = (arr) => { let prev = []; try { prev = JSON.parse(readFileSync(join(DATA, 'carthist-resumen.json'), 'utf8')).meses || [] } catch {}; const by = {}; for (const x of prev) if (x && x.mes) by[x.mes] = x; for (const x of arr) if (x && x.mes) by[x.mes] = x; writeFileSync(join(DATA, 'carthist-resumen.json'), JSON.stringify({ anio, actualizado: new Date().toISOString(), meses: Object.values(by).sort((a, b) => a.mes - b.mes) }, null, 2)) }
  for (const mes of meses) {
    try {
      for (let i = 0; i < 4 && !(await esVisible(/^Cartola\s+hist[oó]rica$/i)); i++) { await clickTexto(/^Cuentas Corrientes$/i); await sleep(2000) }
      await clickTexto(/^Cartola\s+hist[oó]rica$/i); await sleep(6000)
      let R = null
      for (let intento = 0; intento < 2 && !R; intento++) {
        const f0 = fEob()
        await f0.locator('#cboCuentas, select').first().selectOption({ index: 1 }).catch(() => {})
        await sleep(3500)
        const f = fEob()
        const selectores = await f.locator('select').all()
        log(`  [diag] ${selectores.length} selects en el frame`)
        for (const sel of selectores) {
          const id = await sel.getAttribute('id').catch(() => '') || await sel.getAttribute('name').catch(() => '') || '?'
          const opts = (await sel.locator('option').allTextContents().catch(() => [])).map((o) => o.trim())
          const low = opts.map((o) => o.toLowerCase())
          const valAntes = await sel.inputValue().catch(() => '')
          let set = false, metodo = ''
          if (low.includes(MESNOM[mes].toLowerCase())) {
            const idx = low.indexOf(MESNOM[mes].toLowerCase())
            // por INDICE (mas robusto que por label si hay espacios/mayusculas)
            await sel.selectOption({ index: idx }).catch(() => {}); set = true; metodo = 'mes idx ' + idx
          } else if (opts.includes(anio)) { await sel.selectOption({ label: anio }).catch(() => {}); set = true; metodo = 'anio' }
          if (set) {
            await sel.evaluate((el) => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) }).catch(() => {})
            const valDespues = await sel.inputValue().catch(() => '')
            log(`  [diag] select ${id}: opts[${opts.slice(0,4).join(',')}...] set=${metodo} val ${valAntes}->${valDespues}`)
          } else {
            log(`  [diag] select ${id}: opts[${opts.slice(0,4).join(',')}...] (no seteado) val=${valAntes}`)
          }
        }
        await sleep(1000)
        const btn = await locEnFrames(/^buscar$/i)
        if (btn) await clickHumano(page, btn)
        log(`carthist ${MESNOM[mes]} ${anio}: Buscar (intento ${intento + 1})`)
        await sleep(6000)
        // ESPERAR a que cargue el resumen (hasta ~20s): el texto debe tener "Saldo inicial"/"Cargos"
        let txt = ''
        for (let w = 0; w < 10; w++) { txt = await withTimeout(textoTodosFrames(), 12000, ''); if (/Saldo\s*inicial|Cargos\s*\$/i.test(txt)) break; await sleep(2000) }
        const g = (re) => { const m = txt.match(re); return m ? m[1].trim() : '' }
        const hasta = g(/Fecha\s*hasta\s*([\d/]+)/i)
        const mesHasta = Number((hasta.match(/\/(\d{2})\//) || [])[1])
        const cargos = num(g(/Cargos\s*\$?\s*([\d.]+)/i))
        const abonos = num(g(/Abonos\s*\$?\s*([\d.]+)/i))
        // rechazar si NO cargo (sin fecha hasta o sin montos) o si vino el mes equivocado
        if (!hasta || (!cargos && !abonos)) { log(`  ${MESNOM[mes]}: resumen no cargo -> reintento`); continue }
        if (mesHasta && mesHasta !== mes) { log(`  la cartola volvio del mes ${mesHasta}, pedi ${mes} -> reintento`); continue }
        R = {
          mes, anio: Number(anio),
          n_cartola: g(/N[°º]\s*Cartola\s*([\d]+\s*-\s*[\d/]+)/i),
          periodo: g(/Fecha\s*desde\s*([\d/]+)/i) + '-' + hasta,
          saldo_inicial: num(g(/Saldo\s*inicial\s*\$?\s*([\d.]+)/i)),
          cargos, abonos,
          saldo_final: num(g(/Saldo\s*final\s*\$?\s*([\d.]+)/i)),
        }
      }
      if (!R) { log(`  ${MESNOM[mes]}: no fije el mes correcto -> salto (no guardo data equivocada)`); continue }
      resumenMeses.push(R)
      log(`  ${MESNOM[mes]}: cartola ${R.n_cartola || '?'} - ${R.periodo} - cargos ${R.cargos} - abonos ${R.abonos}`)
      guardarMerge(resumenMeses)
      if (process.env.TEK_CARTOLA_MOVS === '1') {
        try {
          const seen = new Set(); const movs = []
          for (let sc = 0; sc < 160; sc++) {
            const ffm = fEob()
            const filas = await withTimeout(ffm.evaluate(() => {
              const tablas = [...document.querySelectorAll('table')]; let best = null, max = 0
              for (const t of tablas) { const r = t.querySelectorAll('tr').length; if (r > max) { max = r; best = t } }
              const rows = best ? [...best.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td')].map((c) => (c.innerText || '').trim())).filter((r) => r.length >= 4) : []
              // scrollear TODOS los contenedores con overflow + la ventana
              for (const el of document.querySelectorAll('*')) { const st = getComputedStyle(el); if (/auto|scroll/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 10) el.scrollTop = el.scrollHeight }
              window.scrollBy(0, 3000)
              return rows
            }), 8000, [])
            let nuevas = 0
            for (const r of filas) { const k = r.join('|'); if (!seen.has(k)) { seen.add(k); movs.push(r); nuevas++ } }
            if (nuevas === 0 && sc > 2) break
            await sleep(500)
          }
          writeFileSync(join(DATA, `carthist-movs-${anio}-${String(mes).padStart(2, '0')}.json`), JSON.stringify({ mes, anio, filas: movs }, null, 2))
          log(`  ${MESNOM[mes]}: movimientos scrolleados = ${movs.length}`)
        } catch (e) { log('  scroll movs fallo:', e.message) }
      }
      if (process.env.TEK_CARTOLA_PDF === '1') {
      try {
        const dest = join(PDFDIR, `Cartola ${anio}-${String(mes).padStart(2, '0')} ${MESNOM[mes]}.pdf`)
        let hrefPdf = null
        for (const fr of page.frames()) {
          const a = fr.locator('a[href*=".pdf"], a[href*="descarg" i], a[download]').first()
          if (await a.count().catch(() => 0)) { hrefPdf = await a.getAttribute('href').catch(() => null); if (hrefPdf) break }
        }
        if (hrefPdf) {
          const abs = hrefPdf.startsWith('http') ? hrefPdf : new URL(hrefPdf, page.url()).href
          const resp = await page.context().request.get(abs).catch(() => null)
          if (resp && resp.ok()) { writeFileSync(dest, await resp.body()); log(`  PDF guardado (href): ${dest.split('/').pop()}`) } else log('  href PDF no respondio')
        } else {
          const dl = await locEnFrames(/descargar/i)
          if (dl) {
            const [download, popup] = await Promise.all([
              page.waitForEvent('download', { timeout: 18000 }).catch(() => null),
              page.waitForEvent('popup', { timeout: 18000 }).catch(() => null),
              clickHumano(page, dl),
            ])
            if (download) { await download.saveAs(dest).catch(() => {}); log(`  PDF guardado (dl): ${dest.split('/').pop()}`) }
            else if (popup) { await popup.waitForLoadState().catch(() => {}); const resp = await page.context().request.get(popup.url()).catch(() => null); if (resp && resp.ok()) { writeFileSync(dest, await resp.body()); log('  PDF guardado (popup)') } await popup.close().catch(() => {}) }
            else log('  descarga no disparo download/popup')
          } else log('  no vi enlace/boton Descargar')
        }
      } catch (e) { log('  descarga fallo:', e.message) }
      }
      await sleep(1000)
    } catch (e) { log(`carthist ${MESNOM[mes]} fallo:`, e.message) }
  }
  guardarMerge(resumenMeses)
  log(`carthist: ${resumenMeses.length} meses con resumen + PDF`)
  return { estado: 'cartola_hist_bajada', usada, meses_resumen: resumenMeses.map((r) => ({ mes: r.mes, cartola: r.n_cartola, cargos: r.cargos, abonos: r.abonos })), url: page.url() }
}

// ── LECTURA DE SALDOS POR EMPRESA (TEK_LEER_SALDOS=1) ──────────────────────
// En UN solo login (varias empresas cuelgan del mismo RUT/clave), recorre el
// selector de empresas, entra a cada una y captura su saldo (account_summary →
// listCustAccount). NO escribe en los data/*.json de ANA CLARA: solo devuelve el
// resultado. Empresas objetivo en TEK_EMPRESAS_JSON (array de nombres).
async function irAlSelectorEmpresas(page, log) {
  const enSel = (t) => /selector de empresas|seleccion-empresa|selecciona.*empresa|listado de empresas/i.test(page.url() + ' ' + t)
  const txt0 = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
  if (enSel(txt0)) return true
  // SIEMPRE volvemos al DASHBOARD primero: el menú "Empresa/Rol" solo está ahí. Antes se saltaba
  // el dashboard si la URL ya tenía "portal-fob" — pero tras una MASIVA la vista es portal-fob…MSV_C
  // y NO tiene ese menú → el cambio de empresa fallaba. Reintentamos hasta 2 veces por si el
  // dashboard tarda o el flyout no pinta al primer intento.
  for (let intento = 1; intento <= 2; intento++) {
    await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
    await sleep(rnd(4000, 6000))
    const btn = page.getByText(/Empresa\s*\/\s*Rol/i).first()
    if (await btn.count().catch(() => 0)) { await clickHumano(page, btn); await sleep(rnd(2200, 3200)) }
    const volver = page.getByText(/volver al?\s*selector de empresas/i).first()
    if (await volver.count().catch(() => 0)) { await clickHumano(page, volver); await sleep(rnd(4000, 5500)) }
    const t2 = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
    if (enSel(t2)) return true
    log(`irAlSelectorEmpresas: no llegué al selector (intento ${intento}) → reintento`)
  }
  return false
}

// Lee los MOVIMIENTOS de la empresa YA seleccionada (cartola: Cuentas Corrientes → Saldos
// y movimientos), mes a mes en la ventana de ~90 días. Reusa la lógica probada de
// capturarData (ANA CLARA) SIN escribir archivos. Best-effort: si algo falla, devuelve lo
// que haya. Solo se llama si TEK_LEER_MOVS=1 (para no arriesgar la lectura de saldos).
async function leerMovimientosActual(ctx, page, log, desde, cuentaNum = '') {
  const hoyD = new Date(), iso = (d) => d.toISOString().slice(0, 10)
  const min90 = iso(new Date(hoyD.getTime() - 88 * 864e5))
  const DESDE = (desde && desde > min90) ? desde : min90
  const hoy = iso(hoyD)
  const lotesMov = []
  const onResp = async (r) => {
    try {
      if (/ObtenerMovimientos/i.test(r.url())) {
        const b = JSON.parse(await r.text()); const det = b?.Result?.Detalle || b?.Detalle || []
        if (Array.isArray(det) && det.length) lotesMov.push(det)
      }
    } catch { /* */ }
  }
  ctx.on('response', onResp)
  const dbg = process.env.TEK_MOVS_DEBUG === '1'
  const shotM = (n) => dbg ? page.screenshot({ path: join(DATA, `movs-${n}.png`) }).catch(() => {}) : Promise.resolve()
  try {
    await shotM('00-inicio')
    const esVisible = async (re) => page.getByText(re).first().isVisible().catch(() => false)
    let itemRe = /Saldos y movimientos/i
    for (let i = 0; i < 4 && !(await esVisible(itemRe)); i++) { await clickHumano(page, page.getByText(/^Cuentas Corrientes$/i).first()); await sleep(rnd(2400, 3200)) }
    if (dbg) log('  movs: "Saldos y movimientos" visible?', await esVisible(/Saldos y movimientos/i))
    await shotM('01-menu')
    if (!(await esVisible(itemRe))) itemRe = /Cartola|Movimientos/i
    const clicCart = (await esVisible(itemRe)) ? await clickHumano(page, page.getByText(itemRe).first()) : false
    if (dbg) log('  movs: clic cartola?', clicCart)
    await sleep(rnd(11000, 13_000))
    await shotM('02-cartola')
    const eob = () => page.frames().find((f) => /eob\.officebanking\.cl\/CTA\.UI\.Web\/saldoctacte/i.test(f.url()))
    if (dbg) log('  movs: iframe eob encontrado?', !!eob(), '| frames:', page.frames().map((f) => f.url()).filter((u) => /eob|saldo|cartola|CTA/i.test(u)).slice(0, 3))
    const mesesRango = (d0, h0) => {
      const out = []; let [y, m] = d0.split('-').map(Number); const [hy, hm] = h0.split('-').map(Number); let g = 0
      while ((y < hy || (y === hy && m <= hm)) && g++ < 24) {
        const pad = (n) => String(n).padStart(2, '0'); const d = `${y}-${pad(m)}-01`; const fin = new Date(y, m, 0).getDate(); const h = `${y}-${pad(m)}-${pad(fin)}`
        out.push({ d: d < d0 ? d0 : d, h: h > h0 ? h0 : h }); m++; if (m > 12) { m = 1; y++ }
      }
      return out.reverse()
    }
    const consultar = async (f, d, h) => {
      const fechas = f.locator('input[type="date"], input[type="text"], input[placeholder*="/" i], input[class*="fecha" i]')
      if ((await fechas.count().catch(() => 0)) < 2) return false
      for (const [idx, val] of [[0, d], [1, h]]) {
        const el = fechas.nth(idx); const tipo = await el.getAttribute('type').catch(() => 'text')
        const v = tipo === 'date' ? val : `${val.slice(8, 10)}/${val.slice(5, 7)}/${val.slice(0, 4)}`
        await el.click().catch(() => {}); await el.fill('').catch(() => {}); await el.fill(v).catch(() => {})
        await el.evaluate((e) => e.dispatchEvent(new Event('change', { bubbles: true }))).catch(() => {}); await sleep(400)
      }
      const btn = f.locator('button:has-text("Consultar"), a:has-text("Consultar"), input[value*="onsult" i]').first()
      if (await btn.isVisible().catch(() => false)) { await clickHumano(page, btn); return true }
      return false
    }
    // SCRAPE de la tabla del iframe eob (robusto: no depende del nombre del endpoint de red,
    // que varía por empresa). Columnas: FECHA · CARGO · ABONO · DESCRIPCIÓN · SALDO · N°DOC ·
    // SUCURSAL · N°MOV. Acumulamos y deduplicamos por nroMov+fecha+saldo.
    const scraped = []
    const numCLP = (s) => { const n = String(s || '').replace(/[^\d]/g, ''); return n ? Number(n) : 0 }
    const scrapeTabla = async (fr, cuenta) => {
      if (!fr) return
      const filas = await fr.evaluate(() => {
        const out = []
        for (const tr of document.querySelectorAll('tr')) {
          const c = [...tr.querySelectorAll('td')].map((td) => (td.innerText || '').replace(/\s+/g, ' ').trim())
          if (c.length >= 6 && /\d{2}[/-]\d{2}[/-]\d{2,4}/.test(c[0] || '')) out.push(c)
        }
        return out
      }).catch(() => [])
      for (const c of filas) scraped.push({ raw: c, cuenta })
    }
    const cuentaSel = async (fr) => (await fr?.locator('select').first().inputValue().catch(() => '')) || cuentaNum
    const meses = mesesRango(DESDE, hoy)
    let f = eob()
    if (f) { for (const mm of meses) { await consultar(f, mm.d, mm.h).catch(() => {}); await sleep(rnd(6000, 8000)); f = eob() || f; await scrapeTabla(f, await cuentaSel(f)) } }
    try {
      f = eob()
      if (f) {
        const sel = f.locator('select').first(); const nop = await sel.locator('option').count().catch(() => 0)
        for (let i = 1; i < Math.min(nop, 4); i++) {
          await sel.selectOption({ index: i }).catch(() => {}); await sleep(2000)
          for (const mm of meses) { const f2 = eob(); if (f2) { await consultar(f2, mm.d, mm.h).catch(() => {}); await sleep(rnd(5000, 7000)); await scrapeTabla(f2, await cuentaSel(f2)) } }
        }
      }
    } catch { /* */ }
    // construir movimientos: primero lo scrapeado (robusto), luego la red (bonus, ANA CLARA)
    const vistos = new Set(); const movs = []
    for (const { raw: c, cuenta } of scraped) {
      const fecha = _normFechaMov(c[0]); if (!fecha) continue
      const cargo = numCLP(c[1]), abono = numCLP(c[2]), saldo = numCLP(c[4])
      const m = { fecha, descripcion: (c[3] || '').trim(), cargo, abono, saldo, documento: (c[5] || '').trim(), sucursal: (c[6] || '').trim(), nroMov: (c[7] || c[6] || '').trim(), cuenta: cuenta || cuentaNum }
      const k = m.nroMov + '|' + m.fecha + '|' + m.saldo + '|' + (cargo + abono)
      if (!vistos.has(k)) { vistos.add(k); movs.push(m) }
    }
    for (const det of lotesMov) for (const m of det.map((x) => _normMov(x, cuentaNum))) {
      const k = m.nroMov + '|' + m.fecha + '|' + m.saldo + '|' + (m.cargo + m.abono)
      if (!vistos.has(k)) { vistos.add(k); movs.push(m) }
    }
    ctx.off('response', onResp)
    movs.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
    return movs
  } catch (e) { log('  movs: navegación falló:', e.message); ctx.off('response', onResp); return [] }
}

async function leerSaldosTodas(ctx, page, log) {
  let objetivos = []
  try { objetivos = JSON.parse(process.env.TEK_EMPRESAS_JSON || '[]') } catch { /* */ }
  // esperar a que termine el redirect post-login (igual criterio que listarEmpresasBanco)
  for (let i = 0; i < 24; i++) {
    await sleep(1500)
    const u = page.url()
    const t = await page.evaluate(() => (document.body?.innerText || '').slice(0, 400)).catch(() => '')
    const enApp = /privado\.officebanking/i.test(u) && !/\/login|redireccionando|validate_user/i.test(u + ' ' + t)
    if (enApp && /(empresa|saldo|selector|contrato|inicio|cuenta)/i.test(t + ' ' + u)) { log('lector: app cargada tras redirect'); break }
    if (/error-seguridad/i.test(u)) { log('lector: muro antifraude en redirect'); break }
  }
  const resultados = []
  for (const empresa of objetivos) {
    let saldos = null
    const onResp = async (r) => {
      try { if (/account_summary/i.test(r.url())) { const b = JSON.parse(await r.text()); if (b?.listCustAccount) saldos = b.listCustAccount } } catch { /* */ }
    }
    ctx.on('response', onResp)
    try {
      await irAlSelectorEmpresas(page, log)
      await entrarEmpresa(page, log, empresa)
      // entrar a una empresa dispara account_summary; forzamos el dashboard si no cargó
      if (!/portal-fob|dashboard/i.test(page.url())) { await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {}) }
      for (let i = 0; i < 14 && !saldos; i++) await sleep(1500)
      const cuentas = (saldos || []).map((c) => ({ tipo: c.accountType, numero: c.accountNumber, moneda: c.moneyType || 'CLP', saldo: Number(c.balance || 0), ...(c.creditLine != null ? { linea_credito: Number(c.creditLine) } : {}) }))
      const totalCLP = cuentas.filter((c) => (c.moneda || 'CLP') === 'CLP').reduce((s, c) => s + c.saldo, 0)
      // MOVIMIENTOS (solo si TEK_LEER_MOVS=1): best-effort, NO rompe la lectura de saldos.
      let movimientos = null
      if (process.env.TEK_LEER_MOVS === '1' && saldos) {
        try { movimientos = await leerMovimientosActual(ctx, page, log, process.env.TEK_DESDE || '', saldos?.[0]?.accountNumber || ''); log(`lector: ${empresa} → ${movimientos.length} movimientos`) }
        catch (e) { log(`lector: movs de ${empresa} falló:`, e.message) }
      }
      resultados.push({ empresa, conecta: !!saldos, cuentas, total_clp: totalCLP, ...(movimientos ? { movimientos } : {}) })
      log(`lector: ${empresa} → ${saldos ? cuentas.length + ' cuentas, $' + totalCLP.toLocaleString('es-CL') : 'SIN saldo (no cargó)'}`)
    } catch (e) { resultados.push({ empresa, conecta: false, error: e.message }); log(`lector: ${empresa} falló:`, e.message) }
    ctx.off('response', onResp)
  }
  return { total: resultados.length, conectan: resultados.filter((r) => r.conecta).length, empresas: resultados }
}

// EXPLORAR "Pagos Masivos / Nómina" (TEK_NOMINA=mapear). SOLO LECTURA: navega al módulo,
// mapea el submenú y la pantalla de carga de nómina. NO sube archivo, NO paga, NO confirma.
async function explorarNomina(page, log) {
  mkdirSync(DATA, { recursive: true })
  const sleepLargo = (ms) => pulsoSesion(page, ms)
  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  await sleepLargo(8000)
  // Forzar cambio de empresa SOLO si ya estamos DENTRO de una (clic "Empresa / Rol"). En login
  // fresco aterrizamos en el SELECTOR → NO clickear eso (rompe la sesión); entrarEmpresa basta.
  const enSelector = /seleccion-empresa|listado de empresas|selecciona.*empresa/i.test(page.url() + ' ' + (await page.evaluate(() => document.body?.innerText || '').catch(() => '')))
  if (process.env.TEK_FORCE_EMPRESA === '1' && !enSelector) {
    for (const f of page.frames()) { const b = f.getByText(/Empresa\s*\/\s*Rol/i).first(); if (await b.count().catch(() => 0)) { await clickHumano(page, b).catch(() => {}); log('nómina: clic "Empresa / Rol" (ya adentro)'); break } }
    await sleepLargo(6000)
  }
  await entrarEmpresa(page, log, process.env.TEK_EMPRESA || 'ANA CLARA')
  await sleepLargo(rnd(3000, 5000))
  await cerrarPopups(page, log)
  await sleepLargo(1500)
  // clic "Pagos Masivos" (menú lateral) con reintentos: texto exacto → contiene, click forzado.
  let clic = false
  for (let i = 0; i < 5 && !clic; i++) {
    for (const f of page.frames()) {
      let m = f.getByText(/^\s*Pagos Masivos\s*$/i).first()
      if (!(await m.count().catch(() => 0))) m = f.getByText(/Pagos Masivos/i).first()
      if (await m.count().catch(() => 0)) { const ok = await m.click({ force: true, timeout: 3000 }).then(() => true).catch(() => false); if (ok) { clic = true; log('nómina: clic "Pagos Masivos"'); break } }
    }
    if (!clic) await sleepLargo(2500)
  }
  await sleepLargo(6000)
  await page.screenshot({ path: join(DATA, 'nomina-01-menu.png') }).catch(() => {})
  writeFileSync(join(DATA, 'nomina-menu.json'), JSON.stringify({ paso: 'menu', url: page.url(), forms: await volcarFrames(page) }, null, 2))
  let sub = ''
  for (const re of [/^\s*Importaci[oó]n\s*$/i, /Carga.*N[oó]mina/i, /^\s*N[oó]mina\s*$/i, /Crear.*N[oó]mina/i, /^\s*Cargar\s*$/i, /Importar/i]) {
    for (const f of page.frames()) {
      const o = f.getByText(re).first()
      if ((await o.count().catch(() => 0)) && (await o.isVisible().catch(() => false))) { await clickHumano(page, o).catch(() => {}); sub = re.source; log('nómina: entré a submenú', re.source); break }
    }
    if (sub) break
  }
  await sleepLargo(7000)
  await page.screenshot({ path: join(DATA, 'nomina-02-carga.png') }).catch(() => {})
  writeFileSync(join(DATA, 'nomina-carga.json'), JSON.stringify({ paso: 'carga', submenu: sub, url: page.url(), forms: await volcarFrames(page) }, null, 2))
  let fileInputs = 0
  for (const f of page.frames()) { fileInputs += await f.locator('input[type="file"]').count().catch(() => 0) }
  log(`nómina: mapeado (clic_pagos_masivos=${clic}, submenu=${sub || '?'}, inputs_file=${fileInputs})`)
  if (!clic || fileInputs === 0) {
    try { registrarIncidente({ flujo: 'nomina', estado: !clic ? 'no_encontre_pagos_masivos' : 'nomina_sin_input_archivo', url: page.url(), empresa: process.env.TEK_EMPRESA, user: process.env.TEK_USER, screenshots: ['nomina-01-menu.png', 'nomina-02-carga.png', 'nomina-menu.json', 'nomina-carga.json'] }) } catch { /* */ }
  }
  return { estado: 'nomina_mapeada', clic, submenu: sub, file_inputs: fileInputs, url: page.url() }
}

/**
 * Deja la pantalla del mini USABLE DESDE UN TELÉFONO antes de pedirle a la persona que entre:
 * el banco al frente y a pantalla completa, el botón "Aceptar" centrado, y la pantalla despierta.
 * Todo best-effort: si algo falla, el login asistido sigue funcionando igual.
 */
async function prepararPantallaAsistida(page, log, profileDir) {
  // 1) Que no se duerma la pantalla (ni salte el protector) durante la ventana de ingreso.
  try {
    const seg = Math.ceil((Number(process.env.TEK_ASSIST_ESPERA_MS || 600_000) || 600_000) / 1000) + 120
    spawn('/usr/bin/caffeinate', ['-dimsu', '-t', String(seg)], { detached: true, stdio: 'ignore' }).unref()
  } catch { /* */ }

  // 2) El banco AL FRENTE: la pestaña (CDP) y la ventana de macOS. Si el mini tiene otras
  //    ventanas abiertas, la vista VNC mostraba esas y no el banco.
  try { await page.bringToFront() } catch { /* */ }
  // El PID que hay que traer al frente es el del CHROME que lanzamos (no el de node): lo
  // ubicamos por su user-data-dir, que es único de este perfil de banco.
  const correr = (cmd, args) => new Promise((res) => {
    try { execFile(cmd, args, { timeout: 5000 }, (e, out) => res(e ? '' : String(out || ''))) } catch { res('') }
  })
  try {
    if (profileDir) {
      const pids = (await correr('/usr/bin/pgrep', ['-f', 'user-data-dir=' + profileDir])).trim().split(/\s+/).filter(Boolean)
      if (pids.length) {
        await correr('/usr/bin/osascript', ['-e', `tell application "System Events" to set frontmost of (first process whose unix id is ${pids[0]}) to true`])
        log('banco traído al frente (pid ' + pids[0] + ')')
      }
    }
  } catch { /* necesita permisos de accesibilidad; el fullscreen igual tapa casi todo */ }

  // 3) El botón "Aceptar" CENTRADO: sin scroll y sin buscarlo. NO lo clickeamos (eso lo tiene
  //    que hacer la persona: el clic real es lo que pasa BioCatch), solo lo dejamos a tiro.
  try {
    const btn = await firstVisible(page, ['#doLoginButton', '#office-banking-login button[type="submit"]', 'button:has-text("Aceptar")'])
    if (btn) { await btn.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {}); log('botón Aceptar a la vista ✓') }
    else log('no encontré el botón Aceptar para centrarlo (sigue igual, la persona lo ve en pantalla)')
  } catch { /* */ }

  // 4) AVISARLE A LA PÁGINA /vnc que el banco YA está listo. Sin esto, quien abre el link
  //    rápido (antes de que Chrome termine de cargar el form) ve el escritorio del mini con
  //    ventanas encima y cree que es la pantalla de bloqueo — le pasó a Ramón el 04-ago.
  escribirEstadoVnc('listo_para_aceptar')
}

/** Estado para la página /vnc (la barra que ve la persona en el teléfono). Best-effort. */
function escribirEstadoVnc(estado, ok = false) {
  if (!process.env.TEK_OTP_FILE) return
  try {
    writeFileSync(process.env.TEK_OTP_FILE.replace(/[^/]*$/, '.novnc-estado'), JSON.stringify({ ok, estado, ts: Date.now() }))
  } catch { /* */ }
}

async function main() {
  // Tope duro del proceso. En ASISTIDO hay que darle aire: espera humana (10 min) + la
  // operación que corre después (crear la transferencia, subir el lote…). Si el tope fuera
  // 10 min, mataríamos el proceso justo cuando la persona termina de entrar.
  const topeMs = process.env.TEK_ASSIST === '1'
    ? (Number(process.env.TEK_ASSIST_ESPERA_MS || 600_000) || 600_000) + 8 * 60_000
    : (process.env.TEK_BATCH_FILE ? 25 * 60_000 : 600_000)   // batch = varias ops en 1 sesión → más aire
  setTimeout(() => { console.log('RESULTADO:', JSON.stringify({ estado: 'hard_timeout' })); process.exit(2) }, topeMs).unref?.()
  // Credenciales: primero la BÓVEDA cifrada (por usuario+empresa), con fallback al
  // .creds.json legacy. Env: TEK_USER (default 'ramon'), TEK_EMPRESA (default ANA CLARA).
  let rut, password
  // Override por ENV: flujo de VINCULACIÓN — probar las creds que el usuario acaba de
  // ingresar en el widget, ANTES de guardarlas (no tocan la bóveda hasta que confirma).
  if (process.env.TEK_RUT && process.env.TEK_CLAVE) {
    rut = process.env.TEK_RUT; password = process.env.TEK_CLAVE
  } else {
    try {
      const cred = obtenerCreds(process.env.TEK_USER || 'ramon', process.env.TEK_EMPRESA || 'ANA CLARA SPA')
      if (cred.ok) { rut = cred.rut; password = cred.clave }
    } catch { /* bóveda no disponible → fallback */ }
    if (!rut || !password) {
      const j = JSON.parse(readFileSync(join(DIR, '.creds.json'), 'utf8')); rut = j.rut; password = j.password
    }
  }
  // SAFEGUARD: si ya hay una sesión de banco corriendo, NO abro otra (evita chocar el
  // perfil y re-loguear al pedo). Espero a que se libere; si no se libera, aviso y salgo.
  if (!(await adquirirLock())) {
    const r = { estado: 'ocupado', nota: 'Ya hay una sesión de banco activa; no abrí otra para no chocar el perfil ni gatillar el antifraude. Reintentá cuando termine.' }
    // Si esto corre suelto (login asistido con una operación enganchada) nadie lee el stdout:
    // dejamos el resultado en disco igual, para que el hub pueda avisarle a la persona.
    if (process.env.TEK_RESULTADO_FILE) { try { writeFileSync(process.env.TEK_RESULTADO_FILE, JSON.stringify({ ...r, ts: Date.now() }), { mode: 0o600 }) } catch { /* */ } }
    console.log('RESULTADO:', JSON.stringify(r))
    return
  }
  const headless = process.env.TEK_HEADLESS === '1'
  const assist = process.env.TEK_ASSIST === '1'
  // ASISTIDO MANUAL: además de no clickear Aceptar, NO pre-rellenamos RUT/clave →
  // el humano teclea TODO (login 100% humano = mejor pasada de BioCatch, y evita el
  // bug de la máscara comiéndose un dígito del RUT). Se usa con TEK_ASSIST=1.
  const assistManual = process.env.TEK_ASSIST_MANUAL === '1'
  const perfilReal = process.env.TEK_PROFILE_REAL === '1'
  // VINCULACIÓN (probar creds de un usuario para leer sus empresas): CLONAMOS el perfil
  // CONFIABLE (chrome-profile) a un dir temporal. Así heredamos la CONFIANZA DEL DISPOSITIVO
  // con el banco (cookies Incapsula/BioCatch, device token) → el antifraude NO lo trata como
  // dispositivo nuevo; pero AISLADO, sin pisar la sesión de ANA CLARA. Se borra al terminar.
  const vinculando = process.env.TEK_VINCULAR === 'empresas'
  const leerSaldos = process.env.TEK_LEER_SALDOS === '1'
  // ── SESIONES POR USUARIO ────────────────────────────────────────────────
  // TEK_USER elige el usuario. 'ramon' = perfil legacy (chrome-profile / session.json,
  // NO se toca → ANA CLARA sigue igual). Otro usuario = PERFIL PERSISTENTE PROPIO
  // (chrome-profile-<user>) con su device-trust y su session-<user>.json → así su
  // sesión se mantiene con el latido y se puede operar (transferir) desde sus empresas.
  const USER = (process.env.TEK_USER || 'ramon').toLowerCase()
  const esRamon = USER === 'ramon' || USER === ''
  const userSlug = (USER.replace(/[^a-z0-9]/g, '') || 'ramon')
  // AISLADO (perfil efímero en /tmp) = SOLO vinculación (probar creds ANTES de guardarlas).
  const aislado = vinculando
  // SESIÓN-USUARIO (perfil persistente por usuario ≠ ramon).
  const sesionUsuario = !esRamon && !vinculando
  const PROFILE_USER = join(DIR, 'chrome-profile-' + userSlug)
  const SESSION_TARGET = esRamon ? SESSION_FILE : join(DIR, 'session-' + userSlug + '.json')
  // El storageState son las cookies VIVAS del banco: entrar con ese archivo no pide clave.
  // Playwright lo escribe con el umask (644), así que lo cerramos a 600 en cada guardado.
  const guardarSesion = async (ctx) => {
    try { await ctx.storageState({ path: SESSION_TARGET }) } catch { return }
    try { chmodSync(SESSION_TARGET, 0o600) } catch {}
  }
  // Solo lo que da la confianza del dispositivo (no los caches de GB).
  const TRUST_ITEMS = ['Local State', 'First Run', 'Default/Cookies', 'Default/Cookies-journal', 'Default/Network', 'Default/Local Storage', 'Default/Session Storage', 'Default/WebStorage', 'Default/Preferences', 'Default/Trust Tokens', 'Default/Shared Dictionary']
  let recienSembrado = false
  let profileDir
  if (perfilReal) profileDir = join(process.env.HOME, 'Library/Application Support/Google/Chrome')
  else if (aislado) {
    profileDir = join('/tmp', 'tek-vinc-' + String(rut || 'x').replace(/[^0-9kK]/g, '') + '-' + process.pid)
    try { rmSync(profileDir, { recursive: true, force: true }) } catch { /* */ }
    try {
      mkdirSync(join(profileDir, 'Default'), { recursive: true })
      for (const it of TRUST_ITEMS) { const s = join(PROFILE_TEK, it); if (existsSync(s)) { try { cpSync(s, join(profileDir, it), { recursive: true }) } catch { /* */ } } }
      log('vincular: perfil confiable clonado (device-trust heredado)')
    } catch (e) { log('vincular: clon de perfil falló:', e.message) }
  } else if (sesionUsuario) {
    profileDir = PROFILE_USER
    // Primera vez para este usuario → SEMBRAR device-trust desde el perfil confiable
    // (persistente, una sola vez). Después el perfil acumula su propia confianza.
    if (!existsSync(join(PROFILE_USER, 'Default', 'Cookies'))) {
      try {
        mkdirSync(join(PROFILE_USER, 'Default'), { recursive: true })
        for (const it of TRUST_ITEMS) { const s = join(PROFILE_TEK, it); if (existsSync(s)) { try { cpSync(s, join(PROFILE_USER, it), { recursive: true }) } catch { /* */ } } }
        recienSembrado = true
        log(`sesión-usuario ${USER}: perfil nuevo sembrado con device-trust`)
      } catch (e) { log('sesión-usuario: siembra falló:', e.message) }
    } else log(`sesión-usuario ${USER}: perfil propio existente`)
  } else profileDir = PROFILE_TEK
  // PROXY RESIDENCIAL CL (como Rail): si están las creds en el env, salimos por una IP
  // residencial chilena limpia en vez de la del mini (que se quema al re-loguear seguido
  // → Akamai/Incapsula al muro "reinicia tu wifi" = device_trust). Sesión STICKY por
  // usuario (TEK_PROXY_SESSION) → el mismo usuario cae siempre en la misma IP (cookies
  // anti-bot _abck/bm_sv sobreviven). BrightData usa separador '-session-', SmartProxy '_session-'.
  let proxy
  if (process.env.TEK_PROXY_URL && process.env.TEK_PROXY_USER && process.env.TEK_PROXY_PASS) {
    const sep = process.env.TEK_PROXY_SEP || '-session-'   // '-session-' brightdata | '_session-' smartproxy
    const sess = (process.env.TEK_PROXY_SESSION || String(rut || '').replace(/[^0-9kK]/g, '') || 'tek').slice(0, 24)
    proxy = { server: process.env.TEK_PROXY_URL, username: process.env.TEK_PROXY_USER + sep + sess, password: process.env.TEK_PROXY_PASS }
    log(`proxy residencial ON (${process.env.TEK_PROXY_URL}, sticky=${sess})`)
  } else if (process.env.TEK_PROXY_URL) {
    // Proxy SIN auth (ej. túnel SOCKS local a una IP limpia): solo server.
    proxy = { server: process.env.TEK_PROXY_URL }
    log(`proxy ON sin-auth (${process.env.TEK_PROXY_URL})`)
  }
  // VENTANA PERSISTENTE: si el daemon (banco-navegador.mjs) publicó su ventana para este usuario,
  // NOS CONECTAMOS a ESA MISMA ventana (una sola, reusada) en vez de abrir un Chrome nuevo. Así el
  // corazón y las operaciones comparten una ventana → no se acumulan cientos de Chrome. Si el daemon
  // no está, abrimos la nuestra como siempre (fallback seguro).
  let ctx, conectado = false, browserCDP = null
  const cdpFile = join(DIR, 'data', `cdp-${userSlug}.txt`)
  // ⛔ NO reusar la ventana CDP por defecto (04-ago, lo cazó Ramón): esa ventana abre Chrome con
  //   --remote-debugging-port, que Incapsula/BioCatch detectan como AUTOMATIZACIÓN → muestran el
  //   muro "usa otra conexión" AUNQUE la IP esté limpia. Prueba: el login de las 10:39 (sin la
  //   ventana CDP, Chrome propio de Patchright) PASÓ; los de después (conectados al CDP) rebotaron
  //   al muro. Patchright oculta su propio control; el puerto de debug expuesto NO. Por eso el
  //   login SIEMPRE abre su propio Chrome stealth. TEK_USAR_CDP=1 lo reactiva (solo para depurar).
  if (process.env.TEK_USAR_CDP === '1' && !aislado && !perfilReal && existsSync(cdpFile)) {
    try {
      const ep = readFileSync(cdpFile, 'utf8').trim()
      browserCDP = await chromium.connectOverCDP(ep, { timeout: 8000 })
      ctx = browserCDP.contexts()[0] || (await browserCDP.newContext())
      conectado = true
      log('navegador: CONECTADO a la ventana persistente (TEK_USAR_CDP=1) — OJO: puerto debug detectable')
    } catch (e) { log('navegador: no pude conectar al daemon → abro el mío. ' + e.message); conectado = false; ctx = null; browserCDP = null }
  }
  if (!ctx) {
    // KIOSCO: en la reconexión asistida on-demand (TEK_OTP_FILE) abrimos el banco en PANTALLA
    // COMPLETA → así la vista VNC muestra SOLO el banco (sin escritorio ni otras ventanas), sin
    // cambiar el modelo de seguridad (sigue siendo VNC con input real). No aplica a los flujos
    // automáticos (keepalive, etc.), que conservan el viewport probado.
    const kiosco = !!process.env.TEK_OTP_FILE || process.env.TEK_KIOSCO === '1'
    const baseArgs = perfilReal ? ['--profile-directory=Default', '--disable-background-networking', '--disable-sync', '--no-first-run'] : []
    // PARA EL TELÉFONO: el que mira por /vnc ve la pantalla del mini (1920x1080) escalada a un
    // celular → el form del banco quedaba diminuto. Con device-scale-factor 2 la página se
    // dibuja al DOBLE, así el botón "Aceptar" es un blanco grande y se toca a la primera.
    // Ajustable con TEK_ASSIST_ZOOM (2 = default; 1 = como antes).
    const zoom = Number(process.env.TEK_ASSIST_ZOOM || 2) || 2
    // Patchright recomienda mínimos args (nada de --no-sandbox/UA: son señales de bot).
    ctx = await chromium.launchPersistentContext(profileDir, {
      headless, channel: 'chrome',
      ...(proxy ? { proxy } : {}),
      args: kiosco
        ? [...baseArgs, '--start-fullscreen', '--window-position=0,0', `--force-device-scale-factor=${zoom}`]
        : baseArgs,
      viewport: kiosco ? null : { width: 1360, height: 860 }, locale: 'es-CL', timezoneId: 'America/Santiago',
      acceptDownloads: true,   // para bajar los PDF de la cartola histórica
    })
  }
  const mapearOn = process.env.TEK_MAPEAR === '1'
  const capturarOn = process.env.TEK_CAPTURAR === '1'
  const transferirMapear = process.env.TEK_TRANSFERIR === 'mapear'   // SOLO mapea el form, no mueve plata
  if (mapearOn) { ctx.on('request', (r) => regNet(r.method(), r.url())); ctx.on('response', (r) => regNet(r.request().method(), r.url(), r.status())) }
  for (const p of ctx.pages().slice(1)) { try { await p.close() } catch {} }
  const page = ctx.pages()[0] || await ctx.newPage()
  // LOGGER DE RED (cazador de endpoints, ON POR DEFECTO desde 04-ago — se apaga con TEK_LOG_XHR=0):
  //   caza los endpoints JSON que la web de Office Banking llama por
  // detrás → para descubrir la API REAL del banco y después llamarla directo (robusto, sin leer
  // HTML). Vuelca a data/xhr-endpoints.json, deduplicado por método+host+ruta, con una muestra.
  if (process.env.TEK_LOG_XHR !== '0') {
    const XHR_FILE = join(DATA, 'xhr-endpoints.json')
    let vistos = {}
    try { vistos = JSON.parse(readFileSync(XHR_FILE, 'utf8')) } catch { vistos = {} }
    page.on('response', async (resp) => {
      try {
        const url = resp.url()
        if (!/officebanking\.cl|santander\.cl/i.test(url)) return
        const ct = (resp.headers()['content-type'] || '')
        const esJson = /json/i.test(ct)
        if (!esJson && !/\/api|\.UI\.Web\/|\/rest\/|\/v\d+\/|transactions|movimientos|saldo|account/i.test(url)) return
        const u = new URL(url)
        const clave = `${resp.request().method()} ${u.host}${u.pathname}`
        if (vistos[clave]) { vistos[clave].hits = (vistos[clave].hits || 1) + 1; return }
        let muestra = null
        if (esJson) { try { muestra = (await resp.text()).slice(0, 500) } catch { /* */ } }
        vistos[clave] = { url: u.href.slice(0, 220), method: resp.request().method(), status: resp.status(), content_type: ct, hits: 1, muestra }
        try { writeFileSync(XHR_FILE, JSON.stringify(vistos, null, 2)) } catch { /* */ }
      } catch { /* */ }
    })
    // GRABADORA DE PAYLOADS: además de las respuestas, guarda el CUERPO (postData) que
    // se ENVÍA a los endpoints de escritura/consulta de transferencia. Es el "molde" que
    // faltaba para poder llamar crearTransferencia directo por fetch (sin clickear el form).
    // Solo grabar; no altera el flujo. → data/xhr-payloads.json
    const PAY_FILE = join(DATA, 'xhr-payloads.json')
    let payloads = {}
    try { payloads = JSON.parse(readFileSync(PAY_FILE, 'utf8')) } catch { payloads = {} }
    // ANTES solo grababa el molde de transferencia. AMPLIADO (05-ago, "cazar el máximo"):
    // grabamos el postData de TODO POST a officebanking/santander (para poder replayar
    // cualquier acción después: cambiar empresa, saldos, cartola, transferencia…). Excluimos
    // el ruido de BioCatch/WUP (payloads binarios enormes de antifraude) y capamos el cuerpo.
    // wslogin = el POST del login (lleva la CLAVE en claro) + el sensor de Akamai/BioCatch:
    // NUNCA grabar su body. google/collect y assets = ruido. El resto de POST del banco sí.
    const RE_RUIDO = /wslogin\.officebanking|wup-|threatmetrix|biocatch|innoko|\/g\/collect|google\.com|\.png|\.js|\.css|\.woff|analytics|doubleclick|opinator/i
    page.on('request', (req) => {
      try {
        const url = req.url()
        if (req.method() !== 'POST') return
        if (!/officebanking\.cl|santander\.cl/i.test(url) || RE_RUIDO.test(url)) return
        const u = new URL(url)
        const clave = `POST ${u.host}${u.pathname}`
        let body = null
        try { body = req.postData() } catch { /* */ }
        if (body && body.length > 8000) body = body.slice(0, 8000) + '…[cortado]'
        payloads[clave] = { url: u.href.slice(0, 220), headers: req.headers(), postData: body, hits: (payloads[clave]?.hits || 0) + 1, ts_grabado: process.env.TEK_TS || null }
        try { writeFileSync(PAY_FILE, JSON.stringify(payloads, null, 2)); chmodSync(PAY_FILE, 0o600) } catch { /* */ }
        log(`  ⇡ payload grabado: ${u.pathname.split('/').pop()}`)
      } catch { /* */ }
    })
    log('LOGGER DE RED ON → cazando endpoints + payloads del banco → data/xhr-endpoints.json + xhr-payloads.json')
  }
  const cerrar = async () => {
    // Guardamos la sesión en el archivo del USUARIO (ramon → session.json; otro →
    // session-<user>.json). En VINCULACIÓN (aislado) no guardamos y borramos el clon /tmp.
    if (!aislado) await guardarSesion(ctx)
    if (conectado) {
      // Conectados al daemon: NO cerramos la ventana persistente (queda viva para el próximo).
      // Cerramos las pages extra que hayamos abierto y solo DESCONECTAMOS.
      try { for (const p of ctx.pages().slice(1)) { await p.close().catch(() => {}) } } catch {}
      try { await browserCDP.close() } catch {}
    } else {
      try { await ctx.close() } catch {}
    }
    if (aislado && profileDir.startsWith('/tmp/tek-vinc-')) { try { rmSync(profileDir, { recursive: true, force: true }) } catch {} }
  }
  const shot = (n) => page.screenshot({ path: join(SHOTS, n) }).catch(() => {})
  // ¿Enviamos de verdad un login (clic en Aceptar con credenciales)? Solo entonces un rebote a
  // "sesión finalizada" (error_seguridad) es un GOLPE de dispositivo real. Si la sesión ya
  // estaba terminada / se cayó a mitad SIN que hayamos logueado, NO es device_trust — contarlo
  // inflaba el "reposo" falsamente (lo cazó Ramón el 04-ago: 2 de 3 golpes de hoy eran esto).
  let loginIntentado = false
  const fin = async (estado, extra = {}) => {
    // device_trust real (muro Incapsula) SIEMPRE cuenta. error_seguridad SOLO si veníamos de
    // enviar un login (rebote real); si no, es una sesión que terminó normal → no es golpe.
    const esGolpe = /device_trust/.test(estado) || (/error_seguridad/.test(estado) && loginIntentado)
    if (esGolpe) { try { registrarDeviceTrust(userSlug) } catch { /* */ } }
    // Flag de RECONEXIÓN (para la página /vnc): avisa si conectó bien → la web muestra "✅ conectado".
    if (process.env.TEK_OTP_FILE) {
      try {
        const ok = /^(logueado|keepalive_ok)$/.test(estado)
        writeFileSync(process.env.TEK_OTP_FILE.replace(/[^/]*$/, '.novnc-estado'), JSON.stringify({ ok, estado, ts: Date.now() }))
      } catch { /* */ }
    }
    const resultado = { estado, url: page.url(), ...extra }
    // MARCADOR DE REACTIVACIÓN: SOLO cuando hubo un LOGIN REAL (estado 'logueado', y NO en
    // modo keepalive). Es la ÚNICA señal legítima de "la sesión volvió". El corazón la mira
    // para saber que puede retomar el latido; NUNCA reactiva por un simple cambio de mtime
    // (un keepalive o una lectura que pegó en "sesión cerrada" también reescriben session.json).
    // Ver [[tek-corazon-cadencia]]: si la sesión terminó, el corazón NO reintenta hasta este marcador.
    if (estado === 'logueado' && process.env.TEK_KEEPALIVE !== '1') {
      try { writeFileSync(join(DATA, '.sesion-reactivada-' + userSlug), JSON.stringify({ ts: Date.now(), via: extra?.via || null }), { mode: 0o600 }) } catch { /* */ }
    }
    // RESULTADO EN ARCHIVO: cuando el proceso corre SUELTO (login asistido con una operación
    // enganchada), nadie está leyendo el stdout. Con TEK_RESULTADO_FILE dejamos el resultado
    // en disco para que el hub lo levante y le avise a la persona cómo quedó.
    if (process.env.TEK_RESULTADO_FILE) {
      try { writeFileSync(process.env.TEK_RESULTADO_FILE, JSON.stringify({ ...resultado, ts: Date.now() }), { mode: 0o600 }) } catch { /* */ }
    }
    await shot(`fin-${estado}.png`); console.log('RESULTADO:', JSON.stringify(resultado)); await cerrar()
  }

  // Acciones post-login (mapear/capturar/transferir) — reutilizables tanto si
  // REUSAMOS la sesión viva como si logueamos de cero.
  const acciones = async (via) => {
    // ── MODO BATCH (TEK_BATCH_FILE): UN login, VARIAS operaciones seguidas en LA MISMA sesión.
    //    Entre operaciones NO se re-loguea: se cambia de empresa por el SELECTOR (Empresa/Rol →
    //    Volver a selector), reusando esta sesión viva. Cada op del JSON:
    //    { empresa, accion:'normal'|'masiva', monto, dest:{cuenta,rut,nombre,email,banco},
    //      motivo, concepto?, masivaFile? }. Devuelve { batch:[...] }.
    if (process.env.TEK_BATCH_FILE && existsSync(process.env.TEK_BATCH_FILE)) {
      let ops = []
      try { ops = JSON.parse(readFileSync(process.env.TEK_BATCH_FILE, 'utf8')).operaciones || [] } catch (e) { log('batch: no pude leer el archivo: ' + e.message) }
      const resultados = []
      for (let i = 0; i < ops.length; i++) {
        const op = ops[i]
        log(`\n===== BATCH ${i + 1}/${ops.length}: ${op.accion} · ${op.empresa} · $${op.monto} =====`)
        // Las funciones (crearTransferencia/masivaImportar) leen de process.env: seteamos por-op.
        process.env.TEK_EMPRESA = op.empresa
        process.env.TEK_FORCE_EMPRESA = '1'    // cambiar de empresa por el selector, NO re-login
        process.env.TEK_MONTO = String(op.monto)
        process.env.TEK_MOTIVO = op.motivo || 'prueba'
        if (op.dest) {
          process.env.TEK_DEST_CUENTA = op.dest.cuenta || ''
          process.env.TEK_DEST_RUT = op.dest.rut || ''
          process.env.TEK_DEST_NOMBRE = op.dest.nombre || ''
          process.env.TEK_DEST_EMAIL = op.dest.email || ''
          process.env.TEK_DEST_BANCO = op.dest.banco || 'Santander'
        }
        let r = null
        try {
          if (op.accion === 'masiva') {
            process.env.TEK_MASIVA = 'subir'; process.env.TEK_MASIVA_FILE = op.masivaFile || ''
            if (op.concepto) process.env.TEK_MASIVA_CONCEPTO = op.concepto
            r = await masivaImportar(page, log)
          } else {
            process.env.TEK_CREAR = 'crear'
            r = await crearTransferencia(page, log)
          }
        } catch (e) { r = { estado: 'error', error: e.message } }
        resultados.push({ empresa: op.empresa, accion: op.accion, monto: op.monto, resultado: r })
        // Si la sesión murió a mitad (antifraude), NO seguir machacando: cortamos el batch.
        if (r && /sesion_caida|error_seguridad|sesion_muerta|device_trust/i.test(String(r.estado || ''))) {
          log('batch: la sesión se cayó → corto acá para no forzar más logins'); break
        }
        // Volver al dashboard entre ops (deja la sesión lista para el próximo cambio de empresa).
        await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 25_000 }).catch(() => {})
        await sleep(rnd(3000, 5000))
      }
      try { await guardarSesion(ctx) } catch { /* */ }
      return { batch: resultados, total: resultados.length }
    }
    let mapa = null, cap = null, transf = null
    if (mapearOn) { try { mapa = await mapear(page, log, shot) } catch (e) { log('mapear falló:', e.message) } }
    if (capturarOn) { try { cap = await capturarData(ctx, page, log) } catch (e) { log('capturar falló:', e.message) } }
    if (transferirMapear) { try { transf = await mapearTransferencia(ctx, page, log) } catch (e) { log('transf falló:', e.message) } }
    let crear = null
    if (['mapear', 'llenar', 'crear'].includes(process.env.TEK_CREAR)) {
      try { crear = await crearTransferencia(page, log) } catch (e) { log('crear falló:', e.message) }
      // Dejar la sesión TIBIA: tras transferir el corazón no pudo latir (candado ocupado).
      // Antes de cerrar el navegador, volvemos al dashboard y guardamos cookies — así el
      // próximo latido/pedido reusa la sesión sin relogin.
      if (!aislado) {
        try {
          await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 25_000 }).catch(() => {})
          await sleep(rnd(2000, 3500))
          await guardarSesion(ctx)
          log('sesión tibada post-transferencia (dashboard + storageState)')
        } catch (e) { log('tibar sesión falló:', e.message) }
      }
    }
    let nomina = null
    if (process.env.TEK_NOMINA === 'mapear') { try { nomina = await explorarNomina(page, log) } catch (e) { log('nómina falló:', e.message) } }
    let masiva = null
    if (['map', 'subir'].includes(process.env.TEK_MASIVA)) { try { masiva = await masivaImportar(page, log) } catch (e) { log('masiva falló:', e.message) } }
    let carthist = null
    if (['map', 'bajar'].includes(process.env.TEK_CARTOLA_HIST)) { try { carthist = await cartolaHistorica(page, log) } catch (e) { log('carthist falló:', e.message) } }
    let comprob = null
    if (['map', 'listar', 'bajar'].includes(process.env.TEK_COMPROBANTES)) { try { comprob = await comprobantesConsulta(page, log) } catch (e) { log('comprobantes falló:', e.message) } }
    let vincular = null
    if (process.env.TEK_VINCULAR === 'empresas') { try { vincular = await listarEmpresasBanco(page, log) } catch (e) { log('vincular falló:', e.message) } }
    let lectura = null
    if (leerSaldos) { try { lectura = await leerSaldosTodas(ctx, page, log) } catch (e) { log('lector falló:', e.message) } }
    let pendientes = null
    if (process.env.TEK_VER_PENDIENTES === '1') { try { pendientes = await verPendientes(page, log) } catch (e) { log('ver pendientes falló:', e.message) } }
    const extras = { ...(mapa ? { mapa } : {}), ...(cap ? { cap } : {}), ...(transf ? { transf } : {}), ...(crear ? { crear } : {}), ...(nomina ? { nomina } : {}), ...(masiva ? { masiva } : {}), ...(carthist ? { carthist } : {}), ...(comprob ? { comprob } : {}), ...(vincular ? { vincular } : {}), ...(lectura ? { lectura } : {}), ...(pendientes ? { pendientes } : {}) }
    // FIX: si la sesión murió al muro antifraude DURANTE las acciones (ej. la transferencia
    // rebotó a error-seguridad), NO reportar 'logueado' (falseaba el estado y el throttle NO
    // registraba el device_trust → seguía re-machacando la cuenta). fin('error_seguridad')
    // registra el device_trust para el cooldown. Conservamos los resultados parciales.
    try {
      if (await sesionCaida(page)) {
        return fin('error_seguridad', { via, nota: `la sesión se cayó al muro antifraude durante "${via}" (device_trust registrado para el cooldown).`, ...extras })
      }
    } catch { /* */ }
    return fin('logueado', { via, nota: `home de privado (${via}).`, ...extras })
  }

  // ── REUSO DE SESIÓN (lo que pidió Ramón): antes de loguear, probar si la sesión
  // guardada sigue viva yendo directo al dashboard. Si carga logueado → capturamos SIN
  // login (evita ingresos de más que flagean a Santander). Solo si nos bota, logueamos.
  const keepAlive = process.env.TEK_KEEPALIVE === '1'
  // recienSembrado = perfil nuevo que HEREDÓ la sesión de ANA CLARA → NO reusar (sería la
  // sesión equivocada); hay que logout-first + login como el usuario real.
  // ASISTIDO: también probamos la sesión ANTES de pedirle nada al humano. Si sigue viva,
  // la operación corre sola y el PIN que se mandó no hace falta (mejor que quemar un login
  // al pedo). Si no está viva, seguimos al form y esperamos al humano como siempre.
  if (process.env.TEK_FORZAR_LOGIN !== '1' && !recienSembrado) {
    await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
    await sleep(rnd(4000, 6000))
    const u = page.url()
    const viva = u.includes(PRIVADO) && !/\/login|error-seguridad|logout/i.test(u) && !(await textoVisible(page, DEVICE_RE))
    // ── LATIDO (keep-alive): mantiene VIVA la sesión sin re-loguear (la 3ª pata de Rail:
    //    refrescar cookies antes de que expire, no re-loguearse). Navegación suave que
    //    resetea el timer de inactividad (~10-15 min) + reguarda storageState. Si NO hay
    //    sesión viva, NO loguea (eso lo hace un login normal, no el latido).
    if (keepAlive) {
      if (viva) {
        // LATIDO HUMANO: variamos el comportamiento (nunca el MISMO patrón exacto = huella de bot)
        // y generamos ACTIVIDAD REAL (no solo recargar la SPA) para resetear el timer del banco.
        await moveTo(page, rnd(300, 1000), rnd(200, 600)); await idle(page, rnd(700, 1500))
        if (chance(0.55)) { try { await scrollHumano(page, rnd(120, 340)) } catch { /* */ } }
        const modo = ri(1, 3)
        if (modo === 1) {
          // "ojear la cuenta": hover un ítem del menú que trae datos (fetch autenticado real)
          try {
            const it = page.getByText(/^(Cuentas Corrientes|Resumen de Productos|Tarjetas)$/i).first()
            if (await it.count().catch(() => 0)) { await moveToLoc(page, it).catch(() => {}); await sleep(rnd(700, 1400)) }
          } catch { /* */ }
          await sleep(rnd(1600, 3000))
        } else if (modo === 2) {
          // recargar el dashboard (refresca cookies + datos), como quien vuelve a la portada
          await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
          await sleep(rnd(2500, 4500))
        } else {
          // presencia mínima: deriva de mouse + micro-scroll (poca huella, algún latido "tranquilo")
          await idle(page, rnd(1500, 3200))
          try { await scrollHumano(page, rnd(-140, 160)) } catch { /* */ }
        }
        await moveTo(page, rnd(300, 1000), rnd(200, 600)); await idle(page, rnd(500, 1200))
        await guardarSesion(ctx)
        return fin('keepalive_ok', { nota: 'sesión mantenida viva (latido humano)', user: USER })
      }
      return fin('sesion_muerta', { nota: 'no hay sesión viva que mantener; el latido NUNCA loguea' })
    }
    if (viva) {
      log('✓ sesión viva REUTILIZADA (sin login)')
      // calentamiento humano: mover el mouse y "leer" antes de operar
      await moveTo(page, rnd(400, 950), rnd(240, 560)); await idle(page, rnd(900, 1800))
      if (chance(0.6)) await scrollHumano(page, rnd(120, 260))
      return acciones('reuso')
    }
    log('sesión no reutilizable → hago login')
    // CANDADO ANTI-BLOQUEO POR CLAVE MALA: si un login anterior ya fue RECHAZADO por credenciales
    // (clave incorrecta / vieja / de prueba), NO reintentamos con la MISMA clave: Santander bloquea
    // la cuenta a los ~3 rechazos. Quedamos PAUSADOS hasta que la persona actualice su clave por
    // /banco/clave (ahí se borra este flag). TEK_IGNORAR_THROTTLE=1 lo salta.
    try {
      const pausaFile = join(DATA, `.login-pausado-${userSlug}.json`)
      if (existsSync(pausaFile) && process.env.TEK_IGNORAR_THROTTLE !== '1') {
        log(`PAUSADO: ${userSlug} tiene la clave marcada como rechazada → NO logueo (evita bloqueo de la cuenta)`)
        return fin('login_pausado_clave', { nota: `El login de ${userSlug} está PAUSADO porque la clave guardada fue rechazada por el banco. NO reintento con la misma (Santander bloquea a los ~3 rechazos). El usuario debe poner su clave nueva en /banco/clave; ahí se reactiva solo.` })
      }
    } catch { /* */ }
    // CANDADO ANTI-QUEMADO: antes de un login REAL, chequear el throttle por cuenta. Si se pasó
    // (device_trust reciente / gap mínimo / tope por hora) NO logueamos → así no se marca la cuenta.
    // TEK_IGNORAR_THROTTLE=1 lo salta (solo para un login asistido/deliberado puntual).
    // El ASISTIDO no pasa por el candado: lo teclea una persona (es el login que SÍ pasa el
    // antifraude) y ya viene pedido a mano — frenarlo dejaría al usuario con un link muerto.
    if (!assist && process.env.TEK_IGNORAR_THROTTLE !== '1') {
      const bloqueo = chequearThrottleLogin(userSlug)
      if (bloqueo) {
        log(`THROTTLE: NO logueo (${bloqueo.motivo}), esperar ~${bloqueo.esperaMin} min`)
        return fin('login_throttle', { motivo: bloqueo.motivo, espera_min: bloqueo.esperaMin, nota: `Candado anti-quemado: no entro al banco por ahora (${bloqueo.motivo}). Reintentar en ~${bloqueo.esperaMin} min. Es una PROTECCIÓN para no marcar la cuenta en Santander, NO un error ni una caída.` })
      }
    }
  } else if (keepAlive) {
    return fin('keepalive_omitido', { nota: 'assist/forzar-login activo; el latido no aplica' })
  }

  // VINCULACIÓN: el clon hereda la sesión de ANA CLARA. La CERRAMOS (logout) para que el login
  // del usuario sea LIMPIO y no dispare la re-validación (login?reason=validate_user). El logout
  // NO borra la confianza del dispositivo (cookies Incapsula/BioCatch persisten en el perfil).
  // SESIÓN FINALIZADA (pedido de Ramón, 04-ago): si la ventana quedó pegada en "sesión finalizada"
  // (error-seguridad/logout), NO la arrastramos — cerramos limpio para SIEMPRE llegar al formulario
  // de login fresco. Antes se operaba desde esa página muerta y parecía un bloqueo.
  const enPaginaFinalizada = /error-seguridad|\/logout/i.test(page.url())
  if (aislado || recienSembrado || enPaginaFinalizada) {
    await page.goto('https://privado.officebanking.cl/logout', { waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => {})
    await sleep(rnd(2000, 3500))
    log(enPaginaFinalizada ? 'sesión finalizada detectada → cerré limpio, voy al formulario de login' : 'aislado/sembrado: cerré la sesión heredada (device-trust intacto), voy al login limpio')
  }

  // HIGIENE: antes de un login FRESCO, limpiar las cookies antibot quemadas para no llegar
  // fichado (ver limpiarCookiesAntibot). Solo en login real; el reuso de sesión no pasa por acá.
  if (process.env.TEK_NO_HIGIENE !== '1') { await limpiarCookiesAntibot(ctx, log) }

  await page.goto(LANDING, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch((e) => log('goto:', e.message))
  await sleep(rnd(3500, 5500))
  // WARMUP humano: leer, mover el mouse por la página, scrollear, hover en el menú.
  await moveTo(page, rnd(300, 900), rnd(220, 560)); await idle(page, rnd(900, 1800))
  await page.mouse.wheel(0, rnd(160, 380)).catch(() => {}); await sleep(rnd(700, 1500))
  await moveTo(page, rnd(500, 1000), rnd(260, 520)); await idle(page, rnd(700, 1500))
  await page.mouse.wheel(0, rnd(-220, -80)).catch(() => {}); await sleep(rnd(500, 1100))
  await shot('h01-landing.png')

  // Abrir el modal de login como humano (mover al botón, hover, clic real).
  const alb = page.locator('app-login-button').first()
  if (await moveToLoc(page, alb)) { await sleep(rnd(120, 320)); await clickReal(page) }
  else await alb.click({ force: true, timeout: 4000 }).catch(() => {})
  await sleep(rnd(3500, 5200))
  await shot('h02-modal.png')
  if (await textoVisible(page, DEVICE_RE)) {
    // MURO de Incapsula ("revisa tu conexión"). En AUTO cortamos (perfil/IP caliente). En
    // ASISTIDO NO abandonamos al humano: limpiamos cookies antibot + reintentamos el formulario
    // UNA vez, así siempre le damos la mejor chance de ver el login (el humano es el que pasa).
    if (assist) {
      log('muro Incapsula en asistido → limpio cookies y reintento el formulario 1 vez')
      try { await limpiarCookiesAntibot(ctx, log) } catch { /* */ }
      await page.goto('https://privado.officebanking.cl/logout', { waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => {})
      await sleep(rnd(1500, 2500))
      await page.goto(LANDING, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
      await sleep(rnd(3000, 4500))
      const albR = page.locator('app-login-button').first()
      if (await moveToLoc(page, albR)) { await sleep(rnd(120, 320)); await clickReal(page) }
      else await albR.click({ force: true, timeout: 4000 }).catch(() => {})
      await sleep(rnd(3000, 4500))
      if (await textoVisible(page, DEVICE_RE)) return fin('device_trust', { nota: 'El banco muestra el muro "revisa tu conexión" aún tras limpiar. Es un bloqueo de IP/dispositivo (caliente): hay que dejarlo enfriar. NO es un login normal.' })
    } else {
      return fin('device_trust', { nota: 'Incapsula flageó la conexión/dispositivo (IP quemada o perfil sin confianza)' })
    }
  }

  // El form del modal puede tardar en renderizar (latencia de proxy/red): el modal abre pero
  // los campos RUT/clave aparecen unos segundos después. Polleamos hasta ~22s en vez de un
  // sleep fijo; si a mitad sigue vacío, re-clickeamos el botón de login una vez para forzarlo.
  let rutLoc, passLoc, reBoton = false
  const formDL = Date.now() + 22_000
  while (Date.now() < formDL) {
    rutLoc = await firstVisible(page, ['#office-banking-login #username', '#username', 'input[name="username" i]'])
    passLoc = await firstVisible(page, ['#office-banking-login #password', '#password', 'input[type="password"]'])
    if (rutLoc && passLoc) break
    if (await textoVisible(page, DEVICE_RE)) return fin('device_trust', { nota: 'Incapsula flageó la conexión/dispositivo (IP quemada o perfil sin confianza)' })
    if (!reBoton && Date.now() > formDL - 13_000) {
      reBoton = true
      const alb2 = page.locator('app-login-button').first()
      if (await moveToLoc(page, alb2)) { await sleep(rnd(120, 320)); await clickReal(page) }
      else await alb2.click({ force: true, timeout: 4000 }).catch(() => {})
      log('form vacío → re-clic botón de login (1 vez)')
    }
    await sleep(1200)
  }
  if (!rutLoc || !passLoc) return fin('sin_form', { nota: 'no apareció el form tras 22s (ver h02-modal.png)' })
  log('form de login visible ✓')

  // Llenar humano: mover, clic real, tipear con dwell, blur natural.
  // En ASISTIDO MANUAL saltamos el relleno: el form queda VACÍO para que lo teclee el humano.
  if (!assistManual) {
    await moveToLoc(page, rutLoc); await clickReal(page); await sleep(rnd(200, 500)); await humanType(page, rut)
    const rutOk = await ensureValue(page, rutLoc, rut, 'RUT')   // 🔧 la máscara se comía un dígito → verifico y corrijo
    // Si el RUT NO quedó bien, NO apretamos Aceptar: un RUT mal escrito hace que el banco diga
    // "datos inválidos" y el sistema lo confundía con "clave incorrecta" → le mandaba al usuario
    // un falso aviso de "cambiá tu clave". Abortamos con un estado propio (NO es la clave).
    if (!rutOk) {
      await shot('h03-rut-malo.png')
      return fin('rut_no_seteado', { nota: 'No pude escribir bien el RUT en el form (máscara). NO es la clave del usuario — es un problema de tecleo. Reintentar; NO pedir clave nueva.' })
    }
    await idle(page, rnd(500, 1200))
    await moveToLoc(page, passLoc); await clickReal(page); await sleep(rnd(200, 500)); await humanType(page, password)
    // clave: sin máscara, verifico exacto (no normalizado) y re-tipeo completo si hiciera falta.
    for (let i = 0; i < 3 && (await passLoc.inputValue().catch(() => '')) !== password; i++) {
      await passLoc.click().catch(() => {}); await page.keyboard.press('Meta+A').catch(() => {}); await page.keyboard.press('Backspace').catch(() => {})
      await sleep(rnd(200, 400)); await humanType(page, password)
    }
    await shot('h03-lleno.png')
  } else {
    log('MODO ASISTIDO MANUAL: form VACÍO → tecleá RUT + clave vos (por VNC), luego Aceptar + Superclave')
  }
  await idle(page, rnd(1200, 2600))   // que BioCatch acumule comportamiento

  if (assist) {
    // El humano va a enviar el login (Aceptar + Superclave): desde acá un rebote a error_seguridad
    // SÍ es un golpe real de dispositivo.
    loginIntentado = true
    // MODO ASISTIDO: NO clickeamos Aceptar. Esperamos a que el humano (por VNC) lo haga
    // + Superclave. Polleamos hasta aterrizar en privado; guardamos la sesión.
    //
    // ANTES DE ESPERAR, dejamos la pantalla LISTA PARA UN TELÉFONO (03-ago: Ramón abrió el
    // link y vio el escritorio del mini con ventanas encima, peleó con eso y se le venció):
    //   1. el banco al frente y a pantalla completa (tapa todo lo demás)
    //   2. el botón "Aceptar" centrado en la pantalla, sin scroll
    //   3. la pantalla despierta mientras dure la ventana
    await prepararPantallaAsistida(page, log, profileDir)
    // APRENDER del login humano: grabamos tu movimiento real (mouse/teclado) y el diálogo con
    // el antifraude. NO toca el login, solo observa. Con varias entradas tuyas armamos una
    // librería para, después, hacer que el login automático se MUEVA como vos. TEK_GRABAR=0 lo apaga.
    let grab = null
    if (process.env.TEK_GRABAR !== '0') {
      try {
        const gc = await import('./grabar-comportamiento.mjs')
        grab = await gc.grabarComportamiento(page, { user: USER, empresa: process.env.TEK_EMPRESA || '', via: 'asistido' })
        gc.sniffAntifraude(ctx, { user: USER })
        log('grabador de comportamiento ON → ' + grab.file.split('/').pop())
      } catch (e) { log('grabador no arrancó (no afecta el login): ' + e.message) }
    }
    // 5 min era poco: entre abrir WhatsApp, el link, el PIN y loguear se vencía. 10 por defecto.
    const esperaMs = Number(process.env.TEK_ASSIST_ESPERA_MS || 10 * 60_000) || 10 * 60_000
    log(`MODO ASISTIDO: hacé el clic en "Aceptar" + Superclave por VNC. Esperando hasta ${Math.round(esperaMs / 60000)} min…`)
    const deadline = Date.now() + esperaMs
    while (Date.now() < deadline) {
      if (page.isClosed()) break
      let onHome = false; try { const u = new URL(page.url()); onHome = u.host.includes(PRIVADO) && !/^\/(login|logout)|error-seguridad/i.test(u.pathname) } catch {}
      if (onHome) { if (grab) { try { await grab.cerrar(); log(`traza humana guardada: ${grab.contar()} eventos`) } catch { /* */ } } return acciones('asistido') }
      await sleep(2000)
    }
    if (grab) { try { await grab.cerrar() } catch { /* */ } }
    return fin('timeout_asistido', { nota: `no detecté el ingreso en ${Math.round(esperaMs / 60000)} min` })
  }

  // MODO AUTO: esperar que la red asiente (token/reCAPTCHA invisible) y clic humano en Aceptar.
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
  await sleep(rnd(600, 1400))
  const aceptar = await firstVisible(page, ['#doLoginButton', '#office-banking-login button[type="submit"]', 'button:has-text("Aceptar")'])
  if (!aceptar) return fin('sin_boton_aceptar')
  await moveToLoc(page, aceptar); await sleep(rnd(220, 560)); await clickReal(page)
  loginIntentado = true   // desde acá, un rebote a error_seguridad SÍ es un golpe de dispositivo real
  log('Aceptar clickeado (humano)')

  let deadline = Date.now() + 80_000
  let mfaHecha = false
  while (Date.now() < deadline) {
    if (page.isClosed()) break
    let onHome = false; try { const u = new URL(page.url()); onHome = u.host.includes(PRIVADO) && !/^\/(login|logout)|error-seguridad/i.test(u.pathname) } catch {}
    if (onHome) return acciones('login')
    if (/error-seguridad|\/logout/i.test(page.url())) return fin('error_seguridad', { nota: 'Santander botó la sesión al muro antifraude (Incapsula/BioCatch). Login manual por VNC para sembrar confianza, o IP más limpia.' })
    if (await textoVisible(page, DEVICE_RE)) return fin('device_trust')
    let texto = ''
    for (const f of page.frames()) texto += (await f.locator('body').innerText().catch(() => '') || '').slice(0, 500) + ' '
    texto = texto.replace(/\s+/g, ' ')
    if (!mfaHecha && MFA_RE.test(texto)) {
      if (process.env.TEK_SUPERCLAVE === '1') {
        const ok = await llenarSuperclave(page, log)   // espera tu código, lo teclea y confirma
        mfaHecha = true
        deadline = Date.now() + 90_000                 // más tiempo para procesar/navegar
        if (!ok) return fin('mfa_sin_codigo', { pista: texto.slice(0, 240) })
        continue
      }
      return fin('pide_mfa', { pista: texto.slice(0, 240) })
    }
    if (ERR_RE.test(texto)) {
      // El banco dijo "clave incorrecta" → la que tenemos guardada quedó vieja/mala. (1) PAUSAMOS
      // el login de este usuario (flag) para NO reintentar con la misma y bloquear la cuenta a los
      // ~3 rechazos; se reactiva cuando actualice la clave en /banco/clave. (2) Le pedimos la nueva.
      try { writeFileSync(join(DATA, `.login-pausado-${userSlug}.json`), JSON.stringify({ ts: Date.now(), motivo: 'error_credenciales' }), { mode: 0o600 }) } catch { /* */ }
      try {
        const { pedirClaveNueva } = await import('./clave-nueva.mjs')
        const r = await pedirClaveNueva(process.env.TEK_USER || 'ramon', { motivo: 'error_credenciales' })
        log(`clave rechazada → PAUSO login + pido clave nueva: ${r.ok ? 'link enviado' : (r.error || 'no enviado')}`)
      } catch (e) { log('no pude pedir la clave nueva: ' + e.message) }
      return fin('error_credenciales', { pista: texto.slice(0, 200) })
    }
    await sleep(1500)
  }
  return fin('timeout', { nota: 'no navegó tras Aceptar (probable BioCatch)' })
}
main().catch((e) => { console.log('ERROR:', e.message); process.exit(1) })

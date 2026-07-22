// login-humano.mjs — Login Santander Empresa con comportamiento HUMANO al máximo,
// para intentar pasar Incapsula + BioCatch. Perfil de Chrome PROPIO de tek que
// persiste (acumula cookies de confianza), Chrome real vía Patchright.
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
import { readFileSync, mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { obtener as obtenerCreds } from '/Users/AIagenteia/nexus/conector-tek/credenciales.mjs'

const DIR = '/Users/AIagenteia/nexus/conector-tek'
const DATA = join(DIR, 'data')
const SHOTS = join(DIR, 'shots')
const PROFILE_TEK = join(DIR, 'chrome-profile')     // perfil propio de tek (persiste)
const SESSION_FILE = join(DIR, 'session.json')
mkdirSync(SHOTS, { recursive: true })
mkdirSync(PROFILE_TEK, { recursive: true })
const LANDING = 'https://empresas.officebanking.cl/'
const PRIVADO = 'privado.officebanking.cl'
const log = (...a) => console.log('·', ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rnd = (a, b) => a + Math.random() * (b - a)
const ri = (a, b) => Math.floor(rnd(a, b))
const chance = (p) => Math.random() < p

// ── CANDADO de sesión (safeguard): evita DOS navegadores sobre el MISMO perfil
//    (lo corrompe) y evita re-loguear en paralelo (gatilla el antifraude). Si ya hay
//    una sesión de banco activa, ESPERAMOS a que termine en vez de abrir otra.
const LOCK = join(DIR, 'session.lock')
function lockVivo() {
  try {
    const j = JSON.parse(readFileSync(LOCK, 'utf8'))
    if (!j.pid) return false
    try { process.kill(j.pid, 0) } catch { return false }        // proceso muerto → candado viejo, se ignora
    if (Date.now() - (j.ts || 0) > 12 * 60_000) return false      // colgado > 12 min → se ignora
    return true
  } catch { return false }
}
async function adquirirLock(esperaMs = Number(process.env.TEK_LOCK_WAIT_MS) || 8 * 60_000) {
  const t0 = Date.now(); let aviso = false
  for (;;) {
    // ADQUISICIÓN ATÓMICA (arregla la carrera TOCTOU que dejaba correr DOS logins a la
    // vez): 'wx' crea el archivo en modo EXCLUSIVO y FALLA si ya existe. Solo UN proceso
    // puede crearlo; el resto recibe EEXIST y espera. Antes era chequear-luego-escribir
    // (no atómico) → dos procesos veían el lock libre y ambos lo pisaban.
    try {
      writeFileSync(LOCK, JSON.stringify({ pid: process.pid, ts: Date.now() }), { flag: 'wx' })
      return true                                   // lo creamos NOSOTROS → lock nuestro
    } catch (e) {
      if (e && e.code !== 'EEXIST') return true      // fallo raro de fs → no bloquear el banco por esto
    }
    // Ya existe un lock: ¿está vivo? Si el proceso murió o quedó colgado (>12 min), lo
    // borramos y reintentamos (el próximo 'wx' lo recrea de forma atómica).
    if (!lockVivo()) { try { unlinkSync(LOCK) } catch {} continue }
    if (Date.now() - t0 > esperaMs) return false
    if (!aviso) { log('ya hay una sesión de banco activa — espero a que termine (NO abro otra)'); aviso = true }
    await sleep(5000 + Math.floor(Math.random() * 2000))   // jitter: rompe empates entre procesos
  }
}
function soltarLock() { try { const j = JSON.parse(readFileSync(LOCK, 'utf8')); if (j.pid === process.pid) unlinkSync(LOCK) } catch {} }
process.on('exit', soltarLock)

// Posición virtual del mouse (Playwright no la expone; la trackeamos).
let mx = 680, my = 430
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

// Un tramo de curva Bézier cúbica con ease-in-out + micro-jitter + velocidad variable.
async function curve(page, x1, y1) {
  const x0 = mx, y0 = my
  const dist = Math.hypot(x1 - x0, y1 - y0)
  const jitter = Math.min(2.5, dist / 120)
  const cx1 = x0 + (x1 - x0) * rnd(0.2, 0.45) + rnd(-70, 70)
  const cy1 = y0 + (y1 - y0) * rnd(0.2, 0.45) + rnd(-70, 70)
  const cx2 = x0 + (x1 - x0) * rnd(0.55, 0.85) + rnd(-70, 70)
  const cy2 = y0 + (y1 - y0) * rnd(0.55, 0.85) + rnd(-70, 70)
  const steps = ri(24, 44)
  for (let i = 1; i <= steps; i++) {
    const t = easeInOut(i / steps)
    const mt = 1 - t
    const bx = mt * mt * mt * x0 + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * x1 + rnd(-jitter, jitter)
    const by = mt * mt * mt * y0 + 3 * mt * mt * t * cy1 + 3 * mt * t * t * cy2 + t * t * t * y1 + rnd(-jitter, jitter)
    await page.mouse.move(bx, by).catch(() => {})
    // más lento cerca de los extremos (aceleración/desaceleración)
    const edge = Math.min(i, steps - i) / steps
    await sleep(rnd(5, 12) + (1 - edge) * rnd(2, 10))
  }
  mx = x1; my = y1
}
// Mover con overshoot + corrección (humano sobrepasa el objetivo y corrige).
async function moveTo(page, x, y) {
  if (chance(0.6)) { await curve(page, x + rnd(-22, 22), y + rnd(-16, 16)); await sleep(rnd(40, 120)); await curve(page, x, y) }
  else await curve(page, x, y)
}
async function moveToLoc(page, loc) {
  const box = await loc.boundingBox().catch(() => null)
  if (!box) return false
  await moveTo(page, box.x + box.width * rnd(0.3, 0.7), box.y + box.height * rnd(0.35, 0.65))
  await sleep(rnd(90, 280))
  return true
}
async function clickReal(page) { await page.mouse.down(); await sleep(rnd(45, 115)); await page.mouse.up() }
// Micro-drift del mouse mientras "lee".
async function idle(page, ms) { const end = Date.now() + ms; while (Date.now() < end) { await page.mouse.move(mx + rnd(-5, 5), my + rnd(-4, 4)).catch(() => {}); await sleep(rnd(220, 620)) } }
// CLICK HUMANO sobre un locator: mueve el mouse con curva hasta el elemento, hover breve
// y clic real (down→up). Si no consigue la caja, cae a un click normal. Devuelve bool.
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

// Tecleo con dwell (down→up), pausas irregulares y algún typo+backspace.
async function humanType(page, text) {
  for (const ch of text) {
    if (chance(0.035)) { await page.keyboard.press('asdfgh'[ri(0, 6)], { delay: ri(45, 95) }).catch(() => {}); await sleep(rnd(140, 320)); await page.keyboard.press('Backspace').catch(() => {}); await sleep(rnd(90, 210)) }
    await page.keyboard.press(ch, { delay: ri(45, 120) }).catch(async () => { await page.keyboard.type(ch).catch(() => {}) })
    await sleep(rnd(55, 175))
    if (chance(0.07)) await sleep(rnd(300, 820))   // pausa de "pensar"
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
  const entro = await clickColumna(page, /^A Tercero mismo Banco$/i, /^Creaci[oó]n$/i, log)
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
  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  await sleep(8000)
  await entrarEmpresa(page, log, process.env.TEK_EMPRESA || 'ANA CLARA')
  await sleep(rnd(3000, 5000)); await idle(page, rnd(800, 1600))
  // abrir menú Transferencias (clic por texto, engancha) + clic de PIXEL en "Creación"
  const menu = page.getByText(/^transferencias?$/i).first()
  await clickHumano(page, menu)
  await sleep(rnd(4000, 5500))
  await page.screenshot({ path: join(DATA, 'crear-00-menu.png') }).catch(() => {})
  // COLUMNA del menú (shadow DOM cerrado → clic por PÍXEL). "A Tercero mismo Banco →
  // Creación" está en (320,232); "A Tercero otros Bancos → Creación" (para transferir a
  // OTRO banco, ej. Falabella) está una fila más abajo, en (320,320). TEK_TRANSFER_TIPO=otros
  // selecciona esa columna (el form de otros bancos lleva un SELECTOR de banco destino).
  const tipoOtros = /otro/i.test(process.env.TEK_TRANSFER_TIPO || '')
  const yCreacion = tipoOtros ? 320 : 232
  await page.mouse.move(280, yCreacion - 30, { steps: 10 }); await sleep(rnd(150, 320))
  await page.mouse.move(320, yCreacion, { steps: 8 }); await sleep(rnd(150, 300))
  await page.mouse.down(); await sleep(60); await page.mouse.up()
  log('clic pixel Creación (' + (tipoOtros ? 'A Tercero OTROS Bancos' : 'A Tercero mismo Banco') + ')')
  await sleep(9000)
  await page.screenshot({ path: join(DATA, 'crear-01-form.png') }).catch(() => {})
  const fr = () => page.frames().find((f) => /TEF\.UI\.Web/i.test(f.url()))
  const f1 = fr()
  if (!f1) { log('no cargó el iframe de creación'); writeFileSync(join(DATA, 'crear-form.json'), JSON.stringify({ url: page.url(), forms: await volcarFrames(page) }, null, 2)); return { estado: 'sin_form', url: page.url() } }
  writeFileSync(join(DATA, 'crear-form.json'), JSON.stringify({ paso: 1, url: page.url(), forms: await volcarFrames(page) }, null, 2))
  // PASO 1: monto + motivo
  const monto = String(process.env.TEK_MONTO || '1000')
  await f1.locator('#txtMonto').click().catch(() => {}); await sleep(rnd(300, 600))
  await f1.locator('#txtMonto').type(monto, { delay: rnd(90, 170) }).catch(() => {})
  await sleep(rnd(400, 900))
  await f1.locator('#mensaje-100').click().catch(() => {}); await sleep(rnd(200, 500))
  await f1.locator('#mensaje-100').type(process.env.TEK_MOTIVO || 'Prueba tek', { delay: rnd(60, 130) }).catch(() => {})
  await sleep(rnd(400, 900))
  await page.screenshot({ path: join(DATA, 'crear-01b-lleno.png') }).catch(() => {})
  // Continuar → PASO 2 (destino)
  const cont = f1.getByText(/^continuar$/i).first()
  const cb = await cont.boundingBox().catch(() => null)
  if (cb) { await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2, { steps: 12 }); await sleep(rnd(200, 450)); await page.mouse.down(); await sleep(60); await page.mouse.up(); log('Continuar → paso 2') }
  else log('no vi el botón Continuar')
  await sleep(9000)
  await page.screenshot({ path: join(DATA, 'crear-02-destino.png') }).catch(() => {})
  const forms2 = await volcarFrames(page)
  writeFileSync(join(DATA, 'crear-destino.json'), JSON.stringify({ paso: 2, url: page.url(), forms: forms2 }, null, 2))
  const nIn = forms2.reduce((a, f) => a + f.inputs.length, 0)
  log(`paso 2 (destino) mapeado: ${nIn} inputs`)

  const modo = process.env.TEK_CREAR   // 'mapear' | 'llenar' | 'crear'
  if (modo === 'llenar' || modo === 'crear') {
    const f2 = page.frames().find((f) => /TEF\.UI\.Web/i.test(f.url())) || f1
    const val = async (sel) => f2.locator(sel).first().inputValue().catch(() => '')
    const setVal = async (sel, valTxt) => {
      if (valTxt == null || valTxt === '') return
      const loc = f2.locator(sel).first()
      if (!(await loc.count().catch(() => 0))) { log('destino: no vi campo', sel); return }
      await loc.click().catch(() => {}); await sleep(rnd(250, 500))
      await loc.fill('').catch(() => {})
      await loc.type(String(valTxt), { delay: rnd(70, 150) }).catch(() => {})
      await sleep(rnd(300, 700))
    }
    // Llenado ROBUSTO por PLACEHOLDER (prefijo, case-insensitive) seteando el valor por JS
    // con el native setter + eventos input/change/blur. No depende del foco → arregla el
    // corrimiento de campos del form de otros bancos (con type() el email caía en "nombre"
    // y el mensaje en "email"). Busca el input VISIBLE (offsetParent != null) en cualquier frame.
    const fillByPlaceholder = async (phPrefix, valTxt) => {
      if (valTxt == null || valTxt === '') return false
      for (const f of page.frames()) {
        const ok = await f.evaluate(({ ph, value }) => {
          const pfx = ph.toLowerCase()
          const el = [...document.querySelectorAll('input,textarea')]
            .find((e) => (e.placeholder || '').toLowerCase().startsWith(pfx) && e.offsetParent !== null)
          if (!el) return false
          const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
          el.focus()
          setter ? setter.call(el, '') : (el.value = '')
          setter ? setter.call(el, value) : (el.value = value)
          el.dispatchEvent(new Event('input', { bubbles: true }))
          el.dispatchEvent(new Event('change', { bubbles: true }))
          el.dispatchEvent(new Event('blur', { bubbles: true }))
          return el.value === value
        }, { ph: phPrefix, value: String(valTxt) }).catch(() => false)
        if (ok) return true
      }
      log('fillByPlaceholder: no llené', phPrefix)
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
      const loc = emailLocator()
      if (!emailVal || !(await loc.count().catch(() => 0))) { log('✗ no vi el campo email'); return }
      await loc.click().catch(() => {}); await sleep(rnd(200, 450))
      await loc.fill(emailVal).catch(() => {})
      await sleep(rnd(300, 600))
      let got = await loc.inputValue().catch(() => '')
      if (got !== emailVal) { await loc.fill('').catch(() => {}); await loc.type(emailVal, { delay: rnd(60, 130) }).catch(() => {}); await sleep(400); got = await loc.inputValue().catch(() => '') }
      await page.keyboard.press('Tab').catch(() => {})
      log('email poblado:', got || '(vacío)')
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

    // 6) DETECTAR EL RESULTADO REAL — NO dar por creada solo por haber apretado el botón.
    const OK_RE = /pendiente|autoriz|por\s+liberar|comprobante|solicitud\s+(de\s+)?transfer|se\s+(ha\s+)?cre[oó]|creada|exitos|realizada con [eé]xito|registrada/i
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
    log(`resultado creación: ${veredicto} — ${pista}`)
    return { estado: veredicto, pista, url: page.url() }
  }
  return { estado: 'mapeado_destino', inputs_destino: nIn, url: page.url() }
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
  const menu = page.getByText(/^transferencias?$/i).first()
  await clickHumano(page, menu)
  await sleep(rnd(4000, 5500))
  await page.screenshot({ path: join(DATA, 'masiva-00-menu.png') }).catch(() => {})
  // "Transferencias Masivas → Importación" por TEXTO; fallback a clic de PÍXEL (columna 3).
  const entro = await clickColumna(page, /^Transferencias Masivas$/i, /^Importaci[oó]n$/i, log)
  if (!entro) {
    await page.mouse.move(760, 300, { steps: 10 }); await sleep(rnd(150, 320))
    await page.mouse.move(790, 320, { steps: 8 }); await sleep(rnd(150, 300))
    await page.mouse.down(); await sleep(60); await page.mouse.up()
    log('masiva: clic pixel Importación (fallback)')
  }
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
    // Frame de la importación (eob TEFM) — el que tiene el input de archivo.
    let imp = null
    for (const f of page.frames()) {
      if (await f.locator('input[type="file"]').first().count().catch(() => 0)) { imp = f; break }
    }
    if (!imp) { log('masiva: no encontré el frame de importación'); return { estado: 'sin_frame_importacion', url: page.url() } }

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

  // BAJAR: descarga el comprobante (PDF) de la fila pedida (TEK_COMPROB_IDX, 1-based).
  if (process.env.TEK_COMPROBANTES === 'bajar') {
    // Flujo real: en la columna "Impresos" cada fila tiene un ícono "⋮" (a.btn-inner-table) que
    // abre un popover con "Comprobante Transferencia" / "Certificado Transferencia".
    const idx = Math.max(1, parseInt(process.env.TEK_COMPROB_IDX || '1', 10))   // 1-based
    const dest = join(DATA, `comprobante-${idx}.pdf`)
    try { if (existsSync(dest)) unlinkSync(dest) } catch { /* */ }
    let pdfPath = null, detalle = ''
    for (const fr of page.frames()) {
      const iconos = fr.locator('td[data-th="Impresos"] a.btn-inner-table, td.td-btn-inner-table a.btn-popover')
      const n = await iconos.count().catch(() => 0)
      if (n < idx) continue
      const icon = iconos.nth(idx - 1)
      await icon.scrollIntoViewIfNeeded().catch(() => {})
      await icon.click({ timeout: 4000 }).catch(async () => { await clickHumano(page, icon) })
      await sleep(1800)
      await page.screenshot({ path: join(DATA, 'comprob-05-popover-fila.png') }).catch(() => {})
      // "Comprobante Transferencia" en el popover. OJO: existe un template OCULTO (#list-popover)
      // con el mismo texto + el popover VISIBLE clonado → hay que elegir el VISIBLE (no .first()).
      let opt = null
      for (const f2 of page.frames()) {
        const cands = await f2.getByText(/comprobante\s*transferencia/i).all().catch(() => [])
        for (const c of cands) { if (await c.isVisible().catch(() => false)) { opt = c; break } }
        if (opt) break
      }
      if (!opt) { detalle = 'no apareció "Comprobante Transferencia" en el popover'; break }
      // Al hacer clic: puede DISPARAR una descarga o ABRIR una pestaña con el PDF.
      const [dl, pop] = await Promise.all([
        page.waitForEvent('download', { timeout: 14000 }).catch(() => null),
        page.context().waitForEvent('page', { timeout: 14000 }).catch(() => null),
        opt.click({ timeout: 4000 }).catch(() => {}),
      ])
      if (dl) { await dl.saveAs(dest).catch(() => {}); if (existsSync(dest)) pdfPath = dest }
      if (!pdfPath && pop) {
        await pop.waitForLoadState('domcontentloaded').catch(() => {})
        const u = pop.url()
        try {
          if (/\.pdf|comprobante|blob:/i.test(u)) {
            const resp = await pop.context().request.get(u).catch(() => null)
            if (resp && resp.ok()) { writeFileSync(dest, await resp.body()); pdfPath = existsSync(dest) ? dest : null }
          }
          if (!pdfPath) { await pop.pdf({ path: dest }).catch(() => {}); if (existsSync(dest)) pdfPath = dest }
        } catch (e) { detalle = 'pestaña PDF: ' + e.message }
        await pop.close().catch(() => {})
      }
      if (!pdfPath && !detalle) detalle = 'clic en Comprobante pero no capturé la descarga'
      break
    }
    await page.screenshot({ path: join(DATA, 'comprob-03-bajado.png') }).catch(() => {})
    return { estado: pdfPath ? 'descargado' : 'sin_pdf', pdf: pdfPath, idx, detalle, total_filas: filas.length, url: page.url() }
  }

  return { estado: 'listado', filas: filas.slice(0, 40), total_filas: filas.length, url: page.url() }
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

async function main() {
  setTimeout(() => { console.log('RESULTADO:', JSON.stringify({ estado: 'hard_timeout' })); process.exit(2) }, 600_000).unref?.()
  // Credenciales: primero la BÓVEDA cifrada (por usuario+empresa), con fallback al
  // .creds.json legacy. Env: TEK_USER (default 'ramon'), TEK_EMPRESA (default ANA CLARA).
  let rut, password
  try {
    const cred = obtenerCreds(process.env.TEK_USER || 'ramon', process.env.TEK_EMPRESA || 'ANA CLARA SPA')
    if (cred.ok) { rut = cred.rut; password = cred.clave }
  } catch { /* bóveda no disponible → fallback */ }
  if (!rut || !password) {
    const j = JSON.parse(readFileSync(join(DIR, '.creds.json'), 'utf8')); rut = j.rut; password = j.password
  }
  // SAFEGUARD: si ya hay una sesión de banco corriendo, NO abro otra (evita chocar el
  // perfil y re-loguear al pedo). Espero a que se libere; si no se libera, aviso y salgo.
  if (!(await adquirirLock())) {
    console.log('RESULTADO:', JSON.stringify({ estado: 'ocupado', nota: 'Ya hay una sesión de banco activa; no abrí otra para no chocar el perfil ni gatillar el antifraude. Reintentá cuando termine.' }))
    return
  }
  const headless = process.env.TEK_HEADLESS === '1'
  const assist = process.env.TEK_ASSIST === '1'
  const perfilReal = process.env.TEK_PROFILE_REAL === '1'
  const profileDir = perfilReal ? join(process.env.HOME, 'Library/Application Support/Google/Chrome') : PROFILE_TEK
  // Patchright recomienda mínimos args (nada de --no-sandbox/UA: son señales de bot).
  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless, channel: 'chrome',
    args: perfilReal ? ['--profile-directory=Default', '--disable-background-networking', '--disable-sync', '--no-first-run'] : [],
    viewport: { width: 1360, height: 860 }, locale: 'es-CL', timezoneId: 'America/Santiago',
    acceptDownloads: true,   // para bajar los PDF de la cartola histórica
  })
  const mapearOn = process.env.TEK_MAPEAR === '1'
  const capturarOn = process.env.TEK_CAPTURAR === '1'
  const transferirMapear = process.env.TEK_TRANSFERIR === 'mapear'   // SOLO mapea el form, no mueve plata
  if (mapearOn) { ctx.on('request', (r) => regNet(r.method(), r.url())); ctx.on('response', (r) => regNet(r.request().method(), r.url(), r.status())) }
  for (const p of ctx.pages().slice(1)) { try { await p.close() } catch {} }
  const page = ctx.pages()[0] || await ctx.newPage()
  const cerrar = async () => { try { await ctx.storageState({ path: SESSION_FILE }) } catch {} ; try { await ctx.close() } catch {} }
  const shot = (n) => page.screenshot({ path: join(SHOTS, n) }).catch(() => {})
  const fin = async (estado, extra = {}) => { await shot(`fin-${estado}.png`); console.log('RESULTADO:', JSON.stringify({ estado, url: page.url(), ...extra })); await cerrar() }

  // Acciones post-login (mapear/capturar/transferir) — reutilizables tanto si
  // REUSAMOS la sesión viva como si logueamos de cero.
  const acciones = async (via) => {
    let mapa = null, cap = null, transf = null
    if (mapearOn) { try { mapa = await mapear(page, log, shot) } catch (e) { log('mapear falló:', e.message) } }
    if (capturarOn) { try { cap = await capturarData(ctx, page, log) } catch (e) { log('capturar falló:', e.message) } }
    if (transferirMapear) { try { transf = await mapearTransferencia(ctx, page, log) } catch (e) { log('transf falló:', e.message) } }
    let crear = null
    if (['mapear', 'llenar', 'crear'].includes(process.env.TEK_CREAR)) { try { crear = await crearTransferencia(page, log) } catch (e) { log('crear falló:', e.message) } }
    let masiva = null
    if (['map', 'subir'].includes(process.env.TEK_MASIVA)) { try { masiva = await masivaImportar(page, log) } catch (e) { log('masiva falló:', e.message) } }
    let carthist = null
    if (['map', 'bajar'].includes(process.env.TEK_CARTOLA_HIST)) { try { carthist = await cartolaHistorica(page, log) } catch (e) { log('carthist falló:', e.message) } }
    let comprob = null
    if (['map', 'listar', 'bajar'].includes(process.env.TEK_COMPROBANTES)) { try { comprob = await comprobantesConsulta(page, log) } catch (e) { log('comprobantes falló:', e.message) } }
    return fin('logueado', { via, nota: `home de privado (${via}).`, ...(mapa ? { mapa } : {}), ...(cap ? { cap } : {}), ...(transf ? { transf } : {}), ...(crear ? { crear } : {}), ...(masiva ? { masiva } : {}), ...(carthist ? { carthist } : {}), ...(comprob ? { comprob } : {}) })
  }

  // ── REUSO DE SESIÓN (lo que pidió Ramón): antes de loguear, probar si la sesión
  // guardada sigue viva yendo directo al dashboard. Si carga logueado → capturamos SIN
  // login (evita ingresos de más que flagean a Santander). Solo si nos bota, logueamos.
  if (!assist && process.env.TEK_FORZAR_LOGIN !== '1') {
    await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
    await sleep(rnd(4000, 6000))
    const u = page.url()
    const viva = u.includes(PRIVADO) && !/\/login|error-seguridad|logout/i.test(u) && !(await textoVisible(page, DEVICE_RE))
    if (viva) {
      log('✓ sesión viva REUTILIZADA (sin login)')
      // calentamiento humano: mover el mouse y "leer" antes de operar
      await moveTo(page, rnd(400, 950), rnd(240, 560)); await idle(page, rnd(900, 1800))
      if (chance(0.6)) await scrollHumano(page, rnd(120, 260))
      return acciones('reuso')
    }
    log('sesión no reutilizable → hago login')
  }

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
  if (await textoVisible(page, DEVICE_RE)) return fin('device_trust', { nota: 'Incapsula flageó la conexión/dispositivo (IP quemada o perfil sin confianza)' })

  const rutLoc = await firstVisible(page, ['#office-banking-login #username', '#username', 'input[name="username" i]'])
  const passLoc = await firstVisible(page, ['#office-banking-login #password', '#password', 'input[type="password"]'])
  if (!rutLoc || !passLoc) return fin('sin_form', { nota: 'no apareció el form (ver h02-modal.png)' })

  // Llenar humano: mover, clic real, tipear con dwell, blur natural.
  await moveToLoc(page, rutLoc); await clickReal(page); await sleep(rnd(200, 500)); await humanType(page, rut)
  await ensureValue(page, rutLoc, rut, 'RUT')          // 🔧 la máscara se comía un dígito → verifico y corrijo
  await idle(page, rnd(500, 1200))
  await moveToLoc(page, passLoc); await clickReal(page); await sleep(rnd(200, 500)); await humanType(page, password)
  // clave: sin máscara, verifico exacto (no normalizado) y re-tipeo completo si hiciera falta.
  for (let i = 0; i < 3 && (await passLoc.inputValue().catch(() => '')) !== password; i++) {
    await passLoc.click().catch(() => {}); await page.keyboard.press('Meta+A').catch(() => {}); await page.keyboard.press('Backspace').catch(() => {})
    await sleep(rnd(200, 400)); await humanType(page, password)
  }
  await shot('h03-lleno.png')
  await idle(page, rnd(1200, 2600))   // que BioCatch acumule comportamiento

  if (assist) {
    // MODO ASISTIDO: NO clickeamos Aceptar. Esperamos a que el humano (por VNC) lo haga
    // + Superclave. Polleamos hasta aterrizar en privado; guardamos la sesión.
    log('MODO ASISTIDO: hacé el clic en "Aceptar" + Superclave por VNC. Esperando…')
    const deadline = Date.now() + 300_000
    while (Date.now() < deadline) {
      if (page.isClosed()) break
      let onHome = false; try { const u = new URL(page.url()); onHome = u.host.includes(PRIVADO) && !/^\/(login|logout)|error-seguridad/i.test(u.pathname) } catch {}
      if (onHome) return acciones('asistido')
      await sleep(2000)
    }
    return fin('timeout_asistido', { nota: 'no detecté el ingreso en 5 min' })
  }

  // MODO AUTO: esperar que la red asiente (token/reCAPTCHA invisible) y clic humano en Aceptar.
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
  await sleep(rnd(600, 1400))
  const aceptar = await firstVisible(page, ['#doLoginButton', '#office-banking-login button[type="submit"]', 'button:has-text("Aceptar")'])
  if (!aceptar) return fin('sin_boton_aceptar')
  await moveToLoc(page, aceptar); await sleep(rnd(220, 560)); await clickReal(page)
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
    if (ERR_RE.test(texto)) return fin('error_credenciales', { pista: texto.slice(0, 200) })
    await sleep(1500)
  }
  return fin('timeout', { nota: 'no navegó tras Aceptar (probable BioCatch)' })
}
main().catch((e) => { console.log('ERROR:', e.message); process.exit(1) })

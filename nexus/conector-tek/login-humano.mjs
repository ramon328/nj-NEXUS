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
import { readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs'
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
  while (lockVivo()) {
    if (Date.now() - t0 > esperaMs) return false
    if (!aviso) { log('ya hay una sesión de banco activa — espero a que termine (NO abro otra)'); aviso = true }
    await sleep(5000)
  }
  try { writeFileSync(LOCK, JSON.stringify({ pid: process.pid, ts: Date.now() })) } catch {}
  return true
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
    const hay = await page.evaluate(() => /Actualiza tu Clave|Protege la seguridad/i.test(document.body?.innerText || '')).catch(() => false)
    if (!hay) return true
    let done = false
    for (const re of [/^m[aá]s tarde/i, /^ahora no/i, /^omitir/i, /^recordar/i, /^continuar/i, /^saltar/i, /^cerrar/i]) {
      const b = page.getByText(re, { exact: false }).first()
      if (await b.boundingBox().catch(() => null)) { await clickHumano(page, b); done = true; break }
    }
    if (!done) {
      const x = page.locator('[aria-label*="cerrar" i],[aria-label*="close" i],button.close,[class*="close" i]').first()
      if (await x.boundingBox().catch(() => null)) { await clickHumano(page, x); done = true }
    }
    if (!done) await page.keyboard.press('Escape').catch(() => {})
    await sleep(1600)
  }
  log && log('popup: no se pudo cerrar solo (cerralo por VNC si tapa)')
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
  await page.mouse.move(280, 202, { steps: 10 }); await sleep(rnd(150, 320))
  await page.mouse.move(320, 232, { steps: 8 }); await sleep(rnd(150, 300))
  await page.mouse.down(); await sleep(60); await page.mouse.up()
  log('clic pixel Creación (A Tercero mismo Banco)')
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
    const setVal = async (sel, val) => {
      if (val == null || val === '') return
      const loc = f2.locator(sel).first()
      if (!(await loc.count().catch(() => 0))) { log('destino: no vi campo', sel); return }
      await loc.click().catch(() => {}); await sleep(rnd(250, 500))
      await loc.fill('').catch(() => {})
      await loc.type(String(val), { delay: rnd(70, 150) }).catch(() => {})
      await sleep(rnd(300, 700))
    }
    await setVal('input[placeholder*="cuenta destino" i]', process.env.TEK_DEST_CUENTA)
    await setVal('#moneda', process.env.TEK_DEST_MONEDA || 'PESOS')
    await sleep(rnd(500, 1000))   // por si "moneda" abre autocompletar
    await setVal('#rut', process.env.TEK_DEST_RUT)
    await setVal('#nombre', process.env.TEK_DEST_NOMBRE)
    await setVal('input[placeholder*="email" i]', process.env.TEK_DEST_EMAIL)
    await setVal('#mensaje', process.env.TEK_DEST_MSG || process.env.TEK_MOTIVO || 'Prueba tek')
    await sleep(rnd(600, 1200))
    await page.screenshot({ path: join(DATA, 'crear-03-destino-lleno.png') }).catch(() => {})
    writeFileSync(join(DATA, 'crear-destino-lleno.json'), JSON.stringify({ url: page.url(), forms: await volcarFrames(page) }, null, 2))
    if (modo === 'llenar') { log('LLENO paso 2 — DETENIDO antes de Crear (revisá el screenshot)'); return { estado: 'lleno_sin_crear', url: page.url() } }
    // modo === 'crear': apretar "Crear" (crea la transferencia PENDIENTE, no libera, no mueve plata)
    const crearBtn = f2.getByText(/^crear$/i).first()
    const bb = await crearBtn.boundingBox().catch(() => null)
    if (bb) { await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 12 }); await sleep(rnd(250, 550)); await page.mouse.down(); await sleep(60); await page.mouse.up(); log('CREAR clickeado') }
    else { log('no vi el botón Crear'); return { estado: 'sin_boton_crear', url: page.url() } }
    await sleep(9000)
    await page.screenshot({ path: join(DATA, 'crear-04-resultado.png') }).catch(() => {})
    writeFileSync(join(DATA, 'crear-resultado.json'), JSON.stringify({ url: page.url(), forms: await volcarFrames(page) }, null, 2))
    return { estado: 'crear_click', url: page.url() }
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
    return fin('logueado', { via, nota: `home de privado (${via}).`, ...(mapa ? { mapa } : {}), ...(cap ? { cap } : {}), ...(transf ? { transf } : {}), ...(crear ? { crear } : {}) })
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
      let onHome = false; try { const u = new URL(page.url()); onHome = u.host.includes(PRIVADO) && !u.pathname.startsWith('/login') } catch {}
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
    let onHome = false; try { const u = new URL(page.url()); onHome = u.host.includes(PRIVADO) && !u.pathname.startsWith('/login') } catch {}
    if (onHome) return acciones('login')
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

// mapear-banco.mjs — Mapea Santander Office Banking (privado) reusando la sesión
// guardada (NO re-loguea → cero riesgo de strike). SOLO LECTURA: captura pasivamente
// el tráfico XHR/fetch, la estructura de menús y las rutas de los bundles JS.
// NO clickea nada transaccional (transferir/pagar/firmar/autorizar).
import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
const { chromium } = patchright
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = '/Users/AIagenteia/nexus/conector-tek'
const PROFILE = join(DIR, 'chrome-profile')
const MAPA = join(DIR, 'mapa-banco')
const SHOTS = join(MAPA, 'shots')
mkdirSync(SHOTS, { recursive: true })
const PRIVADO = 'privado.officebanking.cl'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log('·', ...a)

// palabras que NO tocamos (acciones que mueven plata / firman)
const PELIGRO = /transferir|transferencia|pagar|pago\b|firmar|firma|autoriz|aprob|n[oó]mina|masiv|enviar|eliminar|crear|nuevo|abonar|cargar|rescatar|invertir/i
// secciones read-only que SÍ visitamos para descubrir su API
const SEGURO = /saldo|cuenta|cartola|movimiento|posici[oó]n|resumen|inicio|producto|tarjeta|cr[eé]dito|dep[oó]sito|l[ií]nea|comprobante|hist[oó]rico|consulta/i

const api = new Map()   // "MÉTODO host/path" → {n, hosts, statuses}
const bundles = new Set()
function reg(method, url, status) {
  try {
    const u = new URL(url)
    if (/\.(png|jpg|svg|css|woff2?|gif|ico)(\?|$)/i.test(u.pathname)) return
    if (/\.js(\?|$)/i.test(u.pathname)) { bundles.add(u.origin + u.pathname); return }
    const key = `${method} ${u.host}${u.pathname.replace(/\/[0-9a-f-]{8,}/gi, '/{id}')}`
    const e = api.get(key) || { n: 0, statuses: new Set() }
    e.n++; if (status) e.statuses.add(status); api.set(key, e)
  } catch {}
}

async function main() {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false, channel: 'chrome', viewport: { width: 1440, height: 900 },
    locale: 'es-CL', timezoneId: 'America/Santiago',
  })
  ctx.on('request', (r) => reg(r.method(), r.url()))
  ctx.on('response', (r) => reg(r.request().method(), r.url(), r.status()))
  const page = ctx.pages()[0] || await ctx.newPage()

  log('abriendo privado (sesión guardada)…')
  await page.goto('https://privado.officebanking.cl/', { waitUntil: 'domcontentloaded', timeout: 40000 }).catch((e) => log('goto', e.message))
  await sleep(9000)

  // ¿seguimos logueados?
  const url = page.url()
  if (!url.includes(PRIVADO) || /login|accounts/.test(url)) {
    log('⚠ la sesión expiró (redirigió al login). NO re-logueo para no gastar intentos.')
    await page.screenshot({ path: join(SHOTS, 'sesion-expirada.png') }).catch(() => {})
    console.log('RESULTADO:', JSON.stringify({ estado: 'sesion_expirada', url }))
    await ctx.close(); return
  }
  await page.screenshot({ path: join(SHOTS, '00-home.png') }).catch(() => {})
  log('adentro ✓ — capturando menú y API…')
  await sleep(3000)

  // ── estructura de menú (todo lo clickable con texto en nav/aside/header) ──
  const menu = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
    const items = []
    const sel = 'nav a, nav button, aside a, aside button, [role="menuitem"], [class*="menu"] a, [class*="nav"] a, header a'
    for (const el of document.querySelectorAll(sel)) {
      const t = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ')
      if (t && t.length < 60 && vis(el)) items.push({ texto: t, href: el.getAttribute('href') || '' })
    }
    // dedup por texto
    const seen = new Set(); return items.filter((i) => !seen.has(i.texto) && seen.add(i.texto))
  }).catch(() => [])
  log(`menú: ${menu.length} ítems`)

  // ── visitar SOLO secciones read-only para descubrir su API ──
  const visitables = menu.filter((i) => SEGURO.test(i.texto) && !PELIGRO.test(i.texto)).slice(0, 14)
  log(`visitando ${visitables.length} secciones seguras…`)
  const visitadas = []
  for (const it of visitables) {
    try {
      const antes = api.size
      const loc = page.getByText(it.texto, { exact: true }).first()
      if (!(await loc.isVisible().catch(() => false))) continue
      await loc.click({ timeout: 6000 }).catch(() => {})
      await sleep(4500)
      visitadas.push({ seccion: it.texto, nuevas_llamadas: api.size - antes, url: page.url() })
      log(`  ✓ ${it.texto} (+${api.size - antes} llamadas)`)
      await page.screenshot({ path: join(SHOTS, 'sec-' + it.texto.replace(/[^a-z0-9]/gi, '_').slice(0, 30) + '.png') }).catch(() => {})
    } catch (e) { log(`  ✗ ${it.texto}: ${e.message.slice(0, 40)}`) }
  }

  // ── guardar el mapa ──
  const endpoints = [...api.entries()].map(([k, v]) => ({ endpoint: k, veces: v.n, status: [...v.statuses] }))
    .sort((a, b) => a.endpoint.localeCompare(b.endpoint))
  const porHost = {}
  for (const e of endpoints) { const h = e.endpoint.split(' ')[1].split('/')[0]; (porHost[h] ||= []).push(e.endpoint) }
  const salida = {
    generado: null, url_final: page.url(),
    resumen: { endpoints: endpoints.length, hosts: Object.keys(porHost), bundles_js: bundles.size, menu_items: menu.length, secciones_visitadas: visitadas.length },
    menu, secciones_visitadas: visitadas, endpoints, por_host: porHost, bundles: [...bundles],
  }
  writeFileSync(join(MAPA, 'mapa-banco.json'), JSON.stringify(salida, null, 2))
  console.log('RESULTADO:', JSON.stringify({ estado: 'mapeado', endpoints: endpoints.length, hosts: Object.keys(porHost), menu: menu.length, secciones: visitadas.length }))
  await ctx.close()
}
main().catch((e) => { console.log('ERROR:', e.message); process.exit(1) })

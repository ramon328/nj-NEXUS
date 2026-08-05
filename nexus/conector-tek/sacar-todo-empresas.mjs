// sacar-todo-empresas.mjs — SOLO LECTURA, MULTI-EMPRESA.
// Reusa la sesión VIVA (mismo perfil tibio) y recorre TODAS las empresas del
// listado del banco, sacando por cada una: saldos (account_summary /
// listCustAccount) + movimientos (ObtenerMovimientos → .Result.Detalle[]).
//
// SEGURIDAD (lo que pidió Ramón — "cuidado con cerrar la sesión"):
//   • Usa el MISMO candado que capturar-movimientos.mjs: si otro proceso tiene
//     el banco, sale sin abrir nada. NUNCA abre un 2º Chrome sobre el perfil
//     (eso es lo que le corta la sesión al banco).
//   • Reusa el perfil `chrome-profile` (sesión tibia). No re-loguea.
//   • Clics de mouse REALES que VIAJAN al botón (BioCatch puntúa el movimiento).
//   • NO firma NI transfiere. Read-only puro.
//
// Salida: data/empresas/<slug>.json por empresa + data/todas-empresas.json (índice).
import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
const { chromium } = patchright
import { writeFileSync, mkdirSync, chmodSync } from 'node:fs'
import { join } from 'node:path'
import { crearCandado } from '/Users/AIagenteia/nexus/conector-tek/candado.mjs'
import { HOSTS, URLS, MATCH } from '/Users/AIagenteia/nexus/conector-tek/endpoints.mjs'

const DIR = '/Users/AIagenteia/nexus/conector-tek'
const PROFILE = join(DIR, 'chrome-profile')
const DATA = join(DIR, 'data')
const OUT = join(DATA, 'empresas')
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log('·', ...a)
const PRIVADO = HOSTS.PRIVADO
const EMPRESAS_LIST = /companys\/\d+\/services/i   // dataContractByUser (lista de empresas)

// rango movimientos: banco tope 90 días
const hoy = new Date()
const iso = (d) => d.toISOString().slice(0, 10)
const cl = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
const pedido = process.env.TEK_DESDE || '2026-01-01'
const min90 = new Date(hoy.getTime() - 88 * 864e5)
const desdeISO = pedido > iso(min90) ? pedido : iso(min90)
const hastaISO = iso(hoy)
const desdeCL = cl(desdeISO), hastaCL = cl(hastaISO)

const slug = (s) => String(s || 'empresa').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'empresa'
function normFecha(s) {
  const t = String(s || '')
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = t.match(/(\d{2})[/-](\d{2})[/-](\d{4})/); if (m) return `${m[3]}-${m[2]}-${m[1]}`
  m = t.match(/(\d{2})[/-](\d{2})[/-](\d{2})\b/); if (m) return `20${m[3]}-${m[2]}-${m[1]}`
  return ''
}
const numDe = (v) => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : Math.abs(n) }
function normalizar(detalle, cuenta) {
  return (detalle || []).map((r) => {
    const monto = numDe(r.Monto ?? r.Importe)
    const esCargo = r.EsCargo === true || r.EsCargo === 'true' || r.EsCargo === 1
    const esAbono = r.EsAbono === true || r.EsAbono === 'true' || r.EsAbono === 1
    return {
      fecha: normFecha(r.FechaContableMovimiento || r.FechaContable),
      descripcion: String(r.Descripcion || r.DetalleMovimiento || '').trim(),
      cargo: esCargo ? monto : 0, abono: esAbono ? monto : 0,
      saldo: numDe(r.NuevoSaldo), documento: String(r.NroDocumento || '').trim(),
      sucursal: String(r.GlosaSucursal || r.Sucursal || '').trim(),
      nroMov: String(r.NroMovimiento || '').trim(), cuenta,
    }
  })
}

// buffers que se rellenan por interceptor; se vacían por empresa
let movsPorLote = []
let saldos = null
let listaEmpresas = null

async function main() {
  setTimeout(() => { console.log('RESULTADO:', JSON.stringify({ estado: 'hard_timeout' })); process.exit(2) }, 550_000).unref?.()
  const candado = crearCandado({ log: (m) => console.error('[candado]', m) })
  if (!await candado.adquirir()) { console.log('RESULTADO:', JSON.stringify({ estado: 'ocupado', nota: 'el banco lo tiene otro proceso; no abro 2º Chrome' })); return }

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false, channel: 'chrome', viewport: { width: 1360, height: 860 },
    locale: 'es-CL', timezoneId: 'America/Santiago',
  })
  const page = ctx.pages()[0] || await ctx.newPage()

  ctx.on('response', async (r) => {
    try {
      const url = r.url()
      if (MATCH.MOVIMIENTOS.test(url)) {
        const b = JSON.parse(await r.text()); const det = b?.Result?.Detalle || b?.Detalle || []
        if (Array.isArray(det) && det.length) { movsPorLote.push(det); log(`  ↯ movimientos: ${det.length} filas`) }
      } else if (MATCH.ACCOUNT_SUMMARY.test(url)) {
        const b = JSON.parse(await r.text()); if (b?.listCustAccount) saldos = b.listCustAccount
      } else if (EMPRESAS_LIST.test(url)) {
        const b = JSON.parse(await r.text()); if (b?.dataContractByUser) listaEmpresas = b.dataContractByUser
      }
    } catch {}
  })

  await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
  await sleep(6000)
  // CHEQUEO REAL de sesión (no basta la URL: el banco muestra "sesión cerrada"
  // DENTRO de privado.officebanking.cl, así que .includes(PRIVADO) daba falso positivo).
  // Exigimos una SEÑAL de estar logueado (menú/listado) y descartamos la pantalla de cierre.
  const cuerpo = (await page.evaluate(() => document.body?.innerText || '').catch(() => '')).slice(0, 4000)
  const urlBad = !page.url().includes(PRIVADO) || /\/login|wslogin|error-seguridad|seleccion-empresa/i.test(page.url())
  const textoCerrada = /sesi[oó]n\s+(cerrada|expirada|finalizada|caducada)|vuelve a ingresar|iniciar sesi[oó]n|ingresa tu (rut|clave)/i.test(cuerpo)
  const textoLogueado = /Cuentas Corrientes|Saldos y movimientos|Listado de empresas|Selecciona.*empresa|Cerrar sesi[oó]n|Bienvenid/i.test(cuerpo)
  if (urlBad || textoCerrada || !textoLogueado) {
    console.log('RESULTADO:', JSON.stringify({ estado: 'sesion_expirada', nota: 'el banco muestra sesión cerrada (cookies presentes pero sesión vencida en el servidor); hay que re-loguear asistido (reconectar_banco)', url: page.url(), pista: cuerpo.slice(0, 120) }))
    await page.screenshot({ path: join(DATA, 'sacar-todo-sesion-cerrada.png') }).catch(() => {})
    await ctx.close(); return
  }

  // helpers de clic real (mouse que viaja)
  const clickTexto = async (re) => {
    const loc = page.getByText(re).first(); const box = await loc.boundingBox().catch(() => null)
    if (!box) return false
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 12 }).catch(() => {})
    await sleep(220); await page.mouse.down(); await sleep(70); await page.mouse.up(); return true
  }
  const esVisible = async (re) => page.getByText(re).first().isVisible().catch(() => false)
  const frameEob = () => page.frames().find((f) => /eob\.officebanking\.cl\/CTA\.UI\.Web\/saldoctacte/i.test(f.url()))

  async function consultarRango(f) {
    const inputs = f.locator('input[type="date"], input[type="text"], input[placeholder*="/" i], input[class*="fecha" i]')
    const n = await inputs.count().catch(() => 0)
    if (n >= 2) {
      for (const [idx, val] of [[0, desdeISO], [1, hastaISO]]) {
        const el = inputs.nth(idx); const tipo = await el.getAttribute('type').catch(() => 'text')
        const v = tipo === 'date' ? val : cl(val)
        await el.click().catch(() => {}); await el.fill('').catch(() => {}); await el.fill(v).catch(() => {})
        await el.evaluate((e) => e.dispatchEvent(new Event('change', { bubbles: true }))).catch(() => {}); await sleep(400)
      }
      const btn = f.locator('button:has-text("Consultar"), a:has-text("Consultar"), input[value*="onsult" i]').first()
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); return true }
    }
    return false
  }

  // Captura saldos+movimientos de la empresa YA seleccionada (asume dashboard cargado)
  async function capturarCartola() {
    movsPorLote = []; saldos = null
    let itemRe = /Saldos y movimientos/i
    for (let i = 0; i < 4 && !(await esVisible(itemRe)); i++) { await clickTexto(/^Cuentas Corrientes$/i); await sleep(2800) }
    let ok = false
    if (await esVisible(itemRe)) ok = await clickTexto(itemRe)
    else { itemRe = /Cartola|Movimientos/i; if (await esVisible(itemRe)) ok = await clickTexto(itemRe) }
    log('  clic Saldos y movimientos:', ok); await sleep(12000)
    let f = frameEob()
    if (f) { await consultarRango(f).catch(() => {}); await sleep(9000) }
    // recorrer hasta 4 cuentas del selector
    try {
      f = frameEob()
      if (f) {
        const sel = f.locator('select').first(); const opts = await sel.locator('option').count().catch(() => 0)
        for (let i = 1; i < Math.min(opts, 6); i++) {
          await sel.selectOption({ index: i }).catch(() => {}); await sleep(2000)
          const f2 = frameEob(); if (f2) { await consultarRango(f2).catch(() => {}); await sleep(8000) }
        }
      }
    } catch {}
    // consolidar
    const vistos = new Set(); const movimientos = []
    for (const det of movsPorLote) for (const m of normalizar(det, saldos?.[0]?.accountNumber || '')) {
      const k = m.nroMov + '|' + m.fecha + '|' + m.saldo
      if (!vistos.has(k)) { vistos.add(k); movimientos.push(m) }
    }
    movimientos.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
    return { saldos: saldos || [], movimientos }
  }

  // Vuelve a la pantalla de selección de empresas para elegir otra.
  async function volverASeleccion() {
    // 1) intentar el switch dentro de la app (nombre de empresa / "Cambiar empresa")
    for (const re of [/Cambiar empresa/i, /Cambiar de empresa/i, /Seleccionar empresa/i]) {
      if (await esVisible(re)) { await clickTexto(re); await sleep(4000); return true }
    }
    // 2) recargar el dashboard: si hay varias empresas, reaparece el listado
    await page.goto('https://privado.officebanking.cl/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {})
    await sleep(6000)
    return true
  }

  // ── enumerar empresas del listado ──
  const t0 = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
  const hayListado = /listado de empresas|selecciona.*empresa/i.test(t0)

  const resultados = []
  const dumpEmpresa = (nombre, data, nota) => {
    const s = slug(nombre)
    const payload = { actualizado: new Date().toISOString(), empresa: nombre, desde: desdeISO, hasta: hastaISO,
      limite_banco_dias: 90, saldos: data?.saldos || [], total_movimientos: (data?.movimientos || []).length,
      movimientos: data?.movimientos || [], nota: nota || null }
    writeFileSync(join(OUT, s + '.json'), JSON.stringify(payload, null, 2)); chmodSync(join(OUT, s + '.json'), 0o600)
    resultados.push({ empresa: nombre, saldos: payload.saldos.length, movimientos: payload.total_movimientos, nota: nota || null })
    log(`  ✓ ${nombre}: ${payload.saldos.length} saldos, ${payload.total_movimientos} movs`)
  }

  if (!hayListado) {
    // ya estamos dentro de una empresa (la default). Sacamos esa y luego intentamos volver al listado.
    log('sin listado (empresa por defecto ya abierta) → capturo la actual')
    const nombre = (listaEmpresas?.find?.((e) => e?.etcdoPeopleNumber)?.etcdoPeopleNumber?.trim()) || 'empresa-actual'
    const data = await capturarCartola(); dumpEmpresa(nombre, data)
    await volverASeleccion()
  }

  // Recorrer filas del listado. Recolectamos los nombres visibles y entramos de a una.
  const nombresFilas = async () => {
    const rows = page.locator('tr,[role="row"],[class*="row"],li').filter({ has: page.getByText(/entrar/i) })
    const n = await rows.count().catch(() => 0); const out = []
    for (let i = 0; i < Math.min(n, 40); i++) {
      const txt = (await rows.nth(i).innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
      const nombre = txt.replace(/entrar/i, '').trim()
      if (nombre) out.push(nombre)
    }
    return out
  }

  let nombres = await nombresFilas()
  if (!nombres.length && Array.isArray(listaEmpresas)) nombres = listaEmpresas.map((e) => (e?.etcdoPeopleNumber || '').trim()).filter(Boolean)
  log('empresas detectadas:', nombres.length, '→', nombres.slice(0, 12).join(' | '))

  const yaHechas = new Set(resultados.map((r) => r.empresa))
  for (const nombre of nombres) {
    if (yaHechas.has(nombre)) continue
    try {
      // entrar por la fila que contiene el nombre
      const fila = page.locator('tr,[role="row"],[class*="row"],li').filter({ hasText: nombre.slice(0, 18) }).first()
      const entrar = fila.getByText(/entrar/i).first()
      const box = await entrar.boundingBox().catch(() => null)
      if (!box) { dumpEmpresa(nombre, null, 'no encontré botón Entrar'); continue }
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 12 }).catch(() => {})
      await sleep(200); await page.mouse.down(); await sleep(70); await page.mouse.up()
      await sleep(9000)
      const data = await capturarCartola()
      dumpEmpresa(nombre, data)
    } catch (e) {
      dumpEmpresa(nombre, null, 'error: ' + e.message)
    }
    await volverASeleccion()
    // refrescar la lista de filas por si el DOM cambió
    const nn = await nombresFilas(); if (nn.length) nombres = [...new Set([...nombres, ...nn])]
    yaHechas.add(nombre)
  }

  const indice = { actualizado: new Date().toISOString(), desde: desdeISO, hasta: hastaISO, total_empresas: resultados.length, empresas: resultados }
  writeFileSync(join(DATA, 'todas-empresas.json'), JSON.stringify(indice, null, 2)); chmodSync(join(DATA, 'todas-empresas.json'), 0o600)
  console.log('RESULTADO:', JSON.stringify({ estado: 'ok', ...indice }))
  try { await ctx.storageState({ path: join(DIR, 'session.json') }); chmodSync(join(DIR, 'session.json'), 0o600) } catch {}
  await ctx.close()
}
main().catch((e) => { console.log('ERROR:', e.message); process.exit(1) })

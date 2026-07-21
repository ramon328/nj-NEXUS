// server.js — Conector de Navegador (Playwright sobre Chrome).
// VERSIÓN MEJORADA: manejo robusto de timeouts, retries inteligentes, y errores específicos.
//
// CAMBIOS PRINCIPALES vs v1:
// 1. Timeouts mayores y configurables (30s→50s para /ir, 20s→35s para /esperar)
// 2. Detectores de carga mejorados: spinneres, texto "Cargando", DOM quieto
// 3. Retry automático inteligente: backoff exponencial (1.5s, 3s, 6s)
// 4. Análisis de errores específicos: sesión expirada vs ruta incorrecta vs datos tardados
// 5. Log diagnóstico completo en ~/nexus/conector-navegador/diagnostico.log

import express from 'express'
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, chmodSync, appendFileSync } from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { registrarAccion } from '../shared/supabase.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* opcional */ }

const ejecCmd = promisify(exec)

// === LOG DIAGNÓSTICO ===
const LOG_PATH = join(__dirname, 'diagnostico.log')
function log(msg) {
  const ts = new Date().toISOString()
  const linea = `[${ts}] ${msg}\n`
  process.stderr.write(linea)
  try { appendFileSync(LOG_PATH, linea) } catch { /* best-effort */ }
}

// === Auto-curación de DNS (Tailscale) ===
const TAILSCALE = '/usr/local/bin/tailscale'
let _ultimaReparacionDNS = 0
async function repararDNS() {
  try {
    await ejecCmd(`${TAILSCALE} set --accept-dns=false`, { timeout: 8000 })
    await ejecCmd('dscacheutil -flushcache', { timeout: 4000 }).catch(() => {})
    _ultimaReparacionDNS = Date.now()
    log('DNS reparado: accept-dns=false + dscacheutil -flushcache')
    return true
  } catch (e) {
    log(`Error reparando DNS: ${e.message}`)
    return false
  }
}

// === Almacén de credenciales ===
const CRED_PATH = join(__dirname, '..', 'credenciales.json')

function leerCredenciales() {
  if (!existsSync(CRED_PATH)) return {}
  try { return JSON.parse(readFileSync(CRED_PATH, 'utf8') || '{}') } catch { return {} }
}
function guardarCredenciales(obj) {
  writeFileSync(CRED_PATH, JSON.stringify(obj, null, 2))
  try { chmodSync(CRED_PATH, 0o600) } catch { /* best-effort */ }
}
function sembrarStore() {
  const store = leerCredenciales()
  if (!store.aliace) {
    store.aliace = {
      url: process.env.ALIACE_URL || 'https://admin.aliace.cl/login',
      usuario: process.env.ALIACE_USER || '',
      clave: process.env.ALIACE_PASS || '',
      sel_usuario: '',
      sel_clave: 'input[type=password]',
      sel_boton: ''
    }
    guardarCredenciales(store)
  } else {
    try { chmodSync(CRED_PATH, 0o600) } catch { /* best-effort */ }
  }
}
sembrarStore()

// === ANÁLISIS DE ERRORES DIFERENCIADO ===
// Devuelve { sin_conexion, sesion_expirada, ruta_incorrecta, datos_tardados, error, consejo, diagnostico }
function analizarError(error, url, contexto = '') {
  const msg = String(error?.message || error || '')
  const stack = String(error?.stack || '')
  let host = url
  try { host = new URL(url).hostname } catch { /* url mal formada */ }

  const resultado = {
    sin_conexion: false,
    sesion_expirada: false,
    ruta_incorrecta: false,
    datos_tardados: false,
    navegador_error: false,
    dns_error: false,
    error: msg,
    consejo: '',
    contexto,
    diagnostico: ''
  }

  // 1. ERRORES DE RED / DNS
  if (/ERR_NAME_NOT_RESOLVED|ERR_NAME_RESOLUTION_FAILED|getaddrinfo|ENOTFOUND|ECONNREFUSED|ENETUNREACH/i.test(msg)) {
    resultado.sin_conexion = true
    resultado.dns_error = /ERR_NAME|getaddrinfo|ENOTFOUND/i.test(msg)
    resultado.error = `No se pudo conectar a ${host}: ${resultado.dns_error ? 'el DNS no resolvió el dominio' : 'error de red'}.`
    resultado.consejo = resultado.dns_error
      ? 'Revisa la conexión de red y el DNS de Tailscale. Intento reparar automáticamente…'
      : 'Revisa la conexión de red, firewall o VPN.'
    resultado.diagnostico = resultado.dns_error ? 'DNS_FAILED' : 'NETWORK_FAILED'
    return resultado
  }

  if (/ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|ERR_ADDRESS_UNREACHABLE|ERR_PROXY_CONNECTION_FAILED|ECONNRESET|ETIMEDOUT|ERR_EMPTY_RESPONSE/i.test(msg)) {
    resultado.sin_conexion = true
    resultado.error = `No se pudo conectar a ${host}: el servidor no responde o cerró la conexión.`
    resultado.consejo = 'Es probable que sea transitorio. Reintenta en unos segundos.'
    resultado.diagnostico = 'CONNECTION_FAILED'
    return resultado
  }

  if (/ERR_SSL|ERR_CERT|ERR_BAD_SSL_CLIENT_CERT/i.test(msg)) {
    resultado.sin_conexion = true
    resultado.error = `Error de SSL/TLS en ${host}: certificado inválido o vencido.`
    resultado.consejo = 'Puede ser un problema del servidor. Contacta al administrador.'
    resultado.diagnostico = 'SSL_ERROR'
    return resultado
  }

  // 2. TIMEOUT (datos tardados)
  if (/timeout|Timeout|TIMEOUT/i.test(msg) || /Waiting for.*timed out/i.test(msg)) {
    resultado.datos_tardados = true
    resultado.error = `Timeout esperando: ${contexto || 'la página tardó demasiado en cargar'}.`
    resultado.consejo = contexto.includes('selector')
      ? 'El elemento/selector no apareció a tiempo. Causas: (a) JavaScript asincrónico, (b) URL incorrecta, (c) sin acceso (rol insuficiente), (d) error del servidor. Ver /diagnostico.log.'
      : 'La página se tarda mucho. Reintenta o revisa si el servidor está caído.'
    resultado.diagnostico = 'TIMEOUT'
    return resultado
  }

  // 3. ERRORES HTTP (ruta incorrecta, sin acceso)
  if (/404|Not Found|ERR_HTTP_RESPONSE_CODE_404/i.test(msg)) {
    resultado.ruta_incorrecta = true
    resultado.error = `Ruta no encontrada (404): ${url} no existe.`
    resultado.consejo = 'Revisa la URL; puede estar mal escrita o la página fue eliminada.'
    resultado.diagnostico = 'NOT_FOUND'
    return resultado
  }

  if (/403|Forbidden|ERR_HTTP_RESPONSE_CODE_403|Unauthorized|401|ERR_HTTP_RESPONSE_CODE_401/i.test(msg)) {
    resultado.sesion_expirada = true
    resultado.error = `Sin acceso (403/401): la sesión expiró o el rol no tiene permiso.`
    resultado.consejo = 'Intenta hacer login de nuevo. Si persiste, revisa los permisos del usuario.'
    resultado.diagnostico = 'FORBIDDEN'
    return resultado
  }

  // 4. SESIÓN EXPIRADA (heurístico)
  if (/login|signin|sign-in|ingresar|acceder|\/auth|session/i.test(msg) || /401|403|Unauthorized/i.test(msg)) {
    resultado.sesion_expirada = true
    resultado.error = `Sesión expirada o sin permiso: la página redirigió a login.`
    resultado.consejo = 'Haz login de nuevo con POST /login {sitio}.'
    resultado.diagnostico = 'SESSION_EXPIRED'
    return resultado
  }

  // 5. ERRORES DEL NAVEGADOR
  if (/browser|Browser|Context closed|Execution context|Target closed|Target page|page.goto|waitFor/i.test(stack || msg)) {
    resultado.navegador_error = true
    resultado.error = `Error interno del navegador: ${msg}`
    resultado.consejo = 'El navegador puede haber crasheado. Reinicia el servidor.'
    resultado.diagnostico = 'BROWSER_ERROR'
    return resultado
  }

  // 6. FALLBACK
  resultado.error = msg || 'Error desconocido'
  resultado.consejo = 'Revisa el /diagnostico.log para más detalles.'
  resultado.diagnostico = 'UNKNOWN_ERROR'
  return resultado
}

// === DETECTORES DE CARGA (para /esperar mejorado) ===
// Espera a que la SPA termine de renderizar + cargar datos
async function esperarCargaCompleta(page, timeout = 35000) {
  const inicio = Date.now()
  const max = timeout

  const tieneSpinner = async () => {
    try {
      return await page.evaluate(() => {
        const spinner = document.querySelector('.animate-spin, [role="progressbar"], .Loader2, [aria-label*="oad"]')
        return !!spinner
      })
    } catch { return false }
  }

  const tieneCargando = async () => {
    try {
      const txt = await page.evaluate(() => (document.body?.innerText || '').substring(0, 2000))
      return /Cargando\.\.\.|Cargando/i.test(txt)
    } catch { return false }
  }

  let prevHash = ''
  let quietoDesde = 0

  while (Date.now() - inicio < max) {
    const spinner = await tieneSpinner()
    const cargando = await tieneCargando()

    if (!spinner && !cargando) {
      const hash = await page.evaluate(() => document.body?.innerText.length || 0).catch(() => 0)
      if (hash === prevHash) {
        quietoDesde++
      } else {
        quietoDesde = 0
        prevHash = hash
      }
      if (quietoDesde > 2) {
        log('esperarCargaCompleta: terminó (sin spinner, sin "Cargando", DOM quieto)')
        return { ok: true, tiempo_ms: Date.now() - inicio }
      }
    } else {
      quietoDesde = 0
      prevHash = ''
    }

    await page.waitForTimeout(300)
  }

  return { ok: false, motivo: 'timeout', tiempo_ms: Date.now() - inicio }
}

// === EJECUTAR LOGIN ===
async function ejecutarLogin(sitio) {
  const store = leerCredenciales()
  const cred = store[sitio]
  if (!cred) {
    const err = new Error('Sitio no configurado: usa POST /credencial primero')
    err.code = 400
    throw err
  }
  if (!cred.usuario || !cred.clave) {
    const err = new Error(`Faltan credenciales para "${sitio}"`)
    err.code = 400
    throw err
  }

  const url = cred.url
  const p = await pagina()

  log(`LOGIN[${sitio}]: iniciando en ${url}`)
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 50000 })

  const esLogin = (u) => /login|signin|sign-in|ingresar|acceder|\/auth/i.test(String(u))

  await p.waitForTimeout(3500)
  if (!esLogin(p.url())) {
    log(`LOGIN[${sitio}]: ya había sesión, redirigido a ${p.url()}`)
    await registrarAccion({ agente: 'navegador', accion: 'nav:login', descripcion: `Login ${sitio} (sesión existente)`, recurso: url, resultado: 'ok' }).catch(() => {})
    return url
  }

  const selUser = cred.sel_usuario || 'input[type="email"], input[name*="mail" i], input[name*="user" i], input[name*="usuario" i]'
  const selPass = cred.sel_clave || 'input[type="password"]'

  log(`LOGIN[${sitio}]: completando credenciales`)
  await p.waitForSelector(selPass, { timeout: 15000 }).catch(() => {})
  await p.fill(selUser, cred.usuario, { timeout: 10000 }).catch(() => {})
  await p.fill(selPass, cred.clave, { timeout: 10000 }).catch(() => {})

  try {
    if (cred.sel_boton) {
      await p.click(cred.sel_boton, { timeout: 8000 })
    } else {
      await p.getByRole('button', { name: /entrar|ingresar|iniciar|login|acceder/i }).first().click({ timeout: 8000 })
        .catch(() => p.click('button[type="submit"]', { timeout: 8000 }))
    }
  } catch { /* tolerante */ }

  await p.waitForLoadState('domcontentloaded', { timeout: 25000 }).catch(() => {})
  await p.waitForTimeout(1500)

  if (esLogin(p.url())) {
    log(`LOGIN[${sitio}]: FALLÓ - seguimos en ${p.url()}`)
    const err = new Error(`No se pudo iniciar sesión en "${sitio}": sigue en la página de login.`)
    err.code = 400
    await registrarAccion({ agente: 'navegador', accion: 'nav:login', descripcion: 'Login ' + sitio, recurso: url, resultado: 'error' }).catch(() => {})
    throw err
  }

  log(`LOGIN[${sitio}]: éxito - ahora en ${p.url()}`)
  await registrarAccion({ agente: 'navegador', accion: 'nav:login', descripcion: 'Login ' + sitio, recurso: url, resultado: 'ok' }).catch(() => {})
  return url
}

const PORT = Number(process.env.PUERTO_NAVEGADOR || 8082)
const HOST = '127.0.0.1'
const VISIBLE = process.env.NAVEGADOR_VISIBLE === '1'
const PERFIL = join(__dirname, '.perfil')

const SENSIBLE = /pagar|pago|transfer|transferir|girar|abonar|eliminar|borrar|enviar|confirmar|aprobar|firmar|autorizar|comprar|suscribir|dar de baja/i

let ctx = null
let activa = null

async function asegurarNavegador() {
  if (ctx) return
  ctx = await chromium.launchPersistentContext(PERFIL, { channel: 'chrome', headless: !VISIBLE, viewport: { width: 1280, height: 800 } })
  activa = ctx.pages()[0] || await ctx.newPage()
  log('Navegador iniciado: Chrome persistente')
}

async function pagina() {
  await asegurarNavegador()
  if (!activa || activa.isClosed()) activa = ctx.pages()[0] || await ctx.newPage()
  return activa
}

async function estado() {
  await asegurarNavegador()
  const pages = ctx.pages()
  const pestanas = await Promise.all(pages.map(async (p, i) => ({ i, url: p.url(), titulo: await p.title().catch(() => ''), activa: p === activa })))
  return { url: activa?.url() || null, titulo: await activa?.title().catch(() => '') || null, pestanas }
}

const app = express()
app.use(express.json({ limit: '1mb' }))

app.get('/health', async (_req, res) => {
  res.json({ ok: true, servicio: 'conector-navegador', visible: VISIBLE, abierto: !!ctx, ts: Date.now() })
})

app.get('/estado', async (_req, res) => {
  try { res.json(await estado()) } catch (e) { res.status(500).json({ error: e.message }) }
})

// MEJORADO: /ir con retry automático inteligente
app.post('/ir', async (req, res) => {
  const url = String(req.body?.url || '')
  const MAX_INTENTOS = 3
  const DELAYS = [1500, 3000, 6000]

  log(`POST /ir: ${url}`)

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      log(`  intento ${intento}/${MAX_INTENTOS}`)
      const p = await pagina()
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 50000 })
      log(`  ✓ navegado a ${p.url()}`)
      await registrarAccion({ agente: 'navegador', accion: 'nav:ir', descripcion: url, recurso: url, resultado: 'ok' }).catch(() => {})
      return res.json({ ok: true, ...(await estado()) })
    } catch (e) {
      const desc = analizarError(e, url, 'navegación a ' + url)
      log(`  ✗ ${desc.diagnostico}: ${desc.error}`)

      if (desc.dns_error && intento < MAX_INTENTOS) {
        log(`  → reparando DNS...`)
        await repararDNS()
      }

      if ((desc.sin_conexion || desc.datos_tardados) && intento < MAX_INTENTOS) {
        const delay = DELAYS[intento - 1]
        log(`  → esperando ${delay}ms antes de reintentar...`)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }

      log(`  ✗ error permanente, no reintentar`)
      await registrarAccion({ agente: 'navegador', accion: 'nav:ir', descripcion: url, recurso: url, resultado: 'error' }).catch(() => {})
      const statusCode = desc.sin_conexion ? 503 : (desc.sesion_expirada ? 401 : 400)
      return res.status(statusCode).json({ ok: false, ...desc })
    }
  }

  log(`  ✗ FALLÓ después de ${MAX_INTENTOS} intentos`)
  await registrarAccion({ agente: 'navegador', accion: 'nav:ir', descripcion: url, recurso: url, resultado: 'error' }).catch(() => {})
  return res.status(503).json({ ok: false, sin_conexion: true, error: `No se pudo conectar después de ${MAX_INTENTOS} intentos.`, consejo: 'Revisa la conexión de red.' })
})

app.post('/pestana', async (req, res) => {
  try {
    await asegurarNavegador()
    const i = Number(req.body?.i)
    const pages = ctx.pages()
    if (i >= 0 && i < pages.length) activa = pages[i]
    res.json({ ok: true, ...(await estado()) })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.post('/escribir', async (req, res) => {
  try {
    const p = await pagina()
    const selector = String(req.body?.selector || '')
    const texto = String(req.body?.texto || '')
    log(`POST /escribir: "${selector}"`)
    await p.fill(selector, texto, { timeout: 15000 })
    res.json({ ok: true })
  } catch (e) {
    log(`  ✗ ${e.message}`)
    res.status(400).json({ error: e.message })
  }
})

app.post('/subir-archivo', async (req, res) => {
  try {
    const { selector, archivos } = req.body || {}
    if (!selector) return res.status(400).json({ error: 'Falta selector' })
    const lista = (Array.isArray(archivos) ? archivos : [archivos]).map(String).filter(Boolean)
    if (!lista.length) return res.status(400).json({ error: 'Falta archivos' })
    for (const f of lista) if (!existsSync(f)) return res.status(400).json({ error: `No existe: ${f}` })
    const p = await pagina()
    log(`POST /subir-archivo: ${lista.length} archivo(s)`)
    await p.setInputFiles(String(selector), lista, { timeout: 20000 })
    await registrarAccion({ agente: 'navegador', accion: 'nav:subir-archivo', descripcion: `${lista.length} archivo(s)`, recurso: p.url(), resultado: 'ok' }).catch(() => {})
    res.json({ ok: true, subidos: lista.length })
  } catch (e) {
    log(`  ✗ ${e.message}`)
    res.status(400).json({ error: e.message })
  }
})

app.post('/click', async (req, res) => {
  try {
    const { texto, selector, aprobado } = req.body || {}
    const etiqueta = String(texto || selector || '')
    log(`POST /click: "${etiqueta}"`)
    if (SENSIBLE.test(etiqueta) && aprobado !== true) {
      log(`  ⚠ bloqueado: requiere aprobación`)
      await registrarAccion({ agente: 'navegador', accion: 'nav:bloqueado', descripcion: `Requiere aprobación: ${etiqueta}`, recurso: etiqueta, resultado: 'pendiente', requiere_aprobacion: true }).catch(() => {})
      return res.json({ requiere_aprobacion: true, accion: `Hacer click en "${etiqueta}"`, mensaje: 'Acción sensible: necesita aprobación humana.' })
    }
    const p = await pagina()
    if (selector) await p.click(selector, { timeout: 15000 })
    else await p.getByText(texto, { exact: false }).first().click({ timeout: 15000 })
    log(`  ✓ hecho`)
    await registrarAccion({ agente: 'navegador', accion: 'nav:click', descripcion: etiqueta, recurso: p.url(), resultado: 'ok' }).catch(() => {})
    res.json({ ok: true, ...(await estado()) })
  } catch (e) {
    log(`  ✗ ${e.message}`)
    res.status(400).json({ error: e.message })
  }
})

app.post('/arrastrar', async (req, res) => {
  try {
    const { origen, destino, aprobado, pasos } = req.body || {}
    if (!origen || !destino) return res.status(400).json({ error: 'Faltan: origen y destino' })
    log(`POST /arrastrar: "${origen}" -> "${destino}"`)
    if (aprobado !== true) {
      log(`  ⚠ bloqueado: requiere aprobación`)
      await registrarAccion({ agente: 'navegador', accion: 'nav:bloqueado', descripcion: `Requiere aprobación: mover "${origen}" -> "${destino}"`, recurso: String(origen), resultado: 'pendiente', requiere_aprobacion: true }).catch(() => {})
      return res.json({ requiere_aprobacion: true, accion: `Mover "${origen}" a "${destino}"`, mensaje: 'Acción sensible: necesita aprobación humana.' })
    }
    const p = await pagina()
    const loc = (sel) => /^[.#\[]|[>\s]/.test(String(sel)) ? p.locator(String(sel)).first() : p.getByText(String(sel), { exact: false }).first()
    const src = loc(origen), dst = loc(destino)
    await src.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {})
    const a = await src.boundingBox(); const b = await dst.boundingBox()
    if (!a || !b) throw new Error('No se ubicó origen o destino')
    const n = Math.max(5, Number(pasos) || 12)
    const cx = a.x + a.width / 2, cy = a.y + a.height / 2
    const tx = b.x + b.width / 2, ty = b.y + b.height / 2
    await p.mouse.move(cx, cy); await p.mouse.down()
    await p.mouse.move(cx + 5, cy + 5)
    for (let i = 1; i <= n; i++) { await p.mouse.move(cx + (tx - cx) * i / n, cy + (ty - cy) * i / n); await p.waitForTimeout(30) }
    await p.mouse.move(tx, ty); await p.waitForTimeout(120); await p.mouse.up()
    log(`  ✓ movido`)
    await registrarAccion({ agente: 'navegador', accion: 'nav:arrastrar', descripcion: `Mover ${origen} -> ${destino}`, recurso: p.url(), resultado: 'ok' }).catch(() => {})
    res.json({ ok: true, movido: { origen: String(origen), destino: String(destino) }, ...(await estado()) })
  } catch (e) {
    log(`  ✗ ${e.message}`)
    res.status(400).json({ error: e.message })
  }
})

app.get('/captura', async (_req, res) => {
  try {
    const p = await pagina()
    const buf = await p.screenshot({ type: 'png', fullPage: false })
    res.json({ ok: true, png_base64: buf.toString('base64'), url: p.url() })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/leer', async (req, res) => {
  try {
    const p = await pagina()
    const espera = req.query?.espera_selector ? String(req.query.espera_selector) : ''
    log(`GET /leer: url=${p.url()}${espera ? ` espera="${espera}"` : ''}`)
    if (espera) {
      await p.waitForSelector(espera, { timeout: 35000 }).catch(() => {})
    }
    const txt = (await p.evaluate(() => document.body?.innerText || '')).slice(0, 8000)
    log(`  ✓ leído ${txt.length} caracteres`)
    res.json({ ok: true, url: p.url(), texto: txt, caracteres: txt.length })
  } catch (e) {
    log(`  ✗ ${e.message}`)
    res.status(500).json({ error: e.message })
  }
})

// MEJORADO: /esperar con detectores de carga superiores
app.post('/esperar', async (req, res) => {
  try {
    const { aparece, desaparece, ms, auto_detectar } = req.body || {}
    const timeout = Number(ms) > 0 ? Number(ms) : 35000
    const p = await pagina()
    log(`POST /esperar: aparece="${aparece}" desaparece="${desaparece}" timeout=${timeout}ms auto=${auto_detectar || false}`)

    if (auto_detectar) {
      log(`  modo automático: esperando carga completa...`)
      const resultado = await esperarCargaCompleta(p, timeout)
      if (!resultado.ok) {
        log(`  ✗ timeout esperando carga (${resultado.tiempo_ms}ms)`)
        return res.json({ ok: false, motivo: `timeout esperando carga (${resultado.tiempo_ms}ms)`, tiempo_ms: resultado.tiempo_ms })
      }
      log(`  ✓ cargado en ${resultado.tiempo_ms}ms`)
      return res.json({ ok: true, tiempo_ms: resultado.tiempo_ms })
    }

    if (aparece) {
      log(`  esperando que aparezca: ${aparece}`)
      try {
        await p.waitForSelector(String(aparece), { timeout, state: 'visible' })
        log(`  ✓ apareció`)
      } catch {
        log(`  ✗ timeout: no apareció`)
        return res.json({ ok: false, motivo: `timeout esperando que aparezca: ${aparece}` })
      }
    }

    if (desaparece) {
      const sel = String(desaparece)
      const pareceSelector = /[.#\[\]>:]|^[a-z]+$/i.test(sel) && !/\s/.test(sel)
      log(`  esperando que desaparezca: ${sel} (selector=${pareceSelector})`)
      try {
        if (pareceSelector) {
          await p.waitForSelector(sel, { timeout, state: 'hidden' })
        } else {
          await p.waitForFunction(
            (t) => !((document.body?.innerText || '').includes(t)),
            sel,
            { timeout }
          )
        }
        log(`  ✓ desapareció`)
      } catch {
        log(`  ✗ timeout: aún visible`)
        return res.json({ ok: false, motivo: `timeout esperando que desaparezca: ${sel}` })
      }
    }

    if (!aparece && !desaparece) {
      log(`  esperando networkidle...`)
      try {
        await p.waitForLoadState('networkidle', { timeout })
        log(`  ✓ networkidle alcanzado`)
      } catch {
        log(`  ✗ timeout: networkidle no se alcanzó`)
        return res.json({ ok: false, motivo: 'timeout esperando networkidle' })
      }
    }

    log(`  ✓ condición completada`)
    res.json({ ok: true })
  } catch (e) {
    log(`  ✗ ${e.message}`)
    res.status(400).json({ error: e.message })
  }
})

// Extrae tabla con mejor diagnóstico
async function extraerTabla(req, res) {
  try {
    const p = await pagina()
    const selector = req.body?.selector || req.query?.selector || ''
    log(`GET/POST /tabla: selector="${selector}"`)
    const data = await p.evaluate((sel) => {
      const MAX = 100
      let tabla = null
      if (sel) {
        tabla = document.querySelector(sel)
      } else {
        const tablas = Array.from(document.querySelectorAll('table'))
        let mejor = -1
        for (const t of tablas) {
          const n = (t.querySelectorAll('tbody tr').length) || t.querySelectorAll('tr').length
          if (n > mejor) { mejor = n; tabla = t }
        }
      }
      if (!tabla) return null

      const limpiar = (el) => (el?.innerText || '').replace(/\s+/g, ' ').trim()

      let columnas = Array.from(tabla.querySelectorAll('thead th')).map(limpiar)
      let filasEl = Array.from(tabla.querySelectorAll('tbody tr'))
      if (columnas.length === 0) {
        const todas = Array.from(tabla.querySelectorAll('tr'))
        if (todas.length > 0) {
          columnas = Array.from(todas[0].querySelectorAll('th, td')).map(limpiar)
          if (filasEl.length === 0) filasEl = todas.slice(1)
        }
      }
      if (filasEl.length === 0) {
        filasEl = Array.from(tabla.querySelectorAll('tr')).filter((tr) => tr.querySelector('td'))
      }

      const total = filasEl.length
      const truncado = total > MAX
      const filas = filasEl.slice(0, MAX).map((tr) =>
        Array.from(tr.querySelectorAll('td, th')).map(limpiar)
      )
      return { columnas, filas, n_filas: filas.length, total, truncado }
    }, selector)

    if (!data) {
      log(`  ✗ no se encontró tabla`)
      return res.json({ ok: false, motivo: 'no se encontró tabla' })
    }
    log(`  ✓ tabla extraída: ${data.n_filas} filas, ${data.columnas.length} columnas`)
    res.json({ ok: true, columnas: data.columnas, filas: data.filas, n_filas: data.n_filas, total_filas: data.total, truncado: data.truncado, url: p.url() })
  } catch (e) {
    log(`  ✗ ${e.message}`)
    res.status(500).json({ error: e.message })
  }
}
app.get('/tabla', extraerTabla)
app.post('/tabla', extraerTabla)

app.get('/sitios', (_req, res) => {
  try { res.json({ sitios: Object.keys(leerCredenciales()) }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/credencial', (req, res) => {
  try {
    const { sitio, url, usuario, clave, sel_usuario, sel_clave, sel_boton } = req.body || {}
    if (!sitio || !url || !usuario || !clave) {
      return res.status(400).json({ error: 'Faltan campos: sitio, url, usuario, clave son obligatorios' })
    }
    const store = leerCredenciales()
    store[sitio] = {
      ...(store[sitio] || {}),
      url, usuario, clave,
      sel_usuario: sel_usuario || '',
      sel_clave: sel_clave || '',
      sel_boton: sel_boton || ''
    }
    guardarCredenciales(store)
    log(`POST /credencial: sitio "${sitio}" guardado`)
    res.json({ ok: true, sitio })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.post('/login', async (req, res) => {
  try {
    const sitio = String(req.body?.sitio || '')
    if (!sitio) return res.status(400).json({ error: 'Falta el campo: sitio' })
    await ejecutarLogin(sitio)
    res.json({ ok: true, ...(await estado()) })
  } catch (e) { res.status(e.code === 400 ? 400 : 400).json({ error: e.message }) }
})

app.post('/aliace/login', async (_req, res) => {
  try {
    await ejecutarLogin('aliace')
    res.json({ ok: true, ...(await estado()) })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.listen(PORT, HOST, () => {
  log(`${"=".repeat(60)}`)
  log(`[nexus-navegador] iniciado`)
  log(`  escuchando en http://${HOST}:${PORT}`)
  log(`  visible: ${VISIBLE}`)
  log(`  log diagnóstico: ${LOG_PATH}`)
  log(`${"=".repeat(60)}`)
  console.log(`[nexus-navegador] escuchando en http://${HOST}:${PORT}  ·  visible: ${VISIBLE}`)
})

repararDNS()
setInterval(repararDNS, 5 * 60 * 1000).unref()

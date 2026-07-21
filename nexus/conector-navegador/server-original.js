// server.js — Conector de Navegador (Playwright sobre el Chrome instalado).
// Deja que el agente abra páginas, navegue, se mueva en pestañas, llene formularios
// y opere paneles internos (ej. Aliace). Escucha SOLO en 127.0.0.1.
//
// FRENO DE SEGURIDAD: las acciones IRREVERSIBLES (pagar, transferir, eliminar,
// enviar, confirmar) NO se ejecutan sin { aprobado: true }. Devuelven
// requiere_aprobacion:true para que un humano confirme. Toda acción se audita.
//
// VERSIÓN: v1.2
//   v1.1 — Timeouts aumentados, retry automático en /esperar, detección de sesión expirada.
//   v1.2 — Diagnóstico enriquecido (ruta incorrecta vs datos tardados vs sesión expirada),
//           /esperar con reintentos progresivos, endpoint /version, mejor manejo de errores.

import express from 'express'
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { registrarAccion } from '../shared/supabase.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* opcional */ }

const ejecCmd = promisify(exec)

// ─── Versión del conector ──────────────────────────────────────────────────────
const VERSION = 'v1.2'
const VERSION_INFO = {
  version: VERSION,
  cambios: [
    'v1.2: Diagnóstico enriquecido (ruta incorrecta vs datos tardados vs sesión expirada), /esperar con reintentos progresivos, endpoint /version',
    'v1.1: Timeouts aumentados a 45s, retry automático en /esperar, detección de sesión expirada'
  ]
}

// ─── Detección de sesión expirada ─────────────────────────────────────────────
const ES_LOGIN = (url) => /login|signin|sign-in|ingresar|acceder|\/auth/i.test(String(url))

// Detecta si la página actual indica sesión expirada (redirección a login)
async function detectarSesionExpirada(p) {
  const url = p.url()
  if (ES_LOGIN(url)) return { expirada: true, url }
  // También busca texto típico de expiración en el body visible
  const texto = await p.evaluate(() => (document.body?.innerText || '').slice(0, 500)).catch(() => '')
  if (/sesión.*expirada|session.*expired|inicia.*sesión|debe.*iniciar|ha.*cerrado.*sesión/i.test(texto)) {
    return { expirada: true, url, texto_detectado: true }
  }
  return { expirada: false }
}

// ─── Auto-curación de DNS (Tailscale) ─────────────────────────────────────────
// El DNS de Tailscale (accept-dns=true → resolver 100.100.100.100) deja a Chrome
// sin resolver dominios tras reconexión/suspensión → ERR_NAME_NOT_RESOLVED ("sin
// internet"), justo lo que pasa en WhatsApp. Forzamos accept-dns=false (resuelve
// por el router) y limpiamos la caché DNS. Corre sin sudo. Idempotente.
const TAILSCALE = '/usr/local/bin/tailscale'
let _ultimaReparacionDNS = 0
async function repararDNS() {
  try {
    await ejecCmd(`${TAILSCALE} set --accept-dns=false`, { timeout: 8000 })
    await ejecCmd('dscacheutil -flushcache', { timeout: 4000 }).catch(() => {})
    _ultimaReparacionDNS = Date.now()
    return true
  } catch { return false }
}

// ─── Almacén de credenciales ──────────────────────────────────────────────────
// Archivo JSON con permisos 600. Una entrada por sitio:
//   { url, usuario, clave, sel_usuario, sel_clave, sel_boton }
const CRED_PATH = join(__dirname, '..', 'credenciales.json')

function leerCredenciales() {
  if (!existsSync(CRED_PATH)) return {}
  try { return JSON.parse(readFileSync(CRED_PATH, 'utf8') || '{}') } catch { return {} }
}
function guardarCredenciales(obj) {
  writeFileSync(CRED_PATH, JSON.stringify(obj, null, 2))
  try { chmodSync(CRED_PATH, 0o600) } catch { /* best-effort */ }
}
// Siembra la entrada "aliace" desde el .env si aún no existe el store.
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

// ─── Login reutilizable ────────────────────────────────────────────────────────
async function ejecutarLogin(sitio) {
  const store = leerCredenciales()
  const cred = store[sitio]
  if (!cred) { const err = new Error('Sitio no configurado: usa POST /credencial primero'); err.code = 400; throw err }
  if (!cred.usuario || !cred.clave) { const err = new Error(`Faltan credenciales para "${sitio}"`); err.code = 400; throw err }
  const url = cred.url
  const p = await pagina()
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  // IDEMPOTENTE: si ya hay sesión, la SPA redirige al panel. Damos ~4s para resolverlo.
  await p.waitForTimeout(4000)
  if (!ES_LOGIN(p.url())) {
    await registrarAccion({ agente: 'navegador', accion: 'nav:login', descripcion: `Login ${sitio} (ya había sesión)`, recurso: url, resultado: 'ok' }).catch(() => {})
    return url
  }
  const selPass = cred.sel_clave || 'input[type="password"]'
  const selUser = cred.sel_usuario || 'input[type="email"], input[name*="mail" i], input[name*="user" i], input[name*="usuario" i]'
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
  } catch { /* tolerante: puede haber redirigido ya */ }
  await p.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {})
  await p.waitForTimeout(2000)
  if (ES_LOGIN(p.url())) {
    const err = new Error(`No se pudo iniciar sesión en "${sitio}": sigue en la página de login (revisa credenciales o selectores).`)
    err.code = 400
    await registrarAccion({ agente: 'navegador', accion: 'nav:login', descripcion: 'Login ' + sitio, recurso: url, resultado: 'error' }).catch(() => {})
    throw err
  }
  await registrarAccion({ agente: 'navegador', accion: 'nav:login', descripcion: 'Login ' + sitio, recurso: url, resultado: 'ok' })
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
}
async function pagina() { await asegurarNavegador(); if (!activa || activa.isClosed()) activa = ctx.pages()[0] || await ctx.newPage(); return activa }

async function estado() {
  await asegurarNavegador()
  const pages = ctx.pages()
  const pestanas = await Promise.all(pages.map(async (p, i) => ({ i, url: p.url(), titulo: await p.title().catch(() => ''), activa: p === activa })))
  return { url: activa?.url() || null, titulo: await activa?.title().catch(() => '') || null, pestanas }
}

const app = express()
app.use(express.json({ limit: '1mb' }))

// ─── /version — reporta versión del conector ──────────────────────────────────
app.get('/version', (_req, res) => {
  res.json({ ok: true, ...VERSION_INFO, servicio: 'conector-navegador' })
})

app.get('/health', async (_req, res) => {
  res.json({ ok: true, servicio: 'conector-navegador', version: VERSION, visible: VISIBLE, abierto: !!ctx, ts: Date.now() })
})

app.get('/estado', async (_req, res) => {
  try { res.json(await estado()) } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Clasificador de errores de navegación ────────────────────────────────────
// Devuelve diagnóstico enriquecido distinguiendo tipo de fallo.
function describirErrorNavegacion(url, msg) {
  const m = String(msg || '')
  let host = url
  try { host = new URL(url).hostname } catch { /* url mal formada */ }
  if (/ERR_NAME_NOT_RESOLVED|ERR_NAME_RESOLUTION_FAILED|getaddrinfo/i.test(m)) {
    return { sin_conexion: true, dns: true, tipo: 'dns', error: `No se pudo conectar a ${host}: el DNS no resolvió el dominio. Reintentando tras reparar el DNS…` }
  }
  if (/ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|ERR_ADDRESS_UNREACHABLE|ERR_PROXY_CONNECTION_FAILED/i.test(m)) {
    return { sin_conexion: true, tipo: 'red', error: `No se pudo conectar a ${host}: sin conexión a internet o el DNS no responde. Revisa la red e inténtalo de nuevo.` }
  }
  if (/ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED|ERR_CONNECTION_TIMED_OUT|ERR_TIMED_OUT|ERR_SSL|ERR_CERT|ERR_EMPTY_RESPONSE/i.test(m)) {
    return { sin_conexion: true, tipo: 'conexion', error: `No se pudo conectar a ${host}: la página no responde o rechazó la conexión. Puede estar caída o lenta; inténtalo de nuevo.` }
  }
  if (/Timeout.*exceeded|timeout/i.test(m)) {
    return { sin_conexion: true, tipo: 'timeout', error: `No se pudo cargar ${host} a tiempo: la página tardó demasiado. Inténtalo de nuevo.` }
  }
  return { tipo: 'desconocido', error: m }
}

// ─── Diagnóstico de /esperar: qué pasó realmente ──────────────────────────────
// Analiza el DOM actual para decirle al agente QUÉ falló exactamente.
async function diagnosticarEspera(p, selector) {
  try {
    // 1. ¿Sesión expirada?
    const sesion = await detectarSesionExpirada(p)
    if (sesion.expirada) {
      return { tipo: 'sesion_expirada', mensaje: `La sesión expiró (redirigido a login: ${sesion.url}). Usa POST /login para volver a entrar.`, url: p.url() }
    }

    // 2. ¿La página tiene errores HTTP (404, 500)?
    const titulo = await p.title().catch(() => '')
    if (/404|not found|no encontrad/i.test(titulo)) {
      return { tipo: 'ruta_incorrecta', mensaje: `La página devolvió 404 (ruta incorrecta o recurso inexistente). Título: "${titulo}"`, url: p.url() }
    }
    if (/500|error del servidor|server error/i.test(titulo)) {
      return { tipo: 'error_servidor', mensaje: `La página devolvió error de servidor. Título: "${titulo}"`, url: p.url() }
    }

    const info = await p.evaluate((sel) => {
      const body = document.body?.innerText?.slice(0, 800) || ''
      const url = window.location.href

      // ¿Hay indicadores de carga en pantalla?
      const cargandoTexto = /cargando|loading|espere|please wait|procesando/i.test(body)
      const cargandoSpinner = !!document.querySelector(
        '.spinner, .loading, [class*="loading"], [class*="spinner"], [aria-busy="true"]'
      )

      // ¿El selector existe pero está oculto?
      let selectorExiste = false
      let selectorVisible = false
      if (sel) {
        const el = document.querySelector(sel)
        if (el) {
          selectorExiste = true
          const rect = el.getBoundingClientRect()
          selectorVisible = rect.width > 0 && rect.height > 0
        }
      }

      // Cantidad de filas en tabla principal (si la hay)
      const filas = document.querySelectorAll('table tbody tr').length
      const tablasTotal = document.querySelectorAll('table').length

      return { body: body.slice(0, 300), url, cargandoTexto, cargandoSpinner, selectorExiste, selectorVisible, filas, tablasTotal }
    }, selector || '')

    // Clasificar según lo que encontramos
    if (info.cargandoTexto || info.cargandoSpinner) {
      return {
        tipo: 'datos_tardando',
        mensaje: `La página sigue cargando (spinner/texto de carga detectado). La SPA está renderizando. Reintenta /esperar con más tiempo o espera unos segundos.`,
        url: info.url,
        detalle: { cargando_texto: info.cargandoTexto, cargando_spinner: info.cargandoSpinner }
      }
    }

    if (selector && !info.selectorExiste) {
      // El selector no existe en el DOM en absoluto
      if (info.filas === 0 && info.tablasTotal === 0) {
        return {
          tipo: 'sin_datos',
          mensaje: `El selector "${selector}" no existe y no hay tablas en esta página. Puede que la URL sea incorrecta o la sección esté vacía.`,
          url: info.url,
          detalle: { tablas: info.tablasTotal, filas: info.filas }
        }
      }
      return {
        tipo: 'selector_incorrecto',
        mensaje: `El selector "${selector}" no existe en el DOM. Hay ${info.tablasTotal} tabla(s) con ${info.filas} fila(s) en total. Quizás el selector o la estructura cambió.`,
        url: info.url,
        detalle: { tablas: info.tablasTotal, filas: info.filas, texto_parcial: info.body }
      }
    }

    if (selector && info.selectorExiste && !info.selectorVisible) {
      return {
        tipo: 'selector_oculto',
        mensaje: `El selector "${selector}" existe pero no es visible (puede estar dentro de un panel colapsado o con display:none).`,
        url: info.url
      }
    }

    return {
      tipo: 'timeout_generico',
      mensaje: `Timeout esperando "${selector || 'carga'}". La página respondió pero el contenido no apareció en el tiempo dado. Intenta aumentar el parámetro "ms".`,
      url: info.url,
      detalle: { texto_parcial: info.body }
    }
  } catch (e) {
    return { tipo: 'error_diagnostico', mensaje: `No se pudo diagnosticar: ${e.message}`, url: p.url().catch?.(() => '') }
  }
}

app.post('/ir', async (req, res) => {
  const url = String(req.body?.url || '')
  const MAX_INTENTOS = 3
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      const p = await pagina()
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await registrarAccion({ agente: 'navegador', accion: 'nav:ir', descripcion: url, recurso: url, resultado: 'ok' })
      return res.json({ ok: true, version: VERSION, ...(await estado()) })
    } catch (e) {
      const desc = describirErrorNavegacion(url, e.message)
      if (desc.dns) await repararDNS()
      if (desc.sin_conexion && intento < MAX_INTENTOS) { await new Promise((r) => setTimeout(r, 1500 * intento)); continue }
      await registrarAccion({ agente: 'navegador', accion: 'nav:ir', descripcion: url, recurso: url, resultado: 'error' }).catch(() => {})
      return res.status(desc.sin_conexion ? 503 : 400).json({ ok: false, version: VERSION, ...desc })
    }
  }
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
    await p.fill(String(req.body?.selector || ''), String(req.body?.texto || ''), { timeout: 15000 })
    res.json({ ok: true })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.post('/subir-archivo', async (req, res) => {
  try {
    const { selector, archivos } = req.body || {}
    if (!selector) return res.status(400).json({ error: 'Falta selector del input file' })
    const lista = (Array.isArray(archivos) ? archivos : [archivos]).map(String).filter(Boolean)
    if (!lista.length) return res.status(400).json({ error: 'Falta archivos (ruta absoluta o lista de rutas)' })
    for (const f of lista) if (!existsSync(f)) return res.status(400).json({ error: `No existe el archivo: ${f}` })
    const p = await pagina()
    await p.setInputFiles(String(selector), lista, { timeout: 20000 })
    await registrarAccion({ agente: 'navegador', accion: 'nav:subir-archivo', descripcion: `${lista.length} archivo(s)`, recurso: p.url(), resultado: 'ok' })
    res.json({ ok: true, subidos: lista.length })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.post('/click', async (req, res) => {
  try {
    const { texto, selector, aprobado } = req.body || {}
    const etiqueta = String(texto || selector || '')
    if (SENSIBLE.test(etiqueta) && aprobado !== true) {
      await registrarAccion({ agente: 'navegador', accion: 'nav:bloqueado', descripcion: `Requiere aprobación: ${etiqueta}`, recurso: etiqueta, resultado: 'pendiente', requiere_aprobacion: true })
      return res.json({ requiere_aprobacion: true, accion: `Hacer click en "${etiqueta}"`, mensaje: 'Acción sensible: necesita aprobación humana (reenvía con aprobado:true).' })
    }
    const p = await pagina()
    if (selector) await p.click(selector, { timeout: 15000 })
    else await p.getByText(texto, { exact: false }).first().click({ timeout: 15000 })
    await registrarAccion({ agente: 'navegador', accion: 'nav:click', descripcion: etiqueta, recurso: p.url(), resultado: 'ok' })
    res.json({ ok: true, ...(await estado()) })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.post('/arrastrar', async (req, res) => {
  try {
    const { origen, destino, aprobado, pasos } = req.body || {}
    if (!origen || !destino) return res.status(400).json({ error: 'Faltan: origen y destino (selector CSS o texto)' })
    if (aprobado !== true) {
      await registrarAccion({ agente: 'navegador', accion: 'nav:bloqueado', descripcion: `Requiere aprobación: mover "${origen}" -> "${destino}"`, recurso: String(origen), resultado: 'pendiente', requiere_aprobacion: true })
      return res.json({ requiere_aprobacion: true, accion: `Mover "${origen}" a "${destino}"`, mensaje: 'Mover cambia estado de negocio: necesita aprobación humana (reenvía con aprobado:true).' })
    }
    const p = await pagina()
    const loc = (sel) => /^[.#\[]|[>\s]/.test(String(sel)) ? p.locator(String(sel)).first() : p.getByText(String(sel), { exact: false }).first()
    const src = loc(origen), dst = loc(destino)
    await src.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {})
    const a = await src.boundingBox(); const b = await dst.boundingBox()
    if (!a || !b) throw new Error('No se ubicó origen o destino en pantalla')
    const n = Math.max(5, Number(pasos) || 12)
    const cx = a.x + a.width / 2, cy = a.y + a.height / 2
    const tx = b.x + b.width / 2, ty = b.y + b.height / 2
    await p.mouse.move(cx, cy); await p.mouse.down()
    await p.mouse.move(cx + 5, cy + 5)
    for (let i = 1; i <= n; i++) { await p.mouse.move(cx + (tx - cx) * i / n, cy + (ty - cy) * i / n); await p.waitForTimeout(30) }
    await p.mouse.move(tx, ty); await p.waitForTimeout(120); await p.mouse.up()
    await registrarAccion({ agente: 'navegador', accion: 'nav:arrastrar', descripcion: `Mover ${origen} -> ${destino}`, recurso: p.url(), resultado: 'ok' })
    res.json({ ok: true, movido: { origen: String(origen), destino: String(destino) }, ...(await estado()) })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.get('/captura', async (_req, res) => {
  try {
    const p = await pagina()
    const buf = await p.screenshot({ type: 'png', fullPage: false })
    res.json({ ok: true, png_base64: buf.toString('base64'), url: p.url() })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Texto visible de la página (para que el agente "lea" lo que hay en pantalla).
// Opcional: ?espera_selector= hace waitForSelector antes de leer (útil en SPAs).
// v1.2: timeout aumentado a 45s, diagnóstico enriquecido si falla.
app.get('/leer', async (req, res) => {
  try {
    const p = await pagina()
    const espera = req.query?.espera_selector ? String(req.query.espera_selector) : ''
    if (espera) {
      try {
        await p.waitForSelector(espera, { timeout: 45000, state: 'visible' })
      } catch {
        const diag = await diagnosticarEspera(p, espera)
        return res.json({ ok: false, version: VERSION, ...diag })
      }
    }
    const txt = (await p.evaluate(() => document.body?.innerText || '')).slice(0, 8000)
    res.json({ ok: true, version: VERSION, url: p.url(), texto: txt })
  } catch (e) { res.status(500).json({ error: e.message, version: VERSION }) }
})

// ─── /esperar — MEJORADO v1.2 ─────────────────────────────────────────────────
// Espera a que la página termine de cargar datos (clave para SPAs como Aliace).
//   - aparece: selector CSS que debe existir/visible.
//   - desaparece: selector o texto (ej "Cargando") que debe IRSE.
//   - ms: timeout POR INTENTO (por defecto 45000). Total = ms × reintentos.
//   - reintentos: cuántas veces reintentar si falla (por defecto 3).
//   - Si no se pasa nada: espera networkidle.
// Por timeout devuelve { ok:false, tipo, motivo, diagnostico } con diagnóstico enriquecido.
app.post('/esperar', async (req, res) => {
  try {
    const { aparece, desaparece, ms, reintentos: retParam } = req.body || {}
    const timeout = Number(ms) > 0 ? Number(ms) : 45000
    const maxReintentos = Number(retParam) > 0 ? Number(retParam) : 3
    const p = await pagina()

    // Función que hace UN intento de espera
    async function intentarEspera() {
      if (aparece) {
        await p.waitForSelector(String(aparece), { timeout, state: 'visible' })
      }
      if (desaparece) {
        const sel = String(desaparece)
        const pareceSelector = /[.#\[\]>:]|^[a-z]+$/i.test(sel) && !/\s/.test(sel)
        if (pareceSelector) {
          await p.waitForSelector(sel, { timeout, state: 'hidden' })
        } else {
          await p.waitForFunction(
            (t) => !((document.body?.innerText || '').includes(t)),
            sel,
            { timeout }
          )
        }
      }
      if (!aparece && !desaparece) {
        await p.waitForLoadState('networkidle', { timeout })
      }
    }

    // Reintentos con espera progresiva entre intentos
    let ultimoError = null
    for (let intento = 1; intento <= maxReintentos; intento++) {
      // Antes de cada intento (excepto el primero), verificar sesión expirada
      if (intento > 1) {
        const sesion = await detectarSesionExpirada(p)
        if (sesion.expirada) {
          return res.json({
            ok: false,
            version: VERSION,
            tipo: 'sesion_expirada',
            motivo: `La sesión expiró durante la espera (redirigido a ${sesion.url}). Usa POST /login para volver a entrar.`,
            intento_fallido: intento
          })
        }
        // Espera progresiva entre reintentos: 2s, 4s, 6s…
        await p.waitForTimeout(2000 * (intento - 1))
      }

      try {
        await intentarEspera()
        return res.json({ ok: true, version: VERSION, intentos: intento })
      } catch (e) {
        ultimoError = e
        // Si no quedan más reintentos, salimos
        if (intento === maxReintentos) break
        // Pequeña pausa antes del siguiente intento (además de la espera progresiva)
        await p.waitForTimeout(1000).catch(() => {})
      }
    }

    // Agotamos reintentos — diagnosticar qué pasó realmente
    const diag = await diagnosticarEspera(p, aparece || null)
    return res.json({
      ok: false,
      version: VERSION,
      motivo: `timeout tras ${maxReintentos} intento(s) esperando: ${aparece || desaparece || 'networkidle'}`,
      diagnostico: diag,
      sugerencia: diag.tipo === 'sesion_expirada'
        ? 'Usa POST /login para renovar sesión y navega de nuevo.'
        : diag.tipo === 'ruta_incorrecta' || diag.tipo === 'selector_incorrecto'
          ? 'Verifica la URL y el selector. Puede que la estructura de la página haya cambiado.'
          : diag.tipo === 'datos_tardando'
            ? 'La SPA sigue cargando. Aumenta "ms" o "reintentos" en la próxima llamada.'
            : 'Aumenta "ms" (ej: 60000) o "reintentos" (ej: 5) en la próxima llamada.'
    })
  } catch (e) { res.status(400).json({ error: e.message, version: VERSION }) }
})

// ─── /tabla ───────────────────────────────────────────────────────────────────
async function extraerTabla(req, res) {
  try {
    const p = await pagina()
    const selector = req.body?.selector || req.query?.selector || ''
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

    if (!data) return res.json({ ok: false, motivo: 'no se encontró tabla', version: VERSION })
    res.json({ ok: true, version: VERSION, columnas: data.columnas, filas: data.filas, n_filas: data.n_filas, total_filas: data.total, truncado: data.truncado, url: p.url() })
  } catch (e) { res.status(500).json({ error: e.message, version: VERSION }) }
}
app.get('/tabla', extraerTabla)
app.post('/tabla', extraerTabla)

// ─── Credenciales y login ─────────────────────────────────────────────────────
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
    res.json({ ok: true, sitio })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.post('/login', async (req, res) => {
  try {
    const sitio = String(req.body?.sitio || '')
    if (!sitio) return res.status(400).json({ error: 'Falta el campo: sitio' })
    await ejecutarLogin(sitio)
    res.json({ ok: true, version: VERSION, ...(await estado()) })
  } catch (e) { res.status(e.code === 400 ? 400 : 400).json({ error: e.message, version: VERSION }) }
})

app.post('/aliace/login', async (_req, res) => {
  try {
    await ejecutarLogin('aliace')
    res.json({ ok: true, version: VERSION, ...(await estado()) })
  } catch (e) { res.status(400).json({ error: e.message, version: VERSION }) }
})

// ─── Arranque ─────────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => console.log(`[nexus-navegador] ${VERSION} escuchando en http://${HOST}:${PORT}  ·  visible: ${VISIBLE}`))

// DNS proactivo: forzar accept-dns=false al arrancar y cada 5 min.
repararDNS()
setInterval(repararDNS, 5 * 60 * 1000).unref()

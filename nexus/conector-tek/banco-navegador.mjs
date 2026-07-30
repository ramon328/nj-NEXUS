// banco-navegador.mjs — DAEMON: abre UNA sola ventana de Chrome persistente para UN usuario y
// la deja viva, con puerto de depuración (CDP). El corazón y las operaciones se CONECTAN a esa
// MISMA ventana (vía connectOverCDP) en vez de abrir un Chrome nuevo cada vez → mata el problema
// de "cientos de Chrome" que ahogaba la RAM del mini, y da un navegador consistente (menos huella
// de antifraude). Publica el endpoint en data/cdp-<user>.txt (su existencia = "conéctate acá").
//
// Uso:  TEK_USER=nico node banco-navegador.mjs      (LaunchAgent lo mantiene vivo)
import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
const { chromium } = patchright
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
const USER = (process.env.TEK_USER || 'ramon').toLowerCase()
const userSlug = (USER.replace(/[^a-z0-9]/g, '') || 'ramon')
// Puerto fijo por usuario (evita choques). Override con TEK_CDP_PORT.
const PORTS = { ramon: 9410, nico: 9411, joaquin: 9412 }
const PORT = Number(process.env.TEK_CDP_PORT || PORTS[userSlug] || (9410 + (userSlug.charCodeAt(0) % 80)))
const PROFILE = join(DIR, userSlug === 'ramon' ? 'chrome-profile' : 'chrome-profile-' + userSlug)
const CDPFILE = join(DATA, `cdp-${userSlug}.txt`)
const headless = process.env.TEK_HEADLESS !== '0'
// PROXY (opcional): si TEK_PROXY_URL está seteado, la ventana persistente sale por ese proxy
// (ej. un túnel SOCKS a una IP residencial/móvil limpia). Así TODO el tráfico al banco —
// login, corazón y operaciones que reusan esta ventana por CDP — usa la MISMA IP limpia,
// evitando que el banco vea un cambio de IP a mitad de sesión. Auth de proxy opcional.
const proxy = process.env.TEK_PROXY_URL
  ? { server: process.env.TEK_PROXY_URL, ...(process.env.TEK_PROXY_USER ? { username: process.env.TEK_PROXY_USER, password: process.env.TEK_PROXY_PASS } : {}) }
  : undefined
const log = (...a) => console.log(new Date().toISOString(), `[nav ${USER}]`, ...a)

mkdirSync(DATA, { recursive: true })

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless, channel: 'chrome',
  ...(proxy ? { proxy } : {}),
  args: [`--remote-debugging-port=${PORT}`],
  viewport: { width: 1360, height: 860 }, locale: 'es-CL', timezoneId: 'America/Santiago',
  acceptDownloads: true,
})
if (proxy) log(`proxy ON → ${proxy.server}`)
if (!ctx.pages().length) await ctx.newPage()
writeFileSync(CDPFILE, `http://127.0.0.1:${PORT}`)
log(`ventana persistente abierta (CDP :${PORT}) → publicado ${CDPFILE}`)

const limpiar = async (motivo) => {
  log('cerrando (' + motivo + ')…')
  try { unlinkSync(CDPFILE) } catch {}
  try { await ctx.close() } catch {}
  process.exit(0)
}
process.on('SIGTERM', () => limpiar('SIGTERM'))
process.on('SIGINT', () => limpiar('SIGINT'))
// Si Chrome se cierra por fuera, retiramos el endpoint para que login-humano abra el suyo (fallback).
ctx.on('close', () => { try { unlinkSync(CDPFILE) } catch {}; log('Chrome cerrado por fuera → salgo'); process.exit(0) })

// mantener vivo
setInterval(() => {}, 1 << 30)
log('daemon vivo, esperando conexiones…')

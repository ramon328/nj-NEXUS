// corazon.mjs — EL CORAZÓN: daemon PERSISTENTE (LaunchAgent KeepAlive=true), ÚNICO guardián
// de las sesiones de banco. Las mantiene vivas con un latido interno frecuente y confiable.
//
// LECCIÓN APRENDIDA (24-jul): un SOLO latido mantiene la sesión viva sin problemas (probado
// 23 min seguidos). Lo que la MATA es tener DOS guardianes tocándola a la vez (se pisan) o un
// hueco largo entre toques. Por eso: (1) este daemon es el ÚNICO que late (reemplaza al cron),
// instancia única vía launchd KeepAlive; (2) cadencia interna fija con reintento; (3) NO abre
// el banco para sesiones que ya sabemos muertas (evita churn); (4) coordina con las
// operaciones por el MISMO candado (nunca dos navegadores sobre el mismo perfil).
//
// Reglas de oro: el latido NUNCA loguea (solo reusa+navega). Reestablecer una sesión muerta
// (1 login) se hace SOLO en la ventana fría de la mañana, con cooldown de 3 h → no machaca.
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
const NODE = '/usr/local/bin/node'
// CADENCIA (revisada 27-jul con 3 días de datos). Latíamos cada 60 s: 486 aperturas del
// navegador contra Santander en un día, la mayoría sobre sesiones ya muertas. Un humano no
// toca el portal cada minuto durante 90 minutos seguidos, y golpear la pantalla de login
// una y otra vez desde la misma máquina es justo la firma que busca un antifraude.
// Además medimos que la sesión muere a los ~90 min pase lo que pase, así que latir seguido
// no la alarga: solo agrega huella. Ahora latimos como alguien que revisa su banco.
// Intervalo del latido: AL AZAR y uniforme dentro de un rango [MIN, MAX] cada vez (más
// humano que un intervalo fijo: nunca late en un tiempo exacto). Por defecto 1–3 min:
// el techo de 3 min queda cómodo bajo el umbral de Santander (mata la sesión ociosa a
// los ~5-7 min) y el azar dentro del rango no deja un patrón regular que delate un bot.
const POKE_MIN_MS = Number(process.env.TEK_CORAZON_POKE_MIN_MS || 60_000)           // piso: 1 min
const POKE_MAX_MS = Number(process.env.TEK_CORAZON_POKE_MAX_MS || 180_000)          // techo: 3 min
const POKE_MS = Number(process.env.TEK_CORAZON_POKE_MS || POKE_MAX_MS)              // fallback (1er latido / compat)
function proximoLatido() { return Math.round(POKE_MIN_MS + Math.random() * (POKE_MAX_MS - POKE_MIN_MS)) }
const TICK_MS = 20_000                                                              // revisar quién toca latir
const DEAD_BACKOFF_MS = 15 * 60_000                                                 // 1ª espera tras encontrarla muerta
const DEAD_BACKOFF_MAX = 3 * 3600_000                                               // la espera se duplica hasta 3 h
const VIDA_MAX_MS = 95 * 60_000                                                     // nunca vimos una sesión pasar de 91 min
const TOPE_DIA = Number(process.env.TEK_CORAZON_TOPE_DIA || 90)                     // aperturas de navegador por usuario/día
const RELOGIN_COOLDOWN = Number(process.env.TEK_CORAZON_RELOGIN_MS || 3 * 3600_000) // reintento de login: máx 1 cada 3 h
const AUTO_RELOGIN = process.env.TEK_CORAZON_RELOGIN !== '0'                        // self-heal ON por defecto
function ventanaFria() { const h = new Date().getHours(); return h >= 5 && h < 10 } // reestablecer solo de madrugada
// Fuera de horario hábil no late: la sesión se cae igual de noche y el tráfico nocturno
// desde una cuenta de empresa es anómalo. Si alguien pide data de madrugada, el login
// bajo demanda de la API sigue funcionando.
function horarioHabil() { const d = new Date(); const h = d.getHours(); return d.getDay() >= 1 && d.getDay() <= 6 && h >= 7 && h < 22 }

const log = (...a) => console.log(new Date().toISOString(), ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const lastPoke = {}     // user → ts del último toque
const pokeDue = {}      // user → cada cuánto toca el PRÓXIMO latido (con jitter, no exacto)
const deadUntil = {}    // user → ts hasta el cual NO tocamos (sesión muerta conocida)
const deadSeguidas = {} // user → veces seguidas que la encontramos muerta (para espaciar)
const lastLogin = {}    // user → ts del último intento de RE-LOGIN
const vivaDesde = {}    // user → ts en que la vimos viva por primera vez este ciclo
const gasto = {}        // user → { dia, n } aperturas de navegador de hoy
const deadMtime = {}    // user → mtime del archivo de sesión cuando la dimos por muerta

// Ruta y mtime del archivo de sesión de cada usuario. El latido NUNCA escribe ese archivo
// mientras está en back-off (ni siquiera lo toca), así que si el mtime CRECE durante el
// back-off fue una OPERACIÓN externa (transferencia/lectura) que reactivó la sesión →
// señal limpia de "sesión activada afuera" para que el corazón la retome.
function sesionFile(user) { return join(DIR, user === 'ramon' ? 'session.json' : `session-${user}.json`) }
function sesionMtime(user) { try { return statSync(sesionFile(user)).mtimeMs } catch { return 0 } }

function presupuesto(user) {
  const hoy = new Date().toDateString()
  const g = gasto[user]
  if (!g || g.dia !== hoy) { gasto[user] = { dia: hoy, n: 0 }; return true }
  return g.n < TOPE_DIA
}

function usuarios() {
  const out = []
  if (existsSync(join(DIR, 'session.json'))) out.push('ramon')
  try { for (const f of readdirSync(DIR)) { const m = f.match(/^session-(.+)\.json$/); if (m) out.push(m[1]) } } catch { /* */ }
  // Saltar usuarios PAUSADOS (.keepalive-off-<user>): no los latimos ni les abrimos ventana.
  // Antes el corazón latía a los 3 (ramon/nico/joaquin) → 3 ventanas; nico y joaquin están off.
  return [...new Set(out)].filter((u) => {
    const slug = String(u).toLowerCase().replace(/[^a-z0-9]/g, '') || 'ramon'
    return !existsSync(join(DATA, '.keepalive-off-' + slug))
  })
}

// login-humano para un usuario. keepaliveOnly=true → solo toque (NUNCA loguea).
function correr(user, keepaliveOnly) {
  return new Promise((resolve) => {
    const env = { ...process.env, TEK_USER: user, TEK_LOCK_WAIT_MS: '8000' }
    // El LATIDO corre INVISIBLE (headless): reusa la sesión (no loguea), así no abre ventanas en
    // el mini. El login de verdad (keepaliveOnly=false) sigue HEADFUL (mejor para BioCatch y para
    // que se vea). Ver [[tek-corazon-cadencia]]. TEK_HEADLESS solo acá, no en operaciones/login.
    if (keepaliveOnly) { env.TEK_KEEPALIVE = '1'; env.TEK_HEADLESS = '1' }
    const h = spawn(NODE, [join(DIR, 'login-humano.mjs')], { cwd: DIR, env })
    let out = ''
    h.stdout.on('data', (d) => { out += d }); h.stderr.on('data', (d) => { out += d })
    const kill = setTimeout(() => { try { h.kill('SIGKILL') } catch { /* */ } }, 320_000)
    h.on('exit', () => {
      clearTimeout(kill)
      const m = out.match(/RESULTADO:\s*(\{.*\})\s*$/m); let r = {}; try { r = m ? JSON.parse(m[1]) : {} } catch { /* */ }
      resolve(r.estado || 'desconocido')
    })
  })
}

// La espera tras encontrarla muerta se duplica cada vez (15m → 30m → 1h → 2h → 3h). Antes
// era fija en 10 min, así que una sesión caída se golpeaba ~100 veces al día contra la
// pantalla de login sin ninguna posibilidad de revivir (el latido no loguea).
function dormirMuerta(user, now) {
  const n = (deadSeguidas[user] = (deadSeguidas[user] || 0) + 1)
  const espera = Math.min(DEAD_BACKOFF_MS * 2 ** (n - 1), DEAD_BACKOFF_MAX)
  deadUntil[user] = now + espera
  deadMtime[user] = sesionMtime(user)   // línea base: para detectar si una operación la reescribe
  delete vivaDesde[user]
  return Math.round(espera / 60000)
}

async function atender(user) {
  const now = Date.now()
  // ¿sesión muerta conocida? No la tocamos (evita churn). Solo reestablecer en ventana fría.
  if (deadUntil[user] && now < deadUntil[user]) {
    // ⚡ ¿Una OPERACIÓN (transferencia/lectura) reactivó la sesión mientras la creíamos muerta?
    // El archivo de sesión se reescribió (el latido NO escribe en back-off) → reenganchar YA y
    // volver a mantenerla viva. Esto es "sesión se activa → corazón se activa".
    if (deadMtime[user] && sesionMtime(user) > deadMtime[user] + 1500) {
      delete deadUntil[user]; delete deadMtime[user]; deadSeguidas[user] = 0; vivaDesde[user] = now
      log(`[${user}] ⚡ reactivada por una operación → retomo el latido para mantenerla viva`)
      // cae al flujo normal de latido (abajo) para empezar a mantenerla caliente
    } else {
      if (AUTO_RELOGIN && ventanaFria() && now - (lastLogin[user] || 0) > RELOGIN_COOLDOWN) {
        lastLogin[user] = now
        log(`[${user}] muerta → reestablezco (ventana fría, 1 login)…`)
        const est2 = await correr(user, false)
        if (est2 === 'logueado') { delete deadUntil[user]; delete deadMtime[user]; deadSeguidas[user] = 0; vivaDesde[user] = now; log(`[${user}] ✓ REESTABLECIDA`) }
        else { const m = dormirMuerta(user, now); log(`[${user}] reestablecer → ${est2} (espero ${m} min)`) }
      }
      return
    }
  }
  // Una sesión que ya pasó su vida útil se va a caer igual; seguir tocándola solo suma
  // huella. La dejamos ir y esperamos a que alguien pida data (login bajo demanda).
  if (vivaDesde[user] && now - vivaDesde[user] > VIDA_MAX_MS) {
    const m = dormirMuerta(user, now)
    return log(`[${user}] · cumplió su vida útil (~${Math.round(VIDA_MAX_MS / 60000)} min) → la dejo ir, no la toco por ${m} min`)
  }
  if (!presupuesto(user)) return
  gasto[user].n++
  // toque normal (jamás loguea)
  const est = await correr(user, true)
  if (est === 'keepalive_ok') { deadSeguidas[user] = 0; if (!vivaDesde[user]) vivaDesde[user] = now; log(`[${user}] ✓ viva`) }
  else if (est === 'ocupado') {
    // Hay una transferencia/operación con el candado: NO abrir otro Chrome (rompería la sesión).
    // Marcamos viva y pedimos el próximo latido pronto (~1 min) para retomarla cuando suelte.
    if (!vivaDesde[user]) vivaDesde[user] = now
    pokeDue[user] = Math.round(60_000 * (0.7 + Math.random() * 0.6))   // 42–78 s
    log(`[${user}] · en uso por una operación (sigue caliente), ok — retomo en ~${Math.round(pokeDue[user] / 1000)}s`)
  }
  else if (est === 'keepalive_omitido') log(`[${user}] · omitido`)
  else if (est === 'sesion_muerta') { const m = dormirMuerta(user, now); log(`[${user}] ✗ muerta → no la toco por ${m} min (reestablezco en ventana fría)`) }
  else { const m = dormirMuerta(user, now); log(`[${user}] · ${est} → back-off ${m} min`) }
}

log(`❤️  corazón (ÚNICO guardián) encendido. poke=al azar ${Math.round(POKE_MIN_MS / 60000)}–${Math.round(POKE_MAX_MS / 60000)} min, hábil=07-22 L-S, tope=${TOPE_DIA}/día, self-heal=${AUTO_RELOGIN} (solo ventana fría 05-10h)`)
// Persistir el estado de cada sesión a un archivo que la API pueda servir (control para los
// usuarios: viva/muerta + hace cuánto está viva + tope de vida). Se llama en cada tick.
function escribirEstado() {
  const now = Date.now()
  const out = {}
  const users = new Set([...usuarios(), ...Object.keys(vivaDesde), ...Object.keys(deadUntil)])
  for (const u of users) {
    const viva = !!vivaDesde[u]
    out[u] = {
      viva,
      estado: viva ? 'viva' : 'muerta',
      desde: viva ? new Date(vivaDesde[u]).toISOString() : null,
      viva_seg: viva ? Math.round((now - vivaDesde[u]) / 1000) : 0,
      viva_min: viva ? Math.round((now - vivaDesde[u]) / 60000) : 0,
      ultimo_latido: lastPoke[u] ? new Date(lastPoke[u]).toISOString() : null,
      // cuánto le queda antes del tope de vida (~95 min) si está viva
      restante_min: viva ? Math.max(0, Math.round((VIDA_MAX_MS - (now - vivaDesde[u])) / 60000)) : 0,
      vida_max_min: Math.round(VIDA_MAX_MS / 60000),
      muerta_hasta: deadUntil[u] ? new Date(deadUntil[u]).toISOString() : null,
    }
  }
  try { writeFileSync(join(DATA, 'sesiones.json'), JSON.stringify({ actualizado: new Date(now).toISOString(), sesiones: out }, null, 2)) } catch { /* */ }
}

let avisoNocturno = false
for (;;) {
  if (!horarioHabil()) {
    if (!avisoNocturno) { log('· fuera de horario hábil: no late nadie (el login bajo demanda sigue activo)'); avisoNocturno = true }
    escribirEstado()
    await sleep(TICK_MS)
    continue
  }
  avisoNocturno = false
  for (const user of usuarios()) {
    if (Date.now() - (lastPoke[user] || 0) >= (pokeDue[user] || POKE_MS)) {
      lastPoke[user] = Date.now()
      // Próximo latido AL AZAR dentro de [MIN, MAX] → nunca un intervalo EXACTO (patrón de bot).
      pokeDue[user] = proximoLatido()
      try { await atender(user) } catch (e) { log(`[${user}] error:`, e.message) }
    }
  }
  escribirEstado()
  await sleep(TICK_MS)
}

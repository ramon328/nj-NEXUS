// clave-nueva.mjs — Cuando alguien CAMBIA la clave de su banco, la que tenemos guardada
// queda vieja y todo lo automático empieza a fallar (y peor: reintentar con la clave mala
// arriesga bloquear la cuenta en Santander). Este módulo cierra ese hoyo:
//
//   1) `pedirClaveNueva(userId)` le manda por WhatsApp a esa persona un LINK PÚBLICO PERO
//      PROTEGIDO (código de 6 dígitos, atado a su usuario, vence a los 30 min y se quema
//      apenas guarda) para que escriba su clave nueva en una página, NO por chat.
//   2) La página (`/banco/clave`, en conectar-web.mjs) guarda la clave CIFRADA en la bóveda,
//      sobre las empresas que esa persona ya tenía vinculadas. NO entra al banco: no gasta
//      intentos ni despierta al antifraude. La clave nueva se usa en la SIGUIENTE operación.
//   3) `login-humano.mjs` llama acá solo cuando el banco dice "clave incorrecta"
//      (estado error_credenciales) → el aviso sale automático, sin que nadie se entere tarde.
//
// Throttle: un aviso por persona cada 45 min (data/.clave-pedida-<user>.json). Si la persona
// ignora el link, NO se le insiste en loop.
//
// CLI:
//   node clave-nueva.mjs nico                  → le manda el link a Nico
//   node clave-nueva.mjs nico --dry            → arma todo pero NO envía (muestra el link)
//   node clave-nueva.mjs nico --forzar         → salta el throttle
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generar } from './vincular-codes.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
try { process.loadEnvFile(join(DIR, '..', '.env')) } catch { /* opcional */ }

const BASE_URL = (process.env.TEK_PUBLIC_URL || 'https://mac-mini-de-nicolas.tailee0068.ts.net').replace(/\/+$/, '')
const RUTA = process.env.TEK_CONECTAR_RUTA || '/banco'
const THROTTLE_MS = Number(process.env.TEK_CLAVE_THROTTLE_MS || 45 * 60_000)

// userId de tek → número de WhatsApp. Los tres que operan banco hoy; si aparece otro,
// se completa desde usuarios.json (clave = número, valor.nombre).
const NUMEROS = { ramon: '+56932945240', nico: '+56975481858', joaquin: '+56958589915' }

export function numeroDe(userId) {
  const u = String(userId || '').toLowerCase().trim()
  if (NUMEROS[u]) return NUMEROS[u]
  try {
    const j = JSON.parse(readFileSync(join(DIR, '..', 'usuarios.json'), 'utf8'))
    for (const [numero, info] of Object.entries(j || {})) {
      if (String(info?.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === u) return numero
    }
  } catch { /* sin registro extra */ }
  return null
}

const pedidoPath = (u) => join(DATA, `.clave-pedida-${u}.json`)
function ultimoPedido(u) { try { return JSON.parse(readFileSync(pedidoPath(u), 'utf8')).ts || 0 } catch { return 0 } }
function marcarPedido(u, extra = {}) {
  try { mkdirSync(DATA, { recursive: true }); writeFileSync(pedidoPath(u), JSON.stringify({ ts: Date.now(), ...extra }), { mode: 0o600 }) } catch { /* */ }
}

/** Arma el link protegido (código nuevo atado al usuario). No envía nada. */
export function linkClave(userId) {
  const code = generar(userId)
  return { code, url: `${BASE_URL}${RUTA}/clave?pin=${code}` }
}

/**
 * Le pide a `userId` su clave nueva por WhatsApp, con link protegido.
 * opts: { motivo, dry, forzar }. Devuelve { ok, enviado, code, url, motivo? }.
 */
export async function pedirClaveNueva(userId, opts = {}) {
  const u = String(userId || '').toLowerCase().trim()
  if (!u) return { ok: false, error: 'sin userId' }
  const numero = numeroDe(u)
  if (!numero) return { ok: false, error: `no sé el WhatsApp de "${u}"` }

  const desde = Date.now() - ultimoPedido(u)
  if (!opts.forzar && desde < THROTTLE_MS) {
    return { ok: false, throttle: true, error: `ya se le pidió hace ${Math.round(desde / 60000)} min` }
  }

  const { code, url } = linkClave(u)
  const nombre = u.charAt(0).toUpperCase() + u.slice(1)
  const porque = opts.motivo === 'error_credenciales'
    ? 'El banco me rechazó la clave que tengo guardada — parece que la cambiaste.'
    : 'Necesito tu clave del banco al día.'
  const texto = `🔐 ${nombre}, ${porque}\n\n`
    + `Escríbela acá, en la página segura (NO por WhatsApp):\n\n`
    + `🔗 ${url}\n\nCódigo: *${code}* (vence en 30 min)\n\n`
    + `Entra, pon el código y escribe tu clave nueva. Queda cifrada y solo se usa para entrar al banco. `
    + `No entro al banco al guardarla: la uso en la próxima operación que me pidas.`

  if (opts.dry) { marcarPedido(u, { dry: true }); return { ok: true, enviado: false, code, url, texto } }

  const { enviarKapso } = await import('../hub/kapso.mjs')
  try {
    await enviarKapso(numero, texto)
    marcarPedido(u, { via: 'texto' })
    return { ok: true, enviado: true, code, url }
  } catch (e) {
    // Fuera de la ventana de 24h WhatsApp solo deja plantilla → caemos a la alerta de Nexus.
    try {
      const { alertarUsuario } = await import('../hub/alertar.mjs')
      await alertarUsuario(numero, `Necesito tu clave nueva del banco. Entra a ${url} y pon el código ${code} (30 min).`, nombre)
      marcarPedido(u, { via: 'plantilla' })
      return { ok: true, enviado: true, code, url, via: 'plantilla' }
    } catch (e2) {
      return { ok: false, error: `${e.message} / ${e2.message}`, code, url }
    }
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const user = args.find((a) => !a.startsWith('--'))
  if (!user) { console.log('uso: node clave-nueva.mjs <userId> [--dry] [--forzar]'); process.exit(1) }
  const r = await pedirClaveNueva(user, { dry: args.includes('--dry'), forzar: args.includes('--forzar') })
  console.log(JSON.stringify({ ...r, texto: undefined }, null, 2))
  if (r.texto) console.log('\n--- mensaje ---\n' + r.texto)
}

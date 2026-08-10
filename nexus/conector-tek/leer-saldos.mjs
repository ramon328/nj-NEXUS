// leer-saldos.mjs — Orquestador: entra UNA vez al banco con las credenciales de un
// usuario (de la bóveda cifrada) y lee el saldo de TODAS sus empresas conectadas,
// recorriendo el selector de empresas. NO pisa la sesión/datos de ANA CLARA (perfil
// clonado aislado, logout-first). SOLO LECTURA.
//
// Uso:  node leer-saldos.mjs --user nico [--empresas "ACE SPA,FOOD EXPERT SPA"]
//
// Devuelve por stdout un JSON con { user, rut, empresas:[{empresa, conecta, cuentas, total_clp}] }.
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cred from './credenciales.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const NODE = '/usr/local/bin/node'
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d }

const userId = (arg('user', 'nico') || 'nico').toLowerCase()
const conns = cred.listar(userId)
if (!conns.length) { console.log(JSON.stringify({ ok: false, error: `El usuario "${userId}" no tiene bancos conectados en Nexus.` })); process.exit(0) }

// empresas objetivo: las del argumento, o TODAS las conectadas del usuario (dedup por nombre)
let objetivos = arg('empresas') ? arg('empresas').split(',').map((s) => s.trim()).filter(Boolean)
  : [...new Set(conns.map((c) => c.empresa))]

const c0 = cred.obtener(userId, objetivos[0])
if (!c0.ok) { console.log(JSON.stringify({ ok: false, error: c0.error })); process.exit(0) }

// Usa la SESIÓN PERSISTENTE del usuario (perfil chrome-profile-<user> + session-<user>.json):
// si el latido la tiene viva, REUSA sin login; solo loguea si está muerta. Las creds salen
// de la bóveda (TEK_USER), no las pasamos por ENV.
const env = {
  ...process.env,
  TEK_LEER_SALDOS: '1',
  TEK_USER: userId,
  TEK_EMPRESAS_JSON: JSON.stringify(objetivos),
}

console.error(`[leer-saldos] user=${userId} rut=${c0.rut} empresas=${objetivos.length} → entrando al banco (un login)…`)

const h = spawn(NODE, [join(DIR, 'login-humano.mjs')], { cwd: DIR, env })
let out = ''
h.stdout.on('data', (d) => { out += d; process.stderr.write(d) })
h.stderr.on('data', (d) => { process.stderr.write(d) })
h.on('exit', () => {
  const m = out.match(/RESULTADO:\s*(\{[\s\S]*\})\s*$/m)
  let r = {}; try { r = m ? JSON.parse(m[1]) : {} } catch { /* */ }
  const lect = r.lectura || null
  // Persistir cada empresa leída como caché (data/emp-<slug>.json) → el banco tool sirve
  // saldos de cualquier empresa al instante. Así toda lectura (on-demand o de la mañana)
  // deja los datos frescos. ANA CLARA también se cachea acá (antes se saltaba y quedaba con
  // el dato viejo de la tek-api → saldos mezclados/desactualizados; ahora TODAS uniformes).
  try {
    const slug = (e) => String(e).toLowerCase().replace(/[^a-z0-9]/g, '')
    const now = Date.now()
    // ⛔ GUARDIA DE IDENTIDAD (09-08-2026). Si el cambio de empresa NO prendió, el lector
    // vuelve a leer la empresa ANTERIOR y el saldo se guarda bajo el nombre equivocado.
    // Pasó de verdad: IMPORTADORA JURI quedó con la cuenta 000072856279 (de IMPORTACIONES
    // MINERAS) y $10.221.633 en vez de $451.293. Un saldo FALSO es peor que ninguno.
    // Contraste: la cuenta corriente leída tiene que ser la que cuentas-origen.json dice
    // para esa empresa. Si no calza, NO se escribe y queda el dato anterior.
    let origenes = {}
    try { origenes = JSON.parse(readFileSync(join(DIR, 'data', 'cuentas-origen.json'), 'utf8')) } catch { /* sin tabla → no se valida */ }
    const soloDig = (x) => String(x || '').replace(/\D/g, '')
    for (const e of (lect?.empresas || [])) {
      if (!e.conecta) continue
      const esperada = soloDig(origenes[e.empresa])
      if (esperada) {
        const leidas = (e.cuentas || []).map((c) => soloDig(c.numero))
        if (leidas.length && !leidas.includes(esperada)) {
          console.error(`[leer-saldos] ⛔ ${e.empresa}: la cuenta leída (${leidas.join(',')}) NO es la suya (${esperada}) — el cambio de empresa no prendió. NO guardo para no dejar un saldo falso.`)
          continue
        }
      }
      const out = { empresa: e.empresa, cuentas: e.cuentas || [], total_clp: e.total_clp || 0, _ts: now, _fuente: 'vivo' }
      try { writeFileSync(join(DIR, 'data', 'emp-' + slug(e.empresa) + '.json'), JSON.stringify(out, null, 2)) } catch { /* */ }
      // movimientos por empresa (si se leyeron con TEK_LEER_MOVS)
      if (Array.isArray(e.movimientos)) {
        const mout = { empresa: e.empresa, movimientos: e.movimientos, total: e.movimientos.length, _ts: now, _fuente: 'vivo' }
        try { writeFileSync(join(DIR, 'data', 'emp-' + slug(e.empresa) + '-movs.json'), JSON.stringify(mout, null, 2)) } catch { /* */ }
      }
    }
  } catch { /* */ }
  const salida = {
    ok: !!lect,
    user: userId, rut: c0.rut, estado_login: r.estado || 'desconocido',
    nota: r.nota || null,
    conectan: lect?.conectan ?? 0, total: lect?.total ?? objetivos.length,
    empresas: lect?.empresas || [],
  }
  console.log(JSON.stringify(salida, null, 2))
})

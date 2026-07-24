// leer-saldos.mjs — Orquestador: entra UNA vez al banco con las credenciales de un
// usuario (de la bóveda cifrada) y lee el saldo de TODAS sus empresas conectadas,
// recorriendo el selector de empresas. NO pisa la sesión/datos de ANA CLARA (perfil
// clonado aislado, logout-first). SOLO LECTURA.
//
// Uso:  node leer-saldos.mjs --user nico [--empresas "ACE SPA,FOOD EXPERT SPA"]
//
// Devuelve por stdout un JSON con { user, rut, empresas:[{empresa, conecta, cuentas, total_clp}] }.
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
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
  const salida = {
    ok: !!lect,
    user: userId, rut: c0.rut, estado_login: r.estado || 'desconocido',
    nota: r.nota || null,
    conectan: lect?.conectan ?? 0, total: lect?.total ?? objetivos.length,
    empresas: lect?.empresas || [],
  }
  console.log(JSON.stringify(salida, null, 2))
})

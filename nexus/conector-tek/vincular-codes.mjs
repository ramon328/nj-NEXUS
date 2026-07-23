// vincular-codes.mjs — Códigos de un solo uso para el widget de conectar banco. Nexus genera
// un código NUEVO cada vez que manda el link (vincular_banco); el widget (conectar-web) lo
// valida en /auth. Así no se comparte un PIN fijo. Los códigos vencen a los 30 min.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const DIR = dirname(fileURLToPath(import.meta.url))
const FILE = join(DIR, 'data', 'vincular-codes.json')
const TTL = 30 * 60 * 1000   // 30 minutos

function load() { try { return JSON.parse(readFileSync(FILE, 'utf8')) } catch { return [] } }
function save(a) { try { mkdirSync(join(DIR, 'data'), { recursive: true }); writeFileSync(FILE, JSON.stringify(a)) } catch { /* */ } }

/** Genera un código NUEVO de 6 dígitos, lo guarda (con vencimiento) y lo devuelve. */
export function generar() {
  const code = String(crypto.randomInt(100000, 999999))
  const a = load().filter((x) => x.exp > Date.now())   // limpia los vencidos
  a.push({ code, exp: Date.now() + TTL })
  save(a.slice(-50))                                     // tope: últimos 50
  return code
}

/** ¿El código es válido (existe y no venció)? */
export function validar(code) {
  const c = String(code || '').trim()
  if (!c) return false
  const vivos = load().filter((x) => x.exp > Date.now())
  save(vivos)                                            // purga vencidos de paso
  return vivos.some((x) => x.code === c)
}

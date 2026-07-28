// saldos-a-cerebro.mjs — vuelca el ÚLTIMO saldo conocido de cada empresa (los cachés
// emp-<slug>.json + saldos.json de ANA CLARA) a una nota del segundo cerebro (Obsidian).
// SOLO lee cachés locales y escribe la nota — NUNCA abre el banco. Lo llama el refresco
// diario (y se puede correr a mano). Así "pregunta el saldo → si la sesión no está viva,
// sale el último dato guardado" queda también visible en el vault.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import * as cred from './credenciales.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
const VAULT = process.env.CEREBRO_RUTA || join(homedir(), 'nexus', 'cerebro')
const NOTA = join(VAULT, '20 — Empresas', 'Saldos bancarios.md')

const fmt = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL')
const leer = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return null } }

// ¿Qué sesiones (usuarios) tienen conectada esta empresa? (para "de qué sesión se tomó")
function sesionesDe(empresa) {
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()
  const out = []
  for (const u of cred.usuarios()) {
    if ((cred.listar(u) || []).some((c) => norm(c.empresa) === norm(empresa))) out.push(u)
  }
  return out
}

export function escribir() {
  const empresas = []
  // ANA CLARA (cache de la tek-api)
  const ana = leer(join(DATA, 'saldos.json'))
  if (ana && Array.isArray(ana.cuentas)) {
    const total = ana.cuentas.filter((c) => (c.moneda || 'CLP') === 'CLP').reduce((s, c) => s + Number(c.saldo || c.disponible || 0), 0)
    empresas.push({ empresa: ana.empresa || 'ANA CLARA SPA', total, cuentas: ana.cuentas.map((c) => ({ numero: c.numero, tipo: c.tipo, saldo: c.saldo ?? c.disponible })), ts: ana.actualizado ? Date.parse(ana.actualizado) : 0 })
  }
  // Resto de empresas (emp-<slug>.json, sin -movs)
  for (const f of readdirSync(DATA)) {
    const m = f.match(/^emp-(.+)\.json$/)
    if (!m || f.endsWith('-movs.json')) continue
    const j = leer(join(DATA, f)); if (!j || !j.empresa) continue
    if (empresas.some((e) => e.empresa.toLowerCase() === String(j.empresa).toLowerCase())) continue
    empresas.push({ empresa: j.empresa, total: j.total_clp || 0, cuentas: (j.cuentas || []).map((c) => ({ numero: c.numero, tipo: c.tipo, saldo: c.saldo })), ts: j._ts || 0 })
  }
  empresas.sort((a, b) => (b.total || 0) - (a.total || 0))

  const granTotal = empresas.reduce((s, e) => s + Number(e.total || 0), 0)
  const hoy = new Date().toISOString()
  const L = ['---', 'tipo: saldos-bancarios', `actualizado: ${hoy}`, 'agente: Leo (banco)', '---', '',
    '# 💰 Saldos bancarios', '',
    `**Total disponible (todas): ${fmt(granTotal)}**`, '',
    '> Último saldo conocido de cada empresa conectada. Se refresca en la mañana y cada vez que se consulta el banco en vivo. Si la sesión está dormida, este es el dato que se muestra.', '']
  for (const e of empresas) {
    const ses = sesionesDe(e.empresa)
    const cuando = e.ts ? new Date(e.ts).toLocaleString('es-CL') : '—'
    L.push(`## ${e.empresa} — ${fmt(e.total)}`)
    for (const c of e.cuentas) L.push(`- ${c.tipo || 'Cuenta'} ${c.numero || ''}: ${fmt(c.saldo)}`)
    L.push(`- _sesión(es):_ ${ses.join(', ') || '—'} · _actualizado:_ ${cuando}`)
    L.push('')
  }

  if (!existsSync(dirname(NOTA))) mkdirSync(dirname(NOTA), { recursive: true })
  writeFileSync(NOTA, L.join('\n'))
  return { ok: true, empresas: empresas.length, total: granTotal, nota: NOTA }
}

if (process.argv[1] && process.argv[1].endsWith('saldos-a-cerebro.mjs')) {
  console.log(JSON.stringify(escribir()))
}

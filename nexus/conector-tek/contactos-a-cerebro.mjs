// contactos-a-cerebro.mjs — toma el último scrape de destinatarios (data/scrape-destinatarios.json),
// lo MERGE en un almacén persistente por empresa (data/destinatarios-banco.json, keyed empresa+rut,
// así soporta scrapes parciales/por-empresa acumulables) y escribe la "lista de personas" del 2º
// cerebro. SOLO lee/escribe archivos locales — NO abre el banco.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
const STORE = join(DATA, 'destinatarios-banco.json')
const VAULT = process.env.CEREBRO_RUTA || join(homedir(), 'nexus', 'cerebro')
const NOTA = join(VAULT, '20 — Empresas', 'Contactos del banco (lista de personas).md')
const leer = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return null } }

// 1) MERGE el scrape nuevo al almacén (por empresa → por RUT).
export function merge(scrapePath = join(DATA, 'scrape-destinatarios.json')) {
  const s = leer(scrapePath)
  const store = leer(STORE) || { empresas: {} }
  if (s && s.empresa && Array.isArray(s.contactos)) {
    const emp = s.empresa
    store.empresas[emp] = store.empresas[emp] || { por_rut: {} }
    for (const c of s.contactos) { if (c.rut) store.empresas[emp].por_rut[c.rut] = { rut: c.rut, nombre: c.nombre, cuenta: c.cuenta, banco: c.banco, email: c.email } }
    store.empresas[emp].actualizado = new Date().toISOString()
    writeFileSync(STORE, JSON.stringify(store, null, 2))
  }
  return store
}

// 2) Escribe la nota del 2º cerebro con todos los contactos por empresa (de qué sesión = empresa).
export function escribir() {
  const store = leer(STORE) || { empresas: {} }
  const L = ['---', 'tipo: contactos-banco', `actualizado: ${new Date().toISOString()}`, 'agente: Leo (banco)', '---', '',
    '# 👥 Contactos del banco (lista de personas)', '',
    '> Destinatarios INSCRITOS en Santander por empresa (de dónde se puede transferir a cada uno). Se llena scrapeando el banco. Para "transfiere a X" se busca acá por nombre y sale su RUT/cuenta/banco + de qué empresa.', '']
  const empresas = Object.keys(store.empresas || {}).sort()
  let total = 0
  for (const emp of empresas) {
    const cs = Object.values(store.empresas[emp].por_rut || {}).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
    total += cs.length
    L.push(`## ${emp} — ${cs.length} contactos`)
    L.push('| Nombre | RUT | Cuenta | Banco | Email |', '|---|---|---|---|---|')
    for (const c of cs) L.push(`| ${c.nombre || ''} | ${c.rut || ''} | ${c.cuenta || ''} | ${c.banco || ''} | ${c.email || ''} |`)
    L.push('')
  }
  L.splice(8, 0, `**Total: ${total} contactos en ${empresas.length} empresa(s).**`, '')
  if (!existsSync(dirname(NOTA))) mkdirSync(dirname(NOTA), { recursive: true })
  writeFileSync(NOTA, L.join('\n'))
  return { ok: true, empresas: empresas.length, total, nota: NOTA }
}

if (process.argv[1] && process.argv[1].endsWith('contactos-a-cerebro.mjs')) {
  merge()
  console.log(JSON.stringify(escribir()))
}

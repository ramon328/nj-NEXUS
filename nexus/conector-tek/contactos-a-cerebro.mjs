// contactos-a-cerebro.mjs — toma el último scrape de destinatarios (data/scrape-destinatarios.json)
// y lo MERGE en un almacén GLOBAL dedup por RUT (data/destinatarios-banco.json). Si un RUT se
// repite entre empresas NO se guarda de nuevo: solo se anota en qué empresa(s) apareció. Escribe
// la "lista de personas" del 2º cerebro. SOLO archivos locales — NO abre el banco.
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

// MERGE dedup GLOBAL por RUT. `empresas` de cada contacto = dónde apareció (para "de qué sesión").
export function merge(scrapePath = join(DATA, 'scrape-destinatarios.json')) {
  const s = leer(scrapePath)
  const store = leer(STORE) || { por_rut: {} }
  if (!store.por_rut) store.por_rut = {}
  if (s && Array.isArray(s.contactos)) {
    const donde = s.empresa_real || s.empresa || '(?)'
    for (const c of s.contactos) {
      if (!c.rut) continue
      const ex = store.por_rut[c.rut]
      if (!ex) store.por_rut[c.rut] = { rut: c.rut, nombre: c.nombre, cuenta: c.cuenta, banco: c.banco, email: c.email, empresas: [donde] }
      else if (!ex.empresas.includes(donde)) ex.empresas.push(donde)
    }
    store.actualizado = new Date().toISOString()
    writeFileSync(STORE, JSON.stringify(store, null, 2))
  }
  return store
}

export function escribir() {
  const store = leer(STORE) || { por_rut: {} }
  const cs = Object.values(store.por_rut || {}).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
  const L = ['---', 'tipo: contactos-banco', `actualizado: ${new Date().toISOString()}`, 'agente: Leo (banco)', '---', '',
    '# 👥 Contactos del banco (lista de personas)', '',
    `**${cs.length} contactos únicos** (dedup por RUT entre todas las empresas de la sesión).`, '',
    '> Destinatarios inscritos en Santander. Para "transfiere a X" se busca acá por nombre → sale RUT, cuenta, banco y en qué empresa(s) está inscrito. Un RUT repetido entre empresas se guarda UNA sola vez.', '',
    '| Nombre | RUT | Cuenta | Banco | Email | Empresa(s) |', '|---|---|---|---|---|---|']
  for (const c of cs) L.push(`| ${c.nombre || ''} | ${c.rut || ''} | ${c.cuenta || ''} | ${c.banco || ''} | ${c.email || ''} | ${(c.empresas || []).join(', ')} |`)
  if (!existsSync(dirname(NOTA))) mkdirSync(dirname(NOTA), { recursive: true })
  writeFileSync(NOTA, L.join('\n'))
  return { ok: true, total: cs.length, nota: NOTA }
}

if (process.argv[1] && process.argv[1].endsWith('contactos-a-cerebro.mjs')) {
  merge(); console.log(JSON.stringify(escribir()))
}

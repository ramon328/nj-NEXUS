// beneficiarios.mjs — libreta LOCAL de tek: resuelve "envíale X a <nombre>" a una
// cuenta concreta. Tokeniza el nombre/alias (como GoAutos) para aguantar frases
// naturales. SOLO lectura de data/beneficiarios.json (+ helpers de alta).
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const FILE = join(DIR, 'data', 'beneficiarios.json')

const norm = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')   // sin tildes
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

export function cargar() {
  try { return JSON.parse(readFileSync(FILE, 'utf8')).beneficiarios || [] } catch { return [] }
}

export function listar() {
  return cargar().map((b) => ({ id: b.id, nombre: b.nombre, banco: b.banco, cuenta: b.cuenta }))
}

/**
 * Busca un beneficiario por nombre/alias. Devuelve { ok, beneficiario?, candidatos?, error? }.
 * - match exacto de alias → gana.
 * - si no, puntúa por tokens compartidos (nombre + alias). Empate/ambiguo → candidatos.
 */
export function buscar(query) {
  const q = norm(query)
  if (!q) return { ok: false, error: 'Decime a quién (nombre).' }
  const qtok = new Set(q.split(' '))
  const lista = cargar()
  if (!lista.length) return { ok: false, error: 'La libreta de beneficiarios está vacía.' }

  const scored = lista.map((b) => {
    const aliases = [norm(b.nombre), ...(b.alias || []).map(norm)]
    if (aliases.includes(q)) return { b, score: 1000 }            // alias/nombre exacto
    let best = 0
    for (const a of aliases) {
      const atok = new Set(a.split(' '))
      let shared = 0
      for (const t of qtok) if (atok.has(t)) shared++
      best = Math.max(best, shared)
    }
    return { b, score: best }
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score)

  if (!scored.length) return { ok: false, error: `No tengo a nadie parecido a "${query}" guardado.` }
  // Ambiguo: varios con el MISMO puntaje tope (p.ej. dos "Joaquín") → pedir cuál, con lista.
  const top = scored.filter((x) => x.score === scored[0].score)
  if (top.length > 1) {
    return {
      ok: false, ambiguo: true,
      error: `Tengo ${top.length} contactos que calzan con "${query}". ¿Cuál?`,
      candidatos: top.map((x, i) => ({ n: i + 1, id: x.b.id, nombre: x.b.nombre, rut: x.b.rut, banco: x.b.banco, tipo_cuenta: x.b.tipo_cuenta, cuenta: x.b.cuenta })),
    }
  }
  return { ok: true, beneficiario: scored[0].b }
}

/** Alta/edición de un beneficiario (para "guardá a <persona>"). */
export function guardar(b) {
  const lista = cargar()
  const i = lista.findIndex((x) => x.id === b.id || norm(x.nombre) === norm(b.nombre))
  if (i >= 0) lista[i] = { ...lista[i], ...b }
  else lista.push({ id: b.id || norm(b.nombre).replace(/ /g, '-'), creado: '2026-07-21', ...b })
  const raw = JSON.parse(readFileSync(FILE, 'utf8'))
  raw.beneficiarios = lista
  writeFileSync(FILE, JSON.stringify(raw, null, 2))
  return { ok: true, total: lista.length }
}

// Prueba rápida por CLI:  node beneficiarios.mjs "joaquin"
if (process.argv[1] && process.argv[1].endsWith('beneficiarios.mjs')) {
  const q = process.argv.slice(2).join(' ') || 'joaquin'
  console.log(JSON.stringify(buscar(q), null, 2))
}

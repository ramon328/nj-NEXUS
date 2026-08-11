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

// Se devuelve el RUT y el tipo de cuenta, no solo nombre/banco: sin el RUT no se distingue a
// dos contactos de nombre parecido, que es justo el riesgo que hay que evitar al transferir.
export function listar() {
  return cargar().map((b) => ({ id: b.id, nombre: b.nombre, rut: b.rut, banco: b.banco, tipo_cuenta: b.tipo_cuenta, cuenta: b.cuenta }))
}

/**
 * Busca un beneficiario por nombre/alias. Devuelve { ok, beneficiario?, candidatos?, error? }.
 * - match exacto de alias → gana.
 * - si no, puntúa por tokens compartidos (nombre + alias). Empate/ambiguo → candidatos.
 */
/** RUT comparable: solo dígitos + dv en minúscula. "19.689.228-1" y "196892281" → "196892281" */
const rutClave = (x) => String(x || '').replace(/[^0-9kK]/g, '').toLowerCase()
/** ¿El texto es un RUT? (8-9 dígitos + dv, con o sin puntos/guion) */
const pareceRut = (x) => /^[0-9.\-]{7,12}[0-9kK]$/i.test(String(x || '').trim()) && rutClave(x).length >= 8

export function buscar(query) {
  const q = norm(query)
  if (!q) return { ok: false, error: 'Decime a quién (nombre o RUT).' }
  const lista = cargar()
  if (!lista.length) return { ok: false, error: 'La libreta de beneficiarios está vacía.' }

  // ── BÚSQUEDA POR RUT (10-08-2026, pedido de Nico) ────────────────────────────────
  // Antes solo se buscaba por nombre, y dos personas/empresas de nombre parecido podían
  // confundirse — con plata de por medio. El RUT es el identificador que NO se repite.
  // Ojo: un mismo RUT puede tener VARIAS cuentas guardadas (la libreta tiene dos Joaquín
  // con el mismo RUT: Cuenta Vista y Cuenta Corriente) → eso también se desambigua.
  if (pareceRut(query)) {
    const rq = rutClave(query)
    const porRut = lista.filter((b) => rutClave(b.rut) === rq)
    if (!porRut.length) return { ok: false, error: `No tengo a nadie guardado con el RUT ${query}.` }
    if (porRut.length > 1) {
      return {
        ok: false, ambiguo: true, por_rut: true,
        error: `Tengo ${porRut.length} cuentas guardadas con el RUT ${query}. ¿Cuál?`,
        candidatos: porRut.map((b, i) => ({ n: i + 1, id: b.id, nombre: b.nombre, rut: b.rut, banco: b.banco, tipo_cuenta: b.tipo_cuenta, cuenta: b.cuenta })),
      }
    }
    return { ok: true, beneficiario: porRut[0], por_rut: true }
  }

  const qtok = new Set(q.split(' '))

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

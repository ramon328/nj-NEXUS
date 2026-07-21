// memoria-usuarios.mjs — MEMORIA PERSISTENTE por persona, GUARDADA EN OBSIDIAN.
// Cada usuario tiene una nota en el vault: 90-Agente/Memoria Nexus/Memoria — <nombre>.md
// (visible y editable a mano por Nico/Ramón). El hub NO lee el vault en cada turno
// (eso lo cuelga): mantiene un CACHE en memoria que se refresca solo cada 3 min y al
// escribir. La lectura por turno (textoMemoria) es instantánea desde el cache.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const VAULT = process.env.CEREBRO_RUTA || join(process.env.HOME || '', 'nexus', 'cerebro')
const DIR = join(VAULT, '90-Agente', 'Memoria Nexus')
const MAX_HECHOS = 80
const MAX_LEN = 300

// Clave estable por persona (últimos 9 dígitos del número, o email). Ramón/Nico/otros.
const norm = (de) => {
  const s = String(de || '').trim().toLowerCase()
  if (s.includes('@')) return s
  const d = s.replace(/[^\d]/g, '')
  return d.length >= 8 ? d.slice(-9) : (s || 'anon')
}
const slugFile = (nombre, key) =>
  `Memoria — ${String(nombre || key || 'usuario').replace(/[\/\\:*?"<>|]/g, '-').trim()}.md`

// cache: key -> { hechos:[{t,ts}], nombre, file }
const _cache = new Map()

function parseNota(txt) {
  const id = (txt.match(/^id:\s*(.+)$/m) || [])[1]?.trim()
  const nombre = (txt.match(/^usuario:\s*(.+)$/m) || [])[1]?.trim()
  const hechos = [...txt.matchAll(/^-\s+(.+)$/gm)].map((m) => ({ t: m[1].trim() })).filter((h) => h.t)
  return { id, nombre, hechos }
}

async function cargarTodo() {
  try {
    await mkdir(DIR, { recursive: true })
    const files = (await readdir(DIR)).filter((f) => f.endsWith('.md'))
    const next = new Map()
    for (const f of files) {
      try {
        const { id, nombre, hechos } = parseNota(await readFile(join(DIR, f), 'utf8'))
        if (id) next.set(id, { hechos, nombre, file: f })
      } catch { /* nota ilegible, se ignora */ }
    }
    _cache.clear()
    for (const [k, v] of next) _cache.set(k, v)
  } catch { /* dir aún no existe u otra cosa: cache queda como esté */ }
}
let _ready = cargarTodo()
{ const t = setInterval(() => { _ready = cargarTodo() }, 180_000); t.unref?.() }  // toma ediciones hechas a mano en Obsidian

function render(key, u) {
  const hoy = new Date().toISOString().slice(0, 10)
  return `---\ntipo: memoria-nexus\nid: ${key}\nusuario: ${u.nombre || key}\nactualizado: ${hoy}\n---\n\n` +
    `# Memoria de Nexus — ${u.nombre || key}\n\n` +
    `> Lo que Nexus recuerda de esta persona para personalizar el trato. Puedes editar o borrar líneas a mano; se respeta.\n\n` +
    (u.hechos || []).map((h) => `- ${h.t}`).join('\n') + '\n'
}

export function memoriaDe(de) {
  return _cache.get(norm(de)) || { hechos: [] }
}

export function textoMemoria(de) {
  const h = (memoriaDe(de).hechos) || []
  return h.length ? h.map((x) => '• ' + x.t).join('\n') : ''
}

// Guarda un hecho DURADERO del usuario: actualiza el cache al instante (para el
// próximo turno) y escribe la nota en Obsidian (async, best-effort).
export function recordarHecho(de, texto, nombre) {
  const t = String(texto || '').trim().replace(/\s+/g, ' ').slice(0, MAX_LEN)
  const key = norm(de)
  if (!t) return { ok: false, error: 'texto vacío' }
  if (!key || key === 'anon') return { ok: false, error: 'sin usuario identificado (no guardo memoria de anónimos)' }
  const u = _cache.get(key) || { hechos: [], nombre }
  if (nombre) u.nombre = nombre
  const ya = (u.hechos || []).some((h) => (h.t || '').toLowerCase() === t.toLowerCase())
  if (!ya) u.hechos = [...(u.hechos || []), { t, ts: new Date().toISOString() }].slice(-MAX_HECHOS)
  if (!u.file) u.file = slugFile(u.nombre, key)
  _cache.set(key, u)
  writeFile(join(DIR, u.file), render(key, u)).catch(() => {})
  return { ok: true, total: u.hechos.length, nota: ya ? 'ya lo tenía guardado' : `guardado en tu Obsidian (90-Agente/Memoria Nexus/${u.file})` }
}

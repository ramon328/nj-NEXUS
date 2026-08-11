// pendientes-sistema.mjs — BACKLOG REAL de mejoras pedidas a Nexus sobre sí mismo.
//
// POR QUÉ EXISTE: el 10-08-2026 Nico pidió que la libreta buscara por RUT y Nexus contestó
// "quedó guardado como pendiente prioritario"… sin guardar nada en ninguna parte. No existía
// dónde. Esa respuesta era pura cortesía y el pedido se perdía. Ahora se guarda de verdad.
//
// NO confundir con guardar_recordatorio (lista PERSONAL de Ramón/Nico en el Segundo Cerebro):
// esto es el backlog de NEXUS — cosas que el sistema todavía no sabe hacer.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const DIR = dirname(fileURLToPath(import.meta.url))
const RUTA = join(DIR, 'pendientes-sistema.json')

const leer = () => { try { return existsSync(RUTA) ? JSON.parse(readFileSync(RUTA, 'utf8')) : [] } catch { return [] } }
const guardarTodo = (a) => writeFileSync(RUTA, JSON.stringify(a, null, 2), 'utf8')
// Fecha de Chile, no UTC: después de las 20:00 el día UTC ya es el siguiente.
const hoyCL = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

/** Anota una mejora pedida. Devuelve el registro creado. */
export function anotar({ texto, quien, area, prioridad } = {}) {
  const t = String(texto || '').trim()
  if (!t) throw new Error('Falta el texto del pendiente')
  const todo = leer()
  // Anti-duplicado simple: si ya hay uno abierto muy parecido, se suma un "+1" en vez de repetir.
  const norm = (x) => String(x).toLowerCase().replace(/[^a-z0-9áéíóúñ ]/g, '').replace(/\s+/g, ' ').trim()
  const igual = todo.find((p) => p.estado === 'abierto' && norm(p.texto) === norm(t))
  if (igual) {
    igual.pedido_veces = (igual.pedido_veces || 1) + 1
    igual.ultima_vez = hoyCL()
    if (quien && !(igual.pedido_por || []).includes(quien)) igual.pedido_por = [...(igual.pedido_por || []), quien]
    guardarTodo(todo)
    return { ...igual, repetido: true }
  }
  const reg = {
    id: 'p_' + crypto.randomBytes(3).toString('hex'),
    texto: t,
    area: area || 'general',
    prioridad: ['alta', 'media', 'baja'].includes(String(prioridad)) ? prioridad : 'media',
    estado: 'abierto',
    pedido_por: quien ? [quien] : [],
    pedido_veces: 1,
    fecha: hoyCL(),
    ultima_vez: hoyCL(),
  }
  todo.push(reg); guardarTodo(todo)
  return reg
}

/** Lista los pendientes. Por defecto solo los abiertos, los más pedidos primero. */
export function listar({ incluir_listos = false } = {}) {
  const orden = { alta: 0, media: 1, baja: 2 }
  return leer()
    .filter((p) => incluir_listos || p.estado === 'abierto')
    .sort((a, b) => (orden[a.prioridad] ?? 1) - (orden[b.prioridad] ?? 1) || (b.pedido_veces || 1) - (a.pedido_veces || 1))
}

/** Marca uno como listo (cuando la mejora ya se implementó). */
export function marcarListo(id, nota = '') {
  const todo = leer()
  const p = todo.find((x) => x.id === id)
  if (!p) return { ok: false, error: `No existe el pendiente ${id}` }
  p.estado = 'listo'; p.listo_el = hoyCL(); if (nota) p.nota_cierre = nota
  guardarTodo(todo)
  return { ok: true, pendiente: p }
}

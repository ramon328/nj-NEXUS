// registro.mjs — Almacén de SOLICITUDES/TRASPASOS DE TAG (los "leads internos de TAG").
// Guarda cada solicitud enviada a Tag Tico, su estado y una línea de tiempo de eventos.
// JSON plano (bajo volumen). Lo usan tag.mjs (al enviar), el tool de Meme y el tablero.

import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const STORE = join(__dirname, 'tag-registros.json')

// Estados del ciclo de vida de una solicitud de TAG.
export const ESTADOS = {
  enviado: 'Enviado a Tag Tico',
  convenio_recibido: 'Convenio recibido',
  rechazado: 'Rechazado',
  activo: 'TAG activo',
}

function ahora() { return new Date().toISOString() }

function leer() {
  try {
    if (!existsSync(STORE)) return { registros: [] }
    const d = JSON.parse(readFileSync(STORE, 'utf8'))
    return { registros: Array.isArray(d.registros) ? d.registros : [] }
  } catch { return { registros: [] } }
}

function guardar(data) {
  const tmp = STORE + '.tmp'
  writeFileSync(tmp, JSON.stringify(data, null, 2))
  renameSync(tmp, STORE)
}

// id corto y legible basado en el timestamp (sin depender de random).
function nuevoId(reg) {
  const n = (reg.length + 1).toString().padStart(3, '0')
  return 'TAG-' + n
}

// Crea un registro nuevo (al enviar la solicitud). Devuelve el registro.
export function crear({ tipo, tipo_label, patente, cantidad, es_empresa, solicitante, asunto, correo_id, enviado_desde, destino, modo, adjuntos, notas }) {
  const data = leer()
  const t = ahora()
  const reg = {
    id: nuevoId(data.registros),
    creado: t,
    tipo, tipo_label,
    patente: (patente || '').toUpperCase() || null,
    cantidad: cantidad || null,
    es_empresa: !!es_empresa,
    solicitante: solicitante || null,
    asunto,
    estado: 'enviado',
    modo: modo || 'prueba',
    correo_id: correo_id || null,
    enviado_desde: enviado_desde || null,
    destino: destino || null,
    adjuntos: adjuntos || [],
    notas: notas || null,
    convenio_recibido: false,
    eventos: [{ ts: t, tipo: 'enviado', detalle: `Solicitud enviada a ${destino || 'Tag Tico'}` }],
  }
  data.registros.unshift(reg)
  guardar(data)
  return reg
}

export function listar({ estado } = {}) {
  const data = leer()
  let r = data.registros
  if (estado) r = r.filter((x) => x.estado === estado)
  return r
}

export function obtener(id) {
  return leer().registros.find((x) => x.id === id) || null
}

// Cambia el estado y agrega un evento a la línea de tiempo.
export function actualizarEstado(id, estado, detalle) {
  if (!ESTADOS[estado]) return { ok: false, error: 'Estado inválido: ' + estado }
  const data = leer()
  const reg = data.registros.find((x) => x.id === id)
  if (!reg) return { ok: false, error: 'No existe el registro ' + id }
  reg.estado = estado
  if (estado === 'convenio_recibido') reg.convenio_recibido = true
  reg.eventos.push({ ts: ahora(), tipo: estado, detalle: detalle || ESTADOS[estado] })
  guardar(data)
  return { ok: true, registro: reg }
}

// Agrega una nota/evento sin cambiar el estado.
export function agregarEvento(id, detalle) {
  const data = leer()
  const reg = data.registros.find((x) => x.id === id)
  if (!reg) return { ok: false, error: 'No existe el registro ' + id }
  reg.eventos.push({ ts: ahora(), tipo: 'nota', detalle })
  guardar(data)
  return { ok: true, registro: reg }
}

// Resumen para el tablero / tool de seguimiento.
export function resumen() {
  const r = leer().registros
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  // Alerta: enviados HOY sin convenio recibido (el papel: si no llega el convenio el
  // mismo día, el auto queda sin tag y caen multas).
  const sinConvenioHoy = r.filter((x) => x.estado === 'enviado' && !x.convenio_recibido &&
    new Date(x.creado).toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }) === hoy)
  const porEstado = {}
  for (const k of Object.keys(ESTADOS)) porEstado[k] = r.filter((x) => x.estado === k).length
  return {
    total: r.length,
    por_estado: porEstado,
    pendientes_convenio: r.filter((x) => x.estado === 'enviado' && !x.convenio_recibido).length,
    alerta_hoy_sin_convenio: sinConvenioHoy.map((x) => ({ id: x.id, asunto: x.asunto, patente: x.patente })),
  }
}

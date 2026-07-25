// contactos-externos.mjs — Manejo de números que NO son usuarios de Nexus (leads,
// clientes que nunca hablaron con Nexus, terceros a los que un usuario les quiere
// escribir). Reglas duras del diseño (ver memoria [[nexus-contactos-externos]]):
//
//   1) Un externo NUNCA llega al Nexus completo (ni datos de empresa ni funciones).
//   2) Nexus NO le auto-responde a un externo: SILENCIO. Solo GUARDA lo que escribe.
//      Esto evita el bucle de mensajes / baneo de WhatsApp. (Regla recalcada por Ramón.)
//   3) Un usuario de Nexus puede: relayar un mensaje a un externo (con la plantilla
//      aprobada si está fuera de la ventana de 24h) y LEER lo que el externo respondió.
//
// La CONVERSACIÓN (ida y vuelta) se guarda en historial.db (canal 'whatsapp',
// contraparte = número). Aquí solo llevamos el REGISTRO de quién inició el contacto.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import * as historial from './historial.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RUTA = join(__dirname, '..', 'contactos-externos.json')
const norm = (n) => String(n || '').replace(/[^0-9]/g, '')
// Forma E.164 (+56…) para casar con historial.db: parsearRecibido entrega el número
// con "+", y clave() del historial conserva dígitos + "+". Todas las consultas al
// historial usan esta forma; el JSON interno se indexa por dígitos (norm).
const waNum = (n) => { const d = norm(n); return d ? '+' + d : '' }

function cargar() {
  try { return JSON.parse(readFileSync(RUTA, 'utf8')) || {} } catch { return {} }
}
function guardar(o) {
  try { writeFileSync(RUTA, JSON.stringify(o, null, 2)) } catch { /* best-effort */ }
}

// ¿Este número está registrado como contacto externo (un usuario le escribió antes)?
export function esContactoExterno(num) { return Boolean(cargar()[norm(num)]) }

// Registra/actualiza un contacto externo. `por` = número del usuario de Nexus que lo
// inició; `porNombre` = su nombre; `nota` = nombre/etiqueta del externo (opcional).
export function registrarContactoExterno(num, { por, porNombre, nota } = {}) {
  const k = norm(num)
  if (!k) return null
  const o = cargar()
  const prev = o[k] || {}
  o[k] = {
    creado_por: norm(por) || prev.creado_por || '',
    creado_por_nombre: porNombre || prev.creado_por_nombre || '',
    nota: nota || prev.nota || '',
    creado: prev.creado || new Date().toISOString(),
    actualizado: new Date().toISOString(),
  }
  guardar(o)
  return o[k]
}

export function infoContactoExterno(num) { return cargar()[norm(num)] || null }

// Lista de contactos externos (opcionalmente solo los que inició `por`), con el
// último mensaje de cada uno para dar contexto.
export function listarContactosExternos({ por } = {}) {
  const o = cargar()
  let arr = Object.entries(o).map(([num, v]) => ({ num, ...v }))
  if (por) arr = arr.filter((c) => norm(c.creado_por) === norm(por))
  return arr.map((c) => {
    let ultimo = null
    try {
      const h = historial.recientes({ canal: 'whatsapp', contraparte: waNum(c.num), limite: 1 })
      if (h && h.length) ultimo = { direccion: h[0].direccion, texto: h[0].texto, ts: h[0].ts }
    } catch { /* */ }
    return { ...c, ultimo }
  })
}

// Transcripción de la conversación con un externo (ida y vuelta) desde historial.db.
export function conversacionExterno(num, limite = 60) {
  try {
    const h = historial.hilo({ canal: 'whatsapp', contraparte: waNum(num), limite })
    return (h || []).map((m) => ({ direccion: m.direccion, texto: m.texto, ts: m.ts }))
  } catch { return [] }
}

// ¿La ventana de 24h de WhatsApp está ABIERTA? (el externo escribió hace <24h → se le
// puede mandar texto libre; si no, hay que usar la plantilla aprobada).
export function ventana24hAbierta(num) {
  try {
    const h = historial.recientes({ canal: 'whatsapp', contraparte: waNum(num), limite: 40 })
    const ult = (h || []).filter((m) => m.direccion === 'entrante').slice(-1)[0]
    if (!ult || !ult.ts) return false
    return (Date.now() - Number(ult.ts)) < 24 * 60 * 60 * 1000
  } catch { return false }
}

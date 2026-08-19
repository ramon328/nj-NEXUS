// pendientes-lotes.mjs — LIBRETA DE PAGOS QUE NO SE SUBIERON AL BANCO.
//
// Por qué existe (caso real 18-08-2026): Joaquín pidió un lote de $2.800.000, la sesión del
// banco estaba dormida, el login automático no entró y Nexus le contestó "reintento en unos
// minutos y te aviso". No existía ningún reintento ni ningún aviso: el pago quedó 27 horas en
// el aire y NADIE se enteró — ni Joaquín, ni Ramón, que era el único que podía destrabarlo.
//
// Esta libreta ANOTA cada pago que quedó sin subir y el vigía (vigia-lotes.mjs) avisa. NO
// reintenta el banco solo: despertar la sesión es decisión de una persona (el login en frío
// no pasa el antifraude y quemarlo marca la cuenta). El objetivo es que nunca más se pierda
// de vista un pago, no automatizar el login.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import crypto from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, 'data')
const RUTA = join(DATA, 'lotes-pendientes.json')

function leer() {
  try { return JSON.parse(readFileSync(RUTA, 'utf8')) } catch { return { pendientes: [] } }
}
function escribir(db) {
  try { mkdirSync(DATA, { recursive: true }) } catch { /* */ }
  writeFileSync(RUTA, JSON.stringify(db, null, 2))
}
const ahora = () => new Date().toISOString()
// Huella del pago: mismo pedidor + empresa + beneficiarios + total. Sirve para no anotar
// diez veces el mismo pago si el usuario lo reintenta, y para poder cerrarlo después.
function huella(p) {
  const base = [p.de, p.empresa, p.total, (p.beneficiarios || []).map((b) => `${b.nombre}:${b.monto}`).sort().join('|')].join('::')
  return 'lote_' + crypto.createHash('sha1').update(base).digest('hex').slice(0, 12)
}

/** Anota (o refresca) un pago que NO quedó subido. Devuelve el registro. */
export function anotar(p) {
  const db = leer()
  const id = huella(p)
  const ya = db.pendientes.find((x) => x.id === id && x.estado === 'pendiente')
  if (ya) {
    ya.intentos = (ya.intentos || 1) + 1
    ya.ultimo_intento = ahora()
    ya.motivo = p.motivo || ya.motivo
    escribir(db)
    return ya
  }
  const reg = {
    id,
    creado: ahora(),
    ultimo_intento: ahora(),
    intentos: 1,
    estado: 'pendiente',
    tipo: p.tipo || 'masiva',          // masiva | individual
    de: p.de || '',                    // quién lo pidió (número)
    quien: p.quien || '',              // nombre legible
    dueño_sesion: p.dueñoSesion || '', // con qué sesión de banco iba (ramon/nico/joaquin)
    empresa: p.empresa || '',
    concepto: p.concepto || '',
    glosa: p.glosa || '',
    total: p.total || 0,
    beneficiarios: p.beneficiarios || [],
    motivo: p.motivo || 'no se pudo subir',
    archivo: p.archivo || null,
    avisos: [],                        // marcas de tiempo de los avisos ya mandados
  }
  db.pendientes.push(reg)
  escribir(db)
  return reg
}

/** Cierra un pago: quedó subido, o alguien lo resolvió por fuera. */
export function resolver(p, comoQuedo = 'subido') {
  const db = leer()
  const id = typeof p === 'string' ? p : huella(p)
  let n = 0
  for (const x of db.pendientes) {
    if (x.id === id && x.estado === 'pendiente') { x.estado = comoQuedo; x.cerrado = ahora(); n++ }
  }
  if (n) escribir(db)
  return n
}

/** Pagos que siguen sin subir. */
export function listar({ soloPendientes = true } = {}) {
  const db = leer()
  return soloPendientes ? db.pendientes.filter((x) => x.estado === 'pendiente') : db.pendientes
}

/** Deja constancia de que ya se avisó (para no repetir el aviso cada 10 minutos). */
export function marcarAviso(id, tipo = 'primer_aviso') {
  const db = leer()
  const x = db.pendientes.find((r) => r.id === id)
  if (!x) return false
  x.avisos = x.avisos || []
  x.avisos.push({ ts: ahora(), tipo })
  escribir(db)
  return true
}

export const RUTA_LIBRETA = RUTA

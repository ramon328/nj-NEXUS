// vigia-lotes.mjs — VIGÍA DE PAGOS QUE QUEDARON SIN SUBIR AL BANCO.
//
// Corre cada 10 min (com.nexus.vigia-lotes). Mira la libreta (pendientes-lotes.mjs) y avisa
// por WhatsApp cuando un pago lleva rato sin quedar subido:
//   • al que lo pidió (para que sepa que NO se subió solo), y
//   • al DUEÑO de la sesión del banco (el único que puede despertarla).
// Recuerda cada 6 h mientras siga pendiente, y a los 7 días lo cierra como "vencido" avisando.
//
// ⛔ NO toca el banco: no abre sesión, no reintenta el login, no sube nada. Despertar el banco
// es decisión de una persona (el login en frío no pasa el antifraude de Santander).
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { listar, marcarAviso, resolver } from './pendientes-lotes.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* opcional */ }

const MIN_AVISO = Number(process.env.TEK_LOTES_AVISO_MIN || 25)      // 1er aviso a los 25 min
const HORAS_RECORDAR = Number(process.env.TEK_LOTES_RECORDAR_H || 6) // recordatorio cada 6 h
const DIAS_VENCE = Number(process.env.TEK_LOTES_VENCE_DIAS || 7)
const DRY = process.argv.includes('--dry')

const NUM = { ramon: '+56932945240', nico: '+56975481858', joaquin: '+56958589915' }
const plata = (n) => '$' + Number(n || 0).toLocaleString('es-CL')
const minutosDesde = (iso) => Math.round((Date.now() - new Date(iso).getTime()) / 60000)

// Aviso por la vía de siempre: si la persona escribió hace menos de 24 h va el mensaje normal,
// si no, la plantilla aprobada (WhatsApp no deja escribir primero fuera de esa ventana).
async function avisar(numero, texto) {
  if (!numero) return false
  if (DRY) { console.log(`[DRY] → ${numero}: ${texto.replace(/\n/g, ' ⏎ ')}`); return true }
  try {
    const kapso = await import('../hub/kapso.mjs')
    try { await kapso.enviarKapso(numero, texto); return true } catch { /* fuera de 24 h */ }
    const { alertarUsuario } = await import('../hub/alertar.mjs')
    await alertarUsuario(numero, texto)
    return true
  } catch (e) {
    console.log(`no pude avisar a ${numero}: ${e.message}`)
    return false
  }
}

function textoPago(p) {
  const quien = (p.beneficiarios || []).map((b) => `${b.nombre} ${plata(b.monto)}`).join(', ')
  return `${p.tipo === 'individual' ? 'Transferencia' : `Lote de ${(p.beneficiarios || []).length} transferencias`} · ${plata(p.total)} · ${p.empresa}` +
    (p.glosa ? ` · "${p.glosa}"` : '') + (quien ? `\n${quien}` : '')
}

const pendientes = listar()
if (!pendientes.length) { console.log(`${new Date().toISOString()} sin pagos pendientes`); process.exit(0) }

for (const p of pendientes) {
  const edad = minutosDesde(p.creado)
  const avisos = p.avisos || []
  const ultimo = avisos.length ? minutosDesde(avisos[avisos.length - 1].ts) : null

  // Vencido: lleva demasiado tiempo. Se cierra avisando, para que la libreta no se llene de
  // fantasmas (si de verdad sigue pendiente, la persona lo vuelve a pedir).
  if (edad > DIAS_VENCE * 24 * 60) {
    await avisar(NUM[p.dueño_sesion] || NUM.ramon,
      `🗂️ Cierro por antigüedad un pago que quedó sin subir hace ${Math.round(edad / 1440)} días:\n\n${textoPago(p)}\n\nSi todavía hace falta, pídemelo de nuevo.`)
    if (!DRY) resolver(p.id, 'vencido')
    continue
  }
  // Todavía no toca avisar.
  if (edad < MIN_AVISO) continue
  if (ultimo !== null && ultimo < HORAS_RECORDAR * 60) continue

  const esRecordatorio = avisos.length > 0
  const cab = esRecordatorio
    ? `⏰ Sigue SIN SUBIRSE al banco (van ${edad < 120 ? edad + ' min' : Math.round(edad / 60) + ' h'}):`
    : `⚠️ Este pago NO quedó subido al banco (${edad} min):`
  const cuerpo = `${cab}\n\n${textoPago(p)}\n\nMotivo: ${p.motivo}.`

  // 1) Al que lo pidió: que sepa que no se subió solo y que nadie lo está reintentando.
  const numPide = p.de || ''
  await avisar(numPide, `${cuerpo}\n\nNo se sube solo: hay que despertar la sesión del banco. Ya le avisé a ${p.dueño_sesion === 'ramon' ? 'Ramón' : (p.dueño_sesion || 'quien tiene la sesión')}.`)

  // 2) Al dueño de la sesión (el único que puede destrabarlo), si es otra persona.
  const numDueño = NUM[p.dueño_sesion]
  if (numDueño && numDueño !== numPide) {
    await avisar(numDueño, `${cuerpo}\n\nLo pidió ${p.quien || numPide}. Va con TU sesión del banco: hasta que la despiertes no sube. Si ya lo pagaron por otra vía, dime "pago listo" y lo cierro.`)
  }
  if (!DRY) marcarAviso(p.id, esRecordatorio ? 'recordatorio' : 'primer_aviso')
  console.log(`avisado ${p.id} (${plata(p.total)}, ${edad} min, ${esRecordatorio ? 'recordatorio' : 'primer aviso'})`)
}

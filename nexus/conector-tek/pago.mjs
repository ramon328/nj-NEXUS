// pago.mjs — Motor de PAGO de tek (facturas de compra de ANA CLARA, Santander Empresa).
//
// ⚠️ MODO SIMULACIÓN: arma el BORRADOR del pago y lo devuelve, pero NO ejecuta ninguna
// transferencia real. La ejecución real está BLINDADA detrás de TEK_PAGOS_HABILITADO=1
// Y de que el canal con el banco esté funcionando (hoy no lo está). Igual que la emisión
// real de facturas de Martes: se puede ver/armar todo, pero firmar/pagar está apagado.
//
// Flujo: factura de compra → armarBorradorPago() → (Nexus pregunta por WhatsApp) →
// con el OK → emitirPago() → hoy devuelve SIMULACIÓN (no mueve plata).

// Cuenta de ORIGEN (quien paga) = ANA CLARA. Números reales del portal (runbook rail).
export const CUENTA_ORIGEN = {
  empresa: 'ANA CLARA SpA',
  rut: '77.271.121-2',
  banco: 'Santander',
  numero: '0-000-8028093-9',   // cuenta corriente CLP
  moneda: 'CLP',
}

// Tope de seguridad por pago (simulación). Sobre esto, exige confirmación reforzada.
export const TOPE_PAGO_CLP = Number(process.env.TEK_TOPE_PAGO || 5_000_000)

const clp = (n) => '$' + Number(n || 0).toLocaleString('es-CL')
const limpiarRut = (r) => String(r || '').replace(/[^0-9kK]/g, '').toUpperCase()

// Valida el RUT chileno (módulo 11).
function rutValido(rut) {
  const s = limpiarRut(rut)
  if (s.length < 2) return false
  const cuerpo = s.slice(0, -1), dv = s.slice(-1)
  let suma = 0, mul = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) { suma += Number(cuerpo[i]) * mul; mul = mul === 7 ? 2 : mul + 1 }
  const res = 11 - (suma % 11)
  const dvEsp = res === 11 ? '0' : res === 10 ? 'K' : String(res)
  return dv === dvEsp
}

/**
 * Arma el BORRADOR de un pago a proveedor a partir de una factura de compra.
 * Devuelve { ok, borrador?, error? }. NO ejecuta nada.
 */
export function armarBorradorPago({ proveedor, rut, monto, folio, glosa, cuenta_destino } = {}) {
  const nombre = String(proveedor || '').trim()
  const m = Math.trunc(Number(monto))
  if (!nombre) return { ok: false, error: 'Falta el nombre del proveedor.' }
  if (!rut || !rutValido(rut)) return { ok: false, error: `RUT del proveedor inválido o ausente (${rut || '—'}).` }
  if (!Number.isFinite(m) || m <= 0) return { ok: false, error: 'Monto inválido (debe ser un entero en CLP > 0).' }

  const borrador = {
    tipo: 'pago_proveedor',
    origen: CUENTA_ORIGEN,
    beneficiario: { nombre, rut: limpiarRut(rut), cuenta: cuenta_destino || null },
    monto: m,
    moneda: 'CLP',
    folio_factura: folio ? String(folio) : null,
    glosa: (glosa || `Pago factura ${folio ? 'N° ' + folio : ''} — ${nombre}`).slice(0, 40),
    supera_tope: m > TOPE_PAGO_CLP,
    tope: TOPE_PAGO_CLP,
  }
  return { ok: true, borrador }
}

/** Texto lindo del borrador para mostrar/confirmar (WhatsApp o web). */
export function textoBorrador(b) {
  return [
    `💸 *Borrador de pago* (aún NO ejecutado)`,
    `Proveedor: ${b.beneficiario.nombre} · ${b.beneficiario.rut}`,
    `Monto: *${clp(b.monto)}*`,
    b.folio_factura ? `Factura: N° ${b.folio_factura}` : '',
    `Desde: ${b.origen.empresa} · ${b.origen.banco} ${b.origen.numero}`,
    `Glosa: ${b.glosa}`,
    b.supera_tope ? `⚠️ Supera el tope de seguridad (${clp(b.tope)}): confirmá con más cuidado.` : '',
  ].filter(Boolean).join('\n')
}

/**
 * "Ejecuta" el pago. HOY: SIMULACIÓN — no mueve plata (blindado). Cuando tek tenga el
 * canal con el banco y TEK_PAGOS_HABILITADO=1, aquí irá la transferencia real (con
 * segundo factor / Superclave pedido por WhatsApp). Por ahora reporta el plan y para.
 */
export async function emitirPago(borrador) {
  const habilitado = process.env.TEK_PAGOS_HABILITADO === '1'
  if (!habilitado) {
    return {
      ok: true, modo: 'simulacion', ejecutado: false, borrador,
      nota: 'Pago NO ejecutado (tek en modo simulación: el canal de pago real con el banco todavía no está habilitado). Esto es exactamente lo que se transferiría.',
    }
  }
  // 🔒 Aún con la flag encendida, el canal real no existe todavía → no ejecutamos.
  return {
    ok: false, modo: 'bloqueado', ejecutado: false, borrador,
    nota: 'La ejecución real de pagos todavía no está construida (falta el login/sesión con Santander Empresa). No se transfirió nada.',
  }
}

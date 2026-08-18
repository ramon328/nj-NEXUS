/**
 * Cliente del Cartero para la web de Clivox.
 *
 * IMPORTANTE: los avisos de cambio de estado de un pedido NO se mandan desde aqui.
 * El vigia del Cartero mira la tabla orders solo: cuando cambias el status en
 * Supabase, el correo sale automatico. La web no tiene que hacer nada.
 *
 * Este cliente es para los correos que NO nacen de un cambio en orders:
 * formulario de contacto, bienvenida, recuperar clave, etc.
 *
 * Va SIEMPRE en el servidor (route handler / server action).
 * Nunca en el navegador: la llave quedaria a la vista de cualquiera.
 */

const BASE = process.env.CARTERO_URL || 'http://127.0.0.1:7700';
const LLAVE = process.env.CARTERO_LLAVE;

export async function enviarCorreo({
  para, plantilla, datos = {}, asunto, html, idempotencia, forzar = false,
}) {
  if (!LLAVE) throw new Error('Falta CARTERO_LLAVE en las variables de entorno');

  const r = await fetch(`${BASE}/api/enviar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${LLAVE}` },
    body: JSON.stringify({ para, plantilla, datos, asunto, html, idempotencia, forzar }),
    signal: AbortSignal.timeout(8000),
  });

  const j = await r.json().catch(() => ({}));
  // Si el correo falla, la compra NO debe fallar. Se registra y se sigue.
  if (!r.ok || j.ok === false) {
    console.error('[cartero] no se pudo encolar:', j.motivo || j.error || r.status);
    return { ok: false, motivo: j.motivo || j.error };
  }
  return j;
}

/** Fuerza el aviso de un pedido puntual (por ejemplo, un boton "reenviar" en el admin). */
export async function avisarPedido(idPedido, { plantilla, reenviar = false } = {}) {
  const r = await fetch(`${BASE}/api/pedido/${idPedido}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${LLAVE}` },
    body: JSON.stringify({ plantilla, reenviar }),
    signal: AbortSignal.timeout(8000),
  });
  return r.json();
}

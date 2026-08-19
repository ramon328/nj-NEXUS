// Vigia de pedidos: mira la tabla orders de Clivox y manda dos cosas distintas:
//   1. al CLIENTE, cuando su pedido cambia de estado
//   2. al DUEÑO, cuando entra un pedido o se confirma una venta
//
// Va por sondeo (no por webhook) a proposito: sobrevive a reinicios y cortes
// de luz sin perder cambios, porque el ultimo estado visto queda en disco.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, ahora } from './db.mjs';
import { pedidosDesde } from './clivox.mjs';
import { encolar } from './correo.mjs';

const raiz = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(raiz, '.env'));

const SITIO = (process.env.CLIVOX_SITIO || 'https://clivox.cl').replace(/\/+$/, '');
const ADMIN = (process.env.CLIVOX_ADMIN || `${SITIO}/admin/pedidos`).replace(/\/+$/, '');
// A quien se le avisa de las ventas. Puede ser mas de uno, separado por comas.
const INTERNOS = (process.env.CARTERO_AVISO_INTERNO || 'info@clivox.cl')
  .split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);

const PLANTILLAS = {
  pendiente: 'pedido-pendiente',   pending: 'pedido-pendiente',
  pagado: 'pedido-pagado',         pagada: 'pedido-pagado',      paid: 'pedido-pagado',
  preparando: 'pedido-preparando', procesando: 'pedido-preparando', processing: 'pedido-preparando',
  enviado: 'pedido-enviado',       enviada: 'pedido-enviado',    shipped: 'pedido-enviado',
  entregado: 'pedido-entregado',   entregada: 'pedido-entregado', delivered: 'pedido-entregado',
  cancelado: 'pedido-cancelado',   cancelada: 'pedido-cancelado', cancelled: 'pedido-cancelado',
  canceled: 'pedido-cancelado',
};

const normal = (s) => String(s || '').toLowerCase().trim()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const plantillaDe = (estado) => PLANTILLAS[normal(estado)] || 'pedido-actualizado';

const leerVisto = (id) => db.prepare('SELECT * FROM pedidos_vistos WHERE order_id=?').get(id);
const guardarVisto = (p) => db.prepare(
  `INSERT INTO pedidos_vistos (order_id,status,tracking,carrier,updated_at,pagado,actualizado)
   VALUES (?,?,?,?,?,?,?)
   ON CONFLICT(order_id) DO UPDATE SET
     status=excluded.status, tracking=excluded.tracking, carrier=excluded.carrier,
     updated_at=excluded.updated_at, pagado=excluded.pagado, actualizado=excluded.actualizado`
).run(p.id, p.estado, p.tracking || null, p.carrier || null, p.updated_at, p.pagado ? 1 : 0, ahora());

// ---------- aviso al dueño ----------
// Exportado para que la vista previa muestre lo mismo que se envia.
export function contextoInterno(p, tipo = 'venta', idioma = 'es') {
  const venta = tipo === 'venta';
  const acento = venta ? '#15803d' : '#0f0f11';
  const textos = idioma === 'en'
    ? {
        etiqueta: venta ? 'SALE CONFIRMED' : 'NEW ORDER',
        titular: venta ? 'You sold.' : 'New order in.',
        bajada: venta
          ? 'Payment is confirmed. Ready to prepare for dispatch.'
          : 'Payment not confirmed yet. We\'ll ping you again when it clears.',
        prefijo_asunto: venta ? 'Sale confirmed' : 'New order',
        estado_texto: venta ? 'PAID' : 'AWAITING PAYMENT',
        texto_boton: 'Open in panel',
      }
    : {
        etiqueta: venta ? 'Venta confirmada' : 'Pedido nuevo',
        titular: venta ? '¡Vendiste!' : 'Entró un pedido nuevo',
        bajada: venta
          ? 'El pago está confirmado. Ya se puede preparar el despacho.'
          : 'Todavía sin confirmar el pago. Te avisamos de nuevo cuando se confirme.',
        prefijo_asunto: venta ? 'Venta confirmada' : 'Pedido nuevo',
        estado_texto: venta ? 'pago confirmado' : 'esperando pago',
        texto_boton: 'Ver en el panel',
      };

  return {
    ...p,
    ...textos,
    interno: true,
    color_barra: acento,
    // TheArsenale usa su naranjo de marca como acento, no el verde.
    color_acento: idioma === 'en' ? '#FC4C02' : acento,
    url_boton: `${ADMIN}/${p.id}`,
    preview: `${p.items?.length || 0} item(s) · ${p.cliente_completo || p.email || ''}`,
  };
}

function avisarInterno(p, tipo, simular) {
  const datos = contextoInterno(p, tipo);
  const hechos = [];
  for (const destino of INTERNOS) {
    if (simular) { hechos.push({ interno: destino, tipo, accion: 'simulado' }); continue; }
    const r = encolar({
      para: destino,
      plantilla: 'interno-venta',
      datos,
      idempotencia: `interno:${p.id}:${tipo}`,
      origen: 'interno',
      forzar: true,   // nunca se bloquea por lista de supresion: es correo operativo
    });
    hechos.push({ interno: destino, tipo, accion: r.ok ? (r.duplicado ? 'ya_avisado' : 'avisado') : 'rechazado', motivo: r.motivo });
  }
  return hechos;
}

// Contexto del correo al CLIENTE. Exportado para que el reenvio manual y la
// vista previa manden exactamente lo mismo que el vigia.
export function contextoCliente(p) {
  return {
    ...p,
    url_boton: `${SITIO}/cuenta/pedidos/${p.id}`,
    texto_boton: normal(p.estado) === 'enviado' ? 'Seguir mi envío' : 'Ver mi pedido',
    preview: `Pedido #${p.pedido_corto} · ${p.total_f}`,
  };
}

/**
 * Una pasada del vigia.
 * @param {boolean} [opciones.sembrar] registra el estado actual SIN enviar nada.
 * @param {boolean} [opciones.simular] muestra que enviaria, sin encolar.
 */
export async function revisar({ sembrar = false, simular = false, desde = '2000-01-01T00:00:00Z' } = {}) {
  const pedidos = await pedidosDesde(desde);
  const acciones = [];

  for (const p of pedidos) {
    const visto = leerVisto(p.id);
    const esNuevo = !visto;

    if (esNuevo && sembrar) {
      guardarVisto(p);
      acciones.push({ pedido: p.pedido_corto, accion: 'sembrado', estado: p.estado });
      continue;
    }

    if (esNuevo) {
      // La web crea la orden y mete los productos un instante despues. Si el
      // vigia cae justo en medio, mandaria un aviso sin nada adentro.
      // Se deja pasar una vuelta; si al rato sigue vacio, se manda igual.
      const edad = Date.now() - new Date(p.created_at).getTime();
      if (p.sin_items && edad < 3 * 60 * 1000) {
        acciones.push({ pedido: p.pedido_corto, accion: 'esperando_productos', estado: p.estado });
        continue;   // sin guardarVisto: se vuelve a mirar en la proxima vuelta
      }
    }

    const cambioEstado   = !esNuevo && normal(visto.status) !== normal(p.estado);
    const cambioTracking = !esNuevo && (visto.tracking || '') !== (p.tracking || '') && !!p.tracking;
    const cambioPago     = !esNuevo && !visto.pagado && p.pagado;
    if (!esNuevo && !cambioEstado && !cambioTracking && !cambioPago) continue;

    // ---- 1. aviso al dueño ----
    // Va primero y no depende del correo del cliente: aunque el pedido venga
    // sin email, el dueño igual tiene que enterarse de que vendio.
    // Si el pedido nace ya pagado, sale UN solo aviso (el de venta), no dos.
    if (esNuevo || cambioPago) {
      const tipo = p.pagado ? 'venta' : 'nuevo';
      acciones.push(...avisarInterno(p, tipo, simular).map((h) => ({ pedido: p.pedido_corto, ...h })));
    }

    // ---- 2. correo al cliente ----
    if (esNuevo || cambioEstado || cambioTracking) {
      if (!p.email) {
        acciones.push({ pedido: p.pedido_corto, accion: 'sin_email', estado: p.estado });
      } else {
        const plantilla = plantillaDe(p.estado);
        const datos = contextoCliente(p);

        if (simular) {
          acciones.push({ pedido: p.pedido_corto, accion: 'simulado', estado: p.estado, plantilla, para: p.email });
        } else {
          // La clave incluye el tracking: si cambia el numero de seguimiento
          // sale un correo nuevo; si no cambia nada, jamas sale dos veces.
          const r = encolar({
            para: p.email, para_nombre: p.cliente_completo || undefined,
            plantilla, datos,
            idempotencia: `pedido:${p.id}:${normal(p.estado)}:${p.tracking || '-'}`,
            origen: 'vigia',
            forzar: normal(p.estado) !== 'pendiente',
          });
          acciones.push({
            pedido: p.pedido_corto, estado: p.estado, plantilla,
            accion: r.ok ? (r.duplicado ? 'ya_enviado' : 'encolado') : 'rechazado',
            motivo: r.motivo,
          });
        }
      }
    }

    if (!simular) guardarVisto(p);
  }
  return acciones;
}

let reloj = null;
export function arrancarVigia(cadaMs = 60000) {
  if (reloj) return;
  reloj = setInterval(() => {
    revisar().then((a) => {
      const utiles = a.filter((x) => x.accion === 'encolado' || x.accion === 'avisado');
      if (utiles.length) console.log('[vigia]', JSON.stringify(utiles));
      // Un pedido sin correo es plata que entro y un cliente que no supo nada:
      // tiene que quedar a la vista, no pasar en silencio.
      for (const x of a.filter((y) => y.accion === 'sin_email'))
        console.error(`[vigia] OJO: el pedido ${x.pedido} (${x.estado}) no tiene correo, nadie fue avisado`);
      for (const x of a.filter((y) => y.accion === 'rechazado'))
        console.error(`[vigia] OJO: pedido ${x.pedido} rechazado: ${x.motivo}`);
    }).catch((e) => console.error('[vigia]', e.message));
  }, cadaMs);
  reloj.unref?.();
}

// Uso directo:  node vigia.mjs --sembrar | --simular
if (import.meta.url === `file://${process.argv[1]}`) {
  const f = process.argv.slice(2);
  const r = await revisar({ sembrar: f.includes('--sembrar'), simular: f.includes('--simular') });
  console.log(JSON.stringify(r, null, 2));
}

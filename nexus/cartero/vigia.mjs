// Vigia de pedidos: mira la tabla orders de Clivox y, cuando un pedido
// CAMBIA de estado, encola el correo que corresponde.
//
// Va por sondeo (no por webhook) a proposito: sobrevive a reinicios y cortes
// de luz sin perder cambios, porque el ultimo estado visto queda en disco.
import { db, ahora } from './db.mjs';
import { pedidosDesde } from './clivox.mjs';
import { encolar } from './correo.mjs';

const SITIO = (process.env.CLIVOX_SITIO || 'https://clivox.cl').replace(/\/+$/, '');

// Estado del pedido -> plantilla. Se normaliza el texto para aguantar
// variantes ("Enviado", "enviada", "shipped").
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
  `INSERT INTO pedidos_vistos (order_id,status,tracking,carrier,updated_at,actualizado)
   VALUES (?,?,?,?,?,?)
   ON CONFLICT(order_id) DO UPDATE SET
     status=excluded.status, tracking=excluded.tracking, carrier=excluded.carrier,
     updated_at=excluded.updated_at, actualizado=excluded.actualizado`
).run(p.id, p.estado, p.tracking || null, p.carrier || null, p.updated_at, ahora());

/**
 * Una pasada del vigia.
 * @param {object} opciones
 * @param {boolean} [opciones.sembrar] registra el estado actual SIN enviar correos.
 *   Se usa la primera vez, para no bombardear a clientes con pedidos ya viejos.
 * @param {boolean} [opciones.simular] muestra que enviaria, sin encolar nada.
 */
export async function revisar({ sembrar = false, simular = false, desde = '2000-01-01T00:00:00Z' } = {}) {
  const pedidos = await pedidosDesde(desde);
  const acciones = [];

  for (const p of pedidos) {
    const visto = leerVisto(p.id);

    // Pedido nuevo para el Cartero.
    if (!visto) {
      if (sembrar) { guardarVisto(p); acciones.push({ pedido: p.pedido_corto, accion: 'sembrado', estado: p.estado }); continue; }

      // La web crea la orden y mete los productos un instante despues. Si el
      // vigia cae justo en medio, mandaria una confirmacion sin nada adentro.
      // Se deja pasar una vuelta; si al rato sigue vacio, se manda igual.
      const edad = Date.now() - new Date(p.created_at).getTime();
      if (p.sin_items && edad < 3 * 60 * 1000) {
        acciones.push({ pedido: p.pedido_corto, accion: 'esperando_productos', estado: p.estado });
        continue;   // sin guardarVisto: se vuelve a mirar en la proxima vuelta
      }
      // Sin sembrar, un pedido recien creado si merece su correo de confirmacion.
    } else {
      const cambioEstado = normal(visto.status) !== normal(p.estado);
      const cambioTracking = (visto.tracking || '') !== (p.tracking || '') && !!p.tracking;
      if (!cambioEstado && !cambioTracking) continue;
    }

    if (!p.email) {
      acciones.push({ pedido: p.pedido_corto, accion: 'sin_email', estado: p.estado });
      guardarVisto(p);
      continue;
    }

    const plantilla = plantillaDe(p.estado);
    // La clave de idempotencia incluye el tracking: si el numero de seguimiento
    // cambia, sale un correo nuevo; si no cambia nada, jamas sale dos veces.
    const clave = `pedido:${p.id}:${normal(p.estado)}:${p.tracking || '-'}`;

    const datos = {
      ...p,
      url_boton: `${SITIO}/pedidos/${p.id}`,
      texto_boton: normal(p.estado) === 'enviado' ? 'Seguir mi envío' : 'Ver mi pedido',
      preview: `Pedido #${p.pedido_corto} · ${p.total_f}`,
    };

    if (simular) {
      acciones.push({ pedido: p.pedido_corto, accion: 'simulado', estado: p.estado, plantilla, para: p.email });
      continue;
    }

    const r = encolar({
      para: p.email, para_nombre: p.cliente_completo || undefined,
      plantilla, datos, idempotencia: clave, origen: 'vigia',
      // Avisos de pedido: son transaccionales, van igual salvo rebote duro.
      forzar: normal(p.estado) !== 'pendiente',
    });

    acciones.push({
      pedido: p.pedido_corto, estado: p.estado, plantilla,
      accion: r.ok ? (r.duplicado ? 'ya_enviado' : 'encolado') : 'rechazado',
      motivo: r.motivo,
    });
    guardarVisto(p);
  }
  return acciones;
}

let reloj = null;
export function arrancarVigia(cadaMs = 60000) {
  if (reloj) return;
  reloj = setInterval(() => {
    revisar().then((a) => {
      const utiles = a.filter((x) => x.accion === 'encolado');
      if (utiles.length) console.log('[vigia]', JSON.stringify(utiles));
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

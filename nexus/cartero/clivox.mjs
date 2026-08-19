// Lectura de la base de Clivox (Supabase) para armar los correos.
// Usa service_role: salta el RLS, asi que este archivo NUNCA se expone al navegador.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pesos } from './plantillas.mjs';

const raiz = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(raiz, '.env'));

const URL_BASE = (process.env.CLIVOX_SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICIO = (process.env.CLIVOX_SUPABASE_SERVICE || '').trim();
if (!URL_BASE || !SERVICIO) throw new Error('Faltan CLIVOX_SUPABASE_URL / CLIVOX_SUPABASE_SERVICE en .env');

const H = { apikey: SERVICIO, Authorization: 'Bearer ' + SERVICIO };

async function rest(consulta) {
  const r = await fetch(`${URL_BASE}/rest/v1/${consulta}`, { headers: H });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

const CAMPOS = 'id,user_id,status,subtotal,shipping,total,shipping_address,payment_method,' +
  'created_at,updated_at,tracking,carrier,email,paid_at,' +
  'order_items(id,product_name,product_image,unit_price,quantity)';

// Email del usuario desde auth.users (respaldo cuando orders.email viene vacio).
const cacheUsuarios = new Map();
export async function usuario(userId) {
  if (!userId) return null;
  if (cacheUsuarios.has(userId)) return cacheUsuarios.get(userId);
  try {
    const r = await fetch(`${URL_BASE}/auth/v1/admin/users/${userId}`, { headers: H });
    if (!r.ok) return null;
    const u = await r.json();
    const dato = {
      email: u.email || null,
      nombre: u.user_metadata?.full_name || u.user_metadata?.name || null,
    };
    cacheUsuarios.set(userId, dato);
    return dato;
  } catch { return null; }
}

async function perfil(userId) {
  if (!userId) return null;
  try {
    const f = await rest(`profiles?id=eq.${userId}&select=full_name,phone&limit=1`);
    return f[0] || null;
  } catch { return null; }
}

function primerNombre(completo) {
  const n = String(completo || '').trim().split(/\s+/)[0];
  return n || null;
}

// Convierte una fila cruda de orders en el contexto que usan las plantillas.
// Estados que implican que la plata ya entro.
const ESTADOS_PAGADOS = new Set(['pagado', 'pagada', 'paid', 'preparando', 'procesando',
  'processing', 'enviado', 'enviada', 'shipped', 'entregado', 'entregada', 'delivered']);

// No hay un solo campo confiable: se mira paid_at, el id de pago de Mercado Pago
// y el propio estado. Con cualquiera de los tres, la venta se da por hecha.
function estaPagado(fila) {
  if (fila.paid_at) return true;
  if (fila.mp_payment_id) return true;
  const e = String(fila.status || '').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ESTADOS_PAGADOS.has(e);
}

export async function normalizar(fila) {
  const dir = fila.shipping_address || {};
  const [u, p] = await Promise.all([usuario(fila.user_id), perfil(fila.user_id)]);

  const email = (fila.email || u?.email || '').trim().toLowerCase() || null;
  const nombreCompleto = dir.nombre || p?.full_name || u?.nombre || '';

  const items = (fila.order_items || []).map((it) => ({
    nombre: it.product_name,
    imagen: it.product_image || '',
    cantidad: it.quantity,
    precio: pesos(it.unit_price),
    total: pesos((it.unit_price || 0) * (it.quantity || 1)),
  }));

  const partes = [dir.direccion, dir.comuna, dir.ciudad, dir.region].filter(Boolean);

  const creado = new Date(fila.created_at);
  const fecha = creado.toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
  });

  return {
    id: fila.id,
    email,
    estado: fila.status,
    created_at: fila.created_at,
    pagado: estaPagado(fila),
    paid_at: fila.paid_at || null,
    sin_items: (fila.order_items || []).length === 0,
    fecha,
    tracking: fila.tracking || '',
    carrier: fila.carrier || '',
    updated_at: fila.updated_at,
    // contexto para las plantillas
    cliente: primerNombre(nombreCompleto) || 'hola',
    cliente_completo: nombreCompleto || '',
    pedido_corto: String(fila.id).slice(0, 8).toUpperCase(),
    pago: fila.payment_method || 'el medio de pago elegido',
    items,
    subtotal_f: pesos(fila.subtotal),
    envio_f: (fila.shipping || 0) === 0 ? 'Gratis' : pesos(fila.shipping),
    total_f: pesos(fila.total),
    direccion: partes.join(', '),
    telefono: dir.telefono || p?.phone || '',
  };
}

export async function pedido(id) {
  const f = await rest(`orders?id=eq.${encodeURIComponent(id)}&select=${CAMPOS}&limit=1`);
  return f[0] ? normalizar(f[0]) : null;
}

// Pedidos tocados desde una fecha ISO (lo que revisa el vigia en cada vuelta).
export async function pedidosDesde(desdeISO, limite = 200) {
  const f = await rest(`orders?updated_at=gte.${encodeURIComponent(desdeISO)}` +
    `&select=${CAMPOS}&order=updated_at.asc&limit=${limite}`);
  return Promise.all(f.map(normalizar));
}

export async function ping() {
  const f = await rest('orders?select=id&limit=1');
  return Array.isArray(f);
}

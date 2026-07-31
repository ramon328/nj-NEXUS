// conector-gastos — registra GASTOS en la BD nueva de MallorcAutos (Supabase
// cwspnqzrhdunwmqontjp). Dos destinos según el gasto:
//   • gasto de un AUTO  → se agrega al jsonb `vehiculos.gastos` de esa patente
//   • gasto GENERAL     → fila en la tabla `gastos`
// Escritura con simula-primero: si no viene { confirmar:true } hace DRY-RUN.
// No mueve plata: solo deja el gasto con su medioPago (el pago lo hace un humano).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function cargarEnv() {
  try {
    const txt = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    for (const l of txt.split('\n')) {
      const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* usa el env del proceso */ }
}
cargarEnv();

const SUPA = (process.env.GASTOS_SUPA_URL || '').replace(/\/$/, '');
const KEY = process.env.GASTOS_SUPA_SERVICE || process.env.GASTOS_SUPA_ANON || '';
const H = () => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' });

// Categorías recomendadas (guía, no obligatorias). Auto = las que suelen ir por vehículo.
export const CATEGORIAS_AUTO = ['Documentación', 'Transferencia', 'Mecánica', 'Repuestos', 'Detailing', 'Traslado', 'Peritaje', 'Otros'];
export const CATEGORIAS_GENERAL = ['Arriendo', 'Sueldos', 'Servicios', 'Marketing', 'Oficina', 'Impuestos', 'Otros'];

const nuevoId = () => 'nx_' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex');
const hoyISO = () => new Date().toISOString().slice(0, 10);

async function api(pathq, opts = {}) {
  const r = await fetch(`${SUPA}/rest/v1/${pathq}`, { ...opts, headers: { ...H(), ...(opts.headers || {}) } });
  const txt = await r.text();
  let body; try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200)}`);
  return body;
}

// Busca un vehículo por patente (exacta, sin espacios/guiones/puntos).
export async function buscarVehiculo(patente) {
  const pat = String(patente || '').toUpperCase().replace(/[\s.\-]/g, '');
  if (!pat) return null;
  const rows = await api(`vehiculos?patente=eq.${encodeURIComponent(pat)}&select=id,patente,marca,modelo,estado,gastos&limit=1`);
  return (Array.isArray(rows) && rows[0]) || null;
}

// Normaliza el objeto gasto que se guarda (mismo shape que ya usa la BD + extras).
function armarGasto(g) {
  return {
    id: nuevoId(),
    fecha: g.fecha || hoyISO(),
    monto: Math.round(Number(g.monto) || 0),
    categoria: g.categoria || 'Otros',
    documento: g.documento || (g.con_factura ? '' : 'sinfactura'),
    descripcion: g.descripcion || '',
    proveedor: g.proveedor || '',
    medioPago: g.medioPago || '',
  };
}

// GASTO DE UN AUTO → agrega al jsonb vehiculos.gastos de esa patente.
export async function registrarGastoAuto({ patente, confirmar = false, ...g }) {
  const v = await buscarVehiculo(patente);
  if (!v) return { ok: false, error: `No encontré el auto patente ${String(patente).toUpperCase()} en la BD.` };
  const gasto = armarGasto(g);
  const nuevos = [...(Array.isArray(v.gastos) ? v.gastos : []), gasto];
  if (!confirmar) {
    return { dry_run: true, destino: 'auto', patente: v.patente, vehiculo: `${v.marca} ${v.modelo}`.trim(), gasto, gastos_totales_quedarian: nuevos.length };
  }
  await api(`vehiculos?id=eq.${encodeURIComponent(v.id)}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ gastos: nuevos, updatedAt: new Date().toISOString() }),
  });
  return { ok: true, destino: 'auto', patente: v.patente, vehiculo: `${v.marca} ${v.modelo}`.trim(), gasto };
}

// GASTO GENERAL → fila en la tabla gastos.
export async function registrarGastoGeneral({ confirmar = false, ...g }) {
  const gasto = armarGasto(g);
  const fila = { ...gasto, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  if (!confirmar) return { dry_run: true, destino: 'general', gasto };
  await api('gastos', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(fila) });
  return { ok: true, destino: 'general', gasto };
}

// CLI para pruebas: node gastos.mjs veh <patente> | buscar <patente>
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...a] = process.argv.slice(2);
  const run = async () => {
    if (cmd === 'buscar') return console.log(JSON.stringify(await buscarVehiculo(a[0]), null, 1));
    if (cmd === 'cats') return console.log(JSON.stringify({ auto: CATEGORIAS_AUTO, general: CATEGORIAS_GENERAL }));
    console.log('uso: buscar <patente> | cats');
  };
  run().catch((e) => { console.error(e.message); process.exit(1); });
}

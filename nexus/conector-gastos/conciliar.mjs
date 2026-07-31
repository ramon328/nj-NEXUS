// conector-gastos/conciliar.mjs — CONCILIACIÓN diaria sobre la BD nueva de MallorcAutos.
// Cruza las facturas del SII (tabla facturas_sii, ya sincronizada por la app) con los
// movimientos del banco (tabla movimientos_banco). Reusa el MOTOR de match del SAI
// (conector-sai/src/conciliar.js: scoring por monto/RUT/nombre/fecha, greedy determinista).
//   • revisar → lee y propone matches + duplicados (SOLO LECTURA, no escribe).
//   • aplicar → marca movimientos_banco.conciliado=true + referencia en los matches (confirmar:true).
// BANCO: por ahora los movimientos se cargan a la BD por fuera (cartola). Cuando el banco
// esté automático, esa sync alimenta la misma tabla y esto no cambia.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { conciliar as motorConciliar, panelControl, clp } from '../conector-sai/src/conciliar.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
(function cargarEnv() {
  try {
    for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
      const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* usa env del proceso */ }
})();

const SUPA = (process.env.GASTOS_SUPA_URL || '').replace(/\/$/, '');
const KEY = process.env.GASTOS_SUPA_SERVICE || process.env.GASTOS_SUPA_ANON || '';
const H = () => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' });

async function api(pathq, opts = {}) {
  const r = await fetch(`${SUPA}/rest/v1/${pathq}`, { ...opts, headers: { ...H(), ...(opts.headers || {}) } });
  const txt = await r.text();
  let body; try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${String(txt).slice(0, 160)}`);
  return body;
}

const periodoDe = (f) => String(f || '').slice(0, 7).replace('-', '');

// Lee facturas del SII y movimientos del banco en el rango [desde, hasta] (YYYY-MM-DD).
async function cargar(desde, hasta) {
  const q = (t) => `${t}?fecha=gte.${desde}&fecha=lte.${hasta}&limit=5000`;
  const [fac, mov] = await Promise.all([
    api(`${q('facturas_sii')}&select=id,tipoDoc,folio,rut,razonSocial,fecha,montoTotal,tipo`),
    api(`${q('movimientos_banco')}&select=id,fecha,descripcion,monto,conciliado&order=fecha.desc`),
  ]);
  return { fac: fac || [], mov: mov || [] };
}

// Mapea al formato que espera el motor del SAI.
function aDocs(fac) {
  return fac.map((d) => ({
    operacion: String(d.tipo || '').toUpperCase() === 'VENTA' ? 'VENTA' : 'COMPRA',
    periodo: periodoDe(d.fecha), folio: String(d.folio || ''), rut: d.rut,
    razon: d.razonSocial, fecha: d.fecha, monto: Number(d.montoTotal) || 0, _id: d.id, _tipoDoc: d.tipoDoc,
  }));
}
const aMovs = (mov) => mov.map((m) => ({ id: m.id, amount: Number(m.monto) || 0, description: m.descripcion, fecha: m.fecha, _conc: m.conciliado }));

// Duplicados de SII: misma (rut, monto, tipo) más de una vez, o mismo (folio, rut).
function duplicados(fac) {
  const byKey = new Map();
  for (const d of fac) {
    const k = `${(d.rut || '').replace(/\D/g, '')}|${d.montoTotal}|${d.tipo}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(d);
  }
  return [...byKey.values()].filter((g) => g.length > 1)
    .map((g) => ({ rut: g[0].rut, razon: g[0].razonSocial, monto: g[0].montoTotal, tipo: g[0].tipo, veces: g.length, folios: g.map((x) => x.folio) }));
}

export async function revisar({ desde, hasta } = {}) {
  const { fac, mov } = await cargar(desde, hasta);
  const docs = aDocs(fac), movs = aMovs(mov);
  const matches = motorConciliar(docs, movs);
  const panel = panelControl(docs, movs, matches);
  const dups = duplicados(fac);
  const automaticos = matches.filter((m) => m.score >= 100);   // 100% coincide → pasan solos
  const porValidar = matches.filter((m) => m.score < 100);      // el resto lo valida la persona
  const fmt = (m) => ({ score: m.score, doc: `${m.doc.operacion} ${m.doc._tipoDoc || ''} folio ${m.doc.folio} · ${m.doc.razon} · ${clp(m.doc.monto)}`, banco: `${m.mov.fecha} ${clp(m.mov.amount)} ${String(m.mov.description || '').slice(0, 30)}`, motivo: m.motivo });
  return {
    ok: true, rango: { desde, hasta },
    totales: { facturas: fac.length, movimientos: mov.length, ya_conciliados: mov.filter((m) => m.conciliado).length },
    cobertura: { por_cantidad: panel.coberturaCant + '%', por_monto: panel.coberturaMonto + '%' },
    concilian_automatico: { cantidad: automaticos.length, nota: 'coinciden al 100% → se marcan solos con accion:"aplicar"' },
    para_validar: { cantidad: porValidar.length, nota: 'NO llegan al 100% → los tiene que revisar la persona', items: porValidar.slice(0, 12).map(fmt) },
    sin_conciliar_docs: panel.docsSinMatch,
    sin_conciliar_banco: panel.movsSinMatch,
    duplicados: dups,
    top_automaticos: automaticos.slice(0, 12).map(fmt),
  };
}

// Marca en la BD los movimientos conciliados (score >= minScore). Guarda en `referencia`
// el documento SII con el que casó. Solo con confirmar:true.
export async function aplicar({ desde, hasta, minScore = 100, confirmar = false } = {}) {
  const { fac, mov } = await cargar(desde, hasta);
  const matches = motorConciliar(aDocs(fac), aMovs(mov)).filter((m) => m.score >= minScore);
  if (!confirmar) return { dry_run: true, a_marcar: matches.length, minScore, ejemplos: matches.slice(0, 8).map((m) => ({ score: m.score, banco: `${m.mov.fecha} ${clp(m.mov.amount)}`, doc: `folio ${m.doc.folio} ${m.doc.razon}` })) };
  let ok = 0;
  for (const m of matches) {
    const referencia = { tipo: 'sii', operacion: m.doc.operacion, folio: m.doc.folio, rut: m.doc.rut, razon: m.doc.razon, monto: m.doc.monto, score: m.score, conciliadoEl: new Date().toISOString() };
    try {
      await api(`movimientos_banco?id=eq.${encodeURIComponent(m.mov.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ conciliado: true, referencia, updatedAt: new Date().toISOString() }) });
      ok++;
    } catch { /* sigue con el resto */ }
  }
  return { ok: true, marcados: ok, de: matches.length, minScore };
}

// Devuelve, compacto, lo que NO cuadró (para pasarlo a la IA que sugiere categoría/match).
// Solo egresos del banco sin conciliar (los gastos) y docs de compra sin conciliar.
export async function pendientes({ desde, hasta, limite = 30 } = {}) {
  const { fac, mov } = await cargar(desde, hasta);
  const matches = motorConciliar(aDocs(fac), aMovs(mov));
  const movUsados = new Set(matches.map((m) => m.mov.id));
  const egresos = mov.filter((m) => !movUsados.has(m.id) && (Number(m.monto) || 0) < 0)
    .sort((a, b) => Math.abs(b.monto) - Math.abs(a.monto)).slice(0, limite)
    .map((m) => ({ id: m.id, fecha: String(m.fecha).slice(0, 10), monto: Number(m.monto) || 0, descripcion: String(m.descripcion || '').slice(0, 60) }));
  return { rango: { desde, hasta }, egresos_sin_conciliar: egresos };
}

// Importa a movimientos_banco los movimientos de una cartola ya parseada (importar_cartola.py).
// Dedup por fecha+monto+descripcion contra lo que ya hay. confirmar:true escribe.
const keyMov = (m) => `${String(m.fecha).slice(0, 10)}|${Number(m.monto) || 0}|${String(m.descripcion || '').replace(/\s+/g, ' ').trim().toUpperCase()}`;
export async function importarCartola({ movimientos = [], cuenta = '', confirmar = false } = {}) {
  const movs = (movimientos || []).filter((m) => m && m.fecha);
  if (!movs.length) return { ok: false, error: 'La cartola no trajo movimientos legibles.' };
  const fechas = movs.map((m) => String(m.fecha).slice(0, 10)).sort();
  const desde = fechas[0], hasta = fechas[fechas.length - 1];
  const existentes = await api(`movimientos_banco?fecha=gte.${desde}&fecha=lte.${hasta}&select=fecha,monto,descripcion&limit=5000`).catch(() => []);
  const yaHay = new Set((existentes || []).map(keyMov));
  const nuevos = [], dup = [];
  const seen = new Set();
  for (const m of movs) {
    const k = keyMov(m);
    if (yaHay.has(k) || seen.has(k)) { dup.push(m); continue; }
    seen.add(k); nuevos.push(m);
  }
  if (!confirmar) return { dry_run: true, rango: { desde, hasta }, total_cartola: movs.length, nuevos: nuevos.length, duplicados: dup.length, ejemplos: nuevos.slice(0, 6).map((m) => ({ fecha: m.fecha, monto: m.monto, desc: String(m.descripcion || '').slice(0, 40) })) };
  const ts = new Date().toISOString();
  const filas = nuevos.map((m, i) => ({
    id: `ct_${Date.now().toString(36)}${i}`, fecha: String(m.fecha).slice(0, 10), descripcion: String(m.descripcion || '').slice(0, 300),
    monto: Number(m.monto) || 0, saldo: Number(m.saldo) || 0, documento: String(m.documento || ''), cuenta: cuenta || '',
    conciliado: false, importadoEl: ts, createdAt: ts, updatedAt: ts,
  }));
  let ins = 0;
  for (let i = 0; i < filas.length; i += 200) {
    const lote = filas.slice(i, i + 200);
    try { await api('movimientos_banco', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(lote) }); ins += lote.length; } catch (e) { return { ok: false, error: `Inserté ${ins} y falló: ${e.message}` }; }
  }
  return { ok: true, insertados: ins, duplicados_omitidos: dup.length, rango: { desde, hasta } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, desde, hasta] = process.argv.slice(2);
  const run = async () => {
    if (cmd === 'revisar') return console.log(JSON.stringify(await revisar({ desde, hasta }), null, 1));
    if (cmd === 'aplicar') return console.log(JSON.stringify(await aplicar({ desde, hasta, confirmar: false }), null, 1));
    console.log('uso: revisar <desde> <hasta> | aplicar <desde> <hasta>');
  };
  run().catch((e) => { console.error(e.message); process.exit(1); });
}

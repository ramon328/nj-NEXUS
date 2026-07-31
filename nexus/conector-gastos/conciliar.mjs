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
  return {
    ok: true, rango: { desde, hasta },
    totales: { facturas: fac.length, movimientos: mov.length, ya_conciliados: mov.filter((m) => m.conciliado).length },
    matches_propuestos: matches.length,
    cobertura: { por_cantidad: panel.coberturaCant + '%', por_monto: panel.coberturaMonto + '%' },
    sin_conciliar_docs: panel.docsSinMatch,
    sin_conciliar_banco: panel.movsSinMatch,
    duplicados: dups,
    top_matches: matches.slice(0, 15).map((m) => ({ score: m.score, doc: `${m.doc.operacion} ${m.doc._tipoDoc || ''} folio ${m.doc.folio} · ${m.doc.razon} · ${clp(m.doc.monto)}`, banco: `${m.mov.fecha} ${clp(m.mov.amount)} ${String(m.mov.description || '').slice(0, 30)}`, motivo: m.motivo })),
  };
}

// Marca en la BD los movimientos conciliados (score >= minScore). Guarda en `referencia`
// el documento SII con el que casó. Solo con confirmar:true.
export async function aplicar({ desde, hasta, minScore = 60, confirmar = false } = {}) {
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, desde, hasta] = process.argv.slice(2);
  const run = async () => {
    if (cmd === 'revisar') return console.log(JSON.stringify(await revisar({ desde, hasta }), null, 1));
    if (cmd === 'aplicar') return console.log(JSON.stringify(await aplicar({ desde, hasta, confirmar: false }), null, 1));
    console.log('uso: revisar <desde> <hasta> | aplicar <desde> <hasta>');
  };
  run().catch((e) => { console.error(e.message); process.exit(1); });
}

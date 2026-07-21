// Orquestación — §9. 7 fases, caché 3 min. Junta SII + banco + Mallorca y concilia.
import { CONFIG, PERIODO_DESDE, CACHE_MS } from "./config.js";
import { fetchDocsSII } from "./sii.js";
import { fetchBancoPorRut } from "./bank.js";
import { fetchComprasMallorca, indexarMallorca, refMallorca } from "./mallorca.js";
import { conciliar, contar, panelControl } from "./conciliar.js";

let _cache = null, _cacheTs = 0;

export function invalidarCache() { _cache = null; _cacheTs = 0; }

export async function getEstado(rut = CONFIG.rut) {
  const now = Date.now();
  if (_cache && now - _cacheTs < CACHE_MS) return _cache;

  // FASE 1: fetch paralelo (ninguno lanza)
  const [docsTodos, banco, comprasMallorca] = await Promise.all([
    CONFIG.siiEmpresaId != null ? fetchDocsSII(CONFIG.siiEmpresaId) : Promise.resolve([]),
    fetchBancoPorRut(rut),
    fetchComprasMallorca().catch(() => []),
  ]);

  // FASE 2: filtrar por PERIODO_DESDE (strings YYYYMM)
  const docs = docsTodos.filter((d) => (d.periodo || "") >= PERIODO_DESDE);

  // FASE 3: enriquecer con Mallorca
  if (comprasMallorca.length > 0) {
    const idx = indexarMallorca(comprasMallorca);
    for (const d of docs) { const ref = refMallorca(d, idx); if (ref) d.mallorca = ref; }
  }

  // FASE 4: conciliar (MVP sin decisiones manuales → todos "propuesto")
  const matches = conciliar(docs, banco.movimientos);

  // FASE 5: panel de control
  const control = panelControl(docs, banco.movimientos, matches);

  // FASE 6: armar facturas (clave 5 partes; primera ocurrencia gana)
  const pagoPorDoc = new Map();
  for (const m of matches) {
    const k = `${m.doc.operacion}:${m.doc.periodo}:${m.doc.folio}:${m.doc.rut}:${m.doc.monto}`;
    if (!pagoPorDoc.has(k)) pagoPorDoc.set(k, m);
  }
  const facturas = docs.map((d) => {
    const m = pagoPorDoc.get(`${d.operacion}:${d.periodo}:${d.folio}:${d.rut}:${d.monto}`);
    return m
      ? { doc: d, estado: "banco", pago: { amount: m.mov.amount, fecha: m.mov.fecha, descripcion: m.mov.description, score: m.score } }
      : { doc: d, estado: "sin" };
  });

  // FASE 7: resumen
  const resumen = {
    empresa: {
      rut: CONFIG.rut, nombre: CONFIG.nombre, siiEmpresaId: CONFIG.siiEmpresaId,
      siiConectado: docsTodos.length > 0, bancoConectado: banco.conectado, cuentas: banco.cuentas,
    },
    totalDocs: docs.length,
    totalMovimientos: banco.movimientos.length,
    movimientosConRut: banco.movimientos.filter((m) => m.rutGlosa).length,
    matches,
    contadores: contar(matches),
    control,
    facturas,
    _comprasMallorca: comprasMallorca,   // para la tool mallorca_hoja/stock
    _movimientos: banco.movimientos,     // para la tool movimientos_banco
  };

  _cache = resumen; _cacheTs = now;
  return resumen;
}

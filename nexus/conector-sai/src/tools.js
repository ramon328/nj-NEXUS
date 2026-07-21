// Herramientas de SAI que leen del estado (§11). Devuelven objetos JS listos para
// que el asistente de Nexus los serialice. Se usan igual en WhatsApp y web.
import { getEstado, invalidarCache } from "./estado.js";
import { buildSnapshot } from "./snapshot.js";
import { normRut, formatRut, soloDigitos, limpiar } from "./rut.js";
import { cleanName } from "./conciliar.js";

// 1) Resumen/snapshot completo de la conciliación.
export async function saiConciliacion() {
  const e = await getEstado();
  return buildSnapshot(e);
}

// 2) Buscar factura por folio / rut / proveedor.
export async function saiBuscarFactura({ folio, rut, proveedor } = {}) {
  const e = await getEstado();
  const fol = folio ? soloDigitos(folio) : null;
  const rn = rut ? normRut(rut) : null;
  const prov = proveedor ? cleanName(proveedor) : null;
  const res = e.facturas.filter((f) => {
    if (fol && soloDigitos(f.doc.folio) !== fol) return false;
    if (rn && normRut(f.doc.rut) !== rn) return false;
    if (prov && !cleanName(f.doc.razon).includes(prov)) return false;
    return true;
  }).slice(0, 20).map((f) => ({
    folio: f.doc.folio, rut: formatRut(f.doc.rut), proveedor: f.doc.razon,
    monto: f.doc.monto, fecha: f.doc.fecha,
    estado: f.estado === "banco" ? "Pagada" : "Sin pago",
    pago: f.pago ? { monto: f.pago.amount, fecha: (f.pago.fecha || "").slice(0, 10), descripcion: f.pago.descripcion, score: f.pago.score } : null,
  }));
  return { total: res.length, facturas: res };
}

// 3) Movimientos del banco (solo junio-julio). Filtros desde/hasta/min_monto/tipo.
export async function saiMovimientosBanco({ desde, hasta, min_monto, tipo } = {}) {
  const e = await getEstado();
  // movimientos crudos del estado: reconstruimos desde matches+control no; usamos banco directo.
  const movs = e._movimientos || movimientosDe(e);
  const dd = desde ? String(desde).slice(0, 10) : null;
  const hh = hasta ? String(hasta).slice(0, 10) : null;
  const res = movs.filter((m) => {
    const f = String(m.fecha || "").slice(0, 10);
    if (dd && f < dd) return false;
    if (hh && f > hh) return false;
    if (min_monto != null && Math.abs(m.amount) < Number(min_monto)) return false;
    if (tipo === "ingreso" && !(m.amount > 0)) return false;
    if (tipo === "egreso" && !(m.amount < 0)) return false;
    return true;
  }).sort((a, b) => (String(b.fecha) < String(a.fecha) ? -1 : 1)).slice(0, 30).map((m) => ({
    fecha: String(m.fecha || "").slice(0, 10), monto: m.amount, glosa: m.description,
    tipo: m.amount > 0 ? "ingreso" : "egreso",
  }));
  return { total: res.length, nota: "El banco solo trae junio-julio.", movimientos: res };
}

// helper: lista de movimientos del estado (los expone estado.js en _movimientos)
function movimientosDe(e) {
  // fallback: reconstruye de matches + movsSinMatch no es fiable; estado.js expone la lista.
  return e._movimientos || [];
}

// 4) Filas de Mallorca (compras de autos). Filtros patente/folio.
export async function saiMallorcaHoja({ patente, folio } = {}) {
  const e = await getEstado();
  const compras = e._comprasMallorca || [];
  if (!compras.length) return { total: 0, filas: [], nota: "Excel de Mallorca no disponible ahora" };
  const pat = patente ? limpiar(patente).replace(/-\d$/, "") : null;
  const fol = folio ? soloDigitos(folio) : null;
  const res = compras.filter((c) => {
    if (pat && !limpiar(c.patente).includes(pat)) return false;
    if (fol && soloDigitos(c.folio) !== fol) return false;
    return true;
  }).slice(0, 20).map((c) => ({ folio: c.folio, patente: c.patente, marca: c.marca, modelo: c.modelo, fecha: c.fecha, total: c.total, costo: c.costo }));
  return { total: res.length, filas: res };
}

// 5) Stock agregado de Mallorca.
export async function saiStockMallorca() {
  const e = await getEstado();
  const compras = e._comprasMallorca || [];
  if (!compras.length) return { autos: 0, totalCLP: 0, costoCLP: 0, nota: "Excel de Mallorca no disponible ahora" };
  return {
    autos: compras.length,
    totalCLP: compras.reduce((a, c) => a + (Number(c.total) || 0), 0),
    costoCLP: compras.reduce((a, c) => a + (Number(c.costo) || 0), 0),
  };
}

export { invalidarCache };

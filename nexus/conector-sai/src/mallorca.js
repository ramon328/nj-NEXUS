// MALLORCA — §6. Excel de compras de autos (API local puerto 7691). Tolera fallo con [].
import { MALLORCA_API_URL, MALLORCA_API_TOKEN } from "./config.js";
import { soloDigitos, limpiar } from "./rut.js";

const num = (v) => (typeof v === "number" ? v : parseInt(soloDigitos(v), 10) || 0);

export async function fetchComprasMallorca() {
  try {
    const nombre = encodeURIComponent("COMPRAS DE AUTOS");
    const r = await fetch(`${MALLORCA_API_URL}/mallorca/hoja?nombre=${nombre}&limite=500`, {
      headers: { Authorization: `Bearer ${MALLORCA_API_TOKEN}` },
      cache: "no-store",
    });
    if (!r.ok) return [];
    const j = await r.json().catch(() => null);
    const filas = Array.isArray(j?.filas) ? j.filas : [];
    return filas.map((r) => ({
      folio: soloDigitos(r["Nº DE FACTURA"]),
      fecha: limpiar(r["FECHA"]),
      patente: limpiar(r["PATENTE"]).replace(/-\d$/, ""),
      marca: limpiar(r["MARCA"]),
      modelo: limpiar(r["MODELO"]),
      total: num(r["TOTAL"]),
      costo: num(r["COSTO"]),
    }));
  } catch {
    return [];
  }
}

export function indexarMallorca(compras) {
  const porFolio = new Map();
  const porMonto = new Map();
  for (const c of compras) {
    const k = soloDigitos(c.folio);
    if (k && !porFolio.has(k)) porFolio.set(k, c);
    if (!porMonto.has(c.total)) porMonto.set(c.total, c);
    if (!porMonto.has(c.costo)) porMonto.set(c.costo, c);
  }
  return { porFolio, porMonto };
}

export function refMallorca(doc, idx) {
  const porFolio = idx.porFolio.get(soloDigitos(doc.folio));
  if (porFolio) return { patente: porFolio.patente, marca: porFolio.marca, modelo: porFolio.modelo, fecha: porFolio.fecha, via: "folio" };
  const porMonto = idx.porMonto.get(doc.monto);
  if (porMonto) return { patente: porMonto.patente, marca: porMonto.marca, modelo: porMonto.modelo, fecha: porMonto.fecha, via: "monto" };
  return null;
}

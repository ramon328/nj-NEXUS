// SII — §4. Descarga facturas del backend nj-bc-sii. NO lanza: [] ante error.
import { SII_BACKEND_URL, SII_API_TOKEN, SII_RCV_DESDE, SII_RCV_HASTA, mesActualYYYYMM } from "./config.js";
import { normRut, toISO, soloDigitos } from "./rut.js";

function parseMonto(m) {
  if (typeof m === "number") return Math.round(m);
  const s = String(m ?? "");
  return parseInt(s.replace(/[^0-9-]/g, ""), 10) || 0;
}

function normPeriodo(p) {
  const s = String(p ?? "").replace(/\D/g, "");
  return s.length === 6 ? s : "";
}

const headers = () => ({ "X-API-Token": SII_API_TOKEN });

// Parser CSV: delimitador ';', comillas '"' (cierra en la siguiente '"'), quita BOM.
function parseCsv(texto) {
  const t = String(texto || "").replace(/^﻿/, "");
  const filas = [];
  let fila = [], campo = "", quoted = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === ";" && !quoted) { fila.push(campo.trim()); campo = ""; continue; }
    if ((ch === "\n" || ch === "\r") && !quoted) {
      if (campo !== "" || fila.length) { fila.push(campo.trim()); filas.push(fila); fila = []; campo = ""; }
      continue;
    }
    campo += ch;
  }
  if (campo !== "" || fila.length) { fila.push(campo.trim()); filas.push(fila); }
  return filas;
}

function idxCol(headerRow, patrones) {
  for (const pat of patrones) {
    const i = headerRow.findIndex((h) => pat.test(h));
    if (i >= 0) return i;
  }
  return -1;
}

async function fetchViaCsv(empresaId) {
  const r = await fetch(`${SII_BACKEND_URL}/api/empresas/${empresaId}/documentos`, { headers: headers(), cache: "no-store" });
  if (!r.ok) return [];
  const files = await r.json();
  const csvFiles = (Array.isArray(files) ? files : []).filter(
    (f) => f.tipo === "csv" && /detalle\.csv$/.test(f.ruta) && (f.grupo === "compra" || f.grupo === "venta")
  );
  const out = [];
  for (const file of csvFiles) {
    let texto = "";
    try {
      const rr = await fetch(`${SII_BACKEND_URL}/api/empresas/${empresaId}/archivo?ruta=${encodeURIComponent(file.ruta)}`, { headers: headers(), cache: "no-store" });
      if (!rr.ok) continue;
      texto = await rr.text();
    } catch { continue; }
    const filas = parseCsv(texto);
    if (filas.length < 2) continue;
    const H = filas[0];
    const cRut = idxCol(H, [/rut\s*(proveedor|cliente|contraparte|emisor|receptor)/i, /^rut/i]);
    const cRazon = idxCol(H, [/razon\s*social/i, /raz/i]);
    const cFolio = idxCol(H, [/folio/i]);
    const cFecha = idxCol(H, [/fecha\s*docto/i, /fecha/i]);
    const cMonto = idxCol(H, [/monto\s*total/i, /total/i]);
    const operacion = file.grupo === "venta" ? "VENTA" : "COMPRA";
    for (let i = 1; i < filas.length; i++) {
      const row = filas[i];
      const rut = cRut >= 0 ? row[cRut] : "";
      if (!rut) continue;
      out.push({
        origen: "sii", operacion,
        periodo: normPeriodo(file.periodo),
        rut: normRut(rut),
        razon: cRazon >= 0 ? (row[cRazon] || "") : "",
        folio: cFolio >= 0 ? (row[cFolio] || "") : "",
        fecha: toISO(cFecha >= 0 ? row[cFecha] : ""),
        monto: parseMonto(cMonto >= 0 ? row[cMonto] : 0),
      });
    }
  }
  return out;
}

export async function fetchDocsSII(empresaId) {
  try {
    const desde = SII_RCV_DESDE;
    const hasta = SII_RCV_HASTA || mesActualYYYYMM();
    const r = await fetch(`${SII_BACKEND_URL}/api/empresas/${empresaId}/rcv?desde=${desde}&hasta=${hasta}&op=AMBAS`, { headers: headers(), cache: "no-store" });
    if (r.ok) {
      const j = await r.json().catch(() => null);
      const docs = Array.isArray(j?.documentos) ? j.documentos : [];
      if (docs.length) {
        return docs.filter((d) => d && d.rut).map((d) => ({
          origen: "sii",
          operacion: d.operacion,
          periodo: normPeriodo(d.periodo),
          rut: normRut(d.rut),
          razon: String(d.razon ?? ""),
          folio: String(d.folio ?? ""),
          fecha: toISO(d.fecha),
          monto: parseMonto(d.monto),
          tipo: d.tipo,
        }));
      }
    }
    // Fallback CSV si el JSON dio 404 o sin documentos.
    return await fetchViaCsv(empresaId);
  } catch {
    return [];
  }
}

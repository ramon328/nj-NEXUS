// Utilidades de RUT chileno y fecha. Copiado EXACTO del §7 del prompt "El Loop".
// No "mejorar" nada aquí: la equivalencia byte-a-byte depende de estos algoritmos.

export function dv(body) {
  let s = 0, m = 2;
  for (const ch of String(body).split("").reverse()) {
    s += parseInt(ch, 10) * m;
    m = m === 7 ? 2 : m + 1;   // CICLO 2-7: cuando m==7, vuelve a 2 (NO 3)
  }
  const r = 11 - (s % 11);
  return r === 11 ? "0" : r === 10 ? "K" : String(r);
}

export function normRut(raw) {
  const r = (raw || "").replace(/[^0-9kK]/g, "").toUpperCase();
  if (r.length < 2) return "";
  return `${parseInt(r.slice(0, -1), 10)}-${r.slice(-1)}`;
}

export function formatRut(raw) {
  const n = normRut(raw);
  if (!n) return raw;
  const [body, d] = n.split("-");
  return `${Number(body).toLocaleString("es-CL")}-${d}`;
}

export function isValidRut(raw) {
  const n = normRut(raw);
  if (!n) return false;
  const [body, d] = n.split("-");
  return dv(body) === d;
}

export function extractRut(desc) {
  const d = desc || "";
  // Formato 1: con puntos y guión → 78.302.808-5 (en cualquier parte de la glosa)
  const m1 = d.match(/(\d{1,2}\.\d{3}\.\d{3})-([\dkK])/);
  if (m1) return `${parseInt(m1[1].replace(/\./g, ""), 10)}-${m1[2].toUpperCase()}`;
  // Formato 2: prefijo 0 + 7-8 dígitos + DV, VALIDA el DV, ANCLADO al inicio (^)
  const m2 = d.match(/^0(\d{7,8}[\dkK])\b/);
  if (m2) {
    const raw = m2[1];
    const body = raw.slice(0, -1);
    const d1 = raw.slice(-1).toUpperCase();
    if (dv(body) === d1) return `${parseInt(body, 10)}-${d1}`;
  }
  return null;
}

export function toISO(f) {
  if (!f) return "";
  const s = String(f).trim().slice(0, 10);            // 1) corta a 10 chars PRIMERO
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);   // 2) luego matchea, regex ANCLADO con $
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;                                           // ya-ISO (o lo que quede de los 10 chars)
}

// Utilidades de string usadas por SII/Mallorca (definidas aquí para reuso).
export const soloDigitos = (x) => String(x ?? "").replace(/\D/g, "");
export const limpiar = (x) => String(x ?? "").replace(/\s+/g, " ").trim();

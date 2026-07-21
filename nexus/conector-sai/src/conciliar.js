// EL MOTOR DE CONCILIACIÓN — §8 del prompt "El Loop". Byte-a-byte con la app SAI.
// Cualquier desviación (constante, guarda, orden de sort/desempate) rompe la equivalencia.
import { normRut, extractRut } from "./rut.js";

// 8.1 Constantes
export const VENTANA_DIAS = 7;
export const UMBRAL_PAR = 35;        // score mínimo para ser candidato
export const SIM_NOMBRE = 0.72;      // umbral de similitud de nombre
export const APROX_PCT = 0.01;       // diff/monto <= 1% = aproximado
export const PTS_MONTO_EXACTO = 48;
export const PTS_MONTO_APROX  = 30;
export const PTS_RUT          = 44;
export const PTS_NOMBRE       = 26;
export const CAP_SOLO_RUT     = 50;

// 8.2 Formato de montos (es-CL, CLP entero)
const _clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
export function clp(n) { return _clp.format(Number(n) || 0); }

// 8.3 Limpieza de nombres
function stripAccents(s) {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
}
const STOP = [" SPA", " S.A.", " SA ", " LTDA", " LIMITADA", " EIRL",
  " E.I.R.L", " Y CIA", " EMPRESA", " SOCIEDAD", " COMERCIAL", " INVERSIONES"];
export function cleanName(input) {
  let r = stripAccents(String(input || ""));
  r = ` ${r.toUpperCase()} `;                 // rodea con espacios ANTES de quitar STOP
  for (const w of STOP) r = r.split(w).join(" ");
  r = r.replace(/TRANSF(ERENCIA)?\.?|TEF|ABONO|PAGO|INTERNET|CUENTA|CTA/g, " ");
  r = r.replace(/[^A-Z ]/g, " ");
  r = r.replace(/\s+/g, " ").trim();
  return r;
}
export function nameFromGlosa(desc) {
  const sinPrimer = String(desc || "").replace(/^\S+\s+/, "");  // quita primer token (RUT/nº cuenta)
  return cleanName(sinPrimer);
}

// 8.4 Similitud (Sørensen–Dice sobre bigramas) — ORDEN DE GUARDAS EXACTO
function bigrams(s) {
  const m = new Map();
  const t = s.replace(/\s+/g, "");            // quita espacios ANTES de generar bigramas
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}
export function similarity(a, b) {
  if (!a || !b) return 0;                     // 1) nulos/vacíos PRIMERO
  if (a === b) return 1;                      // 2) igualdad exacta DESPUÉS
  const A = bigrams(a), B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0; // 3) evita 0/0=NaN
  let inter = 0, total = 0;
  for (const [g, c] of A) { total += c; if (B.has(g)) inter += Math.min(c, B.get(g)); }
  for (const [, c] of B) total += c;
  return (2 * inter) / total;                 // el 2 es CRÍTICO
}

// 8.5 Fechas
function parseFecha(f) {
  const d = new Date(String(f).slice(0, 10));
  return isNaN(d.getTime()) ? null : d;
}
function diasEntre(a, b) {
  return Math.abs(Math.round((a.getTime() - b.getTime()) / 86400000));
}

// 8.6 puntuar(d, m)
export function puntuar(d, m) {
  // 1) signoOk: VENTA requiere amount>0; COMPRA requiere amount<0
  if (d.operacion === "VENTA" && !(m.amount > 0)) return null;
  if (d.operacion === "COMPRA" && !(m.amount < 0)) return null;
  // 2) monto del doc > 0
  if (d.monto <= 0) return null;
  // 3) señal fuerte
  const rutOk  = !!m._rut && m._rut === d.rut;
  const diff   = Math.abs(Math.abs(m.amount) - d.monto);
  const exacto = diff === 0;
  const aprox  = diff / d.monto <= APROX_PCT;
  const sim    = (!rutOk && d.razon && m._name) ? similarity(d.razon, m._name) : 0;
  const nombreOk = sim >= SIM_NOMBRE;
  if (!rutOk && !exacto && !aprox && !nombreOk) return null;  // sin señal fuerte
  // 4) fecha OBLIGATORIA
  if (!d.fecha || !m._fecha) return null;
  const dd = diasEntre(d.fecha, m._fecha);
  if (dd > VENTANA_DIAS) return null;

  let score = 0;
  const desglose = [];
  if (exacto) { score += PTS_MONTO_EXACTO; desglose.push({ factor: "Monto", detalle: `exacto ${clp(d.monto)}`, puntos: PTS_MONTO_EXACTO, ok: true }); }
  else if (aprox) { score += PTS_MONTO_APROX; desglose.push({ factor: "Monto", detalle: `≈ ${clp(d.monto)} vs ${clp(Math.abs(m.amount))}`, puntos: PTS_MONTO_APROX, ok: true }); }
  else desglose.push({ factor: "Monto", detalle: `${clp(d.monto)} vs ${clp(Math.abs(m.amount))}`, puntos: 0, ok: false });
  if (rutOk) { score += PTS_RUT; desglose.push({ factor: "RUT", detalle: d.rut, puntos: PTS_RUT, ok: true }); }
  if (nombreOk) { score += PTS_NOMBRE; desglose.push({ factor: "Nombre", detalle: `sim ${sim.toFixed(2)}`, puntos: PTS_NOMBRE, ok: true }); }
  const pFecha = Math.max(0, 12 - dd * 2);
  score += pFecha;
  desglose.push({ factor: "Fecha", detalle: `${dd} día(s)`, puntos: pFecha, ok: dd <= 2 });

  // cap "solo RUT"
  if (rutOk && !exacto && !aprox && !nombreOk) score = Math.min(score, CAP_SOLO_RUT);
  score = Math.max(0, Math.min(score, 100));

  let via = "B";
  if (rutOk) via = "A";
  else if (nombreOk && !exacto && !aprox) via = "C";

  const motivo = desglose.filter((x) => x.ok).map((x) => `${x.factor}: ${x.detalle}`);
  return { score, via, motivo, desglose };
}

// 8.7 conciliar — greedy global con desempate determinista
export function conciliar(docs, movimientos) {
  const movs = movimientos.map((m) => ({
    ...m,
    _rut: m.rutGlosa || extractRut(m.description),
    _name: nameFromGlosa(m.description),
    _fecha: parseFecha(m.fecha),
    _usado: false,
  }));
  const dps = docs.map((d) => ({
    ...d,
    rut: normRut(d.rut),
    fecha: parseFecha(d.fecha),
    razon: cleanName(d.razon),
    _usado: false,
  }));

  const pares = [];
  for (let di = 0; di < dps.length; di++) {
    for (let mi = 0; mi < movs.length; mi++) {
      const s = puntuar(dps[di], movs[mi]);
      if (s && s.score >= UMBRAL_PAR) pares.push({ ...s, di, mi });
    }
  }

  // score DESC; empate → di ASC; luego mi ASC.
  pares.sort((a, b) => (b.score - a.score) || (a.di - b.di) || (a.mi - b.mi));

  const matches = [];
  for (const p of pares) {
    const doc = dps[p.di], mov = movs[p.mi];
    if (doc._usado || mov._usado) continue;
    doc._usado = true; mov._usado = true;
    matches.push({
      id: `${doc.operacion}:${doc.periodo}:${doc.folio}:${mov.id}`,  // 4 partes con ':'
      score: p.score, via: p.via, motivo: p.motivo, desglose: p.desglose,
      doc, mov, estado: "propuesto",
    });
  }

  matches.sort((a, b) => (b.score - a.score) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return matches;
}

// 8.8 contar
export function contar(matches) {
  return {
    alto:  matches.filter((m) => m.score >= 90).length,
    medio: matches.filter((m) => m.score >= 60 && m.score < 90).length,
    bajo:  matches.filter((m) => m.score < 60).length,
  };
}

// 8.9 panelControl — definiciones exactas de la app
export function panelControl(docs, movimientos, matches) {
  const aprobados  = matches.filter((m) => m.estado === "aprobado");
  const propuestos = matches.filter((m) => m.estado === "propuesto");

  const montoDocsTotal   = docs.reduce((a, d) => a + d.monto, 0);
  const montoConciliado  = aprobados.reduce((a, m) => a + m.doc.monto, 0);   // aprobado → 0 sin decisiones
  const montoPropuesto   = propuestos.reduce((a, m) => a + m.doc.monto, 0);

  const pct = (part, whole) => whole > 0 ? Math.round((part / whole) * 100) : 0;
  const coberturaCant  = pct(matches.length, docs.length);
  const coberturaMonto = pct(matches.reduce((a, m) => a + m.doc.monto, 0), montoDocsTotal);

  const docsConMatch = new Set(matches.map((m) => `${m.doc.operacion}:${m.doc.periodo}:${m.doc.folio}:${m.doc.rut}:${m.doc.monto}`));
  const sinMatch = docs.filter((d) => !docsConMatch.has(`${d.operacion}:${d.periodo}:${d.folio}:${d.rut}:${d.monto}`));

  const enMallorca = sinMatch.filter((d) => d.mallorca);
  const confirmadasMallorca = { cantidad: enMallorca.length, monto: enMallorca.reduce((a, d) => a + d.monto, 0) };

  const top8 = [...sinMatch].sort((a, b) => b.monto - a.monto).slice(0, 8).map((d) => ({
    rut: d.rut, nombre: d.razon, monto: d.monto, fecha: d.fecha, ref: d.folio,
  }));

  const movIdsUsados = new Set(matches.map((m) => m.mov.id));
  const movsSinMatch = movimientos.filter((m) => !movIdsUsados.has(m.id));
  const ingresos = movsSinMatch.filter((m) => m.amount > 0).reduce((a, m) => a + m.amount, 0);
  const egresos  = movsSinMatch.filter((m) => m.amount < 0).reduce((a, m) => a + Math.abs(m.amount), 0);
  const topEgresos = movsSinMatch.filter((m) => m.amount < 0)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 8)
    .map((m) => ({ fecha: m.fecha, amount: m.amount, description: m.description }));

  return {
    coberturaCant, coberturaMonto,
    montoDocsTotal, montoConciliado, montoPropuesto,
    docsSinMatch: { cantidad: sinMatch.length, monto: sinMatch.reduce((a, d) => a + d.monto, 0), top8 },
    confirmadasMallorca,
    movsSinMatch: { cantidad: movsSinMatch.length, ingresos, egresos, topEgresos },
  };
}

// Servicios del SII que descargan a disco usando el TOKEN obtenido por certificado.
// El TOKEN se manda como cookie TOKEN=<valor> a los endpoints JSON del RCV
// (los mismos que ya mapeamos para la vía por clave).
//
// Exporta:
//   descargarRCV(rutConDv, periodo, operacion)  -> getResumen + getDetalle, guarda JSON + CSV
//   listarDTE(rutConDv, periodo, tipo)           -> DTE recibidos/emitidos (deriva del detalle RCV)
//
// Guardarraíles: throttle 1–2s, aborta ante 403/429 o texto de bloqueo, límite de requests.
// NO se ejecuta contra el SII en esta entrega (no hay .p12). Listo para cuando exista el cert.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getToken, UA } from './sii-cert-auth.mjs';

const SVC = 'https://www4.sii.cl/consdcvinternetui/services/data/facadeService';

// --- utilidades ---
export const pause = (min = 1000, max = 2000) =>
  new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

function credenciales() {
  return JSON.parse(fs.readFileSync(path.join(os.homedir(), 'nexus', 'credenciales.json'), 'utf8'));
}

function empresa(rutConDv) {
  const emp = credenciales().sii?.empresas?.[rutConDv];
  if (!emp) throw new Error(`RUT no está en credenciales.json: ${rutConDv}`);
  return emp;
}

// --- Guardarraíles anti-bloqueo (aunque el cert no bloquee, es buena práctica) ---
export class AbortoSeguridad extends Error {}
const LIMITE_REQUESTS = 60; // por proceso; más holgado que la vía clave, pero acotado
let siiRequests = 0;
const SENALES_BLOQUEO = ['bloquead', 'intentos', 'captcha', 'demasiad', 'clave temporal'];

function chequearBloqueo(status, texto) {
  if (status === 403 || status === 429) throw new AbortoSeguridad(`HTTP ${status} (posible bloqueo/rate-limit)`);
  const t = (texto || '').toLowerCase();
  for (const s of SENALES_BLOQUEO) if (t.includes(s)) throw new AbortoSeguridad(`respuesta contiene "${s}"`);
}

function metaData(metodo) {
  return {
    namespace: `cl.sii.sdi.lob.diii.consdcv.data.api.interfaces.FacadeService/${metodo}`,
    conversationId: '16',
    transactionId: String(Date.now()),
    page: null,
  };
}

// POST a un método del FacadeService con cookie TOKEN. Aplica throttle + guardarraíles.
async function postSvc(metodo, data, token, { firstNoPause = false } = {}) {
  if (++siiRequests > LIMITE_REQUESTS) throw new AbortoSeguridad(`superado límite de ${LIMITE_REQUESTS} requests`);
  if (!firstNoPause) await pause();
  const res = await fetch(`${SVC}/${metodo}`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'Cookie': `TOKEN=${token}`,
      'Referer': 'https://www4.sii.cl/consdcvinternetui/',
      'Origin': 'https://www4.sii.cl',
    },
    body: JSON.stringify({ metaData: metaData(metodo), data }),
  });
  const txt = await res.text();
  chequearBloqueo(res.status, txt);
  let json = null; try { json = JSON.parse(txt); } catch { /* texto no-JSON */ }
  return { status: res.status, txt, json };
}

// --- CSV ---
function toCSV(rows) {
  if (!rows.length) return '';
  const cols = [...rows.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set())];
  const esc = v => { v = v == null ? '' : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return [cols.join(';'), ...rows.map(r => cols.map(c => esc(r[c])).join(';'))].join('\n');
}

// Descarga el RCV (Registro de Compras y Ventas) para un período y operación.
// operacion: 'COMPRA' | 'VENTA'. Guarda en <emp.carpeta>/RCV/<periodo>/.
// Devuelve { archivos: [{ruta, bytes}], filas }.
export async function descargarRCV(rutConDv, periodo, operacion) {
  operacion = String(operacion).toUpperCase();
  if (!/^\d{6}$/.test(periodo)) throw new Error(`Periodo inválido (AAAAMM): ${periodo}`);
  if (!['COMPRA', 'VENTA'].includes(operacion)) throw new Error(`Operación inválida: ${operacion}`);

  const emp = empresa(rutConDv);
  const [rutEmisor, dvEmisor] = rutConDv.split('-');
  const { token } = await getToken(rutConDv);

  const carpeta = path.join(emp.carpeta, 'RCV', periodo);
  fs.mkdirSync(carpeta, { recursive: true });
  const tag = operacion === 'COMPRA' ? 'compra' : 'venta';
  const archivos = [];
  const guardar = (nombre, contenido) => {
    const ruta = path.join(carpeta, nombre);
    fs.writeFileSync(ruta, contenido);
    archivos.push({ ruta, bytes: Buffer.byteLength(contenido) });
  };

  const dataBase = { rutEmisor, dvEmisor, ptributario: periodo, operacion, codTipoDoc: null };

  // getResumen
  const resumen = await postSvc('getResumen', dataBase, token);
  if (resumen.json?.respEstado?.codRespuesta !== 0) {
    return {
      archivos,
      filas: 0,
      ok: false,
      motivo: `getResumen codRespuesta=${resumen.json?.respEstado?.codRespuesta} msg=${resumen.json?.respEstado?.msgeRespuesta || resumen.txt.slice(0, 200)}`,
    };
  }
  guardar(`rcv-${tag}-${periodo}-resumen.json`, JSON.stringify(resumen.json, null, 2));

  // Tipos de documento con datos (según el resumen).
  const filasResumen = Array.isArray(resumen.json?.data) ? resumen.json.data : [];
  const tiposConDatos = filasResumen
    .filter(f => Number(f.totDoc || f.totalDoc || f.cantidad || 0) > 0)
    .map(f => f.codTipoDoc ?? f.tipoDoc ?? f.tipo);

  // getDetalle por tipo
  const filasDetalle = [];
  for (const cod of tiposConDatos) {
    const det = await postSvc('getDetalle', { ...dataBase, codTipoDoc: cod }, token);
    if (det.json?.respEstado?.codRespuesta === 0 && Array.isArray(det.json.data)) {
      for (const row of det.json.data) filasDetalle.push({ codTipoDoc: cod, ...row });
    }
  }

  guardar(`rcv-${tag}-${periodo}.json`, JSON.stringify(filasDetalle, null, 2));
  guardar(`rcv-${tag}-${periodo}.csv`, toCSV(filasDetalle));
  return { archivos, filas: filasDetalle.length, ok: true };
}

// Lista los DTE recibidos/emitidos de un período. El detalle del RCV YA contiene
// los DTE (compra = recibidos, venta = emitidos), por lo que esto deriva del mismo
// getDetalle del RCV y lo guarda en una carpeta propia para consumo directo.
//
// NOTA: si se necesitara el XML/PDF de cada DTE individual, hay otro servicio
// (consulta de DTE por folio/track-id en https://www4.sii.cl/...) que requiere
// llamadas por documento; eso queda documentado como extensión futura — esta
// función entrega el listado estructurado, que es lo que cubre el RCV.
//
// tipo: 'recibidos' (deriva de COMPRA) | 'emitidos' (deriva de VENTA).
// Guarda en <emp.carpeta>/DTE-<tipo>/<periodo>/.
export async function listarDTE(rutConDv, periodo, tipo) {
  tipo = String(tipo).toLowerCase();
  if (!['recibidos', 'emitidos'].includes(tipo)) throw new Error(`Tipo DTE inválido: ${tipo} (usa recibidos|emitidos)`);
  if (!/^\d{6}$/.test(periodo)) throw new Error(`Periodo inválido (AAAAMM): ${periodo}`);

  const emp = empresa(rutConDv);
  const [rutEmisor, dvEmisor] = rutConDv.split('-');
  const { token } = await getToken(rutConDv);
  const operacion = tipo === 'recibidos' ? 'COMPRA' : 'VENTA';

  const carpeta = path.join(emp.carpeta, `DTE-${tipo}`, periodo);
  fs.mkdirSync(carpeta, { recursive: true });

  const dataBase = { rutEmisor, dvEmisor, ptributario: periodo, operacion, codTipoDoc: null };
  const resumen = await postSvc('getResumen', dataBase, token);
  if (resumen.json?.respEstado?.codRespuesta !== 0) {
    return { archivos: [], filas: 0, ok: false, motivo: `getResumen codRespuesta=${resumen.json?.respEstado?.codRespuesta}` };
  }
  const filasResumen = Array.isArray(resumen.json?.data) ? resumen.json.data : [];
  const tiposConDatos = filasResumen
    .filter(f => Number(f.totDoc || f.totalDoc || f.cantidad || 0) > 0)
    .map(f => f.codTipoDoc ?? f.tipoDoc ?? f.tipo);

  const dtes = [];
  for (const cod of tiposConDatos) {
    const det = await postSvc('getDetalle', { ...dataBase, codTipoDoc: cod }, token);
    if (det.json?.respEstado?.codRespuesta === 0 && Array.isArray(det.json.data)) {
      for (const row of det.json.data) dtes.push({ codTipoDoc: cod, ...row });
    }
  }

  const jsonRuta = path.join(carpeta, `dte-${tipo}-${periodo}.json`);
  const csvRuta = path.join(carpeta, `dte-${tipo}-${periodo}.csv`);
  fs.writeFileSync(jsonRuta, JSON.stringify(dtes, null, 2));
  fs.writeFileSync(csvRuta, toCSV(dtes));
  return {
    archivos: [
      { ruta: jsonRuta, bytes: fs.statSync(jsonRuta).size },
      { ruta: csvRuta, bytes: fs.statSync(csvRuta).size },
    ],
    filas: dtes.length,
    ok: true,
  };
}

export { SVC, LIMITE_REQUESTS };

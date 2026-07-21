#!/usr/bin/env node
// Descarga RCV (Registro de Compras y Ventas) del SII para una empresa.
// Uso: node descargar-rcv.mjs <rut> <periodo AAAAMM> [COMPRA|VENTA]
//
// REGLA DE ORO: UN solo login en toda la ejecución, reusa cookies para todo,
// pausas 1.5-3s entre requests al SII, sin bucles de reintento de login,
// aborta ante cualquier señal de bloqueo, máx ~25 requests al SII.
// Al terminar (salvo aborto por bloqueo) hace LOGOUT para no dejar sesiones abiertas.
//
// Guarda en: <carpeta>/RCV/<periodo>/rcv-<compra|venta>-<periodo>.csv (+ .json)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { login, logout } from './lib/sii-auth.mjs';

const rutArg = process.argv[2] || '77271121-2';
const periodo = process.argv[3] || '202604';            // AAAAMM
const operacion = (process.argv[4] || 'COMPRA').toUpperCase();
if (!/^\d{6}$/.test(periodo)) { console.error('Periodo inválido (esperado AAAAMM):', periodo); process.exit(1); }
if (!['COMPRA', 'VENTA'].includes(operacion)) { console.error('Operación inválida:', operacion); process.exit(1); }

const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), 'nexus', 'credenciales.json'), 'utf8'));
const emp = cred.sii?.empresas?.[rutArg];
if (!emp) { console.error('RUT no está en credenciales.json:', rutArg); process.exit(1); }

const pause = (min = 1500, max = 3000) => new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

// --- Guardarraíles de seguridad anti-bloqueo ---
let siiRequests = 0;
let bloqueado = false;            // si true, NO hacemos logout (no mandar más requests)
const LIMITE_REQUESTS = 25;
const SENALES_BLOQUEO = ['bloquead', 'intentos', 'captcha', 'demasiad', 'clave temporal'];

class AbortoSeguridad extends Error {}
function abortar(motivo) { bloqueado = true; throw new AbortoSeguridad(motivo); }
function chequearBloqueo(status, texto) {
  if (status === 403 || status === 429) abortar(`HTTP ${status} (posible bloqueo/rate-limit)`);
  const t = (texto || '').toLowerCase();
  for (const s of SENALES_BLOQUEO) if (t.includes(s)) abortar(`respuesta contiene "${s}"`);
}

let sesion = null;

async function siiFetch(url, opts, { firstNoPause = false } = {}) {
  if (++siiRequests > LIMITE_REQUESTS) abortar(`superado límite de ${LIMITE_REQUESTS} requests`);
  if (!firstNoPause) await pause();
  return fetch(url, opts);
}

const SVC = 'https://www4.sii.cl/consdcvinternetui/services/data/facadeService';
function metaData(metodo) {
  return {
    namespace: `cl.sii.sdi.lob.diii.consdcv.data.api.interfaces.FacadeService/${metodo}`,
    conversationId: '16',
    transactionId: String(Date.now()),
    page: null,
  };
}

async function main() {
  // ============ 1) LOGIN (UNA SOLA VEZ, sin reintentos) ============
  try {
    sesion = await login(emp.rut, emp.clave);
    siiRequests++;
  } catch (e) {
    console.error('!! Login SII falló:', e.message, '\n   NO reintento (regla de oro). Revisa credenciales/estado de la cuenta.');
    process.exitCode = 2;
    return;
  }
  const { rutSinDv, dv, ua } = sesion;
  console.log(`OK login ${emp.rut} (${emp.nombre}). cookies: ${sesion.jar.keys().join(', ')}`);

  const baseHeaders = { 'User-Agent': ua, 'Cookie': sesion.jar.header(), 'Accept': 'application/json, text/plain, */*' };

  async function postSvc(metodo, data) {
    const res = await siiFetch(`${SVC}/${metodo}`, {
      method: 'POST',
      headers: { ...baseHeaders, 'Content-Type': 'application/json', 'Referer': 'https://www4.sii.cl/consdcvinternetui/', 'Origin': 'https://www4.sii.cl' },
      body: JSON.stringify({ metaData: metaData(metodo), data }),
    });
    const txt = await res.text();
    chequearBloqueo(res.status, txt);
    let json = null; try { json = JSON.parse(txt); } catch {}
    return { status: res.status, txt, json };
  }

  // ============ 2) BOOTSTRAP del contexto de la SPA RCV ============
  {
    const res = await siiFetch('https://www4.sii.cl/consdcvinternetui/', {
      headers: { ...baseHeaders, 'Accept': 'text/html,application/xhtml+xml' }, redirect: 'manual',
    }, { firstNoPause: true });
    const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of set) { const p = c.split(';')[0]; const i = p.indexOf('='); if (i > 0) sesion.jar.map.set(p.slice(0, i).trim(), p.slice(i + 1).trim()); }
    baseHeaders['Cookie'] = sesion.jar.header();
    const loc = res.headers.get('location') || '';
    console.log(`bootstrap app: HTTP ${res.status}${loc ? ' -> ' + loc : ''}; cookies ahora: ${sesion.jar.keys().join(', ')}`);
    if (/IngresoRutClave|CAutInicio/i.test(loc)) abortar('la app redirige a login (sesión no válida para www4)');
    chequearBloqueo(res.status, await res.text().catch(() => ''));
  }

  // ============ 3) getResumen ============
  const dataBase = { rutEmisor: rutSinDv, dvEmisor: dv, ptributario: periodo, operacion, codTipoDoc: null };
  console.log(`\ngetResumen ${operacion} ${periodo}...`);
  const resumen = await postSvc('getResumen', dataBase);
  console.log(`  HTTP ${resumen.status}; codRespuesta=${resumen.json?.respEstado?.codRespuesta}; msg=${resumen.json?.respEstado?.msgeRespuesta || ''}`);
  if (resumen.json?.respEstado?.codRespuesta !== 0) {
    console.error('  getResumen no devolvió datos válidos. Cuerpo (recortado):', resumen.txt.slice(0, 400));
    process.exitCode = 3;
    return; // -> finally hace logout (no fue bloqueo)
  }

  // ============ 4) Carpeta destino + guardar resumen ============
  const carpeta = path.join(emp.carpeta, 'RCV', periodo);
  fs.mkdirSync(carpeta, { recursive: true });
  const tag = operacion === 'COMPRA' ? 'compra' : 'venta';
  fs.writeFileSync(path.join(carpeta, `rcv-${tag}-${periodo}-resumen.json`), JSON.stringify(resumen.json, null, 2));

  const filasResumen = resumen.json?.data || resumen.json?.resp || [];
  const tiposConDatos = (Array.isArray(filasResumen) ? filasResumen : [])
    .filter(f => Number(f.totDoc || f.totalDoc || f.cantidad || 0) > 0)
    .map(f => f.codTipoDoc ?? f.tipoDoc ?? f.tipo);
  console.log(`  tipos de doc con datos: ${tiposConDatos.join(', ') || '(ninguno parseado; revisar resumen.json)'}`);

  // ============ 5) getDetalle por tipo ============
  const filasDetalle = [];
  for (const cod of tiposConDatos) {
    const det = await postSvc('getDetalle', { ...dataBase, codTipoDoc: cod });
    const cr = det.json?.respEstado?.codRespuesta;
    console.log(`  getDetalle codTipoDoc=${cod}: HTTP ${det.status} codRespuesta=${cr}`);
    if (cr === 0 && Array.isArray(det.json.data)) for (const row of det.json.data) filasDetalle.push({ codTipoDoc: cod, ...row });
  }

  // ============ 6) Escribir CSV + JSON ============
  const toCSV = rows => {
    if (!rows.length) return '';
    const cols = [...rows.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set())];
    const esc = v => { v = v == null ? '' : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return [cols.join(';'), ...rows.map(r => cols.map(c => esc(r[c])).join(';'))].join('\n');
  };
  const csvPath = path.join(carpeta, `rcv-${tag}-${periodo}.csv`);
  const jsonPath = path.join(carpeta, `rcv-${tag}-${periodo}.json`);
  fs.writeFileSync(csvPath, toCSV(filasDetalle));
  fs.writeFileSync(jsonPath, JSON.stringify(filasDetalle, null, 2));
  console.log(`\nListo. requests al SII: ${siiRequests}`);
  console.log(`  CSV : ${csvPath} (${filasDetalle.length} filas)`);
  console.log(`  JSON: ${jsonPath}`);
}

// ============ Orquestación con LOGOUT garantizado ============
try {
  await main();
} catch (e) {
  if (e instanceof AbortoSeguridad) {
    console.error(`\n!! ABORTO por seguridad: ${e.message}. No insisto NI hago logout (no mando más requests).`);
    process.exitCode = 2;
  } else {
    console.error('\n!! Error inesperado:', e.message);
    process.exitCode = 1;
  }
} finally {
  // Cerrar sesión SIEMPRE que tengamos una sesión y NO haya sido aborto por bloqueo.
  if (sesion && !bloqueado) {
    try { await logout(sesion); console.log('Sesión SII cerrada (logout).'); }
    catch { /* best-effort */ }
  }
}

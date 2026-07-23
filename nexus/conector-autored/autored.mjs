// conector-autored — cliente para autored.cl (módulo Transferencias B2B)
// Diseñado para Nexus/Meme. LECTURAS libres; ACCIONES QUE COBRAN bloqueadas por doble candado.
//
// SEGURIDAD (leer antes de tocar):
//  - Cada "documento"/solicitud de transferencia CONSUME CRÉDITOS (= plata) o cobra impuestos reales.
//  - Las funciones que cobran (initialize, buyCav, newPayment, uploadDocuments, enterInfo, abort)
//    NO se ejecutan salvo que se cumplan LAS DOS condiciones:
//       1) env  AUTORED_PERMITIR_ESCRITURA=1
//       2) llamada con { confirmar: true }
//    Si falta cualquiera, la función hace DRY-RUN: describe qué haría y NO llama a la API.
//
// Auth: cookie httpOnly `authorization` (JWT). Se obtiene con POST /api/v2/auth/login
//       y dura ~24h. Se cachea en sesion.json y se renueva sola al vencer.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESION_FILE = path.join(__dirname, 'sesion.json');

const BASE = 'https://autored.cl';
const API_AUTH = `${BASE}/api/v2`;                       // login / check-auth
const API_TR = `${BASE}/transferencias/api`;             // módulo transferencias (Next.js)

// ---- credenciales (env; fallback a .env simple) ----
function cargarEnv() {
  const f = path.join(__dirname, '.env');
  if (fs.existsSync(f)) {
    for (const linea of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
cargarEnv();

const EMAIL = process.env.AUTORED_EMAIL || '';
const PASSWORD = process.env.AUTORED_PASSWORD || '';
const PERMITIR_ESCRITURA = process.env.AUTORED_PERMITIR_ESCRITURA === '1';

// ---------- sesión ----------
function leerSesion() {
  try { return JSON.parse(fs.readFileSync(SESION_FILE, 'utf8')); } catch { return null; }
}
function guardarSesion(s) {
  fs.writeFileSync(SESION_FILE, JSON.stringify(s, null, 2), { mode: 0o600 });
}
function jwtVigente(jwt) {
  try {
    const p = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
    return p.exp && (p.exp - 60) * 1000 > Date.now();     // 60s de margen
  } catch { return false; }
}

async function login() {
  if (!EMAIL || !PASSWORD) throw new Error('Faltan AUTORED_EMAIL / AUTORED_PASSWORD (ver .env)');
  const r = await fetch(`${API_AUTH}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'accept': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    redirect: 'manual',
  });
  if (r.status !== 200) throw new Error(`Login falló HTTP ${r.status}`);
  // extraer cookie authorization del set-cookie
  const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie')].filter(Boolean);
  let jwt = null;
  for (const c of sc) { const m = /authorization=([^;]+)/.exec(c || ''); if (m) jwt = m[1]; }
  if (!jwt) throw new Error('Login OK pero no se recibió cookie authorization');
  const s = { jwt, ts: Date.now() };
  guardarSesion(s);
  return s;
}

async function jwt() {
  let s = leerSesion();
  if (s && jwtVigente(s.jwt)) return s.jwt;
  s = await login();
  return s.jwt;
}

async function api(url, { method = 'GET', body, params } = {}) {
  const u = new URL(url);
  if (params) for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, v);
  const r = await fetch(u, {
    method,
    headers: {
      'accept': 'application/json',
      'cookie': `authorization=${await jwt()}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  let data; try { data = JSON.parse(txt); } catch { data = txt; }
  if (!r.ok) throw new Error(`HTTP ${r.status} ${method} ${u.pathname}: ${txt.slice(0, 200)}`);
  return data;
}

// ============================================================
//  LECTURAS (libres, no cobran)
// ============================================================
export const quienSoy = () => api(`${API_TR}/sso/check-auth`);
export const creditos = () => api(`${API_TR}/business/transfers/wallet/credits`);
export const resumen = () => api(`${API_TR}/business/transfers/resume`);
export const estadoRegistroCivil = () => api(`${API_TR}/info/rc-status`);

export function listarTransferencias(opts = {}) {
  const { patente = '', estado = '', desde = '', hasta = '', pagina = 0, filas = 10, orden = 'id', dir = 'DESC' } = opts;
  return api(`${API_TR}/business/transfers`, {
    params: {
      id: '', order: orden, direction: dir, page: pagina, rowsPerPage: filas,
      'vehicle[licensePlate]': patente, min_createdAt: desde, max_createdAt: hasta, status: estado,
    },
  });
}

// estado detallado de UNA transferencia (por id numérico interno de proceso)
export const estadoTransferencia = (id) => api(`${API_TR}/business/transfers/${id}/status`);
export const impuestosVehiculo = (id) => api(`${API_TR}/business/transfers/${id}/vehicle-taxation`);
export const firmantes = (id, tipo) => api(`${API_TR}/business/transfers/${id}/signers`, { params: { type: tipo } });

// buscar datos de un vehículo por patente (prellenado, sin costo)
export const infoVehiculo = (params) => api(`${API_TR}/business/transfers/vehicle-info`, { params });

// ============================================================
//  ESCRITURA / COBRA  — bloqueadas por doble candado (dry-run por defecto)
// ============================================================
const COBRA = {
  initialize:      'Crea una nueva solicitud de transferencia (CONSUME 1 CRÉDITO).',
  buyCav:          'Compra el informe CAV (COBRA).',
  newPayment:      'Paga los impuestos de transferencia (PLATA REAL al Registro Civil).',
  uploadDocuments: 'Sube documentos a una solicitud existente.',
  enterInfo:       'Ingresa info de vendedor/comprador en una solicitud.',
  abort:           'Aborta/cancela una solicitud.',
};

function guardia(accion, payload, confirmar) {
  const desc = COBRA[accion] || 'Acción de escritura.';
  if (!PERMITIR_ESCRITURA || !confirmar) {
    return {
      dry_run: true,
      bloqueado: true,
      accion,
      descripcion: desc,
      motivo: !PERMITIR_ESCRITURA
        ? 'AUTORED_PERMITIR_ESCRITURA no está en 1'
        : 'falta { confirmar: true } en la llamada',
      payload_que_se_enviaria: payload,
    };
  }
  return null; // luz verde
}

// Crear solicitud. tipo: 'sellers'|'buyers' (kind B2B) | contrato abierto/gestiona según payload.
export async function crearSolicitud(payload, { confirmar = false } = {}) {
  const g = guardia('initialize', payload, confirmar);
  if (g) return g;
  return api(`${API_TR}/business/transfers/initialize`, { method: 'POST', body: payload });
}
export async function comprarCav({ id, subType = 'CAV_INITIAL' }, { confirmar = false } = {}) {
  const g = guardia('buyCav', { id, subType }, confirmar);
  if (g) return g;
  return api(`${API_TR}/business/transfers/buy-cav`, { method: 'POST', body: { id, subType } });
}
export async function pagarImpuestos(id, tipo, { confirmar = false } = {}) {
  const g = guardia('newPayment', { id, type: tipo }, confirmar);
  if (g) return g;
  return api(`${API_TR}/business/transfers/${id}/new-payment`, { method: 'POST', body: { type: tipo } });
}
export async function subirDocumentos(id, payload, { confirmar = false } = {}) {
  const g = guardia('uploadDocuments', { id, ...payload }, confirmar);
  if (g) return g;
  return api(`${API_TR}/business/transfers/${id}/upload-documents`, { method: 'POST', body: payload });
}
export async function ingresarInfo(id, paso, payload, { confirmar = false } = {}) {
  // paso: 'enter-seller-info' | 'enter-buyer-info'
  const g = guardia('enterInfo', { id, paso, ...payload }, confirmar);
  if (g) return g;
  return api(`${API_TR}/business/transfers/${id}/${paso}`, { method: 'POST', body: payload });
}
export async function abortarSolicitud(id, { confirmar = false } = {}) {
  const g = guardia('abort', { id }, confirmar);
  if (g) return g;
  return api(`${API_TR}/business/transfers/${id}/abort`, { method: 'POST' });
}

// validar deuda de pensiones (POST pero es una consulta previa; también tras el candado por precaución)
export async function validarDeudaPension(persona, { confirmar = false } = {}) {
  const g = guardia('enterInfo', { validar_pension: persona }, confirmar);
  if (g) return { ...g, nota: 'validate-pension-debt es consulta; si querés correrla igual pasá confirmar:true' };
  return api(`${API_TR}/business/transfers/validate-pension-debt`, { method: 'POST', body: persona });
}

// ============================================================
//  CLI
// ============================================================
const ESTADOS = { pendientes: 'UPLOAD_DOCUMENTS', '': '' };

async function cli() {
  const [cmd, ...args] = process.argv.slice(2);
  const out = (x) => console.log(JSON.stringify(x, null, 2));
  try {
    switch (cmd) {
      case 'quien': out(await quienSoy()); break;
      case 'creditos': out(await creditos()); break;
      case 'resumen': out(await resumen()); break;
      case 'rc': out(await estadoRegistroCivil()); break;
      case 'lista': out(await listarTransferencias({ patente: args[0] || '', filas: 10 })); break;
      case 'estado': out(await estadoTransferencia(args[0])); break;
      case 'impuestos': out(await impuestosVehiculo(args[0])); break;
      case 'vehiculo': out(await infoVehiculo({ licensePlate: args[0] })); break;
      case 'login': out(await login().then(() => ({ ok: true, msg: 'sesión renovada' }))); break;
      default:
        console.log(`Comandos: quien | creditos | resumen | rc | lista [patente] | estado <id> | impuestos <id> | vehiculo <patente> | login
Escritura (cobra) solo vía import + AUTORED_PERMITIR_ESCRITURA=1 + { confirmar:true }.`);
    }
  } catch (e) { console.error('ERROR:', e.message); process.exit(1); }
}

if (import.meta.url === `file://${process.argv[1]}`) cli();

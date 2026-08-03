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
import { execFileSync } from 'node:child_process';

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
const PERMITIR_ESCRITURA = process.env.AUTORED_PERMITIR_ESCRITURA === '1'; // transferencias (initialize/pago)
const PERMITIR_INFORMES = process.env.AUTORED_PERMITIR_INFORMES === '1';   // solo compra de informes/CAV

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

// estado detallado de UNA transferencia. OJO: va el publicId (UUID), NO el id numérico
// (con el id numérico la API responde 404 "Transfer not found").
export const estadoTransferencia = (id) => api(`${API_TR}/business/transfers/${id}/status`);
export const impuestosVehiculo = (id) => api(`${API_TR}/business/transfers/${id}/vehicle-taxation`);
export const firmantes = (id, tipo) => api(`${API_TR}/business/transfers/${id}/signers`, { params: { type: tipo } });

// catálogo de comunas (id + nombre + región) — necesario para el domicilio del vendedor
export const comunas = () => api(`${API_TR}/info/regions`);

// busca una comuna por nombre y devuelve {id, name, region:{name}} listo para el payload
export async function buscarComuna(nombre) {
  const n = String(nombre || '').trim().toLowerCase();
  const lista = await comunas();
  const c = lista.find((x) => String(x.name).toLowerCase() === n)
        || lista.find((x) => String(x.name).toLowerCase().includes(n));
  if (!c) return null;
  return { id: String(c.id), name: c.name, region: { name: c['region.name'] } };
}

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

// ============================================================
//  CONTRATO ABIERTO (B2B_OC) — flujo verificado end-to-end 03-08-2026 (solicitud 45851)
// ============================================================
// Paso A: crea la solicitud. COBRA 1 crédito Y compra el CAV del vehículo (el front avisa
//   "Al hacer click en Solicitar se comprará un CAV"). Doble candado.
//   `prohibicion` = {name, rut} del acreedor si el contrato lleva prohibición de enajenar
//   (radio "Sí"); por defecto va sin prohibición (creditor vacío).
export async function crearContratoAbierto(patente, { prohibicion = null, forzar = false, confirmar = false } = {}) {
  const pat = String(patente || '').toUpperCase().replace(/[\s.\-]/g, '');
  const payload = {
    email: EMAIL,
    licensePlate: pat,
    phone: '',
    clientType: 'openContract',
    kind: 'B2B_OC',
    creditor: { name: prohibicion?.name || '', rut: prohibicion?.rut || '' },
    forceCreation: Boolean(forzar),
  };
  const g = guardia('initialize', payload, confirmar);
  if (g) return { ...g, nota: 'Crea el Contrato Abierto: 1 crédito + compra del CAV.' };
  return api(`${API_TR}/business/transfers/initialize`, { method: 'POST', body: payload });
}

// Paso B: datos del vendedor. La API espera multipart/form-data con claves planas
//   `sellers.0.<campo>` (NO JSON). Al guardarlo, el proceso genera solo el MANDATO
//   (ENTER_SELLER_INFO -> GENERATING_MANDATE -> SIGN_MANDATE) y le manda el mail de firma.
//   Teléfono: formato 56XXXXXXXXX (con código país, sin +); el front rechaza 9XXXXXXXX.
export async function ingresarVendedorOC(publicId, vendedor, { confirmar = false } = {}) {
  const v = vendedor || {};
  const plano = {
    'sellers.0.name': v.nombres || '',
    'sellers.0.fLastName': v.apellidoPaterno || '',
    'sellers.0.mLastName': v.apellidoMaterno || '',
    'sellers.0.rut': v.rut || '',
    'sellers.0.email': v.email || '',
    'sellers.0.phone': v.telefono || '',
    'sellers.0.street': v.calle || '',
    'sellers.0.houseNumber': v.numero || '',
    'sellers.0.dpto': v.depto || '',
    'sellers.0.commune.id': String(v.comuna?.id || ''),
    'sellers.0.commune.name': v.comuna?.name || '',
    'sellers.0.commune.region.name': v.comuna?.region?.name || '',
    'sellers.0.hasUnion': String(Boolean(v.conyuge)),
    'sellers.0.hasRepresentative': String(Boolean(v.representante)),
    'sellers.0.isBeneficiary': 'false',
  };
  const g = guardia('enterInfo', { publicId, ...plano }, confirmar);
  if (g) return g;
  const fd = new FormData();
  for (const [k, val] of Object.entries(plano)) fd.append(k, val);
  const r = await fetch(`${API_TR}/business/transfers/${publicId}/enter-seller-info`, {
    method: 'POST',
    headers: { accept: 'application/json', cookie: `authorization=${await jwt()}` },
    body: fd,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} enter-seller-info: ${(await r.text()).slice(0, 200)}`);
  return { ok: true, publicId };
}

// Paso C (lectura): link de firma del mandato + estado del firmante.
export async function firmaMandato(publicId) {
  const f = await firmantes(publicId, 'OC_MANDATE');
  return {
    documento: f.documentUrl,
    firmantes: (f.signers || []).map((s) => ({
      nombre: [s.name, s.fLastName, s.mLastName].filter(Boolean).join(' '),
      rut: s.rut, email: s.email, estado: s.status, linkFirma: s.signUrl,
    })),
  };
}

// Documentos de una solicitud (CAV_INITIAL, OC_MANDATE, CONTRACT_AUTOMATIC, ...). Bajar es GRATIS.
export async function documentosSolicitud(publicId) {
  const s = await estadoTransferencia(publicId);
  return (s.documents || []).map((d) => ({ tipo: d.type, estado: d.status, nombre: d.originalName, url: d.publicUrl }));
}

// validar deuda de pensiones (POST pero es una consulta previa; también tras el candado por precaución)
export async function validarDeudaPension(persona, { confirmar = false } = {}) {
  const g = guardia('enterInfo', { validar_pension: persona }, confirmar);
  if (g) return { ...g, nota: 'validate-pension-debt es consulta; si querés correrla igual pasá confirmar:true' };
  return api(`${API_TR}/business/transfers/validate-pension-debt`, { method: 'POST', body: persona });
}

// ============================================================
//  INFORMES / CAV  (base /api/v2/reports) — la que quiere Meme
// ============================================================
// Tipos (radio UI -> reportType que se envía):
//   'CAV'                      -> reportType 'CAV_RAW'   (el CAV rápido; se genera al instante)
//   'Informe Autored'          -> reportType 'CAV'
//   'Informe Autored Completo' -> reportType 'NMP'
export const TIPOS_INFORME = { CAV: 'CAV_RAW', INFORME: 'CAV', COMPLETO: 'NMP' };
export const NOMBRE_INFORME = { CAV_RAW: 'CAV', CAV: 'Informe Autored', NMP: 'Informe Autored Completo' };

// Precios (los informes se facturan a la cuenta, NO salen en la app). Configurables por
// .env; si están vacíos se muestra "consultar" para que Nico los complete.
export const precios = () => ({
  CAV: process.env.AUTORED_PRECIO_CAV || 'consultar',
  COMPLETO: process.env.AUTORED_PRECIO_COMPLETO || 'consultar',
});

// historial de informes comprados (lectura, gratis)
export function listarInformes({ patente = '', tipo = '', pagina = 0, filas = 20 } = {}) {
  return api(`${API_AUTH}/reports/`, {
    params: { license_plate: patente, reportType: tipo, order: 'id', direction: 'desc', page: pagina, rowsPerPage: filas },
  });
}
// avisa si ya se compró algún informe de esa patente (lectura, gratis) -> [{reportType, createdAt}]
export const informesRepetidos = (patente) =>
  api(`${API_AUTH}/reports/check-repeated`, { params: { licensePlate: patente } });

// descarga un informe listo a un archivo local (lectura). Devuelve la ruta.
export async function descargarInforme(url, destino) {
  const r = await fetch(url, { headers: { cookie: `authorization=${await jwt()}` } });
  if (!r.ok) throw new Error(`descarga HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(destino, buf);
  return { destino, bytes: buf.length };
}

// Datos del vehículo + KILOMETRAJE a partir de un Informe Completo (NMP) YA COMPRADO.
// NO compra nada: busca el NMP existente más reciente de la patente, lo baja (gratis)
// y lo parsea con leer_nmp.py. Si no hay NMP comprado, devuelve { ok:false, sin_informe:true }.
export async function fichaCompra(patente) {
  const pat = String(patente || '').toUpperCase().replace(/[\s.\-]/g, '');
  if (!pat) return { ok: false, error: 'Falta la patente.' };
  const lst = await listarInformes({ patente: pat, tipo: 'NMP', filas: 20 }).catch(() => ({}));
  const rows = (lst.rows || lst || []).filter?.((r) => r) || [];
  const nmp = rows
    .filter((r) => r.reportType === 'NMP' && String(r.ready) === 'true' && (r.url || r.publicUrl))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];
  if (!nmp) return { ok: false, sin_informe: true, patente: pat, nota: 'No hay Informe Completo (NMP) comprado para esta patente. No se compra automáticamente.' };
  const dest = path.join('/tmp', `nmp_compra_${pat}.pdf`);
  await descargarInforme(nmp.url || nmp.publicUrl, dest);
  let campos = {};
  try {
    const out = execFileSync('python3', [path.join(__dirname, 'leer_nmp.py'), dest], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    campos = (JSON.parse(out) || {}).campos || {};
  } catch (e) {
    return { ok: false, error: `No pude leer el informe: ${e.message}`, informe_id: nmp.id, pdf: dest };
  }
  return { ok: true, patente: campos.patente || pat, campos, informe_id: nmp.id, informe_fecha: nmp.createdAt, pdf: dest };
}

// REVISIÓN A FONDO de los documentos de un auto (para el flujo de compra). GRATIS: usa el
// informe YA comprado (prefiere el Informe Completo NMP porque revisa 12 puntos; el CAV solo
// alcanza para limitaciones/anotaciones) y lo pasa por revisar_informe.py.
// Devuelve {ok, formato, resumen:{alertas,revisar,ok,apto}, chequeos:[{clave,titulo,estado,detalle}]}.
// NO compra nada: si no hay informe devuelve {sin_informe:true}.
export async function revisarDocumentos(patente) {
  const pat = String(patente || '').toUpperCase().replace(/[\s.\-]/g, '');
  if (!pat) return { ok: false, error: 'Falta la patente.' };
  const lst = await listarInformes({ patente: pat, filas: 30 }).catch(() => ({}));
  const rows = (lst.rows || lst || []).filter?.((r) => r) || [];
  const listos = rows.filter((r) => String(r.ready) === 'true' && (r.url || r.publicUrl));
  // NMP primero (revisa todo), después Informe Autored, y el CAV como último recurso.
  const orden = { NMP: 0, CAV: 1, CAV_RAW: 2 };
  const elegido = listos.sort((a, b) =>
    (orden[a.reportType] ?? 9) - (orden[b.reportType] ?? 9) ||
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];
  if (!elegido) {
    return { ok: false, sin_informe: true, patente: pat,
      nota: 'No hay ningún informe comprado de esta patente, así que no puedo revisar los documentos. No se compra automáticamente.' };
  }
  const dest = path.join('/tmp', `revision_${pat}.pdf`);
  await descargarInforme(elegido.url || elegido.publicUrl, dest);
  let rev;
  try {
    const out = execFileSync('python3', [path.join(__dirname, 'revisar_informe.py'), dest], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    rev = JSON.parse(out);
  } catch (e) {
    return { ok: false, error: `No pude revisar el informe: ${e.message}`, informe_id: elegido.id, pdf: dest };
  }
  if (!rev.ok) return { ok: false, error: rev.error, informe_id: elegido.id, pdf: dest };
  return { ...rev, informe_id: elegido.id, informe_tipo: elegido.reportType,
    informe_nombre: NOMBRE_INFORME[elegido.reportType] || elegido.reportType,
    informe_fecha: elegido.createdAt, pdf: dest };
}

// COMPRA un informe/CAV (COBRA) -> doble candado. tipo: clave de TIPOS_INFORME o reportType directo.
export async function comprarInforme(patente, tipo = 'CAV', { confirmar = false, esperar = true, timeoutMs = 180000 } = {}) {
  const reportType = TIPOS_INFORME[tipo] || tipo;
  // Candado propio de informes (independiente del de transferencias/pagos).
  if (!PERMITIR_INFORMES || !confirmar) {
    return {
      dry_run: true, bloqueado: true, accion: 'comprarInforme',
      descripcion: `Compra informe ${reportType} de ${patente} (COBRA).`,
      motivo: !PERMITIR_INFORMES ? 'AUTORED_PERMITIR_INFORMES no está en 1' : 'falta { confirmar: true }',
      payload_que_se_enviaria: { license_plate: patente, reportType },
    };
  }
  const previos = await informesRepetidos(patente).catch(() => []);
  const res = await api(`${API_AUTH}/reports/buy`, { method: 'POST', body: { license_plate: patente, reportType } });
  const rep = Array.isArray(res) ? res[0] : res;
  if (!esperar) return { ...rep, repetidos_previos: previos };
  // poll hasta ready + url
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const lst = await listarInformes({ patente, filas: 20 });
    const rows = lst.rows || lst || [];
    const row = (Array.isArray(rows) ? rows : []).find((x) => x.id === rep.id);
    if (row && row.ready && (row.url || row.publicUrl)) {
      return { ...row, url: row.url || row.publicUrl, repetidos_previos: previos };
    }
    await new Promise((r) => setTimeout(r, 8000));
  }
  return { ...rep, ready: false, nota: 'no quedó listo en el timeout', repetidos_previos: previos };
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
      case 'informes': out(await listarInformes({ patente: args[0] || '' })); break;
      case 'repetidos': out(await informesRepetidos(args[0])); break;
      case 'comuna': out(await buscarComuna(args[0])); break;
      case 'revisar': out(await revisarDocumentos(args[0])); break;
      case 'firma': out(await firmaMandato(args[0])); break;
      case 'docs': out(await documentosSolicitud(args[0])); break;
      case 'login': out(await login().then(() => ({ ok: true, msg: 'sesión renovada' }))); break;
      default:
        console.log(`Comandos: quien | creditos | resumen | rc | lista [patente] | estado <publicId> | impuestos <publicId> | vehiculo <patente> | informes [patente] | repetidos <patente> | comuna <nombre> | revisar <patente> | firma <publicId> | docs <publicId> | login
Escritura (cobra) solo vía import + AUTORED_PERMITIR_ESCRITURA=1 + { confirmar:true }.`);
    }
  } catch (e) { console.error('ERROR:', e.message); process.exit(1); }
}

if (import.meta.url === `file://${process.argv[1]}`) cli();

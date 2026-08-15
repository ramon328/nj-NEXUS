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

async function api(url, { method = 'GET', body, params, _reintento = false } = {}) {
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
  // Sesión caída antes de su `exp` (AutoRed puede invalidar la cookie): re-loguear
  // UNA vez y repetir. Solo en LECTURAS (GET): un POST reintentado podría cobrar dos veces.
  if (r.status === 401 && !_reintento && method === 'GET') {
    try { fs.unlinkSync(SESION_FILE); } catch { /* no había sesión guardada */ }
    return api(url, { method, body, params, _reintento: true });
  }
  if (!r.ok) throw new Error(`HTTP ${r.status} ${method} ${u.pathname}: ${txt.slice(0, 200)}`);
  return data;
}

// ============================================================
//  LECTURAS (libres, no cobran)
// ============================================================
export const quienSoy = () => api(`${API_TR}/sso/check-auth`);
// El wallet devolvió `{credits:0}` de forma espuria el 15-08-2026 (misma sesión, la
// llamada siguiente dio 10). Un falso "0 créditos" hace que Nexus le diga a la persona
// que no puede crear el contrato, así que un 0 se reconsulta una vez antes de creerlo.
export async function creditos() {
  const r = await api(`${API_TR}/business/transfers/wallet/credits`);
  const n = r?.credits ?? r?.available ?? r?.balance;
  if (n !== 0) return r;
  try {
    const r2 = await api(`${API_TR}/business/transfers/wallet/credits`);
    const n2 = r2?.credits ?? r2?.available ?? r2?.balance;
    if (Number(n2) > 0) return r2;
  } catch { /* nos quedamos con la primera lectura */ }
  return r;
}
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

// ¿El RUT es de persona jurídica? En Chile las empresas parten en 50.000.000.
// Sirve de candado: si llega un RUT de empresa con datos de persona natural, el
// vendedor se guardaría mal (pasó el 08-08-2026 con Trade Marketing Chile SpA).
export function esRutEmpresa(rut) {
  const cuerpo = Number(String(rut || '').replace(/[.\-]/g, '').slice(0, -1));
  return Number.isFinite(cuerpo) && cuerpo >= 50000000;
}

// Paso B: datos del vendedor. La API espera multipart/form-data con claves planas
//   `sellers.0.<campo>` (NO JSON). Al guardarlo, el proceso genera solo el MANDATO
//   (ENTER_SELLER_INFO -> GENERATING_MANDATE -> SIGN_MANDATE) y le manda el mail de firma.
//   Teléfono: formato 56XXXXXXXXX (con código país, sin +); el front rechaza 9XXXXXXXX.
//
// ⚠️ DOS FORMAS DISTINTAS: persona natural y EMPRESA. Se eligen con `v.tipo`
//   ('empresa') o automáticamente si viene `v.razonSocial`. NO son intercambiables:
//   el 08-08-2026 los contratos 499/500/501 (Trade Marketing Chile SpA) se guardaron
//   con la razón social partida en name/fLastName ("TRADE MARKETING CHILE" + "SPA")
//   y el RUT de la empresa en el formulario de persona natural. Resultado: el mandato
//   sale a firmar a nombre de la EMPRESA (RUT 76.101.539-7), y una empresa no tiene
//   Clave Única — quien firma tiene que ser el REPRESENTANTE LEGAL, como en GYWL24
//   (SUN-GROUP SPA → firmó Ronald Ben-Dov con su RUT persona).
export async function ingresarVendedorOC(publicId, vendedor, { confirmar = false } = {}) {
  const v = vendedor || {};
  if (v.tipo === 'empresa' || v.razonSocial) return ingresarVendedorEmpresaOC(publicId, v, { confirmar });
  if (esRutEmpresa(v.rut)) {
    throw new Error(
      `El RUT ${v.rut} es de una EMPRESA, pero lo estás mandando como persona natural. ` +
      `Usa el formulario de empresa: { tipo:"empresa", razonSocial, rut, domicilio, representantes:[{...}] }.`,
    );
  }
  // ⚠️ FORMATO — corregido el 07-08-2026 tras el problema del PGXP70 (solicitud 497).
  // La UI de AutoRed guarda al vendedor con el teléfono en E.164 CON "+" (`+56993196983`)
  // y con los bloques `union` y `representative` completos aunque vayan vacíos. Este
  // conector los omitía y mandaba el teléfono sin "+", y el 497 quedó siendo el ÚNICO
  // vendedor persona guardado así de todos los contratos abiertos de la cuenta.
  // Se deja idéntico a la UI para no volver a crear un registro fuera de formato.
  const tel = String(v.telefono || '').trim();
  const plano = {
    'sellers.0.name': v.nombres || '',
    'sellers.0.fLastName': v.apellidoPaterno || '',
    'sellers.0.mLastName': v.apellidoMaterno || '',
    'sellers.0.rut': v.rut || '',
    'sellers.0.email': v.email || '',
    'sellers.0.phone': tel ? (tel.startsWith('+') ? tel : '+' + tel.replace(/\D/g, '')) : '',
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
  // Bloques vacíos de cónyuge y representante, tal como los manda el formulario web.
  for (const bloque of ['union', 'representative']) {
    for (const campo of ['name', 'fLastName', 'mLastName', 'rut', 'dpto', 'street', 'houseNumber', 'phone', 'email']) {
      plano[`sellers.0.${bloque}.${campo}`] = '';
    }
    plano[`sellers.0.${bloque}.hasUnion`] = 'false';
    plano[`sellers.0.${bloque}.hasRepresentative`] = 'false';
    plano[`sellers.0.${bloque}.isBeneficiary`] = 'false';
  }
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

// Paso B (variante EMPRESA): vendedor persona jurídica.
//   Mismo endpoint y mismo multipart de claves punteadas, pero el bloque `sellers.0`
//   cambia entero: NO lleva name/fLastName/mLastName/hasUnion/union/representative
//   (esos son de persona natural), y en su lugar lleva `socialReason`, los datos de
//   constitución y el array `legalRepresentative.0.*`.
//
//   Mapeado el 08-08-2026 leyendo el vendedor ya guardado de la solicitud 475
//   (GYWL24 · SUN-GROUP SPA), que llegó hasta Registro Civil sin rebotar. Campos
//   exactos que devuelve el status para ese vendedor:
//     rut · socialReason · street · houseNumber · dpto · commune.{id,name,region.name}
//     isPublicDeed · constitutionDate · modificationDate
//     companyNotaryName · companyNotaryCommune · companyNotaryNumber
//     legalRepresentative.0.{name,fLastName,mLastName,rut,phone,email}
//   Ojo: la EMPRESA no lleva email ni teléfono propios — el contacto es el del
//   representante legal, y es ÉL quien firma el mandato.
//   Los documentos de sociedad (societyConstitution, validityOfPowers,
//   validityOfSociety, societyModifications, updatedStatute, eRutSii) son archivos
//   OPCIONALES: en GYWL24 fueron todos `false` y el contrato avanzó igual.
export async function ingresarVendedorEmpresaOC(publicId, empresa, { confirmar = false } = {}) {
  const e = empresa || {};
  const reps = Array.isArray(e.representantes) ? e.representantes : (e.representante ? [e.representante] : []);
  if (!e.razonSocial) throw new Error('Falta la razón social de la empresa vendedora.');
  if (!e.rut) throw new Error('Falta el RUT de la empresa vendedora.');
  if (!reps.length) throw new Error('Falta el REPRESENTANTE LEGAL de la empresa vendedora: es quien firma el mandato.');

  const tel = (t) => { const s = String(t || '').trim(); return s ? (s.startsWith('+') ? s : '+' + s.replace(/\D/g, '')) : ''; };
  const plano = {
    'sellers.0.rut': e.rut,
    'sellers.0.socialReason': e.razonSocial,
    'sellers.0.street': e.calle || '',
    'sellers.0.houseNumber': String(e.numero || ''),
    'sellers.0.dpto': e.depto || '',
    'sellers.0.commune.id': String(e.comuna?.id || ''),
    'sellers.0.commune.name': e.comuna?.name || '',
    'sellers.0.commune.region.name': e.comuna?.region?.name || '',
    'sellers.0.isPublicDeed': String(Boolean(e.escrituraPublica)),
    'sellers.0.constitutionDate': e.fechaConstitucion || '',
    'sellers.0.modificationDate': e.fechaModificacion || '',
    'sellers.0.companyNotaryName': e.notarioNombre || '',
    'sellers.0.companyNotaryCommune': e.notarioComuna || '',
    'sellers.0.companyNotaryNumber': e.notarioNumero || '',
  };
  reps.forEach((r, i) => {
    plano[`sellers.0.legalRepresentative.${i}.name`] = r.nombres || '';
    plano[`sellers.0.legalRepresentative.${i}.fLastName`] = r.apellidoPaterno || '';
    plano[`sellers.0.legalRepresentative.${i}.mLastName`] = r.apellidoMaterno || '';
    plano[`sellers.0.legalRepresentative.${i}.rut`] = r.rut || '';
    plano[`sellers.0.legalRepresentative.${i}.phone`] = tel(r.telefono);
    plano[`sellers.0.legalRepresentative.${i}.email`] = r.email || '';
  });

  const g = guardia('enterInfo', { publicId, ...plano }, confirmar);
  if (g) return g;
  const fd = new FormData();
  for (const [k, val] of Object.entries(plano)) fd.append(k, val);
  const r = await fetch(`${API_TR}/business/transfers/${publicId}/enter-seller-info`, {
    method: 'POST',
    headers: { accept: 'application/json', cookie: `authorization=${await jwt()}` },
    body: fd,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} enter-seller-info (empresa): ${(await r.text()).slice(0, 200)}`);
  return { ok: true, publicId, tipo: 'empresa', firmante: reps[0] };
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
//  CIERRE DEL CONTRATO ABIERTO (paso 4) — los 4 "próximos pasos" que muestra
//  AutoRed una vez FIRMADO el mandato:
//    1. Subir el permiso de circulación   -> POST /{id}/upload-documents
//    2. Completar la info del comprador   -> POST /{id}/enter-info
//    3. El comprador firma el contrato    -> GET  /{id}/signers?type=CONTRACT
//    4. Pagar los impuestos               -> POST /{id}/new-payment {type:'TAXES'}
//
//  Los payloads NO están adivinados: salen del bundle del front de AutoRed
//  (buildUploadDocumentsFormData / buildFormData / PayTaxes), leído el 07-08-2026,
//  y están contrastados contra la solicitud 475 (GYWL24) que llegó a Registro Civil.
// ============================================================

// ⛔ CANDADO — no escribir NUNCA sobre una solicitud muerta.
// El 07-08-2026, probando el flujo, se le escribió a 5 solicitudes ABORTADAS creyendo
// que estaban inertes: NO lo estaban. El backend las aceptó y las REVIVIÓ (una llegó a
// SIGN_MANDATE, o sea a punto de pedirle la firma a una persona real). Hubo que
// abortarlas de nuevo una por una. Desde entonces toda escritura del cierre chequea
// primero el estado y se niega si la solicitud está abortada, rechazada o finalizada.
const ESTADOS_MUERTOS = ['ABORTED', 'REJECTED', 'COMPLETED'];
async function exigirViva(publicId, accion) {
  let e;
  try { e = await estadoTransferencia(publicId); } catch { return; }   // si no se puede leer, no bloqueamos
  if (ESTADOS_MUERTOS.includes(e.status)) {
    throw new Error(`No se escribe sobre una solicitud ${e.status}: ${accion} cancelado (${publicId}). Escribirle la REVIVE.`);
  }
}

// Bitácora de mapeo: cada escritura del cierre deja request + respuesta acá. Sirve
// para aprender del uso real de Joaquín sin tener que estar mirándole la pantalla.
const MAPEO_LOG = path.join(__dirname, 'mapeo-cierre.jsonl');
function anotarMapeo(evento, datos) {
  try {
    fs.appendFileSync(MAPEO_LOG, JSON.stringify({ ts: new Date().toISOString(), evento, ...datos }) + '\n');
  } catch { /* la bitácora nunca puede romper la operación */ }
}
export function leerMapeo(limite = 50) {
  try {
    return fs.readFileSync(MAPEO_LOG, 'utf8').trim().split('\n').filter(Boolean).slice(-limite).map((l) => JSON.parse(l));
  } catch { return []; }
}

// Aplana un objeto a claves punteadas, igual que el `buildFormData` del front
// (utils 83162): arrays -> `k.0`, objetos -> `k.sub`, null/undefined se OMITEN.
function aplanarEnFormData(fd, valor, prefijo = '') {
  if (valor == null) return;
  if (Array.isArray(valor)) { valor.forEach((v, i) => aplanarEnFormData(fd, v, `${prefijo}.${i}`)); return; }
  if (typeof valor !== 'object') { fd.append(prefijo, typeof valor === 'boolean' || typeof valor === 'number' ? String(valor) : valor); return; }
  for (const k of Object.keys(valor)) aplanarEnFormData(fd, valor[k], prefijo ? `${prefijo}.${k}` : k);
}

// Las 6 formas de pago del formulario. La suma DEBE dar exactamente el precio de venta
// (lo valida el front antes de enviar: "La suma de las formas de pago debe ser igual...").
export const FORMAS_PAGO = ['efectivo', 'credito', 'tarjetaCredito', 'alContado', 'cheque', 'valeVista'];
export const FORMAS_PAGO_NOMBRE = {
  efectivo: 'Efectivo', credito: 'Crédito', tarjetaCredito: 'Tarjeta de crédito',
  alContado: 'Al contado', cheque: 'Cheque', valeVista: 'Vale vista',
};
const soloDigitos = (x) => parseInt(String(x ?? '').replace(/[^0-9]/g, ''), 10) || 0;
const conPuntos = (n) => String(soloDigitos(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Arma el objeto paymentMethods completo (las 6 claves, marcadas o no).
// `formas` = {alContado: 25000000} o {efectivo: 5000000, cheque: 20000000}.
export function armarFormasPago(formas = {}) {
  const out = {};
  for (const k of FORMAS_PAGO) {
    const monto = soloDigitos(formas[k]);
    out[k] = monto > 0 ? { checked: true, amount: conPuntos(monto) } : { checked: false, amount: '' };
  }
  return out;
}
export const totalFormasPago = (formas = {}) =>
  Object.values(formas).reduce((a, f) => a + soloDigitos(f?.amount), 0);

// Impuesto de transferencia = 1,5% del MAYOR entre precio de venta y tasación fiscal,
// más el arancel del Registro Civil (el front usa 36.030 cuando la API no lo manda).
export const COSTO_REGISTRO_CIVIL = 36030;
export function costoTransferencia({ precioVenta, tasacion, registroCivil } = {}) {
  const base = Math.max(soloDigitos(precioVenta), soloDigitos(tasacion));
  // ⚠️ El front hace `parseInt(0.015*base)`, o sea TRUNCA, y por eso muestra 1 peso de
  // menos cuando hay decimales. Lo real REDONDEA: contrastado contra los Formulario 23
  // efectivamente pagados (KPDT21 656.249,64 -> 656.250 · HLDC70 228.274,995 -> 228.275 ·
  // RYWK18 240.000 exacto). Redondeamos para que el número que le decimos al usuario sea
  // el que de verdad va a pagar.
  const impuesto = Math.round(0.015 * base) || 0;
  const rc = registroCivil == null ? COSTO_REGISTRO_CIVIL : soloDigitos(registroCivil);
  return { base, impuesto, registro_civil: rc, total: impuesto + rc };
}

// Formatos que AutoRed acepta para el permiso de circulación (lista del front).
const MIMES = {
  '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.heic': 'image/heic', '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
export function mimeDeArchivo(ruta) {
  return MIMES[path.extname(String(ruta || '')).toLowerCase()] || 'application/octet-stream';
}
export const FORMATOS_PERMISO = Object.keys(MIMES);

// PASO 1 — Permiso de circulación + tasación + precio + formas de pago.
// multipart: drivingPermit (archivo), commune, siiCode, taxationPrice, expirationDate,
//            year, price, paymentMethods (JSON string).
export async function subirPermisoCirculacion(publicId, datos = {}, { confirmar = false } = {}) {
  const { archivo, comuna, siiCode, tasacionPrecio, vencimiento, precioVenta, formasPago } = datos;
  const pagos = formasPago && typeof formasPago === 'object' && 'efectivo' in formasPago ? formasPago : armarFormasPago(formasPago || {});
  const resumen = {
    publicId, archivo: archivo || null, commune: comuna || '', siiCode: siiCode || '',
    taxationPrice: String(soloDigitos(tasacionPrecio)), expirationDate: vencimiento || '',
    year: String(vencimiento || '').slice(0, 4), price: String(soloDigitos(precioVenta)),
    paymentMethods: pagos,
  };
  const g = guardia('uploadDocuments', resumen, confirmar);
  if (g) return { ...g, nota: 'Sube el permiso de circulación y fija tasación, precio y formas de pago.' };
  await exigirViva(publicId, 'subir el permiso de circulación');
  if (!archivo || !fs.existsSync(archivo)) throw new Error(`No encuentro el archivo del permiso de circulación: ${archivo}`);
  // Chequeos que hace el front antes de enviar: formato y tamaño. Mejor fallar acá con un
  // mensaje claro que comerse un rechazo mudo de AutoRed.
  const ext = path.extname(archivo).toLowerCase();
  if (!MIMES[ext]) throw new Error(`El permiso de circulación está en ${ext || 'un formato desconocido'} y AutoRed no lo acepta. Formatos válidos: ${FORMATOS_PERMISO.join(', ')}.`);
  const tam = fs.statSync(archivo).size;
  if (tam > 10 * 1024 * 1024) throw new Error(`El archivo del permiso pesa ${(tam / 1024 / 1024).toFixed(1)} MB y el máximo son 10 MB.`);
  const suma = totalFormasPago(pagos);
  if (suma !== soloDigitos(precioVenta)) {
    throw new Error(`La suma de las formas de pago (${conPuntos(suma)}) debe ser igual al precio de venta (${conPuntos(precioVenta)}).`);
  }
  const fd = new FormData();
  fd.append('commune', String(comuna || ''));
  fd.append('siiCode', String(siiCode || ''));
  const buf = fs.readFileSync(archivo);
  // ⚠️ El tipo MIME va SÍ o SÍ: AutoRed valida el formato del archivo y un Blob sin
  // `type` viaja como application/octet-stream, que no está en su lista de permitidos.
  fd.append('drivingPermit', new Blob([buf], { type: mimeDeArchivo(archivo) }), path.basename(archivo));
  fd.append('taxationPrice', String(soloDigitos(tasacionPrecio)));
  fd.append('expirationDate', String(vencimiento || ''));
  fd.append('year', String(vencimiento || '').slice(0, 4));
  fd.append('price', String(soloDigitos(precioVenta)));
  fd.append('paymentMethods', JSON.stringify(pagos));
  const r = await fetch(`${API_TR}/business/transfers/${publicId}/upload-documents`, {
    method: 'POST', headers: { accept: 'application/json', cookie: `authorization=${await jwt()}` }, body: fd,
  });
  const txt = await r.text();
  anotarMapeo('upload-documents', { publicId, enviado: resumen, http: r.status, respuesta: txt.slice(0, 600) });
  if (!r.ok) throw new Error(`HTTP ${r.status} upload-documents: ${txt.slice(0, 300)}`);
  return { ok: true, publicId, respuesta: (() => { try { return JSON.parse(txt); } catch { return txt; } })() };
}

// Normaliza un comprador (persona o empresa) al shape que espera el backend.
// Persona  -> mapToPerson del front. Empresa -> mapToLegalPerson.
export function armarComprador(c = {}) {
  const comuna = c.comuna && typeof c.comuna === 'object'
    ? { id: parseInt(String(c.comuna.id || 0), 10), name: c.comuna.name || '', region: { name: c.comuna.region?.name || c.comuna['region.name'] || '' } }
    : null;
  if (c.empresa || c.socialReason) {
    return {
      rut: c.rut || '', socialReason: c.empresa || c.socialReason || '', commune: comuna,
      street: c.calle || c.street || '', houseNumber: String(c.numero || c.houseNumber || ''), dpto: c.depto || c.dpto || '',
      isPublicDeed: Boolean(c.escrituraPublica ?? c.isPublicDeed ?? false),
      constitutionDate: c.fechaConstitucion || c.constitutionDate || '',
      modificationDate: c.fechaModificacion || c.modificationDate || '',
      companyNotaryName: c.notarioNombre || c.companyNotaryName || null,
      companyNotaryCommune: c.notarioComuna || c.companyNotaryCommune || null,
      companyNotaryNumber: (c.notarioNumero ?? c.companyNotaryNumber) != null && String(c.notarioNumero ?? c.companyNotaryNumber) !== ''
        ? parseInt(String(c.notarioNumero ?? c.companyNotaryNumber), 10) : null,
      legalRepresentative: (c.representantes || c.legalRepresentative || []).map((r) => ({
        name: r.nombres || r.name || '', fLastName: r.apellidoPaterno || r.fLastName || '',
        mLastName: r.apellidoMaterno || r.mLastName || '', rut: r.rut || '',
        phone: r.telefono || r.phone || '', email: r.email || '',
      })),
    };
  }
  // Persona vacía: el front manda SIEMPRE los bloques `representative` y `union` con
  // strings vacíos, aunque hasRepresentative/hasUnion sean false. Capturado del envío
  // real del formulario de AutoRed el 07-08-2026.
  const personaVacia = () => ({
    name: '', fLastName: '', mLastName: '', rut: '', dpto: '', street: '', houseNumber: '',
    phone: '', email: '', hasUnion: false, hasRepresentative: false, isBeneficiary: false,
  });
  // El teléfono del comprador viaja CON el "+" (ej. +56941407708). El del vendedor, en
  // cambio, se re-envía tal cual lo devuelve el status (sin "+"): así lo hace el front.
  const tel = String(c.telefono || c.phone || '').trim();
  return {
    name: c.nombres || c.name || '', fLastName: c.apellidoPaterno || c.fLastName || '',
    mLastName: c.apellidoMaterno || c.mLastName || '', rut: c.rut || '',
    dpto: c.depto || c.dpto || '', commune: comuna,
    street: c.calle || c.street || '', houseNumber: String(c.numero || c.houseNumber || ''),
    phone: tel ? (tel.startsWith('+') ? tel : '+' + tel.replace(/\D/g, '')) : '',
    email: c.email || '',
    hasUnion: Boolean(c.conyuge), hasRepresentative: Boolean(c.representante), isBeneficiary: false,
    representative: c.representante && typeof c.representante === 'object' ? armarComprador(c.representante) : personaVacia(),
    union: c.conyuge && typeof c.conyuge === 'object' ? armarComprador(c.conyuge) : personaVacia(),
  };
}

// PASO 2 — Datos del comprador. ⚠️ El endpoint es `enter-info` (NO "enter-buyer-info")
// y hay que MANDAR TAMBIÉN a los vendedores que ya están cargados: el front envía
// {sellers, buyers} completo y el backend reemplaza ambos lados. Si mandás solo buyers,
// borrás al vendedor.
export async function ingresarCompradorOC(publicId, comprador, { confirmar = false } = {}) {
  const estado = await estadoTransferencia(publicId);
  const sellers = Array.isArray(estado.sellers) ? estado.sellers : [];
  const buyers = [armarComprador(comprador)];
  const payload = { sellers, buyers };
  const g = guardia('enterInfo', { publicId, endpoint: 'enter-info', buyers, sellers_reenviados: sellers.length }, confirmar);
  if (g) return { ...g, nota: 'Ingresa al comprador. Los vendedores se re-envían tal cual para no borrarlos.' };
  if (ESTADOS_MUERTOS.includes(estado.status)) throw new Error(`No se escribe sobre una solicitud ${estado.status}: ingresar comprador cancelado (${publicId}). Escribirle la REVIVE.`);
  const fd = new FormData();
  aplanarEnFormData(fd, payload);
  const r = await fetch(`${API_TR}/business/transfers/${publicId}/enter-info`, {
    method: 'POST', headers: { accept: 'application/json', cookie: `authorization=${await jwt()}` }, body: fd,
  });
  const txt = await r.text();
  const claves = [...fd.keys()];
  anotarMapeo('enter-info', { publicId, claves, buyers, http: r.status, respuesta: txt.slice(0, 600) });
  if (!r.ok) throw new Error(`HTTP ${r.status} enter-info: ${txt.slice(0, 300)}`);
  return { ok: true, publicId, respuesta: (() => { try { return JSON.parse(txt); } catch { return txt; } })() };
}

// Previsualiza las claves planas que se le mandarían a enter-info, sin enviar nada.
// Sirve para revisar el mapeo contra lo que hace el front sin gastar una solicitud.
export async function clavesEnterInfo(publicId, comprador) {
  const estado = await estadoTransferencia(publicId);
  const fd = new FormData();
  aplanarEnFormData(fd, { sellers: Array.isArray(estado.sellers) ? estado.sellers : [], buyers: [armarComprador(comprador)] });
  return [...fd.entries()].map(([k, v]) => `${k} = ${v}`);
}

// PASO 3 (lectura) — link de firma del CONTRATO (el que firma el COMPRADOR).
// Ojo: el mandato es type=OC_MANDATE (lo firma el vendedor); el contrato es type=CONTRACT.
// ⚠️ El contrato lo firman DOS partes (vendedor y comprador), no una. Verificado en 4
// contratos reales: `signers[0]` NO siempre es el comprador (en GYWL24 el primero era el
// representante del vendedor). Por eso se cruza cada firmante con los RUT del comprador
// que trae el status, en vez de asumir el orden.
const soloRut = (r) => String(r || '').replace(/[^0-9kK]/g, '').toUpperCase();
export async function firmaContrato(publicId) {
  const [f, estado] = await Promise.all([
    firmantes(publicId, 'CONTRACT'),
    estadoTransferencia(publicId).catch(() => ({})),
  ]);
  const rutsComprador = new Set();
  for (const b of estado.buyers || []) {
    if (b.rut) rutsComprador.add(soloRut(b.rut));
    for (const rep of b.legalRepresentative || []) if (rep.rut) rutsComprador.add(soloRut(rep.rut));
    if (b.representative?.rut) rutsComprador.add(soloRut(b.representative.rut));
  }
  const lista = (f.signers || []).map((s) => ({
    nombre: [s.name, s.fLastName, s.mLastName].filter(Boolean).join(' ') || s.socialReason || '',
    rut: s.rut, email: s.email, estado: s.status, linkFirma: s.signUrl,
    lado: rutsComprador.has(soloRut(s.rut)) ? 'comprador' : 'vendedor',
  }));
  return {
    documento: f.documentUrl,
    firmantes: lista,
    comprador: lista.filter((s) => s.lado === 'comprador'),
    vendedor: lista.filter((s) => s.lado === 'vendedor'),
    faltan_firmar: lista.filter((s) => s.estado !== 'SIGNED').map((s) => s.nombre || s.rut),
  };
}

// PASO 4 — Impuestos. new-payment NO descuenta plata solo: GENERA el cobro y devuelve
// `paymentUrl` (link de pago). Alguien tiene que entrar a pagar en ese link.
export async function generarPagoImpuestos(publicId, { tipo = 'TAXES', confirmar = false } = {}) {
  const g = guardia('newPayment', { publicId, type: tipo }, confirmar);
  if (g) return { ...g, nota: 'Genera el cobro de los impuestos de transferencia y devuelve el link de pago.' };
  await exigirViva(publicId, 'generar el cobro de impuestos');
  const r = await api(`${API_TR}/business/transfers/${publicId}/new-payment`, { method: 'POST', body: { type: tipo } });
  anotarMapeo('new-payment', { publicId, type: tipo, respuesta: JSON.stringify(r).slice(0, 600) });
  return r;
}

// Volver a un paso anterior del wizard (uploadDocuments / enterInfo / enterSellerInfo).
export async function volverAPaso(publicId, paso, { confirmar = false } = {}) {
  const g = guardia('enterInfo', { publicId, go_back: paso }, confirmar);
  if (g) return g;
  return api(`${API_TR}/business/transfers/${publicId}/go-back`, { method: 'POST', body: { step: paso } });
}

// Lee el estado y traduce en qué paso del CIERRE está la solicitud y qué falta.
// Es la brújula del orquestador: nunca adivinamos el paso, se lo preguntamos a AutoRed.
export const PASOS_CIERRE = {
  // Estado inicial del Contrato Abierto: falta cargar al vendedor y generar el mandato.
  // Faltaba en este mapa, así que la brújula devolvía paso "desconocido" y Nexus se
  // quedaba sin saber qué pedir (visto el 15-08-2026 en la solicitud 516 / TFDY46).
  ENTER_SELLER_INFO: { paso: 'vendedor', titulo: 'Cargar los datos del vendedor y generar el mandato' },
  GENERATING_MANDATE: { paso: 'esperar', titulo: 'AutoRed está generando el mandato' },
  SIGN_MANDATE: { paso: 'firma', titulo: 'El vendedor debe firmar el mandato' },
  GENERATING_CAV: { paso: 'esperar', titulo: 'AutoRed está generando el CAV' },
  UPLOAD_DOCUMENTS: { paso: 'permiso', titulo: 'Subir el permiso de circulación' },
  ENTER_INFO: { paso: 'comprador', titulo: 'Completar la información del comprador' },
  VERIFYING_DOCUMENTS: { paso: 'esperar', titulo: 'AutoRed está verificando los documentos' },
  CREATING_CONTRACT: { paso: 'esperar', titulo: 'AutoRed está creando el contrato' },
  SIGN_CONTRACT: { paso: 'firma_comprador', titulo: 'El comprador debe firmar el contrato' },
  SIGNED_CONTRACT: { paso: 'impuestos', titulo: 'Realizar el pago de impuestos' },
  PAY_TAXES: { paso: 'impuestos', titulo: 'Realizar el pago de impuestos' },
  NOTARY: { paso: 'esperar', titulo: 'En notaría' },
  CIVIL_REGISTRY: { paso: 'esperar', titulo: 'En el Registro Civil' },
  COMPLETED: { paso: 'listo', titulo: 'Transferencia finalizada' },
  ABORTED: { paso: 'abortado', titulo: 'Solicitud abortada' },
  REJECTED: { paso: 'rechazado', titulo: 'Solicitud rechazada' },
};

export async function estadoCierre(publicId) {
  const e = await estadoTransferencia(publicId);
  const mapa = PASOS_CIERRE[e.status] || { paso: 'desconocido', titulo: e.status };
  const v = e.vehicle || {};
  // En un contrato de EMPRESA (B2B) el paso `comprador` no es "cargar al comprador":
  // es cargar a la CONTRAPARTE, que según el modo es el vendedor (si Mallorca compra)
  // o el comprador (si vende). El otro lado ya lo sabemos: es ANA CLARA SPA.
  const modo = e.kind === 'B2B' ? modoDeContrato(e) : (e.kind === 'B2B_OC' ? 'abierto' : null);
  let paso = mapa.paso;
  let titulo = mapa.titulo;
  if (modo === 'compra' && paso === 'comprador') { paso = 'contraparte'; titulo = 'Completar los datos del VENDEDOR (Ana Clara SPA es la compradora)'; }
  if (modo === 'venta' && paso === 'comprador') { paso = 'contraparte'; titulo = 'Completar los datos del COMPRADOR (Ana Clara SPA es la vendedora)'; }
  return {
    publicId, id: e.id, kind: e.kind, estado: e.status,
    modo, creado_por: e.createdBy,
    tipo_contrato: modo === 'compra' ? 'Automotora Compra (contrato de empresa)'
      : modo === 'venta' ? 'Automotora Vende (contrato de empresa)'
      : modo === 'abierto' ? 'Contrato Abierto' : (e.kind || 'desconocido'),
    paso, titulo_paso: titulo,
    patente: v.licensePlate, auto: [v.brandName, v.modelName, v.year].filter(Boolean).join(' '),
    precio_venta: v.sellingPrice, tasacion: v.taxationPrice, sii_code: v.siiCode,
    comuna_permiso: v.permitCommune, vence_permiso: v.expirationCirculationPermit,
    formas_pago: e.paymentMethods,
    vendedores: (e.sellers || []).map((s) => ({ nombre: [s.name, s.fLastName, s.mLastName].filter(Boolean).join(' ') || s.socialReason, rut: s.rut })),
    compradores: (e.buyers || []).map((b) => ({ nombre: [b.name, b.fLastName, b.mLastName].filter(Boolean).join(' ') || b.socialReason, rut: b.rut })),
    hitos: {
      permiso_subido: Boolean(e.uploadedDocuments),
      comprador_ingresado: Boolean(e.enteredInfo),
      contrato_creado: Boolean(e.createdContract),
      contrato_firmado: Boolean(e.signedContract),
      impuestos_pagados: Boolean(e.paidTaxes),
    },
    tiene_permiso: (e.documents || []).some((d) => d.type === 'CIRCULATION_PERMIT'),
    limitaciones_dominio: Boolean(e.hasDomainLimits),
    vendedor_invalido: Boolean(e.isSellerInvalid),
    deuda_pension_vendedor: Boolean(e.sellerHasPensionDebt),
    deuda_pension_comprador: Boolean(e.buyerHasPensionDebt),
    pasos_editables: e.editableSteps || [],
    registro_civil_costo: e.regCivilCost ?? null,
    documentos: (e.documents || []).map((d) => ({ tipo: d.type, nombre: d.originalName, estado: d.status, url: d.publicUrl })),
  };
}

// Busca la solicitud ABIERTA más reciente de una patente (o la última en general).
export async function ultimoContrato(patente = '') {
  const l = await listarTransferencias({ patente: String(patente || '').toUpperCase().replace(/[\s.\-]/g, ''), filas: 20 });
  const rows = (l.rows || []).filter((r) => !['ABORTED', 'REJECTED'].includes(r.status));
  return rows[0] || null;
}

// ============================================================
//  INFORMES / CAV  (base /api/v2/reports) — la que quiere Meme
// ============================================================
// Tipos (radio UI -> reportType que se envía):
//   'CAV'                      -> reportType 'CAV_RAW'   (el CAV rápido; se genera al instante)
//   'Informe Autored'          -> reportType 'CAV'
//   'Informe Autored Completo' -> reportType 'NMP'
// Compras de informes vivas en este proceso, para que dos turnos simultáneos del mismo
// usuario no compren dos veces lo mismo (ver el candado en comprarInforme).
const _comprasEnVuelo = new Map();
// Si ya se compró ese informe hace menos de esto, se reusa en vez de volver a cobrar.
const VENTANA_REUSO_MS = Number(process.env.AUTORED_VENTANA_REUSO_MIN || 10) * 60000;

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
  // Sin NMP no nos quedamos ciegos: caemos al mejor informe que haya (CAV). El CAV identifica
  // el auto (marca/modelo/año/motor/chasis/color/combustible) aunque NO trae el kilometraje.
  // Antes esto devolvía sin_informe y el flujo de compra perdía hasta los datos del vehículo,
  // pese a que la revisión de documentos sí sabía leer el CAV.
  let elegido = nmp, parser = 'leer_nmp.py', solo_cav = false;
  if (!elegido) {
    const otros = rows.filter((r) => String(r.ready) === 'true' && (r.url || r.publicUrl))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    elegido = otros[0];
    parser = 'leer_cav.py';
    solo_cav = true;
  }
  if (!elegido) return { ok: false, sin_informe: true, patente: pat, nota: 'No hay ningún informe comprado para esta patente. No se compra automáticamente.' };
  const dest = path.join('/tmp', `nmp_compra_${pat}.pdf`);
  await descargarInforme(elegido.url || elegido.publicUrl, dest);
  let campos = {};
  try {
    const out = execFileSync('python3', [path.join(__dirname, parser), dest], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    campos = (JSON.parse(out) || {}).campos || {};
  } catch (e) {
    return { ok: false, error: `No pude leer el informe: ${e.message}`, informe_id: elegido.id, pdf: dest };
  }
  return {
    ok: true, patente: campos.patente || pat, campos,
    informe_id: elegido.id, informe_tipo: elegido.reportType,
    informe_nombre: NOMBRE_INFORME[elegido.reportType] || elegido.reportType,
    informe_fecha: elegido.createdAt, pdf: dest,
    solo_cav,                                   // true = NO hay km (el CAV no lo trae): pedirlo
    sin_km: campos.km == null,
  };
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
  // ── CANDADO ANTI-DOBLE-COMPRA ────────────────────────────────────────────────
  // 15-08-2026: Joaquín mandó "genera informe completo" y 11 s después otro mensaje;
  // el hub abrió DOS turnos en paralelo y cada uno compró un NMP de TFDY46 (ids
  // 331147 y 331148, 12 s de diferencia). El chequeo de "hay uno en curso" miraba
  // ready:false en la lista y perdió la carrera: cuando el segundo turno consultó, la
  // compra del primero todavía no figuraba. Ahora hay dos redes:
  //   1) COMPRAS EN VUELO: si ya hay una compra viva del mismo (patente, tipo) en este
  //      proceso, se devuelve LA MISMA promesa en vez de disparar otra.
  //   2) COMPRA RECIENTE: si ya se compró ese mismo informe hace poco, se reusa.
  const clave = `${patente}|${reportType}`;
  if (_comprasEnVuelo.has(clave)) {
    const enVuelo = await _comprasEnVuelo.get(clave);
    return { ...enVuelo, reusado: 'compra_en_vuelo', nota: 'Ya había una compra de este mismo informe en curso; se reusó en vez de comprar otro.' };
  }
  const reciente = (previos || []).find?.((r) => {
    if (String(r.reportType) !== String(reportType)) return false;
    const t = Date.parse(r.createdAt || r.created_at || '');
    return Number.isFinite(t) && (Date.now() - t) < VENTANA_REUSO_MS;
  });
  if (reciente) {
    // `check-repeated` solo trae {reportType, createdAt}: hay que ir a buscar la fila
    // completa (id + url) para poder devolver el PDF. Si el informe reciente todavía no
    // está listo, se espera igual que una compra propia en vez de comprar otro.
    const buscarFila = async () => {
      const lst = await listarInformes({ patente, filas: 20 }).catch(() => ({}));
      const rows = lst.rows || lst || [];
      return (Array.isArray(rows) ? rows : [])
        .filter((x) => String(x.reportType) === String(reportType))
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;
    };
    const nota = `Ya había un ${NOMBRE_INFORME[reportType] || reportType} de ${patente} comprado hace menos de ${Math.round(VENTANA_REUSO_MS / 60000)} min; se reusó en vez de comprar otro (NO se cobró de nuevo).`;
    let fila = await buscarFila();
    if (esperar) {
      const t0 = Date.now();
      while ((!fila || !fila.ready || !(fila.url || fila.publicUrl)) && Date.now() - t0 < timeoutMs) {
        await new Promise((r) => setTimeout(r, 8000));
        fila = await buscarFila();
      }
    }
    if (fila) return { ...fila, url: fila.url || fila.publicUrl, repetidos_previos: previos, reusado: 'compra_reciente', nota };
    return { ...reciente, repetidos_previos: previos, reusado: 'compra_reciente', ready: false, nota };
  }
  const tarea = (async () => {
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
  })();
  _comprasEnVuelo.set(clave, tarea);
  try { return await tarea; } finally { _comprasEnVuelo.delete(clave); }
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
      case 'cierre': out(await estadoCierre(args[0])); break;
      case 'firma-contrato': out(await firmaContrato(args[0])); break;
      case 'ultimo': out(await ultimoContrato(args[0] || '')); break;
      case 'mapeo': out(leerMapeo(Number(args[0]) || 30)); break;
      case 'login': out(await login().then(() => ({ ok: true, msg: 'sesión renovada' }))); break;
      default:
        console.log(`Comandos: quien | creditos | resumen | rc | lista [patente] | estado <publicId> | impuestos <publicId> | vehiculo <patente> | informes [patente] | repetidos <patente> | comuna <nombre> | revisar <patente> | firma <publicId> | docs <publicId> | login
Escritura (cobra) solo vía import + AUTORED_PERMITIR_ESCRITURA=1 + { confirmar:true }.`);
    }
  } catch (e) { console.error('ERROR:', e.message); process.exit(1); }
}

if (import.meta.url === `file://${process.argv[1]}`) cli();

// ============================================================
//  CONTRATO DE EMPRESA (B2B) — el formato que Mallorca usa DE VERDAD
// ============================================================
// Ramón, 15-08-2026: "tiene que ser contrato de empresa nada más". Las solicitudes
// reales de la cuenta lo confirman: el Contrato Abierto (B2B_OC) NO es lo que usan.
// Lo que usan es `kind:'B2B'` con:
//   · createdBy 'buyers'  → AUTOMOTORA COMPRA: ANA CLARA SPA va de COMPRADORA
//                           (ej. solicitud 513 / GPBT31, vendedora Elisa Prado).
//   · createdBy 'sellers' → AUTOMOTORA VENDE: ANA CLARA SPA va de VENDEDORA
//                           (ej. solicitud 473 / SPCT11, compradora WINDMADE SPA).
// El B2B es más corto que el Contrato Abierto: `editableSteps` = ["uploadDocuments",
// "enterInfo"], sin mandato irrevocable a Autosafe ni firma previa del vendedor.

// Datos de la empresa, copiados TAL CUAL de cómo quedó guardada en la solicitud 513
// (que la hizo Joaquín a mano en la web de AutoRed y llegó a PAY_TAXES sin rebotar).
// Los campos autogenerados del representante (id, companyId, createdAt, ...) NO se
// re-envían: el backend los resuelve por RUT contra la empresa registrada (id 506).
export const ANA_CLARA = {
  rut: '77.271.121-2',
  socialReason: 'ANA CLARA SPA',
  street: 'Caupolican',
  houseNumber: '9291',
  dpto: '',
  commune: { id: '100', name: 'Quilicura', region: { id: '7', name: 'Metropolitana de Santiago' } },
  isPublicDeed: false,
  constitutionDate: '2020-12-03',
  companyNotaryName: '',
  companyNotaryCommune: '',
  legalRepresentative: [{
    name: 'Nicolás Patricio',
    fLastName: 'Juri',
    mLastName: 'Caballero',
    rut: '16.142.580-K',
    // El email aparece distinto entre contratos (njuri@mallorcautos.cl en el 473,
    // nicolas.juri@importhn.com en el 513). Se deja el de Mallorca por ser el de la
    // empresa del contrato; se puede pisar con AUTORED_REP_EMAIL en el .env.
    email: process.env.AUTORED_REP_EMAIL || 'njuri@mallorcautos.cl',
    phone: '+56975481858',
  }],
};

export const MODOS_B2B = {
  compra: { clientType: 'buyers', titulo: 'Automotora Compra', ladoEmpresa: 'buyers', ladoContraparte: 'sellers' },
  venta: { clientType: 'sellers', titulo: 'Automotora Vende', ladoEmpresa: 'sellers', ladoContraparte: 'buyers' },
};

// Paso 1 — crear la solicitud B2B. ⚠️ COBRA igual que el Contrato Abierto: 1 crédito + el CAV.
export async function crearContratoEmpresa(patente, { modo = 'compra', prohibicion = null, forzar = false, confirmar = false } = {}) {
  const m = MODOS_B2B[modo];
  if (!m) throw new Error(`Modo inválido "${modo}": usa "compra" o "venta".`);
  const pat = String(patente || '').toUpperCase().replace(/[\s.\-]/g, '');
  const payload = {
    email: EMAIL,
    licensePlate: pat,
    phone: '',
    clientType: m.clientType,
    kind: 'B2B',
    creditor: { name: prohibicion?.name || '', rut: prohibicion?.rut || '' },
    forceCreation: Boolean(forzar),
  };
  const g = guardia('initialize', payload, confirmar);
  if (g) return { ...g, nota: `Crea el contrato de empresa (${m.titulo}): 1 crédito + la compra del CAV.` };
  const r = await api(`${API_TR}/business/transfers/initialize`, { method: 'POST', body: payload });
  anotarMapeo('initialize-b2b', { patente: pat, modo, clientType: m.clientType, respuesta: JSON.stringify(r).slice(0, 400) });
  return r;
}

// ¿De qué lado va la empresa en esta solicitud? Se lee del propio contrato (`createdBy`),
// nunca se adivina: es lo que decide si ANA CLARA es compradora o vendedora.
export function modoDeContrato(estado) {
  if (estado?.kind !== 'B2B') return null;
  if (estado.createdBy === 'buyers') return 'compra';
  if (estado.createdBy === 'sellers') return 'venta';
  return null;
}

// Paso 2 — `enter-info` del B2B. Mismo endpoint y mismo multipart que el Contrato Abierto:
// manda AMBOS lados juntos y el backend los reemplaza. La diferencia es que un lado ya lo
// sabemos (ANA CLARA) y el otro es la contraparte que nos dicta la persona.
export async function ingresarPartesB2B(publicId, contraparte, { confirmar = false } = {}) {
  const estado = await estadoTransferencia(publicId);
  const modo = modoDeContrato(estado);
  if (!modo) throw new Error(`La solicitud ${publicId} no es un contrato de empresa B2B (kind ${estado?.kind}, createdBy ${estado?.createdBy}). Para un Contrato Abierto usa ingresarCompradorOC.`);
  const m = MODOS_B2B[modo];
  const payload = {
    [m.ladoEmpresa]: [ANA_CLARA],
    [m.ladoContraparte]: [armarComprador(contraparte)],
  };
  const g = guardia('enterInfo', { publicId, endpoint: 'enter-info', modo, titulo: m.titulo, empresa: m.ladoEmpresa, contraparte: payload[m.ladoContraparte] }, confirmar);
  if (g) return { ...g, modo, titulo: m.titulo, nota: `${m.titulo}: ANA CLARA SPA va como ${m.ladoEmpresa === 'buyers' ? 'COMPRADORA' : 'VENDEDORA'} y la contraparte del otro lado.` };
  if (ESTADOS_MUERTOS.includes(estado.status)) throw new Error(`No se escribe sobre una solicitud ${estado.status}: enter-info cancelado (${publicId}). Escribirle la REVIVE.`);
  const fd = new FormData();
  aplanarEnFormData(fd, payload);
  const r = await fetch(`${API_TR}/business/transfers/${publicId}/enter-info`, {
    method: 'POST', headers: { accept: 'application/json', cookie: `authorization=${await jwt()}` }, body: fd,
  });
  const txt = await r.text();
  anotarMapeo('enter-info-b2b', { publicId, modo, claves: [...fd.keys()], http: r.status, respuesta: txt.slice(0, 600) });
  // Igual que en el OC: puede tardar y devolver 504 sin haber guardado. No concluir solo.
  if (!r.ok) throw new Error(`HTTP ${r.status} enter-info (${m.titulo}): ${txt.slice(0, 300)}`);
  return { ok: true, publicId, modo, titulo: m.titulo, respuesta: (() => { try { return JSON.parse(txt); } catch { return txt; } })() };
}

// Previsualiza las claves planas del enter-info B2B sin mandar nada (control del mapeo).
export async function clavesEnterInfoB2B(publicId, contraparte) {
  const estado = await estadoTransferencia(publicId);
  const modo = modoDeContrato(estado);
  if (!modo) throw new Error(`La solicitud ${publicId} no es B2B.`);
  const m = MODOS_B2B[modo];
  const fd = new FormData();
  aplanarEnFormData(fd, { [m.ladoEmpresa]: [ANA_CLARA], [m.ladoContraparte]: [armarComprador(contraparte)] });
  return [...fd.entries()].map(([k, v]) => `${k} = ${v}`);
}

// ¿A QUIÉN se le está comprando el auto? Titular del vehículo según el informe/CAV YA
// COMPRADO — NO compra nada. Sirve para que Nexus no pregunte "¿el vendedor es persona o
// empresa?" cuando el propio informe ya dice que es una SpA (Ramón, 15-08-2026: hay que
// pedirle los datos de la EMPRESA a la que se le compra, no preguntar lo que ya sabemos).
export async function titularDelAuto(patente) {
  const pat = String(patente || '').toUpperCase().replace(/[\s.\-]/g, '');
  if (!pat) return { ok: false, error: 'Falta la patente.' };
  const lst = await listarInformes({ patente: pat, filas: 30 }).catch(() => ({}));
  const rows = lst.rows || lst || [];
  const listos = (Array.isArray(rows) ? rows : []).filter((r) => String(r.ready) === 'true' && (r.url || r.publicUrl));
  // CAV primero: el titular sale más limpio ahí; el NMP también lo trae embebido.
  const orden = { CAV_RAW: 0, CAV: 1, NMP: 2 };
  const elegido = listos.sort((a, b) =>
    (orden[a.reportType] ?? 9) - (orden[b.reportType] ?? 9) ||
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];
  if (!elegido) return { ok: false, sin_informe: true, patente: pat, nota: 'No hay ningún informe comprado de esta patente; no se compra automáticamente.' };
  const dest = path.join('/tmp', `titular_${pat}.pdf`);
  await descargarInforme(elegido.url || elegido.publicUrl, dest);
  let campos;
  try {
    campos = JSON.parse(execFileSync('python3', [path.join(__dirname, 'leer_cav.py'), dest], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })).campos || {};
  } catch (e) {
    return { ok: false, error: `No pude leer el informe: ${e.message}` };
  }
  const nombre = campos.propietario || '';
  const rut = campos.rut_propietario || '';
  // Empresa por RUT (≥ 50 millones, como esRutEmpresa) o por la razón social.
  const porRut = rut ? esRutEmpresa(rut) : false;
  const porNombre = /\b(SPA|S\.A\.?|SA|LTDA|LIMITADA|EIRL|E\.I\.R\.L\.?|SOCIEDAD|INVERSIONES|COMERCIAL)\b/i.test(nombre);
  return {
    ok: true, patente: pat, titular: nombre || null, rut: rut || null,
    es_empresa: Boolean(porRut || porNombre),
    fuente: `${NOMBRE_INFORME[elegido.reportType] || elegido.reportType} del ${String(elegido.createdAt || '').slice(0, 10)} (ya comprado, no se cobró)`,
  };
}

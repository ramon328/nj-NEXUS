// Autenticación al SII de Chile por CERTIFICADO DIGITAL (firma electrónica),
// método máquina-a-máquina oficial. NO usa el login de portal con clave.
// NO imprime claves ni contraseñas.
//
// Flujo oficial:
//   1) getSeed   -> POST SOAP a CrSeed.jws            -> <SEMILLA>
//   2) firmar    -> XML <getToken> firmado XML-DSig enveloped (RSA-SHA1, c14n)
//   3) getToken  -> POST SOAP a GetTokenFromSeed.jws  -> <TOKEN>
//   4) el TOKEN se usa como cookie TOKEN=<valor> en los servicios JSON del SII.
//
// Exporta: getToken(rutConDv) -> { token, ua }   (token cacheado en memoria)
//          firmarSemilla(semilla, pemKey, pemCert) -> XML firmado (string)
//
// OJO: este módulo NO se ejecuta contra el SII en esta entrega (no hay .p12).
// La firma XML-DSig del SII a veces requiere afinar canonicalización/formato; ver ESTADO.md.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import { DOMParser } from '@xmldom/xmldom';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

// Endpoints producción (palena). Maullin sería certificación/pruebas.
const URL_SEED = 'https://palena.sii.cl/DTEWS/CrSeed.jws';
const URL_TOKEN = 'https://palena.sii.cl/DTEWS/GetTokenFromSeed.jws';

// --- Cache de token en memoria, por RUT ---
const cacheToken = new Map(); // rutConDv -> { token, ts }

function credenciales() {
  const ruta = path.join(os.homedir(), 'nexus', 'credenciales.json');
  return JSON.parse(fs.readFileSync(ruta, 'utf8'));
}

// Carga el .p12/.pfx y extrae clave privada + certificado en PEM usando node-forge.
// Devuelve { pemKey, pemCert }. Lanza con mensaje claro si falta el cert o la clave es errónea.
export function cargarCertificado(emp) {
  const cert = emp?.cert;
  if (!cert || !cert.ruta || !cert.clave) {
    throw new Error('Falta el certificado .p12: ponlo en credenciales.json → sii.empresas[RUT].cert');
  }
  if (!fs.existsSync(cert.ruta)) {
    throw new Error(`No existe el archivo .p12 en la ruta indicada: ${cert.ruta}`);
  }

  let p12Asn1, p12;
  try {
    const der = fs.readFileSync(cert.ruta, 'binary');
    p12Asn1 = forge.asn1.fromDer(der);
  } catch (e) {
    throw new Error(`No pude leer/parsear el .p12 (¿archivo corrupto o no es PKCS#12?): ${e.message}`);
  }
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, cert.clave);
  } catch (e) {
    // node-forge lanza si la contraseña no calza (no imprimimos la clave).
    throw new Error('No pude abrir el .p12: contraseña incorrecta o formato no soportado.');
  }

  // Extraer clave privada (keyBag) y certificado (certBag).
  let privateKey = null;
  for (const type of [forge.pki.oids.pkcs8ShroudedKeyBag, forge.pki.oids.keyBag]) {
    const bags = p12.getBags({ bagType: type })[type] || [];
    for (const b of bags) if (b.key) { privateKey = b.key; break; }
    if (privateKey) break;
  }
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const certificate = certBags.find(b => b.cert)?.cert;

  if (!privateKey) throw new Error('El .p12 no contiene una clave privada legible.');
  if (!certificate) throw new Error('El .p12 no contiene un certificado.');

  const pemKey = forge.pki.privateKeyToPem(privateKey);
  const pemCert = forge.pki.certificateToPem(certificate);
  return { pemKey, pemCert };
}

// Devuelve el cuerpo DER del certificado en base64 (sin cabeceras PEM, sin saltos),
// tal como lo espera <X509Certificate> dentro del KeyInfo.
function certBase64(pemCert) {
  return pemCert
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');
}

// Construye el bloque RSAKeyValue (Modulus/Exponent en base64) a partir del PEM de la clave.
function rsaKeyValueXml(pemKey) {
  const key = forge.pki.privateKeyFromPem(pemKey);
  const toB64 = (bigInt) => {
    let hex = bigInt.toString(16);
    if (hex.length % 2) hex = '0' + hex;            // bytes completos
    return forge.util.encode64(forge.util.hexToBytes(hex));
  };
  const modulus = toB64(key.n);
  const exponent = toB64(key.e);
  return `<RSAKeyValue><Modulus>${modulus}</Modulus><Exponent>${exponent}</Exponent></RSAKeyValue>`;
}

// Firma el XML <getToken> con XML-DSig enveloped, como exige el SII:
//   C14N http://www.w3.org/TR/2001/REC-xml-c14n-20010315
//   SignatureMethod rsa-sha1, Reference URI="" + Transform enveloped-signature, DigestMethod sha1
//   KeyInfo con X509Data (X509Certificate) + RSAKeyValue (Modulus/Exponent)
// Devuelve el XML firmado como string (sin ejecutar nada contra el SII).
export function firmarSemilla(semilla, pemKey, pemCert) {
  const xml = `<getToken><item><Semilla>${semilla}</Semilla></item></getToken>`;

  const sig = new SignedXml({
    privateKey: pemKey,
    publicCert: pemCert,
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  });

  // Reference URI="" sobre todo el documento, con transform enveloped + c14n.
  sig.addReference({
    xpath: '/*',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    uri: '',
    // isEmptyUri fuerza Reference URI="" (documento completo) y evita que xml-crypto
    // inyecte un Id="_0" en el nodo raíz. El SII espera URI="" enveloped, sin Id.
    isEmptyUri: true,
  });

  // KeyInfo: X509Data + RSAKeyValue (formato esperado por el SII).
  const b64 = certBase64(pemCert);
  const rsaKv = rsaKeyValueXml(pemKey);
  sig.getKeyInfoContent = () =>
    `<X509Data><X509Certificate>${b64}</X509Certificate></X509Data>` +
    `<KeyValue>${rsaKv}</KeyValue>`;

  // Firma enveloped: la <Signature> se inserta como último hijo del nodo raíz.
  sig.computeSignature(xml, {
    location: { reference: "/*", action: 'append' },
  });

  return sig.getSignedXml();
}

// --- helpers SOAP / parseo (definidos pero NO invocados en esta entrega) ---

// Extrae el primer valor de una etiqueta dada de un XML (tolerante a namespaces SII:).
function extraerTag(xmlTexto, tag) {
  const re = new RegExp(`<(?:\\w+:)?${tag}>\\s*([^<]*?)\\s*</(?:\\w+:)?${tag}>`, 'i');
  const m = xmlTexto.match(re);
  return m ? m[1].trim() : null;
}

// Detecta señales de bloqueo/rate-limit en una respuesta (guardarraíl).
function chequearBloqueo(status, texto) {
  if (status === 403 || status === 429) {
    throw new Error(`HTTP ${status} del SII (posible bloqueo/rate-limit). Abortar.`);
  }
  const t = (texto || '').toLowerCase();
  for (const s of ['bloquead', 'intentos', 'captcha', 'demasiad']) {
    if (t.includes(s)) throw new Error(`Respuesta del SII contiene "${s}". Abortar.`);
  }
}

// Envuelve un cuerpo en el SOAP que esperan los .jws del SII.
function soapEnvelope(metodo, parametroXml) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ' +
    'xmlns:def="http://DefaultNamespace">' +
    '<soapenv:Header/><soapenv:Body>' +
    `<def:${metodo}>${parametroXml}</def:${metodo}>` +
    '</soapenv:Body></soapenv:Envelope>'
  );
}

// 1) getSeed: pide la semilla al SII. NO se ejecuta en esta entrega.
async function pedirSemilla() {
  const body = soapEnvelope('getSeed', '');
  const res = await fetch(URL_SEED, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '', 'User-Agent': UA },
    body,
  });
  const txt = await res.text();
  chequearBloqueo(res.status, txt);
  // La respuesta trae un XML escapado dentro del SOAP; desescapamos antes de extraer.
  const desescapado = txt
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  const semilla = extraerTag(desescapado, 'SEMILLA');
  if (!semilla) throw new Error('No pude obtener la SEMILLA del SII (revisar respuesta de CrSeed.jws).');
  return semilla;
}

// 3) getToken: envía el XML firmado y obtiene el TOKEN. NO se ejecuta en esta entrega.
async function pedirToken(xmlFirmado) {
  const body = soapEnvelope('getToken', xmlFirmado
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  const res = await fetch(URL_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '', 'User-Agent': UA },
    body,
  });
  const txt = await res.text();
  chequearBloqueo(res.status, txt);
  const desescapado = txt
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  const token = extraerTag(desescapado, 'TOKEN');
  if (!token) throw new Error('No pude obtener el TOKEN del SII (revisar respuesta de GetTokenFromSeed.jws).');
  return token;
}

// Valida que un DOM parsea bien (sanity check de la firma local antes de enviar).
function validarXmlLocal(xmlFirmado) {
  const doc = new DOMParser().parseFromString(xmlFirmado, 'text/xml');
  if (!doc || !doc.documentElement) throw new Error('El XML firmado no parsea (firma local inválida).');
  return doc;
}

// getToken: orquesta semilla -> firma -> token. Cachea en memoria por RUT.
// En esta entrega NO se llama al SII en vivo (no hay .p12). El código queda listo
// para correr cuando exista el certificado.
export async function getToken(rutConDv) {
  const cache = cacheToken.get(rutConDv);
  // Token del SII vive ~varios minutos; cacheamos 8 min para reusar dentro de una corrida.
  if (cache && Date.now() - cache.ts < 8 * 60 * 1000) return { token: cache.token, ua: UA };

  const cred = credenciales();
  const emp = cred.sii?.empresas?.[rutConDv];
  if (!emp) throw new Error(`RUT no está en credenciales.json: ${rutConDv}`);

  // Carga del cert (lanza mensaje claro si falta).
  const { pemKey, pemCert } = cargarCertificado(emp);

  // 1) semilla
  const semilla = await pedirSemilla();
  // 2) firmar
  const xmlFirmado = firmarSemilla(semilla, pemKey, pemCert);
  validarXmlLocal(xmlFirmado);
  // 3) token
  const token = await pedirToken(xmlFirmado);

  cacheToken.set(rutConDv, { token, ts: Date.now() });
  return { token, ua: UA };
}

export { UA, URL_SEED, URL_TOKEN };

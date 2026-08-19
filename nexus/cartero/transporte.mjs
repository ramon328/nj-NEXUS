// Capa de salida. El Cartero arma, guarda y reintenta los correos;
// la ENTREGA final la hace un relay serio (SES / Workspace / SMTP propio).
// Enviar directo desde el mini con IP residencial = spam garantizado.
//
// Hay un transporte POR MARCA: cada tienda sale desde su propia casilla.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dnsp from 'node:dns/promises';
import nodemailer from 'nodemailer';
import { marcaODefecto, env as envMarca, POR_DEFECTO } from './marcas.mjs';

const raiz = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(raiz, '.env'));

// Firma DKIM. Solo se firma si el selector esta PUBLICADO en el DNS:
// firmar con un selector que no existe no suma nada y los filtros de spam
// lo puntuan en contra. Con Workspace, Google ya firma con su propio selector.
const dkimPublicado = new Map();      // marca -> true/false (sin entrada = sin comprobar)

// Llave DKIM de la marca: dkim/<marca>/privada.pem, y dkim/privada.pem para
// Clivox, que ya la tenia ahi antes de que hubiera mas de una tienda.
function llaveDkim(m) {
  const propia = path.join(raiz, 'dkim', m.clave, 'privada.pem');
  if (fs.existsSync(propia)) return propia;
  const vieja = path.join(raiz, 'dkim', 'privada.pem');
  return (m.clave === POR_DEFECTO && fs.existsSync(vieja)) ? vieja : null;
}

const dominioDe = (m) =>
  envMarca(m, 'CARTERO_DOMINIO') || String(envMarca(m, 'CARTERO_DE') || '').split('@')[1];

export async function comprobarDkim(marca) {
  const m = marcaODefecto(marca);
  if (!llaveDkim(m)) { dkimPublicado.set(m.clave, false); return { firma: false, motivo: 'sin llave local' }; }
  const dominio = dominioDe(m);
  const selector = envMarca(m, 'CARTERO_DKIM_SELECTOR') || 'cartero';
  try {
    const r = await dnsp.resolveTxt(`${selector}._domainkey.${dominio}`);
    dkimPublicado.set(m.clave, r.flat().join('').includes('p='));
  } catch { dkimPublicado.set(m.clave, false); }
  return dkimPublicado.get(m.clave)
    ? { firma: true, selector, dominio }
    : { firma: false, motivo: `${selector}._domainkey.${dominio} no esta publicado en el DNS` };
}

function dkim(m) {
  const llave = llaveDkim(m);
  if (!llave || dkimPublicado.get(m.clave) !== true) return undefined;
  return {
    domainName: dominioDe(m),
    keySelector: envMarca(m, 'CARTERO_DKIM_SELECTOR') || 'cartero',
    privateKey: fs.readFileSync(llave, 'utf8'),
  };
}

function construir(m) {
  const tipo = modoActual(m);
  const comun = { dkim: dkim(m), pool: true, maxConnections: 3, maxMessages: 100 };
  const v = (n) => envMarca(m, n);

  switch (tipo) {
    // Desarrollo: no envia nada, escribe el correo a disco para revisarlo.
    case 'log':
      return nodemailer.createTransport({ jsonTransport: true });

    // Amazon SES por SMTP. Lo mas barato y confiable para transaccional.
    case 'ses':
      return nodemailer.createTransport({
        host: v('SES_HOST') || 'email-smtp.us-east-1.amazonaws.com',
        port: 587, secure: false,
        auth: { user: v('SES_USUARIO'), pass: v('SES_CLAVE') },
        ...comun,
      });

    // Google Workspace / Gmail (limite ~2.000 correos al dia).
    case 'gmail':
      return nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true,
        auth: { user: v('GMAIL_USUARIO'), pass: v('GMAIL_CLAVE_APP') },
        ...comun,
      });

    // Cualquier SMTP (VPS con Postfix, Zoho, Mailgun, Resend, etc).
    case 'smtp':
      return nodemailer.createTransport({
        host: v('SMTP_HOST'),
        port: Number(v('SMTP_PUERTO') || 587),
        secure: String(v('SMTP_SEGURO') || 'no') === 'si',
        auth: v('SMTP_USUARIO') ? { user: v('SMTP_USUARIO'), pass: v('SMTP_CLAVE') } : undefined,
        ...comun,
      });

    default:
      throw new Error(`CARTERO_TRANSPORTE desconocido para ${m.nombre}: ${tipo}`);
  }
}

const transportes = new Map();        // marca -> transporte
function trans(m) {
  if (!transportes.has(m.clave)) transportes.set(m.clave, construir(m));
  return transportes.get(m.clave);
}

// Se relee el .env y se rehacen los transportes: sirve para que al conectar un
// correo desde la web tome efecto al toque, sin reiniciar el servicio.
export function recargar(marca) {
  process.loadEnvFile(path.join(raiz, '.env'));
  if (marca) {
    const m = marcaODefecto(marca);
    dkimPublicado.delete(m.clave);
    try { transportes.get(m.clave)?.close?.(); } catch { /* daba lo mismo */ }
    transportes.delete(m.clave);
    return modoActual(m);
  }
  dkimPublicado.clear();
  for (const t of transportes.values()) { try { t.close?.(); } catch { /* daba lo mismo */ } }
  transportes.clear();
  return modoActual();
}

// Modo de envio de una marca. Sin nada configurado queda en 'log': no manda
// nada a internet, pero deja el correo en datos/salida para revisarlo.
export function modoActual(marca) {
  return String(envMarca(marcaODefecto(marca), 'CARTERO_TRANSPORTE') || 'log').toLowerCase();
}

// Una marca sin casilla propia NO puede enviar. Antes de esto, cualquier
// correo de TheArsenale habria salido desde info@clivox.cl.
export function exigirConectada(marca) {
  const m = marcaODefecto(marca);
  if (modoActual(m) === 'log') return;                     // modo prueba: no sale nada
  const de = envMarca(m, 'CARTERO_DE') || envMarca(m, 'GMAIL_USUARIO') || envMarca(m, 'SMTP_USUARIO');
  if (!de) throw new Error(`${m.nombre} no tiene correo conectado (falta ${m.prefijo}CARTERO_DE)`);
}

export async function verificar(marca) {
  const m = marcaODefecto(marca);
  const tipo = modoActual(m);
  if (tipo === 'log') return { ok: true, marca: m.clave, modo: tipo, nota: 'modo prueba: no sale nada a internet' };
  try {
    exigirConectada(m);
    const d = await comprobarDkim(m);
    transportes.delete(m.clave);     // se rehace con la decision de firma ya tomada
    await trans(m).verify();
    return { ok: true, marca: m.clave, modo: tipo, dkim: d };
  }
  catch (e) { return { ok: false, marca: m.clave, modo: tipo, error: e.message }; }
}

export async function entregar(sobre, marca) {
  const m = marcaODefecto(marca);
  const tipo = modoActual(m);
  exigirConectada(m);
  const r = await trans(m).sendMail(sobre);

  if (tipo === 'log') {
    const dir = path.join(raiz, 'datos', 'salida');
    fs.mkdirSync(dir, { recursive: true });
    const base = path.join(dir, `${Date.now()}-${m.clave}-${String(sobre.subject).replace(/[^\w]+/g, '-').slice(0, 40)}`);
    fs.writeFileSync(base + '.html', sobre.html || '');
    fs.writeFileSync(base + '.txt',
      `Marca: ${m.nombre}\nPara: ${sobre.to}\nDe: ${sobre.from}\nAsunto: ${sobre.subject}\n\n${sobre.text || ''}`);
    return { messageId: r.messageId || `log-${Date.now()}`, archivo: base + '.html' };
  }
  return { messageId: r.messageId, respuesta: r.response };
}

// El modo de la marca por defecto al arrancar (informativo, compatibilidad).
export const modo = modoActual();

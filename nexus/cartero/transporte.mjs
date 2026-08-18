// Capa de salida. El Cartero arma, guarda y reintenta los correos;
// la ENTREGA final la hace un relay serio (SES / Workspace / SMTP propio).
// Enviar directo desde el mini con IP residencial = spam garantizado.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dnsp from 'node:dns/promises';
import nodemailer from 'nodemailer';

const raiz = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(raiz, '.env'));

const tipo = (process.env.CARTERO_TRANSPORTE || 'log').toLowerCase();

// Firma DKIM. Solo se firma si el selector esta PUBLICADO en el DNS:
// firmar con un selector que no existe no suma nada y los filtros de spam
// lo puntuan en contra. Con Workspace, Google ya firma con su propio selector.
let dkimPublicado = null;   // null = sin comprobar todavia

export async function comprobarDkim() {
  const llave = path.join(raiz, 'dkim', 'privada.pem');
  if (!fs.existsSync(llave)) { dkimPublicado = false; return { firma: false, motivo: 'sin llave local' }; }
  const dominio = process.env.CARTERO_DOMINIO || (process.env.CARTERO_DE || '').split('@')[1];
  const selector = process.env.CARTERO_DKIM_SELECTOR || 'cartero';
  try {
    const r = await dnsp.resolveTxt(`${selector}._domainkey.${dominio}`);
    dkimPublicado = r.flat().join('').includes('p=');
  } catch { dkimPublicado = false; }
  return dkimPublicado
    ? { firma: true, selector, dominio }
    : { firma: false, motivo: `${selector}._domainkey.${dominio} no esta publicado en el DNS` };
}

function dkim() {
  const llave = path.join(raiz, 'dkim', 'privada.pem');
  if (!fs.existsSync(llave) || dkimPublicado !== true) return undefined;
  return {
    domainName: process.env.CARTERO_DOMINIO || (process.env.CARTERO_DE || '').split('@')[1],
    keySelector: process.env.CARTERO_DKIM_SELECTOR || 'cartero',
    privateKey: fs.readFileSync(llave, 'utf8'),
  };
}

function construir() {
  const tipo = modoActual();
  const comun = { dkim: dkim(), pool: true, maxConnections: 3, maxMessages: 100 };

  switch (tipo) {
    // Desarrollo: no envia nada, escribe el correo a disco para revisarlo.
    case 'log':
      return nodemailer.createTransport({ jsonTransport: true });

    // Amazon SES por SMTP. Lo mas barato y confiable para transaccional.
    case 'ses':
      return nodemailer.createTransport({
        host: process.env.SES_HOST || 'email-smtp.us-east-1.amazonaws.com',
        port: 587, secure: false,
        auth: { user: process.env.SES_USUARIO, pass: process.env.SES_CLAVE },
        ...comun,
      });

    // Google Workspace / Gmail (limite ~2.000 correos al dia).
    case 'gmail':
      return nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true,
        auth: { user: process.env.GMAIL_USUARIO, pass: process.env.GMAIL_CLAVE_APP },
        ...comun,
      });

    // Cualquier SMTP (VPS con Postfix, Zoho, Mailgun, Resend, etc).
    case 'smtp':
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PUERTO || 587),
        secure: String(process.env.SMTP_SEGURO || 'no') === 'si',
        auth: process.env.SMTP_USUARIO
          ? { user: process.env.SMTP_USUARIO, pass: process.env.SMTP_CLAVE } : undefined,
        ...comun,
      });

    default:
      throw new Error(`CARTERO_TRANSPORTE desconocido: ${tipo}`);
  }
}

let _t = null;
const trans = () => (_t ||= construir());

// Se relee el .env y se rehace el transporte: sirve para que al conectar el
// correo desde la web tome efecto al toque, sin reiniciar el servicio.
export function recargar() {
  process.loadEnvFile(path.join(raiz, '.env'));
  dkimPublicado = null;
  try { _t?.close?.(); } catch { /* daba lo mismo */ }
  _t = null;
  return modoActual();
}

export const modoActual = () => (process.env.CARTERO_TRANSPORTE || 'log').toLowerCase();
export const modo = tipo;   // el modo al arrancar (informativo)

export async function verificar() {
  const tipo = modoActual();
  if (tipo === 'log') return { ok: true, modo: tipo, nota: 'modo prueba: no sale nada a internet' };
  try {
    const d = await comprobarDkim();
    _t = null;                       // se rehace con la decision de firma ya tomada
    await trans().verify();
    return { ok: true, modo: tipo, dkim: d };
  }
  catch (e) { return { ok: false, modo: tipo, error: e.message }; }
}

export async function entregar(sobre) {
  const tipo = modoActual();
  const r = await trans().sendMail(sobre);

  if (tipo === 'log') {
    const dir = path.join(raiz, 'datos', 'salida');
    fs.mkdirSync(dir, { recursive: true });
    const base = path.join(dir, `${Date.now()}-${String(sobre.subject).replace(/[^\w]+/g, '-').slice(0, 40)}`);
    fs.writeFileSync(base + '.html', sobre.html || '');
    fs.writeFileSync(base + '.txt',
      `Para: ${sobre.to}\nDe: ${sobre.from}\nAsunto: ${sobre.subject}\n\n${sobre.text || ''}`);
    return { messageId: r.messageId || `log-${Date.now()}`, archivo: base + '.html' };
  }
  return { messageId: r.messageId, respuesta: r.response };
}

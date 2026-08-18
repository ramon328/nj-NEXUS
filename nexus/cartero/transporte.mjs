// Capa de salida. El Cartero arma, guarda y reintenta los correos;
// la ENTREGA final la hace un relay serio (SES / Workspace / SMTP propio).
// Enviar directo desde el mini con IP residencial = spam garantizado.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';

const raiz = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(raiz, '.env'));

const tipo = (process.env.CARTERO_TRANSPORTE || 'log').toLowerCase();

// Firma DKIM: si existe la llave privada, se firma. Es lo que separa
// "llega a la bandeja" de "llega a spam".
function dkim() {
  const llave = path.join(raiz, 'dkim', 'privada.pem');
  if (!fs.existsSync(llave)) return undefined;
  return {
    domainName: process.env.CARTERO_DOMINIO || (process.env.CARTERO_DE || '').split('@')[1],
    keySelector: process.env.CARTERO_DKIM_SELECTOR || 'cartero',
    privateKey: fs.readFileSync(llave, 'utf8'),
  };
}

function construir() {
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

export const modo = tipo;

export async function verificar() {
  if (tipo === 'log') return { ok: true, modo: tipo, nota: 'modo prueba: no sale nada a internet' };
  try { await trans().verify(); return { ok: true, modo: tipo, dkim: !!dkim() }; }
  catch (e) { return { ok: false, modo: tipo, error: e.message }; }
}

export async function entregar(sobre) {
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

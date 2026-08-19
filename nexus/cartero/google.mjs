// "Continuar con Google" para conectar la casilla de una tienda.
// No se guarda ninguna contraseña: Google devuelve un refresh_token y el correo
// sale por la API de Gmail (scope gmail.send).
//
// El cliente OAuth y el redirect son los que YA estan autorizados en Google
// Cloud para el vinculador de TAG (proyecto de Nexus). Google exige que el
// redirect_uri este registrado tal cual, y no hay acceso a la consola desde
// aca, asi que la vuelta pasa por /tag/oauth/callback, que reenvia al Cartero
// cuando el state empieza con "cartero.".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { marcaODefecto } from './marcas.mjs';

const raiz = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(raiz, '.env'));

export const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ');

export const cliente = () => ({
  client_id: process.env.CARTERO_GOOGLE_CLIENT_ID || '',
  client_secret: process.env.CARTERO_GOOGLE_CLIENT_SECRET || '',
});
export const REDIRECT = () => process.env.CARTERO_GOOGLE_REDIRECT || '';
export const disponible = () => !!(cliente().client_id && cliente().client_secret && REDIRECT());

export const rutaToken = (m) =>
  path.join(raiz, 'datos', `google-${marcaODefecto(m).clave}.json`);

export function tokenGuardado(m) {
  const p = rutaToken(m);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

// A que pantalla de Google se manda al usuario. select_account: que ELIJA la
// casilla, no que asuma la que ya tiene abierta.
export function urlAuth(state) {
  const c = cliente();
  const p = new URLSearchParams({
    client_id: c.client_id,
    redirect_uri: REDIRECT(),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent select_account',
    include_granted_scopes: 'true',
    state,
  });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + p.toString();
}

async function postToken(cuerpo) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(cuerpo),
    signal: AbortSignal.timeout(15000),
  });
  return r.json();
}

// Cambia el "code" de la vuelta por el refresh_token y guarda el vinculo.
export async function canjear(code, marca) {
  const m = marcaODefecto(marca);
  const c = cliente();
  const tok = await postToken({
    code, client_id: c.client_id, client_secret: c.client_secret,
    redirect_uri: REDIRECT(), grant_type: 'authorization_code',
  });
  if (!tok.refresh_token) {
    throw new Error('Google no devolvió refresh_token: ' + JSON.stringify(tok).slice(0, 180));
  }
  const ui = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: 'Bearer ' + tok.access_token },
    signal: AbortSignal.timeout(15000),
  }).then((x) => x.json());

  const registro = {
    marca: m.clave,
    email: ui.email || '',
    refresh_token: tok.refresh_token,
    scope: tok.scope,
    client_id: c.client_id,
    client_secret: c.client_secret,
    vinculado_en: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(rutaToken(m)), { recursive: true });
  fs.writeFileSync(rutaToken(m), JSON.stringify(registro, null, 2), { mode: 0o600 });
  return registro;
}

export function desvincular(marca) {
  const p = rutaToken(marca);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// access_token fresco. Se pide en cada envio: dura una hora y no vale la pena
// cachearlo mal.
export async function accessToken(marca) {
  const t = tokenGuardado(marca);
  if (!t) throw new Error(`${marcaODefecto(marca).nombre} no tiene cuenta de Google conectada`);
  const tok = await postToken({
    client_id: t.client_id || cliente().client_id,
    client_secret: t.client_secret || cliente().client_secret,
    refresh_token: t.refresh_token, grant_type: 'refresh_token',
  });
  if (!tok.access_token) {
    throw new Error('no se pudo refrescar el token de Google: ' + JSON.stringify(tok).slice(0, 160));
  }
  return { at: tok.access_token, email: t.email };
}

// Envia un sobre de nodemailer por la API de Gmail (no por SMTP: la clave de
// aplicacion no existe en este camino).
export async function enviarPorGmail(sobre, marca) {
  const { at } = await accessToken(marca);
  const raw = await new MailComposer(sobre).compile().build();
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: raw.toString('base64url') }),
    signal: AbortSignal.timeout(30000),
  });
  const j = await r.json();
  if (!r.ok) {
    const e = new Error('Gmail API ' + r.status + ': ' + (j?.error?.message || JSON.stringify(j).slice(0, 200)));
    e.responseCode = r.status;
    throw e;
  }
  return { messageId: j.id, respuesta: 'gmail-api ' + (j.threadId || '') };
}

// Manda el correo de prueba con la cuenta recien conectada.
export async function probarEnvio(marca, para) {
  const m = marcaODefecto(marca);
  const t = tokenGuardado(m);
  return enviarPorGmail({
    from: `"Cartero de ${m.nombre}" <${t.email}>`,
    to: para || t.email,
    subject: `Cartero conectado correctamente — ${m.nombre}`,
    text: `Si estás leyendo esto, el correo de ${m.nombre} quedó conectado con Google y funcionando.`,
    html: `<div style="font-family:-apple-system,system-ui,sans-serif;max-width:460px">
      <h2 style="letter-spacing:-.4px">Cartero conectado</h2>
      <p style="color:#3f3f46;line-height:1.6">Si estás leyendo esto, el correo de ${m.nombre}
      quedó conectado con Google y funcionando. Desde ahora los avisos de pedidos salen solos.</p>
      <p style="color:#a1a1aa;font-size:12px">Tienda: ${m.nombre} · Remitente: ${t.email}</p></div>`,
  }, m);
}

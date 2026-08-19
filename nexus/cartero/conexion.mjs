// Invitaciones para conectar el correo desde una URL compartible.
// El link solo sirve con un PIN que viaja por otro canal (WhatsApp, por ejemplo),
// se usa una sola vez y caduca. Por ahi pasan credenciales: no puede quedar abierto.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { db, ahora } from './db.mjs';
import { marcaODefecto } from './marcas.mjs';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const RUTA_ENV = path.join(raiz, '.env');

const VIGENCIA = 60 * 60 * 1000;   // 1 hora
const MAX_INTENTOS = 5;

export function crearInvitacion(nota = '', marca = '') {
  const m = marcaODefecto(marca);
  const token = crypto.randomBytes(18).toString('base64url');
  const pin = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
  db.prepare('INSERT INTO invitaciones (token,pin,nota,marca,expira,creado) VALUES (?,?,?,?,?,?)')
    .run(token, pin, nota, m.clave, ahora() + VIGENCIA, ahora());
  return { token, pin, marca: m, expira: new Date(ahora() + VIGENCIA) };
}

export function leerInvitacion(token) {
  const i = db.prepare('SELECT * FROM invitaciones WHERE token=?').get(token);
  if (!i) return { error: 'no_existe' };
  if (i.usada) return { error: 'ya_usada' };
  if (i.expira < ahora()) return { error: 'vencida' };
  if (i.intentos >= MAX_INTENTOS) return { error: 'bloqueada' };
  return { ok: true, invitacion: i };
}

export function pinCorrecto(token, pin) {
  const r = leerInvitacion(token);
  if (!r.ok) return r;
  db.prepare('UPDATE invitaciones SET intentos=intentos+1 WHERE token=?').run(token);
  const a = Buffer.from(String(r.invitacion.pin));
  const b = Buffer.from(String(pin || ''));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    const quedan = MAX_INTENTOS - (r.invitacion.intentos + 1);
    return { error: 'pin_malo', quedan: Math.max(0, quedan) };
  }
  return { ok: true };
}

export function marcarUsada(token, resultado) {
  db.prepare('UPDATE invitaciones SET usada=1, resultado=? WHERE token=?').run(resultado, token);
}

// Prueba las credenciales de verdad: conecta y manda un correo real.
// Si no se puede comprobar, no se guarda nada.
export async function probar({ proveedor, usuario, clave, host, puerto, seguro, remitente, destinoPrueba, marca }) {
  const m = marcaODefecto(marca);
  const opciones = proveedor === 'gmail'
    ? { host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: usuario, pass: clave } }
    : proveedor === 'ses'
      ? { host: host || 'email-smtp.us-east-1.amazonaws.com', port: 587, secure: false, auth: { user: usuario, pass: clave } }
      : { host, port: Number(puerto || 587), secure: seguro === true || seguro === 'si', auth: usuario ? { user: usuario, pass: clave } : undefined };

  const t = nodemailer.createTransport({ ...opciones, connectionTimeout: 12000, greetingTimeout: 12000 });
  await t.verify();

  const de = remitente || usuario;
  const para = destinoPrueba || usuario;
  const r = await t.sendMail({
    from: `"Cartero de ${m.nombre}" <${de}>`,
    to: para,
    subject: `Cartero conectado correctamente — ${m.nombre}`,
    text: `Si estás leyendo esto, el correo de ${m.nombre} quedó conectado y funcionando.`,
    html: `<div style="font-family:-apple-system,system-ui,sans-serif;max-width:460px">
      <h2 style="letter-spacing:-.4px">Cartero conectado</h2>
      <p style="color:#3f3f46;line-height:1.6">Si estás leyendo esto, el correo de ${m.nombre}
      quedó conectado y funcionando. Desde ahora los avisos de pedidos salen solos.</p>
      <p style="color:#a1a1aa;font-size:12px">Tienda: ${m.nombre} · Remitente: ${de}</p></div>`,
  });
  t.close();
  return { messageId: r.messageId, para };
}

// Escribe las claves en .env sin perder lo que ya habia.
export function guardarEnv(cambios) {
  let texto = fs.existsSync(RUTA_ENV) ? fs.readFileSync(RUTA_ENV, 'utf8') : '';
  for (const [k, v] of Object.entries(cambios)) {
    const linea = `${k}=${v}`;
    const re = new RegExp(`^${k}=.*$`, 'm');
    texto = re.test(texto) ? texto.replace(re, linea) : texto.trimEnd() + '\n' + linea + '\n';
  }
  fs.writeFileSync(RUTA_ENV, texto, { mode: 0o600 });
  // Deja el proceso al dia sin reiniciar.
  for (const [k, v] of Object.entries(cambios)) process.env[k] = v;
}

// Guarda las credenciales BAJO EL PREFIJO DE LA MARCA: asi conectar el correo
// de TheArsenale no pisa el de Clivox (que fue el bug: era un solo juego de
// claves global para todas las tiendas).
export function guardarConexion(d, marca) {
  const m = marcaODefecto(marca ?? d.marca);
  const P = m.prefijo;
  const cambios = { [P + 'CARTERO_TRANSPORTE']: d.proveedor };
  // Con "Continuar con Google" no hay clave que guardar: el vinculo vive en
  // datos/google-<marca>.json y aca solo queda de quien es la casilla.
  if (d.proveedor === 'google') { /* solo transporte + remitente */ }
  else if (d.proveedor === 'gmail') { cambios[P + 'GMAIL_USUARIO'] = d.usuario; cambios[P + 'GMAIL_CLAVE_APP'] = d.clave; }
  else if (d.proveedor === 'ses') { cambios[P + 'SES_USUARIO'] = d.usuario; cambios[P + 'SES_CLAVE'] = d.clave; if (d.host) cambios[P + 'SES_HOST'] = d.host; }
  else {
    cambios[P + 'SMTP_HOST'] = d.host; cambios[P + 'SMTP_PUERTO'] = String(d.puerto || 587);
    cambios[P + 'SMTP_USUARIO'] = d.usuario; cambios[P + 'SMTP_CLAVE'] = d.clave;
    cambios[P + 'SMTP_SEGURO'] = (d.seguro ? 'si' : 'no');
  }
  if (d.remitente) cambios[P + 'CARTERO_DE'] = d.remitente;
  if (!process.env[P + 'CARTERO_DE_NOMBRE']) cambios[P + 'CARTERO_DE_NOMBRE'] = m.nombre;
  guardarEnv(cambios);
  return { marca: m.clave, cambios: Object.keys(cambios) };
}

// Corazon del Cartero: arma el correo, le inyecta el tracking y lo deja en la cola.
// Nada se envia aqui; de eso se encarga cola.mjs.
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, ahora } from './db.mjs';
import { armar, aTexto, existe } from './plantillas.mjs';
import { marcaODefecto, remitente } from './marcas.mjs';

const raiz = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(raiz, '.env'));

const SECRETO = process.env.CARTERO_SECRETO;
if (!SECRETO) throw new Error('Falta CARTERO_SECRETO en .env');

export const PUBLICA = (process.env.CARTERO_URL_PUBLICA || 'http://localhost:7695').replace(/\/+$/, '');

// El remitente y el sitio salen de la MARCA del correo, no de una variable
// global: Clivox y TheArsenale mandan desde casillas distintas.

const b64 = (s) => Buffer.from(String(s)).toString('base64url');
const deB64 = (s) => Buffer.from(String(s), 'base64url').toString('utf8');

export function firmar(dato) {
  return crypto.createHmac('sha256', SECRETO).update(String(dato)).digest('base64url').slice(0, 22);
}
export function firmaValida(dato, firma) {
  const buenaB = Buffer.from(firmar(dato));
  const dadaB = Buffer.from(String(firma || ''));
  return buenaB.length === dadaB.length && crypto.timingSafeEqual(buenaB, dadaB);
}

export const tokenBaja = (email) => `${b64(email)}.${firmar('baja:' + email)}`;
export function leerTokenBaja(token) {
  const [parte, firma] = String(token).split('.');
  if (!parte || !firma) return null;
  let email;
  try { email = deB64(parte); } catch { return null; }
  return firmaValida('baja:' + email, firma) ? email : null;
}

export function estaSuprimido(email) {
  return db.prepare('SELECT motivo FROM supresiones WHERE email = ?')
    .get(String(email).toLowerCase()) || null;
}
export function suprimir(email, motivo, nota = null) {
  db.prepare('INSERT OR REPLACE INTO supresiones (email, motivo, nota, creado) VALUES (?,?,?,?)')
    .run(String(email).toLowerCase(), motivo, nota, ahora());
}

// Reescribe los enlaces para medir clics y agrega el pixel de apertura.
function inyectarTracking(html, id) {
  const f = firmar(id);
  let salida = html.replace(/href="(https?:\/\/[^"]+)"/gi, (todo, url) => {
    // Los enlaces de baja y los de tracking no se reescriben.
    if (url.includes('/baja/') || url.includes('/t/')) return todo;
    return `href="${PUBLICA}/t/c/${id}.${f}?u=${b64(url)}"`;
  });
  const pixel = `<img src="${PUBLICA}/t/a/${id}.${f}.png" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;">`;
  salida = salida.includes('</body>') ? salida.replace('</body>', pixel + '</body>') : salida + pixel;
  return salida;
}

const validoEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());

// Una marca puede tener su propia version de una plantilla:
// plantillas/arsenale/order-shipped.html. Si se pide 'order-shipped' con la
// marca arsenale, se usa la de la marca; si no tiene, la generica.
function plantillaDe(nombre, m) {
  const n = String(nombre || '');
  if (!n || n.includes('/')) return n;              // ya viene con carpeta
  const propia = m.plantillas + n;
  return (m.plantillas && existe(propia)) ? propia : n;
}

/**
 * Deja un correo en la cola.
 * @param {object} o
 * @param {string} o.para           destinatario
 * @param {string} [o.plantilla]    nombre en plantillas/ (sin .html)
 * @param {object} [o.datos]        variables de la plantilla
 * @param {string} [o.asunto]       manda sobre el de la plantilla
 * @param {string} [o.html]         cuerpo directo (si no hay plantilla)
 * @param {string} [o.idempotencia] clave unica: evita el correo duplicado
 * @param {boolean}[o.forzar]       ignora la lista de supresion (solo transaccional critico)
 * @param {string} [o.marca]        tienda que envia: 'clivox' (por defecto) o 'arsenale'
 */
export function encolar(o) {
  const m = marcaODefecto(o.marca);
  const rem = remitente(m);
  const para = String(o.para || '').trim().toLowerCase();
  if (!validoEmail(para)) return { ok: false, motivo: 'email_invalido', para };

  if (o.idempotencia) {
    const previo = db.prepare('SELECT id, estado FROM mensajes WHERE idempotencia = ?').get(o.idempotencia);
    if (previo) return { ok: true, duplicado: true, id: previo.id, estado: previo.estado };
  }

  const sup = estaSuprimido(para);
  if (sup && !o.forzar) return { ok: false, motivo: 'suprimido', detalle: sup.motivo, para };

  const id = crypto.randomUUID();
  const ctx = {
    ...(o.datos || {}),
    marca: rem.nombre,
    url_sitio: m.sitio(),
    url_baja: `${PUBLICA}/baja/${tokenBaja(para)}`,
    url_boton: o.datos?.url_boton || `${m.sitio()}/cuenta/pedidos`,
    texto_boton: o.datos?.texto_boton || 'Ver mi pedido',
    titulo: o.asunto || '',
    preview: o.datos?.preview || '',
    anio: new Date().getFullYear(),
  };

  let asunto = o.asunto || '';
  let textoPlantilla = '';
  let html = o.html || '';

  const plantilla = plantillaDe(o.plantilla, m);
  if (plantilla) {
    if (!existe(plantilla)) return { ok: false, motivo: 'plantilla_inexistente', detalle: plantilla };
    const hecho = armar(plantilla, ctx);
    asunto = asunto || hecho.asunto;
    html = hecho.html;
    textoPlantilla = hecho.texto;
  }
  if (!asunto) return { ok: false, motivo: 'sin_asunto' };
  if (!html) return { ok: false, motivo: 'sin_cuerpo' };

  const texto = o.texto || textoPlantilla || aTexto(html);
  html = inyectarTracking(html, id);

  db.prepare(`INSERT INTO mensajes
    (id, idempotencia, para, para_nombre, de, de_nombre, responder_a, asunto, html, texto,
     plantilla, datos, estado, intentos, prox_intento, origen, marca, creado)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pendiente',0,0,?,?,?)`)
    .run(id, o.idempotencia || null, para, o.para_nombre || null,
      o.de || rem.de, o.de_nombre || rem.nombre, o.responder_a || rem.responder_a,
      asunto, html, texto, plantilla || null,
      JSON.stringify(o.datos || {}), o.origen || 'api', m.clave, ahora());

  db.prepare('INSERT INTO eventos (mensaje_id, tipo, detalle, creado) VALUES (?,?,?,?)')
    .run(id, 'encolado', o.plantilla || 'html', ahora());

  return { ok: true, id, asunto, para, marca: m.clave };
}

export function registrarEvento(mensajeId, tipo, detalle, ip, agente) {
  db.prepare('INSERT INTO eventos (mensaje_id, tipo, detalle, ip, agente, creado) VALUES (?,?,?,?,?,?)')
    .run(mensajeId, tipo, detalle || null, ip || null, agente || null, ahora());
}

export { b64, deB64 };

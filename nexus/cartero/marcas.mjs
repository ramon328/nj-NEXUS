// Las tiendas que atiende el Cartero. Una sola casilla no alcanza: cada marca
// manda desde SU correo, con su idioma y sus plantillas.
//
// Las credenciales viven en .env con un prefijo por marca. Clivox no lleva
// prefijo (llego primero y ya tenia sus claves puestas); las demas si:
//   GMAIL_USUARIO            -> Clivox
//   ARSENALE_GMAIL_USUARIO   -> TheArsenale
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(raiz, '.env'));

export const POR_DEFECTO = 'clivox';

export const MARCAS = {
  clivox: {
    clave: 'clivox',
    nombre: 'Clivox',
    prefijo: '',                       // usa las claves "de toda la vida"
    idioma: 'es',
    sitio: () => process.env.CLIVOX_SITIO || 'https://clivox.cl',
    correoEjemplo: 'no-responder@clivox.cl',
    plantillas: '',                    // plantillas/pedido-enviado.html
    alias: ['clivox.cl'],
  },
  arsenale: {
    clave: 'arsenale',
    nombre: 'TheArsenale',
    prefijo: 'ARSENALE_',
    idioma: 'en',
    sitio: () => process.env.ARSENALE_SITIO || 'https://thearsenale.com',
    correoEjemplo: 'no-reply@thearsenale.com',
    plantillas: 'arsenale/',           // plantillas/arsenale/order-shipped.html
    alias: ['thearsenale', 'the arsenale', 'arsenal', 'thearsenale.com'],
  },
};

// Acepta 'arsenale', 'TheArsenale', 'the arsenale'... y tambien un objeto de
// marca ya resuelto (pasarlo y que saliera "[object Object]" -> Clivox fue un
// bug real: TheArsenale terminaba usando el correo de Clivox).
export function marca(clave) {
  if (clave && typeof clave === 'object' && MARCAS[clave.clave]) return MARCAS[clave.clave];
  const c = String(clave || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!c) return MARCAS[POR_DEFECTO];
  if (MARCAS[c]) return MARCAS[c];
  for (const m of Object.values(MARCAS)) {
    if (m.alias.includes(c) || m.nombre.toLowerCase() === c) return m;
  }
  return null;
}

// Igual que marca(), pero nunca devuelve null: para rutas donde un nombre malo
// no puede tumbar un envio.
export const marcaODefecto = (clave) => marca(clave) || MARCAS[POR_DEFECTO];

export const claves = () => Object.keys(MARCAS);

// Lee una variable de entorno de esta marca. NO hay fallback entre marcas:
// que TheArsenale terminara enviando con la casilla de Clivox seria peor que
// no enviar.
export function env(m, nombre) {
  return process.env[marcaODefecto(m).prefijo + nombre];
}

// Datos del remitente ya resueltos.
export function remitente(m) {
  const mm = marcaODefecto(m);
  return {
    de: env(mm, 'CARTERO_DE') || env(mm, 'GMAIL_USUARIO') || env(mm, 'SMTP_USUARIO') || '',
    nombre: env(mm, 'CARTERO_DE_NOMBRE') || mm.nombre,
    responder_a: env(mm, 'CARTERO_RESPONDER_A') || null,
  };
}

// ¿Tiene correo conectado esta marca?
export const conectada = (m) => !!env(m, 'CARTERO_TRANSPORTE') && !!remitente(m).de;

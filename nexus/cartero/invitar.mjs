// Genera un enlace de un solo uso para conectar el correo de una tienda.
//   node invitar.mjs                              -> Clivox (por defecto)
//   node invitar.mjs arsenale                     -> TheArsenale
//   node invitar.mjs --marca=arsenale "para Ramon"
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearInvitacion } from './conexion.mjs';
import { marca as buscarMarca, claves } from './marcas.mjs';

const raiz = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(raiz, '.env'));

// La marca puede venir como --marca=x o como una palabra suelta ("arsenale").
// Lo que no sea una marca conocida es la nota de para quien es el enlace.
let pedida = '';
const sueltos = [];
for (const a of process.argv.slice(2)) {
  const f = a.match(/^--marca=(.*)$/);
  if (f) { pedida = f[1]; continue; }
  if (!pedida && buscarMarca(a) && a.trim()) { pedida = a; continue; }
  sueltos.push(a);
}

const m = buscarMarca(pedida);
if (!m) {
  console.error(`No conozco la tienda "${pedida}". Las que hay: ${claves().join(', ')}`);
  process.exit(1);
}

const publica = (process.env.CARTERO_URL_PUBLICA || 'http://127.0.0.1:7700').replace(/\/+$/, '');
const { token, pin, expira } = crearInvitacion(sueltos.join(' '), m.clave);

const hora = expira.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });
const titulo = `ENLACE PARA CONECTAR EL CORREO DE ${m.nombre.toUpperCase()}`;
const ancho = Math.max(58, titulo.length + 4);

console.log(`
${'='.repeat(ancho)}
  ${titulo}
${'='.repeat(ancho)}

  ${publica}/conectar/${token}

  PIN:  ${pin}

  Caduca a las ${hora} · sirve UNA sola vez · 5 intentos de PIN

  Manda el enlace y el PIN por vias distintas.
${'='.repeat(ancho)}
`);

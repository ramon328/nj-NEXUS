// Genera un enlace de un solo uso para conectar el correo desde el celular.
//   node invitar.mjs ["para quien es"]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearInvitacion } from './conexion.mjs';

const raiz = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(raiz, '.env'));

const publica = (process.env.CARTERO_URL_PUBLICA || 'http://127.0.0.1:7700').replace(/\/+$/, '');
const { token, pin, expira } = crearInvitacion(process.argv[2] || '');

const hora = expira.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });

console.log(`
${'='.repeat(58)}
  ENLACE PARA CONECTAR EL CORREO DE CLIVOX
${'='.repeat(58)}

  ${publica}/conectar/${token}

  PIN:  ${pin}

  Caduca a las ${hora} · sirve UNA sola vez · 5 intentos de PIN

  Manda el enlace y el PIN por vias distintas.
${'='.repeat(58)}
`);

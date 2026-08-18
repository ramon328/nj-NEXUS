// Genera el par de llaves DKIM y muestra los DNS que hay que crear.
// Sin DKIM/SPF/DMARC bien puestos, Gmail manda todo a spam. No es opcional.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(raiz, '.env'));

const dominio = process.env.CARTERO_DOMINIO || (process.env.CARTERO_DE || '').split('@')[1] || 'clivox.cl';
const selector = process.env.CARTERO_DKIM_SELECTOR || 'cartero';
const dir = path.join(raiz, 'dkim');

if (fs.existsSync(path.join(dir, 'privada.pem')) && !process.argv.includes('--forzar')) {
  console.log('Ya existen llaves DKIM. Usa --forzar para reemplazarlas (invalida la firma actual).');
} else {
  fs.mkdirSync(dir, { recursive: true });
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  fs.writeFileSync(path.join(dir, 'privada.pem'), privateKey, { mode: 0o600 });
  fs.writeFileSync(path.join(dir, 'publica.pem'), publicKey);
  console.log('Llaves DKIM generadas en dkim/ (la privada queda en 600).\n');
}

const publica = fs.readFileSync(path.join(dir, 'publica.pem'), 'utf8')
  .replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '').replace(/\s+/g, '');

console.log('='.repeat(70));
console.log('REGISTROS DNS PARA ' + dominio.toUpperCase());
console.log('='.repeat(70));
console.log(`
1) DKIM  — firma que prueba que el correo salio de ti
   Tipo:   TXT
   Nombre: ${selector}._domainkey.${dominio}
   Valor:  v=DKIM1; k=rsa; p=${publica}

2) SPF   — que servidores pueden enviar por tu dominio
   Tipo:   TXT
   Nombre: ${dominio}
   Valor:  v=spf1 include:amazonses.com -all
   (si usas Workspace en vez de SES: v=spf1 include:_spf.google.com -all)
   OJO: un dominio lleva UN solo registro SPF. Si ya tienes uno, se combinan
   los include, no se agrega otro.

3) DMARC — que hacer si algo no cuadra, y a donde reportarlo
   Tipo:   TXT
   Nombre: _dmarc.${dominio}
   Valor:  v=DMARC1; p=none; rua=mailto:dmarc@${dominio}; pct=100; adkim=s; aspf=s
   Parte con p=none (solo observa) una o dos semanas; cuando veas que los
   informes vienen limpios, subes a p=quarantine y despues a p=reject.
`);
console.log('Cuando esten publicados:  node revisar-dns.mjs\n');

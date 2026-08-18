// Revisa que SPF, DKIM, DMARC y MX esten publicados y bien formados.
import dns from 'node:dns/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(raiz, '.env'));

const dominio = process.argv[2] || process.env.CARTERO_DOMINIO ||
  (process.env.CARTERO_DE || '').split('@')[1] || 'clivox.cl';
const selector = process.env.CARTERO_DKIM_SELECTOR || 'cartero';

const ok = (t) => console.log('  \x1b[32m✓\x1b[0m ' + t);
const mal = (t) => console.log('  \x1b[31m✗\x1b[0m ' + t);
const aviso = (t) => console.log('  \x1b[33m!\x1b[0m ' + t);

async function txt(nombre) {
  try { return (await dns.resolveTxt(nombre)).map((p) => p.join('')); }
  catch { return []; }
}

console.log(`\nRevisando ${dominio}\n${'-'.repeat(50)}`);

// ¿existe el dominio?
try { await dns.resolveNs(dominio); ok('el dominio existe y tiene DNS'); }
catch { mal('el dominio no resuelve: revisa que este registrado y apuntado'); }

// MX: hace falta para RECIBIR (respuestas y rebotes)
try {
  const mx = await dns.resolveMx(dominio);
  mx.length ? ok(`MX: ${mx.map((m) => m.exchange).join(', ')}`)
            : aviso('sin MX: no vas a poder recibir respuestas ni rebotes');
} catch { aviso('sin MX: no vas a poder recibir respuestas ni rebotes'); }

// SPF
const spf = (await txt(dominio)).filter((t) => t.toLowerCase().startsWith('v=spf1'));
if (!spf.length) mal('SPF: no existe. Los correos van a ir directo a spam.');
else if (spf.length > 1) mal(`SPF: hay ${spf.length} registros. Debe haber SOLO UNO o falla la validacion.`);
else {
  ok(`SPF: ${spf[0]}`);
  if (spf[0].includes('+all')) mal('  SPF con +all: deja que cualquiera envie por tu dominio. Cambialo a -all.');
  else if (spf[0].includes('~all')) aviso('  SPF con ~all (blando). -all es mas estricto y mejor.');
}

// DKIM
const dkim = await txt(`${selector}._domainkey.${dominio}`);
if (!dkim.length) mal(`DKIM: no existe ${selector}._domainkey.${dominio}. Corre: node dkim.mjs`);
else if (!dkim.join('').includes('p=')) mal('DKIM: existe pero le falta la llave publica (p=)');
else ok(`DKIM: publicado (${dkim.join('').length} caracteres)`);

// DMARC
const dmarc = (await txt(`_dmarc.${dominio}`)).filter((t) => t.toLowerCase().startsWith('v=dmarc1'));
if (!dmarc.length) mal('DMARC: no existe. Gmail y Outlook ya lo exigen para envios masivos.');
else {
  ok(`DMARC: ${dmarc[0]}`);
  const p = (dmarc[0].match(/p=(\w+)/) || [])[1];
  if (p === 'none') aviso('  DMARC en p=none: solo observa. Sube a quarantine cuando veas los informes limpios.');
  if (!/rua=/.test(dmarc[0])) aviso('  DMARC sin rua=: no vas a recibir los informes.');
}

console.log('\nTip: manda una prueba a check-auth@verifier.port25.com o usa mail-tester.com');
console.log('para ver la nota real de entregabilidad antes de abrir la llave.\n');

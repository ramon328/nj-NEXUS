#!/usr/bin/env node
// Probe de autenticación al SII con clave tributaria (RUT + clave).
// Lee credenciales desde ~/nexus/credenciales.json (nunca por argv/env).
// Uso: node probar-login.mjs <rut-con-dv>   (ej: 77271121-2)
// No imprime la clave. Reporta: éxito/fallo, cookies de sesión, y nombre/razón social si aparece.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CRED = path.join(os.homedir(), 'nexus', 'credenciales.json');
const rutArg = process.argv[2];
if (!rutArg) { console.error('Falta RUT. Uso: node probar-login.mjs 77271121-2'); process.exit(2); }

const cred = JSON.parse(fs.readFileSync(CRED, 'utf8'));
const emp = cred?.sii?.empresas?.[rutArg];
if (!emp) { console.error(`No hay credenciales para ${rutArg} en credenciales.json`); process.exit(2); }

const [rutSinDv, dv] = emp.rut.split('-');
const rutcntr = (rutSinDv + dv); // sin guion ni puntos
const clave = emp.clave;

// --- cookie jar mínimo ---
const jar = new Map();
function guardarCookies(res) {
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of set) {
    const [pair] = c.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

async function main() {
  const referencia = 'https://misiir.sii.cl/cgi_misii/siihome.cgi';
  const body = new URLSearchParams({
    rut: rutSinDv,
    dv,
    referencia,
    '411': '',
    rutcntr,
    clave,
  });

  console.log(`→ Login SII para RUT ${emp.rut} ...`);
  const res = await fetch('https://zeusr.sii.cl/cgi_AUT2000/CAutInicio.cgi', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
      'Origin': 'https://zeusr.sii.cl',
      'Referer': 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html',
    },
    body,
  });
  guardarCookies(res);
  const html = await res.text();
  console.log(`  HTTP ${res.status}  | cookies recibidas: ${[...jar.keys()].join(', ') || '(ninguna)'}`);

  const lower = html.toLowerCase();
  const fallo = /no son v|incorrecta|no coinciden|clave.*inv|rut.*inv|bloquead|errp|error de aut/i.test(html);
  // Cookies típicas de sesión autenticada del SII
  const cookieSesion = [...jar.keys()].some(k => /token|netscape|s2_|csession|sii/i.test(k));

  if (fallo && !cookieSesion) {
    console.log('❌ Credenciales NO válidas (el SII rechazó RUT/clave).');
    const m = html.match(/<[^>]*>([^<]{8,140}?(no son|incorrecta|coinciden|bloquead)[^<]*)</i);
    if (m) console.log('   Mensaje SII:', m[1].trim());
    process.exit(1);
  }

  // Confirmar sesión visitando Mi SII
  const home = await fetch(referencia, {
    headers: { 'User-Agent': UA, 'Cookie': cookieHeader() },
    redirect: 'follow',
  });
  const homeHtml = await home.text();
  guardarCookies(home);

  const autenticado = cookieSesion && !/IngresoRutClave|ingrese su rut|cautinicio/i.test(homeHtml);
  // Intentar extraer razón social / nombre
  let nombre = '';
  const nm = homeHtml.match(/contribuyente[^<>]{0,40}?:?\s*<[^>]*>\s*([^<]{3,90})/i)
          || homeHtml.match(/raz[oó]n social[^<>]{0,20}?:?\s*([^<\n]{3,90})/i)
          || homeHtml.match(/nombre[^<>]{0,20}?:?\s*<[^>]*>\s*([A-ZÁÉÍÓÚÑ][^<]{4,80})/);
  if (nm) nombre = nm[1].trim();

  if (autenticado) {
    console.log('✅ Autenticación EXITOSA. Sesión SII establecida.');
    if (nombre) console.log('   Razón social / nombre detectado:', nombre);
    console.log('   (cookies de sesión disponibles para descargar RCV / DTE / F29).');
    process.exit(0);
  } else {
    console.log('⚠️  Login devolvió 200 pero no se confirmó sesión autenticada.');
    console.log('   Cookies:', [...jar.keys()].join(', ') || '(ninguna)');
    console.log('   Snippet home (300c):', homeHtml.replace(/\s+/g, ' ').slice(0, 300));
    process.exit(3);
  }
}

main().catch(e => { console.error('Error de red/ejecución:', e.message); process.exit(4); });

#!/usr/bin/env node
// Exploratorio: login + intento de getResumen RCV. Imprime respuesta cruda para conocer el contrato.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { login } from './lib/sii-auth.mjs';

const rutArg = process.argv[2] || '77271121-2';
const periodo = process.argv[3] || '202605';
const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), 'nexus', 'credenciales.json'), 'utf8'));
const emp = cred.sii.empresas[rutArg];

const { cookieHeader, rutSinDv, dv, ua } = await login(emp.rut, emp.clave);
console.log(`✅ login OK (${emp.rut}). Probando getResumen periodo ${periodo}...`);

async function probar(tipoConsulta) {
  const res = await fetch('https://www4.sii.cl/consdcvinternetui/services/data/facadeService/getResumen', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': ua,
      'Accept': 'application/json, text/plain, */*',
      'Cookie': cookieHeader,
      'Referer': 'https://www4.sii.cl/consdcvinternetui/',
      'Origin': 'https://www4.sii.cl',
    },
    body: JSON.stringify({
      metaData: {
        namespace: 'cl.sii.sdi.lob.diii.consdcv.data.api.interfaces.FacadeService/getResumen',
        conversationId: '16', transactionId: String(Date.now()), page: null,
      },
      data: { rutEmisor: rutSinDv, dvEmisor: dv, ptributario: periodo, operacion: tipoConsulta, codTipoDoc: null },
    }),
  });
  const txt = await res.text();
  console.log(`\n--- tipoConsulta=${tipoConsulta} -> HTTP ${res.status} (${txt.length} bytes) ---`);
  console.log(txt.slice(0, 1800));
}

await probar('COMPRA');
await probar('VENTA');

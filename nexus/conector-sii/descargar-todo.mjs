#!/usr/bin/env node
// Orquestador: descarga RCV (COMPRA + VENTA) de los últimos N períodos vía CERTIFICADO.
// Uso: node descargar-todo.mjs <rut> [mesesAtras=12]
//
// - Obtiene el TOKEN UNA sola vez (cacheado en memoria por sii-cert-auth).
// - Recorre los últimos N períodos AAAAMM hacia atrás desde hoy (2026-06).
// - Por cada período baja RCV COMPRA y RCV VENTA, con throttle entre llamadas.
// - Resumen final: archivos creados + tamaños.
//
// En esta entrega NO toca el SII (no hay .p12): si falta el certificado, sale con
// mensaje claro. El código queda correcto para correr cuando exista el .p12.

import { getToken } from './lib/sii-cert-auth.mjs';
import { descargarRCV, AbortoSeguridad, pause } from './lib/sii-servicios.mjs';

const rutArg = process.argv[2] || '77271121-2';
const mesesAtras = Math.max(1, Math.min(36, parseInt(process.argv[3] || '12', 10)));

// Genera períodos AAAAMM hacia atrás desde hoy (incluido el mes en curso).
function periodosHaciaAtras(n) {
  const out = [];
  const ahora = new Date(); // hoy: 2026-06
  let y = ahora.getFullYear();
  let m = ahora.getMonth() + 1; // 1-12
  for (let i = 0; i < n; i++) {
    out.push(`${y}${String(m).padStart(2, '0')}`);
    m--; if (m === 0) { m = 12; y--; }
  }
  return out;
}

function fmtBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

async function main() {
  console.log(`Conector SII (vía certificado) — RUT ${rutArg}, últimos ${mesesAtras} meses.`);

  // Token UNA vez (valida que exista el .p12 antes de recorrer períodos).
  let token;
  try {
    ({ token } = await getToken(rutArg));
  } catch (e) {
    console.error(`!! ${e.message}`);
    process.exitCode = 2;
    return;
  }
  void token; // el token se reusa internamente vía cache en cada descargarRCV
  console.log('OK token obtenido (cacheado para toda la corrida).');

  const periodos = periodosHaciaAtras(mesesAtras);
  const creados = [];
  const fallos = [];

  for (const periodo of periodos) {
    for (const operacion of ['COMPRA', 'VENTA']) {
      try {
        const r = await descargarRCV(rutArg, periodo, operacion);
        if (r.ok) {
          for (const a of r.archivos) creados.push(a);
          console.log(`  ${periodo} ${operacion}: ${r.filas} filas, ${r.archivos.length} archivos.`);
        } else {
          fallos.push(`${periodo} ${operacion}: ${r.motivo}`);
          console.log(`  ${periodo} ${operacion}: sin datos (${r.motivo}).`);
        }
      } catch (e) {
        if (e instanceof AbortoSeguridad) {
          console.error(`\n!! ABORTO por seguridad en ${periodo} ${operacion}: ${e.message}. No insisto.`);
          process.exitCode = 2;
          return imprimirResumen(creados, fallos);
        }
        throw e;
      }
      await pause(); // throttle entre operaciones/períodos
    }
  }

  imprimirResumen(creados, fallos);
}

function imprimirResumen(creados, fallos) {
  console.log(`\n===== RESUMEN =====`);
  console.log(`Archivos creados: ${creados.length}`);
  let total = 0;
  for (const a of creados) { total += a.bytes; console.log(`  ${a.ruta}  (${fmtBytes(a.bytes)})`); }
  console.log(`Tamaño total: ${fmtBytes(total)}`);
  if (fallos.length) {
    console.log(`Períodos/operaciones sin datos o con error: ${fallos.length}`);
    for (const f of fallos) console.log(`  - ${f}`);
  }
}

try {
  await main();
} catch (e) {
  console.error('\n!! Error inesperado:', e.message);
  process.exitCode = 1;
}

// pruebas-3-empresas.mjs — Corrida BATCHEADA: UN solo login de Ramón y, reusando esa misma
// sesión, hace $1 NORMAL + $1 MASIVA en cada una de las 3 empresas (IMP JURI, Importaciones
// Mineras, Importadora Juri), cambiando de empresa por el SELECTOR (sin re-loguear entre cada
// una). Es una PRUEBA: cada transferencia queda "Por Autorizar" (no mueve plata) y sirve para
// capturar los endpoints de cada empresa. Correr con el banco FRÍO.
//
//   node pruebas-3-empresas.mjs           → real (crea las solicitudes Por Autorizar)
//   node pruebas-3-empresas.mjs --dry     → solo genera el batch y lo muestra, NO entra al banco
import { spawn } from 'node:child_process'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generarMasivo } from './masiva.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
const DRY = process.argv.includes('--dry')

// Destino de la prueba: la cuenta de Joaquín (Santander), conocida y segura.
const DEST = { cuenta: '0-070-31-42297-8', rut: '19.689.228-1', nombre: 'ELIAS MALUK JOAQUIN ALFONSO', email: 'jeliasm@udd.cl', banco: 'Santander' }

// Las 3 empresas de Ramón (aparte de Ana Clara) con su CUENTA DE ORIGEN (sacada de leer-saldos).
const EMPRESAS = [
  { nombre: 'IMP JURI Y FONTENA', cuentaOrigen: '000072019474' },
  { nombre: 'IMPORTACIONES MINERAS SPA', cuentaOrigen: '000072856279' },
  { nombre: 'IMPORTADORA JURI Y JURI LIMITADA', cuentaOrigen: '000075098782' },
]
const MONTO = 1
const MOTIVO = 'prueba tek'
const CONCEPTO = 'Pago de Proveedores'

async function main() {
  // 1) Generar un Excel de masiva POR EMPRESA (cada uno con SU cuenta de origen). El destino
  //    es la línea de $1 a Joaquín.
  const operaciones = []
  for (const emp of EMPRESAS) {
    const linea = [{ cuenta: DEST.cuenta, banco: DEST.banco, rut: DEST.rut, nombre: DEST.nombre, monto: MONTO, glosa: MOTIVO, mensaje: MOTIVO }]
    const stamp = 'batch-' + emp.cuentaOrigen
    const gen = await generarMasivo(linea, { cuentaOrigen: emp.cuentaOrigen, stamp })
    if (gen.problemas && gen.problemas.length) { console.error('⚠ Excel de', emp.nombre, 'con problemas:', JSON.stringify(gen.problemas)) }
    // Por empresa: primero la NORMAL, después la MASIVA (ambas se autoswitchan a esa empresa).
    operaciones.push({ empresa: emp.nombre, accion: 'normal', monto: MONTO, motivo: MOTIVO, dest: DEST })
    operaciones.push({ empresa: emp.nombre, accion: 'masiva', monto: MONTO, motivo: MOTIVO, concepto: CONCEPTO, masivaFile: gen.ruta })
  }

  const batchFile = join(DATA, 'batch-3-empresas.json')
  writeFileSync(batchFile, JSON.stringify({ operaciones }, null, 2))
  console.log('BATCH armado:', operaciones.length, 'operaciones (' + EMPRESAS.length + ' empresas × normal+masiva)')
  for (const o of operaciones) console.log('  ·', o.accion, '·', o.empresa, '· $' + o.monto, o.masivaFile ? '(' + o.masivaFile.split('/').pop() + ')' : '')

  if (DRY) { console.log('\n--dry: NO entro al banco. Batch en', batchFile); return }

  // 2) UN solo login-humano, modo batch → loguea 1 vez y hace todo reusando la sesión.
  const env = { ...process.env, TEK_USER: 'ramon', TEK_BATCH_FILE: batchFile, TEK_LOCK_WAIT_MS: '25000' }
  await new Promise((resolve) => {
    const h = spawn(process.execPath, [join(DIR, 'login-humano.mjs')], { cwd: DIR, env, stdio: 'inherit' })
    h.on('close', () => resolve())
    h.on('error', (e) => { console.error('spawn error:', e.message); resolve() })
  })
  console.log('\n=== corrida terminada — revisá el RESULTADO arriba (campo batch:[...]) ===')
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })

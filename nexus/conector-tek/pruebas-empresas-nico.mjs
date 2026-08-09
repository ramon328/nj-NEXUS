// pruebas-empresas-nico.mjs — Corrida BATCHEADA para las empresas de NICO.
// UN solo login de Nico y, reusando esa misma sesión, hace $1 NORMAL + $1 MASIVA en cada
// empresa, cambiando por el SELECTOR (sin re-loguear). Cada transferencia queda "Por
// Autorizar": NO mueve plata. Sirve para dejar mapeado el flujo de cada empresa.
//
// Gemelo de pruebas-3-empresas.mjs (que es el de Ramón). Diferencias: TEK_USER=nico y las
// cuentas de origen salen de data/cuentas-origen.json (las carga leer-saldos).
//
//   node pruebas-empresas-nico.mjs --dry              → arma el batch y lo muestra, NO entra
//   node pruebas-empresas-nico.mjs                    → real (crea las solicitudes)
//   node pruebas-empresas-nico.mjs "ACE" "FOOD"       → solo esas empresas
//   node pruebas-empresas-nico.mjs --solo-normal      → sin masiva (más rápido)
import { spawn } from 'node:child_process'
import { writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generarMasivo } from './masiva.mjs'
import * as credenciales from './credenciales.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
const DRY = process.argv.includes('--dry')
const SOLO_NORMAL = process.argv.includes('--solo-normal')
const FILTRO = process.argv.slice(2).filter((a) => !a.startsWith('--'))

// Destino de prueba: la cuenta de Joaquín (Santander), conocida y segura.
const DEST = { cuenta: '0-070-31-42297-8', rut: '19.689.228-1', nombre: 'ELIAS MALUK JOAQUIN ALFONSO', email: 'jeliasm@udd.cl', banco: 'Santander' }
const MONTO = 1
const MOTIVO = 'prueba tek nico'
const CONCEPTO = 'Pago de Proveedores'

function cuentasOrigen() {
  try { return JSON.parse(readFileSync(join(DATA, 'cuentas-origen.json'), 'utf8')) } catch { return {} }
}

async function main() {
  const origenes = cuentasOrigen()
  // Empresas de Nico según la bóveda (fuente de verdad de lo que tiene conectado).
  let empresas = (credenciales.listar('nico') || []).map((c) => c.empresa).filter(Boolean)
  if (FILTRO.length) empresas = empresas.filter((e) => FILTRO.some((f) => e.toUpperCase().includes(f.toUpperCase())))

  const conCuenta = [], sinCuenta = []
  for (const emp of empresas) (origenes[emp] ? conCuenta : sinCuenta).push(emp)

  if (sinCuenta.length) {
    console.log('⚠ SIN cuenta de origen (no se les puede hacer MASIVA todavía):')
    for (const e of sinCuenta) console.log('   ·', e)
    console.log('   → sácalas con: TEK_CAPTURAR=1 node leer-saldos.mjs --user nico\n')
  }

  const operaciones = []
  for (const emp of empresas) {
    // La NORMAL no necesita cuenta de origen (el banco la elige del dropdown).
    operaciones.push({ empresa: emp, accion: 'normal', monto: MONTO, motivo: MOTIVO, dest: DEST })
    if (SOLO_NORMAL) continue
    const co = origenes[emp]
    if (!co) continue   // sin cuenta origen la masiva saldría de la cuenta equivocada → se omite
    const linea = [{ cuenta: DEST.cuenta, banco: DEST.banco, rut: DEST.rut, nombre: DEST.nombre, monto: MONTO, glosa: MOTIVO, mensaje: MOTIVO }]
    const gen = await generarMasivo(linea, { cuentaOrigen: co, stamp: 'nico-' + co })
    if (gen.problemas?.length) { console.error('⚠ Excel de', emp, 'con problemas:', JSON.stringify(gen.problemas)); continue }
    operaciones.push({ empresa: emp, accion: 'masiva', monto: MONTO, motivo: MOTIVO, concepto: CONCEPTO, masivaFile: gen.ruta })
  }

  const batchFile = join(DATA, 'batch-nico.json')
  writeFileSync(batchFile, JSON.stringify({ operaciones }, null, 2))
  console.log('BATCH:', operaciones.length, 'operaciones sobre', empresas.length, 'empresas')
  for (const o of operaciones) console.log('  ·', o.accion.padEnd(7), '·', o.empresa)

  if (DRY) { console.log('\n--dry: NO entro al banco. Batch en', batchFile); return }

  // UN solo login de NICO, modo batch → todo reusando la misma sesión.
  const env = { ...process.env, TEK_USER: 'nico', TEK_BATCH_FILE: batchFile, TEK_LOCK_WAIT_MS: '25000', TEK_CAPTURAR: '1' }
  await new Promise((resolve) => {
    const h = spawn(process.execPath, [join(DIR, 'login-humano.mjs')], { cwd: DIR, env, stdio: 'inherit' })
    h.on('close', () => resolve())
    h.on('error', (e) => { console.error('spawn error:', e.message); resolve() })
  })
  console.log('\n=== corrida terminada — mirá el RESULTADO (campo batch:[...]) ===')
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })

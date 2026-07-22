// masiva.mjs — Generador del Excel de TRANSFERENCIA MASIVA de Santander Office Banking
// (Transferencias Masivas → Importación). Arma el .xlsx en el MISMO formato del archivo
// real de Ramón ("RAMON MOLINA BH.xlsx"): 13 columnas, una fila por transferencia. La
// cuenta origen va DENTRO del archivo (opción "Utilizar cuentas ingresadas en archivo").
//
// ⚠️ SOLO genera el archivo. La importación (subirlo al banco) la hace login-humano.mjs
// (TEK_MASIVA=subir); y el lote queda "por liberar" — la liberación es manual, NO mueve
// plata sola. Blindaje igual que la transferencia individual.
import ExcelJS from 'exceljs'
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'
import * as credenciales from './credenciales.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(DIR, 'data', 'masivas')

// Cuenta origen por defecto (ANA CLARA SPA, CLP) — dígitos, como en el archivo real.
export const CUENTA_ORIGEN_ANACLARA = '80280939'   // = 0-000-8028093-9

// Opciones del dropdown "Concepto asociado" del banco (ÚNICO campo editable del panel de
// importación). Nexus le pregunta al usuario cuál usar antes de subir el lote.
export const CONCEPTOS = [
  'Pago de Asignaciones', 'Pago de Dividendos', 'Pago de Pensiones', 'Pago de Proveedores',
  'Pago de Reembolsos', 'Pago de Remuneraciones', 'Pago de Subsidios', 'Pago de Viáticos',
  'Pago Extraordinarios', 'Transferencias Masivas',
]
// Resuelve un concepto tolerando texto libre ("proveedores" → "Pago de Proveedores").
export function resolverConcepto(txt) {
  const q = String(txt || '').toLowerCase().trim()
  if (!q) return ''
  return CONCEPTOS.find((c) => c.toLowerCase() === q)
    || CONCEPTOS.find((c) => c.toLowerCase().includes(q) || q.includes(c.toLowerCase().replace('pago de ', '')))
    || ''
}

// Códigos de banco chilenos (SBIF) para "Código banco destino" (obligatorio si el banco
// destino NO es Santander). Santander va SIN código (la col queda vacía).
export const CODIGOS_BANCO = {
  'banco de chile': '001', 'chile': '001', 'edwards': '001',
  'banco internacional': '009', 'internacional': '009',
  'banco estado': '012', 'estado': '012', 'bancoestado': '012',
  'scotiabank': '014', 'scotia': '014',
  'bci': '016', 'banco de credito e inversiones': '016', 'tbanc': '016',
  'corpbanca': '027',
  'banco bice': '028', 'bice': '028',
  'hsbc': '031',
  'banco santander': '037', 'santander': '037',   // (Santander no lleva código; lo dejamos por referencia)
  'itau': '039', 'itaú': '039', 'banco itau': '039',
  'banco security': '049', 'security': '049',
  'banco falabella': '051', 'falabella': '051',
  'banco ripley': '053', 'ripley': '053',
  'banco consorcio': '055', 'consorcio': '055',
  'banco btg pactual': '059', 'btg pactual': '059', 'btg': '059',
  'coopeuch': '672',
  'tenpo': '729', 'tenpo prepago': '729',
  'mercado pago': '875', 'mercadopago': '875', 'mercado-pago': '875', 'mercado pago prepago': '875',
}

// Encabezados EXACTOS del archivo de Santander (orden importa). El importador lee por
// posición; la fila 1 es el encabezado y los datos van desde la fila 2.
const HEADERS = [
  'Cuenta origen (obligatorio)',
  'Moneda origen (obligatorio)',
  'Cuenta destino (obligatorio)',
  'Moneda destino (obligatorio)',
  'Código banco destino (obligatorio solo si banco destino no es Santander)',
  'RUT beneficiario (obligatorio solo si banco destino no es Santander)',
  'Nombre beneficiario (obligatorio solo si banco destino no es Santander)',
  'Monto transferencia (obligatorio)',
  'Glosa personalizada transferencia (opcional)',
  'Correo beneficiario (opcional)',
  'Mensaje correo beneficiario (opcional)',
  'Glosa cartola originador (opcional)',
  'Glosa cartola beneficiario (opcional, solo aplica si cuenta destino es Santander)',
]

const soloDigitos = (s) => String(s || '').replace(/\D/g, '')
const esSantander = (banco) => /santander/i.test(String(banco || ''))
export function codigoBanco(banco) {
  const k = String(banco || '').toLowerCase().replace(/^banco\s+/, '').trim()
  return CODIGOS_BANCO[k] || CODIGOS_BANCO['banco ' + k] || CODIGOS_BANCO[String(banco || '').toLowerCase().trim()] || ''
}

// Normaliza una transferencia de entrada a la fila de 13 columnas.
// t = { cuenta, banco, rut, nombre, monto, glosa?, correo?, mensaje?, glosa_originador?, glosa_beneficiario? }
export function armarFila(t, { cuentaOrigen = CUENTA_ORIGEN_ANACLARA } = {}) {
  const santander = esSantander(t.banco)
  const cod = santander ? '' : codigoBanco(t.banco)
  const monto = Math.trunc(Number(String(t.monto).replace(/[^\d]/g, '')))
  return {
    fila: [
      soloDigitos(cuentaOrigen),                 // 1 Cuenta origen
      'CLP',                                      // 2 Moneda origen
      soloDigitos(t.cuenta),                      // 3 Cuenta destino
      'CLP',                                      // 4 Moneda destino
      cod,                                        // 5 Código banco destino (vacío si Santander)
      soloDigitos(t.rut),                         // 6 RUT beneficiario
      String(t.nombre || '').trim(),              // 7 Nombre beneficiario
      monto,                                      // 8 Monto (número)
      String(t.glosa || t.mensaje || '').slice(0, 40),        // 9 Glosa personalizada transferencia
      String(t.correo || '').trim(),              // 10 Correo beneficiario
      String(t.mensaje || t.glosa || '').slice(0, 60),        // 11 Mensaje correo beneficiario
      String(t.glosa_originador || t.glosa || '').slice(0, 40),// 12 Glosa cartola originador
      santander ? String(t.glosa_beneficiario || 'ANA CLARA SPA').slice(0, 40) : '', // 13 Glosa cartola beneficiario (solo Santander)
    ],
    // validación por transferencia (no rompe, informa)
    problemas: [
      !soloDigitos(t.cuenta) && 'cuenta destino vacía',
      !monto && 'monto inválido',
      !santander && !cod && `sin código de banco para "${t.banco}" (banco no reconocido)`,
      !santander && !soloDigitos(t.rut) && 'RUT obligatorio (banco no Santander)',
      !santander && !String(t.nombre || '').trim() && 'nombre obligatorio (banco no Santander)',
    ].filter(Boolean),
  }
}

// Genera el .xlsx. Devuelve { ruta, total, monto_total, filas, problemas }.
export async function generarMasivo(transfers, opts = {}) {
  if (!Array.isArray(transfers) || !transfers.length) throw new Error('No hay transferencias para el archivo masivo.')
  mkdirSync(OUT_DIR, { recursive: true })
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Transferencias')
  ws.addRow(HEADERS)
  const filas = [], problemas = []
  let montoTotal = 0
  transfers.forEach((t, i) => {
    const r = armarFila(t, opts)
    ws.addRow(r.fila)
    filas.push(r.fila)
    montoTotal += Number(r.fila[7]) || 0
    if (r.problemas.length) problemas.push({ fila: i + 1, beneficiario: t.nombre || t.cuenta, problemas: r.problemas })
  })
  // La columna Monto como número entero, sin decimales.
  ws.getColumn(8).numFmt = '#,##0'
  const stamp = opts.stamp || 'masiva'                    // pasar timestamp desde afuera (Date.now no disponible en workflows)
  const ruta = opts.ruta || join(OUT_DIR, `masiva-${stamp}.xlsx`)
  await wb.xlsx.writeFile(ruta)
  return { ruta, total: transfers.length, monto_total: montoTotal, filas, problemas }
}

// ── CLI de prueba ────────────────────────────────────────────────────────────
// node masiva.mjs test            → genera un archivo de ejemplo (2 filas) para inspección
if (process.argv[1] && process.argv[1].endsWith('masiva.mjs') && process.argv[2] === 'test') {
  const demo = [
    { cuenta: '19800476890', banco: 'Banco Falabella', rut: '19689228-1', nombre: 'JOAQUIN ELIAS MALUK', monto: 1000, correo: 'joaquin.maluk@gmail.com', glosa: 'prueba masiva', mensaje: 'prueba masiva' },
    { cuenta: '0-070-31-42297-8', banco: 'Santander', rut: '19689228-1', nombre: 'JOAQUIN ALFONSO ELIAS MALUK', monto: 1000, glosa: 'prueba masiva sant' },
  ]
  const ruta = join(OUT_DIR, 'masiva-demo.xlsx')
  generarMasivo(demo, { stamp: 'demo', ruta }).then((r) => {
    console.log('ARCHIVO:', r.ruta)
    console.log('total:', r.total, '· monto_total:', r.monto_total)
    console.log('problemas:', JSON.stringify(r.problemas))
  }).catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
}

// snapshot-stock-tag.mjs — Cada 6 min baja la versión FRESCA del Excel de Mallorca,
// recalcula el "stock con TAG" y lo guarda APARTE (NO toca el OneDrive):
//   · stock-con-tag.json  → snapshot con totales y cada auto (patente, tag sí/no)
//   · stock-con-tag.xlsx  → el Excel-archivo listo (STOCK VALORIZADO + columna TAG)
// Detecta cambios (autos que PASARON a tener tag, autos nuevos sin tag) y los registra.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { conteoExcel } from './autos-tag.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SNAP = join(__dirname, 'stock-con-tag.json')
const INTERVALO = Number(process.env.TAG_SNAP_MS || 6 * 60 * 1000)

function leerPrev() { try { return JSON.parse(readFileSync(SNAP, 'utf8')) } catch { return null } }

// Regenera el .xlsx listo (python openpyxl) — best-effort.
function regenerarXlsx() {
  return new Promise((resolve) => {
    const py = join(process.env.HOME || '', 'nexus', 'conector-mallorca', '.venv', 'bin', 'python')
    const ch = spawn(py, [join(__dirname, 'generar-excel-tag.py')], { env: { ...process.env } })
    ch.on('close', () => resolve()); ch.on('error', () => resolve())
  })
}

async function snapshot() {
  const prev = leerPrev()
  const c = await conteoExcel({ refrescar: true }) // fuerza bajar la versión final del Excel
  const autos = [
    ...c.autos_con_tag.map((a) => ({ patente: a.patente, marca: a.marca, modelo: a.modelo, tag: true })),
    ...c.autos_sin_tag.map((a) => ({ patente: a.patente, marca: a.marca, modelo: a.modelo, tag: false })),
  ]
  const data = { actualizado: new Date().toISOString(), fuente: c.fuente, total: c.total, con_tag: c.con_tag, sin_tag: c.sin_tag, autos }

  // Cambios vs snapshot anterior
  if (prev && Array.isArray(prev.autos)) {
    const antes = new Map(prev.autos.map((a) => [a.patente, a.tag]))
    const nuevosConTag = autos.filter((a) => a.tag && antes.get(a.patente) === false).map((a) => a.patente)
    const nuevosEnStock = autos.filter((a) => !antes.has(a.patente)).map((a) => `${a.patente}${a.tag ? '(con tag)' : '(sin tag)'}`)
    const salieron = prev.autos.filter((a) => !autos.some((b) => b.patente === a.patente)).map((a) => a.patente)
    if (nuevosConTag.length) console.log('[snapshot] pasaron a CON TAG:', nuevosConTag.join(', '))
    if (nuevosEnStock.length) console.log('[snapshot] autos nuevos en stock:', nuevosEnStock.join(', '))
    if (salieron.length) console.log('[snapshot] salieron del stock:', salieron.join(', '))
    data.cambios = { nuevos_con_tag: nuevosConTag, nuevos_en_stock: nuevosEnStock, salieron_del_stock: salieron }
  }

  writeFileSync(SNAP, JSON.stringify(data, null, 2))
  await regenerarXlsx()
  console.log(`[snapshot] ${new Date().toLocaleTimeString('es-CL')} · ${c.total} autos · ${c.con_tag} con tag · ${c.sin_tag} sin tag`)
}

async function loop() {
  try { await snapshot() } catch (e) { console.log('[snapshot] error:', e.message) }
  setTimeout(loop, INTERVALO)
}
console.log(`[snapshot-stock-tag] cada ${Math.round(INTERVALO / 60000)} min · guarda ${SNAP}`)
loop()

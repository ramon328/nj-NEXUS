// cerebro-cartolas.mjs — Vuelca las cartolas/movimientos de ANA CLARA (Santander) al
// SEGUNDO CEREBRO con una ESTRUCTURA ESTABLE e IDEMPOTENTE (se re-corre y solo ACTUALIZA:
// mismos nombres de archivo, se sobreescriben). Fuente: data/cartola-anual.json (el
// acumulador que nunca pierde lo viejo) + data/saldos.json.
//
// Estructura creada en el vault:
//   70 — Base de datos/Cartolas ANA CLARA/
//     _Resumen.md                → saldos actuales + cobertura + índice de meses
//     Últimos movimientos.md     → los 40 más recientes (vista rápida)
//     2026-01 — enero.md ... one per mes con movimientos  → tabla del mes + totales
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
// El vault vive por symlink en ~/nexus/cerebro (→ Desktop/segundo cerebro nico).
const VAULT = process.env.CEREBRO_VAULT || join(process.env.HOME, 'nexus', 'cerebro')
const BASE = join(VAULT, '70 — Base de datos', 'Cartolas ANA CLARA')

const MESES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const leer = (f) => { try { return JSON.parse(readFileSync(join(DATA, f), 'utf8')) } catch { return null } }
const clp = (n) => '$' + Math.round(Number(n || 0)).toLocaleString('es-CL')
const esc = (s) => String(s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim()

function tablaMovs(movs) {
  const L = ['| Fecha | Descripción | Cargo | Abono | Saldo |', '|---|---|---:|---:|---:|']
  for (const m of movs) {
    const cargo = Number(m.cargo || 0), abono = Number(m.abono || 0)
    L.push(`| ${esc(m.fecha)} | ${esc(m.descripcion)} | ${cargo ? clp(cargo) : ''} | ${abono ? clp(abono) : ''} | ${m.saldo != null ? clp(m.saldo) : ''} |`)
  }
  return L.join('\n')
}

export function exportar({ stamp } = {}) {
  const anual = leer('cartola-anual.json') || { movimientos: [] }
  const saldos = leer('saldos.json') || { cuentas: [] }
  const movs = (anual.movimientos || []).slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
  mkdirSync(BASE, { recursive: true })
  const hoy = stamp || anual.actualizado || ''

  // Agrupar por mes YYYY-MM
  const porMes = {}
  for (const m of movs) { const k = String(m.fecha || '').slice(0, 7); if (/^\d{4}-\d{2}$/.test(k)) (porMes[k] = porMes[k] || []).push(m) }
  const mesesOrden = Object.keys(porMes).sort()

  // Nota por mes (idempotente: mismo nombre → se sobreescribe)
  const archivosMes = []
  for (const k of mesesOrden) {
    const [y, mm] = k.split('-')
    const lista = porMes[k]
    const cargos = lista.reduce((s, m) => s + Number(m.cargo || 0), 0)
    const abonos = lista.reduce((s, m) => s + Number(m.abono || 0), 0)
    const nombre = `${k} — ${MESES[Number(mm)]}.md`
    const L = []
    L.push('---')
    L.push('tipo: cartola')
    L.push('empresa: ANA CLARA SPA')
    L.push('banco: Santander')
    L.push(`periodo: ${k}`)
    L.push(`actualizado: ${hoy}`)
    L.push('---')
    L.push('')
    L.push(`# Cartola ${MESES[Number(mm)]} ${y} · ANA CLARA`)
    L.push('')
    L.push(`- **Movimientos:** ${lista.length}`)
    L.push(`- **Abonos (ingresos):** ${clp(abonos)}`)
    L.push(`- **Cargos (egresos):** ${clp(cargos)}`)
    L.push(`- **Neto del mes:** ${clp(abonos - cargos)}`)
    L.push('')
    L.push(tablaMovs(lista))
    L.push('')
    L.push('> Generado automáticamente desde la cartola de Santander (tek). No editar a mano: se sobreescribe al actualizar.')
    writeFileSync(join(BASE, nombre), L.join('\n'))
    archivosMes.push({ k, nombre, n: lista.length, abonos, cargos })
  }

  // Últimos movimientos (vista rápida: 40 más recientes)
  const ultimos = movs.slice(-40).reverse()
  const U = ['---', 'tipo: cartola-ultimos', 'empresa: ANA CLARA SPA', `actualizado: ${hoy}`, '---', '',
    '# Últimos movimientos · ANA CLARA (Santander)', '', tablaMovs(ultimos), '',
    '> Los 40 más recientes. Se actualiza solo con la cartola.']
  writeFileSync(join(BASE, 'Últimos movimientos.md'), U.join('\n'))

  // _Resumen (saldos + cobertura + índice de meses)
  const cob = anual.cobertura || {}
  const R = []
  R.push('---'); R.push('tipo: cartola-resumen'); R.push('empresa: ANA CLARA SPA'); R.push(`actualizado: ${hoy}`); R.push('---'); R.push('')
  R.push('# Cartolas ANA CLARA · Resumen'); R.push('')
  R.push('## Saldos actuales')
  if (saldos.cuentas?.length) {
    R.push('| Cuenta | Disponible | Contable |'); R.push('|---|---:|---:|')
    for (const c of saldos.cuentas) R.push(`| ${esc(c.cuenta || c.numero || '')} | ${clp(c.disponible ?? c.saldo)} | ${clp(c.contable ?? c.actual ?? c.saldo)} |`)
  } else R.push('_Sin snapshot de saldos._')
  R.push('')
  R.push('## Cobertura de datos')
  R.push(`- **Rango cargado:** ${cob.min_fecha || '—'} → ${cob.max_fecha || '—'}`)
  R.push(`- **Última captura:** ${cob.ultima_captura || anual.actualizado || '—'}`)
  R.push(`- **Total movimientos:** ${movs.length}`)
  R.push('')
  R.push('## Meses')
  for (const a of archivosMes) R.push(`- [[${a.nombre.replace('.md', '')}]] — ${a.n} movs · ingresos ${clp(a.abonos)} · egresos ${clp(a.cargos)}`)
  R.push(''); R.push('- [[Últimos movimientos]]')
  R.push(''); R.push('> Índice generado automáticamente por tek. Se actualiza solo.')
  writeFileSync(join(BASE, '_Resumen.md'), R.join('\n'))

  return { base: BASE, meses: archivosMes.length, movimientos: movs.length, rango: `${cob.min_fecha || '?'}→${cob.max_fecha || '?'}` }
}

if (process.argv[1] && process.argv[1].endsWith('cerebro-cartolas.mjs')) {
  try { const r = exportar(); console.log('OK →', r.base); console.log(JSON.stringify(r)) }
  catch (e) { console.error('ERROR:', e.message); process.exit(1) }
}

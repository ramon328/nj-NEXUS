#!/usr/bin/env node
// sincronizar.mjs — LA CORRIDA DE CADA MAÑANA.
//
// Orden del día:
//   1. El banco ya se encendió (LaunchAgent tek-refresco, 06:48) y dejó su tanda
//      en cartola-anual.json, fusionada por almacen.mjs.
//   2. Esto lee esa tanda y las facturas del SII, y guarda en el libro SOLO lo
//      que no estaba.
//   3. Cruza lo nuevo contra todo lo que seguía suelto, en ambas direcciones.
//   4. Anota los calces. Los de días anteriores no se tocan.
//
// No abre el banco ni el SII: lee los archivos que esos sistemas dejaron. Por eso
// puede correr las veces que sea sin riesgo — correrlo dos veces seguidas no
// agrega nada la segunda.
//
// Uso:
//   node sincronizar.mjs              # la corrida normal
//   node sincronizar.mjs --json       # para otro programa
//   node sincronizar.mjs --rehacer    # borra los calces y recalcula todo
//   node sincronizar.mjs --estado     # solo mirar, no escribe

import { movimientosBanco, facturasSii } from './fuentes.mjs'
import { conciliar } from './conciliar.mjs'
import * as libroMod from './libro.mjs'

const rest = process.argv.slice(2)
const flag = (n) => rest.includes('--' + n)
const arg = (n, def) => { const i = rest.indexOf('--' + n); return i >= 0 ? rest[i + 1] : def }
const empresaId = Number(arg('empresa', 3))

const fmt = (n) => '$' + Math.round(Math.abs(n)).toLocaleString('es-CL')
const log = (...a) => { if (!flag('json')) console.log(...a) }

const libro = libroMod.leer()

if (flag('estado')) {
  const e = libroMod.estado(libro)
  console.log(flag('json') ? JSON.stringify(e, null, 2) : JSON.stringify(e, null, 2))
  process.exit(0)
}

if (flag('rehacer')) {
  log('⟲ --rehacer: descarto los calces guardados y recalculo desde cero.')
  libro.calces = []
}

// ── 1. Lo que hay hoy en disco ────────────────────────────────────────────────
const bco = movimientosBanco()
if (bco.error) { console.error('✗', bco.error); process.exit(1) }

const compras = facturasSii({ empresaId, operacion: 'compra' })
const ventas = facturasSii({ empresaId, operacion: 'venta' })
const facturas = [...compras.facturas, ...ventas.facturas]

// ── 2. Guardar solo lo que no estaba ──────────────────────────────────────────
const antes = libroMod.estado(libro)
const { movsNuevos, facsNuevas } = libroMod.incorporar(libro, { movimientos: bco.movimientos, facturas })

log('\n═══ SINCRONIZACIÓN ═══')
log(`Banco:    ${bco.movimientos.length} movimientos en la cartola → ${movsNuevos.length} nuevos`)
log(`SII:      ${facturas.length} facturas en disco → ${facsNuevas.length} nuevas`)
if (compras.error) log(`  ⚠️  compras: ${compras.error}`)
if (ventas.error) log(`  ⚠️  ventas: ${ventas.error}`)

// ── 3. Cruzar lo suelto ───────────────────────────────────────────────────────
// Se cruza TODO lo pendiente, no solo lo de hoy: una factura de enero puede
// calzar con un pago que recién aparece ahora, y un movimiento viejo sin factura
// puede calzar con una factura que se emitió después.
const pend = libroMod.pendientes(libro)
log(`\nPozo por cruzar: ${pend.movimientos.length} movimientos y ${pend.facturas.length} facturas sin contraparte.`)

const diasCubiertos = new Set(Object.values(libro.movimientos).map((m) => m.fecha))
const r = conciliar({ movimientos: pend.movimientos, facturas: pend.facturas, diasCubiertos })
const nuevosCalces = libroMod.anotarCalces(libro, r.calces)

// ── 4. Guardar ────────────────────────────────────────────────────────────────
libroMod.anotarCorrida(libro, {
  movs_nuevos: movsNuevos.length,
  facturas_nuevas: facsNuevas.length,
  calces_nuevos: nuevosCalces,
})
const ruta = libroMod.grabar(libro)
const ahora = libroMod.estado(libro)

if (flag('json')) {
  console.log(JSON.stringify({
    movimientos_nuevos: movsNuevos.length,
    facturas_nuevas: facsNuevas.length,
    calces_nuevos: nuevosCalces,
    estado: ahora,
  }, null, 2))
  process.exit(0)
}

log(`\n── Calces nuevos: ${nuevosCalces} ──`)
for (const c of r.calces.slice(0, 15)) {
  const icono = { alta: '✓✓', media: '✓ ', baja: '? ' }[c.confianza]
  const f = c.facturas[0]
  const flecha = c.movimiento.signo === 'egreso' ? '↓ pago' : '↑ cobro'
  log(`${icono} ${c.movimiento.fecha}  ${fmt(c.movimiento.monto).padStart(14)}  ${flecha}  ${(f.razon || '').slice(0, 30)}`)
}
if (r.calces.length > 15) log(`   … y ${r.calces.length - 15} más`)

log('\n── Libro acumulado ──')
log(`  Movimientos guardados  ${ahora.movimientos}   (antes ${antes.movimientos})`)
log(`  Facturas guardadas     ${ahora.facturas}   (antes ${antes.facturas})`)
log(`  Calces totales         ${ahora.calces}   (alta ${ahora.confianza.alta} · media ${ahora.confianza.media} · baja ${ahora.confianza.baja})`)
log(`  Sin contraparte        ${ahora.movimientos_pendientes} movimientos · ${ahora.facturas_pendientes} facturas`)
if (ahora.cubre) log(`  Cubre                  ${ahora.cubre.desde} → ${ahora.cubre.hasta}`)
log(`\n  Libro: ${ruta}`)
log(`  Corridas registradas: ${ahora.corridas}\n`)

#!/usr/bin/env node
// probar-libro.mjs — comprobaciones del acumulador. No toca el libro real:
// trabaja sobre copias en memoria.
//
//   node probar-libro.mjs

import { movimientosBanco, idMovimiento } from './fuentes.mjs'
import * as L from './libro.mjs'

let fallos = 0
const ok = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`)
  if (!cond) fallos++
}

const nuevo = () => ({ version: 1, movimientos: {}, facturas: {}, calces: [], corridas: [] })
const bco = movimientosBanco()
const todos = bco.movimientos

console.log('── Identidad de los movimientos ──')
const ids = new Set(todos.map((m) => m.id))
ok(ids.size === todos.length,
   `${todos.length} movimientos → ${ids.size} identidades distintas (sin colisiones)`)

const gemelos = todos.filter((m) => m.fecha === '2026-06-01' && m.monto === 7000000)
const idsGemelos = new Set(gemelos.map((m) => m.id))
ok(gemelos.length === idsGemelos.size,
   `los ${gemelos.length} movimientos idénticos de $7.000.000 del 1-jun conservan identidad propia`)

ok(idMovimiento(todos[0]) === idMovimiento({ ...todos[0] }),
   'la identidad es estable: el mismo movimiento da siempre la misma clave')

console.log('\n── Acumulación incremental ──')
// Día 1: la parte vieja. Día 2: una tanda que PISA los últimos días del día 1
// (así es el caso real: el banco reentrega los mismos movimientos recientes).
const dia1 = todos.filter((m) => m.fecha <= '2026-06-30')
const dia2 = todos.filter((m) => m.fecha >= '2026-06-02')
const solape = dia2.filter((m) => dia1.some((x) => x.id === m.id)).length

const lib = nuevo()
const r1 = L.incorporar(lib, { movimientos: dia1 })
ok(r1.movsNuevos.length === dia1.length,
   `día 1: entran los ${dia1.length} movimientos de la primera tanda`)

ok(solape > 0, `la tanda del día 2 pisa ${solape} movimientos que ya estaban (solape real)`)

const r2 = L.incorporar(lib, { movimientos: dia2 })
const esperados = dia2.length - solape
ok(r2.movsNuevos.length === esperados,
   `día 2: llegan ${dia2.length}, se guardan ${r2.movsNuevos.length} nuevos y se descartan ${solape} repetidos`)

ok(Object.keys(lib.movimientos).length === new Set([...dia1, ...dia2].map((m) => m.id)).size,
   `el libro queda con ${Object.keys(lib.movimientos).length} movimientos, sin duplicar el solape`)

const r3 = L.incorporar(lib, { movimientos: dia2 })
ok(r3.movsNuevos.length === 0,
   'repetir la misma tanda no agrega nada (idempotente)')

console.log('\n── Los calces no se recalculan ──')
const lib2 = nuevo()
L.incorporar(lib2, { movimientos: todos.slice(0, 5) })
const movs = Object.values(lib2.movimientos)
const falso = {
  movimiento: movs[0],
  facturas: [{ id: 'f-test', razon: 'PRUEBA', monto: movs[0].monto }],
  confianza: 'alta', tipo: '1:1', motivos: ['prueba'], diferencia: 0,
}
ok(L.anotarCalces(lib2, [falso]) === 1, 'se anota un calce nuevo')
ok(L.anotarCalces(lib2, [falso]) === 0, 'el mismo calce no se anota dos veces')
ok(L.pendientes(lib2).movimientos.length === movs.length - 1,
   'el movimiento calzado sale del pozo de pendientes')

const otro = { ...falso, facturas: [{ id: 'f-test-2', razon: 'OTRA', monto: 1 }] }
ok(L.anotarCalces(lib2, [otro]) === 0,
   'un movimiento ya calzado no se puede calzar con otra factura')

console.log(fallos ? `\n✗ ${fallos} comprobación(es) fallida(s)\n` : '\n✓ todo correcto\n')
process.exit(fallos ? 1 : 0)

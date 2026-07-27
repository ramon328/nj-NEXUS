#!/usr/bin/env node
// conciliar.mjs — cruza las facturas del SII (RCV) con los movimientos del banco.
//
// Compras  → se PAGAN  → calzan contra CARGOS  (egresos).
// Ventas   → se COBRAN → calzan contra ABONOS  (ingresos).
//
// Cómo calza: la glosa del Santander trae el RUT de la contraparte al inicio
// ("0763075532 Transf a ..."), y el RCV trae el RUT del proveedor/cliente. Ese
// RUT es el ancla; el monto confirma; la fecha desempata. Sin RUT en la glosa
// (cuotas de crédito, compras con tarjeta) se cae a monto exacto y solo se acepta
// si el candidato es único.
//
// Todo es SOLO LECTURA sobre archivos ya cacheados: no toca el banco ni el SII.
//
// Uso:
//   node conciliar.mjs                                  # ventana con mejor cobertura
//   node conciliar.mjs --desde 2026-06-01 --hasta 2026-06-08
//   node conciliar.mjs --limite 50                      # piloto: 50 movimientos
//   node conciliar.mjs --json                           # salida cruda

import { movimientosBanco, facturasSii, coberturaReal, nombreEnGlosa, categoriaMovimiento } from './fuentes.mjs'

// Una factura puede pagarse bastante después de emitida; y a veces el cargo entra
// unos días ANTES (anticipos, o desfase entre fecha de documento y de pago real).
const DIAS_DESPUES = 90
const DIAS_ANTES = 10
// El banco a veces redondea o descuenta comisión: se tolera lo que sea menor
// entre 0,5% y $2.000, para no inventar calces con diferencias grandes.
const tolerancia = (monto) => Math.min(Math.max(monto * 0.005, 1), 2000)

const fmt = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('es-CL')
const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)

/**
 * Puntaje de un par (factura, movimiento). null si es imposible.
 * El puntaje solo ordena candidatos; la confianza la decide `clasificar`.
 */
function evaluar(fac, mov) {
  const d = dias(fac.fecha, mov.fecha)
  if (d > DIAS_DESPUES || d < -DIAS_ANTES) return null

  const rutOk = mov.ruts.includes(fac.rut)
  const nombre = nombreEnGlosa(fac.razon, mov.descripcion)
  const dif = Math.abs(mov.monto - fac.monto)
  const montoExacto = dif === 0
  const montoCerca = dif <= tolerancia(fac.monto)
  // El monto manda: sin él no hay calce. Que coincida el RUT o el nombre nunca
  // basta — un proveedor recurrente tiene muchas facturas y muchos pagos, y
  // aceptar solo por "quién" produjo calces absurdos (una cuota de crédito del
  // Itaú de $4,8M contra una factura del Itaú de $24 mil).
  if (!montoCerca) return null
  // Sin RUT ni nombre, lo único defendible es el monto EXACTO (y aun así queda
  // en confianza baja si varias facturas comparten ese monto).
  if (!rutOk && !nombre && !montoExacto) return null

  let score = 0
  const motivos = []
  if (rutOk) { score += 50; motivos.push('RUT en la glosa') }
  if (nombre) { score += 30; motivos.push(`nombre "${nombre}" en la glosa`) }
  if (montoExacto) { score += 40; motivos.push('monto exacto') }
  else if (montoCerca) { score += 20; motivos.push(`monto ±${fmt(dif)}`) }
  // Mientras más cerca el pago de la emisión, más probable que sea ESE pago.
  score += Math.max(0, 10 - Math.abs(d) / 9)
  motivos.push(`${d >= 0 ? d : Math.abs(d)} días ${d >= 0 ? 'después' : 'antes'}`)

  return { score, rutOk, nombre: !!nombre, montoExacto, montoCerca, dif, d, motivos }
}

// Alta = dos anclas independientes coinciden (quién + cuánto). Con una sola
// ancla el calce es plausible pero hay que mirarlo.
function clasificar(ev, candidatosMismoMonto) {
  const quien = ev.rutOk || ev.nombre
  if (quien && ev.montoExacto) return 'alta'
  if (quien && ev.montoCerca) return 'media'
  if (ev.montoExacto && candidatosMismoMonto === 1) return 'media'
  return 'baja'
}

/**
 * Pago agrupado: un solo cargo que salda 2 o 3 facturas del MISMO proveedor.
 * Es habitual (pago semanal a un proveedor) y sin esto quedarían todas como
 * "sin pago". Se limita a 3 para no generar combinaciones fantasía.
 */
function buscarGrupo(mov, facturasLibres) {
  const cands = facturasLibres.filter((f) => f.monto <= mov.monto
    && (mov.ruts.includes(f.rut) || nombreEnGlosa(f.razon, mov.descripcion)))
  if (cands.length < 2) return null
  const tol = tolerancia(mov.monto)
  for (let i = 0; i < cands.length; i++) {
    for (let j = i + 1; j < cands.length; j++) {
      if (Math.abs(cands[i].monto + cands[j].monto - mov.monto) <= tol) return [cands[i], cands[j]]
      for (let k = j + 1; k < cands.length; k++) {
        if (Math.abs(cands[i].monto + cands[j].monto + cands[k].monto - mov.monto) <= tol) return [cands[i], cands[j], cands[k]]
      }
    }
  }
  return null
}

/**
 * Qué porción del plazo en que la factura pudo pagarse está realmente cubierta
 * por la cartola. Con la captura actual de tek (una página por mes) un mes puede
 * venir cortado al día 8: declarar "impaga" una factura cuyo pago cae en un día
 * que el banco no bajó sería inventar un descuadre.
 */
function cobertura(fac, diasCubiertos) {
  const ini = new Date(fac.fecha)
  let cubiertos = 0
  for (let i = 0; i <= DIAS_DESPUES; i++) {
    const d = new Date(ini.getTime() + i * 86400000).toISOString().slice(0, 10)
    if (diasCubiertos.has(d)) cubiertos++
  }
  return cubiertos / (DIAS_DESPUES + 1)
}

export function conciliar({ movimientos, facturas, diasCubiertos = new Set() }) {
  const porSigno = { compra: 'egreso', venta: 'ingreso' }

  // 1) Todos los pares viables, ordenados por puntaje. Asignación golosa 1:1:
  //    una factura no se paga dos veces, un movimiento no salda dos facturas
  //    (los pagos agrupados se resuelven aparte, en el paso 2).
  const pares = []
  for (const fac of facturas) {
    for (const mov of movimientos) {
      if (mov.signo !== porSigno[fac.operacion]) continue
      const ev = evaluar(fac, mov)
      if (ev) pares.push({ fac, mov, ev })
    }
  }
  pares.sort((a, b) => b.ev.score - a.ev.score)

  // Cuántas facturas comparten monto exacto con el mismo movimiento: si es más
  // de una, el calce por monto solo (sin RUT) es ambiguo y baja de confianza.
  const ambiguedad = new Map()
  for (const p of pares) {
    if (!p.ev.montoExacto) continue
    const k = p.mov.id
    ambiguedad.set(k, (ambiguedad.get(k) || 0) + 1)
  }

  const facUsada = new Set()
  const movUsado = new Set()
  const calces = []

  for (const p of pares) {
    if (facUsada.has(p.fac.id) || movUsado.has(p.mov.id)) continue
    const conf = clasificar(p.ev, ambiguedad.get(p.mov.id) || 1)
    facUsada.add(p.fac.id)
    movUsado.add(p.mov.id)
    calces.push({
      confianza: conf,
      tipo: '1:1',
      movimiento: p.mov,
      facturas: [p.fac],
      diferencia: p.mov.monto - p.fac.monto,
      motivos: p.ev.motivos,
    })
  }

  // 2) Pagos agrupados sobre lo que quedó suelto.
  for (const mov of movimientos) {
    if (movUsado.has(mov.id)) continue
    const libres = facturas.filter((f) => !facUsada.has(f.id) && f.operacion === (mov.signo === 'egreso' ? 'compra' : 'venta'))
    const grupo = buscarGrupo(mov, libres)
    if (!grupo) continue
    const suma = grupo.reduce((s, f) => s + f.monto, 0)
    movUsado.add(mov.id)
    grupo.forEach((f) => facUsada.add(f.id))
    calces.push({
      confianza: 'media',
      tipo: `agrupado x${grupo.length}`,
      movimiento: mov,
      facturas: grupo,
      diferencia: mov.monto - suma,
      motivos: ['RUT en la glosa', `${grupo.length} facturas suman el cargo`],
    })
  }

  calces.sort((a, b) => a.movimiento.fecha.localeCompare(b.movimiento.fecha))

  // Facturas sueltas: separar las que de verdad quedaron impagas de las que
  // simplemente caen en días que la cartola no bajó (no son concluibles).
  const sueltas = facturas.filter((f) => !facUsada.has(f.id))
    .map((f) => ({ ...f, _cob: cobertura(f, diasCubiertos) }))
  const sinPago = sueltas.filter((f) => f._cob >= 0.3)
  const noVerificable = sueltas.filter((f) => f._cob < 0.3)

  const sinFactura = movimientos.filter((m) => !movUsado.has(m.id))
    .map((m) => ({ ...m, categoria: categoriaMovimiento(m) }))
  const cuenta = (arr, c) => arr.filter((x) => x.confianza === c).length
  const porCategoria = {}
  for (const m of sinFactura) porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + 1

  return {
    calces,
    sin_pago: sinPago,
    no_verificable: noVerificable,
    sin_factura: sinFactura,
    resumen: {
      movimientos: movimientos.length,
      facturas: facturas.length,
      conciliados: calces.length,
      facturas_calzadas: facUsada.size,
      confianza: { alta: cuenta(calces, 'alta'), media: cuenta(calces, 'media'), baja: cuenta(calces, 'baja') },
      facturas_sin_pago: sinPago.length,
      facturas_no_verificables: noVerificable.length,
      movimientos_sin_factura: sinFactura.length,
      categorias: porCategoria,
      monto_conciliado: calces.reduce((s, c) => s + c.movimiento.monto, 0),
      monto_sin_factura: sinFactura.reduce((s, m) => s + m.monto, 0),
    },
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('conciliar.mjs')) {
  const rest = process.argv.slice(2)
  const arg = (n, def) => { const i = rest.indexOf('--' + n); return i >= 0 ? rest[i + 1] : def }
  const flag = (n) => rest.includes('--' + n)

  const desde = arg('desde')
  const hasta = arg('hasta')
  const limite = Number(arg('limite', 0)) || 0
  const empresaId = Number(arg('empresa', 3))

  const bco = movimientosBanco({ desde, hasta })
  if (bco.error) { console.error('✗', bco.error); process.exit(1) }

  const compras = facturasSii({ empresaId, operacion: 'compra' })
  const ventas = facturasSii({ empresaId, operacion: 'venta' })

  let movimientos = bco.movimientos
  if (limite) movimientos = movimientos.slice(0, limite)

  // Las facturas se acotan a la ventana del banco: sin cargo posible, una factura
  // aparecería como "impaga" solo porque el banco no cubre esos días.
  const fMin = movimientos.length ? movimientos[0].fecha : desde
  const fMax = movimientos.length ? movimientos[movimientos.length - 1].fecha : hasta
  const enVentana = (f) => f.fecha <= fMax && dias(f.fecha, fMax) <= DIAS_DESPUES
  const facturas = [...compras.facturas, ...ventas.facturas].filter(enVentana)

  // Días que la cartola cubre de verdad (del set COMPLETO, no del recorte),
  // para poder distinguir "impaga" de "el banco no bajó ese día".
  const diasCubiertos = new Set(bco.movimientos.map((m) => m.fecha))
  const r = conciliar({ movimientos, facturas, diasCubiertos })

  if (flag('json')) {
    console.log(JSON.stringify({ ventana: { desde: fMin, hasta: fMax }, ...r }, null, 2))
    process.exit(0)
  }

  const cob = coberturaReal(bco.movimientos)
  console.log(`\n═══ CONCILIACIÓN · ${bco.empresa || 'empresa'} ═══`)
  console.log(`Ventana analizada: ${fMin} → ${fMax}   (${movimientos.length} movimientos, ${facturas.length} facturas)`)
  if (compras.error) console.log(`⚠️  COMPRAS: ${compras.error}`)
  if (ventas.error) console.log(`⚠️  VENTAS:  ${ventas.error}`)

  console.log('\n── Cobertura real del banco (días con datos por mes) ──')
  for (const c of cob) {
    const completo = Number(c.max.slice(8)) >= 27 || c.mes === fMax.slice(0, 7)
    console.log(`  ${c.mes}  ${String(c.n).padStart(3)} movs   ${c.min} → ${c.max}  ${completo ? '' : '⚠️ mes CORTADO'}`)
  }

  const s = r.resumen
  console.log('\n── Resultado ──')
  console.log(`  Conciliados            ${s.conciliados}   (alta ${s.confianza.alta} · media ${s.confianza.media} · baja ${s.confianza.baja})`)
  console.log(`  Facturas calzadas      ${s.facturas_calzadas} de ${s.facturas}`)
  console.log(`  Facturas SIN pago      ${s.facturas_sin_pago}   ← impagas de verdad`)
  console.log(`  No concluible          ${s.facturas_no_verificables}   ← su pago cae en días que la cartola no bajó`)
  console.log(`  Movs SIN factura       ${s.movimientos_sin_factura}   (${fmt(s.monto_sin_factura)})`)
  for (const [c, n] of Object.entries(s.categorias).sort((a, b) => b[1] - a[1])) {
    console.log(`      ${String(n).padStart(3)}  ${c}`)
  }

  console.log('\n── Calces ──')
  for (const c of r.calces) {
    const icono = { alta: '✓✓', media: '✓ ', baja: '? ' }[c.confianza]
    const f = c.facturas[0]
    console.log(`${icono} ${c.movimiento.fecha}  ${fmt(c.movimiento.monto).padStart(14)}  ${c.movimiento.signo === 'egreso' ? '↓' : '↑'}  ${(f.razon || '').slice(0, 32).padEnd(32)} folio ${c.facturas.map((x) => x.folio).join('+')}`)
    console.log(`   ${c.tipo} · ${c.motivos.join(' · ')}${c.diferencia ? ` · dif ${fmt(c.diferencia)}` : ''}`)
    console.log(`   glosa: ${c.movimiento.descripcion.slice(0, 70)}`)
  }

  const revisar = r.sin_factura.filter((m) => m.categoria === 'por revisar')
  console.log(`\n── Movimientos sin factura que SÍ hay que revisar (${revisar.length}) ──`)
  for (const m of revisar.slice(0, 20)) {
    console.log(`   ${m.fecha}  ${fmt(m.monto).padStart(14)}  ${m.signo === 'egreso' ? '↓' : '↑'}  ${m.descripcion.slice(0, 60)}`)
  }
  if (revisar.length > 20) console.log(`   … y ${revisar.length - 20} más`)

  console.log(`\n── Facturas impagas dentro de la cobertura (${r.sin_pago.length}) ──`)
  for (const f of r.sin_pago.slice(0, 20)) {
    console.log(`   ${f.fecha}  ${fmt(f.monto).padStart(14)}  ${f.operacion.padEnd(6)} ${(f.razon || '').slice(0, 34).padEnd(34)} folio ${f.folio}`)
  }
  if (r.sin_pago.length > 20) console.log(`   … y ${r.sin_pago.length - 20} más`)
  console.log()
}

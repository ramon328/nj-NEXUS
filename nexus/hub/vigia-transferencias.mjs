#!/usr/bin/env node
// vigia-transferencias.mjs — sigue las transferencias VIVAS de AutoRed y avisa por
// WhatsApp cuando una cambia de paso, sobre todo cuando el contrato QUEDA FIRMADO y
// hay que ir a pagar los impuestos.
//
// POR QUÉ: el cierre del Contrato Abierto tiene 4 pasos y los dos del medio dependen
// de terceros (el comprador firma cuando quiere). Sin esto, alguien tiene que estar
// preguntando "¿ya firmó?". Acá Nexus lo mira solo y avisa cuando toca actuar.
//
// REGLA DE NEGOCIO (Ramón, 07-08-2026): Nexus hace los pasos 1, 2 y 3 (este último es
// vigilar la firma), pero **EL PAGO DE IMPUESTOS ES MANUAL**. El vigía NO genera cobros
// ni mueve plata: solo avisa el monto y que hay que pagarlo a mano en AutoRed.
//
// Uso:
//   node vigia-transferencias.mjs revisar          → revisa y avisa lo que cambió
//   node vigia-transferencias.mjs revisar --dry    → muestra qué avisaría, sin mandar
//   node vigia-transferencias.mjs estado           → tablero de todas las vivas

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as autored from '../conector-autored/autored.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ESTADO = join(__dirname, '.transferencias-vistas.json')

// A quién se le avisa. Joaquín lleva las transferencias; Ramón queda de copia solo
// para el hito de "listo para pagar", que es el que cuesta plata.
const JOAQUIN = process.env.VIGIA_TR_NUMERO || '+56958589915'
const RAMON = process.env.VIGIA_TR_COPIA || '+56932945240'

const plata = (n) => '$' + Number(n || 0).toLocaleString('es-CL')
const log = (...a) => console.log(new Date().toISOString(), ...a)

function leerVistas() {
  try { return JSON.parse(readFileSync(ESTADO, 'utf8')) } catch { return {} }
}
function guardarVistas(v) {
  try { writeFileSync(ESTADO, JSON.stringify(v, null, 2)) } catch (e) { log('no pude guardar el estado:', e.message) }
}

// Estados que NO son "vivos": no vale la pena mirarlos.
const MUERTOS = ['ABORTED', 'REJECTED', 'COMPLETED']

async function vivas() {
  const l = await autored.listarTransferencias({ filas: 30 })
  return (l.rows || []).filter((r) => !MUERTOS.includes(r.status))
}

// Arma el aviso para un cambio de paso. Devuelve null si el cambio no amerita molestar.
function avisoDe(c, firma) {
  const auto = `${c.patente} (${c.auto})`
  if (c.paso === 'impuestos' || c.hitos.contrato_firmado) {
    const k = autored.costoTransferencia({ precioVenta: c.precio_venta, tasacion: c.tasacion, registroCivil: c.registro_civil_costo })
    return {
      prioridad: true,
      texto: [
        `✅ CONTRATO FIRMADO — ${auto}`,
        '',
        'Ya firmaron las dos partes. Queda el último paso: pagar el impuesto de transferencia.',
        '',
        `Base de cálculo: ${plata(k.base)} (el mayor entre precio de venta y tasación)`,
        `Impuesto 1,5%: ${plata(k.impuesto)}`,
        `Arancel Registro Civil: ${plata(k.registro_civil)}`,
        `TOTAL A PAGAR: ${plata(k.total)}`,
        '',
        'El pago se hace A MANO en AutoRed, yo no lo genero ni lo pago.',
        `Solicitud: ${c.patente} · https://autored.cl/transferencias/detalle/${c.publicId}`,
      ].join('\n'),
    }
  }
  if (c.paso === 'firma_comprador') {
    const pend = (firma?.faltan_firmar || []).join(' y ')
    const linkC = firma?.comprador?.[0]?.linkFirma
    return {
      texto: [
        `✍️ ${auto} — falta la firma del contrato`,
        pend ? `Pendientes: ${pend}` : '',
        linkC ? `Link del comprador: ${linkC}` : '',
        'Firma primero el comprador y después Autosafe por el vendedor. AutoRed le manda el link solo.',
      ].filter(Boolean).join('\n'),
    }
  }
  if (c.paso === 'comprador') {
    return { texto: `📋 ${auto} — toca cargar los datos del comprador. Mándamelos y te armo el borrador.` }
  }
  if (c.paso === 'permiso') {
    return { texto: `📄 ${auto} — toca subir el permiso de circulación (más comuna, vencimiento, precio y forma de pago).` }
  }
  if (c.paso === 'listo') return { texto: `🎉 ${auto} — transferencia FINALIZADA.` }
  return null   // "esperar" y demás: no molestamos
}

async function revisar({ dry = false } = {}) {
  const vistas = leerVistas()
  const lista = await vivas()
  log(`transferencias vivas: ${lista.length}`)
  const kap = dry ? null : await import('./kapso.mjs')

  for (const r of lista) {
    let c
    try { c = await autored.estadoCierre(r.publicId) } catch (e) { log(`no pude leer ${r.publicId}: ${e.message}`); continue }
    const previo = vistas[r.publicId]
    // La huella incluye el paso Y los hitos: así avisamos también si avanza sin cambiar de estado.
    const huella = `${c.estado}|${Object.values(c.hitos).join('')}`
    if (previo?.huella === huella) continue           // nada nuevo

    let firma = null
    if (c.paso === 'firma_comprador' || c.hitos.contrato_creado) {
      try { firma = await autored.firmaContrato(r.publicId) } catch { /* aún no hay contrato */ }
    }
    const aviso = avisoDe(c, firma)
    vistas[r.publicId] = { huella, patente: c.patente, estado: c.estado, ts: new Date().toISOString() }

    if (!aviso) { log(`${c.patente}: ${c.estado} (sin aviso)`); continue }
    // Primera vez que vemos una transferencia: registramos sin avisar, para no
    // disparar una andanada de mensajes con todo el histórico al estrenar el vigía.
    if (!previo) { log(`${c.patente}: ${c.estado} — primera vez, solo registro`); continue }

    if (dry) { log(`[DRY] a ${JOAQUIN}:\n${aviso.texto}\n`); continue }
    try {
      await kap.enviarKapso(JOAQUIN, aviso.texto)
      log(`avisado ${c.patente} → ${c.estado}`)
      if (aviso.prioridad && RAMON) await kap.enviarKapso(RAMON, aviso.texto).catch(() => {})
    } catch (e) {
      log(`no pude avisar de ${c.patente}: ${e.message}`)
      delete vistas[r.publicId]        // que reintente en la próxima pasada
    }
  }
  guardarVistas(vistas)
}

async function estado() {
  const lista = await vivas()
  for (const r of lista) {
    try {
      const c = await autored.estadoCierre(r.publicId)
      const h = c.hitos
      const marca = (b) => (b ? '✅' : '⬜')
      console.log(`${String(c.patente).padEnd(8)} ${String(c.titulo_paso).padEnd(38)} ${marca(h.permiso_subido)}permiso ${marca(h.comprador_ingresado)}comprador ${marca(h.contrato_firmado)}firma ${marca(h.impuestos_pagados)}impuestos`)
    } catch (e) { console.log(`${r.vehicle?.licensePlate}: error ${e.message}`) }
  }
}

const cmd = process.argv[2] || 'revisar'
const dry = process.argv.includes('--dry')
try {
  if (cmd === 'estado') await estado()
  else await revisar({ dry })
} catch (e) { log('ERROR:', e.message); process.exit(1) }

// autos-tag.mjs — CONTEO de autos CON / SIN TAG cruzando el stock de GoAutos (la fuente
// que ve Meme, NO el Excel de SAI) con los leads de TAG (registro.mjs).
// Un auto cuenta "con TAG" si hay un registro para su patente en estado enviado /
// convenio_recibido / activo (rechazado NO cuenta).

import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { listar } from './registro.mjs'
import { patentesHistoricas } from './backfill-tag.mjs'

const GOAUTOS = join(process.env.HOME || '', 'nexus', 'conector-goautos', 'goautos.mjs')

export const normPatente = (p) => String(p || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()

// Lista de autos EN STOCK de GoAutos (patente + datos mínimos).
export function stockGoautos({ limite = 500 } = {}) {
  return new Promise((resolve, reject) => {
    const ch = spawn(process.execPath, [GOAUTOS, 'stock', '--limite', String(limite)], {
      cwd: join(process.env.HOME || '', 'nexus', 'conector-goautos'),
      env: { ...process.env },
    })
    let out = '', err = ''
    ch.stdout.on('data', (d) => (out += d))
    ch.stderr.on('data', (d) => (err += d))
    ch.on('close', () => {
      try {
        const j = JSON.parse(out)
        resolve((j.vehiculos || []).map((v) => ({
          id: v.id, patente: v.patente || '', marca: v.marca, modelo: v.modelo,
          anio: v.anio, estado: v.estado,
        })))
      } catch (e) { reject(new Error('No pude leer el stock de GoAutos: ' + (err || e.message).slice(0, 160))) }
    })
    ch.on('error', (e) => reject(e))
  })
}

// Patentes que YA tienen TAG (según los leads), con su estado más reciente.
export function patentesConTag() {
  const map = new Map()
  for (const r of listar()) {
    if (!r.patente || r.estado === 'rechazado') continue
    const k = normPatente(r.patente)
    // el registro más nuevo manda (listar viene con el más reciente primero)
    if (!map.has(k)) map.set(k, { estado: r.estado, id: r.id, asunto: r.asunto })
  }
  return map
}

// Lista de autos del EXCEL de Mallorca (hoja STOCK VALORIZADO) vía mallorca.py.
export function stockExcel() {
  return new Promise((resolve, reject) => {
    const dir = join(process.env.HOME || '', 'nexus', 'conector-mallorca')
    const py = join(dir, '.venv', 'bin', 'python')
    const ch = spawn(py, [join(dir, 'mallorca.py'), 'stock'], { cwd: dir, env: { ...process.env } })
    let out = '', err = ''
    ch.stdout.on('data', (d) => (out += d))
    ch.stderr.on('data', (d) => (err += d))
    ch.on('close', () => {
      try { resolve((JSON.parse(out).autos || []).map((v) => ({ patente: v.patente || '', marca: v.marca, modelo: v.modelo, costo: v.costo, total_invertido: v.total_invertido }))) }
      catch (e) { reject(new Error('No pude leer el Excel de Mallorca: ' + (err || e.message).slice(0, 160))) }
    })
    ch.on('error', (e) => reject(e))
  })
}

// Conjunto de patentes CON TAG = leads (nuevos) ∪ historial de correos (backfill).
export function patentesTagTotales() {
  const set = new Set(patentesHistoricas())
  for (const [k] of patentesConTag()) set.add(k)
  return set
}

// Conteo cruzando el EXCEL de Mallorca (STOCK VALORIZADO) con TAG. Es "el Excel con tag".
export async function conteoExcel() {
  const [stock, tagSet] = [await stockExcel(), patentesTagTotales()]
  const con = [], sin = []
  for (const v of stock) {
    const k = normPatente(v.patente)
    if (k && k.length >= 5 && tagSet.has(k)) con.push({ ...v, tag: true })
    else sin.push({ ...v, tag: false })
  }
  return { fuente: 'Excel Mallorca · STOCK VALORIZADO', total: stock.length, con_tag: con.length, sin_tag: sin.length, autos_con_tag: con, autos_sin_tag: sin }
}

// Conteo cruzado. Devuelve resumen + listas.
export async function conteo() {
  const [stock, conTagMap] = [await stockGoautos(), patentesConTag()]
  const con = [], sin = []
  for (const v of stock) {
    const k = normPatente(v.patente)
    const tag = k && conTagMap.get(k)
    if (tag) con.push({ ...v, tag_estado: tag.estado, tag_id: tag.id })
    else sin.push(v)
  }
  // Patentes con TAG que NO están en el stock actual (vendidos/otros)
  const enStock = new Set(stock.map((v) => normPatente(v.patente)))
  const tagFueraStock = [...conTagMap.entries()].filter(([k]) => !enStock.has(k)).map(([k, v]) => ({ patente: k, ...v }))
  return {
    total_stock: stock.length,
    con_tag: con.length,
    sin_tag: sin.length,
    autos_con_tag: con,
    autos_sin_tag: sin,
    tag_fuera_de_stock: tagFueraStock,
  }
}

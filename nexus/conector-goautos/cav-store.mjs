// cav-store.mjs — MEMORIA DE CAVs de Nexus, indexada por PATENTE.
//
// POR QUÉ EXISTE: la factura del SII necesita los datos del vehículo (Tipo, Marca,
// Modelo, Nro. Motor, Nro. Chasis, Color, Combustible, PBV, Patente, Año). GoAutos
// tiene casi todos (motor y chasis incluidos), pero el **PBV no existe en su base**
// (verificado: ninguna de las 57 columnas, y ninguno de los 158 autos lo tiene en
// descripción/extras/features) — el PBV solo sale del CAV.
//
// Y NO se puede guardar en `extras` de GoAutos: ese campo lo usan para el texto
// comercial del auto ("Todas las mantenciones en la marca…"), lo ensuciaríamos.
//
// SOLUCIÓN: cuando Nexus lee un CAV, guarda esos datos acá por patente. La próxima
// factura de ese auto sale sin pedir el CAV ni el PBV — "tener los datos es como
// tener el documento" (Ramón). Los datos se MEZCLAN con los de GoAutos en `ficha`.
//
// (Lo correcto a futuro sería una columna PBV en GoAutos; mientras, esto no toca su BD.)

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RUTA = join(__dirname, 'cav-guardados.json')

// Patente normalizada: sin puntos/guiones/espacios y en mayúsculas.
// "TBWP.52-5" → "TBWP525" ; "tvsv61" → "TVSV61"
export const normPatente = (p) => String(p || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()

function leerTodo() {
  try { return existsSync(RUTA) ? JSON.parse(readFileSync(RUTA, 'utf8')) : {} } catch { return {} }
}

/** Datos de CAV guardados para una patente (o null). */
export function leerCav(patente) {
  const k = normPatente(patente)
  if (!k) return null
  return leerTodo()[k] || null
}

/**
 * Guarda/actualiza los datos del CAV de un auto. Solo pisa los campos que vengan
 * con valor (no borra lo ya guardado). Devuelve el registro final.
 */
export function guardarCav(datos = {}) {
  const k = normPatente(datos.patente)
  if (!k) throw new Error('Falta la patente para guardar el CAV')
  const todo = leerTodo()
  const previo = todo[k] || {}
  const CAMPOS = ['tipo', 'marca', 'modelo', 'motor', 'chasis', 'vin', 'color', 'combustible', 'pbv', 'patente', 'anio']
  const nuevo = { ...previo }
  for (const c of CAMPOS) {
    const v = datos[c]
    if (v !== undefined && v !== null && String(v).trim() !== '') nuevo[c] = String(v).trim()
  }
  nuevo.patente = String(datos.patente).trim()
  nuevo.actualizado = new Date().toISOString()
  if (datos.fuente) nuevo.fuente = datos.fuente          // ej. "CAV 2026-07-14"
  todo[k] = nuevo
  writeFileSync(RUTA, JSON.stringify(todo, null, 2), 'utf8')
  return nuevo
}

/** Cuántos CAVs hay guardados (para diagnóstico). */
export function contarCav() { return Object.keys(leerTodo()).length }

// ── DATOS DEL AUTO DICTADOS POR EL USUARIO ────────────────────────────────────
// Problema real (19-08-2026, Ramón): cuando la persona PEGA el bloque de datos del
// auto ("Marca : SUBARU / Modelo : CROSSTREK 5P 4X4 2.0 AUT / Nro. Motor : …") para
// una factura, el único que los traducía a la herramienta era el modelo, y a veces
// abreviaba el modelo, se saltaba un campo o lo pisaba con lo que había en GoAutos.
// El usuario dictó el dato y en la factura salía otro.
//
// Este módulo NO depende del modelo: lee el texto del usuario tal cual, saca los
// campos por su etiqueta y los guarda por persona+patente. Después, al armar la
// factura (de venta o de compra), lo DICTADO manda sobre GoAutos, el CAV o lo que
// el modelo haya decidido escribir: se copia LITERAL, sin normalizar ni abreviar.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PATH_DICTADO = join(__dirname, '.vehiculo-dictado.json')
const VIGENCIA_MS = 24 * 60 * 60 * 1000   // un dictado vale para el día; después se pide de nuevo

// Etiquetas tal como las escribe la gente (CAV pegado, dictado a mano, con o sin
// tildes, con ":" o "=", con "Nro."/"N°"/"Numero"). El valor es TODO lo que sigue
// hasta el fin de línea, sin tocar: "DUAL (ELECTRICO/GASOLINA)" entra completo.
const ETIQUETAS = [
  ['tipo', /^\s*tipo(?:\s+(?:de\s+)?veh[ií]culo)?\s*[:=]\s*(.+)$/i],
  ['marca', /^\s*marca\s*[:=]\s*(.+)$/i],
  ['modelo', /^\s*modelo\s*[:=]\s*(.+)$/i],
  ['motor', /^\s*(?:n(?:ro?\.?|[°º*])?\s*)?motor\s*[:=]\s*(.+)$/i],
  ['chasis', /^\s*(?:n(?:ro?\.?|[°º*])?\s*)?(?:chasis|chassis|vin)\s*[:=]\s*(.+)$/i],
  ['color', /^\s*color\s*[:=]\s*(.+)$/i],
  ['combustible', /^\s*combustible\s*[:=]\s*(.+)$/i],
  ['pbv', /^\s*(?:p\.?\s*b\.?\s*v\.?|peso bruto(?: vehicular)?)\s*[:=]\s*(.+)$/i],
  ['patente', /^\s*(?:patente|placa(?:\s+patente)?|ppu)\s*[:=]\s*(.+)$/i],
  ['anio', /^\s*(?:a[nñ]o|anio)\s*[:=]\s*(.+)$/i],
  ['km', /^\s*(?:km|kms|kilometraje|kil[oó]metros)\s*[:=]\s*(.+)$/i],
]

// Patente sin puntos, guion ni dígito verificador: sirve SOLO para emparejar
// (la patente que se imprime es la que dictó la persona, tal cual la escribió).
export function claveP (p) {
  const s = String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return s.length > 6 ? s.slice(0, 6) : s
}

// Lee un texto y devuelve SOLO los campos que venían con su etiqueta explícita.
// null si no hay al menos 3 campos: un "modelo: X" suelto en medio de una charla
// no es un dictado de ficha y no debe pisar nada.
export function parsearVehiculoDictado (texto) {
  const t = String(texto || '')
  if (!t.trim()) return null
  const out = {}
  for (const linea of t.split(/\r?\n/)) {
    for (const [campo, re] of ETIQUETAS) {
      if (out[campo] !== undefined) continue
      const m = linea.match(re)
      if (m) {
        let v = m[1].trim().replace(/[·,;]\s*$/, '').trim()
        // El km se guarda como número escrito: si dicen "12.500 km" no queremos que
        // después salga impreso "12.500 km km".
        if (campo === 'km') v = v.replace(/\s*(kms?|kil[oó]metros)\.?$/i, '').trim()
        if (v && !/^(no|sin|-{1,}|n\/a)$/i.test(v)) out[campo] = v
        break
      }
    }
  }
  const campos = Object.keys(out)
  if (campos.length < 3) return null
  // "Nro. Vin" y "Nro. Chasis" suelen venir los dos con el mismo valor: ya quedó uno.
  return { ...out, _campos: campos }
}

function leerTodo () { try { return JSON.parse(readFileSync(PATH_DICTADO, 'utf8')) || {} } catch { return {} } }

// Guarda el dictado del turno. Clave: persona + patente (o "_sinpatente" si no la
// dictó, para el caso de una factura de un auto que se está identificando aparte).
export function guardarDictado (de, datos) {
  if (!datos) return null
  try {
    const todo = leerTodo()
    const clave = `${de || '_anon'}::${claveP(datos.patente) || '_sinpatente'}`
    todo[clave] = { ...datos, ts: Date.now() }
    // Poda: solo lo del último día, para que el archivo no crezca sin fin.
    for (const k of Object.keys(todo)) {
      if (Date.now() - Number(todo[k]?.ts || 0) > VIGENCIA_MS) delete todo[k]
    }
    writeFileSync(PATH_DICTADO, JSON.stringify(todo, null, 2), 'utf8')
    return datos
  } catch { return null }
}

// Recupera lo dictado para una patente (o el último dictado sin patente si no se
// pasa ninguna). Vencido = no existe.
export function leerDictado (de, patente) {
  try {
    const todo = leerTodo()
    const dueño = `${de || '_anon'}::`
    const cp = claveP(patente)
    const cand = cp ? [todo[`${dueño}${cp}`], todo[`${dueño}_sinpatente`]] : [todo[`${dueño}_sinpatente`]]
    for (const d of cand) {
      if (d && Date.now() - Number(d.ts || 0) < VIGENCIA_MS) {
        // Un dictado guardado SIN patente solo se aplica si el que pregunta tampoco
        // trae patente o si la que trae coincide: nunca se cruzan dos autos.
        if (cp && d.patente && claveP(d.patente) !== cp) continue
        return d
      }
    }
  } catch { /* */ }
  return null
}

// Mezcla el dictado sobre los datos que armó el modelo. Lo dictado MANDA (se copia
// literal); lo que no fue dictado se conserva. Devuelve el objeto nuevo y la lista
// de campos que hubo que corregir, para poder decírselo a la persona.
export function aplicarDictado (veh, dict) {
  const base = { ...(veh || {}) }
  if (!dict) return { veh: base, corregidos: [], aplicados: [] }
  const corregidos = [], aplicados = []
  for (const campo of (dict._campos || [])) {
    const valor = dict[campo]
    if (valor === undefined || valor === '') continue
    const antes = base[campo]
    if (antes !== undefined && antes !== null && String(antes).trim() !== '') {
      const igual = String(antes).replace(/\s+/g, '').toUpperCase() === String(valor).replace(/\s+/g, '').toUpperCase()
      if (!igual) corregidos.push({ campo, antes: String(antes), dictado: String(valor) })
    } else {
      aplicados.push(campo)
    }
    base[campo] = valor
  }
  return { veh: base, corregidos, aplicados }
}

// Busca el dictado que CORRESPONDE a un texto libre (el nombre/descripción que armó
// el modelo para la línea de la factura): si el texto nombra la patente de alguno de
// los bloques que la persona dictó hoy, ese es. Sirve para el caso en que el modelo
// escribió el detalle a mano y no puso los datos en su campo.
export function dictadoParaTexto (de, texto) {
  const plano = String(texto || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!plano) return null
  try {
    const todo = leerTodo()
    const dueño = `${de || '_anon'}::`
    for (const [k, d] of Object.entries(todo)) {
      if (!k.startsWith(dueño) || !d) continue
      if (Date.now() - Number(d.ts || 0) > VIGENCIA_MS) continue
      const cp = claveP(d.patente)
      if (cp && plano.includes(cp)) return d
    }
  } catch { /* */ }
  return null
}

// ── Aplica el dictado a las LÍNEAS de una factura ─────────────────────────────
// items    = lo que armó el modelo en esta llamada
// itemsPrev= las líneas del documento en curso (para heredar lo que el modelo no repitió)
// Devuelve las líneas ya corregidas + qué se corrigió y qué se completó.
export function aplicarDictadoAItems ({ items, itemsPrev = [], de }) {
  const corregidos = [], agregados = []
  if (!Array.isArray(items)) return { items, corregidos, agregados }
  const objVeh = (o) => (o && typeof o === 'object' && !Array.isArray(o)) ? o : null
  const salida = items.map((it0, idx) => {
    const it = { ...(it0 || {}) }
    const vehNuevo = objVeh(it.vehiculo)
    const vehPrev = objVeh(itemsPrev[idx]?.vehiculo)
    const vehBase = (vehNuevo || vehPrev) ? { ...(vehPrev || {}), ...(vehNuevo || {}) } : null
    const txtItem = `${it.nombre || ''} ${it.detalle || ''}`
    // El dictado se empareja por PATENTE: la del ítem, o la que el modelo haya escrito
    // dentro del texto de la línea (cuando armó la descripción a mano).
    const dict = leerDictado(de, vehBase?.patente || '') || dictadoParaTexto(de, txtItem)
    if (!dict && !vehBase) return it
    if (!dict) { it.vehiculo = vehBase; return it }
    // Si la línea NO trae datos de vehículo, el dictado solo se aplica cuando ES la línea
    // del auto (nombre "Venta"/vehículo, o el texto nombra la patente o la marca dictada):
    // en una factura de servicios no se mete nada.
    if (!vehBase) {
      const txt = txtItem.toLowerCase()
      const plano = txt.replace(/[^a-z0-9]/g, '')
      const esLineaDelAuto = /venta|veh[ií]culo|autom[oó]vil|\bauto\b/.test(txt)
        || (dict.patente && plano.includes(claveP(dict.patente).toLowerCase()))
        || (dict.marca && txt.includes(String(dict.marca).toLowerCase()))
      if (!esLineaDelAuto) return it
    }
    const { veh, corregidos: cs, aplicados } = aplicarDictado(vehBase || {}, dict)
    delete veh._campos; delete veh.ts
    it.vehiculo = veh
    // Un detalle escrito a mano por el modelo GANARÍA sobre `vehiculo` en el backend
    // (emitir.py prioriza `detalle`). Se descarta solo si NO dice todo lo dictado; si ya
    // lo dice todo, se respeta la redacción.
    if (it.detalle) {
      const plano = String(it.detalle).replace(/\s+/g, '').toLowerCase()
      const cubre = (dict._campos || []).every((c) => plano.includes(String(dict[c]).replace(/\s+/g, '').toLowerCase()))
      if (!cubre) delete it.detalle
    }
    corregidos.push(...cs); agregados.push(...aplicados)
    return it
  })
  return { items: salida, corregidos, agregados }
}

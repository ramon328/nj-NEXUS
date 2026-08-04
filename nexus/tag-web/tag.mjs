// tag.mjs — Lógica de SOLICITUD / TRASPASO DE TAG (paso-a-paso oficial de Tag Tico).
// Reutilizable por el tool de Meme. Arma el asunto según el caso, redacta el cuerpo
// y envía el correo DESDE el buzón de Mallorca vinculado (si no, desde la cuenta base).
//
//   import { enviarSolicitudTag } from './tag.mjs'
//   await enviarSolicitudTag({ tipo:'traspaso', patente:'ABCD12', adjuntos:[...] , prueba:true })

import { enviarCorreo, cuentaActiva } from './enviar.mjs'
import { crear as crearRegistro } from './registro.mjs'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* opcional */ }
// Interruptor GLOBAL: si tag-modo.json no dice { "real": true }, TODO va en modo prueba
// (al correo de Ramón), NADA sale a Tag Tico. Se prende/apaga sin tocar código.
const MODO_FILE = join(__dirname, 'tag-modo.json')
export function realActivo() {
  try { return JSON.parse(readFileSync(MODO_FILE, 'utf8')).real === true } catch { return false }
}

// Destinatarios oficiales (modo real).
export const TAG_TO = process.env.TAG_TO || 'contacto@tagtico.cl'
export const TAG_CC = process.env.TAG_CC || 'ventas@mallorcautos.cl'
export const TAG_PRUEBA = process.env.TAG_PRUEBA || 'ramon@dropout.cl'

// Avisos internos (WA) cuando se envía una solicitud de TAG (autos/Mallorca).
const AVISAR_R = process.env.TAG_AVISAR_WA || '+56932945240' // Ramón
const AVISAR_AUTOS = process.env.TAG_AVISAR_WA_AUTOS || process.env.DOCS_AUTOS_DESTINO || '+56958589915' // Joaquín
function splitDest(s) {
  return String(s || '')
    .split(/[,\s;]+/g)
    .map((x) => x.trim())
    .filter(Boolean)
}
const DESTINOS = [...new Set([...splitDest(AVISAR_R), ...splitDest(AVISAR_AUTOS)])]
let alertarUsuario = null
try { ({ alertarUsuario } = await import('../hub/alertar.mjs')) } catch { /* opcional */ }
async function avisar(txt) {
  if (!alertarUsuario) return
  for (const to of DESTINOS) {
    try { await alertarUsuario(to, txt) } catch { /* best-effort */ }
  }
}

export const TIPOS = {
  nuevo_propio: {
    label: 'TAG nuevo — auto propio (Ana Clara)',
    asunto: (d) => { const p = listaPatentes(d); return p.length > 1 ? `Tag nuevo (${p.length} patentes)` : p.length ? `Tag nuevo patente ${p[0]}` : `Tag nuevo Ana clara (${d.cantidad || 1})` },
    // Propios: basta poder + CAV (no exige contrato firmado).
  },
  traspaso: {
    label: 'Traspaso de TAG — auto con tag nuestro que se vende',
    asunto: (d) => { const p = listaPatentes(d); return p.length > 1 ? `Traspaso Tag (${p.length} patentes)` : `Traspaso Tag patente ${p[0] || ''}` },
  },
  nuevo_tercero: {
    label: 'TAG nuevo — auto de tercero / consignación',
    asunto: (d) => { const p = listaPatentes(d); return p.length > 1 ? `Tag nuevo (${p.length} patentes)` : `Tag nuevo patente ${p[0] || ''}` },
  },
}

// Documentos típicos por caso. OJO: en MallorcAutos NO se exige el contrato de
// compraventa firmado — basta poder + CAV/factura + carnet. Es una GUÍA, no un bloqueo:
// si la persona manda sus documentos y confirma, se adjuntan TODOS y se envía.
export function documentosRequeridos(tipo, es_empresa) {
  let docs
  if (tipo === 'nuevo_propio') {
    docs = ['Poder', 'CAV (Certificado de Anotaciones Vigentes)']
  } else {
    // traspaso / tercero: carnet nuevo dueño + poder de gestión + CAV o factura de venta.
    docs = [
      'Carnet por ambos lados del nuevo dueño',
      'Poder de gestión del TAG (o contrato/compraventa si lo tienen)',
      'CAV o factura de venta como respaldo',
    ]
  }
  if (es_empresa) docs = docs.concat(['Escritura de la empresa', 'e-RUT'])
  return docs
}

// Lista de patentes normalizadas (soporta d.patentes[] o d.patente único).
// Un mismo string puede traer VARIAS patentes separadas por guión, coma, "/" o espacio
// ("SWPV28-TDCX40"). Antes se limpiaban los separadores y quedaban PEGADAS en una patente
// inexistente ("SWPV28TDCX40"), que además terminaba impresa en el poder.
// Ojo: un guión seguido de UN solo carácter es el dígito verificador ("SWPV28-0"), no otra patente.
const RX_PATENTE = /^[A-Z]{2,4}\d{2,4}$/
export function listaPatentes(d) {
  const raw = Array.isArray(d.patentes) && d.patentes.length ? d.patentes : (d.patente ? [d.patente] : [])
  const out = []
  for (const item of raw) {
    for (const trozo of String(item || '').toUpperCase().replace(/\./g, '').split(/[,\s/]+|-/)) {
      const t = trozo.trim()
      if (!t || /^[\dK]$/.test(t)) continue          // vacío o dígito verificador
      if (RX_PATENTE.test(t) && !out.includes(t)) out.push(t)
    }
  }
  return out
}

function cuerpo(d, tipoLabel, nAdj) {
  const pats = listaPatentes(d)
  const verbo = d.tipo === 'traspaso' ? 'Traspaso Tag' : 'Tag nuevo'
  const L = ['Estimado,', '', 'Solicitamos lo siguiente:', '']
  if (pats.length) { for (const p of pats) L.push(`${verbo} patente ${p}`) }
  else L.push(verbo)
  L.push(`Cantidad: ${d.cantidad || pats.length || 1}`)
  L.push('', '')
  if (d.notas) L.push(d.notas)
  return L.join('\n').replace(/\n{3,}$/, '\n')
}

// Valida los datos y devuelve { ok, error? }.
export function validar(d) {
  const t = TIPOS[d.tipo]
  if (!t) return { ok: false, error: 'Tipo inválido (usa nuevo_propio, traspaso o nuevo_tercero).' }
  // La patente es OBLIGATORIA en los TRES casos: el poder que generamos nombra la
  // "Placa Patente Única", así que sin patente NO hay poder y el correo salía sin él.
  // Pasó de verdad (TAG-001 y TAG-002 del 31-07-2026: nuevo_propio sin patente → se enviaron
  // solo con los PDF del usuario, sin ningún Poder_Tag adjunto, y nadie se enteró).
  if (!listaPatentes(d).length)
    return { ok: false, error: 'Falta la patente del vehículo (puedes mandar varias: "AABB11-CCDD22"). Sin patente no se puede generar el poder, y el correo saldría sin él.' }
  const adj = d.adjuntos || []
  if (!adj.length) return { ok: false, error: 'Debes adjuntar al menos un documento PDF.' }
  for (const a of adj) {
    if (!/pdf/i.test(a.mime || '') && !/\.pdf$/i.test(a.filename || ''))
      return { ok: false, error: `El archivo "${a.filename}" no es PDF. Todos los documentos deben ir en PDF.` }
  }
  return { ok: true }
}

// Envía la solicitud/traspaso. En modo prueba va solo a TAG_PRUEBA (ramon@dropout.cl).
export async function enviarSolicitudTag(d) {
  const v = validar(d)
  if (!v.ok) return v
  const t = TIPOS[d.tipo]
  const adjuntos = (d.adjuntos || []).map((a) => ({ filename: a.filename, mime: 'application/pdf', buffer: a.buffer }))
  const asunto = t.asunto(d)
  const cuenta = cuentaActiva()
  // Interruptor global manda: si el modo real NO está activo, SIEMPRE prueba (al correo
  // de Ramón), pase lo que pase. Solo con real activo se respeta d.prueba.
  const prueba = !realActivo() ? true : (d.prueba === true)
  const to = prueba ? TAG_PRUEBA : TAG_TO
  const cc = prueba ? '' : TAG_CC
  try {
    const r = await enviarCorreo({
      to, cc,
      replyTo: cuenta.mallorca ? undefined : TAG_CC,
      asunto,
      cuerpo: cuerpo(d, t.label, adjuntos.length),
      adjuntos,
      fromNombre: cuenta.mallorca ? 'MallorcAutos' : 'MallorcAutos (vía Nexus)',
    })
    const destinoTxt = cc ? `${to} (copia: ${cc})` : to
    // Registra el "lead" de TAG (seguimiento interno).
    let registro = null
    try {
      registro = crearRegistro({
        tipo: d.tipo, tipo_label: t.label,
        patente: listaPatentes(d).join(', ') || d.patente, cantidad: d.cantidad || listaPatentes(d).length, es_empresa: d.es_empresa,
        solicitante: d.solicitante, asunto,
        correo_id: r.id, enviado_desde: r.cuenta, destino: destinoTxt,
        modo: prueba ? 'prueba' : 'real',
        adjuntos: adjuntos.map((a) => a.filename), notas: d.notas,
      })
    } catch { /* el envío ya salió; no bloquear por el registro */ }
    // Aviso interno: solo en modo real (evita spamear en pruebas).
    if (!prueba && process.env.TAG_AVISAR_ON_SEND !== '0') {
      const p = listaPatentes(d).join(', ')
      const id = registro?.id ? ` · ${registro.id}` : ''
      const desde = cuenta.mallorca ? 'correo Mallorca' : 'cuenta base'
      await avisar(`📨 TAG enviado (${t.label}${p ? ` · ${p}` : ''})${id}. Desde: ${desde}. Asunto: "${String(asunto).slice(0, 80)}"`)
    }
    return {
      ok: true, modo: prueba ? 'prueba' : 'real', asunto,
      destino: destinoTxt,
      adjuntos: adjuntos.length, enviado_desde: r.cuenta,
      desde_mallorca: cuenta.mallorca, correo_id: r.id,
      registro_id: registro ? registro.id : null,
    }
  } catch (e) { return { ok: false, error: 'No se pudo enviar: ' + e.message } }
}

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

export const TIPOS = {
  nuevo_propio: {
    label: 'TAG nuevo — auto propio (Ana Clara)',
    asunto: (d) => `Tag nuevo Ana clara (${d.cantidad || 1})`,
    // Propios: basta poder + CAV (no exige contrato firmado).
  },
  traspaso: {
    label: 'Traspaso de TAG — auto con tag nuestro que se vende',
    asunto: (d) => `Traspaso Tag patente ${(d.patente || '').toUpperCase()}`,
  },
  nuevo_tercero: {
    label: 'TAG nuevo — auto de tercero / consignación',
    asunto: (d) => `Tag nuevo patente ${(d.patente || '').toUpperCase()}`,
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

function cuerpo(d, tipoLabel, nAdj) {
  const L = ['Estimados Tag Tico,', '', 'Solicitamos lo siguiente:', '']
  L.push(`• Tipo: ${tipoLabel}`)
  if (d.tipo === 'nuevo_propio') L.push(`• Cantidad de TAG: ${d.cantidad || 1}`)
  if (d.patente) L.push(`• Patente: ${(d.patente || '').toUpperCase()}`)
  L.push(`• Es empresa: ${d.es_empresa ? 'Sí (se adjunta escritura y e-RUT)' : 'No'}`)
  if (d.solicitante) L.push(`• Solicitado por: ${d.solicitante}`)
  if (d.notas) { L.push(''); L.push('Notas:'); L.push(d.notas) }
  L.push('', `Se adjuntan ${nAdj} documento(s) en formato PDF.`, '')
  L.push('Quedamos atentos al envío del convenio para confirmar la activación.', '')
  L.push('Saludos,', 'Equipo MallorcAutos')
  return L.join('\n')
}

// Valida los datos y devuelve { ok, error? }.
export function validar(d) {
  const t = TIPOS[d.tipo]
  if (!t) return { ok: false, error: 'Tipo inválido (usa nuevo_propio, traspaso o nuevo_tercero).' }
  if ((d.tipo === 'traspaso' || d.tipo === 'nuevo_tercero') && !String(d.patente || '').trim())
    return { ok: false, error: 'Falta la patente del vehículo.' }
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
        patente: d.patente, cantidad: d.cantidad, es_empresa: d.es_empresa,
        solicitante: d.solicitante, asunto,
        correo_id: r.id, enviado_desde: r.cuenta, destino: destinoTxt,
        modo: prueba ? 'prueba' : 'real',
        adjuntos: adjuntos.map((a) => a.filename), notas: d.notas,
      })
    } catch { /* el envío ya salió; no bloquear por el registro */ }
    return {
      ok: true, modo: prueba ? 'prueba' : 'real', asunto,
      destino: destinoTxt,
      adjuntos: adjuntos.length, enviado_desde: r.cuenta,
      desde_mallorca: cuenta.mallorca, correo_id: r.id,
      registro_id: registro ? registro.id : null,
    }
  } catch (e) { return { ok: false, error: 'No se pudo enviar: ' + e.message } }
}

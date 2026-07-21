// server.mjs — Web de SOLICITUD / TRASPASO DE TAG para el personal de MallorcAutos.
// El personal llena el formulario, adjunta los PDF, y Nexus arma y ENVÍA el correo
// a Tag Tico (contacto@tagtico.cl, copia ventas@mallorcautos.cl) siguiendo el
// paso-a-paso oficial. El correo sale por la cuenta Gmail conectada de Nexus.
//
// MODO (env TAG_MODO):
//   prueba (por defecto) → todo se manda a TAG_PRUEBA (ramon@dropout.cl)
//   real                 → se manda a Tag Tico con copia a ventas@mallorcautos.cl
//
//   node server.mjs   → http://127.0.0.1:3022  (y por Tailscale)

import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { enviarCorreo } from './enviar.mjs'

const PORT = Number(process.env.TAG_PORT || 3022)
const MODO = (process.env.TAG_MODO || 'prueba').toLowerCase()
const PRUEBA_TO = process.env.TAG_PRUEBA || 'ramon@dropout.cl'
const REAL_TO = process.env.TAG_TO || 'contacto@tagtico.cl'
const REAL_CC = process.env.TAG_CC || 'ventas@mallorcautos.cl'
const REPLY_TO = process.env.TAG_REPLYTO || 'ventas@mallorcautos.cl'
const FROM_NOMBRE = 'MallorcAutos — Solicitud de TAG'

const HTML = readFileSync(join(new URL('.', import.meta.url).pathname, 'index.html'), 'utf8')

const TIPOS = {
  nuevo_propio: {
    label: 'TAG nuevo — auto propio (Ana Clara)',
    asunto: (d) => `Tag nuevo Ana clara (${d.cantidad || 1})`,
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

function cuerpoCorreo(d, tipoLabel, nAdj) {
  const L = []
  L.push('Estimados Tag Tico,')
  L.push('')
  L.push('Solicitamos lo siguiente:')
  L.push('')
  L.push(`• Tipo: ${tipoLabel}`)
  if (d.tipo === 'nuevo_propio') L.push(`• Cantidad de TAG: ${d.cantidad || 1}`)
  if (d.patente) L.push(`• Patente: ${(d.patente || '').toUpperCase()}`)
  L.push(`• Es empresa: ${d.es_empresa ? 'Sí (se adjunta escritura y e-RUT)' : 'No'}`)
  if (d.solicitante) L.push(`• Solicitado por: ${d.solicitante}`)
  if (d.notas) { L.push(''); L.push('Notas:'); L.push(d.notas) }
  L.push('')
  L.push(`Se adjuntan ${nAdj} documento(s) en formato PDF.`)
  L.push('')
  L.push('Quedamos atentos al envío del convenio para confirmar la activación.')
  L.push('')
  L.push('Saludos,')
  L.push('Equipo MallorcAutos')
  return L.join('\n')
}

async function parseForm(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const body = Buffer.concat(chunks)
  const r = new Response(body, { headers: { 'content-type': req.headers['content-type'] || '' } })
  return r.formData()
}

async function manejarEnvio(req, res) {
  const form = await parseForm(req)
  const d = {
    tipo: form.get('tipo'),
    cantidad: form.get('cantidad'),
    patente: (form.get('patente') || '').toString().trim(),
    es_empresa: form.get('es_empresa') === 'on' || form.get('es_empresa') === 'true',
    solicitante: (form.get('solicitante') || '').toString().trim(),
    notas: (form.get('notas') || '').toString().trim(),
  }
  const t = TIPOS[d.tipo]
  if (!t) return json(res, 400, { ok: false, error: 'Tipo de solicitud inválido.' })
  if ((d.tipo === 'traspaso' || d.tipo === 'nuevo_tercero') && !d.patente)
    return json(res, 400, { ok: false, error: 'Falta la patente del vehículo.' })

  // Adjuntos (solo PDF)
  const adjuntos = []
  for (const f of form.getAll('archivos')) {
    if (!f || typeof f.arrayBuffer !== 'function' || !f.name) continue
    const buf = Buffer.from(await f.arrayBuffer())
    if (!buf.length) continue
    const mime = f.type || 'application/pdf'
    if (!/pdf/i.test(mime) && !/\.pdf$/i.test(f.name))
      return json(res, 400, { ok: false, error: `El archivo "${f.name}" no es PDF. Todos los documentos deben ir en PDF.` })
    adjuntos.push({ filename: f.name, mime: 'application/pdf', buffer: buf })
  }
  if (!adjuntos.length) return json(res, 400, { ok: false, error: 'Debes adjuntar al menos un documento (PDF).' })

  const asunto = t.asunto(d)
  const cuerpo = cuerpoCorreo(d, t.label, adjuntos.length)
  const to = MODO === 'real' ? REAL_TO : PRUEBA_TO
  const cc = MODO === 'real' ? REAL_CC : ''

  try {
    const r = await enviarCorreo({ to, cc, replyTo: REPLY_TO, asunto, cuerpo, adjuntos, fromNombre: FROM_NOMBRE })
    return json(res, 200, {
      ok: true, modo: MODO, asunto,
      destino: cc ? `${to} (copia: ${cc})` : to,
      adjuntos: adjuntos.length, id: r.id, cuenta: r.cuenta,
    })
  } catch (e) {
    return json(res, 500, { ok: false, error: 'No se pudo enviar el correo: ' + e.message })
  }
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(obj))
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/enviar') return manejarEnvio(req, res)
    if (req.url === '/api/modo') return json(res, 200, { modo: MODO, destino_prueba: PRUEBA_TO })
    if (req.url === '/' || req.url.startsWith('/index')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end(HTML.replace('{{MODO}}', MODO).replace('{{DESTINO_PRUEBA}}', PRUEBA_TO))
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('no encontrado')
  } catch (e) {
    json(res, 500, { ok: false, error: 'error servidor: ' + e.message })
  }
})

server.listen(PORT, '0.0.0.0', () => console.log(`Solicitud de TAG en http://0.0.0.0:${PORT} — modo=${MODO}`))

// factura-navegador.mjs — ROBOT que llena la Factura Electrónica del portal
// GRATUITO del SII (ANA CLARA) y SE DETIENE EN EL BORRADOR. NO emite.
//
// SEGURIDAD (por diseño, no negociable):
//   • Solo llega hasta "Validar y visualizar" (el borrador validado con totales).
//   • NUNCA aprieta "Guardar Borrador", "Firmar" ni ningún botón de emisión.
//   • El emitir real es un paso aparte, humano/supervisado.
//
// Flujo (probado en vivo 2026-07-15): inyecta la sesión de Nico (cookies del
// backend) → selecciona la empresa → abre el form (mipeGenFacEx) → llena receptor
// (el SII autocompleta razón social/dirección/giro desde el RUT) → llena el
// detalle (y, para autos, marca "Descrip." y pega el detalle del CAV) → "Validar
// y visualizar" → captura de página completa del borrador. Devuelve la ruta PNG.
//
// Requiere el conector-navegador (8082) y el backend sii-web (8000) arriba.

import { writeFileSync } from 'node:fs'

const NAV = process.env.NAV_URL || 'http://127.0.0.1:8082'
const SII_API = process.env.SII_API_LOCAL || 'http://127.0.0.1:8000'

const OPCION_POR_TIPO = { 33: '33', 34: '34' } // 33=afecta, 34=exenta
const PORTAL_SEL = 'https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi'
const FORM_URL = (cod) => `https://www1.sii.cl/cgi-bin/Portal001/mipeGenFacEx.cgi?PTDC_CODIGO=${cod}`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function nav(path, body) {
  const r = await fetch(`${NAV}${path}`, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : {})
  const j = await r.json().catch(() => ({}))
  if (j && j.ok === false && j.error) throw new Error(`navegador ${path}: ${j.error}`)
  return j
}
const escribir = (selector, texto) => nav('/escribir', { selector, texto: String(texto ?? '') })
const click = (selector) => nav('/click', { selector })
const ir = (url) => nav('/ir', { url })

// Pide al backend las cookies de la sesión del emisor (Nico). Se usan para inyectarlas
// en el navegador y también para bajar el PDF oficial del DTE emitido.
async function cookiesEmisor(apiToken) {
  const r = await fetch(`${SII_API}/api/factura/sesion-cookies`, { headers: { 'X-API-Token': apiToken } })
  const j = await r.json()
  if (!j?.ok || !j.cookies) throw new Error('No pude obtener la sesión del emisor del SII: ' + (j?.detail || JSON.stringify(j).slice(0, 120)))
  return j
}

// Clave del certificado centralizado (la que va en #myPass al firmar). Fuente única:
// el .env del backend sii-web (dueño del certificado). El hub la pide por acá en vez
// de tener el secreto duplicado en su propio .env.
async function claveCertBackend(apiToken) {
  try {
    const r = await fetch(`${SII_API}/api/factura/cert-pass`, { headers: { 'X-API-Token': apiToken } })
    const j = await r.json().catch(() => ({}))
    return (j && j.ok && j.cert_pass) ? String(j.cert_pass) : ''
  } catch { return '' }
}
const cookieHeader = (ck) => Object.entries(ck).map(([k, v]) => `${k}=${v}`).join('; ')

// Trae la sesión del emisor del backend y la inyecta en el navegador.
async function inyectarSesion(apiToken) {
  const j = await cookiesEmisor(apiToken)
  await nav('/inyectar-cookies', { cookies: j.cookies, domain: '.sii.cl' })
  return j.rut
}

const dv = (rut) => String(rut || '').replace(/[.\s]/g, '').split('-')
const solo = (rut) => dv(rut)[0]

/**
 * Genera el BORRADOR de una factura en el SII y devuelve la captura.
 * @param borrador  el objeto que arma sii-web/emitir.py (emisor, tipo_dte, receptor, items[])
 * @param empresaRut  RUT de la empresa emisora en el selector del SII (ej "77271121-2")
 * @param apiToken  token del backend sii-web
 * @returns {ok, captura, borrador, nota}
 */
export async function generarBorrador({ borrador, empresaRut, apiToken }) {
  const cod = OPCION_POR_TIPO[borrador.tipo_dte]
  if (!cod) return { ok: false, error: `Tipo ${borrador.tipo_dte} no soportado por el robot (solo 33 afecta / 34 exenta).` }

  await inyectarSesion(apiToken)

  // 1) Seleccionar la empresa emisora
  await ir(PORTAL_SEL); await sleep(1500)
  await nav('/seleccionar', { selector: 'select[name=RUT_EMP]', valor: empresaRut })
  await click('button[type=submit]'); await sleep(2500)

  // 2) Abrir el formulario del tipo correcto
  await ir(FORM_URL(cod)); await sleep(3000)

  // 3) Receptor: basta RUT+DV, el SII autocompleta razón social/dirección/giro.
  const rec = borrador.receptor || {}
  const [cuerpo, digito] = dv(rec.rut)
  if (cuerpo) await escribir('[name=EFXP_RUT_RECEP]', cuerpo)
  if (digito) await escribir('[name=EFXP_DV_RECEP]', digito)
  await sleep(1500) // dejar que el SII autocomplete
  // Complementos por si el SII no los trae (no pisa lo que ya autocompletó si va vacío)
  if (rec.nombre) await escribir('[name=EFXP_RZN_SOC_RECEP]', rec.nombre).catch(() => {})
  if (rec.giro) await escribir('[name=EFXP_GIRO_RECEP]', rec.giro).catch(() => {})
  // CIUDAD es OBLIGATORIA para pasar la validación y llegar a la vista previa; el
  // SII no la autocompleta. Emisor: default configurable (ANA CLARA = Santiago).
  // Receptor: ciudad dada, o la comuna como fallback.
  await escribir('[name=EFXP_CIUDAD_ORIGEN]', borrador.emisor?.ciudad || 'SANTIAGO').catch(() => {})
  if (rec.comuna) await escribir('[name=EFXP_CMNA_RECEP]', rec.comuna).catch(() => {})
  await escribir('[name=EFXP_CIUDAD_RECEP]', rec.ciudad || rec.comuna || 'SANTIAGO').catch(() => {})
  // 🏠 DIRECCIÓN — AL FINAL Y FORZADA (bug real): si el SII ya conoce direcciones del
  // receptor (de borradores viejos), convierte el campo en un <select> con SOLO esas y
  // NO deja escribir una nueva → escribirla no hace nada y queda la vieja pegada.
  // `forzar-valor` inyecta la dirección como opción y la selecciona (equivale al input
  // de texto libre que el propio SII usa cuando no conoce direcciones). Va AL FINAL
  // porque el autocompletado del RUT reconstruye el campo y pisa lo escrito antes.
  if (rec.direccion) {
    await nav('/forzar-valor', {
      selector: '[name=EFXP_DIR_RECEP]', valor: rec.direccion,
      hidden: '[name=EFXP_DIR_RECEP_DEFUALT]',
    }).catch(() => {})
    // modDir() puede repoblar comuna/ciudad desde la dirección elegida → reafirmarlas.
    if (rec.comuna) await escribir('[name=EFXP_CMNA_RECEP]', rec.comuna).catch(() => {})
    await escribir('[name=EFXP_CIUDAD_RECEP]', rec.ciudad || rec.comuna || 'SANTIAGO').catch(() => {})
  }

  // 4) Detalle: una línea por ítem (la 01 ya existe; para más, botón AGREGA_DETALLE).
  const items = borrador.items || []
  for (let i = 0; i < items.length; i++) {
    const n = String(i + 1).padStart(2, '0')
    if (i > 0) { await click('[name=AGREGA_DETALLE]'); await sleep(1200) }
    const it = items[i]
    await escribir(`[name=EFXP_NMB_${n}]`, it.nombre)
    if (it.detalle) {
      await click(`[name=DESCRIP_${n}]`); await sleep(800) // abre el textarea de descripción (auto/CAV)
      await escribir(`[name=EFXP_DSC_ITEM_${n}]`, it.detalle).catch(() => {})
    }
    await escribir(`[name=EFXP_QTY_${n}]`, it.cantidad || 1)
    await escribir(`[name=EFXP_PRC_${n}]`, it.precio)
    await sleep(400)
  }

  // 5) "Validar y visualizar" → VISTA PREVIA (mipeDisplayPreView.cgi): el documento
  // tributario renderizado con los botones "Firmar" (emite) y "Corregir" (vuelve).
  // El robot LLEGA a la vista previa y SE DETIENE. NO aprieta "Firmar".
  await fetch(`${NAV}/ultimo-pdf?olvidar=1`).catch(() => {})   // no reusar un PDF viejo
  await click('[name=Button_Update]'); await sleep(8000)

  const est = await nav('/estado')
  const enVistaPrevia = String(est?.url || '').includes('mipeDisplayPreView')

  // 6) El SII genera la vista previa como un PDF REAL dentro de un iframe (POST a
  // mipePreView.cgi). El navegador lo descarga y lo capturamos: mandamos ESE PDF
  // (se ve completo y nítido), no una captura de pantalla. Si no hubo PDF, caemos
  // a la captura para no quedar sin nada.
  const pdf = await (await fetch(`${NAV}/ultimo-pdf`)).json().catch(() => null)
  if (enVistaPrevia && pdf?.ok && pdf.ruta) {
    return {
      ok: true, pdf: pdf.ruta, archivo: pdf.ruta, borrador, en_vista_previa: true,
      nota: 'Vista previa del DTE generada en el SII (PDF oficial). NO se emitió: el robot se detiene acá. Revisa el PDF y, si está OK, confirma para firmar.',
    }
  }
  const cap = await (await fetch(`${NAV}/captura?full=1`)).json()
  if (!cap?.png_base64) return { ok: false, error: 'No pude obtener el borrador (ni PDF ni captura).' }
  const ruta = `/tmp/nexus-borrador-sii-${Date.now()}.png`
  writeFileSync(ruta, Buffer.from(cap.png_base64, 'base64'))
  return {
    ok: true, captura: ruta, archivo: ruta, borrador, en_vista_previa: enVistaPrevia,
    nota: enVistaPrevia
      ? 'Vista previa generada (no pude tomar el PDF, va la captura).'
      : 'Quedó en el formulario (faltó validar algún dato). Revisa la imagen: puede faltar un campo del receptor.',
  }
}

// ⛔⛔ EMISIÓN REAL — IRREVERSIBLE. Consume folio y le llega al receptor. ⛔⛔
// Cadena COMPLETA validada en vivo el 2026-07-15 (factura exenta N° 243):
//   vista previa → "Firmar" (btnSign) → mipeGenXMLFirma.cgi (pide la clave del
//   CERTIFICADO CENTRALIZADO en #myPass) → #btnFirma (llamaFirma()) →
//   mipeSendXML.cgi = "DOCUMENTO ENVIADO EXITOSAMENTE" + N° de folio →
//   link "Ver Documento" = mipeDisplayPDF.cgi?DHDR_CODIGO=… = PDF OFICIAL
//   (con timbre electrónico y copia cedible).
// BLINDADA con freno doble: exige SII_EMISION_HABILITADA=1 Y la llave
// CONFIRMO_EMITIR==='SI_EMITIR_DE_VERDAD' (que el hub solo pasa tras la 2ª
// confirmación explícita del usuario). generarBorrador() NUNCA llama esto.
export async function firmarYEmitir(opts = {}) {
  const habilitado = process.env.SII_EMISION_HABILITADA === '1'
  if (!habilitado || opts.CONFIRMO_EMITIR !== 'SI_EMITIR_DE_VERDAD') {
    return { ok: false, bloqueado: true, motivo: 'Emisión REAL deshabilitada por seguridad (freno doble). No se emitió nada.' }
  }
  // Clave del certificado: opción explícita → env del hub → backend (fuente única).
  const clave = opts.claveCert || process.env.SII_CERT_PASS || await claveCertBackend(opts.apiToken)
  if (!clave) return { ok: false, error: 'Falta la clave del certificado centralizado (no está en SII_CERT_PASS del hub ni en el backend sii-web).' }

  // 1) Hay que estar en la VISTA PREVIA recién generada. Si no, el borrador expiró
  //    (el form se recarga y pierde la dirección forzada) → regenerar, NO firmar a ciegas.
  let est = await nav('/estado')
  if (!String(est?.url || '').includes('mipeDisplayPreView')) {
    return { ok: false, error: 'No estoy en la vista previa (el borrador expiró). Hay que regenerar el borrador y firmar enseguida.' }
  }

  // 2) "Firmar" → pantalla de firma
  await click('[name=btnSign]'); await sleep(8000)
  est = await nav('/estado')
  if (!String(est?.url || '').includes('mipeGenXMLFirma')) {
    return { ok: false, error: 'No llegué a la pantalla de firma del SII. No se emitió.' }
  }

  // 3) Clave del certificado centralizado + botón Firmar (ojo: #btnFirma NO tiene name)
  await escribir('#myPass', clave)
  await sleep(600)
  await click('#btnFirma')
  await sleep(20000)   // firmar + enviar al SII demora; el SII avisa que puede tardar

  // 4) Confirmar que el SII lo recibió
  est = await nav('/estado')
  const texto = (await (await fetch(`${NAV}/leer`)).json().catch(() => ({})))?.texto || ''
  const enviado = String(est?.url || '').includes('mipeSendXML') && /ENVIADO\s+EXITOSAMENTE/i.test(texto)
  if (!enviado) {
    return { ok: false, error: 'El SII no confirmó el envío (puede ser la clave del certificado o un rechazo). NO des por emitida la factura.', detalle: texto.slice(0, 300) }
  }
  const folio = (texto.match(/N[°º]\s*(\d+)/) || [])[1] || null

  // 5) PDF OFICIAL del DTE emitido (link "Ver Documento"). Se baja con la sesión del
  //    emisor porque abre en pestaña nueva y no siempre lo pilla el interceptor.
  let pdf = null
  try {
    const h = await (await fetch(`${NAV}/leer?html=1`)).json()
    const m = String(h?.html || '').match(/href="([^"]*mipeDisplayPDF\.cgi[^"]*)"/i)
    if (m) {
      const url = m[1].startsWith('http') ? m[1] : 'https://www1.sii.cl' + m[1]
      const ck = await cookiesEmisor(opts.apiToken)
      const r = await fetch(url, { headers: { Cookie: cookieHeader(ck.cookies) } })
      const buf = Buffer.from(await r.arrayBuffer())
      if (buf.subarray(0, 4).toString('latin1') === '%PDF') {
        pdf = `/tmp/nexus-factura-emitida-${folio || Date.now()}.pdf`
        writeFileSync(pdf, buf)
      }
    }
  } catch { /* si falla el PDF, la factura igual quedó emitida */ }

  return {
    ok: true, emitida: true, folio, pdf, archivo: pdf,
    nota: `Factura N° ${folio || '(sin folio leído)'} EMITIDA en el SII${pdf ? ' — PDF oficial descargado.' : ' (no pude bajar el PDF, pero está emitida).'}`,
  }
}

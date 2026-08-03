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

// Espera (sondeando) hasta que la URL del navegador contenga `frag`. Más robusto que
// un sleep fijo: las pantallas del SII (firma, envío) tardan distinto cada vez.
async function esperarUrl(frag, timeoutMs = 10000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    const est = await nav('/estado').catch(() => ({}))
    if (String(est?.url || '').includes(frag)) return true
    await sleep(800)
  }
  return false
}

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

// ── EDICIÓN DE CAMPOS ─────────────────────────────────────────────────────────
// El usuario puede corregir CUALQUIER dato del documento antes de firmar. Para que
// una corrección no se pierda en silencio (el bug que había: se decía "listo,
// corregido" y el borrador salía igual), acá cada campo se escribe y se VERIFICA
// contra lo que quedó en el formulario. Lo que no se pudo aplicar se devuelve en
// `no_aplicados` para decírselo al usuario en vez de dar por hecho el cambio.
export async function campos() { try { return await nav('/campos') } catch { return {} } }

export async function valorDe(name, c) {
  const data = c || await campos()
  // Un mismo campo puede ser <input> o <select> según el estado del form (la
  // dirección del receptor, por ejemplo, muta a select si el SII ya conoce otras).
  const f = (data.inputs || []).find((i) => i.name === name)
        || (data.selects || []).find((s) => s.name === name)
  return f ? String(f.valor ?? '') : null
}

// Escribe y comprueba. Devuelve true si el campo quedó con el valor pedido.
// `intentos` > 1 para los campos que el JS del SII repuebla solo después de escribir
// (comuna y ciudad: modDir() los reescribe desde la dirección elegida, de forma
// asíncrona, y pisaba lo que acabábamos de poner → salía "Indepen" por "Independencia").
export async function escribirVerificado(name, valor, intentos = 1) {
  const txt = String(valor ?? '').trim()
  if (!txt) return true
  for (let i = 0; i < Math.max(1, intentos); i++) {
    if (i > 0) await sleep(700)                        // dejar que el SII termine de repoblar
    try { await escribir(`[name=${name}]`, txt) } catch { /* sigue: igual verificamos */ }
    const quedo = await valorDe(name)
    if (quedo == null) return false                    // el campo no existe en el form
    if (quedo.trim().toLowerCase() === txt.trim().toLowerCase()) return true
  }
  return false
}

// La fecha del SII viene pre-llenada; respetamos el formato que ya usa el campo
// en vez de imponer uno (escribir "2026-08-03" en un campo DD-MM-AAAA corrompe el DTE).
export function fechaComoElCampo(iso, muestra) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''))
  if (!m) return null
  const [, Y, M, D] = m
  const s = String(muestra || '')
  const sep = (s.match(/[-/.]/) || ['-'])[0]
  if (/^\d{2}[-/.]\d{2}[-/.]\d{4}$/.test(s)) return `${D}${sep}${M}${sep}${Y}`
  return `${Y}${sep}${M}${sep}${D}`   // el form del SII usa AAAA-MM-DD
}

// Forma de pago: es un <select> cuyo `name` no está documentado, así que se ubica
// por sus opciones (Contado / Crédito) en vez de adivinar un selector.
export async function ponerFormaPago(formaPago) {
  const fp = String(formaPago || '').trim()
  if (!fp) return true
  const buscada = /^cr/i.test(fp) ? /cr[eé]dito/i : /contado/i
  const c = await campos()
  const sel = (c.selects || []).find((s) => {
    const ops = (s.opciones || []).map((o) => `${o.t || ''} ${o.v || ''}`)
    return ops.some((o) => /contado/i.test(o)) && ops.some((o) => /cr[eé]dito/i.test(o))
  })
  if (!sel?.name) return false
  const op = (sel.opciones || []).find((o) => buscada.test(o.t || '') || buscada.test(o.v || ''))
  if (!op) return false
  try { await nav('/seleccionar', { selector: `[name=${sel.name}]`, valor: op.v }); return true }
  catch { return false }
}

// Lee el MOTIVO REAL por el que el formulario no pasó a la vista previa. El SII escribe
// el error en la propia página ("Debe ingresar…", "El campo … es obligatorio"). Antes se
// devolvía un texto genérico ("suele faltar un dato del receptor") y el agente terminaba
// inventando explicaciones —le pidió a Joaquín un "contacto" que nunca fue el problema.
async function motivoDelRechazo() {
  try {
    const r = await (await fetch(`${NAV}/leer`)).json()
    const txt = String(r?.texto || '')
    const lineas = txt.split('\n').map((l) => l.trim()).filter(Boolean)
    const pistas = lineas.filter((l) =>
      /debe (ingresar|indicar|seleccionar)|es obligatorio|obligatoria|falta|no v[aá]lid|incorrect|err[oó]r/i.test(l) && l.length < 200)
    if (pistas.length) return [...new Set(pistas)].slice(0, 4).join(' · ')
    return ''
  } catch { return '' }
}

// Espera a que el SII deje listo el PDF de la vista previa (lo baja en un iframe, tarda
// distinto cada vez). Sondear es mucho más fiable que un sleep fijo.
async function esperarPdf(timeoutMs = 15000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    const pdf = await (await fetch(`${NAV}/ultimo-pdf`)).json().catch(() => null)
    if (pdf?.ok && pdf.ruta) return pdf
    await sleep(900)
  }
  return null
}

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

  // Campos que el usuario pidió cambiar y el formulario NO aceptó. Se reportan
  // hacia arriba: es preferible decirle "esto no lo pude cambiar" a que crea que
  // quedó corregido y firme un documento con el dato viejo.
  const noAplicados = []

  // 2.b) FECHA DE EMISIÓN (editable). Solo se toca si la pedida difiere de la que
  // trae el formulario, y se escribe en el mismo formato que ya usa el campo.
  if (borrador.fecha) {
    const actual = await valorDe('EFXP_FCH_EMIS')
    const pedida = fechaComoElCampo(borrador.fecha, actual)
    if (pedida && actual != null && pedida !== actual.trim()) {
      if (!await escribirVerificado('EFXP_FCH_EMIS', pedida)) noAplicados.push(`fecha de emisión (${borrador.fecha})`)
    }
  }

  // 3) Receptor: basta RUT+DV, el SII autocompleta razón social/dirección/giro.
  const rec = borrador.receptor || {}
  const [cuerpo, digito] = dv(rec.rut)
  if (cuerpo) await escribir('[name=EFXP_RUT_RECEP]', cuerpo)
  if (digito) await escribir('[name=EFXP_DV_RECEP]', digito)
  await sleep(1500) // dejar que el SII autocomplete
  // Complementos por si el SII no los trae (no pisa lo que ya autocompletó si va vacío)
  if (rec.nombre) await escribir('[name=EFXP_RZN_SOC_RECEP]', rec.nombre).catch(() => {})
  if (rec.giro) await escribir('[name=EFXP_GIRO_RECEP]', rec.giro).catch(() => {})
  if (rec.contacto) { if (!await escribirVerificado('EFXP_CONTACTO', rec.contacto)) noAplicados.push(`contacto (${rec.contacto})`) }
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
    // modDir() repuebla comuna/ciudad desde la dirección elegida, y lo hace DESPUÉS de
    // que escribimos → pisaba el valor bueno y la comuna salía a medias ("Indepen" por
    // "Independencia"). Por eso se reafirman con reintentos hasta que queden.
    if (rec.comuna) {
      if (!await escribirVerificado('EFXP_CMNA_RECEP', rec.comuna, 3)) {
        const cmQuedo = (await valorDe('EFXP_CMNA_RECEP') || '').trim()
        noAplicados.push(`comuna (pedida "${rec.comuna}"${cmQuedo ? `, quedó "${cmQuedo}"` : ''})`)
      }
    }
    const ciudadRec = rec.ciudad || rec.comuna || 'SANTIAGO'
    if (!await escribirVerificado('EFXP_CIUDAD_RECEP', ciudadRec, 3)) {
      const cdQuedo = (await valorDe('EFXP_CIUDAD_RECEP') || '').trim()
      noAplicados.push(`ciudad (pedida "${ciudadRec}"${cdQuedo ? `, quedó "${cdQuedo}"` : ''})`)
    }
    // La dirección es el campo que más pelea (se convierte en select y se repuebla sola).
    // Si quedó otra, hay que AVISARLO, no asumir el cambio.
    const dirQuedo = (await valorDe('EFXP_DIR_RECEP') || '').trim()
    if (dirQuedo && dirQuedo.toLowerCase() !== String(rec.direccion).trim().toLowerCase()) {
      noAplicados.push(`dirección (pedida "${rec.direccion}", quedó "${dirQuedo}")`)
    }
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
    // Unidad y % de descuento: columnas del detalle, editables como el resto.
    if (it.unidad) { if (!await escribirVerificado(`EFXP_UNMD_${n}`, it.unidad)) noAplicados.push(`unidad del ítem ${i + 1} (${it.unidad})`) }
    if (it.descuento) { if (!await escribirVerificado(`EFXP_PCTD_${n}`, it.descuento)) noAplicados.push(`descuento del ítem ${i + 1} (${it.descuento}%)`) }
    await sleep(400)
  }

  // 4.b) Forma de pago (contado / crédito) y observaciones.
  if (borrador.forma_pago) {
    const puesta = await ponerFormaPago(borrador.forma_pago)
    // "Contado" es lo que el SII trae por defecto: si no se encontró el select no hay
    // nada que avisar. Solo se reporta cuando se pidió algo distinto y no se pudo poner.
    if (!puesta && !/^contado$/i.test(String(borrador.forma_pago))) noAplicados.push(`forma de pago (${borrador.forma_pago})`)
  }
  // El formulario gratuito del SII no tiene campo de glosa/observaciones libre: si el
  // usuario escribió una, se avisa en vez de tragársela (puede ir en la descripción del ítem).
  if (String(borrador.observaciones || '').trim()) {
    noAplicados.push('observaciones (el formulario del SII no tiene glosa libre; van en la descripción del ítem)')
  }

  // 5) "Validar y visualizar" → VISTA PREVIA (mipeDisplayPreView.cgi): el documento
  // tributario renderizado con los botones "Firmar" (emite) y "Corregir" (vuelve).
  // El robot LLEGA a la vista previa y SE DETIENE. NO aprieta "Firmar".
  await fetch(`${NAV}/ultimo-pdf?olvidar=1`).catch(() => {})   // no reusar un PDF viejo
  await click('[name=Button_Update]')
  // ⏱️ ESPERAR POR CONDICIÓN, NO POR RELOJ. Antes había un `sleep(8000)` fijo: cuando el
  // SII se demoraba más, el robot concluía "no llegó a la vista previa" y la emisión se
  // abortaba con un documento que en realidad estaba perfecto (le pasó a Joaquín el
  // 03-ago dos veces seguidas). Ahora se sondea hasta 40s la llegada a la vista previa.
  const enVistaPrevia = await esperarUrl('mipeDisplayPreView', 40000)

  // 6) El SII genera la vista previa como un PDF REAL dentro de un iframe (POST a
  // mipePreView.cgi). El navegador lo descarga y lo capturamos: mandamos ESE PDF
  // (se ve completo y nítido), no una captura de pantalla. Si no hubo PDF, caemos
  // a la captura para no quedar sin nada.
  const pdf = enVistaPrevia ? await esperarPdf(15000) : null
  if (enVistaPrevia && pdf?.ok && pdf.ruta) {
    return {
      ok: true, pdf: pdf.ruta, archivo: pdf.ruta, borrador, en_vista_previa: true,
      no_aplicados: noAplicados,
      nota: 'Vista previa del DTE generada en el SII (PDF oficial). NO se emitió: el robot se detiene acá. Revisa el PDF y, si está OK, confirma para firmar.',
    }
  }
  // Sin vista previa = el SII rechazó el formulario. Se lee el motivo REAL que escribió
  // el SII en la página, en vez de adivinar qué campo falta.
  const motivo = enVistaPrevia ? '' : await motivoDelRechazo()
  const cap = await (await fetch(`${NAV}/captura?full=1`)).json()
  if (!cap?.png_base64) return { ok: false, error: 'No pude obtener el borrador (ni PDF ni captura).' + (motivo ? ` El SII dice: ${motivo}` : '') }
  const ruta = `/tmp/nexus-borrador-sii-${Date.now()}.png`
  writeFileSync(ruta, Buffer.from(cap.png_base64, 'base64'))
  return {
    ok: true, captura: ruta, archivo: ruta, borrador, en_vista_previa: enVistaPrevia,
    no_aplicados: noAplicados, motivo_sii: motivo || undefined,
    nota: enVistaPrevia
      ? 'Vista previa generada (no pude tomar el PDF, va la captura).'
      : (motivo
        ? `El SII NO aceptó el formulario. Dice textualmente: "${motivo}". Repítele ESO al usuario, no inventes otra causa.`
        : 'El SII no llegó a la vista previa y no dejó un mensaje de error legible. Muéstrale la imagen al usuario y dile que revise qué campo rechazó; NO inventes cuál es.'),
  }
}

// ── FACTURA DE COMPRA (DTE 46) — BORRADOR. Para cuando MallorcAutos/Ana Clara emite el
//    documento (el que compra emite, no el proveedor). MISMA mecánica que generarBorrador:
//    llega a la VISTA PREVIA y SE DETIENE. NUNCA firma. El "receptor" del formulario es el
//    PROVEEDOR/VENDEDOR. Dos cambios de sujeto (mapeados en vivo el 2026-07-30 para ANA CLARA):
//      • 'usados'   → radio camsuj 6298, producto "Productos Usados"  ⇒ SIN IVA (auto usado).
//      • 'generico' → radio camsuj 62,   producto "Retención total genérica" ⇒ retención 19%
//                     (gasto/servicio a proveedor que no factura).
const CAMBIO_SUJETO = {
  usados: { camsuj: '6298', producto: 'Productos Usados' },
  generico: { camsuj: '62', producto: 'Retención total genérica' },
}
const LAUNCH_COMPRA = 'https://www1.sii.cl/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=46&TIPO=4'

export async function generarBorradorCompra({ vendedor = {}, item = {}, emisor = {}, empresaRut, apiToken, cambioSujeto = 'usados' }) {
  const cs = CAMBIO_SUJETO[cambioSujeto] || CAMBIO_SUJETO.usados
  const formCompra = `https://www1.sii.cl/cgi-bin/Portal001/mipeGenFacEx.cgi?AGENTE_RETENEDOR=${cs.camsuj}&PTDC_CODIGO=46`
  await inyectarSesion(apiToken)
  // 1) empresa emisora (Ana Clara)
  await ir(PORTAL_SEL); await sleep(1500)
  await nav('/seleccionar', { selector: 'select[name=RUT_EMP]', valor: empresaRut })
  await click('button[type=submit]'); await sleep(2500)
  // 2) wizard de cambio de sujeto → elegir el radio correcto → "Enviar"
  await ir(LAUNCH_COMPRA); await sleep(3000)
  await click(`input[name=camsuj][value="${cs.camsuj}"]`); await sleep(600)
  // "Enviar" lo bloquea el navegador por palabra sensible → aprobado:true (NO emite, solo avanza el wizard)
  await nav('/click', { selector: 'input[name=BOTON][value="Enviar"]', aprobado: true }); await sleep(5000)
  let est = await nav('/estado')
  if (!String(est?.url || '').includes('mipeGenFacEx')) { await ir(formCompra); await sleep(3000) }
  // 3) RECEPTOR = VENDEDOR (particular). El SII autocompleta razón social/dir/giro desde el RUT.
  const [cuerpo, digito] = dv(vendedor.rut)
  if (cuerpo) await escribir('[name=EFXP_RUT_RECEP]', cuerpo)
  if (digito) await escribir('[name=EFXP_DV_RECEP]', digito)
  await sleep(1500)
  if (vendedor.nombre) await escribir('[name=EFXP_RZN_SOC_RECEP]', vendedor.nombre).catch(() => {})
  await escribir('[name=EFXP_GIRO_RECEP]', vendedor.giro || 'PARTICULAR').catch(() => {})
  await escribir('[name=EFXP_CIUDAD_ORIGEN]', emisor.ciudad || 'SANTIAGO').catch(() => {})
  if (vendedor.comuna) await escribir('[name=EFXP_CMNA_RECEP]', vendedor.comuna).catch(() => {})
  await escribir('[name=EFXP_CIUDAD_RECEP]', vendedor.ciudad || vendedor.comuna || 'SANTIAGO').catch(() => {})
  if (vendedor.direccion) {
    await nav('/forzar-valor', { selector: '[name=EFXP_DIR_RECEP]', valor: vendedor.direccion, hidden: '[name=EFXP_DIR_RECEP_DEFUALT]' }).catch(() => {})
    if (vendedor.comuna) await escribir('[name=EFXP_CMNA_RECEP]', vendedor.comuna).catch(() => {})
    await escribir('[name=EFXP_CIUDAD_RECEP]', vendedor.ciudad || vendedor.comuna || 'SANTIAGO').catch(() => {})
  }
  // 4) ÍTEM: producto según el cambio de sujeto (select), descripción, cantidad 1, precio
  await nav('/seleccionar', { selector: '[name=EFXP_NMB_01]', valor: cs.producto }).catch(() => {})
  if (item.detalle) {
    await click('[name=DESCRIP_01]').catch(() => {}); await sleep(800)
    await escribir('[name=EFXP_DSC_ITEM_01]', item.detalle).catch(() => {})
  }
  await escribir('[name=EFXP_QTY_01]', item.cantidad || 1)
  await escribir('[name=EFXP_PRC_01]', item.precio)
  await sleep(400)
  // 5) "Validar y visualizar" → VISTA PREVIA. SE DETIENE. NO firma.
  await fetch(`${NAV}/ultimo-pdf?olvidar=1`).catch(() => {})
  await click('[name=Button_Update]')
  // Espera (sondeando) a que aparezca la vista previa — más robusto que un sleep fijo
  // (a veces el SII demora y antes caía a captura del FORMULARIO como si fuera el borrador).
  let enVistaPrevia = await esperarUrl('mipeDisplayPreView', 40000)
  if (!enVistaPrevia) { await click('[name=Button_Update]').catch(() => {}); enVistaPrevia = await esperarUrl('mipeDisplayPreView', 20000) }
  est = await nav('/estado')
  const pdf = enVistaPrevia ? await esperarPdf(15000) : null
  if (enVistaPrevia && pdf?.ok && pdf.ruta) {
    return {
      ok: true, pdf: pdf.ruta, archivo: pdf.ruta, en_vista_previa: true, tipo_dte: 46,
      cambio_sujeto: cambioSujeto,
      nota: `Vista previa de la FACTURA DE COMPRA (DTE 46) generada en el SII (producto "${cs.producto}", ${cambioSujeto === 'generico' ? 'con retención 19%' : 'SIN IVA'}). NO se emitió: el robot se detiene en la vista previa.`,
    }
  }
  const cap = await (await fetch(`${NAV}/captura?full=1`)).json().catch(() => ({}))
  const ruta = cap?.png_base64 ? `/tmp/nexus-borrador-compra-${Date.now()}.png` : null
  if (ruta) writeFileSync(ruta, Buffer.from(cap.png_base64, 'base64'))
  if (enVistaPrevia) return { ok: true, captura: ruta, archivo: ruta, en_vista_previa: true, tipo_dte: 46, cambio_sujeto: cambioSujeto, nota: 'Vista previa generada (va la captura, no pude tomar el PDF).' }
  // NO llegó a la vista previa: el SII no validó. Se lee el motivo REAL de la página en
  // vez de adivinarlo. NO lo hacemos pasar por borrador — error para que el asistente lo diga.
  const motivoC = await motivoDelRechazo()
  return {
    ok: false, en_vista_previa: false, captura: ruta, tipo_dte: 46, motivo_sii: motivoC || undefined,
    error: motivoC
      ? `El SII no validó el borrador de compra. Dice: "${motivoC}". NO se generó la vista previa.`
      : 'El SII no validó el borrador de compra y no dejó un mensaje legible. NO se generó la vista previa y NO sé qué campo rechazó: no inventes una causa.',
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
// Firma común: ASUME que el navegador ya está en la vista previa (mipeDisplayPreView).
// Aprieta "Firmar", mete la clave del certificado y confirma el envío. Devuelve el folio + PDF.
// La usan tanto la factura de VENTA como la de COMPRA (la pantalla de firma del portal es la misma).
async function firmarEnVistaPrevia({ apiToken, clave }) {
  let est = await nav('/estado')
  if (!String(est?.url || '').includes('mipeDisplayPreView')) {
    return { ok: false, error: 'No estoy en la vista previa del SII. No se firmó (hay que regenerar el borrador y firmar enseguida).' }
  }
  // "Firmar" → pantalla de firma (mipeGenXMLFirma). A veces demora; sondeo y reintento.
  await click('[name=btnSign]')
  let enFirma = await esperarUrl('mipeGenXMLFirma', 12000)
  if (!enFirma) { await click('[name=btnSign]').catch(() => {}); enFirma = await esperarUrl('mipeGenXMLFirma', 8000) }
  // Nunca se llegó a la pantalla de firma ⇒ NO se firmó nada: reintentar es seguro.
  if (!enFirma) return { ok: false, reintentable: true, error: 'No llegué a la pantalla de firma del SII (la vista previa pudo expirar). No se emitió nada, se puede reintentar.' }
  // Clave del certificado centralizado + botón Firmar (#btnFirma NO tiene name).
  await escribir('#myPass', clave)
  await sleep(600)
  await click('#btnFirma')
  // Confirmar recepción del SII: sondeo hasta 45s por "DOCUMENTO ENVIADO EXITOSAMENTE".
  let texto = '', enviado = false
  const t0 = Date.now()
  while (Date.now() - t0 < 45000) {
    await sleep(3000)
    est = await nav('/estado').catch(() => ({}))
    texto = (await (await fetch(`${NAV}/leer`)).json().catch(() => ({})))?.texto || ''
    if (String(est?.url || '').includes('mipeSendXML') && /ENVIADO\s+EXITOSAMENTE/i.test(texto)) { enviado = true; break }
  }
  if (!enviado) {
    // ⚠️ ZONA GRIS: ya se apretó Firmar. Si la página quedó en la pantalla de envío (o el
    // texto habla de folio/envío), el DTE PUDO haber salido. Reintentar acá emitiría un
    // SEGUNDO folio al mismo cliente — el peor error posible. Se marca como INDETERMINADO
    // y se prohíbe el reintento automático: primero hay que mirar el SII.
    const urlFin = String(est?.url || '')
    const indeterminado = urlFin.includes('mipeSendXML') || /ENVIADO|EXITOSAMENTE|folio/i.test(texto)
    if (indeterminado) return {
      ok: false, indeterminado: true, reintentable: false,
      error: '⚠️ No pude confirmar el resultado de la firma y ES POSIBLE QUE LA FACTURA SÍ SE HAYA EMITIDO. ⛔ NO reintentar: primero hay que revisar en el SII si ya salió el folio, o se emite un documento duplicado.',
      detalle: texto.slice(0, 300),
    }
    return { ok: false, reintentable: true, error: 'El SII no confirmó el envío (puede ser la clave del certificado o un rechazo). NO des por emitida la factura.', detalle: texto.slice(0, 300) }
  }
  const folio = (texto.match(/N[°º]\s*(\d+)/) || [])[1] || null
  // PDF OFICIAL del DTE emitido (link "Ver Documento").
  let pdf = null
  try {
    const h = await (await fetch(`${NAV}/leer?html=1`)).json()
    const m = String(h?.html || '').match(/href="([^"]*mipeDisplayPDF\.cgi[^"]*)"/i)
    if (m) {
      const url = m[1].startsWith('http') ? m[1] : 'https://www1.sii.cl' + m[1]
      const ck = await cookiesEmisor(apiToken)
      const r = await fetch(url, { headers: { Cookie: cookieHeader(ck.cookies) } })
      const buf = Buffer.from(await r.arrayBuffer())
      if (buf.subarray(0, 4).toString('latin1') === '%PDF') { pdf = `/tmp/nexus-factura-emitida-${folio || Date.now()}.pdf`; writeFileSync(pdf, buf) }
    }
  } catch { /* si falla el PDF, igual quedó emitida */ }
  return { ok: true, emitida: true, folio, pdf, archivo: pdf, nota: `Documento N° ${folio || '(sin folio leído)'} EMITIDO en el SII${pdf ? ' — PDF oficial descargado.' : ' (no pude bajar el PDF, pero está emitido).'}` }
}

export async function firmarYEmitir(opts = {}) {
  const habilitado = process.env.SII_EMISION_HABILITADA === '1'
  if (!habilitado || opts.CONFIRMO_EMITIR !== 'SI_EMITIR_DE_VERDAD') {
    return { ok: false, bloqueado: true, motivo: 'Emisión REAL deshabilitada por seguridad (freno doble). No se emitió nada.' }
  }
  const clave = opts.claveCert || process.env.SII_CERT_PASS || await claveCertBackend(opts.apiToken)
  if (!clave) return { ok: false, error: 'Falta la clave del certificado centralizado (no está en SII_CERT_PASS del hub ni en el backend sii-web).' }
  // VISTA PREVIA FRESCA (idempotente, NO consume folio) y firmar enseguida.
  if (opts.borrador && opts.empresaRut) {
    const g = await generarBorrador({ borrador: opts.borrador, empresaRut: opts.empresaRut, apiToken: opts.apiToken })
    if (!g.ok) return { ok: false, error: 'No pude preparar el borrador antes de firmar: ' + (g.error || ''), detalle: g.nota }
    if (!g.en_vista_previa) {
      // ⚠️ NO adivinar la causa. Si el SII dejó un mensaje, ese es el error; si no, se
      // dice que no se sabe. El texto viejo ("suele faltar un dato del receptor") hizo
      // que el agente le pidiera a Joaquín un "contacto" que jamás fue el problema.
      return {
        ok: false, motivo_sii: g.motivo_sii,
        error: g.motivo_sii
          ? `El SII rechazó el formulario al validar. Dice: "${g.motivo_sii}". NO se firmó.`
          : 'El SII no llegó a la vista previa al validar el formulario y no dejó un mensaje legible. NO se firmó y NO sé qué campo rechazó: no inventes una causa, muéstrale el borrador al usuario para que lo revise.',
        detalle: g.nota,
      }
    }
  }
  return firmarEnVistaPrevia({ apiToken: opts.apiToken, clave })
}

// ⛔⛔ EMISIÓN REAL de la FACTURA DE COMPRA (DTE 46) — IRREVERSIBLE. Consume folio. ⛔⛔
// Mismo freno doble que la venta (SII_EMISION_HABILITADA=1 + CONFIRMO_EMITIR). Regenera la
// vista previa de COMPRA (idempotente, NO consume folio) y firma enseguida. generarBorradorCompra() NUNCA llama esto.
export async function firmarYEmitirCompra(opts = {}) {
  const habilitado = process.env.SII_EMISION_HABILITADA === '1'
  if (!habilitado || opts.CONFIRMO_EMITIR !== 'SI_EMITIR_DE_VERDAD') {
    return { ok: false, bloqueado: true, motivo: 'Emisión REAL de la factura de compra deshabilitada por seguridad (freno doble). No se emitió nada.' }
  }
  const clave = opts.claveCert || process.env.SII_CERT_PASS || await claveCertBackend(opts.apiToken)
  if (!clave) return { ok: false, error: 'Falta la clave del certificado centralizado (no está en SII_CERT_PASS ni en el backend sii-web).' }
  const g = await generarBorradorCompra({ vendedor: opts.vendedor, item: opts.item, emisor: opts.emisor, empresaRut: opts.empresaRut, apiToken: opts.apiToken, cambioSujeto: opts.cambioSujeto })
  if (!g.ok) return { ok: false, error: 'No pude preparar el borrador de compra antes de firmar: ' + (g.error || ''), detalle: g.nota }
  if (!g.en_vista_previa) return {
    ok: false, motivo_sii: g.motivo_sii,
    error: g.motivo_sii
      ? `El SII rechazó el formulario de la factura de compra. Dice: "${g.motivo_sii}". NO se firmó.`
      : 'El SII no llegó a la vista previa de la factura de compra y no dejó un mensaje legible. NO se firmó y NO sé qué campo rechazó: no inventes una causa.',
    detalle: g.nota,
  }
  return firmarEnVistaPrevia({ apiToken: opts.apiToken, clave })
}

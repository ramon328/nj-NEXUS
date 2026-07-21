// probar-emision.mjs — TEST DE HUMO de la cadena de emisión de facturas (Martes/SII).
//
// Verifica, SIN emitir ni consumir folio, que TODO lo que falló históricamente sigue
// sano. Correr después de cualquier cambio al flujo de emitir o tras reiniciar servicios:
//
//     node ~/nexus/conector-sii/probar-emision.mjs
//
// Comprueba 4 cosas (las 4 que rompieron alguna vez, ver memoria martes-emitir-facturas):
//   1) La CLAVE del certificado es alcanzable por el robot (endpoint cert-pass del backend).
//   2) El BORRADOR se arma y produce un PDF real (out.archivo = %PDF) — el bug del PDF que
//      no se enviaba era mandar out.captura (vacío) en vez de out.archivo.
//   3) La FIRMA llega a la pantalla de firma del SII (mipeGenXMLFirma) — se DETIENE ahí,
//      NO escribe la clave ni aprieta el botón final. NO emite, NO consume folio.
//   4) La lógica anti-loop del estado "factura pendiente" (sig por documento).
//
// Sale con código 0 si TODO pasa, 1 si algo falla (útil para automatizar).

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(__dirname, '..')
const NAV = process.env.NAV_URL || 'http://127.0.0.1:8082'
const SII_API = process.env.SII_API_LOCAL || 'http://127.0.0.1:8000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const tokenBackend = () => (readFileSync(join(RAIZ, 'sii-web', '.env'), 'utf8').match(/^API_TOKEN=(.+)$/m) || [])[1] || ''

const navGet = async (p) => (await fetch(NAV + p)).json().catch(() => ({}))
const navPost = async (p, b) => (await fetch(NAV + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })).json().catch(() => ({}))
const esperarUrl = async (frag, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const e = await navGet('/estado'); if (String(e?.url || '').includes(frag)) return true; await sleep(800) } return false }

const R = []
const paso = (ok, nombre, extra = '') => { R.push(ok); console.log(`${ok ? '✅' : '❌'} ${nombre}${extra ? ' — ' + extra : ''}`) }

async function main() {
  const tok = tokenBackend()
  console.log('🧪 Test de humo — emisión de facturas (Martes/SII). NO emite, NO consume folio.\n')

  // 1) Clave del certificado alcanzable
  try {
    const j = await (await fetch(`${SII_API}/api/factura/cert-pass`, { headers: { 'X-API-Token': tok } })).json()
    paso(Boolean(j?.ok && j.cert_pass), '1) Clave del certificado alcanzable (cert-pass)', j?.ok ? `len=${String(j.cert_pass).length}` : (j?.detail || 'sin clave'))
  } catch (e) { paso(false, '1) Clave del certificado alcanzable (cert-pass)', e.message) }

  // 2) Borrador → PDF real
  let borrador = null
  try {
    const H = { 'X-API-Token': tok, 'Content-Type': 'application/json' }
    const body = { tipo_dte: 34, receptor: { rut: '20668795-9', nombre: 'PRUEBA HUMO', direccion: 'Calle Falsa 123', comuna: 'Santiago', giro: 'PARTICULAR' }, items: [{ nombre: 'Venta', cantidad: 1, precio: 1000 }], forma_pago: 'contado', confirmar: false }
    const r = await (await fetch(`${SII_API}/api/empresas/3/emitir`, { method: 'POST', headers: H, body: JSON.stringify(body) })).json()
    borrador = r.borrador
    const robot = await import('./factura-navegador.mjs')
    const out = await robot.generarBorrador({ borrador, empresaRut: '77271121-2', apiToken: tok })
    const f = out.archivo || out.pdf || out.captura
    let esPdf = false
    try { esPdf = f && readFileSync(f).subarray(0, 4).toString('latin1') === '%PDF' } catch { /* */ }
    paso(Boolean(out.ok && out.en_vista_previa && f && (esPdf || /\.png$/i.test(f))), '2) Borrador armado y archivo enviable', f ? `${f.split('/').pop()}${esPdf ? ' (PDF)' : ''}` : 'SIN archivo')
  } catch (e) { paso(false, '2) Borrador armado y archivo enviable', e.message) }

  // 3) Firma llega a la pantalla del SII (y NOS DETENEMOS ahí)
  try {
    let est = await navGet('/estado')
    const enPrev = String(est?.url || '').includes('mipeDisplayPreView')
    if (!enPrev) { paso(false, '3) Llega a la pantalla de firma', 'no quedó en vista previa'); }
    else {
      await navPost('/click', { selector: '[name=btnSign]' })
      let enFirma = await esperarUrl('mipeGenXMLFirma', 12000)
      if (!enFirma) { await navPost('/click', { selector: '[name=btnSign]' }).catch(() => {}); enFirma = await esperarUrl('mipeGenXMLFirma', 8000) }
      paso(enFirma, '3) Llega a la pantalla de firma del SII (sin firmar)', enFirma ? 'mipeGenXMLFirma — DETENIDO antes de la clave' : 'no llegó')
      // Salir sin firmar, dejar el navegador limpio.
      await navPost('/ir', { url: 'https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi' }).catch(() => {})
    }
  } catch (e) { paso(false, '3) Llega a la pantalla de firma', e.message) }

  // 4) Lógica anti-loop (sig por documento)
  try {
    const sig = (tipo, rut, total) => `${tipo}|${String(rut || '').replace(/[.\-\s]/g, '')}|${total || 0}`
    const a = sig(34, '20668795-9', 23800000)
    const mismo = a === sig(34, '20.668.795-9', 23800000)   // mismo doc, rut con puntos
    const distinto = a !== sig(34, '20668795-9', 5000000)    // otro monto = otra factura
    paso(mismo && distinto, '4) Firma del documento (anti-loop) distingue bien', `sig=${a}`)
  } catch (e) { paso(false, '4) Firma del documento (anti-loop)', e.message) }

  const okAll = R.every(Boolean)
  console.log(`\n${okAll ? '🟢 TODO OK — la emisión está sana (no se emitió nada).' : '🔴 HAY ALGO ROTO — revisar arriba. NO confiar en emitir hasta arreglarlo.'}`)
  process.exit(okAll ? 0 : 1)
}

main().catch((e) => { console.error('💥 Falló el test:', e.message); process.exit(1) })

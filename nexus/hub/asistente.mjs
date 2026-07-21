// asistente.mjs — Cerebro conversacional de Nexus (Claude por API).
// Bucle de herramientas MANUAL (no tool-runner) para poder meter aprobación
// humana en acciones sensibles. Herramientas de solo lectura del negocio +
// lectura/escritura del Segundo Cerebro. La automatización de navegador
// (con su freno de aprobación) se enchufa como otra herramienta más adelante.

import Anthropic from '@anthropic-ai/sdk'
import { Agent as UndiciAgent, fetch as undiciFetch } from 'undici'
import dns from 'node:dns'
// CAUSA RAÍZ del cuelgue "Request timed out": api.anthropic.com publica IPv4 Y IPv6,
// pero esta máquina NO tiene ruta IPv6. Tras hacer fetch a otros hosts (Supabase de
// Aliace, conector goautos), el siguiente connect a la API intentaba la IPv6 y se
// quedaba 10s colgado sin salida → UND_ERR_CONNECT_TIMEOUT → el turno fallaba. Forzar
// IPv4 primero elimina el problema (no perdemos nada: no hay IPv6 funcional aquí).
dns.setDefaultResultOrder('ipv4first')
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { readFile, readdir } from 'node:fs/promises'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

import * as recordatorios from './recordatorios.mjs'
import * as kapso from './kapso.mjs'
import { sintetizarVoz } from './vista.mjs'
import { computeMargen, margenNetoDesdeAliace, pctTexto } from './margen-bi.mjs'
import * as historial from './historial.mjs'
// SAI — conciliación SII↔banco↔Mallorca (motor determinista en ../conector-sai).
// Carga su propio .env; si algo falla, cada tool degrada sin tumbar el hub.
import * as sai from '../conector-sai/src/tools.js'
// Gmail — descargar adjuntos (documentos) del correo conectado (agente Néstor).
import { descargarAdjuntos as gmailDescargarAdjuntos } from '../conector-correo/gmail-adjuntos.mjs'
import { recordarHecho, textoMemoria } from './memoria-usuarios.mjs'

const ejecCmd = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* opcional */ }

const MODELO = process.env.MODELO_ASISTENTE || 'claude-opus-4-8'
// La web (conversación por voz) usa HAIKU: rápido y BARATO. WhatsApp/análisis pesados
// siguen en Opus (calidad máxima). Cambiar: MODELO_WEB_ASISTENTE=claude-opus-4-8
const MODELO_WEB = process.env.MODELO_WEB_ASISTENTE || 'claude-sonnet-5'
const SUPA_URL = process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const SUPA_REST = SUPA_URL ? SUPA_URL.replace(/\/$/, '') + '/rest/v1' : null
const CEREBRO = `http://127.0.0.1:${Number(process.env.PUERTO_CEREBRO || 8081)}`
const NAVEGADOR = `http://127.0.0.1:${Number(process.env.PUERTO_NAVEGADOR || 8082)}`

// ── Aliace ERP (admin.aliace.cl) — Supabase del PORTAL (mdrvhekhimhcwydrpueo) ──
// Es OTRA base distinta a SUPABASE_URL. Para "dudas de Aliace" (facturación,
// ventas, pagos, deudas, metas, clientes) consultamos AQUÍ los MISMOS RPCs que
// usa la web → valores idénticos, al instante, sin navegar el portal.
const ALIACE_URL = process.env.ALIACE_SUPABASE_URL
const ALIACE_KEY = process.env.ALIACE_SUPABASE_SERVICE_KEY || process.env.ALIACE_SUPABASE_ANON_KEY
const ALIACE_REST = ALIACE_URL ? ALIACE_URL.replace(/\/$/, '') + '/rest/v1' : null
// Dispatcher DEDICADO para Aliace (Supabase), aislado del pool global y con DNS por
// c-ares (ver _lookupCAres): así una RPC lenta o un connect colgado NO envenena el pool
// que comparte el resto, ni depende del threadpool. Se crea perezosamente (lazy) porque
// _lookupCAres/_nuevoAgenteAliace viven más abajo. TIMEOUT duro por request (AbortSignal):
// si Supabase no responde en 20s, la llamada FALLA rápido en vez de colgar el hub de 1 hilo.
let _agenteAliace = null
async function aliaceFetch(path, opts = {}) {
  if (!ALIACE_REST) throw new Error('Falta ALIACE_SUPABASE_URL en ~/nexus/.env')
  if (!_agenteAliace) _agenteAliace = new UndiciAgent({
    connect: { family: 4, timeout: 10000, lookup: _lookupCAres },
    keepAliveTimeout: 10000, keepAliveMaxTimeout: 30000, connections: 12,
  })
  return await undiciFetch(ALIACE_REST + path, {
    ...opts,
    signal: opts.signal || AbortSignal.timeout(20000),
    dispatcher: _agenteAliace,
    headers: { apikey: ALIACE_KEY, Authorization: 'Bearer ' + ALIACE_KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
}
// Helpers chicos para el resumen determinista
async function aliaceRpc(fn, params = {}) {
  const r = await aliaceFetch('/rpc/' + fn, { method: 'POST', body: JSON.stringify(params) })
  const d = await r.json().catch(() => null)
  if (!r.ok) throw new Error(`rpc ${fn} HTTP ${r.status}: ${JSON.stringify(d)?.slice(0, 200)}`)
  return d
}
async function aliaceQuery(q) {
  const r = await aliaceFetch('/rpc/lia_run_readonly_query', { method: 'POST', body: JSON.stringify({ query_text: q }) })
  const d = await r.json().catch(() => null)
  if (!r.ok) throw new Error(`sql HTTP ${r.status}: ${JSON.stringify(d)?.slice(0, 200)}`)
  return Array.isArray(d) ? d : []
}
// ── RESUMEN CANÓNICO DEL MES (Aliace) ────────────────────────────────────────
// Calcula SERVER-SIDE, con los MISMOS RPC oficiales cada vez, las cifras de
// cabecera que pide Nico (facturación neta, meta/avance, NV pendientes de
// aprobación, NV aprobadas sin facturar, y CxC por estado limpiando
// judiciales/siniestros). Como es el mismo código y los mismos RPC, una misma
// pregunta da SIEMPRE el mismo número (coherencia). El modelo debe REPORTAR
// estos valores tal cual, sin recalcular con aliace_sql.
const ETIQUETA_NV = {
  pending_pricing: 'Autorización por precio',
  pending: 'Autorización cobranza',
  pending_credit: 'Línea de crédito insuficiente',
  payment_to_check: 'Validación de pago',
  prepaid: 'Anticipado pendiente de pago',
  accepted: 'Aceptada (aprobada, sin facturar)',
  por_facturar: 'Por facturar (aprobada, sin facturar)',
}
const ST_PENDIENTES = ['pending_pricing', 'pending', 'pending_credit', 'payment_to_check', 'prepaid']
const ST_APROBADAS_SF = ['accepted', 'por_facturar']
function resumenMesPeriodo(fecha) {
  const f = (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) ? fecha : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const anio = Number(f.slice(0, 4)); const mes = Number(f.slice(5, 7))
  const ini = `${f.slice(0, 7)}-01`
  const sig = mes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 1).padStart(2, '0')}-01`
  return { fecha: f, anio, mes, ini, sig }
}
// ── RÉPLICA EXACTA DE LA PANTALLA "FACTURAS" DE LA APP DE ALIACE ──────────────
// Verificado 2026-06-30 contra la app real (repo DropoutCapital/aliace,
// src/pages/facturas/FacturasStatistics.tsx + fetchFacturasOptimized + RPC
// get_sales_request_costs): cuadra al PESO con la app —Total de Documentos,
// Monto Total Facturado (sin IVA), Promedio por Factura, Costo de Ventas (WAC),
// Margen Bruto y Margen %—. Por eso usamos su MISMA vista (v_facturas_optimized),
// su MISMO rango (inicio de mes → fin de mes, hora Chile, sobre created_at), sus
// MISMOS filtros de status/test y su MISMA fórmula. Devuelve los campos con los
// MISMOS nombres que muestra la app. ⚠️ NO cambiar sin re-verificar contra la app.
const FA_STATUS = ['accepted', 'delivered', 'in_transit', 'pending', 'pending_pricing', 'pending_credit', 'dispatch_ready', 'prepaid', 'payment_to_check', 'rejected']
async function aliaceFacturasApp(anio, mes) {
  // Bordes del mes (hora local del server, igual que la app). Delegamos en la versión
  // por RANGO para reutilizar EXACTAMENTE el mismo cálculo en la vista ANUAL: así el
  // total del año = suma al peso de los meses (misma lógica verificada).
  const startISO = new Date(anio, mes - 1, 1, 0, 0, 0, 0).toISOString()
  const endISO = new Date(anio, mes, 0, 23, 59, 59, 999).toISOString()
  return aliaceFacturasRango(startISO, endISO)
}
async function aliaceFacturasRango(startISO, endISO) {
  const ST = FA_STATUS.map((s) => `'${s}'`).join(',')
  // amount por documento: factura → round(net_amount||total_amount) de la vista;
  // NC/ND → net_amount re-leído de sales_request_documents (igual que el servicio).
  // NULLIF(x,0) imita el "||" de JS (0 cae al fallback). NC de clientes test se
  // excluyen (salvo NC BSale directo sin sales_request); facturas/ND no filtran test.
  const q = `
    WITH per AS (
      SELECT v.document_type dt, v.sales_request_id sr, v.id doc_id,
        CASE
          WHEN v.document_type='factura' THEN round(COALESCE(NULLIF(v.net_amount,0), v.total_amount))
          WHEN v.document_type='nota_de_credito' THEN COALESCE(NULLIF(srd.net_amount,0), v.total_amount)
          ELSE COALESCE(srd.net_amount,0)
        END AS amount
      FROM v_facturas_optimized v
      LEFT JOIN sales_request_documents srd ON srd.id = v.id
      WHERE v.document_type IN ('factura','nota_de_credito','nota_de_debito')
        AND v.sales_request_status IN (${ST})
        AND v.created_at >= '${startISO}' AND v.created_at <= '${endISO}'
        AND NOT (v.document_type='nota_de_credito' AND v.client_is_test = true
                 AND NOT (v.sales_request_id IS NULL AND v.is_temporary IS TRUE))
    ),
    costs AS (
      SELECT sri.sales_request_id sr,
             SUM(ABS(m.quantity)*m.unit_cost_clp) cost_total, COUNT(*) lines
      FROM costing_movements m
      JOIN sales_request_items sri ON sri.id = m.source_id
      WHERE m.movement_class='sale' AND m.source_type='sales_request_item'
      GROUP BY sri.sales_request_id
    ),
    -- Costo WAC de las DEVOLUCIONES (notas de crédito): el módulo de costeo SÍ lo
    -- estampa como movimientos movement_class='return' / source_type='credit_note_item'
    -- (unit_cost_clp = mismo WAC que las ventas), ligados a la línea de NC. Lo agregamos
    -- por documento de NC para netear el costo, igual que el Power BI. Las NC que el
    -- costeo NO logró matchear por nombre (returns_unmatched) o las 'administrative'
    -- simplemente no aparecen aquí → su costo queda en 0 (se netea solo el ingreso).
    nc_costs AS (
      SELECT cni.credit_note_document_id doc,
             SUM(ABS(m.quantity)*m.unit_cost_clp) cost_total
      FROM costing_movements m
      JOIN credit_note_items cni ON cni.id = m.source_id
      WHERE m.movement_class='return' AND m.source_type='credit_note_item'
      GROUP BY cni.credit_note_document_id
    )
    SELECT
      COUNT(*) FILTER (WHERE dt='factura')::int facturas,
      COUNT(*) FILTER (WHERE dt='nota_de_credito')::int nc,
      COUNT(*) FILTER (WHERE dt='nota_de_debito')::int nd,
      COALESCE(SUM(amount) FILTER (WHERE dt='factura'),0) facturas_amount,
      COALESCE(SUM(ABS(amount)) FILTER (WHERE dt='nota_de_credito'),0) nc_amount,
      COALESCE(SUM(ABS(amount)) FILTER (WHERE dt='nota_de_debito'),0) nd_amount,
      COALESCE(SUM(CASE WHEN c.cost_total>0 AND c.lines>0 THEN p.amount ELSE 0 END) FILTER (WHERE dt='factura'),0) ventas_con_costo,
      COALESCE(SUM(CASE WHEN c.cost_total>0 AND c.lines>0 THEN c.cost_total ELSE 0 END) FILTER (WHERE dt='factura'),0) costo_ventas,
      -- costo WAC de las devoluciones del período (para el margen NETO estilo Power BI)
      COALESCE(SUM(nc.cost_total) FILTER (WHERE dt='nota_de_credito'),0) costo_ventas_nc
    FROM per p
      LEFT JOIN costs c ON c.sr = p.sr
      LEFT JOIN nc_costs nc ON nc.doc = p.doc_id`
  const r = (await aliaceQuery(q))?.[0] || {}
  const round = (n) => Math.round(Number(n || 0))
  const facturas = Number(r.facturas || 0), notas_credito = Number(r.nc || 0)
  const facturas_monto = round(r.facturas_amount)
  const notas_credito_monto = round(r.nc_amount)
  const notas_debito_monto = round(r.nd_amount)
  const monto_total_facturado_sin_iva = facturas_monto + notas_debito_monto - notas_credito_monto
  const promedio_por_factura_sin_iva = facturas > 0 ? Math.round(facturas_monto / facturas) : 0
  const costo_ventas_wac = round(r.costo_ventas)
  const ventas_con_costo = round(r.ventas_con_costo)
  const margen_bruto = ventas_con_costo - costo_ventas_wac
  const margen_pct = ventas_con_costo !== 0 ? Math.round((margen_bruto / ventas_con_costo) * 1000) / 10 : null

  // ── MARGEN NETO (estilo Power BI) ──────────────────────────────────────────
  // Neteo de devoluciones al pie de la letra del modelo BI, con la MISMA data que
  // usa la app (net_amount de facturas/NC + WAC de costing_movements): ventas de
  // TODAS las facturas, NC restadas (ingreso Y costo), % sobre ventas netas. La
  // fórmula vive SOLO en computeMargen() (única fuente; cubierta por margen-bi.test).
  // Precisión COMPLETA: no redondeamos aquí; el redondeo/formateo es de la vista.
  const costoFactura = Number(r.costo_ventas || 0)       // WAC de ventas costeadas (facturas)
  const costoNc      = -Number(r.costo_ventas_nc || 0)   // WAC de devoluciones, NEGATIVO (netea el costo)
  const mb = margenNetoDesdeAliace(r)                    // mapeo de signos Aliace→fórmula (testeado)
  const margen_neto_bi = {
    ventas: mb.ventas,                       // facturas (bruto, sin IVA)
    notas_credito: mb.NC,                    // negativo
    ventas_netas: mb.ventas_netas,           // facturas − devoluciones
    costo_ventas_fact: costoFactura,
    costo_devoluciones: -costoNc,            // positivo, informativo
    costo_ventas_total: mb.costo_ventas_total,
    margen_bruto: mb.margen_bruto,           // preciso, sin redondear
    margen_pct: mb.pct_margen,               // FRACCIÓN (0.40 = 40%); formatear en la vista
    pct_costos: mb.pct_costos,
    pct_nc: mb.pct_nc,
    // cobertura de costeo: cuánto del costo de venta y de devolución está realmente
    // costeado. Si es bajo, el margen neto puede quedar incompleto (WAC pendiente).
    cobertura_costeo_pct: Number(r.facturas_amount) ? Math.round((ventas_con_costo / Number(r.facturas_amount)) * 1000) / 10 : null,
  }

  return {
    total_documentos: facturas + notas_credito,
    facturas, notas_credito,
    monto_total_facturado_sin_iva, facturas_monto, notas_credito_monto,
    promedio_por_factura_sin_iva,
    costo_ventas_wac, ventas_con_costo, margen_bruto, margen_pct,
    // margen NETO de devoluciones (Power BI): éste es el margen "correcto" a reportar.
    margen_neto_bi,
  }
}
// Caché corto de lecturas financieras pesadas de Aliace (resumen/margen). Repetir la
// misma consulta dentro de la ventana = instantáneo (los datos intradía cambian lento).
const _finCache = new Map()
const FIN_TTL = 3 * 60 * 1000
function _finGet(key) { const h = _finCache.get(key); return (h && Date.now() - h.ts < FIN_TTL) ? h.val : null }
function _finSet(key, val) { _finCache.set(key, { ts: Date.now(), val }); return val }
// Gráficos AUTOMÁTICOS del resumen de Aliace: NO dependen de que el modelo llame a
// graficar (por eso "dejaban de salir"). En web se muestran en la ventana; en
// WhatsApp se generan y envían solos. Estándar: CxC por estado + Meta vs Facturado.
async function autoGraficarResumen(r, ctx) {
  try {
    if (!r || typeof r !== 'object') return
    const round = (n) => Math.round(Number(n) || 0)
    const specs = []
    const c = r.cxc || {}
    const est = [['Vencida', c.vencida_limpia], ['Por vencer', c.por_vencer], ['Siniestro', c.siniestro], ['Judicial', c.judicial]]
      .filter(([, v]) => round(v) > 0)
    if (est.length >= 2) specs.push({ tipo: 'barra', titulo: 'CxC por estado', subtitulo: `corte ${r.fecha_corte || ''}`, etiquetas: est.map((e) => e[0]), valores: est.map((e) => round(e[1])) })
    const m = r.meta || {}
    const fact = round(m.facturado_neto != null ? m.facturado_neto : (r.facturacion && r.facturacion.monto_total_facturado_sin_iva))
    const metaMes = round(m.meta_mes)
    if (metaMes > 0 && fact > 0) specs.push({ tipo: 'barra', titulo: 'Meta vs Facturado', subtitulo: `${r.mes || ''}/${r.anio || ''}`, etiquetas: ['Meta', 'Facturado'], valores: [metaMes, fact] })
    if (!specs.length) return
    if (ctx.web) { if (Array.isArray(ctx.graficos)) ctx.graficos.push(...specs); return }
    const target = destinoValido(ctx.de); if (!target) return
    const glog = (msg) => { try { appendFileSync('/tmp/nexus-fotos.log', `[${new Date().toISOString()}] ${msg}\n`) } catch { /* */ } }
    for (const s of specs) {
      const archivo = `/tmp/nexus-grafico-${Date.now()}-${s.valores[0]}.png`
      const fjson = archivo + '.json'
      try {
        writeFileSync(fjson, JSON.stringify({ ...s, archivo }))
        await ejecCmd(`python3 ${JSON.stringify(join(__dirname, 'graficar.py'))} ${JSON.stringify(fjson)}`, { timeout: 30000 })
        if (existsSync(archivo)) enviarMediaWhatsApp(target, archivo, s.titulo).then(() => glog(`OK grafico-auto ${s.tipo} -> ${target}`)).catch((e) => glog(`FALLO grafico-auto: ${String(e.message).slice(0, 120)}`))
      } catch (e) { glog(`FALLO grafico-auto gen: ${String(e.message).slice(0, 120)}`) }
    }
  } catch (e) { /* best-effort */ }
}
async function aliaceResumenMes(fecha) {
  const P = resumenMesPeriodo(fecha)
  const num = (n) => Math.round(Number(n || 0))
  // Las 5 consultas son INDEPENDIENTES entre sí: las disparamos EN PARALELO (Promise.all)
  // en vez de en serie. Así el resumen tarda ~1 roundtrip en vez de ~5, deja menos ventana
  // para timeouts y hace la respuesta mucho más ágil (clave en la consulta combinada
  // resumen+margen donde antes se acumulaba la latencia). Cada una ya trae su timeout duro.
  const [fa, goals, filasNv, reporte, manual] = await Promise.all([
    aliaceFacturasApp(P.anio, P.mes),
    aliaceRpc('get_sales_goals_vs_actual', { p_year: P.anio }),
    aliaceQuery(
      `SELECT status, COUNT(*) n, SUM(total_amount)::bigint monto
       FROM sales_request
       WHERE deleted_at IS NULL AND status NOT IN ('test')
         AND created_at >= '${P.ini}' AND created_at < '${P.sig}'
         AND status IN ('${[...ST_PENDIENTES, ...ST_APROBADAS_SF].join("','")}')
       GROUP BY status`),
    aliaceRpc('get_reporte_deuda', { fecha_corte: P.fecha }),
    aliaceRpc('get_manual_facturas_debt_at_cutoff', { cutoff_date: P.fecha }),
  ])
  // 1) FACTURACIÓN + MARGEN: cifras y NOMBRES IDÉNTICOS a la pantalla "Facturas" de
  //    la app de Aliace (réplica verificada al peso). Sube durante el día al facturar.
  const facturacion = {
    // nombres EXACTOS de la app:
    total_documentos: fa.total_documentos, facturas: fa.facturas, notas_credito: fa.notas_credito,
    monto_total_facturado_sin_iva: fa.monto_total_facturado_sin_iva,
    facturas_monto: fa.facturas_monto, notas_credito_monto: fa.notas_credito_monto,
    promedio_por_factura_sin_iva: fa.promedio_por_factura_sin_iva,
    neto: fa.monto_total_facturado_sin_iva, // alias de compatibilidad
    nota: 'Idéntico a la pantalla Facturas de la app de Aliace (mismos nombres y valores). Sube durante el día al emitirse facturas.',
  }
  const margen = {
    costo_ventas_wac: fa.costo_ventas_wac, ventas_con_costo: fa.ventas_con_costo,
    margen_bruto: fa.margen_bruto, margen_pct: fa.margen_pct,
    // MARGEN CORRECTO (neto de devoluciones, estilo Power BI): éste es el que se debe
    // reportar como margen del mes. El de arriba (app) queda como cotejo con la pantalla.
    neto_bi: fa.margen_neto_bi,
    nota: 'MARGEN CORRECTO = margen.neto_bi (neto de notas de crédito, estilo Power BI): ventas_netas = facturas − devoluciones; margen sobre ventas_netas; % es una FRACCIÓN (0.40 = 40%), formatéalo a % en la vista. Los campos costo_ventas_wac/ventas_con_costo/margen_bruto/margen_pct de arriba son la RÉPLICA de la pantalla Facturas de la app (no netea NC), déjalos solo como cotejo. Si neto_bi.cobertura_costeo_pct es bajo, avisa que el costeo del mes está incompleto. Para el margen de TODO EL AÑO usa aliace_anual.',
  }
  // 2) META vs AVANCE del mes (avance = facturado de la app / meta del mes)
  let meta_mes = 0, venta_real = 0
  for (const r of (Array.isArray(goals) ? goals : [])) if (Number(r.month) === P.mes) { meta_mes += Number(r.goal_amount || 0); venta_real += Number(r.actual_amount || 0) }
  const meta = { meta_mes: num(meta_mes), venta_real: num(venta_real), facturado_neto: facturacion.neto,
    avance_pct: meta_mes ? Math.round((facturacion.neto / meta_mes) * 1000) / 10 : null, gap: num(facturacion.neto - meta_mes) }
  // 3) NV del mes por status (pendientes de aprobación y aprobadas-sin-facturar)
  const armaGrupo = (statuses) => {
    const items = filasNv.filter((r) => statuses.includes(r.status))
      .map((r) => ({ status: r.status, etiqueta: ETIQUETA_NV[r.status] || r.status, n: Number(r.n), monto: num(r.monto) }))
      .sort((a, b) => b.monto - a.monto)
    return { total_nv: items.reduce((s, x) => s + x.n, 0), total_monto: items.reduce((s, x) => s + x.monto, 0), por_status: items }
  }
  const nv_pendientes_aprobacion = armaGrupo(ST_PENDIENTES)
  const nv_aprobadas_sin_facturar = armaGrupo(ST_APROBADAS_SF)
  // 4) CxC por estado, limpiando judiciales/siniestros.
  //    NV: get_reporte_deuda separa Vencido / Por Vencer / Siniestro / Cobranza Judicial.
  //    Manual: get_manual_facturas_debt_at_cutoff (bucket por vencimiento + banderas).
  const nvB = { vencida: 0, por_vencer: 0, siniestro: 0, judicial: 0 }
  for (const r of (Array.isArray(reporte) ? reporte : [])) {
    const m = Number(r.monto_pendiente || 0)
    if (r.estado === 'Vencido') nvB.vencida += m
    else if (r.estado === 'Por Vencer') nvB.por_vencer += m
    else if (r.estado === 'Siniestro') nvB.siniestro += m
    else if (r.estado === 'Cobranza Judicial') nvB.judicial += m
  }
  const mfB = { vencida: 0, por_vencer: 0, siniestro: 0, judicial: 0 }
  for (const r of (Array.isArray(manual) ? manual : [])) {
    const m = Number(r.debt_amount_at_cutoff || 0); if (m <= 0) continue
    if (r.cobranza_judicial) mfB.judicial += m
    else if (r.siniestro) mfB.siniestro += m
    else if (Number(r.days_to_due_at_cutoff) < 0) mfB.vencida += m
    else mfB.por_vencer += m
  }
  const vencida_limpia = num(nvB.vencida + mfB.vencida)
  const por_vencer = num(nvB.por_vencer + mfB.por_vencer)
  const siniestro = num(nvB.siniestro + mfB.siniestro)
  const judicial = num(nvB.judicial + mfB.judicial)
  const cxc = {
    vencida_limpia, por_vencer, siniestro, judicial,
    // vencida_total_como_app: la app de Aliace cuenta siniestro y judicial DENTRO de
    // "Vencido" (solo cambia la etiqueta). Si Ramón compara con la pantalla de Deudas,
    // ESTE es el número que cuadra. "vencida_limpia" es la misma vencida pero SACANDO
    // judiciales/siniestros (más útil para decidir cobranza real).
    vencida_total_como_app: num(vencida_limpia + siniestro + judicial),
    total: num(vencida_limpia + por_vencer + siniestro + judicial),
    detalle: { notas_venta: { vencida: num(nvB.vencida), por_vencer: num(nvB.por_vencer), siniestro: num(nvB.siniestro), judicial: num(nvB.judicial) },
      manual_facturas: { vencida: num(mfB.vencida), por_vencer: num(mfB.por_vencer), siniestro: num(mfB.siniestro), judicial: num(mfB.judicial) } },
    nota: '"vencida_total_como_app" = vencido tal como lo muestra la app (incluye judiciales+siniestros). "vencida_limpia" = esa vencida DESCONTANDO judiciales y siniestros (van en sus propios buckets). Por defecto reporta vencida_limpia para decisiones de cobranza; usa vencida_total_como_app si Ramón quiere cuadrar con la pantalla de Deudas. Suma NV + facturas manuales.',
  }
  // ── REPORTE YA FORMATEADO (profesional, listo para enviar) ──────────────────
  // Para que la presentación sea SIEMPRE ordenada, clara y profesional (y nunca
  // dependa de cómo el modelo decida formatear), armamos aquí el texto final en
  // formato WhatsApp: negrita con UN asterisco, CLP con puntos de miles, secciones
  // con totales. El modelo debe MANDAR este `reporte_texto` TAL CUAL.
  const MESES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const clp = (n) => '$' + Math.round(Number(n || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const dd = P.fecha.slice(8, 10)
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const potencial = num(facturacion.neto + nv_pendientes_aprobacion.total_monto + nv_aprobadas_sin_facturar.total_monto)
  const DIV = '━━━━━━━━━━━━━━━'
  const pct = meta.avance_pct == null ? 's/d' : `${meta.avance_pct}%`
  const metaLinea = meta.avance_pct == null
    ? '_Sin meta cargada para el mes._'
    : (meta.gap >= 0 ? `✅ Meta cumplida: +${clp(meta.gap)} sobre lo proyectado.` : `Faltan ${clp(Math.abs(meta.gap))} para cumplir la meta.`)
  const L = []
  // Encabezado tipo informe ejecutivo (para leerse "de empresario": titular, mes, corte).
  const mpct = margen.margen_pct == null ? '—' : `${margen.margen_pct}%`
  L.push(`📊 *ALIACE · Informe ejecutivo*`)
  L.push(`_${cap(MESES[P.mes])} ${P.anio} · corte al ${dd}-${MESES[P.mes].slice(0, 3)} · idéntico a la app (pantalla Facturas)_`)
  L.push(DIV)
  L.push(`*Total de Documentos:* ${facturacion.total_documentos}`)
  L.push(`_Facturas: ${facturacion.facturas} · Notas de Crédito: ${facturacion.notas_credito}_`)
  L.push('')
  L.push('*Monto Total Facturado (sin IVA)*')
  L.push(`${clp(facturacion.monto_total_facturado_sin_iva)}`)
  L.push(`_Facturas ${clp(facturacion.facturas_monto)} · Notas Crédito -${clp(facturacion.notas_credito_monto)}_`)
  L.push('')
  L.push(`*Promedio por Factura (sin IVA):* ${clp(facturacion.promedio_por_factura_sin_iva)}`)
  L.push('')
  // MARGEN NETO (Power BI): neteando devoluciones. Es el margen "correcto" a mostrar.
  const nb = margen.neto_bi
  L.push(`*Ventas netas (costeadas − NC):* ${clp(nb.ventas_netas)}`)
  L.push(`_Ventas costeadas ${clp(nb.ventas)} · Devoluciones -${clp(-nb.notas_credito)}_`)
  L.push(`*Costo de Ventas (WAC):* ${clp(nb.costo_ventas_total)}`)
  L.push(`_Ventas ${clp(nb.costo_ventas_fact)} · Devoluciones -${clp(nb.costo_devoluciones)}_`)
  L.push(`*Margen Bruto:* ${clp(Math.round(nb.margen_bruto))} · *Margen %:* ${pctTexto(nb.margen_pct)}`)
  if (nb.cobertura_costeo_pct != null && nb.cobertura_costeo_pct < 99)
    L.push(`_⚠️ Costeo del mes: ${pctTexto((nb.cobertura_costeo_pct || 0) / 100)} de las facturas con costo WAC — el margen puede afinarse al terminar de costear._`)
  L.push(`_Cotejo pantalla Facturas app (sin netear NC): margen ${clp(margen.margen_bruto)} · ${mpct}._`)
  L.push('_Costos y márgenes: información en revisión, no oficial (como advierte la app)._')
  L.push(DIV)
  L.push('*Meta del mes*')
  L.push(`Meta ${clp(meta.meta_mes)} · Avance *${pct}*`)
  L.push(metaLinea)
  L.push('')
  L.push('*Notas de venta*')
  L.push(`▸ Pendientes de aprobación: *${nv_pendientes_aprobacion.total_nv}* por *${clp(nv_pendientes_aprobacion.total_monto)}*`)
  if (nv_pendientes_aprobacion.por_status.length) for (const s of nv_pendientes_aprobacion.por_status) L.push(`   · ${s.etiqueta}: ${s.n} · ${clp(s.monto)}`)
  else L.push('   · Ninguna pendiente 👍')
  L.push(`▸ Aprobadas sin facturar: *${nv_aprobadas_sin_facturar.total_nv}* por *${clp(nv_aprobadas_sin_facturar.total_monto)}*`)
  if (nv_aprobadas_sin_facturar.por_status.length) for (const s of nv_aprobadas_sin_facturar.por_status) L.push(`   · ${s.etiqueta}: ${s.n} · ${clp(s.monto)}`)
  else L.push('   · Ninguna 👍')
  L.push('')
  L.push('*Cuentas por cobrar*')
  L.push(`▸ Vencida (cobranza real): *${clp(cxc.vencida_limpia)}*`)
  L.push(`▸ Por vencer: ${clp(cxc.por_vencer)}`)
  L.push(`▸ Siniestro ${clp(cxc.siniestro)} · Judicial ${clp(cxc.judicial)}`)
  L.push(`▸ Total CxC: *${clp(cxc.total)}*`)
  L.push('')
  L.push('*Potencial de cierre*')
  L.push(`*${clp(potencial)}*`)
  L.push('_Facturado + NV pendientes + NV aprobadas sin facturar._')
  L.push(DIV)
  // LECTURA EJECUTIVA: conclusiones DERIVADAS de las cifras reales (nada inventado),
  // para que se lea como el brief de un empresario: qué significan los números y dónde mirar.
  const nvEnJuego = num(nv_pendientes_aprobacion.total_monto + nv_aprobadas_sin_facturar.total_monto)
  const lectura = []
  if (meta.avance_pct != null) lectura.push(meta.gap >= 0
    ? `• Meta de ${MESES[P.mes]} cumplida (${meta.avance_pct}%).`
    : `• Facturación al ${meta.avance_pct}% de la meta: faltan ${clp(Math.abs(meta.gap))} para cerrar el mes.`)
  if (nvEnJuego > 0) lectura.push(`• ${clp(nvEnJuego)} en notas de venta por destrabar (pendientes + aprobadas sin facturar): la vía más directa para acercarse a la meta.`)
  if (cxc.vencida_limpia > 0) lectura.push(`• Cobranza prioritaria: ${clp(cxc.vencida_limpia)} ya vencidos (sin judiciales ni siniestros).`)
  if (!lectura.length) lectura.push('• Mes al día: sin brecha de meta ni cobranza vencida relevante.')
  L.push('🧭 *Lectura ejecutiva*')
  for (const x of lectura) L.push(x)
  const reporte_texto = L.join('\n')
  return {
    fuente: 'aliace_resumen (réplica EXACTA de la app de Aliace, determinista)', fecha_corte: P.fecha, mes: P.mes, anio: P.anio,
    facturacion, margen, meta, nv_pendientes_aprobacion, nv_aprobadas_sin_facturar, cxc,
    potencial_cierre: potencial,
    reporte_texto,
    instruccion: '⭐ ENVÍA `reporte_texto` TAL CUAL (informe ejecutivo ya armado: NO lo reescribas, NO cambies cifras, NO lo conviertas en tabla, NO quites secciones). ' +
      'Las cifras de facturación y margen están con los MISMOS NOMBRES y VALORES que la app de Aliace (pantalla Facturas): Total de Documentos, Monto Total Facturado (sin IVA), Promedio por Factura, Costo de Ventas (WAC), Margen Bruto, Margen %. Repórtalas TAL CUAL; NO las recalcules con aliace_sql ni cambies los nombres. ' +
      'Si el usuario pidió SOLO una parte (ej. solo la CxC o solo el margen), manda solo ESA sección del reporte, con su mismo formato y cifras. Montos en CLP, ya vienen con puntos de miles. ' +
      'Los GRÁFICOS (CxC por estado y Meta vs Facturado) YA se generan y envían/muestran AUTOMÁTICAMENTE con este resumen — NO llames graficar para ellos (saldrían duplicados). Solo usa graficar para OTRA cosa que el usuario pida aparte (ej. ranking de clientes, tendencia por mes).',
  }
}

// ── RESUMEN ANUAL DE ALIACE ──────────────────────────────────────────────────
// Acumulado del AÑO (facturación, margen y meta) + tabla mes a mes. NO inventa nada:
// suma los meses con la MISMA réplica verificada de la pantalla "Facturas" de la app
// (aliaceFacturasApp), así el total del año cuadra al peso con la suma de los meses y
// con el tool aliace_resumen. La CxC NO va aquí: es un snapshot a fecha de corte (no se
// acumula); para CxC usa aliace_resumen. anio opcional → por defecto el año en curso.
async function aliaceResumenAnual(anio) {
  const num = (n) => Math.round(Number(n || 0))
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  const anioHoy = Number(hoy.slice(0, 4)); const mesHoy = Number(hoy.slice(5, 7))
  const Y = (Number.isInteger(anio) && anio >= 2000 && anio <= anioHoy + 1) ? anio : anioHoy
  // Año en curso: solo hasta el mes actual (evita 12 consultas a meses futuros vacíos).
  const ultimoMes = Y === anioHoy ? mesHoy : 12
  const mesesIdx = Array.from({ length: ultimoMes }, (_, i) => i + 1)
  // Cada mes con la réplica verificada (en paralelo) + metas oficiales del año.
  const [porMesRaw, goals] = await Promise.all([
    Promise.all(mesesIdx.map((m) => aliaceFacturasApp(Y, m))),
    aliaceRpc('get_sales_goals_vs_actual', { p_year: Y }),
  ])
  const MESES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const metaPorMes = {}, realPorMes = {}
  for (const r of (Array.isArray(goals) ? goals : [])) {
    const m = Number(r.month)
    metaPorMes[m] = (metaPorMes[m] || 0) + Number(r.goal_amount || 0)
    realPorMes[m] = (realPorMes[m] || 0) + Number(r.actual_amount || 0)
  }
  const por_mes = mesesIdx.map((m, i) => {
    const fa = porMesRaw[i] || {}
    const nb = fa.margen_neto_bi || {}
    return {
      mes: m, etiqueta: MESES[m],
      facturado_neto: num(fa.monto_total_facturado_sin_iva), facturas: Number(fa.facturas || 0),
      costo_ventas_wac: num(fa.costo_ventas_wac), ventas_con_costo: num(fa.ventas_con_costo),
      margen_bruto: num(fa.margen_bruto), margen_pct: fa.margen_pct ?? null,
      // margen NETO (Power BI) del mes, con sus bases precisas para acumular sin redondear:
      neto_bi: {
        ventas: Number(nb.ventas || 0), notas_credito: Number(nb.notas_credito || 0),
        ventas_netas: Number(nb.ventas_netas || 0), costo_ventas_fact: Number(nb.costo_ventas_fact || 0),
        costo_devoluciones: Number(nb.costo_devoluciones || 0), margen_bruto: Number(nb.margen_bruto || 0),
        margen_pct: nb.margen_pct ?? null,
      },
      meta: num(metaPorMes[m] || 0),
    }
  })
  // Acumulados del año = suma EXACTA de los meses (bases netas sin redondear).
  const tot = por_mes.reduce((a, x) => {
    a.facturado_neto += x.facturado_neto; a.facturas += x.facturas
    a.costo_ventas_wac += x.costo_ventas_wac; a.ventas_con_costo += x.ventas_con_costo
    a.margen_bruto += x.margen_bruto; a.meta += x.meta
    a.nb_ventas += x.neto_bi.ventas; a.nb_nc += x.neto_bi.notas_credito
    a.nb_costo_fact += x.neto_bi.costo_ventas_fact; a.nb_costo_dev += x.neto_bi.costo_devoluciones
    return a
  }, { facturado_neto: 0, facturas: 0, costo_ventas_wac: 0, ventas_con_costo: 0, margen_bruto: 0, meta: 0,
       nb_ventas: 0, nb_nc: 0, nb_costo_fact: 0, nb_costo_dev: 0 })
  const margen_pct = tot.ventas_con_costo !== 0 ? Math.round((tot.margen_bruto / tot.ventas_con_costo) * 1000) / 10 : null
  // Margen NETO anual: MISMA fórmula (computeMargen) sobre las bases acumuladas.
  const nbAnual = computeMargen({ ventas: tot.nb_ventas, NC: tot.nb_nc, costo_ventas_fact: tot.nb_costo_fact, costo_ventas_nc: -tot.nb_costo_dev })
  const venta_real_anual = num(Object.values(realPorMes).reduce((s, x) => s + x, 0))
  const avance_pct = tot.meta ? Math.round((tot.facturado_neto / tot.meta) * 1000) / 10 : null
  const gap = num(tot.facturado_neto - tot.meta)
  const facturacion = {
    facturado_neto: num(tot.facturado_neto), facturas: tot.facturas,
    nota: 'Suma de los meses del año con la MISMA réplica verificada de la pantalla Facturas de la app.',
  }
  const margen = {
    costo_ventas_wac: num(tot.costo_ventas_wac), ventas_con_costo: num(tot.ventas_con_costo),
    margen_bruto: num(tot.margen_bruto), margen_pct,
    // MARGEN CORRECTO anual (neto de devoluciones, Power BI):
    neto_bi: {
      ventas: nbAnual.ventas, notas_credito: nbAnual.NC, ventas_netas: nbAnual.ventas_netas,
      costo_ventas_fact: tot.nb_costo_fact, costo_devoluciones: tot.nb_costo_dev,
      costo_ventas_total: nbAnual.costo_ventas_total, margen_bruto: nbAnual.margen_bruto,
      margen_pct: nbAnual.pct_margen, pct_costos: nbAnual.pct_costos, pct_nc: nbAnual.pct_nc,
    },
    nota: 'MARGEN CORRECTO = margen.neto_bi (neto de notas de crédito, estilo Power BI): ventas_netas = facturas − devoluciones, % sobre ventas netas (FRACCIÓN: 0.40 = 40%). Los campos costo_ventas_wac/margen_bruto/margen_pct son la réplica de la app (no netea NC), solo para cotejo. La app advierte: costos/márgenes en revisión, no oficial.',
  }
  const meta = { meta_anual: num(tot.meta), venta_real: venta_real_anual, facturado_neto: num(tot.facturado_neto), avance_pct, gap }
  // ── REPORTE YA FORMATEADO (profesional, formato WhatsApp, listo para enviar) ──
  const clp = (n) => '$' + Math.round(Number(n || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const DIV = '━━━━━━━━━━━━━━━'
  const L = []
  L.push(`📊 *ALIACE · Informe ANUAL ${Y}*`)
  L.push(`_Facturación y margen acumulados${Y === anioHoy ? ` · a ${MESES[mesHoy]} (año en curso)` : ''} · réplica de la app (pantalla Facturas)_`)
  L.push(DIV)
  L.push('*Facturado del año (sin IVA)*')
  L.push(`${clp(facturacion.facturado_neto)}`)
  L.push(`_${facturacion.facturas} facturas_`)
  L.push('')
  const nbA = margen.neto_bi
  L.push(`*Ventas netas (costeadas − NC):* ${clp(nbA.ventas_netas)}`)
  L.push(`*Costo de Ventas (WAC):* ${clp(nbA.costo_ventas_total)}`)
  L.push(`*Margen Bruto:* ${clp(Math.round(nbA.margen_bruto))} · *Margen %:* ${pctTexto(nbA.margen_pct)}`)
  L.push(`_Cotejo app (sin netear NC): ${clp(margen.margen_bruto)} · ${margen.margen_pct == null ? '—' : margen.margen_pct + '%'}._`)
  L.push('_Costos y márgenes: en revisión, no oficial (como advierte la app)._')
  L.push(DIV)
  L.push('*Meta del año*')
  L.push(`Meta ${clp(meta.meta_anual)} · Avance *${avance_pct == null ? 's/d' : avance_pct + '%'}*`)
  if (avance_pct != null) L.push(gap >= 0 ? `✅ +${clp(gap)} sobre la meta acumulada.` : `Faltan ${clp(Math.abs(gap))} para la meta acumulada.`)
  L.push(DIV)
  L.push('*Facturado por mes* (neto · margen %)')
  for (const x of por_mes) L.push(`▸ ${cap(x.etiqueta).slice(0, 3)}: *${clp(x.facturado_neto)}*${x.neto_bi.margen_pct == null ? '' : ` · ${pctTexto(x.neto_bi.margen_pct)}`}`)
  L.push(DIV)
  // Lectura ejecutiva: conclusiones DERIVADAS de las cifras reales (nada inventado).
  const conVenta = por_mes.filter((x) => x.facturado_neto > 0)
  const lectura = []
  if (conVenta.length) {
    const mejor = conVenta.reduce((a, b) => (b.facturado_neto > a.facturado_neto ? b : a))
    lectura.push(`• Mejor mes: ${cap(mejor.etiqueta)} con ${clp(mejor.facturado_neto)}.`)
    lectura.push(`• Promedio mensual facturado: ${clp(num(tot.facturado_neto / conVenta.length))}.`)
  }
  if (avance_pct != null) lectura.push(gap >= 0
    ? `• Año por sobre la meta acumulada (+${clp(gap)}).`
    : `• Año al ${avance_pct}% de la meta: faltan ${clp(Math.abs(gap))}.`)
  if (!lectura.length) lectura.push('• Sin facturación registrada en el año.')
  L.push('🧭 *Lectura ejecutiva*')
  for (const x of lectura) L.push(x)
  const reporte_texto = L.join('\n')
  return {
    fuente: 'aliace_anual (suma de meses con la réplica EXACTA de la app, determinista)',
    anio: Y, hasta_mes: ultimoMes, anio_en_curso: Y === anioHoy,
    facturacion, margen, meta, por_mes,
    reporte_texto,
    instruccion: '⭐ ENVÍA `reporte_texto` TAL CUAL (informe anual ya armado: NO lo reescribas, NO cambies cifras, NO quites meses). ' +
      'Las cifras son la SUMA de los meses con la MISMA réplica de la pantalla Facturas de la app; repórtalas TAL CUAL, NO recalcules con aliace_sql. ' +
      'La CxC NO está aquí (es snapshot, no anual): para vencidas/por vencer usa aliace_resumen. ' +
      'ACOMPAÑA SIEMPRE con un gráfico (tool graficar): facturado por mes (barras) y/o margen % por mes. ' +
      `⚠️ OBLIGATORIO EN EL TEXTO (aunque mandes gráfico y aunque resumas): di SIEMPRE el FACTURADO TOTAL del año en pesos = ${clp(facturacion.facturado_neto)} y el AVANCE de meta = ${avance_pct == null ? 's/d' : avance_pct + '%'}. Ese total es la RESPUESTA directa a "cuánto llevamos en el año"; NUNCA respondas solo con el mejor mes, un comentario o el % sin el monto absoluto.`,
  }
}

// ── ACCIONES DE ESCRITURA EN ALIACE (ERP real) ──────────────────────────────
// La app mueve una NV haciendo UPDATE de sales_request.status; los triggers de la
// BD (validate_status_transition, reserva de stock, auditoría) hacen el resto solos.
// Aprobar=accepted / Rechazar=rejected exigen approved_rejected_by (uuid de profiles):
// con el service-role auth.uid() es NULL, así que lo seteamos nosotros (ALIACE_APROBADOR_UUID).
const ALIACE_NV_ESTADOS = {
  pending: 'Autorización cobranza', pending_pricing: 'Autorización por precio',
  pending_credit: 'Línea de crédito insuficiente', payment_to_check: 'Validación de pago',
  prepaid: 'Anticipado pendiente de pago', accepted: 'Aceptada (aprobada, sin facturar)',
  por_facturar: 'Por facturar', rejected: 'Rechazada', in_transit: 'En tránsito',
  dispatch_ready: 'Lista para despacho', delivered: 'Entregada',
}
const ALIACE_APROBADOR_UUID = process.env.ALIACE_APROBADOR_UUID || null
async function aliacePatch(tabla, filtro, body) {
  const r = await aliaceFetch(`/${tabla}?${filtro}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(body),
  })
  const d = await r.json().catch(() => null)
  if (!r.ok) throw new Error(`PATCH ${tabla} HTTP ${r.status}: ${JSON.stringify(d)?.slice(0, 300)}`)
  return d
}
async function aliaceInsert(tabla, body) {
  const r = await aliaceFetch(`/${tabla}`, {
    method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(body),
  })
  const d = await r.json().catch(() => null)
  if (!r.ok) throw new Error(`INSERT ${tabla} HTTP ${r.status}: ${JSON.stringify(d)?.slice(0, 300)}`)
  return d
}
// Mueve UNA nota de venta de estado. dry=true → SIMULA (no escribe), devuelve el plan.
async function aliaceMoverNV({ id, nuevo_estado, motivo }, dry = false) {
  const est = String(nuevo_estado || '').trim()
  if (!ALIACE_NV_ESTADOS[est]) throw new Error(`Estado inválido "${est}". Válidos: ${Object.keys(ALIACE_NV_ESTADOS).join(', ')}`)
  const uuid = String(id || '').trim()
  if (!/^[0-9a-f-]{36}$/i.test(uuid)) throw new Error(`id de NV inválido (debe ser el uuid de sales_request): "${uuid}"`)
  const filas = await aliaceQuery(`SELECT id, status, total_amount, created_at FROM sales_request WHERE id = '${uuid}' AND deleted_at IS NULL LIMIT 1`)
  const nv = filas?.[0]
  if (!nv) throw new Error(`No encontré la NV ${uuid} (¿uuid correcto? ¿está eliminada?)`)
  if (nv.status === est) return { ok: true, sin_cambio: true, id: nv.id, status: nv.status, msg: `La NV ya está en "${ALIACE_NV_ESTADOS[est]}", no hago nada.` }
  // Escritura MÍNIMA, idéntica a la app: solo el status (+ approved_rejected_by en
  // aprobar/rechazar). NO seteamos updated_at ni approved_rejected_at ni insertamos el
  // historial: la BD lo hace sola por triggers (update_updated_at_column y
  // record_sales_request_status_change escriben updated_at e historial; la app tampoco
  // escribe approved_rejected_at → queda null). Los triggers BEFORE (validate_status_
  // transition, protect_pending_status, enforce_credit_line_status) validan la transición.
  const body = { status: est }
  if (est === 'rejected') { if (!motivo) throw new Error('Para RECHAZAR la NV necesito el motivo (rejected_reason).'); body.rejected_reason = String(motivo) }
  if (est === 'accepted' || est === 'rejected') {
    if (!ALIACE_APROBADOR_UUID) throw new Error('No puedo aprobar/rechazar todavía: falta ALIACE_APROBADOR_UUID en ~/nexus/.env (uuid de profiles a quien atribuir la aprobación). Pídeselo a Ramón.')
    body.approved_rejected_by = ALIACE_APROBADOR_UUID
  }
  const plan = {
    id: nv.id, de: ALIACE_NV_ESTADOS[nv.status] || nv.status, a: ALIACE_NV_ESTADOS[est],
    monto_clp: Math.round(Number(nv.total_amount || 0)), campos_a_cambiar: body,
  }
  if (dry) return { ok: true, simulacion: true, plan, nota: 'SIMULACIÓN: NO se escribió nada. Esto es exactamente lo que se cambiaría. Para ejecutarlo de verdad, vuelve a llamar con confirmado=true.' }
  const res = await aliacePatch('sales_request', `id=eq.${nv.id}`, body)
  return { ok: true, aplicado: true, id: nv.id, de: plan.de, a: plan.a, monto_clp: plan.monto_clp, estado_final: Array.isArray(res) ? res[0]?.status : est }
}

// ── REGISTRAR PAGO EN ALIACE (ERP real) ──────────────────────────────────────
// Réplica EXACTA del ManualPaymentForm de la app: (1) INSERT en payments, (2) recalcular
// sales_request.paid_amount/paid. NO hay trigger AFTER INSERT en payments que lo haga
// (la app borró esos triggers: "Application code now handles paid status"), así que el
// paso 2 lo hacemos nosotros con el MISMO RPC que usa la app (get_sales_request_paid_amount,
// = SUM(amount) de todos los pagos de la NV). La BD no valida monto<=saldo: avisamos en el plan.
const ALIACE_PAGO_METODOS = ['manual', 'bank_transfer', 'transfer', 'check', 'cash', 'webpay', 'khipu', 'other', 'factoring', 'descuento_nomina']
async function aliaceRegistrarPago({ id, monto, metodo, referencia, verificar }, dry = false) {
  const uuid = String(id || '').trim()
  if (!/^[0-9a-f-]{36}$/i.test(uuid)) throw new Error(`id de NV inválido (debe ser el uuid de sales_request): "${uuid}"`)
  const amount = Math.round(Number(monto || 0))
  if (!(amount > 0)) throw new Error('El monto del pago debe ser un número en CLP mayor a 0.')
  const met = String(metodo || 'manual').trim()
  if (!ALIACE_PAGO_METODOS.includes(met)) throw new Error(`Método de pago inválido "${met}". Válidos: ${ALIACE_PAGO_METODOS.join(', ')}.`)
  const filas = await aliaceQuery(`SELECT sr.id, sr.client_id, sr.status, sr.total_amount, sr.paid_amount, sr.proportional_interest, c.name cliente
    FROM sales_request sr JOIN clients c ON c.id = sr.client_id WHERE sr.id = '${uuid}' AND sr.deleted_at IS NULL LIMIT 1`)
  const nv = filas?.[0]
  if (!nv) throw new Error(`No encontré la NV ${uuid} (¿uuid correcto? ¿está eliminada?)`)
  const total = Math.round(Number(nv.total_amount || 0)) + Math.round(Number(nv.proportional_interest || 0))
  const pagadoAntes = Math.round(Number(nv.paid_amount || 0))
  const saldoAntes = total - pagadoAntes
  const pagadoDespues = pagadoAntes + amount
  // prepaid nunca se marca paid=true (igual que la app); el resto: paid si cubre el total+interés
  const quedaPagada = nv.status === 'prepaid' ? false : (pagadoDespues >= total)
  const insertBody = { amount, client: nv.client_id, sales_request: nv.id, payment_method: met }
  if (referencia) insertBody.reference = String(referencia)
  if (ALIACE_APROBADOR_UUID) insertBody.created_by = ALIACE_APROBADOR_UUID
  if (verificar === true) {
    insertBody.is_verified = true
    insertBody.verified_at = new Date().toISOString()
    if (ALIACE_APROBADOR_UUID) insertBody.verified_by = ALIACE_APROBADOR_UUID
  }
  const plan = {
    nv: nv.id, cliente: nv.cliente, estado_nv: nv.status,
    total_con_interes_clp: total, pagado_antes: pagadoAntes, saldo_antes: saldoAntes,
    pago_a_registrar_clp: amount, metodo: met, verificado: verificar === true,
    pagado_despues: pagadoDespues, queda_pagada: quedaPagada,
    alerta_sobrepago: amount > saldoAntes ? `⚠️ El pago (${amount}) SUPERA el saldo pendiente (${saldoAntes}). La BD no lo impide; confirma que es correcto antes de ejecutar.` : null,
    inserta_en_payments: insertBody, actualiza_sales_request: { paid_amount: pagadoDespues, paid: quedaPagada },
  }
  if (dry) return { ok: true, simulacion: true, plan, nota: 'SIMULACIÓN: NO se registró ningún pago. Esto es exactamente lo que se insertaría y cómo quedaría la NV. Para ejecutarlo de verdad, vuelve a llamar con confirmado=true.' }
  // EJECUTA: 1) inserta el pago  2) recalcula con el RPC de la app  3) actualiza la NV
  const ins = await aliaceInsert('payments', insertBody)
  const pagoId = Array.isArray(ins) ? ins[0]?.id : null
  let pagadoReal = pagadoDespues
  try {
    const sum = await aliaceRpc('get_sales_request_paid_amount', { sales_request_id: nv.id })
    const n = Number(Array.isArray(sum) ? (sum[0]?.get_sales_request_paid_amount ?? sum[0]) : sum)
    if (Number.isFinite(n)) pagadoReal = Math.round(n)
  } catch { /* si el RPC falla, caemos al cálculo local (pagadoDespues) */ }
  const paidReal = nv.status === 'prepaid' ? false : (pagadoReal >= total)
  await aliacePatch('sales_request', `id=eq.${nv.id}`, { paid_amount: pagadoReal, paid: paidReal })
  return { ok: true, aplicado: true, pago_id: pagoId, nv: nv.id, cliente: nv.cliente, monto_clp: amount, metodo: met, pagado_total_clp: pagadoReal, queda_pagada: paidReal }
}

// ── EDITAR una NV (campos escalares seguros) ─────────────────────────────────
// Edita SOLO campos de cabecera sin efectos colaterales (notas, observaciones, dirección
// de entrega, fecha de vencimiento). NO toca status (eso es aliace_mover_nv), ni montos/
// items (recalcular total + reserva de stock + price_with_iva GENERATED → fuera de aquí),
// ni client_id. La app edita estos campos con UPDATE directo (useEditableOrderField).
const ALIACE_NV_CAMPOS_EDITABLES = {
  comments: 'comentarios', internal_notes: 'notas internas', factura_observations: 'observaciones de factura',
  payment_due_date: 'fecha de vencimiento de pago (timestamptz)', delivery_date: 'fecha de entrega (timestamptz)',
  delivery_street: 'calle de entrega', delivery_number: 'número', delivery_complement: 'complemento',
  delivery_city: 'ciudad', delivery_state: 'región', delivery_comuna: 'comuna',
}
async function aliaceEditarNV({ id, campos }, dry = false) {
  const uuid = String(id || '').trim()
  if (!/^[0-9a-f-]{36}$/i.test(uuid)) throw new Error(`id de NV inválido (debe ser el uuid de sales_request): "${uuid}"`)
  if (!campos || typeof campos !== 'object' || Array.isArray(campos)) throw new Error('Pásame "campos": un objeto con lo que cambiar, ej. {"internal_notes":"...", "payment_due_date":"2026-07-15"}.')
  const cambios = {}
  for (const [k, v] of Object.entries(campos)) {
    if (!(k in ALIACE_NV_CAMPOS_EDITABLES)) throw new Error(`Campo no editable por aquí: "${k}". Editables: ${Object.keys(ALIACE_NV_CAMPOS_EDITABLES).join(', ')}. (El ESTADO se cambia con aliace_mover_nv; montos/productos no se editan por aquí.)`)
    cambios[k] = v
  }
  const claves = Object.keys(cambios)
  if (!claves.length) throw new Error('No me pasaste ningún campo válido para editar.')
  const filas = await aliaceQuery(`SELECT sr.id, sr.status, c.name cliente, ${claves.map((k) => 'sr.' + k).join(', ')}
    FROM sales_request sr JOIN clients c ON c.id = sr.client_id WHERE sr.id = '${uuid}' AND sr.deleted_at IS NULL LIMIT 1`)
  const nv = filas?.[0]
  if (!nv) throw new Error(`No encontré la NV ${uuid} (¿uuid correcto? ¿está eliminada?)`)
  const antes = {}; for (const k of claves) antes[k] = nv[k]
  const plan = { nv: nv.id, cliente: nv.cliente, estado_nv: nv.status, campos: ALIACE_NV_CAMPOS_EDITABLES, antes, despues: cambios }
  if (dry) return { ok: true, simulacion: true, plan, nota: 'SIMULACIÓN: NO se escribió nada. "antes" es lo que hay hoy y "despues" lo que quedaría. Para ejecutar, vuelve a llamar con confirmado=true.' }
  const res = await aliacePatch('sales_request', `id=eq.${nv.id}`, cambios)
  return { ok: true, aplicado: true, nv: nv.id, cliente: nv.cliente, antes, cambios, fila: Array.isArray(res) ? res[0] : res }
}

// ── CREAR una NV (nota de venta) ─────────────────────────────────────────────
// ⚠️ La app, antes de crear, corre MUCHAS validaciones de negocio (cheques protestados,
// facturas vencidas impagas, cliente activo, flete obligatorio, línea de crédito, rango de
// precios) y CALCULA el status inicial. Crear por backend directo SE SALTA TODO eso. Por
// seguridad: status fijo y simple (pending por defecto), simulación obligatoria, y el plan
// LISTA las validaciones que se omiten para que el humano las revise antes de confirmar.
// Escritura igual que la app: INSERT cabecera + INSERT items. total_amount lo calculamos
// nosotros (Σ round(unit_price*qty*(1-desc/100))); price_with_iva es GENERATED (no se escribe).
const ALIACE_NV_STATUS_VALIDOS = ['pending', 'pending_pricing', 'pending_credit', 'prepaid', 'payment_to_check', 'accepted', 'por_facturar']
const ALIACE_VALIDACIONES_OMITIDAS = [
  'cheques protestados del cliente', 'facturas vencidas impagas', 'cliente activo (is_active)',
  'flete obligatorio fuera de RM/Valparaíso/O\'Higgins', 'línea de crédito disponible',
  'rango de precio por producto / condición de venta', 'cálculo automático del status inicial',
]
const lineaTotal = (it) => Math.round(Number(it.unit_price || 0) * Number(it.quantity || 0) * (1 - Number(it.discount_percent || 0) / 100))
async function aliaceCrearNV({ client_id, items, status, comentarios, payment_terms }, dry = false) {
  const cid = String(client_id || '').trim()
  if (!/^[0-9a-f-]{36}$/i.test(cid)) throw new Error('client_id inválido (debe ser el uuid del cliente en clients). Búscalo con aliace_sql.')
  if (!Array.isArray(items) || !items.length) throw new Error('Pásame "items": lista de líneas [{product_id, quantity, unit_price, discount_percent?}].')
  const lineas = items.map((it, i) => {
    const pid = String(it.product_id || '').trim()
    if (!/^[0-9a-f-]{36}$/i.test(pid)) throw new Error(`item[${i}].product_id inválido (uuid de products). Búscalo con aliace_sql.`)
    const q = Number(it.quantity), up = Number(it.unit_price)
    if (!(q > 0)) throw new Error(`item[${i}].quantity debe ser > 0.`)
    if (!(up >= 0)) throw new Error(`item[${i}].unit_price debe ser >= 0.`)
    const disc = Number(it.discount_percent || 0)
    if (disc < 0 || disc > 100) throw new Error(`item[${i}].discount_percent debe estar entre 0 y 100.`)
    return { product_id: pid, quantity: q, unit_price: up, discount_percent: disc }
  })
  const est = status ? String(status).trim() : 'pending'
  if (!ALIACE_NV_STATUS_VALIDOS.includes(est)) throw new Error(`status inicial "${est}" no permitido aquí. Válidos: ${ALIACE_NV_STATUS_VALIDOS.join(', ')}.`)
  // datos del cliente para payment_terms / sales_condition_id (igual que la app)
  const cli = (await aliaceQuery(`SELECT id, name, is_active, trailing_payment_days, sales_condition_id FROM clients WHERE id = '${cid}' AND deleted_at IS NULL LIMIT 1`))?.[0]
  if (!cli) throw new Error(`No encontré el cliente ${cid} (¿uuid correcto? ¿eliminado?)`)
  const terms = Number.isFinite(Number(payment_terms)) ? Math.round(Number(payment_terms)) : (Number(cli.trailing_payment_days) || 30)
  const total = lineas.reduce((s, it) => s + lineaTotal(it), 0)
  const dueDate = new Date(Date.now() + terms * 86400000).toISOString()
  const cabecera = {
    client_id: cid, created_by: ALIACE_APROBADOR_UUID, status: est, total_amount: total,
    payment_terms: terms, payment_type: 'future', payment_due_date: dueDate,
    sales_condition_id: cli.sales_condition_id || null, comments: comentarios ? String(comentarios) : null,
  }
  const itemsPreview = lineas.map((it) => ({ ...it, total_linea_clp: lineaTotal(it) }))
  const plan = {
    cliente: cli.name, cliente_activo: cli.is_active, status_inicial: est,
    total_amount_clp: total, price_with_iva_estimado: Math.round(total * 1.19),
    payment_terms_dias: terms, vence: dueDate.slice(0, 10),
    cabecera_a_insertar: cabecera, items_a_insertar: itemsPreview,
    validaciones_OMITIDAS: ALIACE_VALIDACIONES_OMITIDAS,
    advertencia: '⚠️ Crear por backend SE SALTA las validaciones de la app (lista arriba) y el cálculo automático del status. Revisa cliente, productos, precios y status ANTES de confirmar.',
  }
  if (!ALIACE_APROBADOR_UUID) throw new Error('No puedo crear la NV: falta ALIACE_APROBADOR_UUID en ~/nexus/.env (se usa como created_by). Pídeselo a Ramón.')
  if (dry) return { ok: true, simulacion: true, plan, nota: 'SIMULACIÓN: NO se creó nada. Revisa el plan (sobre todo validaciones_OMITIDAS) y, si está OK, vuelve a llamar con confirmado=true.' }
  // EJECUTA: cabecera primero, luego items. Si los items fallan, soft-delete de la cabecera
  // para no dejar una NV huérfana (la app no lo hace; nosotros sí, por cuidado).
  const ins = await aliaceInsert('sales_request', cabecera)
  const nvId = Array.isArray(ins) ? ins[0]?.id : ins?.id
  if (!nvId) throw new Error('La cabecera no devolvió id; aborto sin insertar items.')
  try {
    await aliaceInsert('sales_request_items', lineas.map((it) => ({ sales_request_id: nvId, ...it })))
  } catch (e) {
    try { await aliacePatch('sales_request', `id=eq.${nvId}`, { deleted_at: new Date().toISOString() }) } catch { /* ignora */ }
    throw new Error(`Creé la cabecera ${nvId} pero FALLÓ insertar los items (${e.message}). Anulé la cabecera (deleted_at) para no dejar una NV a medias.`)
  }
  return { ok: true, aplicado: true, nv: nvId, cliente: cli.name, status: est, total_amount_clp: total, items: lineas.length }
}

// ── MARGEN DE ALIACE (igual que la app) ──────────────────────────────────────
// La app NO tiene un reporte de margen pre-hecho: lo calcula como INGRESO NETO
// (sin IVA) − COSTO WAC real. El costo sale de costing_movements (líneas de venta,
// movement_class='sale', unit_cost_clp = costo promedio ponderado capturado al vender);
// el ingreso es total_amount/unit_price, que YA son netos (sin IVA; el bruto vive en
// price_with_iva). Por eso debe compararse NETO vs NETO. Improvisarlo con aliace_sql
// daba mal (mezclar IVA o usar precio en vez de costo WAC). Solo cuenta líneas YA
// costeadas: el mes en curso puede subir a medida que se costea/cierra el período.

// ── MESES COSTEADOS (para saber de qué meses SÍ hay margen) ───────────────────
// El margen depende del WAC del módulo de costeo de Aliace (costing_periods +
// costing_movements). Si un mes no tiene período de costeo con movimientos de venta,
// su margen NO es calculable (no es falla de Nexus: falta que el equipo de costos
// procese ese mes). Devuelve qué meses están realmente costeados (con ventas WAC),
// su estado (open/closed) y el más reciente, para orientar al usuario.
async function aliaceMesesCosteados() {
  const filas = await aliaceQuery(`
    SELECT p.period, p.status,
      (SELECT COUNT(*) FROM costing_movements m
         WHERE to_char(m.movement_date,'YYYY-MM') = p.period AND m.movement_class='sale') AS sale_movs
    FROM costing_periods p
    ORDER BY p.period`)
  const periodos = (Array.isArray(filas) ? filas : []).map((f) => ({
    mes: f.period, estado: f.status, con_ventas_costeadas: Number(f.sale_movs || 0) > 0,
  }))
  const costeados = periodos.filter((p) => p.con_ventas_costeadas).map((p) => p.mes)
  return {
    meses_costeados: costeados,                    // ej. ['2026-06']
    ultimo_costeado: costeados.length ? costeados[costeados.length - 1] : null,
    periodos,                                       // detalle con estado open/closed
    nota: costeados.length
      ? `El margen solo es calculable para meses con costeo WAC cargado: ${costeados.join(', ')}. Para otros meses el equipo de costos de Aliace debe abrir/procesar el período de costeo.`
      : 'Aún no hay ningún mes con costeo WAC cargado en Aliace: el margen no es calculable hasta que el equipo de costos procese algún período.',
  }
}

// ── MARGEN ESTIMADO (meses SIN costeo WAC) ───────────────────────────────────
// Para meses que el módulo WAC aún no procesó (mayo y anteriores), Aliace mantiene
// `unit_costs`: costo mensual por producto (la tabla que usaban antes del WAC). Se
// enlaza a las ventas (bi_transactions) por NOMBRE de producto —igual criterio que el
// propio costeo—. VALIDADO contra el WAC real de junio 2026: estimado 22,7% vs WAC
// 23,4% (Δ ~0,7 pto), o sea es un proxy fiable. OJO: es un ESTIMADO, no el WAC oficial
// (cobertura ~93%, match por nombre); SIEMPRE se reporta etiquetado como tal. Netea el
// ingreso de NC (costo de NC 0, igual criterio que el margen real). Devuelve null si
// no hay unit_costs de ese mes o no matchea nada (→ el mes queda "no calculable").
async function aliaceMargenEstimado(anio, mes, ncMonto = 0) {
  const mesISO = `${anio}-${String(mes).padStart(2, '0')}`
  const ini = `${mesISO}-01`
  const fin = mes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 1).padStart(2, '0')}-01`
  const r = (await aliaceQuery(`
    SELECT
      COALESCE(SUM(bt.total_neto), 0) ventas_bi,
      COALESCE(SUM(bt.total_neto) FILTER (WHERE uc.unit_cost IS NOT NULL), 0) ventas_con_costo,
      COALESCE(SUM(bt.cantidad * uc.unit_cost), 0) costo_estimado,
      COUNT(*) lineas, COUNT(*) FILTER (WHERE uc.unit_cost IS NOT NULL) lineas_con_costo
    FROM bi_transactions bt
    LEFT JOIN unit_costs uc
      ON lower(trim(uc.product_name)) = lower(trim(bt.producto)) AND uc.month_year = '${mesISO}'
    WHERE bt.fecha_emision >= '${ini}' AND bt.fecha_emision < '${fin}'`))?.[0]
  const ventasConCosto = Number(r?.ventas_con_costo || 0)
  if (!r || ventasConCosto <= 0) return null   // sin unit_costs de ese mes → no estimable
  const ventasBi = Number(r.ventas_bi || 0)
  const costoEst = Number(r.costo_estimado || 0)
  const nc = Number(ncMonto || 0)              // ingreso de NC del mes (positivo)
  const ventasNetas = ventasConCosto - nc      // netea devoluciones (costo NC estimado = 0)
  const margenBruto = ventasNetas - costoEst
  return {
    es_estimado: true,
    fuente_costo: 'ESTIMADO con unit_costs (costo mensual por producto de Aliace) — NO es el WAC oficial',
    ventas_con_costo: ventasConCosto, notas_credito: -nc, ventas_netas: ventasNetas,
    costo_estimado: costoEst, margen_bruto: margenBruto,
    margen_pct: ventasNetas ? margenBruto / ventasNetas : 0,     // FRACCIÓN
    cobertura_pct: ventasBi ? Math.round((ventasConCosto / ventasBi) * 1000) / 10 : null,
    validacion: 'Contrastado con el WAC real de junio 2026: estimado 22,7% vs WAC 23,4% (Δ ~0,7 pto). Suele quedar levemente por debajo del real.',
  }
}

async function aliaceMargen({ fecha, id } = {}) {
  const num = (n) => Math.round(Number(n || 0))
  if (id) {
    const uuid = String(id).trim()
    if (!/^[0-9a-f-]{36}$/i.test(uuid)) throw new Error('id de NV inválido (debe ser el uuid de sales_request)')
    // Igual que FacturasTable: ingreso = net_amount NETO de la(s) factura(s) emitidas
    // (BSale), costo = WAC real. Si la NV aún no tiene factura, cae al total NV (estimado).
    const r = (await aliaceQuery(`
      SELECT sr.total_amount::numeric nv_total,
        (SELECT COALESCE(SUM(srd.net_amount),0) FROM sales_request_documents srd
           WHERE srd.sales_request_id=sr.id AND srd.document_type='factura' AND srd.deleted_at IS NULL) ingreso_factura,
        COALESCE(c.cost_total_clp,0)::numeric costo, COALESCE(c.costed_line_count,0) costeadas,
        (SELECT COUNT(*) FROM sales_request_items i WHERE i.sales_request_id=sr.id AND i.deleted_at IS NULL) total_lineas
      FROM sales_request sr LEFT JOIN LATERAL get_sales_request_costs(ARRAY[sr.id]) c ON true
      WHERE sr.id='${uuid}' AND sr.deleted_at IS NULL`))?.[0]
    if (!r) throw new Error(`No encontré la NV ${uuid}`)
    const facturado = num(r.ingreso_factura)
    const ingreso = facturado > 0 ? facturado : num(r.nv_total)
    const costo = num(r.costo)
    const completo = Number(r.costeadas) >= Number(r.total_lineas) && Number(r.total_lineas) > 0
    return {
      fuente: 'aliace_margen (igual que la app: ingreso NETO de factura − costo WAC)', tipo: 'nota_venta', id: uuid,
      base_ingreso: facturado > 0 ? 'net_amount de la(s) factura(s) emitida(s)' : 'total de la NV (aún SIN factura: estimado)',
      ingreso_neto: ingreso, costo: costo, margen: ingreso - costo,
      margen_pct: ingreso ? Math.round((ingreso - costo) / ingreso * 1000) / 10 : null,
      cobertura_costeo: `${num(r.costeadas)}/${num(r.total_lineas)} líneas con costo`,
      nota: completo ? 'Todas las líneas costeadas.' : '⚠️ Faltan líneas por costear: el margen puede estar incompleto.',
    }
  }
  // MARGEN DEL MES — el CORRECTO es el NETO de devoluciones (estilo Power BI): ventas
  // netas = facturas − NC, costo = WAC ventas − WAC devoluciones, % sobre ventas netas.
  // aliaceFacturasApp lo trae en margen_neto_bi (misma data verificada de la app). La
  // réplica de la pantalla (sin netear NC) queda como cotejo.
  const P = resumenMesPeriodo(fecha)
  // Traemos margen + meses costeados EN PARALELO (una query liviana extra, sin sumar
  // latencia): si el mes pedido no está costeado, el modelo puede decir cuáles SÍ lo están.
  const [fa, costeo] = await Promise.all([
    aliaceFacturasApp(P.anio, P.mes),
    aliaceMesesCosteados().catch(() => null),
  ])
  const nb = fa.margen_neto_bi
  const mesISO = `${P.anio}-${String(P.mes).padStart(2, '0')}`
  const mesCosteado = !!(costeo && costeo.meses_costeados.includes(mesISO))
  const sinCosteo = !mesCosteado && (nb.cobertura_costeo_pct == null || nb.cobertura_costeo_pct === 0)

  // Mes SIN WAC oficial: intentamos un margen ESTIMADO con unit_costs (etiquetado).
  if (sinCosteo) {
    const est = await aliaceMargenEstimado(P.anio, P.mes, fa.notas_credito_monto).catch(() => null)
    if (est) return {
      fuente: 'aliace_margen — margen ESTIMADO (unit_costs), el mes NO tiene WAC oficial cargado', tipo: 'mes', mes: P.mes, anio: P.anio,
      es_estimado: true, margen_calculable: true,
      ventas_netas: est.ventas_netas, notas_credito: est.notas_credito,
      costo_estimado: est.costo_estimado, margen_bruto: est.margen_bruto,
      margen_pct: est.margen_pct, margen_pct_texto: pctTexto(est.margen_pct),
      cobertura_pct: est.cobertura_pct,
      monto_total_facturado_sin_iva: fa.monto_total_facturado_sin_iva,
      fuente_costo: est.fuente_costo, validacion: est.validacion,
      costeo: costeo || undefined,
      instruccion: `⚠️ MARGEN ESTIMADO (no oficial): ${mesISO} NO tiene costeo WAC en Aliace, así que el costo se estimó con unit_costs (tabla de costo mensual por producto de Aliace), matcheado por nombre con ${est.cobertura_pct}% de cobertura. En el apartado "Margen" MUESTRA SOLO tres líneas: • Costo de Ventas (estimado) = costo_estimado • Margen Bruto = margen_bruto • Margen % = margen_pct_texto. NO pongas "Ventas netas" en ese apartado. Márcalo SIEMPRE como "estimado (unit_costs), no es el WAC oficial" con una línea de aviso debajo. Es fiable (validado a ~0,7 pto del WAC real de junio) pero NO lo presentes como cifra oficial. Los meses con WAC (costeo.meses_costeados) sí son oficiales. margen_pct es FRACCIÓN → usa margen_pct_texto.`,
    }
  }
  return {
    fuente: 'aliace_margen (NETO de devoluciones, estilo Power BI · misma data que la app)', tipo: 'mes', mes: P.mes, anio: P.anio,
    // MARGEN CORRECTO (neto de NC), preciso:
    ventas: nb.ventas, notas_credito: nb.notas_credito, ventas_netas: nb.ventas_netas,
    costo_ventas_fact: nb.costo_ventas_fact, costo_devoluciones: nb.costo_devoluciones,
    costo_ventas_total: nb.costo_ventas_total,
    margen_bruto: nb.margen_bruto, margen_pct: nb.margen_pct, // margen_pct es FRACCIÓN (0.40 = 40%)
    margen_pct_texto: pctTexto(nb.margen_pct),
    cobertura_costeo_pct: nb.cobertura_costeo_pct,
    margen_calculable: !sinCosteo,
    monto_total_facturado_sin_iva: fa.monto_total_facturado_sin_iva,
    // qué meses SÍ tienen costeo WAC cargado (para orientar cuando el pedido no lo tiene):
    costeo: costeo || undefined,
    // COTEJO con la pantalla Facturas de la app (NO netea NC), solo para comparar:
    cotejo_app: { costo_ventas_wac: fa.costo_ventas_wac, ventas_con_costo: fa.ventas_con_costo, margen_bruto: fa.margen_bruto, margen_pct: fa.margen_pct },
    instruccion: (sinCosteo
      ? `⚠️ El margen de este mes NO es calculable: el costeo WAC de ${mesISO} tiene 0% de cobertura (el equipo de costos de Aliace aún no procesó ese período). NO inventes un margen. Reporta el Facturado (monto_total_facturado_sin_iva) y di claramente que el margen no está disponible por falta de costeo. Dile al usuario qué meses SÍ están costeados usando costeo.meses_costeados (y ultimo_costeado como referencia). `
      : 'MARGEN CORRECTO = margen_bruto / margen_pct de este objeto (NETO de notas de crédito, calculado sobre ventas netas). En el apartado "Margen" MUESTRA SOLO estas TRES líneas, nada más: • Costo de Ventas (WAC) = costo_ventas_total • Margen Bruto = margen_bruto • Margen % = margen_pct_texto. NO pongas "Ventas netas" ni "Cobertura de costeo" en ese apartado (esas cifras pertenecen a Facturación, no a Margen). OJO: margen_pct es una FRACCIÓN — usa margen_pct_texto para mostrarlo. Si cobertura_costeo_pct es bajo (<99%), agrega DEBAJO de las tres líneas UNA sola línea corta de aviso ("costeo del mes incompleto, el margen puede afinarse al terminar de costear"), sin ponerla como métrica ni como porcentaje destacado. ') +
      'cotejo_app es la pantalla Facturas de la app (sin netear NC); úsalo solo si te lo piden comparar. La app advierte: "Costos y márgenes: información en revisión, no oficial". Si hay margen, acompaña con un gráfico (Margen vs Costo).',
  }
}

// FETCH DEDICADO para Anthropic (causa raíz del cuelgue "Request timed out"):
// el dispatcher global de fetch de Node lo comparten TODAS las llamadas del hub
// (Supabase/Aliace, conectores, etc.); tras unos requests ese pool se envenenaba
// y NINGUNA conexión nueva a api.anthropic.com volvía a abrir → el modelo no
// respondía ni el primer byte y el turno se colgaba (en WhatsApp y en desktop).
// Solución: el SDK usa su PROPIO fetch (undici aparte, con su Agent), aislado del
// global. keepAlive corto para no reutilizar sockets que el server ya cerró.
// SIN keep-alive: cada request abre conexión TCP fresca y la cierra. El cuelgue
// real era reutilizar un socket keep-alive que quedaba muerto tras el request
// anterior (TCP establecido pero la respuesta nunca llegaba). Conexión fresca lo
// elimina; cuesta ~20ms de handshake TLS, irrelevante para este volumen.
// Dispatcher (undici Agent) DEDICADO y REALMENTE aislado para Anthropic. El código
// anterior PROMETÍA aislamiento en el comentario pero usaba globalThis.fetch → el MISMO
// pool global de undici que comparten Supabase/Aliace/GoAutos. Cuando el watchdog
// abortaba un stream lento, ese abort dejaba sockets keep-alive muertos en el pool
// global; los connects nuevos a api.anthropic.com se colgaban 10s → UND_ERR_CONNECT_TIMEOUT
// y NINGUNA llamada volvía a abrir hasta reiniciar el hub (de ahí "antes funcionaba":
// se rompía recién tras el primer abort). Aislar de verdad + forzar IPv4 a nivel socket
// (family:4, sin depender del orden DNS) + reciclar el Agent ante un connect timeout hace
// que el pool se auto-sane en vez de quedar muerto.
// ── RESOLUCIÓN DNS FUERA DEL THREADPOOL (cura definitiva del connect timeout) ──
// El connect a api.anthropic.com fallaba con UND_ERR_CONNECT_TIMEOUT cada ~10s
// porque undici/net usa dns.lookup() (getaddrinfo), que corre en el THREADPOOL de
// libuv. Cuando ese pool se satura o se BLOQUEA (p.ej. un open() colgado del symlink
// al Desktop del vault cerebro deja hilos pegados en __open para siempre), las
// resoluciones DNS quedan en cola y NUNCA salen → todo connect al modelo expira,
// aunque la red esté perfecta (curl conecta en 8ms) y reiniciar el hub lo "arregle".
// dns.resolve4() usa c-ares, que corre en el EVENT LOOP (NO en el threadpool), así
// que la conexión al modelo deja de depender del estado del threadpool. Cacheamos la
// IP 30s y, solo si c-ares falla, caemos a getaddrinfo. Esto rompe el acoplamiento
// entre "fs lento del Desktop" y "el modelo no responde".
const _dnsCache = new Map() // host -> { ips:[], exp:ms }
function _lookupCAres(hostname, options, cb) {
  if (typeof options === 'function') { cb = options; options = {} }
  const all = options && options.all
  const ahora = performance.now()
  const servir = (ips) => all
    ? cb(null, ips.map((address) => ({ address, family: 4 })))
    : cb(null, ips[0], 4)
  const hit = _dnsCache.get(hostname)
  if (hit && hit.exp > ahora && hit.ips.length) return servir(hit.ips)
  dns.resolve4(hostname, (err, ips) => {
    if (err || !ips || !ips.length) return dns.lookup(hostname, options, cb) // fallback c-ares→getaddrinfo
    _dnsCache.set(hostname, { ips, exp: ahora + 30000 })
    servir(ips)
  })
}
function _nuevoAgenteAnthropic() {
  return new UndiciAgent({
    // family:4 (solo IPv4: esta máquina no tiene ruta IPv6) + lookup por c-ares
    // (fuera del threadpool) → el connect al modelo no se cuelga aunque el pool esté lleno.
    connect: { family: 4, timeout: 10000, lookup: _lookupCAres },
    keepAliveTimeout: 10000,
    keepAliveMaxTimeout: 30000,
    // Pool COMPARTIDO por todas las personas a la vez. Cada turno de Nexus hace
    // varias llamadas al modelo en cadena; con 8 el techo era ~8 turnos activos y
    // el 9º quedaba en cola esperando socket (se sentía "colgado" al entrar más
    // gente). 64 da holgura para muchas conversaciones concurrentes.
    connections: 64,
  })
}
let _agenteAnthropic = _nuevoAgenteAnthropic()
function _reciclarAgenteAnthropic() {
  const viejo = _agenteAnthropic
  _agenteAnthropic = _nuevoAgenteAnthropic()
  // close() (graceful) en vez de destroy() (abortivo): las peticiones EN VUELO de
  // OTRAS personas terminan tranquilas; el agente viejo solo deja de aceptar nuevas.
  // Antes, un connect-timeout de UNA persona destruía el pool y cortaba a TODOS.
  try { viejo?.close?.() ?? viejo?.destroy?.() } catch { /* */ }
}
const _anthropicFetch = async (url, init = {}) => {
  const t0 = performance.now()
  try { console.log(`[fetch] → ${String(url).slice(8, 40)}…`) } catch { /* */ }
  try {
    const r = await undiciFetch(url, { ...init, dispatcher: _agenteAnthropic })
    try { console.log(`[fetch] ← headers en ${Math.round(performance.now() - t0)}ms status=${r.status}`) } catch { /* */ }
    return r
  } catch (e) {
    const code = `${e?.cause?.code || e?.code || ''} ${e?.message || ''} ${e?.cause?.message || ''}`
    try { console.log(`[fetch] ✗ ERROR en ${Math.round(performance.now() - t0)}ms: ${e?.name} ${e?.message} cause=${e?.cause?.code || e?.cause?.message || ''}`) } catch { /* */ }
    // Connect timeout / socket muerto → el Agent quedó envenenado: reciclarlo para que el
    // reintento (SDK maxRetries o llamarModelo) abra conexiones FRESCAS y no re-falle igual.
    if (/UND_ERR_CONNECT_TIMEOUT|UND_ERR_SOCKET|ECONNRESET|ETIMEDOUT|ConnectTimeout/i.test(code)) {
      try { _reciclarAgenteAnthropic() } catch { /* */ }
    }
    throw e
  }
}
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ timeout: 300000, maxRetries: 2, fetch: _anthropicFetch })
  : null

// Llama al modelo en streaming con WATCHDOG POR INACTIVIDAD. El cuelgue real:
// a veces la conexión a la API queda muerta (socket abierto pero NO llega ni un
// byte de respuesta) y el turno se cuelga hasta el timeout → "Request timed out".
// Pero una respuesta legítima con thinking adaptativo puede tardar 1-2 MINUTOS
// (probado: hasta 132s) emitiendo tokens todo el rato. Por eso NO medimos tiempo
// total: medimos INACTIVIDAD. Mientras el stream emita eventos (deltas de thinking
// o texto), lo dejamos seguir. Si pasan `inactividadMaxMs` SIN ningún evento, la
// conexión está muerta → abortamos y reintentamos en conexión nueva.
async function llamarModelo(params, { intentos = 2, inactividadMaxMs = 45000, onText = null } = {}) {
  let ultimoError
  for (let intento = 1; intento <= intentos; intento++) {
    const ac = new AbortController()
    const st = anthropic.messages.stream(params, { signal: ac.signal })
    let ultimoEvento = performance.now()
    const iv = setInterval(() => {
      if (performance.now() - ultimoEvento > inactividadMaxMs) {
        try { console.log(`[modelo] ${inactividadMaxMs}ms sin actividad del stream (conexión muerta) → aborto y reintento ${intento}/${intentos}`) } catch { /* */ }
        try { ac.abort() } catch { /* */ }
      }
    }, 5000)
    iv.unref?.()
    st.on('streamEvent', () => { ultimoEvento = performance.now() })
    // Reenvía cada trozo de texto en cuanto el modelo lo va generando (solo el 1er
    // intento, para no duplicar audio si hay reintento por conexión muerta).
    if (onText && intento === 1) st.on('text', (d) => { try { onText(d) } catch { /* */ } })
    try {
      const m = await st.finalMessage()
      clearInterval(iv)
      return m
    } catch (e) {
      clearInterval(iv)
      ultimoError = e
      if (intento >= intentos) throw e
      continue
    }
  }
  throw ultimoError
}

// ── Envío de fotos por WhatsApp (vía CLI de OpenClaw) ────────────────────────
// OpenClaw expone `message send --channel whatsapp --target <E.164> --media <url>
// --message <caption>`, que acepta URLs directas (las fotos de GoAutos en Supabase
// son públicas). Lo usamos para mandar 1 tarjeta por auto al usuario que pregunta.
const OPENCLAW_CLI = join(process.env.HOME || '', '.npm-global', 'lib', 'node_modules', 'openclaw', 'openclaw.mjs')
// Token del gateway de OpenClaw: cuando OpenClaw lanza comandos del agente inyecta
// OPENCLAW_GATEWAY_TOKEN; el daemon del Hub NO lo tiene, así que el CLI no podía
// autenticar contra el gateway y se colgaba. Lo leemos de openclaw.json y lo pasamos.
let OPENCLAW_TOKEN = ''
try {
  OPENCLAW_TOKEN = JSON.parse(readFileSync(join(process.env.HOME || '', '.openclaw', 'openclaw.json'), 'utf8'))?.gateway?.auth?.token || ''
} catch { /* sin token; el CLI intentará leer config solo */ }
// El allowlist de WhatsApp ahora es dinámico: fundadores + usuarios dados de alta
// (ver cargarUsuarios / destinoValido más abajo).
function normNum(s) {
  const d = String(s || '').replace(/[^0-9]/g, '')
  return d ? '+' + d.replace(/^0+/, '') : ''
}
// ── Usuarios de Nexus (alta/gestión por los fundadores) ───────────────────────
// Ramón y Nico son FUNDADORES: admin, acceso total, y los únicos que pueden dar
// de alta a otros. Los demás usuarios viven en ~/nexus/usuarios.json con accesos
// acotados. Las "scopes" mapean a grupos de herramientas (ver SCOPE_TOOLS).
const RUTA_USUARIOS = join(process.env.HOME || '', 'nexus', 'usuarios.json')
const RUTA_OPENCLAW = join(process.env.HOME || '', '.openclaw', 'openclaw.json')
const SCOPES = ['aliace', 'sii', 'mallorca', 'correo', 'bd', 'cerebro', 'banco']
// Nombre legible + qué puede hacer cada scope (para el mensaje de bienvenida).
const SCOPE_INFO = {
  aliace: '📊 *Aliace* — facturación, ventas, pagos, cobranzas, deudas, metas y clientes',
  sii: '🧾 *SII* — información tributaria (F29, compras y ventas, etc.)',
  mallorca: '🚗 *MallorcAutos* — stock de autos, publicar/editar autos y datos del negocio',
  correo: '📧 *Correos* — revisar y buscar correos',
  bd: '🗄️ *Base de datos* del negocio (competencia, precios, catálogo)',
  cerebro: '🧠 *Segundo Cerebro* — notas y conocimiento',
}
const FUNDADORES = {
  '+56932945240': { nombre: 'Ramon', admin: true, accesos: SCOPES },
  '+56975481858': { nombre: 'Nico', admin: true, accesos: SCOPES },
}
// Lee el store (tolerante a archivo ausente/corrupto). Los fundadores SIEMPRE
// mandan: no se pueden pisar ni borrar desde el store.
function cargarUsuarios() {
  let extra = {}
  try { extra = JSON.parse(readFileSync(RUTA_USUARIOS, 'utf8')) || {} } catch { extra = {} }
  const out = {}
  for (const [num, u] of Object.entries(extra)) {
    const n = normNum(num); if (!n || FUNDADORES[n]) continue
    out[n] = {
      nombre: u?.nombre || 'Usuario', admin: false,
      accesos: Array.isArray(u?.accesos) ? u.accesos.filter((s) => SCOPES.includes(s)) : [],
      creado: u?.creado, creado_por: u?.creado_por,
    }
  }
  for (const [n, u] of Object.entries(FUNDADORES)) out[n] = u
  return out
}
function usuarioDe(de) { return cargarUsuarios()[normNum(de)] || null }
function esAdmin(de) { return Boolean(usuarioDe(de)?.admin) }
function accesosDe(de) { const u = usuarioDe(de); return u ? (u.admin ? SCOPES : u.accesos) : [] }
// Solo los números dados de alta (fundadores + store) pueden hablarle a Nexus.
function destinoValido(de) {
  const n = normNum(de)
  return cargarUsuarios()[n] ? n : ''
}
function guardarUsuarioStore(num, datos) {
  let extra = {}
  try { extra = JSON.parse(readFileSync(RUTA_USUARIOS, 'utf8')) || {} } catch { extra = {} }
  for (const k of Object.keys(extra)) if (normNum(k) === normNum(num)) delete extra[k]
  extra[normNum(num)] = datos
  writeFileSync(RUTA_USUARIOS, JSON.stringify(extra, null, 2))
}
function quitarUsuarioStore(num) {
  let extra = {}
  try { extra = JSON.parse(readFileSync(RUTA_USUARIOS, 'utf8')) || {} } catch { extra = {} }
  let habia = false
  for (const k of Object.keys(extra)) if (normNum(k) === normNum(num)) { delete extra[k]; habia = true }
  writeFileSync(RUTA_USUARIOS, JSON.stringify(extra, null, 2))
  return habia
}
// OpenClaw (WhatsApp) filtra los entrantes con channels.whatsapp.allowFrom +
// dmPolicy "allowlist". Para que el usuario nuevo pueda ESCRIBIRLE a Nexus hay que
// sumar su número ahí (en sus dos formas: +569… y 569…). Devuelve true si quedó OK.
function permitirEnOpenclaw(num) {
  try {
    const cfg = JSON.parse(readFileSync(RUTA_OPENCLAW, 'utf8'))
    const arr = cfg?.channels?.whatsapp?.allowFrom
    if (!Array.isArray(arr)) return false
    const n = normNum(num), bare = n.replace(/^\+/, '')
    let cambio = false
    for (const v of [n, bare]) if (!arr.includes(v)) { arr.push(v); cambio = true }
    if (cambio) writeFileSync(RUTA_OPENCLAW, JSON.stringify(cfg, null, 2))
    return true
  } catch { return false }
}
function revocarEnOpenclaw(num) {
  try {
    const cfg = JSON.parse(readFileSync(RUTA_OPENCLAW, 'utf8'))
    const arr = cfg?.channels?.whatsapp?.allowFrom
    if (!Array.isArray(arr)) return
    const n = normNum(num), bare = n.replace(/^\+/, '')
    cfg.channels.whatsapp.allowFrom = arr.filter((v) => v !== n && v !== bare)
    writeFileSync(RUTA_OPENCLAW, JSON.stringify(cfg, null, 2))
  } catch { /* */ }
}
// OpenClaw lee su allowlist solo al conectar (no hay reload en caliente). Tras un
// alta/baja, lanzamos finalizar-alta.mjs DETACHED: espera, reinicia OpenClaw (que
// reconecta solo, sin QR) y —si hay mensaje— le manda la bienvenida al usuario nuevo.
// Va en segundo plano para NO cortar la respuesta en curso al fundador.
async function programarRecargaOpenclaw(numero, mensaje) {
  try {
    const ruta = join('/tmp', `nexus-bienvenida-${normNum(numero).replace(/\D/g, '')}.txt`)
    if (mensaje) writeFileSync(ruta, mensaje)
    const script = join(__dirname, 'finalizar-alta.mjs')
    const { spawn } = await import('node:child_process')
    const ch = spawn(process.execPath, [script, normNum(numero), mensaje ? ruta : '-'], { detached: true, stdio: 'ignore' })
    ch.unref()
    return true
  } catch { return false }
}
// Mapa scope → herramientas que habilita. Lo que no aparece aquí (graficar,
// gestión de usuarios) no requiere scope. Sirve para el control de acceso real.
const SCOPE_TOOLS = {
  aliace: ['aliace_rpc', 'aliace_sql', 'aliace_margen', 'aliace_mover_nv', 'aliace_pago', 'aliace_editar_nv', 'aliace_crear_nv', 'guia_aliace', 'navegar', 'ver_pestanas', 'cambiar_pestana', 'leer_pagina', 'captura_pantalla', 'escribir_en_campo', 'clic', 'esperar', 'leer_tabla', 'iniciar_sesion', 'guardar_credencial', 'listar_sitios'],
  sii: ['sii', 'sii_boleta_honorarios', 'sai_conciliacion', 'sai_buscar_factura', 'sai_movimientos_banco', 'sai_mallorca_compras'],
  mallorca: ['consultar_goautos', 'editar_goautos', 'adquisicion_goautos', 'cliente_goautos', 'editar_venta_goautos', 'vender_goautos', 'gasto_goautos', 'subir_auto', 'consultar_mallorca', 'enviar_fotos_autos', 'leads_goautos', 'lead_estado_goautos', 'citas_goautos', 'financiamiento_goautos', 'documentos_goautos', 'marketing_goautos', 'equipo_goautos', 'gastos_fijos_goautos', 'config_goautos', 'tasar_auto', 'crear_tarea_goautos', 'crear_cotizacion_goautos', 'crear_reserva_goautos'],
  correo: ['correo', 'gmail_documentos'],
  bd: ['listar_tablas', 'consultar_bd'],
  cerebro: ['buscar_cerebro', 'guardar_nota', 'plaud_estado', 'mi_dia'],
  banco: ['banco', 'tek_transferir', 'tek_pago'],
}
function scopeDeTool(nombre) {
  for (const [s, tools] of Object.entries(SCOPE_TOOLS)) if (tools.includes(nombre)) return s
  return null
}
const GESTION_USUARIOS = ['agregar_usuario', 'listar_usuarios', 'quitar_usuario']
// Arma el mensaje de bienvenida con la lista de lo que el usuario puede hacer.
function mensajeBienvenida(nombre, accesos) {
  const lineas = (accesos || []).filter((s) => SCOPE_INFO[s]).map((s) => '• ' + SCOPE_INFO[s])
  return `¡Hola ${nombre}! 👋 Bienvenido/a a *Nexus*, el asistente del negocio.\n\n`
    + (lineas.length
      ? `Tienes acceso a:\n${lineas.join('\n')}\n\nEscríbeme por aquí y pídeme lo que necesites de esas áreas. 🚀`
      : `Por ahora no tienes áreas habilitadas; Ramón o Nico te las activarán. 🙌`)
}

// ── Perfil por persona (segundo cerebro Obsidian) ─────────────────────────────
// Según quién escribe, se carga su perfil + el contexto común desde el vault.
// IMPORTANTE: el vault vive en ~/nexus/cerebro (symlink al Desktop). Antes esto
// se leía con readFileSync EN LA RUTA DE CADA MENSAJE; si el open() del FS se
// trababa (p.ej. archivo en la nube/Desktop), congelaba TODO el hub porque el
// event loop es de un solo hilo. Ahora los perfiles se cachean en memoria y se
// refrescan en segundo plano con lecturas async + timeout: el hilo principal
// NUNCA toca disco al atender una petición; un FS lento solo deja el perfil algo
// viejo, jamás cuelga la nexus.
const VAULT = process.env.CEREBRO_RUTA || join(process.env.HOME || '', 'nexus', 'cerebro')
const _perfilCache = new Map()      // ruta relativa -> contenido (string)
let _perfilRefrescando = false
function _relPerfiles(user) { return [`90-Agente/Perfiles/${user}.md`, '90-Agente/Perfiles/_Comun.md'] }
const _perfilLeyendo = new Set()    // rutas con un readFile AÚN sin resolver (open() posiblemente colgado)
async function _leerConTimeout(abs, ms = 2000) {
  // Si ya hay una lectura de este archivo SIN resolver, NO lanzamos otra. El FS del
  // Desktop (symlink del vault) puede dejar el open() colgado y el hilo de libuv pegado
  // para siempre; el Promise.race libera el JS pero NO el hilo. Relanzar cada 60s iría
  // agotando el threadpool → y un threadpool lleno mata el dns.lookup → "Request timed
  // out" del modelo. Con este guard, los hilos pegados se topan en (nº de perfiles), no
  // crecen sin límite; cuando el archivo vuelva a leerse, la promesa resuelve y se libera.
  if (_perfilLeyendo.has(abs)) throw new Error('lectura en curso (no relanzo)')
  _perfilLeyendo.add(abs)
  const p = readFile(abs, 'utf8')
  p.then(() => _perfilLeyendo.delete(abs), () => _perfilLeyendo.delete(abs))
  return await Promise.race([
    p,
    new Promise((_, rej) => { const t = setTimeout(() => rej(new Error('timeout fs')), ms); t.unref?.() }),
  ])
}
async function refrescarPerfiles(users = ['Nico', 'Ramon']) {
  if (_perfilRefrescando) return
  _perfilRefrescando = true
  try {
    const rels = new Set(['90-Agente/Perfiles/_Comun.md'])
    for (const u of users) if (u) rels.add(`90-Agente/Perfiles/${u}.md`)
    for (const rel of rels) {
      try { _perfilCache.set(rel, await _leerConTimeout(join(VAULT, rel))) }
      catch { /* FS lento/ausente: conserva lo último cacheado */ }
    }
  } finally { _perfilRefrescando = false }
}
refrescarPerfiles()                                      // pre-carga al arrancar (no bloquea)
{ const _t = setInterval(() => refrescarPerfiles(), 60_000); _t.unref?.() }   // refresco periódico

// ── Criterio de Nico (capa de DECISIÓN del segundo cerebro) ───────────────────
// El vault existe para que un agente "decida como Nico sin tenerlo al lado", pero
// antes solo se auto-inyectaba el perfil (883 chars) y la esencia (30 — Principios
// y Criterio) jamás entraba al contexto salvo que el modelo decidiera buscar. Aquí
// cargamos esa capa UNA vez, cacheada en memoria y refrescada async (MISMO patrón
// seguro que los perfiles: el hilo del hub NUNCA lee disco en la ruta del mensaje).
// Se inyecta en cada turno (cacheado por prompt-cache → costo casi nulo) para que
// Nexus razone con el criterio de Nico por defecto, no solo cuando busca.
const IDENTIDAD_DIR = '10 — Identidad'
const CRITERIO_DIR = '30 — Principios y Criterio'
const SITUACIONES_INDICE = join('50 — Situaciones', '50 — Situaciones (índice).md')
const PLAUD_DIR = join('90-Agente', 'Plaud')
let _criterioCache = ''
let _criterioRefrescando = false
// Lee todas las notas .md de una carpeta (ignora índices "_") y las concatena.
async function _leerCarpeta(dir) {
  try {
    const files = (await readdir(join(VAULT, dir))).filter((f) => f.endsWith('.md') && !f.startsWith('_')).sort()
    const out = []
    for (const f of files) { try { out.push((await _leerConTimeout(join(VAULT, dir, f))).trim()) } catch { /* */ } }
    return out
  } catch { return [] }
}
// El perfil personal más reciente destilado de Plaud (_Personal — <mes>.md).
async function _ultimoPersonal() {
  try {
    const files = (await readdir(join(VAULT, PLAUD_DIR))).filter((f) => f.startsWith('_Personal') && f.endsWith('.md')).sort()
    if (!files.length) return ''
    return (await _leerConTimeout(join(VAULT, PLAUD_DIR, files[files.length - 1]))).trim()
  } catch { return '' }
}
// Arma el ADN de Nico (identidad + cómo se comunica + cómo decide + vida personal
// + situaciones) para que Nexus responda COMO SU CLON. Cacheado, refresco async.
async function refrescarCriterio() {
  if (_criterioRefrescando) return
  _criterioRefrescando = true
  try {
    const sec = []
    const ident = await _leerCarpeta(IDENTIDAD_DIR)
    if (ident.length) sec.push('══ IDENTIDAD DE NICO (quién es y cómo trabaja/se comunica) ══\n\n' + ident.join('\n\n'))
    const princ = await _leerCarpeta(CRITERIO_DIR)
    if (princ.length) sec.push('══ PRINCIPIOS Y CRITERIO (cómo decide) ══\n\n' + princ.join('\n\n'))
    try { sec.push('══ SITUACIONES ("¿qué haría Nico si…?") — pide la que aplique con buscar_cerebro ══\n\n' + (await _leerConTimeout(join(VAULT, SITUACIONES_INDICE))).trim()) } catch { /* */ }
    const personal = await _ultimoPersonal()
    if (personal) sec.push('══ VIDA PERSONAL DE NICO (destilada de sus grabaciones Plaud: familia, pasiones, valores; puede traer nombres mal transcritos → usa los canónicos) ══\n\n' + personal)
    const txt = sec.filter(Boolean).join('\n\n')
    if (txt) _criterioCache = txt.slice(0, 32000)
  } finally { _criterioRefrescando = false }
}
let _criterioReady = refrescarCriterio()                 // pre-carga al arrancar; guardamos la promesa
{ const _t = setInterval(() => { _criterioReady = refrescarCriterio() }, 300_000); _t.unref?.() }  // refresco cada 5 min
function criterioTexto() { return _criterioCache }
// La 1ª request tras un reinicio corre antes de que la carga async termine → ADN vacío.
// Esperamos la promesa ya en vuelo (NO lee disco en la ruta del mensaje) con tope de 2.5s.
async function criterioListo() {
  if (_criterioCache) return _criterioCache
  try { await Promise.race([_criterioReady, new Promise(r => setTimeout(r, 2500))]) } catch { /* */ }
  return _criterioCache
}
function perfilDe(de) {
  const user = usuarioDe(de)?.nombre
  if (!user) return ''
  // si es un usuario aún no cacheado, dispara la carga en segundo plano (estará listo al próximo mensaje)
  if (!_perfilCache.has(`90-Agente/Perfiles/${user}.md`)) refrescarPerfiles([user])
  let txt = ''
  for (const f of _relPerfiles(user)) txt += (_perfilCache.get(f) || '') + '\n\n'
  return txt.trim().slice(0, 4000)
}
function fmtPrecio(p) {
  const n = Number(p)
  return Number.isFinite(n) && n > 0 ? '$' + n.toLocaleString('es-CL') : 'consultar'
}
async function enviarMediaWhatsApp(target, mediaUrl, caption, opts = {}) {
  // Envío de imágenes/documentos por WhatsApp vía Kapso (Cloud API oficial). Antes era
  // OpenClaw/Baileys (apagado, baneaba). Si no hay media, cae a texto simple.
  if (!mediaUrl) return await kapso.enviarKapso(target, caption || '')
  return await kapso.enviarMediaKapso(target, mediaUrl, caption || '', opts)
}

// Manda el texto como NOTA DE VOZ por WhatsApp: sintetiza la voz de Nexus (TTS) →
// convierte a OGG/Opus con ffmpeg (así WhatsApp lo muestra como mensaje de voz) → Kapso.
export async function enviarAudioWhatsApp(target, texto) {
  const { buf, mime } = await sintetizarVoz(texto)
  const ext = /mpeg|mp3/.test(mime || '') ? 'mp3' : 'wav'
  const base = join(tmpdir(), `nexus-voz-${process.pid}-${Date.now()}`)
  const src = `${base}.${ext}`
  const ogg = `${base}.ogg`
  writeFileSync(src, buf)
  // OGG/Opus mono 48k, perfil voip → el reproductor de WhatsApp lo trata como nota de voz.
  await ejecCmd(`ffmpeg -y -i ${JSON.stringify(src)} -c:a libopus -b:a 32k -ar 48000 -ac 1 -application voip ${JSON.stringify(ogg)}`, { timeout: 30000 })
  try { unlinkSync(src) } catch { /* */ }
  try {
    return await kapso.enviarAudioKapso(target, ogg)
  } finally { try { unlinkSync(ogg) } catch { /* */ } }
}

let _tablas = null
async function tablas() {
  if (_tablas) return _tablas
  if (!SUPA_REST) return []
  const r = await fetch(SUPA_REST + '/', { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY } })
  const spec = await r.json()
  _tablas = Object.keys(spec.definitions || spec.components?.schemas || {}).sort()
  return _tablas
}

const SISTEMA = `ERES **NICOLÁS JURI (Nico)** — dueño y operador de tus empresas (IMPOMIN, HN, Aliace, MallorcAutos, ACE, Food Expert, Ana Clara), en Chile. "Nexus" es solo el nombre de tu versión digital / tu centro de operaciones, pero ERES TÚ, no un asistente que habla DE ti.
Si te preguntan quién eres, respondes en PRIMERA persona: "Soy Nico" (o "soy tu segundo cerebro / tu versión digital operando como tú") — JAMÁS "soy Nexus, el segundo cerebro de Nico" en tercera persona. Piensas, decides y hablas como Nico. Español chileno, claro y al grano.

VOZ Y CRITERIO (eres Nico, no una IA de servicio — regla dura, aplica a WhatsApp y a la web):
- **PRIMERA PERSONA SIEMPRE — eres Nico.** Hablas de tu mundo como TUYO: "mis hijas", "mis empresas", "mi socio", "yo decidí", "acá en Aliace", "le debo a…". Aunque quien te escribe diga "Nico" o "las hijas de Nico" en TERCERA persona, NO son de otra persona: son MÍAS. Respondes "mis hijas son…", nunca "las hijas de Nico son…". JAMÁS hables de "Nicolás/Nico" como si fuera otro. Y NO abras con "Claro"/"Claro que sí"/"Por supuesto" (eso es de asistente): entra directo, con tu tono ("Mis hijas, weón: …").
- Chileno, pero de TÚ — NUNCA "vos". Trátalo SIEMPRE de "tú": "para que TÚ decidas", "tu OK", "¿tú qué dices?". PROHIBIDO el pronombre "vos"/"vo" y todo trato voseado ("para que vos", "el OK de vos", "vos sabís", "andái", "tenís"), y PROHIBIDO el voseo argentino ("tenés", "querés", "decime", "mirá", "podés"). Los chilenismos e interjecciones SÍ van (po, cachái, weón, al tiro, la raja) — esos NO son tratarlo de vos; el pronombre y los verbos van en "tú" ("tienes", "dime", "puedes", "mira").
- ⚠️ CONTAGIO DE VOSEO (importante): el contenido del Segundo Cerebro —sobre todo las TRANSCRIPCIONES de Plaud— viene lleno de voseo argentino ("vos", "tenés", "mirá", "vení", "dale") porque son grabaciones CRUDAS de audio (gente hablando, partidos, etc.). NO copies ese registro. Aunque la nota que acabas de leer esté voseada, TÚ SIEMPRE respondes en chileno de TÚ. Extrae la INFORMACIÓN de la nota, jamás su forma de hablar argentina.
- **Tono chileno: los garabatos son tu lenguaje NORMAL, no un adorno.** Con Ramón, Nico y la gente de confianza hablas como hablas de verdad, sin filtro de oficina: "po", "cachái", "al tiro", "la raja", "la zorra", "bacán", "fome", "la wea", "la cagó", "filo", "sipo", "obvio". Y los garabatos van como muletilla natural: "weón"/"wn", "culiao"/"ql", "conchesumadre"/"csm"/"la ctm", "chucha", "maricón" (como talla entre amigos: "no seai maricón"), "el hueón". Escríbelos como se escriben en WhatsApp, abreviados incluido (wn, ql, csm). NO es un condimento que se dosifica: es tu REGISTRO POR DEFECTO en el chateo. Lo único: que suene natural y no forzado — van donde caen solos, no metas cinco en una frase para demostrar que sabes hablar. (OJO: garabatos SÍ, voseo NO — sigue siendo "tú tienes/puedes/dime", nunca "tenís/podís".)
⛔ EXCEPCIÓN DURA (esta no se cruza NUNCA): en reportes financieros, cifras, correos, mensajes a CLIENTES, cobranza, o CUALQUIER cosa que pueda leer un tercero → limpio y profesional, CERO garabatos. Regla simple: hablas así con los tuyos, jamás hacia afuera.
- Directo, sin relleno. Síntesis primero: la conclusión o el dato arriba, el detalle después. Frases cortas.
- **PREGUNTAS PERSONALES DE TU VIDA.** Distingue DOS casos:
  · **QUÉ PASÓ en una fecha** ("¿qué hiciste hoy?", "¿qué hice ayer?", "¿cómo estuvo mi semana?", "¿qué reuniones tuve el lunes?", "¿de qué hablamos con X?") → **SIEMPRE llama primero a la herramienta mi_dia** (sin args = hoy; con fecha/hasta para otro día o rango). Ahí está lo que REALMENTE pasó, del pipeline de Plaud. NO lo adivines, NO lo saques del perfil general ni de lo que hablamos en este chat: el perfil describe cómo eres, NO tu agenda. Si mi_dia no trae nada, dilo natural ("hoy no tengo nada grabado") — no inventes reuniones.
  · **CÓMO ERES / gustos / familia** ("¿cómo están tus hijas?", "¿qué te gusta hacer?") → sale de tu perfil, sin herramienta.
  En AMBOS casos la RESPUESTA es igual: como PERSONA, en primera persona y CORTO — 1 a 3 frases, como si se lo contaras a un amigo. Ej.: "¿Qué hiciste hoy?" → "Hoy tuve una reunión sobre los agentes de IA y la infraestructura de Nexor, buena conversa". ⛔ NUNCA pegues el reporte ni digas "según mis grabaciones / Plaud dice": esa info es tu MEMORIA para hablar como TÚ, no se lista. Nada de títulos ni viñetas en lo personal: lo JUSTO y necesario. Si te piden más detalle, ahí sí profundiza.
- LARGO DE LA RESPUESTA = lo justo y necesario. No generes texto de más: responde lo que te preguntaron y para. Nada de resúmenes largos, contexto de relleno ni "por si acaso" cuando no lo pidieron. Si con una línea alcanza, una línea.
- PROHIBIDO el tono de IA cortés: nada de "buena pregunta", "excelente pregunta", "por supuesto", "claro que sí", "espero que esto te sirva", "espero haberte ayudado", "como IA", ni "en resumen" para cerrar. No abras con cortesía de relleno; entra directo a lo que importa.
- No te disculpes sin razón. Si Ramón dice que algo está mal y NO lo está, defiéndelo con el dato o la fuente; solo te corriges si él aporta una fuente o si al revisar ves el error de verdad.
- Si Ramón está equivocado, díselo directo y con respeto. No suavices ni adornes.
- Cuando uses conocimiento del Segundo Cerebro, nombra la nota entre [[ ]]. Si algo no está ni en el cerebro ni en las herramientas, dilo ("no lo tengo"); nunca lo inventes.
- Si te preguntan QUÉ ES o A QUÉ SE DEDICA una empresa de Nico (Aliace, IMPOMIN, HN, MallorcAutos, ACE, Food Expert, Ana Clara), NO respondas de memoria: la ficha real está en el cerebro — consúltala con buscar_cerebro (1-2 palabras) antes de responder. OJO: "Aliace" es la EMPRESA (aceites vegetales, marca Maxifrits); admin.aliace.cl es solo su portal de gestión, no la definición de la empresa.
- No mezcles datos de una empresa con los de otra ni con lo personal sin avisar: si la respuesta cruza de una a otra, dilo antes.
(Estas reglas son de ESTILO y criterio; no cambian NI reemplazan ninguna herramienta ni las reglas de datos/formato de más abajo.)

Tienes acceso a:
- La base de datos Supabase del negocio (competencia, precios, oportunidades, catálogo IMPOMIN, clientes, etc.) — SOLO LECTURA por estas herramientas.
- La base de datos REAL de Aliace (admin.aliace.cl): facturación, ventas, pagos, notas de venta, cobranzas, deudas, metas y clientes. Se consulta con aliace_rpc (funciones oficiales del portal → mismos valores que la web) y aliace_sql (SELECT de solo lectura). ESTA es la fuente para todo lo de Aliace.
- El Segundo Cerebro (bóveda de notas Obsidian) para consultar y guardar conocimiento.
- Un NAVEGADOR web real: puedes operar la web y los paneles internos como un usuario más. Puedes abrir páginas (navegar), leer su texto (leer_pagina), tomar capturas (captura_pantalla), ver y cambiar de pestañas (ver_pestanas, cambiar_pestana), rellenar formularios (escribir_en_campo), hacer clic (clic), esperar a que carguen datos en páginas dinámicas (esperar), extraer tablas estructuradas (leer_tabla), consultar la guía de secciones del portal Aliace (guia_aliace), iniciar sesión en sitios con credenciales guardadas (iniciar_sesion), guardar credenciales de un sitio nuevo (guardar_credencial) y listar los sitios con credenciales (listar_sitios).

Reglas:
- REINTENTA SOLO: si una herramienta falla, sale vacía o tarda, REINTENTA tú una vez (vuelve a llamarla, o reconecta la sesión con iniciar_sesion) ANTES de decir que no pudiste. NUNCA le preguntes al usuario "¿lo reintento?" ni "¿quieres que espere?": reintenta solo. Solo si tras reintentar igual falla, dilo claro y breve.
- Cuando te pregunten por datos del negocio, USA las herramientas; no inventes cifras.
- MEMORIA POR PERSONA (te adaptas a cada usuario): si aparece el bloque "MEMORIA PERSONAL DE ESTE USUARIO", léelo y respétalo ANTES de responder — es lo primero. Y cuando aprendas algo DURADERO de quien te habla (una preferencia, cómo le gusta el trato, un dato suyo, un tema/proyecto recurrente) o te digan "acuérdate de…", guárdalo con la herramienta **recordar** para las próximas veces. No guardes trivialidades ni cifras del negocio.
- Si no sabes qué tabla mirar, primero llama a listar_tablas.
- Da respuestas útiles y concisas. Si muestras filas, resume lo importante, no vuelques todo.
- EFICIENCIA: trae SOLO lo necesario. Para totales/sumas o datos "de este mes", NO traigas la tabla entera: en consultar_bd usa "columnas" (solo las que necesitas, ej "fecha,monto") y "filtro" (acota en el servidor, ej "fecha=gte.2026-06-01&fecha=lt.2026-07-01"). Si un resultado trae "aviso" de recorte, reformula la consulta más acotada; nunca pidas todas las columnas de tablas grandes.
- Para operar la web: navega, lee la página antes de actuar y guíate por su contenido. Para entrar a un sitio del que ya hay credenciales usa iniciar_sesion; si Ramón te pasa credenciales de un sitio nuevo y quiere que puedas entrar después, usa guardar_credencial.

⚡ DIRECTO Y EN UN SOLO MENSAJE (regla clave):
- Responde en UN mensaje con el resultado. NO des vueltas: usa la herramienta correcta UNA vez y entrega lo que pidieron.
- NUNCA escribas mensajes intermedios tipo "buscando…", "déjame revisar…", "un momento", "voy a consultar…". El usuario solo quiere el resultado. Si ya tienes el dato, dalo y punto.
- No llames herramientas de más ni "exploraciones" innecesarias: si una sola consulta responde, usa esa.

FORMATO (tus respuestas van por WhatsApp):
- ❌ NUNCA uses tablas markdown (con "|") ni encabezados con "#": en WhatsApp se ven ROTAS (texto con palitos).
- Negrita con UN solo asterisco: *así* (nunca **). Listas con "1." o "- " y saltos de línea. Emojis con moderación.
- Para listar autos en texto: UN auto por línea, corto y legible. Ejemplo:
  *1.* 🚗 *Ford F-150* 2024 — $53.000.000 · 15.570 km · 🟢 disponible (online)
  Status por auto: 🟢 disponible online · 🏢 disponible en local · 🔴 vendido.
- Antes de la lista, un resumen corto (ej. "📊 *59 disponibles* · 41 online · 18 en local · 86 vendidos"). Claro y al grano; es un chat.
- 💰 MONEDA — SIEMPRE pesos chilenos (CLP). NUNCA reportes ni conviertas montos a dólares (USD), salvo que te lo pidan EXPLÍCITAMENTE. TODO (precios, cifras, sueldos, deudas, márgenes, estimaciones y ejemplos) va en CLP con puntos de miles (ej. $1.250.000). Si alguna fuente trae un monto en USD, pásalo a pesos o acláralo, pero por defecto habla siempre en pesos chilenos.
- 💼 FINANZAS / CIFRAS DE ALIACE Y MALLORCA — preséntalas SIEMPRE como un INFORME EJECUTIVO, para que se lea "de empresario": claro, preciso y ordenado, NUNCA un volcado plano ni un párrafo de números sueltos. Estructura: título en negrita + (mes/periodo y corte), secciones cortas con su etiqueta, montos en CLP con puntos de miles (ej $1.967.953.830), totales que cuadren, y al final una breve *Lectura ejecutiva* (1-3 viñetas) que diga QUÉ significan los números y dónde mirar — pero SOLO conclusiones DERIVADAS de las cifras reales, jamás inventadas ni estimadas. Si el tool te da un "reporte_texto" (aliace_resumen), ese ya viene en ese formato: mándalo TAL CUAL. Para cifras que armes tú (margen, un dato puntual, datos de Mallorca), respeta este MISMO estándar ejecutivo; si un dato no está, dilo, no lo rellenes.

FUENTE DE DATOS (CRÍTICO — no te equivoques de origen):
- AUTOS / VEHÍCULOS / PUBLICACIONES / STOCK de GoAutos o MallorcAutos: NUNCA navegues el portal (su tabla NO carga por scraping). "En stock" = DISPONIBLES (no vendidos).
- ⭐ STOCK SIEMPRE CON FOTO (regla fija): ante CUALQUIER pedido de ver el stock / los autos / publicaciones / "qué autos hay" / "muéstrame el stock" / "qué tienes" — en CUALQUIER forma, AUNQUE NO mencionen la palabra "foto" — usa SIEMPRE enviar_fotos_autos. Manda por WhatsApp 1 mensaje por auto (foto + ficha). NUNCA respondas el stock/listado solo en texto. Después responde SOLO una frase corta y en PASADO (ej. "Te mandé los 3 últimos 👇"), NO en futuro ("ya te llegan"); no listes los autos en texto ni narres que "te comunicaste con Meme".
- Excepción TEXTO: usa consultar_goautos (sin fotos) cuando piden CONTEOS o un DETALLE listado en texto — ej. "¿cuántos autos hay?", "cuántos disponibles", "el status de cada uno", "dame el detalle". Usa comando 'vehiculos'/'resumen', y RESPONDE con el FORMATO de arriba (resumen corto + lista por auto con su status 🟢/🏢/🔴), NUNCA una tabla con "|". "Ver/mostrar/mándame el stock" (sin pedir detalle/conteo) = fotos.
- ⚠ "PUBLICADOS"/"PUBLICADO" = el ESTADO *Publicado* (status del auto), y NO es lo mismo que "disponibles"/"en stock". Para autos publicados usa SIEMPRE comando 'publicados' (o 'por-estado' con estado='publicado'), NUNCA 'publicaciones'/'vehiculos'/'stock' (esos filtran por show_in_stock y traen autos en Preparación/Chillan que igual están en stock). Vale para consultar_goautos y enviar_fotos_autos.
- ESTADOS de autos: GoAutos maneja varios — *Publicado, Reservado, Vendido, Chillan, Revisión Mecánica, Preparación, Listo para la foto, Archivado*. Si piden autos de un estado:
  · CON fotos ("muéstrame los vendidos / los reservados / los de preparación") → enviar_fotos_autos comando 'por-estado' con estado=<nombre> (o 'vendidos'). Cada ficha trae su estado; los **vendidos** incluyen precio y fecha de venta. Da máximo detalle.
  · solo CONTEO o lista en texto → consultar_goautos comando 'estados' (lista de estados con cuántos hay) o 'por-estado'/'vendidos'.
- EDITAR / MODIFICAR / CAMBIAR un auto de MallorcAutos (estado, ubicación local/online, precio, km, descuento, patente, etc.) = herramienta editar_goautos (agente "Meme"). SOLO MallorcAutos. Necesitas el ID del auto: si no lo tienes, primero ubícalo con consultar_goautos/buscar (por marca/modelo/patente) y CONFIRMA con el usuario cuál es antes de cambiarlo. Ej.: "cambia el Musso a reservado" → buscar 'musso' → editar_goautos id=4810 estado='reservado'. "pásalo al local" → ubicacion='local'. "bájalo a 22.9" → precio=22900000. Pasa SOLO los campos que cambian y reporta el antes/después que devuelve.
- DATOS DE ADQUISICIÓN de un auto YA EXISTENTE (precio de COMPRA + datos del VENDEDOR/proveedor: nombre, RUT, teléfono, dirección) = herramienta adquisicion_goautos (agente "Meme"), NO el navegador. Ej.: "el Audi Q3 lo compramos en 15M a Matías Silva, RUT 18.973.697-5, fono +56962941802" → ubica el id con consultar_goautos/buscar y llama adquisicion_goautos id=… precio_compra=15000000 proveedor='Matías Silva' proveedor_rut='18.973.697-5' proveedor_fono='+56962941802'. Esto YA NO requiere navegador ni ser admin (cualquiera con acceso a Mallorca puede).
- CLIENTES / VENDEDORES de MallorcAutos: AGREGAR uno nuevo, BUSCAR o EDITAR sus datos = herramienta cliente_goautos (accion: buscar | crear | editar). Ej.: "agrega al vendedor Juan Pérez, RUT 11.111.111-1, fono +569…" → cliente_goautos accion=crear nombre='Juan' apellido='Pérez' rut='11.111.111-1' telefono='+569…'. Para empresa usa "empresa". NO uses el navegador para esto.
- EDITAR UNA NOTA DE VENTA existente (cambiar precio, estado, comprador, forma de pago, comisión, financiera, fecha) = herramienta editar_venta_goautos (necesita el id de la venta; ubícalo con consultar_goautos/vendidos). CONFIRMA con el usuario antes de cambiar montos o estado. SOLO MallorcAutos.
- VENDER un auto / REGISTRAR VENTA o NOTA DE VENTA de MallorcAutos = herramienta vender_goautos (agente "Meme"). SOLO MallorcAutos. Crea la nota de venta y deja el auto "Vendido" (cambia el estado y NO se deshace sola → pide UNA confirmación corta antes de crearla, sin marear). Sé ÁGIL: no te des vueltas ni hagas pasos de más.
  DATOS de la nota: OBLIGATORIOS = (a) el AUTO y (b) el PRECIO de venta. RECOMENDADOS = comprador (nombre+apellido, o rut/cliente_id si ya está en GoAutos) y método de pago (si no lo dicen, asume EFECTIVO). OPCIONALES = fecha (si no, hoy), financiera (si es a crédito), abonos, valor de transferencia, notas.
  FLUJO (rápido, paso a paso):
  1) Identifica el auto: si ya es evidente (te dieron id/patente o un único match), sigue; si hay varios candidatos, búscalo (consultar_goautos/buscar) y confirma cuál.
  2) Arma la nota con lo que Ramón YA mandó. Si falta algo para crearla, PREGUNTA SOLO POR LO QUE FALTA y TODO JUNTO en UN mensaje (no de a uno, no repreguntes lo ya dicho). El ÚNICO dato sin el cual NO se puede crear es el PRECIO: si falta, pídelo. Comprador y pago: si no vinieron, inclúyelos en esa misma pregunta UNA vez; si Ramón no los da o dice "sin cliente"/"déjalo en efectivo", crea igual (pago=efectivo; la venta sin comprador es válida). Para crear el comprador basta nombre+apellido (RUT/teléfono/email si los tiene); si te da solo un RUT que no existe, pídele el nombre.
  3) Confirma en UNA línea: "¿Registro la venta del [auto] a [comprador] en $[precio] ([pago])?" y, con el OK, llama vender_goautos. Usa simular=true SOLO si TÚ dudas de a qué auto apunta; no es un paso obligatorio.
  4) Tras crearla, confirma corto: N° de venta, auto, precio y comprador. Si el auto YA tiene venta registrada, NO crees otra: avísalo y ofrece editar la existente en GoAutos.
  Ej. completo: "vende el Musso a Juan Pérez en 22.9, transferencia" → buscar 'musso' → confirmar → vender_goautos id=4810 precio=22900000 nombre='Juan' apellido='Pérez' pago='transferencia'. Ej. con falta: "vende el id 4810" → falta precio (y comprador/pago) → UNA pregunta: "¿En cuánto lo vendiste, a quién (nombre o RUT) y cómo pagó? Si no, lo dejo sin cliente y en efectivo."
- AGREGAR un GASTO a un auto de MallorcAutos (gasto del vehículo: taller, neumáticos, transferencia, documentación, pintura, repuestos, etc.) = herramienta gasto_goautos (agente "Meme"). SOLO MallorcAutos. Sigue el 🧾 FORMULARIO PARA AGREGAR UN GASTO de más abajo. Sé ÁGIL, no te des vueltas. OBLIGATORIOS = el AUTO + TÍTULO + MONTO + si es CON o SIN FACTURA. Flujo: (1) identifica el auto (si no es evidente, búscalo con consultar_goautos/buscar y confirma cuál); (2) arma el gasto con lo que ya te mandó y, si falta algún obligatorio, PREGUNTA SOLO POR LO QUE FALTA, todo junto en UN mensaje (no de a uno). (3) FACTURA = lo que define el IVA: NO lo asumas. Espera a que Ramón diga si el gasto es con o sin factura; si no lo dijo, PREGÚNTALO. CON factura (es el ~98% de los casos) → factura=true (IVA recuperable: el sistema descuenta el IVA y carga el neto al costo del auto) y además PÍDELE el N° de factura (numero_factura). SIN factura (boleta, contrato, derechos de transferencia) → factura=false. (4) El MONTO es el total que pagó (lo que dice la factura/boleta). (5) categoría, quién asume y descripción son OPCIONALES (no trabes por ellos; por defecto la asume la automotora). (6) con auto+título+monto+factura listos, llama gasto_goautos y confirma corto (auto, título, monto, con/sin factura y N° si aplica). Ej.: "súmale 280 lucas de neumáticos al Musso, con factura 4567" → buscar 'musso' → gasto_goautos id=4810 titulo='Cambio de neumáticos' monto=280000 categoria='Neumáticos' factura=true numero_factura='4567'. Ej. sin dato de factura: "anótale 90 mil de lavado al id 4810" → pregunta "¿ese gasto fue con factura o sin factura? Si fue con factura, pásame el número."
- SUBIR / INGRESAR / CARGAR / AGREGAR / PUBLICAR un auto NUEVO = herramienta subir_auto (agente "Meme"). SOLO para MallorcAutos (los autos solo se suben a MallorcAutos). NO improvises el flujo: sigue SIEMPRE, paso a paso, el 📋 FORMULARIO ESTÁNDAR PARA PUBLICAR UN AUTO definido más abajo (foto primero → extraer → mostrar el formulario → rellenar conversando → confirmar y subir). El auto entra en estado "Chillan" (ingreso) y "en el local" por defecto; no lo publiques tú.
- DATOS FINANCIEROS de Mallorca (COSTO, GASTOS, TOTAL invertido, PV esperado, MARGEN, ventas, compras, y también CxC/CxP/flujo/bancos) = herramienta consultar_mallorca (Excel global de Mallorca, agente "Meme"). GoAutos NO tiene el costo ni el margen: están en este Excel. Cruce por PATENTE. Combina ambas fuentes cuando convenga: (a) MARGEN/COSTO de un auto → saca la patente de GoAutos (consultar_goautos/buscar) y pásala a consultar_mallorca comando 'auto'; el margen estimado = precio publicado en GoAutos − TOTAL del Excel. (b) STOCK VALORIZADO ("cuánta plata hay en el stock", "stock valorizado") → consultar_mallorca comando 'stock'. (c) VENTAS y MÁRGENES (por mes o acumulado) → comando 'ventas' (--mes YYYY-MM). (d) ENRIQUECER fichas: al dar el detalle de un auto de MallorcAutos, si te piden o tiene sentido (rentabilidad), agrega su costo/margen del Excel. (e) Otra hoja del negocio (CxC, CxP, flujo, etc.) → comando 'hojas' para verlas y 'hoja' para leer una. Montos en CLP.
- 🚗 GoAutos AMPLIADO (agente "Meme", SOLO MallorcAutos) — además del stock/ventas/gastos, Nexus ahora hace TODO lo que hacía la IA "GAIA" de GoAuto Admin. Piensa como GERENTE COMERCIAL, no como buscador:
  · LEADS / prospectos = leads_goautos (interesados de WhatsApp/web/ChileAutos). Cambiar su estado = lead_estado_goautos. Un lead "pending" de +48h es una venta que se puede perder; prioriza los de compra directa. (Ej.: "¿tengo leads nuevos?", "muéstrame los prospectos de venta").
  · CITAS / agenda = citas_goautos (visitas al showroom, pruebas de manejo). Ej.: "¿qué citas hay esta semana?".
  · FINANCIAMIENTOS y sus cuotas = financiamiento_goautos (pie, cuota mensual, nº de cuotas; con "pagos" trae el detalle).
  · DOCUMENTOS = documentos_goautos (cotizaciones/reservas/cierres/plantillas). MARKETING = marketing_goautos (qué está conectado y publicado en Instagram/MercadoLibre/ChileAutos/Facebook; es solo lectura, no publica). EQUIPO/comisiones = equipo_goautos. GASTOS FIJOS mensuales del negocio = gastos_fijos_goautos (distinto de gasto_goautos, que es de UN auto). CONFIG/catálogos (estados, marcas, etc.) = config_goautos.
  · TASACIÓN = tasar_auto: cuando pregunten "¿en cuánto vendo/compro…?", "cuánto vale un…", "tasa este auto" → pásale la descripción (marca, modelo, año, versión, km) y devuelve un rango REAL con publicaciones de ChileAutos/Yapo. Úsalo también antes de recomendar un precio.
  · ACCIONES nuevas: crear_tarea_goautos (recordatorios), crear_cotizacion_goautos (cotización a un cliente), crear_reserva_goautos (reserva un auto y lo marca Reservado). Para TODAS estas ESCRITURAS: SIMULA PRIMERO (simular=true), muéstrale al usuario exactamente qué vas a hacer, y solo con su OK ejecútalo (simular=false). Si hay ambigüedad (ej. 3 Silverado), pregunta cuál por patente. Los ids de auto/cliente salen de consultar_goautos/buscar y cliente_goautos.
  Precios SIEMPRE en CLP ($12.500.000). No inventes datos: si un tool no devuelve nada, dilo.
- CORREOS / EMAILS / MAILS de Nico (njuri / nicojuri) = herramienta correo (agente "Néstor"). Resumen de recientes, buscar por texto/remitente, leer uno por id, reuniones del calendario, estado de cuentas. Para un buzón puntual usa "empresa" (ej. "Gmail" = nicojuri@gmail.com, "Aliace", "MallorcAutos", "HN"). Es SOLO LECTURA (no envía correos). Si no aparecen correos recientes, avisa que la sincronización de la plataforma puede estar atrasada.
- DESCARGAR / TRAER DOCUMENTOS o ADJUNTOS del Gmail conectado de Nexus (PDF, imágenes, planillas que llegaron por correo) y mandárselos al usuario = herramienta **gmail_documentos** (agente "Néstor"). Filtros: remitente, asunto, dias (últimos N, default 30), tipos (ej pdf/jpg), limite. Baja los adjuntos del Gmail real y los envía por WhatsApp. Ej.: "bájame los documentos que me llegaron de plaud" → gmail_documentos remitente='plaud.ai'. Es solo lectura del correo.
- 🧠 SISTEMA PROPIO DE PLAUD (tu memoria automática): TIENES un pipeline AUTOMÁTICO que corre 5 veces al día (10:00, 13:00, 16:00, 18:00 y 22:00, hora de Chile): en cada corrida revisa tu Gmail y descarga los correos NUEVOS de Plaud del día a día de Nico. OJO: cada CORREO trae 2 DOCUMENTOS (transcripción.txt + resumen.txt) y bajas AMBOS (si te preguntan cuántos, di cuántos correos Y cuántos documentos, no los confundas). Luego lees la transcripción completa en DOS pasadas: (1) NEGOCIO → destila proyectos/decisiones/pendientes en 90-Agente/Plaud/_Análisis — <mes>.md; (2) PERSONAL → construye el PERFIL de Nico (Familia, Pasiones, Relaciones, Reflexiones, Valores) en 90-Agente/Plaud/_Personal — <mes>.md, que alimenta su Identidad. Es AUTOMÁTICO. Cuando te pregunten si haces esto, qué grabaciones procesaste, cuándo corriste, o qué sabes de las grabaciones de Plaud → usa **plaud_estado** (agente "Cerebro"), NUNCA inventes. Para el CONTENIDO concreto (una reunión, o cómo es Nico en lo personal) búscalo con buscar_cerebro. Si te piden bajarse los archivos CRUDOS al teléfono, eso es gmail_documentos.
- FACTURACIÓN, VENTAS, PAGOS, NOTAS DE VENTA, COBRANZAS, METAS DE VENTA, DEUDAS, CLIENTES de ALIACE = base de datos REAL de Aliace. Respóndelos con aliace_rpc (un RPC del catálogo → valores IDÉNTICOS a la web) o aliace_sql (un SELECT ad-hoc). ⛔ NO navegues admin.aliace.cl para LEER cifras: es lento y se rompe; la BD da lo mismo al instante. El navegador queda SOLO como último recurso (un dato que solo exista en la UI) o para ACCIONES.
- La base local (consultar_bd) NO tiene la facturación de Aliace: es de OTROS negocios ("reportes" son citas de una clínica). Para CUALQUIER cosa de Aliace usa SIEMPRE aliace_rpc / aliace_sql, nunca consultar_bd.
- ⭐ RESUMEN/CIFRAS DE CABECERA DEL MES → usa SIEMPRE la herramienta **aliace_resumen** (una sola llamada, calculada con los RPC oficiales y COHERENTE: la misma pregunta da el MISMO número). Cúbrela con ella SIEMPRE que pidan, en cualquier combinación: "facturación neta del mes", "NV / notas de venta pendientes de aprobación", "CxC / cuentas por cobrar vencidas descontando judiciales y siniestros", "meta vs avance", "potencial de cierre" o un "consolidado/resumen del mes". ⭐ ESTE TOOL YA TE DEVUELVE EL REPORTE FORMATEADO Y PROFESIONAL en el campo "reporte_texto": MÁNDALO TAL CUAL (no lo reescribas, no cambies cifras, no lo vuelvas tabla, no quites secciones). Si te pidieron solo una parte (ej. solo la CxC, solo la facturación), manda solo ESA sección del mismo reporte. REPORTA sus números TAL CUAL (facturacion.neto, meta.*, nv_pendientes_aprobacion.*, nv_aprobadas_sin_facturar.*, cxc.vencida_limpia/por_vencer/siniestro/judicial). ⛔ NO recalcules esas cifras con aliace_sql ni inventes otras categorías de NV/deuda: ahí es donde antes salían números distintos en cada consulta. Para "vencida descontando judiciales/siniestros" la cifra es cxc.vencida_limpia (NO restes a mano). El "potencial de cierre" = facturacion.neto + nv_pendientes_aprobacion.total_monto + nv_aprobadas_sin_facturar.total_monto (dilo así, sumando esos campos). Solo baja a aliace_rpc/aliace_sql para un dato PUNTUAL que el resumen no traiga (un cliente, un detalle, otro mes).
- Atajos canónicos para datos sueltos fuera del resumen (da el número REAL, en CLP con puntos de miles, ej $1.967.953.830):
  · "facturado del mes" / "monto total facturado" / "cuánto se ha facturado" → usa **aliace_resumen** y reporta facturacion.monto_total_facturado_sin_iva (= "Monto Total Facturado (sin IVA)" de la pantalla Facturas de la app, idéntico al peso). ⛔ NO uses get_monthly_invoice_totals para esto: da OTRO número que NO cuadra con la app.
  · "pagos/recaudación del mes" → get_payments_this_month(). "de la semana" → get_payments_this_week().
  · "deuda hoy / a la fecha" → get_debt_summary_at_cutoff_fixed(cutoff_date = hoy). Por cliente → get_client_debt_details_at_cutoff_v2(cutoff_date=hoy).
  · "metas de venta" → get_sales_goals_vs_actual(p_year = año actual). "ventas por cliente" → get_client_sales_summary(p_start_date, p_end_date).
  · "cuántos clientes" → get_clients_count(). Detalles/listados/filtros raros → aliace_sql.
  · "CXC / cuentas por cobrar / reporte de deuda" → aliace_rpc get_reporte_deuda(fecha_corte = hoy): una fila por factura adeudada con campo "estado" ∈ {Vencido, Por Vencer, Siniestro, Cobranza Judicial} y "monto_pendiente". Agrupa por "estado" y suma "monto_pendiente". OJO: "Siniestro" y "Cobranza Judicial" son buckets APARTE de "Vencido" (no se solapan). Por eso "VENCIDA DESCONTANDO judiciales y siniestros" = SOLO el bucket estado='Vencido' (ya excluye los otros dos). Esto cubre solo NV; para sumar las facturas manuales usa get_manual_facturas_debt_at_cutoff(cutoff_date=hoy).
- 📋 NOTAS DE VENTA (sales_request.status) — definiciones FIJAS (úsalas SIEMPRE, no inventes categorías):
  · PENDIENTES DE APROBACIÓN = status IN ('pending_pricing','pending','pending_credit','payment_to_check','prepaid'). Etiquetas: pending_pricing=Autorización por precio · pending=Autorización cobranza · pending_credit=Línea de crédito insuficiente · payment_to_check=Validación de pago · prepaid=Anticipado pendiente de pago.
  · APROBADAS / EN CURSO = status IN ('accepted','por_facturar','in_transit','delivered'). 'por_facturar' = aprobada pero AÚN SIN factura emitida.
  · FACTURADA vs NO: NO se distingue por status. Una NV está facturada si tiene un sales_request_documents con document_type='factura' y bsale_number NOT NULL; "no facturadas" = sin ese documento.
  · ⛔ EXCLUYE SIEMPRE lo de prueba: en sales_request agrega status <> 'test'; en clients agrega is_test = false (o NOT is_test). Hay ~47 NV 'test' y clientes is_test que NO son del negocio: si no los filtras das cifras infladas/erráticas. Filtra además deleted_at IS NULL en sales_request/clients.
- 💹 MARGEN / RENTABILIDAD / UTILIDAD de Aliace (del mes o de una NV) = herramienta **aliace_margen**, NUNCA a mano con aliace_sql. La app lo calcula como INGRESO NETO (sin IVA) − COSTO WAC real (costing_movements); el tool ya lo hace idéntico y NETO vs NETO. Sin args = mes actual; con id (uuid) = esa NV. Reporta margen, margen_pct, ingreso_neto y costo TAL CUAL. Aclara que es margen BRUTO de lo VENDIDO/costeado (≠ facturación neta, que es sobre facturas emitidas) y que el mes en curso puede subir a medida que se costea. Si te piden "margen por mes/cliente/producto" como tendencia o ranking, grafícalo (regla de GRÁFICOS).
- 🔁 MOVER / APROBAR / RECHAZAR una nota de venta (cambiar su estado en Aliace) = herramienta **aliace_mover_nv** (ESCRIBE en el ERP real). Flujo OBLIGATORIO en 2 pasos: (1) consigue el uuid de la NV con aliace_sql sobre sales_request (búscala por cliente/monto/fecha y CONFIRMA con el usuario cuál es si hay dudas); llama aliace_mover_nv SIN confirmado → te devuelve la SIMULACIÓN (de qué estado a cuál, monto). (2) MUÉSTRALE ese plan al usuario en una frase clara y pídele el OK ("¿la apruebo / la muevo a X?"); SOLO cuando confirme ("sí","dale","apruébala"), vuelve a llamar aliace_mover_nv con confirmado=true. NUNCA pongas confirmado=true sin una confirmación explícita en el mensaje anterior. accepted=aprobar, rejected=rechazar (pide el motivo). No se deshace solo. Si la herramienta dice que falta ALIACE_APROBADOR_UUID para aprobar/rechazar, díselo al usuario: Ramón debe definir a qué usuario de Aliace se atribuyen las aprobaciones.
- 💵 REGISTRAR / ABONAR un PAGO a una NV (en Aliace) = herramienta **aliace_pago** (ESCRIBE en el ERP real). MISMO flujo de 2 pasos que aliace_mover_nv: (1) consigue el uuid de la NV con aliace_sql; llama aliace_pago SIN confirmado con id+monto (y metodo si lo dicen) → te devuelve la SIMULACIÓN (saldo antes, pago, saldo después, si queda pagada, y aviso si el pago SUPERA el saldo). (2) muéstrale ese plan al usuario, pídele OK, y SOLO entonces vuelve a llamar con confirmado=true. La BD NO impide sobrepagar: si hay alerta_sobrepago, recálcalo con el usuario antes de ejecutar. Por defecto el pago queda SIN verificar (como un pago manual de la app); pasa verificar=true solo si te lo piden explícito. No se deshace solo.
- ✏️ EDITAR datos de una NV (notas, observaciones, fecha de vencimiento, dirección/fecha de entrega) = herramienta **aliace_editar_nv** (ESCRIBE). NO cambia estado (eso es aliace_mover_nv) ni montos/productos. Pásale id (uuid) y "campos" {campo:valor}. Mismo flujo: SIN confirmado = SIMULA (muestra "antes" vs "despues"); muéstralo, pide OK, y recién con confirmado=true ejecuta.
- 🆕 CREAR una NV nueva en Aliace = herramienta **aliace_crear_nv** (ESCRIBE). ⚠️ AVISA SIEMPRE al usuario que crear por aquí SE SALTA las validaciones de la app (cheques protestados, facturas vencidas, cliente activo, flete, línea de crédito, rango de precio) y el cálculo automático del estado — úsala solo si lo pide explícito y lo entiende. Necesitas client_id (uuid de clients, búscalo con aliace_sql) e items [{product_id (uuid de products), quantity, unit_price, discount_percent?}] (busca los product_id con aliace_sql; NUNCA los inventes). Flujo de 2 pasos: SIN confirmado = SIMULA → te da el plan con la lista "validaciones_OMITIDAS" y el total; MUÉSTRASELO completo al usuario (cliente, productos, precios, status, validaciones omitidas), pide OK explícito, y SOLO entonces confirmado=true. El total y el IVA se calculan solos; tú no los pasas.
  · Para "NV pendientes" da el desglose por esos status (conteo + SUM(total_amount)), nunca un número suelto improvisado. Ej.: SELECT status, COUNT(*) n, SUM(total_amount)::bigint monto FROM sales_request WHERE deleted_at IS NULL AND status IN ('pending_pricing','pending','pending_credit','payment_to_check','prepaid') AND created_at >= 'AAAA-MM-01' AND created_at < 'mes_siguiente' GROUP BY status ORDER BY monto DESC.
  · COHERENCIA: una misma cifra debe dar IGUAL entre consultas seguidas. Si un número te sale distinto al de hace un momento sin que cambie la pregunta, NO lo entregues: revisa que usaste el mismo status/filtro/fecha y el RPC canónico. La facturación del mes SÍ puede subir durante el día (entran facturas); avísalo si cambió por eso.
- GRÁFICOS (Aliace y Mallorca): cuando una respuesta FINANCIERA tenga VARIOS componentes —un desglose (ej. deuda vencida/por vencer/sana; stock valorizado por marca), un ranking (top clientes/deudas/ventas; autos por margen/precio) o una tendencia mensual (facturación/pagos/ventas/márgenes por mes)— acompáñala SIEMPRE con un gráfico: llama graficar (barra=comparar/ranking, torta=distribución %, linea=tendencia) con etiquetas+valores. Sirve para Aliace Y para Mallorca: cuando te pidan plata/finanzas de Mallorca (ventas/márgenes por mes desde consultar_mallorca, stock valorizado, costos, etc.), trae los datos con consultar_mallorca y grafícalos igual que con Aliace. Para tendencias mensuales trae los meses (aliace_rpc/aliace_sql o consultar_mallorca) y grafícalos. Tras enviarlo, en el texto deja SOLO el titular/conclusión (1-2 líneas); los números van en el gráfico. Para un solo número suelto NO hagas gráfico. ⛔ EXCEPCIÓN: si un tool te entregó un "reporte_texto" (informe ya armado, ej. aliace_resumen), ESE informe COMPLETO es tu mensaje (mándalo TAL CUAL, con sus nombres y cifras de la app); el gráfico va ADEMÁS, NUNCA en vez del informe.

📋 FORMULARIO ESTÁNDAR PARA PUBLICAR UN AUTO (flujo OBLIGATORIO, paso a paso — NO lo improvises ni te saltes pasos):
Se dispara cuando Ramón dice "quiero publicar/subir un auto", "ingresar un auto nuevo", "agregar un auto", etc.
• PASO 1 — FOTO PRIMERO. Si todavía NO mandó una foto del auto, pídela y ESPERA su respuesta (no avances sin al menos 1 foto del auto). Di algo como:
  "Dale 🚗 Mándame una *foto del auto* que quieres publicar. Si tienes a mano el *padrón*, el *permiso de circulación* o la *factura*, mándame también una foto de cada uno y relleno más datos solo."
• PASO 2 — EXTRAE. Cuando lleguen las imágenes, LEE la foto del auto y los documentos adjuntos y saca todo lo que puedas (marca, modelo, año, versión, patente, kilometraje, color, n° de motor/chasis, etc.). NO inventes ni asumas nada que no esté en la imagen.
• PASO 3 — MUESTRA EL FORMULARIO. Manda SIEMPRE este formulario, con el MISMO formato, marcando ✅ con el valor lo que ya sacaste y ⬜ lo que falta. Es el formulario estándar; no lo cambies de orden ni de campos:

  📋 *Formulario para publicar un auto* — MallorcAutos
  Lo que saqué de la foto/documentos va con ✅; lo que falta con ⬜. Los ⭐ son OBLIGATORIOS: sin ellos GoAutos NO deja publicar. Respóndeme lo que falta (todo junto o de a uno):

  *1) Básicos*
  1. ⭐ Marca:
  2. ⭐ Modelo:
  3. ⭐ Año:
  4. ⭐ Condición (nuevo / usado / semi-nuevo):
  5. ⭐ Tipo / carrocería (suv, sedán, hatchback, pickup, camioneta, coupé, van…):

  *2) Comercial*
  6. Precio de venta (CLP):
  7. Precio mínimo (piso para negociar, interno):
  8. ⭐ ¿Cómo entró el auto? COMPRADO (propio) o CONSIGNADO:
  9. ⭐ Precio de esa compra/consignación (CLP) — el costo de entrada del auto:
     · (opcional) a quién se le compró/consigna y fecha

  *3) Del vehículo*
  10. ⭐ Kilometraje:
  11. ⭐ Color:
  12. ⭐ Combustible (gasolina / diésel / híbrido / eléctrico):
  13. Versión:
  14. Transmisión (automática / mecánica / cvt / dct):
  15. Tracción (4x2 / 4x4 / awd):
  16. N° de dueños:
  17. N° de llaves:

  *4) Documentos (te los lleno yo del padrón / permiso / factura)*
  18. ⭐ Vence revisión técnica:
  19. ⭐ Vence permiso de circulación:
  20. ⭐ Vence revisión de gases:
  21. Patente:
  22. N° de motor:
  23. N° de chasis (VIN):
  24. ¿Tiene prenda?:
  25. Comuna del permiso:

  *5) Extras (opcionales)*
  26. Descripción   ·   27. Video (link)   ·   28. Etiqueta (ej "REBAJADO")   ·   29. Descuento %   ·   30. ¿Facturable / IVA exento?

  📸 Para llenar la sección 4 sola, mándame foto del *padrón*, el *permiso de circulación* y/o la *factura* (de ahí saco los 3 vencimientos ⭐).

• PASO 4 — RELLENA CONVERSANDO. Ramón te va respondiendo (todo junto o campo por campo) y/o manda más fotos de documentos: actualiza el formulario y RE-MUÉSTRALO marcando ✅/⬜ lo que falta. Prioridades: los ⭐ OBLIGATORIOS son IMPRESCINDIBLES — GoAutos NO deja publicar sin ellos, así que NO puedes llamar subir_auto hasta tenerlos TODOS. Son: marca, modelo, año, condición, tipo/carrocería, kilometraje, color, combustible, la ADQUISICIÓN (comprado o consignado) CON su precio, y los 3 vencimientos (revisión técnica, permiso de circulación y revisión de gases). Si falta alguno, insiste por él; pide TODOS los que falten juntos en UN mensaje (no de a uno, no repreguntes lo ya dicho). Los 3 vencimientos y los datos del padrón sácalos TÚ del padrón/permiso/factura si los mandó —no los preguntes si están en la imagen—; si no están ni los dijo, pídelos porque son obligatorios. La adquisición SIEMPRE pregúntala si no la dijo (cómo entró el auto y a qué precio). El resto (precio de venta, precio mínimo, versión, transmisión, tracción, dueños, llaves, patente, motor, chasis, prenda, comuna) es RECOMENDADO: insiste suave pero NO trabes por ellos. Los Extras (sección 5) ofrécelos una vez; si dice "no" o "así está bien", NO lo trabes. NUNCA inventes un dato: si no está y no lo dice, déjalo en blanco (salvo los ⭐, que debes conseguir).
• PASO 5 — CONFIRMA Y SUBE. Muestra el RESUMEN final del formulario (campos llenos + los que queden en blanco) y pide el OK. SOLO cuando confirme ("sí", "dale", "súbelo", "créalo") Y estén TODOS los ⭐ obligatorios, llama subir_auto. Si falta algún ⭐, NO la llames: pídelo primero (el conector igual la rechazaría). En indices_fotos pon SOLO los índices de las fotos DEL AUTO para publicar y en indice_foto la portada; las fotos de documentos (padrón, permiso, factura) NO van en indices_fotos —se leen pero NO se publican en la galería—. Tras crearlo, confirma con el id, marca/modelo/año y avisa qué campos quedaron pendientes por llenar.

🧾 FORMULARIO PARA AGREGAR UN GASTO (a un auto de MallorcAutos) — herramienta gasto_goautos:
Se dispara cuando Ramón dice "agrega/súmale un gasto al [auto]", "este auto gastó X en Y", "anótale los neumáticos al [auto]", etc.
• Primero IDENTIFICA el auto (te dio id/patente, o búscalo con consultar_goautos/buscar y confirma cuál si hay dudas).
• Toma lo que Ramón ya escribió en su mensaje y rellena lo que puedas. Manda este formulario marcando ✅ lo que ya tienes y ⬜ lo que falta, y pide SOLO lo que falte, TODO JUNTO en un mensaje (no de a uno, no repreguntes lo ya dicho):

  🧾 *Agregar gasto* — [marca modelo año del auto]
  *Obligatorios*
  1. Título del gasto (ej "Cambio de neumáticos"):
  2. Monto (CLP, el total que se pagó):
  3. ¿Con factura o sin factura?:
       · CON factura (lo normal) → pásame también el *N° de factura*. El sistema le saca el IVA solo (carga el neto).
       · SIN factura (boleta, contrato, derechos de transferencia) → queda sin IVA recuperable.
  *Opcionales (si no los dice, no lo trabes)*
  4. Categoría (Publicidad · Combustible · Comisión · Detailing/Limpieza · Documentación · Estacionamiento · Impuestos · Inspección Técnica · Mantenimiento · Neumáticos · Pintura · Reparaciones · Repuestos · Seguro · Transporte · Otros):
  5. Descripción / detalle:
  6. ¿Quién lo asume? (automotora / cliente) — por defecto automotora:

⚠️ El IVA lo define la FACTURA, no lo asumas: espera a que Ramón diga si es con o sin factura y, si no lo dice, PREGÚNTALO. El ~98% de los gastos son con factura. Cuando es con factura, PÍDELE el N° de factura (se guarda en la descripción del gasto). El monto es el total que pagó (lo que dice el documento); si es con factura, el sistema descuenta el IVA y carga el neto al costo del auto.
• NO crees el gasto sin: título, monto, y el dato de con/sin factura (y el N° si es con factura). Pide SOLO lo que falte. Con eso listo, llama gasto_goautos (categoría/quién asume/descripción van solo si los dio). Tras crearlo, confírmalo corto: auto, título, monto y con/sin factura (N° si aplica).

PROCEDIMIENTO para datos de Aliace (usa la BD, NO el navegador):
1) Elige el RPC del catálogo que calza con la pregunta y llama aliace_rpc. Para cifras canónicas (facturación, pagos, deuda, metas) PREFIERE SIEMPRE el RPC: entrega exactamente lo que muestra el portal.
2) Si es un detalle/conteo/filtro que no calza con un RPC, usa aliace_sql con un SELECT acotado (WHERE + LIMIT). Filtra deleted_at IS NULL en sales_request/clients.
3) Si una herramienta falla o sale vacía, REINTENTA tú una vez (revisa params, o cae a aliace_sql) antes de avisar. Resume el dato REAL; no inventes.
4) SOLO si un dato no existe en la BD y vive únicamente en la UI del portal, recién ahí navega admin.aliace.cl como fallback: iniciar_sesion('aliace') → navegar → esperar('table tbody tr') → leer_tabla. Si te manda a /login, reconecta con iniciar_sesion('aliace') tú solo.

PERSONAS: en WhatsApp NUNCA narres que te "comunicaste con Meme/Ali/Martes/Néstor" ni escribas líneas tipo "me comuniqué con X y me dijo": eso es plomería interna. Tú ERES Nico y respondes directo, en primera persona, el dato pedido y nada más. (Meme, Ali, etc. son áreas internas tuyas, no personas a las que "les preguntas" delante del usuario.)
GOAUTOS = SOLO MallorcAutos. Nunca des datos de otras automotoras.

👥 GESTIÓN DE USUARIOS (alta/baja — SOLO Ramón y Nico, los fundadores):
- Solo los FUNDADORES (Ramón y Nico) pueden crear, listar o quitar usuarios. Si lo pide otra persona, dile con amabilidad que no tiene permiso para eso.
- ALTA — cuando un fundador diga "agrega/crea un usuario", "da de alta a alguien", etc., PÍDELE (en uno o dos mensajes, claro): (1) el NOMBRE, (2) el NÚMERO de WhatsApp con +56, y (3) a qué ÁREAS le das acceso. Áreas (scopes) válidas:
  · *aliace* — facturación, ventas, pagos, cobranzas, deudas, metas y clientes.
  · *sii* — información tributaria (F29, compras/ventas).
  · *mallorca* — autos de GoAutos (ver/publicar/editar) + Excel del negocio.
  · *correo* — revisar y buscar correos.
  · *bd* — base del negocio (competencia, precios, catálogo).
  · *cerebro* — notas del Segundo Cerebro.
  Puede ser una o varias áreas. Muéstrale un RESUMEN (nombre · número · áreas) y pide OK; SOLO cuando confirme, llama agregar_usuario. La herramienta YA registra al usuario, lo habilita para escribirle a Nexus y le manda el WhatsApp de bienvenida con su lista de accesos — NO escribas tú esa bienvenida.
- BAJA — "quita / elimina / da de baja a X": confirma el número y llama quitar_usuario (no se puede quitar a un fundador).
- VER — "qué usuarios hay / lista de usuarios": llama listar_usuarios.
- ACCESOS: cada usuario solo puede usar SUS áreas. Si alguien te pide algo de un área que no tiene, dile que no tiene acceso a eso y que se lo pida a Ramón o Nico (la herramienta igual lo bloquea por seguridad). Ramón y Nico tienen acceso a todo.

🏦 BANCOS (agente "Leo", herramienta **banco**) — SOLO LECTURA, no mueve plata. Es la fuente para "cuánta plata hay en el banco", "saldo", "movimientos", "qué entró/salió", "ingresos y egresos del mes", "transferencias". Flujo: si no sabes de qué empresa hablan, parte con banco(accion:'empresas') para ver las empresas con banco conectado y su RUT; después usa 'saldos' (cuentas y saldo disponible), 'movimientos' (detalle; filtra con buscar/desde/hasta) o 'resumen' (ingresos/egresos/neto por mes). Los montos NEGATIVOS son EGRESOS. Reporta los campos *_fmt tal cual (ya vienen en pesos formateados). ⛔ NO confundas: el BANCO es plata real en cuentas (Leo); la FACTURACIÓN de Aliace es aliace_resumen (Ali); y el cruce banco↔SII es SAI (sai_conciliacion). Si te pide tendencia o comparación (ingresos vs egresos por mes, saldo por cuenta), acompáñalo con un GRÁFICO.

PROCEDIMIENTO SII (sistema "Martes", herramienta sii):
1) Cuando pidan descargar algo del SII (ej. "quiero descargar algo del SII"), llama sii(accion:'estado'): confirma la empresa (ANA CLARA SPA, su empresa_id) y los tipos que se pueden bajar. Dile al usuario "Me conecté a Martes" y lístale en lenguaje claro qué puede bajar (compras/ventas RCV, F29, F22, carpeta tributaria, ficha, boletas, libros).
2) Pregúntale QUÉ documento quiere y de QUÉ periodo (mes/año, formato AAAAMM; o un rango desde–hasta).
3) Llama sii(accion:'descargar', empresa_id, desde, hasta, docs:[tipo]) → te devuelve un job_id.
4) Consulta sii(accion:'job', job_id) hasta que el estado sea 'completado' (avísale al usuario que está bajando).
5) Cuando termine, usa sii(accion:'documentos', empresa_id) para ubicar el archivo y su "ruta".
6) ENVÍA EL ARCHIVO de verdad: llama sii(accion:'enviar', empresa_id, ruta) → le llega el PDF/Excel al WhatsApp para abrirlo. NUNCA te limites a escribir el nombre del archivo en el texto; si el usuario quiere el documento, mándalo con 'enviar'. Después confirma en una frase corta que ya se lo enviaste.
7) BOLETAS — resumen en texto: cuando envíes el PDF de boletas, además agrega UNA línea de texto con el resumen para verificar de un vistazo, usando los totales que vienen en el job (resultados[].resumen, por año). Ej.: "📄 Boletas recibidas — 2026: 13 boletas · $13,78M · 2025: 8 · $5,06M". Si un año no registra, dilo ("2025: sin boletas").
⚠️ SII bloquea por logins repetidos: NO dispares varias descargas en paralelo; una a la vez.
ℹ️ "boletas" = Boletas de Honorarios electrónicas RECIBIDAS (las que terceros le emiten a la empresa, resumen mensual del año actual y el anterior, desde el portal del SII). Si un documento dice "No registra información"/"No registra movimientos" para un periodo, eso es lo que el SII reporta de verdad — NO es falla nuestra ni del sistema; dilo claro y no ofrezcas reintentar por eso.

🧾 EMITIR UNA FACTURA / BOLETA (herramienta sii, accion:'emitir') — EMITE documentos tributarios, así que va SIEMPRE en 2 pasos (simular → confirmar), NUNCA de una:
0) 🚗 DOS MODOS DE FACTURA — el usuario elige (si no dice cuál y es un auto de MallorcAutos, OFRÉCELE los dos en una línea):
   · **AUTOMÁTICA (recomendada para autos del stock):** "créame una factura para la Raptor". Tú sacas los datos del auto de GoAutos y al usuario le pides SOLO 2 cosas: el CARNET y la DIRECCIÓN. Pasos: (a) consultar_goautos comando:'buscar' texto:'raptor' → si hay varios, muéstrale las opciones y que elija; (b) consultar_goautos comando:'ficha' id:<id> → te devuelve "datos_factura" (tipo, marca, modelo, motor, chasis, color, combustible, pbv, patente, año, precio) y "faltantes". ⚠️ Si "faltantes" viene VACÍO, tienes TODO el auto: NO pidas el CAV ni el PBV, sigue de largo. Si trae algo, pide SOLO eso; (c) PIDE, EN UN SOLO MENSAJE, la FOTO DEL CARNET del cliente y su DIRECCIÓN. Del carnet sacas NOMBRE COMPLETO + RUT; de la dirección que te dé sacas calle+número y la COMUNA (ej. "Av. Siempre Viva 123, Ñuñoa" → direccion:"Av. Siempre Viva 123", comuna:"Ñuñoa"). El GIRO NO lo preguntes: queda "PARTICULAR" por defecto y el SII autocompleta lo demás desde el RUT. Eso es TODO lo que necesitas del cliente — no pidas giro, ni razón social aparte, ni comuna por separado; (d) el PBV y el tipo NO están en GoAutos: salen del CAV guardado. Si faltan, pídelos (o el CAV) y GUÁRDALOS con guardar-cav para no volver a pedirlos; si no los tienes, omite el PBV, no lo inventes; (e) arma el ítem con nombre "Venta" + vehiculo:{…} y sigue con el paso 2 (borrador). El emisor SIEMPRE es ANA CLARA (ya está configurado, no lo preguntes). Usa el "precio" de GoAutos como referencia pero CONFIRMA el precio de venta real con el usuario.
   · **MANUAL:** el usuario te dicta todo (o te manda el CAV). Es el flujo de siempre (pasos 1 a 4).
   En AMBOS modos el resto es idéntico: afecta/exenta → borrador → borrador del SII en PDF → 2ª confirmación → firmar.
1) Lo PRIMERO SIEMPRE: pregunta si la factura es **AFECTA o NO AFECTA/EXENTA** (son las dos primeras opciones del portal del SII). AFECTA = lleva IVA 19% → tipo_dte 33. NO AFECTA / EXENTA = sin IVA → tipo_dte 34. No lo asumas: pregúntalo salvo que el usuario ya lo haya dicho. (Boleta = 39, solo si lo piden explícito.) Después junta el RECEPTOR y el DETALLE: para una FACTURA el receptor necesita SOLO rut + nombre (los sacas del carnet) + dirección (la ÚNICA que preguntas); el giro queda "PARTICULAR" por defecto y la comuna la sacas de la dirección — NO los pidas aparte. El detalle es una lista de ítems {nombre, cantidad, precio}, con el precio NETO (sin IVA) — el IVA 19% lo agrega el sistema solo en las afectas. Si de verdad falta un dato obligatorio (rut, nombre o dirección), PÍDESELO al usuario (todo junto en un mensaje) y no sigas.
1.b) 🚗 SI ES UN AUTO Y TE MANDAN EL CAV (foto o PDF del Certificado de Anotaciones Vigentes del vehículo): LÉELO tú mismo (ves la imagen/PDF adjunto) y saca estos datos → Tipo Vehículo, Marca, Modelo, Nro. Motor, Nro. Chasis, Color, Combustible, PBV, Patente, Año. 💾 **APENAS LEAS UN CAV, GUÁRDALO**: llama consultar_goautos comando:'guardar-cav' con patente + todos los datos que sacaste (sobre todo **pbv** y **tipo**, que NO existen en GoAutos). Así ese auto NUNCA más pide el CAV: tener los datos guardados es como tener el documento. Hazlo SIEMPRE, aunque la factura no se emita al final. ⚠️ REGLA FIJA: el **nombre del ítem es SIEMPRE "Venta"** cuando se vende un producto (así lo quiere Ramón, y además el campo del SII corta los nombres largos). El detalle del auto NO va en el nombre: va en "vehiculo":{tipo, marca, modelo, motor, chasis, color, combustible, pbv, patente, anio}, que se imprime como descripción bajo el ítem. Entonces: items:[{nombre:"Venta", cantidad:1, precio:<precio>, vehiculo:{…}}]. NO inventes ningún dato del auto: si el CAV no muestra alguno o no se lee, dilo y pídelo. El PRECIO no está en el CAV: pídeselo al usuario.
2) Llama sii(accion:'emitir', ...) SIN confirmado → te devuelve el campo borrador_texto (la factura armada con neto/IVA/total y la descripción del auto). MUÉSTRASELO TAL CUAL al usuario y pregúntale: "¿te genero el borrador oficial en el SII?".
3) 🖼️ CUANDO EL USUARIO CONFIRME —dice "sí", "dale", "emítela", "hazla", "genérala", o pide **"muéstrame el borrador en imagen / PDF"**— vuelve a llamar sii(accion:'emitir', ...) con los MISMOS datos y **confirmado=true**. Eso NO emite: corre un ROBOT que arma el borrador OFICIAL en el portal del SII y **le manda la IMAGEN del borrador por WhatsApp** (tú NO adjuntas nada, el sistema lo envía). ⛔ NUNCA le digas "no puedo generar el borrador en imagen/PDF": SÍ PUEDES, es exactamente esto (confirmado=true). Cuando la herramienta responda modo:'borrador_sii_enviado', dile al usuario que le mandaste el borrador en imagen para que lo revise; que el EMITIR final (firmar) queda para hacerlo supervisado. NUNCA pongas confirmado=true sin que el usuario haya pedido el borrador/emitir en el mensaje anterior.
4) 🔴 EMITIR DE VERDAD (firmar): SOLO después de haberle mandado la imagen del borrador (paso 3) y de que el usuario, ADVERTIDO de que es IRREVERSIBLE (consume folio y le llega al cliente), dé una 2ª confirmación EXPLÍCITA ("sí, fírmala y emítela"). Ahí llamas sii(accion:'emitir', ...) con los MISMOS datos y **emitir_real=true**. Eso firma en el SII y te devuelve el comprobante. NUNCA pongas emitir_real=true sin esa segunda confirmación clara, ni en la misma vuelta que generas el borrador. Si responde modo:'emision_bloqueada', la emisión está apagada: dilo, NO afirmes que se emitió.

💸 PAGAR UNA FACTURA DE COMPRA de ANA CLARA (sistema "tek", herramienta tek_pago) — paga a un proveedor desde la cuenta de ANA CLARA en Santander Empresa. ⚠️ HOY EN SIMULACIÓN: arma el borrador y "paga" en modo prueba, pero NO mueve plata (el canal real con el banco aún no está listo). Va SIEMPRE en 2 pasos: (a) con la factura de compra (proveedor, RUT, monto en CLP, folio) llama tek_pago accion:'preparar' → te da el BORRADOR (a quién, cuánto, desde qué cuenta). Muéstraselo y pregúntale CLARO por WhatsApp: "¿emito el pago de $X a [proveedor]?". (b) SOLO con su OK, llama tek_pago accion:'emitir' con los MISMOS datos → hoy responde SIMULACIÓN (te dice qué se transferiría, sin ejecutar). NUNCA emitas sin confirmación. Cuando en el futuro toque pagar de verdad, se pedirá tu segundo factor (Superclave). Si detectas una factura de compra por pagar, ofrécele armar el pago.

💸 TRANSFERIR PLATA A UNA PERSONA guardada (sistema "tek", agente "Leo", herramienta **tek_transferir**) — transfiere desde la cuenta de ANA CLARA (Santander Empresa) a una persona de la libreta. ✅ ES REAL: **crea** la transferencia y la deja *PENDIENTE "por liberar"*. OJO: crear ≠ enviar plata — el dinero NO se mueve hasta la **Liberación** (autorizar con Superclave), que es un paso APARTE, manual, que Nexus NO hace. Va SIEMPRE en 2 pasos: (a) con el nombre y el monto (CLP) llama tek_transferir accion:'preparar' → devuelve el BORRADOR (a quién, cuánto, banco, cuenta); si hay varias personas con ese nombre te da una lista para que ELIJA cuál. Muéstraselo y pregúntale CLARO: "¿creo la transferencia de $X a [persona]?". (b) SOLO con su OK explícito, llama tek_transferir accion:'enviar' con los MISMOS datos → crea la pendiente (login + llenado automático) y te dice cómo quedó. NUNCA pongas accion:'enviar' sin confirmación. Al confirmar, recuérdale que queda PENDIENTE y que alguien debe LIBERARLA en el banco para que la plata salga. Si la persona no está en la libreta, dilo y ofrécele guardarla primero.

REGLA DE ORO (acciones sensibles):
- Las acciones que muevan dinero o sean irreversibles (pagar, transferir, eliminar, enviar, confirmar, comprar, etc.) NO se ejecutan solas: requieren aprobación humana explícita de Ramón.
- Si una herramienta (por ejemplo clic) devuelve requiere_aprobacion:true, NO reintentes solo. Explícale a Ramón claramente la acción que se va a realizar y pídele confirmación. Solo si Ramón aprueba, vuelve a llamar a la herramienta con aprobado:true.`

const HERRAMIENTAS = [
  {
    name: 'listar_tablas',
    description: 'Lista los nombres de todas las tablas/vistas disponibles en la base de datos del negocio.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'consultar_bd',
    description: 'Lee filas de una tabla de la base de datos (solo lectura). Útil para responder sobre competencia, precios, oportunidades, catálogo, clientes, etc. IMPORTANTE: trae SOLO lo necesario. Para sumar/contar o filtrar por fecha NO traigas la tabla entera: usa "columnas" (solo las que necesitas) y "filtro" (filtra en el servidor). Si el resultado viene con "aviso" de recorte, vuelve a llamar acotando con columnas/filtro.',
    input_schema: {
      type: 'object',
      properties: {
        tabla: { type: 'string', description: 'Nombre exacto de la tabla (usa listar_tablas si dudas)' },
        columnas: { type: 'string', description: 'Columnas a traer, separadas por coma (ej "fecha,monto"). Por defecto todas (*). Úsalo siempre que puedas para no traer datos de más.' },
        filtro: { type: 'string', description: 'Filtro PostgREST que se aplica en el servidor, opcional. Encadena con & . Ej por mes: "fecha=gte.2026-06-01&fecha=lt.2026-07-01". Ej igualdad: "estado=eq.pagado".' },
        limite: { type: 'integer', description: 'Máximo de filas a traer (por defecto 25, máximo 200)' },
        orden: { type: 'string', description: 'Columna por la que ordenar, opcional. Formato PostgREST, ej: "precio.desc"' },
      },
      required: ['tabla'],
    },
  },
  {
    name: 'buscar_cerebro',
    description: 'Busca en el Segundo Cerebro (notas de conocimiento empresarial) por texto.',
    input_schema: {
      type: 'object',
      properties: { q: { type: 'string', description: 'Texto a buscar' } },
      required: ['q'],
    },
  },
  {
    name: 'guardar_nota',
    description: 'Guarda una nota nueva en el Segundo Cerebro (por ejemplo un resumen o aprendizaje). No sobrescribe notas existentes.',
    input_schema: {
      type: 'object',
      properties: {
        ruta: { type: 'string', description: 'Ruta/título de la nota, ej: "90-Agente/resumen-competencia"' },
        contenido: { type: 'string', description: 'Contenido en Markdown' },
      },
      required: ['ruta', 'contenido'],
    },
  },
  {
    name: 'navegar',
    description: 'Abre una URL en el navegador. Úsalo para empezar a operar una página web o panel interno.',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string', description: 'URL completa a abrir, ej: "https://ejemplo.com"' } },
      required: ['url'],
    },
  },
  {
    name: 'ver_pestanas',
    description: 'Muestra el estado del navegador: la pestaña activa y la lista de pestañas abiertas (url y título).',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'cambiar_pestana',
    description: 'Cambia a otra pestaña abierta por su índice (el campo i que devuelve ver_pestanas).',
    input_schema: {
      type: 'object',
      properties: { i: { type: 'integer', description: 'Índice de la pestaña a activar' } },
      required: ['i'],
    },
  },
  {
    name: 'leer_pagina',
    description: 'Devuelve el texto visible de la página actual. Úsalo para entender qué hay antes de actuar.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'captura_pantalla',
    description: 'Toma una captura PNG de la página actual. Devuelve solo un resumen (url y tamaño), no la imagen.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'escribir_en_campo',
    description: 'Rellena un campo de formulario de la página actual con un texto.',
    input_schema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Selector CSS del campo, ej: "#email" o "input[name=\'q\']"' },
        texto: { type: 'string', description: 'Texto a escribir en el campo' },
      },
      required: ['selector', 'texto'],
    },
  },
  {
    name: 'clic',
    description: 'Hace clic en un elemento de la página, por texto visible o por selector CSS. Si la acción es sensible (mueve dinero o es irreversible) devolverá que requiere aprobación: en ese caso pide confirmación a Ramón y solo reintenta con aprobado:true si él aprueba.',
    input_schema: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'Texto visible del elemento a clickear (botón, enlace), opcional' },
        selector: { type: 'string', description: 'Selector CSS del elemento, opcional' },
        aprobado: { type: 'boolean', description: 'Pon true SOLO si Ramón ya aprobó explícitamente una acción sensible' },
      },
      required: [],
    },
  },
  {
    name: 'esperar',
    description: 'Espera a que una página dinámica (SPA, ej. Aliace) termine de cargar datos antes de leerla o extraer su tabla. Pasa "aparece" (selector CSS que debe aparecer, ej. "table tbody tr") y/o "desaparece" (selector o texto que debe irse, ej. "Cargando"). Si no pasas nada, espera a que la red quede inactiva. Devuelve ok:false si se agota el tiempo (puedes reintentar).',
    input_schema: {
      type: 'object',
      properties: {
        aparece: { type: 'string', description: 'Selector CSS que debe aparecer/ser visible, ej: "table tbody tr"' },
        desaparece: { type: 'string', description: 'Selector o texto que debe desaparecer, ej: "Cargando" o ".animate-spin"' },
        ms: { type: 'integer', description: 'Tiempo máximo de espera en milisegundos (por defecto 20000)' },
      },
      required: [],
    },
  },
  {
    name: 'leer_tabla',
    description: 'Extrae la tabla principal de la página actual como datos estructurados (columnas y filas). Úsalo después de esperar a que carguen los datos. Si no pasas selector, usa la tabla con más filas. Ideal para portales como Aliace.',
    input_schema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Selector CSS de la <table> a extraer, opcional. Si se omite, se usa la tabla con más filas.' },
      },
      required: [],
    },
  },
  {
    name: 'guia_aliace',
    description: 'Devuelve la guía operativa del portal Aliace (admin.aliace.cl): para cada sección, la URL exacta, el selector de "datos cargados" y la tabla principal. Consúltala antes de navegar Aliace si no recuerdas la ruta o el selector.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'iniciar_sesion',
    description: 'Inicia sesión en un sitio usando las credenciales ya guardadas para ese sitio.',
    input_schema: {
      type: 'object',
      properties: { sitio: { type: 'string', description: 'Nombre del sitio (ver listar_sitios)' } },
      required: ['sitio'],
    },
  },
  {
    name: 'guardar_credencial',
    description: 'Guarda las credenciales de un sitio para poder iniciar sesión después con iniciar_sesion.',
    input_schema: {
      type: 'object',
      properties: {
        sitio: { type: 'string', description: 'Nombre corto del sitio, ej: "banco" o "proveedor-x"' },
        url: { type: 'string', description: 'URL de la página de login' },
        usuario: { type: 'string', description: 'Usuario o email' },
        clave: { type: 'string', description: 'Contraseña' },
      },
      required: ['sitio', 'url', 'usuario', 'clave'],
    },
  },
  {
    name: 'listar_sitios',
    description: 'Lista los nombres de los sitios que tienen credenciales guardadas.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'consultar_goautos',
    description: 'Datos de autos de GoAutos (MallorcAutos) EN TEXTO. SOLO LECTURA. comando: resumen (totales) | publicaciones (DISPONIBLES en stock; OJO: NO es el estado "Publicado") | publicados (= autos en estado Publicado) | vehiculos (todos) | vendidos (con precio/fecha de venta) | estados (lista de estados con conteo) | por-estado (autos de un estado: Publicado, Reservado, Vendido, Chillan, Revisión Mecánica, Preparación, Archivado…) | buscar. Si el usuario dice "publicados/publicado" usa "publicados" (o por-estado estado=publicado), NUNCA "publicaciones". Para por-estado pasa "estado".',
    input_schema: {
      type: 'object',
      properties: {
        comando: { type: 'string', enum: ['resumen', 'publicaciones', 'publicados', 'vehiculos', 'vendidos', 'estados', 'por-estado', 'buscar', 'ficha', 'guardar-cav'] },
        patente: { type: 'string', description: 'Para "guardar-cav": patente del auto (obligatoria).' },
        tipo: { type: 'string', description: 'Para "guardar-cav": Tipo de Vehículo del CAV (ej "CAMIONETA", "AUTOMOVIL").' },
        motor: { type: 'string', description: 'Para "guardar-cav": Nro. Motor del CAV.' },
        chasis: { type: 'string', description: 'Para "guardar-cav": Nro. Chasis del CAV.' },
        color: { type: 'string', description: 'Para "guardar-cav": color del CAV.' },
        combustible: { type: 'string', description: 'Para "guardar-cav": combustible del CAV.' },
        pbv: { type: 'string', description: 'Para "guardar-cav": PBV del CAV (ej "2.055,00 KILOS"). NO existe en GoAutos: solo sale del CAV.' },
        anio: { type: 'string', description: 'Para "guardar-cav": año del CAV.' },
        fuente: { type: 'string', description: 'Para "guardar-cav": de dónde salió (ej "CAV 14-07-2026").' },
        estado: { type: 'string', description: 'Para "por-estado": nombre del estado (ej "publicado", "reservado", "vendido", "chillan", "revisión mecánica", "preparación", "archivado")' },
        texto: { type: 'string', description: 'Para "buscar": marca o modelo, ej "audi"' },
        id: { type: 'integer', description: 'Para "ficha": id del auto (lo da "buscar"). Devuelve la ficha COMPLETA con motor, chasis, color, combustible, patente, año y precio → el campo "datos_factura" sirve para armar la FACTURA AUTOMÁTICA sin CAV.' },
        limite: { type: 'integer', description: 'Máximo de vehículos a traer (opcional)' },
      },
      required: ['comando'],
    },
  },
  {
    name: 'editar_goautos',
    description: 'EDITA un auto de MallorcAutos en GoAutos: cambia estado, ubicación (local/online), sucursal, precio, km, etc. SOLO MallorcAutos (el conector verifica antes de escribir). Necesitas el id del auto (sácalo de consultar_goautos/buscar). Pasa SOLO los campos que se cambian.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'ID del auto en GoAutos (de consultar_goautos/buscar)' },
        estado: { type: 'string', description: 'Nuevo estado: publicado/reservado/vendido/chillan/revisión mecánica/preparación/listo para la foto/archivado' },
        ubicacion: { type: 'string', description: '"local" (en el local físico) u "online"', enum: ['local', 'online'] },
        sucursal: { type: 'string', description: 'Nombre o id de la sucursal física (ej "Las Condes")' },
        precio: { type: 'integer', description: 'Precio de venta en CLP' },
        precio_min: { type: 'integer', description: 'Precio mínimo en CLP' },
        descuento: { type: 'number', description: 'Descuento en %' },
        km: { type: 'integer', description: 'Kilometraje' },
        anio: { type: 'integer', description: 'Año del auto' },
        duenos: { type: 'integer', description: 'Número de dueños' },
        patente: { type: 'string', description: 'Patente' },
        transmision: { type: 'string', description: 'automática/mecánica/cvt/dct' },
        en_stock: { type: 'boolean', description: 'true = en stock/publicado, false = fuera de stock' },
        publicado: { type: 'boolean', description: 'Marca el flag is_published' },
        descripcion: { type: 'string', description: 'Descripción del auto' },
      },
      required: ['id'],
    },
  },
  {
    name: 'adquisicion_goautos',
    description: 'Edita los DATOS DE ADQUISICIÓN (precio de COMPRA + datos del VENDEDOR/proveedor) de un auto EXISTENTE de MallorcAutos, directo en GoAutos (SIN navegador). SOLO MallorcAutos (el conector verifica client_id=32). Necesitas el id del auto (de consultar_goautos/buscar). Úsalo cuando pidan registrar/cambiar a cuánto se COMPRÓ el auto y a QUIÉN (nombre, RUT, teléfono, dirección). El VENDEDOR se CREA o se vincula como CLIENTE/contacto de GoAutos (mismo formato que un cliente normal, NO como nota suelta). Si ya había datos de compra, los actualiza.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'ID del auto en GoAutos' },
        precio_compra: { type: 'integer', description: 'Precio de compra/adquisición en CLP' },
        proveedor: { type: 'string', description: 'Nombre del vendedor/proveedor al que se le compró' },
        proveedor_rut: { type: 'string', description: 'RUT del vendedor' },
        proveedor_fono: { type: 'string', description: 'Teléfono del vendedor' },
        proveedor_dir: { type: 'string', description: 'Dirección del vendedor' },
      },
      required: ['id'],
    },
  },
  {
    name: 'cliente_goautos',
    description: 'Gestiona CLIENTES/contactos de MallorcAutos en GoAutos (incluye vendedores/proveedores y compradores). accion: "buscar" (por rut, texto/nombre o id), "crear" (agrega un cliente nuevo: persona con nombre+apellido, o empresa con --empresa), "editar" (cambia datos de un cliente por id o rut). SOLO MallorcAutos. Úsalo cuando quieran AGREGAR/ver/editar un vendedor o cliente directamente (no dentro de una venta).',
    input_schema: {
      type: 'object',
      properties: {
        accion: { type: 'string', enum: ['buscar', 'crear', 'editar'], description: 'buscar | crear | editar' },
        id: { type: 'integer', description: 'id del cliente (editar/buscar)' },
        rut: { type: 'string', description: 'RUT del cliente' },
        texto: { type: 'string', description: 'para buscar: nombre/apellido/empresa' },
        nombre: { type: 'string', description: 'primer nombre (persona)' },
        apellido: { type: 'string', description: 'apellido(s) (persona)' },
        empresa: { type: 'string', description: 'razón social (si es empresa)' },
        telefono: { type: 'string' },
        email: { type: 'string' },
        direccion: { type: 'string' },
      },
      required: ['accion'],
    },
  },
  {
    name: 'editar_venta_goautos',
    description: 'EDITA una nota de venta EXISTENTE de MallorcAutos (precio, estado, forma de pago, fecha, comprador cliente_id, comisión, financiera, transferencia, notas). SOLO MallorcAutos (el conector verifica antes de escribir). Necesitas el id de la venta. CONFIRMA con el usuario antes de cambiar montos o estado (no se deshace solo).',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'id de la venta (vehicles_sales)' },
        precio: { type: 'integer', description: 'precio de venta CLP' },
        estado: { type: 'string', description: 'estado (ej. approved, pending, rejected)' },
        pago: { type: 'string', description: 'forma de pago' },
        fecha: { type: 'string', description: 'fecha de venta dd/mm/aaaa' },
        cliente_id: { type: 'integer', description: 'id del comprador' },
        comision: { type: 'integer' },
        comision_pct: { type: 'number' },
        financiera: { type: 'string' },
        transferencia: { type: 'integer' },
        notas: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'vender_goautos',
    description: 'REGISTRA LA VENTA (nota de venta) de un auto de MallorcAutos en GoAutos: crea el documento + la venta (queda aprobada) y marca el auto como "Vendido". SOLO MallorcAutos (el conector verifica antes de escribir). Necesitas el id del auto (sácalo de consultar_goautos/buscar) y el precio de venta. CONFIRMA con el usuario el auto y el precio ANTES de llamar (es una acción que cambia el estado del auto y NO se deshace sola). El comprador es opcional: pásalo por cliente_id, o por rut (si ya existe), o por nombre+apellido (+ rut/email/teléfono) para crearlo. Usa simular=true si solo quieres previsualizar sin escribir.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'ID del auto a vender (de consultar_goautos/buscar)' },
        precio: { type: 'integer', description: 'Precio de venta efectivo en CLP (lo que pagó el comprador)' },
        pago: { type: 'string', description: 'Método de pago: efectivo/transferencia/tarjeta/credito/cheque/financiamiento/mixto', enum: ['efectivo', 'transferencia', 'tarjeta', 'credito', 'cheque', 'financiamiento', 'mixto'] },
        fecha: { type: 'string', description: 'Fecha de la venta dd/mm/aaaa (si no se indica, hoy). Útil para registrar ventas históricas.' },
        cliente_id: { type: 'integer', description: 'ID del comprador si ya existe en GoAutos' },
        rut: { type: 'string', description: 'RUT del comprador (para buscarlo; si no existe y das nombre+apellido se crea)' },
        nombre: { type: 'string', description: 'Nombre del comprador (para crear cliente persona)' },
        apellido: { type: 'string', description: 'Apellido del comprador (para crear cliente persona)' },
        empresa: { type: 'string', description: 'Razón social, si el comprador es empresa' },
        email: { type: 'string', description: 'Email del comprador' },
        telefono: { type: 'string', description: 'Teléfono del comprador' },
        direccion: { type: 'string', description: 'Dirección del comprador' },
        financiera: { type: 'string', description: 'Financiera, si la venta es con crédito/financiamiento (ej "Forum")' },
        abonos: { type: 'string', description: 'Desglose de pagos "Título:monto,Título:monto" (ej "Pie:1000000,Saldo:21900000")' },
        transferencia: { type: 'integer', description: 'Valor de transferencia/CRT en CLP (si aplica)' },
        notas: { type: 'string', description: 'Notas/observaciones de la venta' },
        simular: { type: 'boolean', description: 'true = solo previsualizar (no escribe nada); muestra qué se crearía y a qué estado pasaría el auto' },
      },
      required: ['id', 'precio'],
    },
  },
  {
    name: 'gasto_goautos',
    description: 'AGREGA UN GASTO a un auto de MallorcAutos en GoAutos (gastos/transacciones del vehículo: taller, neumáticos, transferencia, documentación, etc.). SOLO MallorcAutos (el conector verifica antes de escribir). OBLIGATORIOS: id del auto (de consultar_goautos/buscar), TÍTULO, MONTO y si el gasto es CON o SIN FACTURA. El MONTO es el total que se pagó (lo que dice el documento). CON FACTURA → IVA recuperable: el sistema descuenta el IVA y carga el neto (es el caso del ~98% de los gastos). SIN FACTURA (boleta, contrato, derechos de transferencia) → no se recupera IVA. NO asumas con/sin factura: espera a que te lo digan y PREGÚNTALO si no lo aclaran. Si falta título, monto o el dato de factura, pregúntalo. Usa simular=true para previsualizar sin escribir.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'ID del auto en GoAutos (de consultar_goautos/buscar)' },
        titulo: { type: 'string', description: 'Título corto del gasto, ej "Cambio de neumáticos", "Transferencia"' },
        monto: { type: 'integer', description: 'Monto del gasto en CLP: el total que se pagó (lo que dice la factura o boleta)' },
        factura: { type: 'boolean', description: 'OBLIGATORIO saberlo. true = el gasto tiene FACTURA (IVA recuperable; el sistema descuenta el IVA y carga el neto) — es el ~98% de los casos. false = SIN factura (boleta, contrato, derechos de transferencia). NO lo asumas: si el usuario no dijo con/sin factura, PREGÚNTALO antes de registrar.' },
        numero_factura: { type: 'string', description: 'N° de la factura. Cuando el gasto es CON factura (factura=true), PÍDELO si no lo dieron. Se guarda en la descripción del gasto ("Factura N° X"). No aplica si es sin factura.' },
        categoria: { type: 'string', description: 'Categoría (opcional): Publicidad, Combustible, Comisión, Detailing/Limpieza, Documentación, Estacionamiento, Impuestos, Inspección Técnica, Mantenimiento, Neumáticos, Pintura, Reparaciones, Repuestos, Seguro, Transporte, Otros' },
        descripcion: { type: 'string', description: 'Detalle/observación del gasto (opcional)' },
        asume: { type: 'string', description: 'Quién asume el gasto: "automotora" (default) o "cliente"/consignador', enum: ['automotora', 'cliente'] },
        genera_credito_fiscal: { type: 'boolean', description: 'Equivalente a `factura` (IVA recuperable). Usa preferentemente `factura`. true = con factura.' },
        fecha: { type: 'string', description: 'Fecha del gasto dd/mm/aaaa (si no, hoy). Para gastos retroactivos.' },
        simular: { type: 'boolean', description: 'true = previsualizar sin escribir nada' },
      },
      required: ['id', 'titulo', 'monto'],
    },
  },
  {
    name: 'subir_auto',
    description: 'CREA/INGRESA un auto NUEVO en MallorcAutos (GoAutos) a partir de la foto y los documentos que el usuario mandó por WhatsApp. SOLO MallorcAutos. TÚ lees los documentos adjuntos (padrón, permiso de circulación, factura) y rellenas los campos; lo que NO esté en los documentos y haga falta, PREGÚNTALO antes (no inventes). GoAutos exige OBLIGATORIOS para publicar: marca, modelo, año, kilometraje, combustible, tipo/carrocería, color, condición, los vencimientos de revisión técnica + permiso de circulación + gases, y la ADQUISICIÓN (si el auto es COMPRADO o CONSIGNADO, con su precio). Si falta cualquiera, NO lo subas: pídelo. Muestra un resumen y pide confirmación; llama esta tool SOLO cuando el usuario confirme. El auto entra en estado "Chillan" (ingreso) y "en el local" por defecto.',
    input_schema: {
      type: 'object',
      properties: {
        marca: { type: 'string', description: 'Marca, ej "Toyota" (obligatorio)' },
        modelo: { type: 'string', description: 'Modelo, ej "Hilux" (obligatorio)' },
        anio: { type: 'integer', description: 'Año (obligatorio)' },
        patente: { type: 'string', description: 'Patente (del documento si está)' },
        precio: { type: 'integer', description: 'Precio de venta en CLP (si lo sabes)' },
        km: { type: 'integer', description: 'Kilometraje' },
        color: { type: 'string', description: 'Color' },
        combustible: { type: 'string', description: 'gasolina / diesel / híbrido / eléctrico' },
        transmision: { type: 'string', description: 'automática / mecánica / cvt / dct' },
        traccion: { type: 'string', description: '4x2 / 4x4 / AWD' },
        duenos: { type: 'integer', description: 'Número de dueños' },
        version: { type: 'string', description: 'Versión / variante' },
        descripcion: { type: 'string', description: 'Descripción libre' },
        ubicacion: { type: 'string', enum: ['local', 'online'], description: 'Por defecto "local"' },
        estado: { type: 'string', description: 'Por defecto "Chillan". Solo cámbialo si el usuario lo pide.' },
        condicion: { type: 'string', enum: ['nuevo', 'usado', 'semi-nuevo'], description: 'Condición del auto. Por defecto "usado".' },
        tipo: { type: 'string', description: 'Tipo/carrocería: Suv, Sedan, Hatchback, Pickup, Camioneta, Coupé, Van, Station Wagon, etc.' },
        precio_min: { type: 'integer', description: 'Precio MÍNIMO de venta en CLP (piso para negociar). Suele ser interno.' },
        descuento: { type: 'integer', description: 'Descuento en % (0-100)' },
        motor: { type: 'string', description: 'N° de motor (del padrón)' },
        chasis: { type: 'string', description: 'N° de chasis / VIN (del padrón)' },
        llaves: { type: 'integer', description: 'N° de llaves' },
        adquisicion: { type: 'string', enum: ['compra', 'consignacion'], description: 'OBLIGATORIO. Cómo entró el auto: "compra" (propio/comprado) o "consignacion" (de un tercero). Define is_consigned y registra el costo de entrada del auto.' },
        precio_adquisicion: { type: 'integer', description: 'OBLIGATORIO. Precio en CLP de esa compra o consignación (el costo de entrada del auto). Si es compra = precio que se pagó; si es consignación = precio acordado.' },
        proveedor: { type: 'string', description: 'A quién se le compró el auto, o quién lo consigna (opcional).' },
        fecha_compra: { type: 'string', description: 'Fecha de la compra/consignación dd/mm/aaaa (opcional, por defecto hoy).' },
        prenda: { type: 'boolean', description: '¿Tiene prenda/gravamen? true/false' },
        iva_exento: { type: 'boolean', description: '¿IVA exento? true/false' },
        facturable: { type: 'boolean', description: '¿Se puede facturar con IVA? true/false' },
        transferencia: { type: 'integer', description: 'Valor de la transferencia en CLP' },
        rev_tecnica: { type: 'string', description: 'Vencimiento de la REVISIÓN TÉCNICA (dd/mm/aaaa o aaaa-mm-dd). Del permiso/revisión.' },
        permiso_circulacion: { type: 'string', description: 'Vencimiento del PERMISO DE CIRCULACIÓN (dd/mm/aaaa, o mm/aaaa). Del permiso de circulación.' },
        gases: { type: 'string', description: 'Vencimiento de la REVISIÓN DE GASES / sello verde (dd/mm/aaaa)' },
        permiso_municipal: { type: 'string', description: 'Vencimiento del permiso municipal (dd/mm/aaaa)' },
        comuna_permiso: { type: 'string', description: 'Comuna/municipalidad donde se pagó el permiso de circulación' },
        etiqueta: { type: 'string', description: 'Etiqueta/badge de marketing, ej "REBAJADO", "FACT IVA INCL." (opcional)' },
        indice_foto: { type: 'integer', description: 'Índice (0-based) del adjunto que es la FOTO DE PORTADA del auto. 0 = primer adjunto.' },
        indices_fotos: { type: 'array', items: { type: 'integer' }, description: 'Índices (0-based) de TODOS los adjuntos que son FOTOS DEL AUTO para publicar. Los documentos (padrón, permiso, factura) NO van acá: se leen pero NO se publican. Si solo hay una foto del auto, pon su índice.' },
      },
      required: ['marca', 'modelo', 'anio'],
    },
  },
  {
    name: 'consultar_mallorca',
    description: 'Datos FINANCIEROS del negocio Mallorca desde su Excel global (SOLO LECTURA). Complementa a GoAutos: GoAutos tiene precio publicado/estado/foto, pero el COSTO, GASTOS, TOTAL invertido, PV esperado y MARGEN están acá. Cruce por PATENTE. Úsalo para margen/costo de un auto, stock valorizado (plata invertida), ventas y márgenes, o cualquier otra hoja del Excel (CxC, CxP, flujo, etc.). comando: stock (stock valorizado: total invertido + lista) | auto (costo/margen de UN auto por patente) | ventas (ventas y márgenes; opcional --mes YYYY-MM) | hojas (lista las hojas del Excel) | hoja (lee una hoja cualquiera por nombre).',
    input_schema: {
      type: 'object',
      properties: {
        comando: { type: 'string', enum: ['stock', 'auto', 'ventas', 'hojas', 'hoja'] },
        patente: { type: 'string', description: 'Para "auto": patente del vehículo (sácala de GoAutos si no la tienes)' },
        mes: { type: 'string', description: 'Para "ventas": mes YYYY-MM (opcional; sin esto, total acumulado)' },
        hoja: { type: 'string', description: 'Para "hoja": nombre EXACTO de la hoja (usa "hojas" para verlas)' },
        buscar: { type: 'string', description: 'Para "hoja": filtra filas que contengan este texto' },
        limite: { type: 'integer', description: 'Para "hoja": máximo de filas a traer' },
      },
      required: ['comando'],
    },
  },
  {
    name: 'enviar_fotos_autos',
    description: 'Envía por WhatsApp al usuario UNA tarjeta por auto (foto + ficha con máximo detalle), una tras otra. Úsalo cuando quiera VER/recibir autos con foto. Por defecto los DISPONIBLES; con comando "por-estado" + estado manda los de CUALQUIER estado (Publicado, Reservado, Vendido —con precio/fecha de venta—, Chillan, etc.).',
    input_schema: {
      type: 'object',
      properties: {
        comando: { type: 'string', description: 'publicaciones (disponibles en stock, default; NO es el estado "Publicado") | publicados (autos en estado Publicado) | vehiculos (todos) | vendidos | por-estado | buscar', enum: ['publicaciones', 'publicados', 'vehiculos', 'vendidos', 'por-estado', 'buscar'] },
        estado: { type: 'string', description: 'Para "por-estado": nombre del estado (publicado/reservado/vendido/chillan/revisión mecánica/preparación/archivado)' },
        texto: { type: 'string', description: 'Para "buscar": marca o modelo, ej "audi"' },
        limite: { type: 'integer', description: 'Cuántos autos enviar (por defecto 6, máximo 15)' },
      },
      required: [],
    },
  },
  // ── GoAutos ampliado (capacidades portadas de la IA "GAIA" de GoAuto Admin, agente "Meme"). SOLO MallorcAutos. ──
  {
    name: 'leads_goautos',
    description: 'Consulta los LEADS / prospectos de MallorcAutos (gente interesada en comprar o vender, de WhatsApp, web, ChileAutos, etc.). Agente "Meme". SOLO LECTURA. Filtros opcionales: estado (pending/assigned/completed/cancelled), tipo (buy-direct/buy-consignment/search-request/sell-vehicle/…), categoria (compra/venta), nombre del cliente, desde/hasta (fecha ISO), limite. Un lead pendiente de +48h es una venta que se puede perder.',
    input_schema: { type: 'object', properties: {
      estado: { type: 'string', enum: ['pending', 'assigned', 'completed', 'cancelled'] },
      tipo: { type: 'string', description: 'buy-direct | buy-consignment | search-request | sell-vehicle | sell-financing | sell-transfer | contact-general' },
      categoria: { type: 'string', enum: ['compra', 'venta'] },
      nombre: { type: 'string', description: 'nombre del cliente (filtra)' },
      desde: { type: 'string', description: 'fecha ISO YYYY-MM-DD' }, hasta: { type: 'string', description: 'fecha ISO' },
      limite: { type: 'integer', description: 'default 15, máx 100' },
    }, required: [] },
  },
  {
    name: 'lead_estado_goautos',
    description: 'Cambia el ESTADO de un lead de MallorcAutos (pending→assigned→completed/cancelled). Agente "Meme". ESCRITURA: simula primero (simular=true), muestra el cambio y confirma antes de aplicar. El id sale de leads_goautos.',
    input_schema: { type: 'object', properties: {
      id: { type: 'integer', description: 'id del lead (de leads_goautos)' },
      estado: { type: 'string', enum: ['pending', 'assigned', 'completed', 'cancelled'] },
      simular: { type: 'boolean', description: 'true = solo simular (previsualiza sin escribir)' },
    }, required: ['id', 'estado'] },
  },
  {
    name: 'citas_goautos',
    description: 'Consulta las CITAS / agendamientos de MallorcAutos (visitas al showroom, pruebas de manejo, etc.). Agente "Meme". SOLO LECTURA. Filtros: estado, desde/hasta (fecha ISO), nombre del cliente, limite.',
    input_schema: { type: 'object', properties: {
      estado: { type: 'string' }, desde: { type: 'string' }, hasta: { type: 'string' },
      nombre: { type: 'string' }, limite: { type: 'integer' },
    }, required: [] },
  },
  {
    name: 'financiamiento_goautos',
    description: 'Consulta FINANCIAMIENTOS de MallorcAutos (créditos de autos: pie, cuota mensual, nº de cuotas, día de pago) y opcionalmente sus PAGOS/cuotas. Agente "Meme". SOLO LECTURA. Filtros: customer_id, vehicle_id, pagos (incluir cuotas), limite.',
    input_schema: { type: 'object', properties: {
      customer_id: { type: 'integer' }, vehicle_id: { type: 'integer' },
      pagos: { type: 'boolean', description: 'incluir las cuotas/pagos' }, limite: { type: 'integer' },
    }, required: [] },
  },
  {
    name: 'documentos_goautos',
    description: 'Consulta DOCUMENTOS de MallorcAutos: cotizaciones, reservas, cierres de negocio, plantillas o documentos de venta. Agente "Meme". SOLO LECTURA. tipo = cotizaciones (default) | reservas | cierres | plantillas | documentos. Filtros: vehicle_id, limite.',
    input_schema: { type: 'object', properties: {
      tipo: { type: 'string', enum: ['cotizaciones', 'reservas', 'cierres', 'plantillas', 'documentos'] },
      vehicle_id: { type: 'integer' }, limite: { type: 'integer' },
    }, required: [] },
  },
  {
    name: 'marketing_goautos',
    description: 'Estado de MARKETING/publicación de MallorcAutos: integraciones conectadas (Instagram, MercadoLibre, Facebook Marketplace, ChileAutos) y sus publicaciones. Agente "Meme". SOLO LECTURA (no publica). Sin plataforma → estado de conexión de todas; con plataforma → sus publicaciones. plataforma = instagram | mercadolibre | facebook | chileautos | emails.',
    input_schema: { type: 'object', properties: {
      plataforma: { type: 'string', enum: ['instagram', 'mercadolibre', 'facebook', 'chileautos', 'emails'] },
      limite: { type: 'integer' },
    }, required: [] },
  },
  {
    name: 'equipo_goautos',
    description: 'Consulta el EQUIPO de MallorcAutos (usuarios/vendedores, rol) y opcionalmente los tramos de COMISIÓN. Agente "Meme". SOLO LECTURA. Flags: comisiones, limite.',
    input_schema: { type: 'object', properties: {
      comisiones: { type: 'boolean' }, limite: { type: 'integer' },
    }, required: [] },
  },
  {
    name: 'gastos_fijos_goautos',
    description: 'Consulta los GASTOS FIJOS mensuales de MallorcAutos (arriendo, sueldos, servicios…) con su total mensual. Agente "Meme". SOLO LECTURA. Por defecto solo activos; flag "todos" para incluir inactivos. (Los gastos de un AUTO puntual se agregan con gasto_goautos.)',
    input_schema: { type: 'object', properties: {
      todos: { type: 'boolean' }, limite: { type: 'integer' },
    }, required: [] },
  },
  {
    name: 'config_goautos',
    description: 'Consulta CONFIGURACIÓN/catálogos de MallorcAutos: estados de vehículo, marcas, modelos, colores, condiciones, combustibles, categorías, sucursales, info legal, tramos de comisión. Agente "Meme". SOLO LECTURA. entidad = estados (default) | marcas | modelos | colores | condiciones | combustibles | categorias | sucursales | legal | comisiones.',
    input_schema: { type: 'object', properties: {
      entidad: { type: 'string', enum: ['estados', 'marcas', 'modelos', 'colores', 'condiciones', 'combustibles', 'categorias', 'sucursales', 'legal', 'comisiones'] },
      limite: { type: 'integer' },
    }, required: [] },
  },
  {
    name: 'tasar_auto',
    description: 'TASA un vehículo con precios REALES del mercado chileno (busca publicaciones vivas en ChileAutos/Yapo/etc. y devuelve un rango estimado con fuentes). Agente "Meme". Úsalo cuando pregunten "¿en cuánto puedo vender/comprar…?", "tasa este auto", "cuánto vale un …". Pasa en query la descripción libre: marca, modelo, año, versión y km si se saben.',
    input_schema: { type: 'object', properties: {
      query: { type: 'string', description: 'Descripción del auto: marca, modelo, año, versión, km. Ej: "Toyota Hilux 2019 4x4 diesel 90000 km"' },
    }, required: ['query'] },
  },
  {
    name: 'crear_tarea_goautos',
    description: 'Crea una TAREA/recordatorio en MallorcAutos (ej. "llamar al prospecto X mañana"). Agente "Meme". ESCRITURA: simula primero (simular=true) y confirma. Campos: titulo (obligatorio), descripcion, prioridad (low/medium/high), vence (fecha ISO), categoria, vehicle_id.',
    input_schema: { type: 'object', properties: {
      titulo: { type: 'string' }, descripcion: { type: 'string' },
      prioridad: { type: 'string', enum: ['low', 'medium', 'high'] }, vence: { type: 'string', description: 'fecha ISO' },
      categoria: { type: 'string' }, vehicle_id: { type: 'integer' },
      simular: { type: 'boolean' },
    }, required: ['titulo'] },
  },
  {
    name: 'crear_cotizacion_goautos',
    description: 'Crea una COTIZACIÓN de un auto para un cliente en MallorcAutos. Agente "Meme". ESCRITURA: simula primero (simular=true) y confirma. Campos: vehicle_id, customer_id, precio (estimado), validez (días, default 30), notas. Los ids salen de consultar_goautos/buscar y cliente_goautos.',
    input_schema: { type: 'object', properties: {
      vehicle_id: { type: 'integer' }, customer_id: { type: 'integer' }, precio: { type: 'integer' },
      validez: { type: 'integer' }, notas: { type: 'string' }, simular: { type: 'boolean' },
    }, required: ['vehicle_id', 'customer_id', 'precio'] },
  },
  {
    name: 'crear_reserva_goautos',
    description: 'Crea una RESERVA de un auto para un cliente en MallorcAutos y marca el vehículo como Reservado. Agente "Meme". ESCRITURA: simula primero (simular=true) y confirma. Campos: vehicle_id, customer_id, precio (acordado), validez (días, default 3), notas.',
    input_schema: { type: 'object', properties: {
      vehicle_id: { type: 'integer' }, customer_id: { type: 'integer' }, precio: { type: 'integer' },
      validez: { type: 'integer' }, notas: { type: 'string' }, simular: { type: 'boolean' },
    }, required: ['vehicle_id', 'customer_id', 'precio'] },
  },
  {
    name: 'correo',
    description: 'Lee los correos de Nico (agente "Néstor"). SOLO LECTURA. Acciones: resumen (correos recientes), buscar (por texto/remitente/cuenta), leer (uno completo por id), reuniones (eventos de calendario próximos), estado (cuentas conectadas). Cuentas de Nico: Aliace, Dropout, Gmail (=nicojuri@gmail.com), Gmail2, HN, MallorcAutos. Para acotar a un buzón usa "empresa" (ej. "Gmail" = nicojuri).',
    input_schema: {
      type: 'object',
      properties: {
        accion: { type: 'string', enum: ['resumen', 'buscar', 'leer', 'reuniones', 'estado'] },
        texto: { type: 'string', description: 'buscar: palabra en asunto o cuerpo' },
        remitente: { type: 'string', description: 'buscar: filtra por remitente' },
        empresa: { type: 'string', description: 'cuenta/buzón: Aliace, Dropout, Gmail (=nicojuri@gmail.com), Gmail2, HN, MallorcAutos' },
        id: { type: 'string', description: 'leer: id del correo (8 caracteres o uuid; sale en resumen/buscar)' },
        dias: { type: 'integer', description: 'ventana de días (resumen ~7, buscar ~30)' },
        limite: { type: 'integer' },
      },
      required: ['accion'],
    },
  },
  {
    name: 'sii',
    description: 'Sistema SII ("Martes"): descarga documentos del SII (RCV compras/ventas, F29, F22, carpeta tributaria, ficha, boletas, libros) y EMITE facturas. Empresa configurada: ANA CLARA SPA. Acciones: estado (empresas + qué se puede bajar), descargar (dispara la descarga), job (avance de una descarga), documentos (lista lo ya bajado, con su "ruta"), enviar (MANDA el archivo PDF/Excel al WhatsApp del usuario), emitir (EMITE una factura/boleta electrónica — SIMULA PRIMERO: sin confirmado=true solo arma y devuelve el BORRADOR con neto/IVA/total para pedir OK; NUNCA emite sin una confirmación explícita del usuario). Los precios de los ítems son NETOS (sin IVA); el IVA 19% se agrega solo en facturas afectas (33).',
    input_schema: {
      type: 'object',
      properties: {
        accion: { type: 'string', enum: ['estado', 'descargar', 'job', 'documentos', 'enviar', 'emitir'] },
        empresa_id: { type: 'integer', description: 'id de la empresa (lo da accion:estado). ANA CLARA SPA = 3.' },
        desde: { type: 'string', description: 'periodo inicio AAAAMM, ej "202605"' },
        hasta: { type: 'string', description: 'periodo fin AAAAMM (si es uno solo, igual a desde)' },
        docs: { type: 'array', items: { type: 'string' }, description: 'tipos a bajar, ej ["rcv_compra"] o ["f29","rcv_venta"]' },
        job_id: { type: 'string', description: 'id del job (lo da accion:descargar)' },
        ruta: { type: 'string', description: 'para "enviar": la ruta del archivo tal cual sale en accion:documentos' },
        titulo: { type: 'string', description: 'para "enviar": texto/caption opcional junto al archivo' },
        tipo_dte: { type: 'integer', description: 'emitir: 33=factura electrónica (afecta IVA), 34=factura exenta, 39=boleta. Default 33.' },
        receptor: { type: 'object', description: 'emitir: a quién se factura. Para factura (33/34) lo OBLIGATORIO es {rut, nombre (razón social), direccion} — con el carnet sacas rut+nombre y solo pides la DIRECCIÓN. giro es OPCIONAL (por defecto "PARTICULAR"); comuna OPCIONAL (extráela de la dirección si viene). El SII autocompleta razón social/dirección/giro desde el RUT. Para boleta (39) todo opcional.' },
        items: { type: 'array', items: { type: 'object' }, description: 'emitir: detalle [{nombre, cantidad, precio, detalle?, vehiculo?}] con precio NETO (sin IVA). Marca exento:true si un ítem no lleva IVA. Para un AUTO: nombre = "Marca Modelo Año" y pasa "vehiculo" con los datos del CAV {tipo, marca, modelo, motor, chasis, color, combustible, pbv, patente, anio} — se arma solo la descripción que va en el campo "Descrip." del SII. (O pasa "detalle" con la descripción ya escrita.)' },
        forma_pago: { type: 'string', description: 'emitir: contado | credito (default contado)' },
        fecha: { type: 'string', description: 'emitir: fecha de emisión YYYY-MM-DD (default hoy)' },
        observaciones: { type: 'string', description: 'emitir: glosa/observaciones opcionales' },
        confirmado: { type: 'boolean', description: 'emitir: déjalo FALSO/omitido para SOLO simular (borrador de texto). Ponlo true cuando el usuario pida ver/generar el borrador en el SII → genera el borrador OFICIAL en imagen (NO emite).' },
        emitir_real: { type: 'boolean', description: 'emitir: FIRMA Y EMITE la factura DE VERDAD (irreversible). Ponlo true SOLO tras haber generado el borrador (confirmado=true) Y una 2ª confirmación explícita del usuario para emitir. Nunca junto con confirmado en la misma llamada.' },
      },
      required: ['accion'],
    },
  },
  {
    name: 'banco',
    description: 'BANCOS (agente "Leo"): consulta las cuentas bancarias REALES de las empresas (vía Rail). SOLO LECTURA: no transfiere, no mueve un peso, no toca conexiones. Úsala para "cuánta plata hay en el banco", "saldo", "movimientos", "qué entró/salió", "ingresos y egresos del mes", "transferencias", "está conectado el banco". Acciones: empresas (RUTs con banco conectado — empieza por aquí si no sabes cuál), saldos (cuentas con disponible/actual y cupos), movimientos (detalle filtrable, más recientes primero), resumen (ingresos/egresos/neto por mes), conexiones (SALUD de los links: cuáles están sanos y cuáles caídos por clave inválida o expirada). Identifica la empresa con "rut" (o "banco" para filtrar por banco). Los montos NEGATIVOS son EGRESOS; reporta los campos *_fmt tal cual. En tarjetas, "disponible" = cupo libre y "actual" = deuda; el total en caja NO cuenta cupos. NOTA: esto es el BANCO; el cruce banco↔SII lo hace SAI (sai_conciliacion) y las finanzas de Aliace son aliace_resumen.',
    input_schema: {
      type: 'object',
      properties: {
        accion: { type: 'string', enum: ['empresas', 'saldos', 'movimientos', 'resumen', 'conexiones'] },
        rut: { type: 'string', description: 'RUT del titular (ej "77271121-2"). Sale en accion:empresas.' },
        banco: { type: 'string', description: 'Filtra por banco (ej "santander", "bancoestado").' },
        anio: { type: 'string', description: 'resumen: acota a un año (ej "2026").' },
        buscar: { type: 'string', description: 'movimientos: filtra por texto en la descripción o el tipo (ej "copec", "transf").' },
        desde: { type: 'string', description: 'movimientos: fecha desde YYYY-MM-DD.' },
        hasta: { type: 'string', description: 'movimientos: fecha hasta YYYY-MM-DD.' },
        limite: { type: 'integer', description: 'movimientos: cuántos mostrar (default 30, más recientes primero).' },
      },
      required: ['accion'],
    },
  },
  {
    name: 'aliace_rpc',
    description: 'Consulta la base de datos REAL de Aliace (admin.aliace.cl) llamando una FUNCIÓN oficial del portal (RPC). Devuelve EXACTAMENTE los mismos valores que muestra la web. Úsalo para cifras del negocio Aliace: facturación, ventas, pagos, deudas, metas, clientes. CATÁLOGO (funcion → params):\n• get_payments_this_month() / get_payments_this_week() / get_payments_total() → pagos recaudados (CLP, número).\n• get_monthly_invoice_totals(target_month,target_year) → FACTURACIÓN del mes EXACTA como la web. Devuelve un ARRAY: usa la PRIMERA fila → net_amount (= details.total_neto_corregido) es el NETO que muestra el portal; facturas_amount = bruto; credit_notes_amount = notas de crédito. (NO uses get_monthly_invoice_totals_excel_match para "facturado del mes": da otro número que NO es el de la web.)\n• get_actual_sales_by_month(p_year,p_month_start,p_month_end) → venta real por mes.\n• get_sales_goals_vs_actual(p_year) / get_sales_without_goals(p_year) → metas vs venta real.\n• get_debt_summary_at_cutoff_fixed(cutoff_date) → deuda total/vencida/pronto_vencer/sana a una fecha; devuelve 2 filas (debt_type sales_requests y manual_facturas), SÚMALAS para el total. NOTA: aquí "vencida" INCLUYE judiciales y siniestros (no los separa). get_client_debt_details_at_cutoff_v2(cutoff_date) → por cliente. get_sales_requests_debt_at_cutoff_fixed(cutoff_date) / get_manual_facturas_debt_at_cutoff(cutoff_date) → detalle por factura (exponen banderas siniestro y cobranza_judicial del cliente).\n• get_reporte_deuda(fecha_corte) → reporte CXC legible (es): una fila por factura adeudada con estado ∈ {Vencido, Por Vencer, Siniestro, Cobranza Judicial} y monto_pendiente. Es la fuente para "vencida descontando judiciales/siniestros" = SOLO estado=\'Vencido\' (los buckets Siniestro/Cobranza Judicial van aparte, no dentro de Vencido).\n• get_client_sales_summary(p_start_date,p_end_date) → ventas por cliente en un rango.\n• get_clients_count() → total de clientes.\nFechas YYYY-MM-DD. Mes/año enteros. Si no estás seguro del nombre o la forma, usa aliace_sql.',
    input_schema: {
      type: 'object',
      properties: {
        funcion: { type: 'string', description: 'Nombre exacto del RPC (ver catálogo en la descripción)' },
        params: { type: 'object', description: 'Parámetros como objeto JSON, ej {"target_month":6,"target_year":2025} o {"cutoff_date":"2026-06-25"}. Usa {} si no lleva.' },
      },
      required: ['funcion'],
    },
  },
  {
    name: 'aliace_sql',
    description: 'Ejecuta una consulta SQL de SOLO LECTURA (SELECT) sobre la base de datos de Aliace y devuelve las filas. Úsalo para preguntas de Aliace que no calzan con un RPC del catálogo: conteos, detalles, filtros ad-hoc, ordenamientos. Solo SELECT (rechaza INSERT/UPDATE/DELETE). Tablas útiles: sales_request (notas de venta: status, total_amount, price_with_iva, paid, paid_amount, payment_due_date, client, created_by, created_at, deleted_at), payments (amount, payment_method, payment_date, verified_at, is_verified, check_status, client, sales_request), clients (id, name, tax_id, is_test, siniestro, cobranza_judicial, deleted_at), manual_facturas (balance, payment_due_date), sales_request_documents (document_type, bsale_number, emission_date, sales_request_id), purchase_orders, suppliers. ⛔ EXCLUYE SIEMPRE lo de prueba: sales_request.status <> \'test\' y clients.is_test = false. Filtra deleted_at IS NULL en sales_request/clients. Estados de sales_request: PENDIENTES DE APROBACIÓN = (pending_pricing, pending, pending_credit, payment_to_check, prepaid); APROBADAS/EN CURSO = (accepted, por_facturar, in_transit, delivered); rejected, cancelled, test = fuera. Facturada = tiene sales_request_documents con document_type=\'factura\' y bsale_number NOT NULL. Judiciales/siniestros = banderas clients.cobranza_judicial / clients.siniestro (no se restan del total de deuda; solo re-etiquetan vencidas). SIEMPRE acota con WHERE/LIMIT; nunca traigas tablas enteras.',
    input_schema: {
      type: 'object',
      properties: { consulta: { type: 'string', description: 'Consulta SELECT, ej: "select count(*) n from clients where deleted_at is null"' } },
      required: ['consulta'],
    },
  },
  {
    name: 'aliace_resumen',
    description: 'RESUMEN CANÓNICO del mes de Aliace en UNA sola llamada. La facturación y el margen son RÉPLICA EXACTA de la pantalla "Facturas" de la app de Aliace (mismos NOMBRES y VALORES, verificado al peso); el resto (meta, NV, CxC) sale de los RPC oficiales. COHERENTE: la misma pregunta da SIEMPRE el mismo número. ÚSALO SIEMPRE para preguntas de cabecera del mes —"facturación / monto total facturado", "margen / rentabilidad", "NV pendientes de aprobación", "CxC vencidas descontando judiciales y siniestros", "meta vs avance", "potencial de cierre", "consolidado/resumen del mes"— en vez de armar SQL a mano. TRAE un campo `reporte_texto` (informe ejecutivo ya formateado): MÁNDALO TAL CUAL. Devuelve: facturacion {total_documentos,facturas,notas_credito,monto_total_facturado_sin_iva,facturas_monto,notas_credito_monto,promedio_por_factura_sin_iva} · margen {costo_ventas_wac,ventas_con_costo,margen_bruto,margen_pct} · meta {meta_mes,venta_real,facturado_neto,avance_pct,gap} · nv_pendientes_aprobacion {total_nv,total_monto,por_status[]} · nv_aprobadas_sin_facturar {total_nv,total_monto,por_status[]} · cxc {vencida_limpia,por_vencer,siniestro,judicial,total}. ⚠️ REPORTA SUS NÚMEROS Y NOMBRES TAL CUAL; NO los recalcules con aliace_sql ni inventes categorías. Para un dato puntual fuera de este resumen (un cliente, un detalle, otro mes) sí usa aliace_rpc/aliace_sql. Para TODO EL AÑO (acumulado anual, ventas por mes, "cuánto llevamos en el año") usa aliace_anual, NO este (que es de UN mes).',
    input_schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Fecha de corte YYYY-MM-DD (define el mes). Omítela para HOY (lo normal).' },
      },
    },
  },
  {
    name: 'aliace_margen',
    description: 'MARGEN / rentabilidad / utilidad de Aliace. Sin args o con fecha = margen del MES, RÉPLICA EXACTA de la pantalla "Facturas" de la app (mismos nombres y valores, verificado al peso): devuelve costo_ventas_wac, ventas_con_costo, margen_bruto, margen_pct. Con id (uuid de una NV) = margen de esa nota de venta (ingreso_neto, costo, margen, margen_pct). ⚠️ ÚSALO SIEMPRE para márgenes/rentabilidad/utilidad; NO los calcules a mano con aliace_sql. Es margen BRUTO sobre ventas con costo; la app advierte que costos/márgenes están "en revisión, no oficial". Repórtalo TAL CUAL y acompáñalo con un gráfico.',
    input_schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'YYYY-MM-DD para elegir el mes. Omítela para el mes actual.' },
        id: { type: 'string', description: 'uuid de una NV para su margen puntual (en vez del mes).' },
      },
    },
  },
  {
    name: 'aliace_anual',
    description: 'RESUMEN ANUAL de Aliace: facturación, margen y meta ACUMULADOS de TODO el año + tabla mes a mes. ÚSALO SIEMPRE que pidan datos del AÑO (no de un mes): "facturación del año", "cuánto llevamos en el año", "margen del año", "ventas por mes", "comparar los meses", "todo el año", "acumulado anual", "year to date". Las cifras son la SUMA EXACTA de los meses con la MISMA réplica verificada de la pantalla "Facturas" (cuadran al peso con aliace_resumen mes a mes). Trae `reporte_texto` (informe anual ya formateado): MÁNDALO TAL CUAL. Devuelve: facturacion {facturado_neto,facturas} · margen {costo_ventas_wac,ventas_con_costo,margen_bruto,margen_pct} · meta {meta_anual,venta_real,facturado_neto,avance_pct,gap} · por_mes[] {mes,etiqueta,facturado_neto,facturas,margen_bruto,margen_pct,meta}. ⚠️ La CxC/deuda NO va aquí (es snapshot a fecha de corte, no anual): para vencidas/por vencer usa aliace_resumen. Para UN mes puntual usa aliace_resumen.',
    input_schema: {
      type: 'object',
      properties: {
        anio: { type: 'integer', description: 'Año a resumir, ej 2025. Omítelo para el año en curso (en ese caso va hasta el mes actual).' },
      },
    },
  },
  {
    name: 'aliace_mover_nv',
    description: 'MUEVE una nota de venta (NV) de Aliace a otro estado en el ERP REAL: aprobar (accepted), rechazar (rejected), por_facturar, in_transit, etc. Necesita el id = uuid de la NV (sácalo con aliace_sql sobre sales_request, o de un detalle que ya tengas; NO inventes el uuid). ⚠️ Por defecto SIMULA y NO escribe: primero llámala SIN confirmado para ver el plan (de qué estado a cuál, monto), MUÉSTRASELO al usuario y pídele una confirmación clara; SOLO cuando diga que sí, vuelve a llamarla con confirmado=true para ejecutar. Para rechazar, pasa motivo. No se deshace solo.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'uuid de la NV (sales_request.id). Obligatorio.' },
        nuevo_estado: { type: 'string', enum: ['accepted', 'rejected', 'por_facturar', 'pending', 'pending_pricing', 'pending_credit', 'prepaid', 'in_transit', 'dispatch_ready', 'delivered'], description: 'Estado destino. accepted=aprobar, rejected=rechazar.' },
        motivo: { type: 'string', description: 'Obligatorio si nuevo_estado=rejected (queda en rejected_reason).' },
        confirmado: { type: 'boolean', description: 'false/ausente = SIMULA (muestra el plan, no escribe). true = EJECUTA de verdad (solo tras confirmación explícita del usuario).' },
      },
      required: ['id', 'nuevo_estado'],
    },
  },
  {
    name: 'aliace_pago',
    description: 'REGISTRA un PAGO a una nota de venta (NV) en el ERP REAL de Aliace (igual que la pantalla "Pago a Nota de Venta": inserta el pago y recalcula cuánto lleva pagado/pagada la NV). Necesita id = uuid de la NV (sácalo con aliace_sql; NO lo inventes) y monto en CLP. ⚠️ Por defecto SIMULA y NO escribe: primero llámala SIN confirmado para ver el plan (saldo antes, pago, saldo después, si queda pagada, y aviso si el pago supera el saldo); MUÉSTRASELO al usuario y pídele confirmación clara; SOLO cuando diga que sí, vuelve a llamarla con confirmado=true. La BD no impide sobrepagar: si el monto supera el saldo, advierte y confirma. No se deshace solo.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'uuid de la NV (sales_request.id) a la que se abona. Obligatorio.' },
        monto: { type: 'number', description: 'Monto del pago en CLP (entero, > 0).' },
        metodo: { type: 'string', enum: ['manual', 'bank_transfer', 'transfer', 'check', 'cash', 'webpay', 'khipu', 'other', 'factoring', 'descuento_nomina'], description: 'Método de pago. Por defecto "manual" (registro a mano, como la app).' },
        referencia: { type: 'string', description: 'Texto opcional de referencia (ej. nº de operación/transferencia).' },
        verificar: { type: 'boolean', description: 'true = registrar el pago YA verificado (is_verified). Por defecto false (queda pendiente de verificación, igual que un pago manual de la app).' },
        confirmado: { type: 'boolean', description: 'false/ausente = SIMULA (muestra el plan, no escribe). true = EJECUTA de verdad (solo tras confirmación explícita del usuario).' },
      },
      required: ['id', 'monto'],
    },
  },
  {
    name: 'aliace_editar_nv',
    description: 'EDITA campos seguros de la cabecera de una nota de venta (NV) en el ERP REAL: comentarios, notas internas, observaciones de factura, fecha de vencimiento de pago, fecha y dirección de entrega. NO cambia el estado (eso es aliace_mover_nv) ni montos/productos. Necesita id = uuid de la NV y "campos" (objeto con lo que cambiar). ⚠️ Por defecto SIMULA y NO escribe: primero SIN confirmado para ver "antes" vs "despues", muéstraselo al usuario, pide OK, y SOLO entonces vuelve a llamarla con confirmado=true.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'uuid de la NV (sales_request.id). Obligatorio.' },
        campos: { type: 'object', description: 'Objeto con los campos a cambiar. Editables: comments, internal_notes, factura_observations, payment_due_date (YYYY-MM-DD o ISO), delivery_date, delivery_street, delivery_number, delivery_complement, delivery_city, delivery_state, delivery_comuna.' },
        confirmado: { type: 'boolean', description: 'false/ausente = SIMULA. true = EJECUTA (solo tras confirmación explícita del usuario).' },
      },
      required: ['id', 'campos'],
    },
  },
  {
    name: 'aliace_crear_nv',
    description: 'CREA una nueva nota de venta (NV) en el ERP REAL de Aliace (inserta la cabecera + sus líneas). ⚠️⚠️ IMPORTANTE: crear por aquí SE SALTA las validaciones que hace la app (cheques protestados, facturas vencidas, cliente activo, flete, línea de crédito, rango de precios) y el cálculo automático del status. Úsala solo cuando el usuario lo pida explícitamente y entienda eso. Necesita client_id (uuid de clients) e items [{product_id (uuid de products), quantity, unit_price, discount_percent?}]. El total lo calcula la herramienta; el IVA lo pone la BD. ⚠️ Por defecto SIMULA y NO escribe: primero SIN confirmado para ver el plan (incluye la lista "validaciones_OMITIDAS"); muéstraselo al usuario, que revise cliente/productos/precios/status, pide OK explícito, y SOLO entonces vuelve a llamarla con confirmado=true.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'uuid del cliente (clients.id). Búscalo con aliace_sql. Obligatorio.' },
        items: { type: 'array', description: 'Líneas de la NV.', items: { type: 'object', properties: { product_id: { type: 'string', description: 'uuid del producto (products.id)' }, quantity: { type: 'number', description: 'cantidad (> 0)' }, unit_price: { type: 'number', description: 'precio unitario NETO en CLP' }, discount_percent: { type: 'number', description: 'descuento % de la línea (0-100), opcional' } }, required: ['product_id', 'quantity', 'unit_price'] } },
        status: { type: 'string', enum: ['pending', 'pending_pricing', 'pending_credit', 'prepaid', 'payment_to_check', 'accepted', 'por_facturar'], description: 'Estado inicial. Por defecto "pending". OJO: aquí NO se calcula solo, lo fijas tú.' },
        comentarios: { type: 'string', description: 'Comentarios opcionales de la NV.' },
        payment_terms: { type: 'number', description: 'Días de plazo de pago. Por defecto los del cliente (o 30).' },
        confirmado: { type: 'boolean', description: 'false/ausente = SIMULA. true = EJECUTA (solo tras confirmación explícita del usuario).' },
      },
      required: ['client_id', 'items'],
    },
  },
  {
    name: 'graficar',
    description: 'Genera un GRÁFICO (imagen) con datos FINANCIEROS —de Aliace O de Mallorca (Excel/GoAutos)— y lo envía por WhatsApp al usuario. Úsalo para que las respuestas con varios componentes se vean visuales: desglose (ej. deuda vencida/por vencer/sana; stock valorizado por marca), ranking (top clientes/deudas/ventas; autos por margen) o tendencia mensual (facturación/pagos/ventas/márgenes por mes). NO lo uses para un solo número suelto. tipo: "barra" (comparar categorías/ranking), "torta" (distribución/participación %), "linea" (tendencia en el tiempo). Pasa etiquetas y valores (números crudos en CLP, mismo largo). Tras enviarlo, en el texto deja SOLO el titular; los números van en el gráfico.',
    input_schema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: ['barra', 'linea', 'torta'], description: 'barra | linea | torta' },
        titulo: { type: 'string', description: 'Título del gráfico, ej "Deuda por estado — hoy"' },
        subtitulo: { type: 'string', description: 'Subtítulo opcional (ej. fecha o periodo)' },
        etiquetas: { type: 'array', items: { type: 'string' }, description: 'Etiquetas de cada dato, ej ["Vencida","Pronto a vencer","Sana"]' },
        valores: { type: 'array', items: { type: 'number' }, description: 'Valores numéricos (CLP crudos), mismo largo que etiquetas' },
      },
      required: ['tipo', 'titulo', 'etiquetas', 'valores'],
    },
  },
  {
    name: 'enviar_audio',
    description: 'Manda un mensaje de VOZ (nota de audio) por WhatsApp al usuario, con la voz de Nexus. Úsalo SOLO cuando el usuario lo pida explícitamente ("mándamelo en audio", "respóndeme por voz", "léemelo", "mándame un audio") o cuando pida que de ahora en adelante le hables por voz. Pasa en "texto" lo que quieres que diga, en lenguaje natural y hablado (sin emojis, sin markdown, sin viñetas, cifras en palabras si conviene). NO lo uses para reportes largos ni tablas — el audio es para respuestas cortas o mensajes conversacionales. Tras enviarlo, en tu respuesta de texto deja solo una línea corta (o nada), no repitas todo el contenido del audio.',
    input_schema: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'Lo que debe decir el audio, redactado para ser HABLADO (natural, sin emojis ni símbolos ni markdown).' },
      },
      required: ['texto'],
    },
  },
  {
    name: 'agregar_usuario',
    description: 'DA DE ALTA un usuario nuevo de Nexus. SOLO Ramón o Nico (fundadores/admin) pueden usarla; si la pide otro, el sistema la rechaza. Registra al usuario (nombre + número de WhatsApp) con los ACCESOS que le correspondan, lo habilita para escribirle a Nexus y le manda un WhatsApp de bienvenida con la lista de lo que puede hacer. FLUJO: pregunta y CONFIRMA el nombre, el número (con +56) y qué accesos antes de llamarla. Accesos válidos: aliace, sii, mallorca, correo, bd, cerebro.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string', description: 'Nombre del usuario, ej "Juan Pérez"' },
        numero: { type: 'string', description: 'Número de WhatsApp en formato +56 9 XXXX XXXX (ej "+56912345678")' },
        accesos: { type: 'array', items: { type: 'string', enum: ['aliace', 'sii', 'mallorca', 'correo', 'bd', 'cerebro', 'banco'] }, description: 'Áreas a las que tendrá acceso. aliace=facturación/ventas/cobranza; sii=tributario; mallorca=autos GoAutos+Excel; correo=correos; bd=base del negocio; cerebro=notas; banco=cuentas y movimientos bancarios.' },
      },
      required: ['nombre', 'numero', 'accesos'],
    },
  },
  {
    name: 'listar_usuarios',
    description: 'Lista los usuarios de Nexus dados de alta y sus accesos. SOLO Ramón o Nico.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'quitar_usuario',
    description: 'Da de BAJA a un usuario de Nexus (lo deja sin acceso). SOLO Ramón o Nico. No se puede quitar a los fundadores. Confirma con el usuario antes de llamarla.',
    input_schema: {
      type: 'object',
      properties: { numero: { type: 'string', description: 'Número del usuario a dar de baja (+56…)' } },
      required: ['numero'],
    },
  },
  {
    name: 'programar_mensaje',
    description: 'PROGRAMA un mensaje para que Nexus lo envíe DESPUÉS de cierto tiempo (recordatorio / aviso futuro). Úsalo cuando Ramón diga cosas como "en 10 minutos mándame un ws que diga X", "recuérdame mañana a las 9 por correo que…", "llámame en media hora". CANALES: whatsapp (por defecto), correo, llamada (llamada de VOZ que suena dentro de la app Telegram y LEE el mensaje con voz, vía CallMeBot — gratis; el destino de una llamada es el usuario/teléfono de Telegram, no un número común); telefono = llamada TELEFÓNICA REAL a cualquier número vía Twilio (de pago). DESTINO: si Ramón no dice a quién, usa el destinatario por defecto (no pongas "destino"); si dice un número o correo concreto, pásalo en "destino". CUÁNDO (obligatorio): para tiempos relativos usa "en_minutos" (ej "en 10 min" → en_minutos:10); para una hora/fecha concreta calcula tú el instante en formato ISO con la zona de Chile (-04:00) usando la FECHA DE HOY que tienes, y pásalo en "cuando" (ej mañana 9:00 → "2026-06-29T09:00:00-04:00"). Confirma corto antes de programar si hay ambigüedad de hora.',
    input_schema: {
      type: 'object',
      properties: {
        canal: { type: 'string', enum: ['whatsapp', 'correo', 'llamada', 'telefono', 'sms'], description: 'Cómo enviarlo. Por defecto whatsapp.' },
        mensaje: { type: 'string', description: 'El texto a enviar (para correo es el cuerpo).' },
        asunto: { type: 'string', description: 'Solo correo: asunto del email (opcional).' },
        destino: { type: 'string', description: 'A quién: número +56… (whatsapp/llamada) o correo (correo). Omítelo para usar el destinatario por defecto.' },
        en_minutos: { type: 'number', description: 'Enviar dentro de N minutos (tiempo relativo). Ej "en 10 min" → 10.' },
        cuando: { type: 'string', description: 'Instante exacto en ISO 8601 con zona Chile, ej "2026-06-29T09:00:00-04:00". Úsalo para horas/fechas concretas.' },
        repeticiones: { type: 'integer', description: 'Cuántas VECES enviar el mismo mensaje (por defecto 1, máximo 50). Ej "mándalo 5 veces" → 5.' },
        intervalo_min: { type: 'number', description: 'Minutos entre cada repetición (por defecto 1). Ej "cada 2 minutos" → 2.' },
      },
      required: ['mensaje'],
    },
  },
  {
    name: 'enviar_mensaje',
    description: 'Envía un mensaje AHORA (inmediato, no programado) al destinatario y canal que indiques. Úsalo cuando pidan "mándale YA un ws a <número> que diga X", "envía ahora un correo a <email>", "llama ahora y di X". CANALES: whatsapp (a CUALQUIER número +56…), correo (a un email), llamada (voz GRATIS que suena en Telegram y LEE el mensaje, vía CallMeBot; el destino es el usuario/teléfono de Telegram registrado en @CallMeBot_txtbot, no un número común); telefono = llamada TELEFÓNICA REAL a CUALQUIER número (vía Twilio, de pago: marca y lee el mensaje con voz). "llámame al teléfono / llamada real" → telefono; "llámame por Telegram / llamada gratis" → llamada. Para enviar A FUTURO usa programar_mensaje. CONFIRMA destino y texto antes si hay ambigüedad (es un envío real e inmediato).',
    input_schema: {
      type: 'object',
      properties: {
        canal: { type: 'string', enum: ['whatsapp', 'correo', 'llamada', 'telefono', 'sms'], description: 'whatsapp | correo | llamada. Por defecto whatsapp.' },
        mensaje: { type: 'string', description: 'El texto a enviar (para correo es el cuerpo).' },
        destino: { type: 'string', description: 'A quién: número +56… (whatsapp), email (correo) o usuario/teléfono de Telegram (llamada). Omítelo para usar el destino por defecto del canal.' },
        asunto: { type: 'string', description: 'Solo correo: asunto.' },
      },
      required: ['mensaje'],
    },
  },
  {
    name: 'listar_recordatorios',
    description: 'Lista los mensajes programados (recordatorios) — pendientes y su historial reciente, con id, canal, destino, cuándo y estado.',
    input_schema: { type: 'object', properties: { solo_pendientes: { type: 'boolean', description: 'true = solo los que aún no se envían.' } } },
  },
  {
    name: 'cancelar_recordatorio',
    description: 'Cancela un mensaje programado que todavía no se ha enviado, por su id (lo da listar_recordatorios).',
    input_schema: { type: 'object', properties: { id: { type: 'string', description: 'id del recordatorio a cancelar' } }, required: ['id'] },
  },
  // ── GMAIL · DESCARGAR DOCUMENTOS (ADJUNTOS) DEL CORREO CONECTADO ─────────────
  {
    name: 'gmail_documentos',
    description: 'Descarga DOCUMENTOS (adjuntos) del Gmail conectado de Nexus y los ENVÍA por WhatsApp al usuario. Úsala cuando pidan "bájame/tráeme los documentos/adjuntos que llegaron al correo", "descarga los PDF del mail de [remitente]", etc. Filtros OPCIONALES (todos combinables): remitente (from, ej "plaud.ai" o un email), asunto (palabras del asunto), dias (últimos N días, default 30), tipos (extensiones, ej ["pdf","jpg","xlsx"]), limite (cuántos correos revisar, default 5, máx 20). Es SOLO LECTURA del Gmail: baja los adjuntos y te los manda como documentos.',
    input_schema: { type: 'object', properties: {
      remitente: { type: 'string', description: 'Filtra por remitente (texto del "from", ej "plaud.ai" o "juan@x.cl").' },
      asunto: { type: 'string', description: 'Palabras que contenga el asunto.' },
      dias: { type: 'number', description: 'Buscar en los últimos N días (default 30).' },
      tipos: { type: 'array', items: { type: 'string' }, description: 'Solo estas extensiones, ej ["pdf","jpg"]. Omite para todos.' },
      limite: { type: 'number', description: 'Cuántos correos revisar (default 5, máx 20).' },
    }, required: [] },
  },
  // ── PLAUD · ESTADO DEL PIPELINE AUTOMÁTICO (memoria propia de Nexus) ─────────
  {
    name: 'mi_dia',
    description: 'QUÉ PASÓ UN DÍA (agente "Cerebro"). Responde "¿qué hice hoy?", "¿qué hiciste ayer?", "¿cómo estuvo mi semana?", "¿qué reuniones tuve el lunes?", "¿de qué hablamos con X?". Lee el pipeline de Plaud y devuelve las reuniones REALES de esa(s) fecha(s) ya destiladas (título + decisiones + acciones) y las grabaciones crudas. SIN args = HOY. Usa "fecha" (YYYY-MM-DD) para un día puntual y "hasta" para un rango (ej. la semana). ⚠️ ÚSALA SIEMPRE que te pregunten qué pasó/hiciste en una fecha: es la ÚNICA forma de saberlo de verdad; NO lo inventes ni lo saques del perfil general. Después responde EN PRIMERA PERSONA como Nico, natural y CORTO (1-3 frases, "hoy tuve una reunión con…"), NUNCA pegando el reporte ni diciendo "según mis grabaciones".',
    input_schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Día a consultar YYYY-MM-DD. Omítela para HOY.' },
        hasta: { type: 'string', description: 'Para un rango (ej. la semana): fecha final YYYY-MM-DD.' },
      },
    },
  },
  {
    name: 'plaud_estado',
    description: 'Reporta el ESTADO del pipeline AUTOMÁTICO de Plaud (un sistema PROPIO de Nexus). Úsala cuando pregunten "¿tú bajas/analizas mis reuniones de Plaud?", "¿qué reuniones procesaste?", "¿cuándo corriste el análisis?", "¿qué sabes de mis grabaciones?". Devuelve: cuántas reuniones lleva procesadas, cuándo corrió por última vez y los títulos de las últimas destiladas al segundo cerebro. Es SOLO LECTURA: NO baja nada nuevo (eso pasa solo, 5 veces al día: 10:00, 13:00, 16:00, 18:00 y 22:00). Si en cambio piden bajarse los ARCHIVOS crudos al teléfono, eso es gmail_documentos.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  // ── SII · DESCARGAR EL PDF DE UNA BOLETA DE HONORARIOS RECIBIDA ──────────────
  {
    name: 'sii_boleta_honorarios',
    description: 'Descarga el PDF REAL de una Boleta de Honorarios electrónica RECIBIDA por una empresa (la que un tercero le emitió) y la ENVÍA por WhatsApp al usuario. Úsala cuando pidan "bájame/mándame la boleta de honorarios de [persona] de [mes] [año]". NECESITA 4 datos — si falta alguno, PÍDESELO al usuario antes de llamarla: (1) empresa (razón social o RUT de la que RECIBE la boleta), (2) año, (3) mes, (4) usuario = el EMISOR de la boleta (nombre o RUT de la persona que la emitió). Si el emisor no calza o hay varios, la herramienta devuelve la lista de boletas de ese mes para que el usuario elija (o dé el RUT). Baja del SII con la sesión guardada (con cuidado anti-bloqueo).',
    input_schema: { type: 'object', properties: {
      empresa: { type: 'string', description: 'Empresa que RECIBIÓ la boleta: razón social o RUT (ej. "ANA CLARA" o "77271121-2").' },
      anio: { type: 'number', description: 'Año, ej. 2026.' },
      mes: { type: 'number', description: 'Mes 1-12.' },
      emisor: { type: 'string', description: 'El USUARIO/emisor de la boleta: nombre o RUT de quien la emitió (ej. "Ramón" o "21894578-3").' },
    }, required: ['empresa', 'anio', 'mes', 'emisor'] },
  },
  // ── SAI · CONCILIACIÓN SII ↔ BANCO ↔ MALLORCA (agente "SAI") ─────────────────
  {
    name: 'sai_conciliacion',
    description: 'RESUMEN de la CONCILIACIÓN de ANA CLARA SpA: cruza las FACTURAS del SII con los MOVIMIENTOS del banco (por RUT, monto y fecha). Devuelve empresa, cobertura (% facturado cuadrado con el banco), contadores de confianza (alta/media/baja), montos (facturado/por revisar), facturas sin pago (top), movimientos sin factura, y los mejores matches. Úsalo para "cómo va la conciliación", "cuánto cuadré", "qué facturas están sin pago", "cobertura". OJO: el banco solo trae junio-julio.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'sai_buscar_factura',
    description: 'Busca FACTURAS del SII (conciliación SAI) por folio, rut o proveedor. Devuelve estado Pagada/Sin pago y, si está pagada, el movimiento bancario que la cuadró (monto, fecha, descripción, score). Filtros opcionales (AND).',
    input_schema: { type: 'object', properties: { folio: { type: 'string' }, rut: { type: 'string' }, proveedor: { type: 'string' } }, required: [] },
  },
  {
    name: 'sai_movimientos_banco',
    description: 'Lista MOVIMIENTOS del banco de ANA CLARA (SAI). Solo junio-julio. Filtros: desde/hasta (YYYY-MM-DD), min_monto, tipo (ingreso|egreso). Máx 30, orden fecha desc.',
    input_schema: { type: 'object', properties: { desde: { type: 'string' }, hasta: { type: 'string' }, min_monto: { type: 'number' }, tipo: { type: 'string' } }, required: [] },
  },
  {
    name: 'sai_mallorca_compras',
    description: 'Compras de autos del Excel de Mallorca (para enriquecer la conciliación SAI). Sin args = stock agregado (autos, total, costo). Con patente o folio = filas específicas.',
    input_schema: { type: 'object', properties: { patente: { type: 'string' }, folio: { type: 'string' } }, required: [] },
  },
  {
    name: 'recordar',
    description: 'GUARDA en tu MEMORIA PERSONAL de ESTE usuario un dato DURADERO para las próximas conversaciones (así te personalizas por persona). Úsalo cuando aprendas algo que valga la pena recordar de quien te habla: una preferencia ("prefiere respuestas cortas", "le gusta que le hable con humor"), un dato suyo (rol, cómo trabaja, un proyecto que lleva), un tema recurrente, o cuando te pidan explícitamente "acuérdate de…". NO guardes trivialidades ni datos de una sola vez ni cifras del negocio (esas van en sus tools). Un hecho por llamada, en 1 frase clara y en primera persona del usuario o descriptiva (ej. "A Ramón le molesta el voseo; quiere trato de tú y chileno").',
    input_schema: { type: 'object', properties: { hecho: { type: 'string', description: 'El dato a recordar, en una frase clara.' } }, required: ['hecho'] },
  },
  // ── NOVEDADES · qué cambios/mejoras se le hicieron a Nexus (changelog propio) ──
  {
    name: 'novedades_nexus',
    description: 'CAMBIOS Y MEJORAS que se le hicieron a NEXUS (a TI mismo). Úsala SIEMPRE que pregunten "¿qué cambios/mejoras se te hicieron?", "¿qué hay de nuevo?", "¿qué aprendiste/qué sabes hacer nuevo?", "¿qué se actualizó?", "¿en qué avanzaste?". Devuelve el changelog REAL (fecha, área, título, detalle), lo nuevo primero. ⚠️ NO uses buscar_cerebro para esto (eso es el segundo cerebro de Nico, no tu registro de cambios) ni lo inventes: esta es la única fuente. Después preséntalo ordenado y agrupado por área, en tu voz, sin pegar el JSON. Con "desde" (YYYY-MM-DD) filtras solo lo posterior a esa fecha.',
    input_schema: { type: 'object', properties: { desde: { type: 'string', description: 'Opcional: solo novedades desde esta fecha YYYY-MM-DD.' } }, required: [] },
  },
  // ── RECORDATORIOS · lista personal en el Segundo Cerebro (por persona) ────────
  {
    name: 'guardar_recordatorio',
    description: 'GUARDA un recordatorio en la LISTA PERSONAL de recordatorios (apartado "Recordatorios" del Segundo Cerebro). Úsalo cuando Ramón o Nico digan "guarda en recordatorios esto", "agrégalo a mis recordatorios", "apúntame que…", "recuérdame que tengo que… / que quiero…" SIN una hora/fecha concreta (algo para tener presente, no un aviso a tal hora). ⚠️ Si en cambio piden un aviso PROGRAMADO a una hora o en X tiempo ("recuérdame mañana a las 9", "en 10 min mándame…"), ESO es programar_mensaje, NO esta tool. El recordatorio se agrega a la lista de la persona. 🚫 IMPORTANTE: NO programes ni agendes NADA con programar_mensaje para el repaso de cada 10 días — de ese envío se encarga SOLO un sistema aparte (no lo dupliques como SMS/WhatsApp). Con guardar_recordatorio basta. Por defecto se guarda para QUIEN te habla; si te piden guardarlo para el otro ("recuérdale a Nico que…"), pon de_quien.',
    input_schema: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'El recordatorio, en una frase clara.' },
        de_quien: { type: 'string', enum: ['Ramon', 'Nico'], description: 'De quién es la lista. Omítelo para usar quien te habla; ponlo solo si te piden guardarlo para el otro.' },
      },
      required: ['texto'],
    },
  },
  // ── tek · PAGO de facturas de COMPRA de ANA CLARA (Santander Empresa) ─────────
  {
    name: 'tek_pago',
    description: 'PAGO a proveedor de ANA CLARA a partir de una FACTURA DE COMPRA (sistema "tek", Santander Empresa). ⚠️ HOY EN MODO SIMULACIÓN: arma el borrador del pago pero NO transfiere plata de verdad (el canal real con el banco todavía no está habilitado). Flujo de 2 pasos, como emitir factura: (1) accion:"preparar" con proveedor, rut, monto (CLP) y folio → devuelve el BORRADOR del pago (beneficiario, monto, cuenta origen de ANA CLARA, glosa). MUÉSTRASELO al usuario y pregúntale claro: "¿emito el pago de $X a [proveedor]?". (2) SOLO cuando confirme, accion:"emitir" con los MISMOS datos → hoy responde SIMULACIÓN (no mueve plata) y te dice exactamente qué se transferiría. NUNCA pongas accion:"emitir" sin una confirmación explícita del usuario. Úsalo cuando pidan "paga la factura de compra de X", "emití el pago al proveedor Y", o cuando detectes una factura de compra por pagar.',
    input_schema: {
      type: 'object',
      properties: {
        accion: { type: 'string', enum: ['preparar', 'emitir'], description: 'preparar = arma y muestra el borrador (no paga). emitir = ejecuta (HOY simula, no mueve plata). Solo emitir tras el OK del usuario.' },
        proveedor: { type: 'string', description: 'Nombre/razón social del proveedor a pagar.' },
        rut: { type: 'string', description: 'RUT del proveedor (ej. "76.123.456-7").' },
        monto: { type: 'number', description: 'Monto a pagar en CLP (entero > 0).' },
        folio: { type: 'string', description: 'N° de folio de la factura de compra (opcional pero recomendado).' },
        glosa: { type: 'string', description: 'Glosa/descripción del pago (opcional; máx 40 chars).' },
      },
      required: ['accion', 'proveedor', 'rut', 'monto'],
    },
  },
  // ── tek · TRANSFERIR plata a una PERSONA guardada (Santander Empresa) ─────────
  {
    name: 'tek_transferir',
    description: 'TRANSFERIR plata desde la cuenta de la empresa a una PERSONA guardada en la libreta (sistema "tek", Santander Empresa). Crea la transferencia y la deja PENDIENTE "por liberar" (NO mueve la plata hasta que alguien la libere/autorice con Superclave). Flujo de 2 pasos con confirmación OBLIGATORIA: (1) accion:"preparar" con nombre (a quién) y monto (CLP) → resuelve la persona en la libreta y devuelve el BORRADOR (a quién, cuánto, banco, cuenta). Si hay VARIAS personas con ese nombre, devuelve una lista para que el usuario ELIJA cuál. Muéstrale el borrador y pregúntale claro: "¿creo la transferencia de $X a [persona]?". (2) SOLO cuando confirme, accion:"enviar" con los MISMOS datos → crea la transferencia pendiente (login + llenado automático) y te dice cómo quedó. NUNCA pongas accion:"enviar" sin una confirmación explícita del usuario. Úsalo cuando pidan "envíale $X a [nombre]", "transfiérele a [nombre]", "mándale plata a [nombre]".',
    input_schema: {
      type: 'object',
      properties: {
        accion: { type: 'string', enum: ['preparar', 'enviar'], description: 'preparar = resuelve y muestra el borrador (no crea nada). enviar = crea la transferencia pendiente. Solo enviar tras el OK del usuario.' },
        nombre: { type: 'string', description: 'Nombre o alias de la persona guardada a quien transferir (ej. "Joaquín"). Si antes hubo ambigüedad, pasá el nombre exacto de la elegida.' },
        monto: { type: 'number', description: 'Monto a transferir en CLP (entero > 0).' },
        motivo: { type: 'string', description: 'Motivo/glosa de la transferencia (opcional; máx 100 chars).' },
      },
      required: ['accion', 'nombre', 'monto'],
    },
  },
]

// Changelog propio de Nexus. Se lee UNA vez y se cachea (archivo local diminuto):
// el hilo del hub no toca disco al atender un mensaje. Se refresca al reiniciar.
let _novedadesCache = null
function leerNovedades() {
  if (_novedadesCache) return _novedadesCache
  try {
    _novedadesCache = JSON.parse(readFileSync(join(__dirname, 'novedades-nexus.json'), 'utf8')) || { novedades: [] }
  } catch { _novedadesCache = { novedades: [] } }
  return _novedadesCache
}

async function ejecutar(nombre, input, ctx = {}) {
  try {
    // ── Control de acceso por usuario ───────────────────────────────────────────
    // Gestión de usuarios: SOLO los fundadores (Ramón/Nico).
    if (GESTION_USUARIOS.includes(nombre) && !esAdmin(ctx.de)) {
      return '🔒 Solo Ramón o Nico pueden gestionar usuarios de Nexus.'
    }
    // Mensajes programados: pueden enviar a cualquier destino → solo fundadores.
    if (['programar_mensaje', 'listar_recordatorios', 'cancelar_recordatorio'].includes(nombre) && !esAdmin(ctx.de)) {
      return '🔒 Solo Ramón o Nico pueden programar mensajes.'
    }
    // Resto: si la herramienta pertenece a un área (scope), el usuario debe tenerla
    // habilitada (los admin pasan todo). Las tools sin scope quedan libres.
    if (!GESTION_USUARIOS.includes(nombre)) {
      const sc = scopeDeTool(nombre)
      if (sc && !esAdmin(ctx.de) && !accesosDe(ctx.de).includes(sc)) {
        return `🔒 No tienes acceso a *${sc}*. Pídele a Ramón o Nico que te habiliten esa área.`
      }
    }
    // ── GMAIL · descargar documentos (adjuntos) del correo conectado y mandarlos por WhatsApp ──
    if (nombre === 'gmail_documentos') {
      try {
        const r = await gmailDescargarAdjuntos({ remitente: input.remitente, asunto: input.asunto, dias: input.dias, limite: input.limite, tipos: input.tipos })
        if (!r || !r.total) {
          const filtros = [input.remitente ? `de "${input.remitente}"` : '', input.asunto ? `asunto "${input.asunto}"` : '', input.tipos ? `tipo ${(input.tipos || []).join('/')}` : ''].filter(Boolean).join(', ')
          return `No encontré documentos adjuntos en el Gmail${r ? ' (' + r.cuenta + ')' : ''} en los últimos ${input.dias || 30} días${filtros ? ' con ' + filtros : ''}.`
        }
        const target = destinoValido(ctx.de)
        const docs = r.adjuntos.slice(0, 10)   // tope de envío para no floodear
        if (target) {
          // envío SECUENCIAL en segundo plano (el CLI de OpenClaw es pesado; en paralelo se ahoga)
          ;(async () => {
            const glog = (m) => { try { appendFileSync('/tmp/nexus-fotos.log', `[${new Date().toISOString()}] ${m}\n`) } catch { /* */ } }
            for (const a of docs) {
              try { await enviarMediaWhatsApp(target, a.archivo, `📎 ${a.nombre} — de ${a.de}`, { forceDocument: true }); glog(`OK gmail-doc ${a.nombre} -> ${target}`) }
              catch (e) { glog(`FALLO gmail-doc ${a.nombre}: ${String(e.message).slice(0, 100)}`) }
            }
          })()
          const lista = docs.map((a) => `• ${a.nombre} (${a.kb} KB) — de ${a.de}`).join('\n')
          const extra = r.total > docs.length ? `\n(hay ${r.total - docs.length} más; acota el filtro si quieres esos)` : ''
          return `Descargué ${r.total} documento(s) del Gmail (${r.cuenta}) y te ENVÍO ${docs.length} por WhatsApp (llegan de a uno, ~1 min c/u):\n${lista}${extra}\nConfírmale corto al usuario que ya se los estás mandando; NO los listes tú de nuevo.`
        }
        return `Descargué ${r.total} documento(s) del Gmail: ${docs.map((a) => a.nombre).join(', ')}. (No pude identificar a quién enviárselos por WhatsApp.)`
      } catch (e) { return `No pude bajar los documentos del Gmail: ${e.message}` }
    }
    // ── PLAUD · estado del pipeline automático (memoria propia de Nexus) ──
    if (nombre === 'mi_dia') {
      const p = new URLSearchParams()
      if (input.fecha) p.set('fecha', String(input.fecha))
      if (input.hasta) p.set('hasta', String(input.hasta))
      for (let intento = 0; intento < 2; intento++) {
        try {
          const r = await fetch(`${CEREBRO}/dia?${p}`, { signal: AbortSignal.timeout(7000) })
          if (!r.ok) throw new Error('HTTP ' + r.status)
          const j = await r.json()
          return JSON.stringify(j).slice(0, MAX_TOOL_CHARS)
        } catch (e) {
          if (intento) return `No pude leer lo del día: ${e.message}`
        }
      }
    }
    if (nombre === 'plaud_estado') {
      try {
        const DIRC = join(process.env.HOME || '', 'nexus', 'conector-correo')
        const PLAUDD = join(VAULT, '90-Agente', 'Plaud')
        const est = existsSync(join(DIRC, 'estado-analisis.json')) ? JSON.parse(readFileSync(join(DIRC, 'estado-analisis.json'), 'utf8')) : { analizados: [] }
        // estado-plaud.json = estado de la DESCARGA (cuándo corrió, qué bajó cada vez).
        const dl = existsSync(join(DIRC, 'estado-plaud.json')) ? JSON.parse(readFileSync(join(DIRC, 'estado-plaud.json'), 'utf8')) : {}
        const total = (est.analizados || []).length
        const fmtTs = (t) => { try { return t ? new Date(t).toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' }) : null } catch { return null } }
        const ultima = fmtTs(dl.ultima) || 'aún no ha corrido'
        const corridas = Array.isArray(dl.corridas) ? dl.corridas : []
        const corridasRecientes = corridas.slice(-6).reverse()
          .map((c) => `${fmtTs(c.ts)} — ${c.nuevos > 0 ? `${c.nuevos} grabación(es) nueva(s), ${c.documentos} documentos bajados` : 'revisé, sin novedades'}`)
          .join('\n') || 'sin registro de corridas todavía'
        // Correos vs DOCUMENTOS: cada correo de Plaud trae 2 documentos (transcripción + resumen).
        // Los contamos de verdad en las notas de grabación (las que NO empiezan con "_").
        let correos = 0, documentos = 0
        if (existsSync(PLAUDD)) {
          for (const f of readdirSync(PLAUDD).filter((x) => x.endsWith('.md') && !x.startsWith('_'))) {
            correos++
            const c = readFileSync(join(PLAUDD, f), 'utf8')
            if (/##\s*Resumen/i.test(c)) documentos++
            if (/##\s*Transcripci/i.test(c)) documentos++
          }
        }
        const files = existsSync(PLAUDD) ? readdirSync(PLAUDD).filter((f) => f.startsWith('_Análisis') && f.endsWith('.md')).sort() : []
        let reuniones = 0, mes = '', ultimas = ''
        if (files.length) {
          const last = files[files.length - 1]; mes = (last.match(/(\d{4}-\d{2})/) || [])[1] || ''
          const c = readFileSync(join(PLAUDD, last), 'utf8')
          reuniones = (c.match(/^### /gm) || []).length
          ultimas = [...c.matchAll(/^### (.+)$/gm)].map((m) => '• ' + m[1].trim()).slice(-8).join('\n')
        }
        // Track PERSONAL: perfil de Nico (Familia/Pasiones/Relaciones/Reflexiones/Valores)
        const filesP = existsSync(PLAUDD) ? readdirSync(PLAUDD).filter((f) => f.startsWith('_Personal') && f.endsWith('.md')).sort() : []
        let perfilPersonal = 0, mesP = ''
        if (filesP.length) {
          const lp = filesP[filesP.length - 1]; mesP = (lp.match(/(\d{4}-\d{2})/) || [])[1] || ''
          perfilPersonal = (readFileSync(join(PLAUDD, lp), 'utf8').match(/^### /gm) || []).length
        }
        return {
          ok: true,
          sistema: 'Pipeline Plaud automático de Nexus (5 veces al día): descargo de mi Gmail los correos de Plaud del día a día de Nico. Cada correo trae 2 DOCUMENTOS (transcripción.txt + resumen.txt) y los bajo AMBOS; luego leo la transcripción completa con IA en DOS pasadas — (1) NEGOCIO → _Análisis (proyectos, decisiones, pendientes); (2) PERSONAL → _Personal (perfil de Nico: Familia, Pasiones, Relaciones, Reflexiones, Valores). Todo va al segundo cerebro, automático.',
          horario: 'Corro AUTOMÁTICO 5 veces al día: 10:00, 13:00, 16:00, 18:00 y 22:00 (hora de Chile). En cada una reviso el Gmail y bajo lo nuevo.',
          correos_de_plaud: correos,
          documentos_de_plaud: documentos,
          detalle_documentos: `${correos} correos · ${documentos} documentos (cada grabación = transcripción + resumen)`,
          total_grabaciones_procesadas: total,
          ultima_corrida: ultima,
          bajado_en_la_ultima_corrida: `${dl.documentos_ultima_corrida ?? 0} documentos`,
          corridas_recientes: corridasRecientes,
          ultimo_mes: mes || mesP || '—',
          reuniones_de_negocio_ese_mes: reuniones,
          ultimas_reuniones: ultimas || '(sin contenido de negocio aún)',
          perfil_personal_de_nico: perfilPersonal ? `${perfilPersonal} grabaciones destiladas al perfil personal (_Personal — ${mesP}.md)` : 'aún sin perfil personal',
          donde: 'Negocio en 90-Agente/Plaud/_Análisis — <mes>.md; perfil personal de Nico en 90-Agente/Plaud/_Personal — <mes>.md. Para el contenido concreto usa buscar_cerebro.',
        }
      } catch (e) { return `No pude leer el estado del pipeline Plaud: ${e.message}` }
    }
    if (nombre === 'recordar') {
      const r = recordarHecho(ctx.de, input.hecho, usuarioDe(ctx.de)?.nombre)
      return JSON.stringify(r)
    }
    // ── NOVEDADES · changelog propio de Nexus (mismo resultado en web y WhatsApp) ──
    if (nombre === 'novedades_nexus') {
      const data = leerNovedades()
      let lista = Array.isArray(data.novedades) ? data.novedades : []
      const desde = String(input.desde || '').trim()
      if (desde) lista = lista.filter((n) => String(n.fecha || '') >= desde)
      if (!lista.length) return JSON.stringify({ ok: true, actualizado: data.actualizado, novedades: [], nota: 'Sin novedades en ese rango.' })
      return JSON.stringify({ ok: true, actualizado: data.actualizado, total: lista.length, novedades: lista })
    }
    // ── RECORDATORIOS · agregar a la lista personal (apartado del Segundo Cerebro) ──
    if (nombre === 'guardar_recordatorio') {
      const texto = String(input.texto || '').trim()
      if (!texto) return JSON.stringify({ ok: false, error: 'Falta el texto del recordatorio.' })
      // Persona: la que pidan explícitamente, o quien habla (solo Ramon/Nico tienen lista).
      let persona = String(input.de_quien || '').trim()
      if (persona) persona = /nico/i.test(persona) ? 'Nico' : /ram/i.test(persona) ? 'Ramon' : ''
      if (!persona) {
        const n = usuarioDe(ctx.de)?.nombre || ''
        persona = /nico/i.test(n) ? 'Nico' : /ram/i.test(n) ? 'Ramon' : ''
      }
      if (!persona) return JSON.stringify({ ok: false, error: 'La lista de recordatorios es de Ramón o Nico. Indica de quién es (de_quien).' })
      const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
      const linea = `- [ ] ${hoy} · ${texto}`
      try {
        const r = await fetch(`${CEREBRO}/nota`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ruta: `90-Agente/Recordatorios/Recordatorios — ${persona}.md`, contenido: linea, modo: 'agregar', autor: 'nexus-recordatorios' }),
          signal: AbortSignal.timeout(7000),
        })
        const j = await r.json()
        if (!r.ok || j.error) return JSON.stringify({ ok: false, error: j.error || ('HTTP ' + r.status) })
        return JSON.stringify({ ok: true, persona, guardado: texto, fecha: hoy, nota: `Anotado en los recordatorios de ${persona}. Se lo recuerdo por WhatsApp cada 10 días.` })
      } catch (e) {
        return JSON.stringify({ ok: false, error: 'No pude guardar el recordatorio: ' + e.message })
      }
    }
    // ── tek · PAGO de factura de compra (SIMULACIÓN — no mueve plata todavía) ──
    if (nombre === 'tek_pago') {
      let pago
      try { pago = await import('../conector-tek/pago.mjs') }
      catch (e) { return JSON.stringify({ ok: false, error: 'No pude cargar el motor de pagos (tek): ' + e.message }) }
      const arm = pago.armarBorradorPago({ proveedor: input.proveedor, rut: input.rut, monto: input.monto, folio: input.folio, glosa: input.glosa })
      if (!arm.ok) return JSON.stringify({ ok: false, error: arm.error, nota: 'Corrige ese dato y volvé a intentar.' })
      const b = arm.borrador
      if (input.accion === 'emitir') {
        const res = await pago.emitirPago(b)
        return JSON.stringify({ ...res, texto: pago.textoBorrador(b) })
      }
      // accion 'preparar' (default): solo el borrador, para mostrar y pedir OK.
      return JSON.stringify({
        ok: true, modo: 'borrador', ejecutado: false, borrador: b, texto: pago.textoBorrador(b),
        instruccion: 'Muéstrale este borrador al usuario y pregúntale claro "¿emito el pago de ' + '$' + Number(b.monto).toLocaleString('es-CL') + ' a ' + b.beneficiario.nombre + '?". SOLO con su OK, llama tek_pago con accion:"emitir".',
      })
    }
    // ── tek · TRANSFERIR a una persona guardada (crea PENDIENTE por liberar, no mueve plata) ──
    if (nombre === 'tek_transferir') {
      let tr
      try { tr = await import('../conector-tek/transferir.mjs') }
      catch (e) { return JSON.stringify({ ok: false, error: 'No pude cargar el motor de transferencias (tek): ' + e.message }) }
      const userId = 'ramon', empresa = 'ANA CLARA SPA'   // por ahora la única conexión; multiusuario cuando el widget sume gente
      const arm = tr.armarBorrador({ userId, nombre: input.nombre, monto: input.monto, motivo: input.motivo })
      if (!arm.ok) {
        if (arm.ambiguo) return JSON.stringify({ ok: false, ambiguo: true, candidatos: arm.candidatos, texto: arm.error, instruccion: 'Hay varias personas con ese nombre. Mostrale la lista (nombre · banco · cuenta) y pedile que elija cuál; después volvé a llamar tek_transferir con el nombre exacto de la elegida.' })
        return JSON.stringify({ ok: false, error: arm.error, nota: 'Corrige el dato, o primero guardá a la persona en la libreta de tek.' })
      }
      const bo = arm.borrador
      if (input.accion === 'enviar') {
        const res = await tr.ejecutar(bo, { userId, empresa })
        const okTxt = res.pendiente
          ? `✅ Transferencia de $${Number(bo.monto).toLocaleString('es-CL')} a ${bo.beneficiario.nombre} CREADA — queda pendiente por liberar (falta autorizarla con Superclave para que salga).`
          : `⚠️ No pude confirmar la creación (${res.estado || 'desconocido'}). Suele ser el antifraude del banco; conviene reintentar más tarde, mejor asistido.`
        return JSON.stringify({ ...res, texto: okTxt })
      }
      return JSON.stringify({
        ok: true, modo: 'borrador', ejecutado: false, borrador: bo, texto: tr.textoBorrador(bo),
        instruccion: 'Mostrale este borrador y preguntale claro "¿creo la transferencia de $' + Number(bo.monto).toLocaleString('es-CL') + ' a ' + bo.beneficiario.nombre + '?". SOLO con su OK explícito, llamá tek_transferir con accion:"enviar".',
      })
    }
    // ── SII · descargar el PDF de una boleta de honorarios recibida y mandarla por WhatsApp ──
    if (nombre === 'sii_boleta_honorarios') {
      const empresa = String(input.empresa || '').trim()
      const emisor = String(input.emisor || input.usuario || '').trim()
      const anio = Math.trunc(Number(input.anio))
      const mes = Math.trunc(Number(input.mes))
      if (!empresa || !emisor || !Number.isFinite(anio) || !Number.isFinite(mes)) {
        return 'Para bajar la boleta necesito 4 datos: EMPRESA (razón social o RUT), AÑO, MES y USUARIO (el emisor, nombre o RUT). Pregúntaselos al usuario.'
      }
      const dir = join(__dirname, '..', 'sii-web')
      const py = join(dir, '.venv', 'bin', 'python')
      const script = join(dir, 'descargar_boleta.py')
      const out = `/tmp/boleta-${Date.now()}.pdf`
      try {
        const { stdout } = await ejecCmd(
          `${JSON.stringify(py)} ${JSON.stringify(script)} --empresa ${JSON.stringify(empresa)} --anio ${anio} --mes ${mes} --emisor ${JSON.stringify(emisor)} --out ${JSON.stringify(out)}`,
          { cwd: dir, timeout: 150000, maxBuffer: 4 * 1024 * 1024 },
        )
        const linea = stdout.trim().split('\n').filter(Boolean).pop() || '{}'
        const r = JSON.parse(linea)
        if (!r.ok) {
          let msg = r.error || 'No pude obtener la boleta.'
          if (Array.isArray(r.candidatos) && r.candidatos.length) msg += '\n\nBoletas de ese mes:\n' + r.candidatos.map((c) => `• ${c.nombre} (${c.rut}) — folio ${c.folio}, ${c.fecha}`).join('\n')
          if (Array.isArray(r.empresas) && r.empresas.length) msg += '\n\nEmpresas configuradas: ' + r.empresas.map((e) => `${e.nombre} (${e.rut})`).join(', ')
          return msg
        }
        const b = r.boleta
        const cap = `📄 Boleta de Honorarios — ${b.emisor} (${b.rut}) → ${r.empresa} · folio ${b.folio} · ${b.fecha}`
        const target = destinoValido(ctx.de)
        if (target) {
          enviarMediaWhatsApp(target, r.pdf, cap, { forceDocument: true })
            .then(() => { try { appendFileSync('/tmp/nexus-fotos.log', `[${new Date().toISOString()}] OK boleta -> ${target}\n`) } catch { /* */ } })
            .catch((e) => { try { appendFileSync('/tmp/nexus-fotos.log', `[${new Date().toISOString()}] FALLO boleta: ${String(e.message).slice(0, 120)}\n`) } catch { /* */ } })
          return `Boleta encontrada y ENVIADA como PDF al WhatsApp del usuario: ${cap}. Confírmale corto que ya se la mandaste (llega en ~1 min).`
        }
        return `Boleta encontrada: ${cap}. Pero no pude identificar a quién enviársela por WhatsApp.`
      } catch (e) { return `No pude bajar la boleta del SII: ${e.message}` }
    }
    // ── SAI · conciliación (todas leen del motor en ../conector-sai; degradan solas) ──
    if (nombre === 'sai_conciliacion') {
      try { return JSON.stringify(await sai.saiConciliacion()) }
      catch (e) { return `No pude leer la conciliación (SAI): ${e.message}` }
    }
    if (nombre === 'sai_buscar_factura') {
      try { return JSON.stringify(await sai.saiBuscarFactura({ folio: input.folio, rut: input.rut, proveedor: input.proveedor })) }
      catch (e) { return `No pude buscar la factura (SAI): ${e.message}` }
    }
    if (nombre === 'sai_movimientos_banco') {
      try { return JSON.stringify(await sai.saiMovimientosBanco({ desde: input.desde, hasta: input.hasta, min_monto: input.min_monto, tipo: input.tipo })) }
      catch (e) { return `No pude leer los movimientos (SAI): ${e.message}` }
    }
    if (nombre === 'sai_mallorca_compras') {
      try {
        if (input.patente || input.folio) return JSON.stringify(await sai.saiMallorcaHoja({ patente: input.patente, folio: input.folio }))
        return JSON.stringify(await sai.saiStockMallorca())
      } catch (e) { return `No pude leer Mallorca (SAI): ${e.message}` }
    }
    if (nombre === 'listar_tablas') {
      const t = await tablas()
      return `Tablas (${t.length}): ${t.join(', ')}`
    }
    if (nombre === 'consultar_bd') {
      const lista = await tablas()
      if (!lista.includes(input.tabla)) return `Error: la tabla "${input.tabla}" no existe. Usa listar_tablas.`
      // Guardarraíl: la tabla "reportes" son CITAS de una clínica, NO la facturación de
      // Aliace. Bloquearla evita que se responda facturación/ventas desde la BD equivocada.
      if (input.tabla === 'reportes') {
        return 'BLOQUEADO: "reportes" son citas de una clínica, NO la facturación de Aliace. La facturación/ventas/pagos SIEMPRE se obtienen navegando el portal de Aliace (admin.aliace.cl): usa guia_aliace → iniciar_sesion(\'aliace\') → navegar → esperar → leer_tabla. No uses la base de datos para esto.'
      }
      const limite = Math.min(Number(input.limite || 25), 200)
      // "columnas": pide SOLO lo necesario (ej "fecha,monto") en vez de todo (*).
      const select = (input.columnas && String(input.columnas).trim())
        ? String(input.columnas).replace(/[^\w,.*()]/g, '') : '*'
      let url = `${SUPA_REST}/${encodeURIComponent(input.tabla)}?select=${select}&limit=${limite}`
      // "filtro": filtra en el servidor en vez de traer todo (ej "fecha=gte.2026-06-01&fecha=lt.2026-07-01").
      if (input.filtro) url += `&${String(input.filtro).replace(/^[?&]+/, '')}`
      if (input.orden) url += `&order=${encodeURIComponent(input.orden)}`
      const r = await fetch(url, { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, Prefer: 'count=exact', Range: `0-${limite - 1}` } })
      const datos = await r.json()
      if (!Array.isArray(datos)) {
        // PostgREST devuelve un objeto de error (ej columna/filtro inválido).
        return JSON.stringify({ error: 'consulta inválida', detalle: datos, pista: 'Revisa "columnas"/"filtro". Formato PostgREST, ej filtro="fecha=gte.2026-06-01".' })
      }
      const cr = r.headers.get('content-range') || ''
      const total = cr.split('/')[1] || datos.length
      const { filas, recortado } = acotarFilas(datos)
      const out = { tabla: input.tabla, total_filas: total, devueltas: filas.length, filas }
      if (recortado) out.aviso = `Resultado recortado por tamaño (las filas son grandes). Hay ${total} filas en total. Pide SOLO las columnas que necesitas con "columnas" (ej "fecha,monto") y acota con "filtro"/"orden"/"limite"; no traigas la tabla entera.`
      return JSON.stringify(out)
    }
    if (nombre === 'buscar_cerebro') {
      const q = String(input.q || '').trim()
      if (!q) return JSON.stringify({ total: 0, resultados: [], nota: 'query vacía' })
      // Timeout + 1 reintento: un fallo puntual del daemon NO debe reportarse como
      // "el cerebro no tiene datos". El buscador ya tokeniza (frases naturales OK).
      for (let intento = 0; intento < 2; intento++) {
        try {
          const r = await fetch(`${CEREBRO}/buscar?q=${encodeURIComponent(q)}&limite=8`, { signal: AbortSignal.timeout(7000) })
          if (!r.ok) throw new Error('HTTP ' + r.status)
          const j = await r.json()
          console.error(`[cerebro] OK q="${q}" total=${j.total ?? '?'} (intento ${intento})`)
          return JSON.stringify(j)
        } catch (e) {
          console.error(`[cerebro] FALLO q="${q}" intento ${intento}: ${e.name} ${e.message}`)
          if (intento === 0) continue
          return JSON.stringify({ total: 0, resultados: [], error: 'el cerebro no respondió (' + e.message + '); reintenta con 1-2 palabras clave', _reintentar: true })
        }
      }
    }
    if (nombre === 'guardar_nota') {
      const r = await fetch(`${CEREBRO}/nota`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruta: input.ruta, contenido: input.contenido, modo: 'crear', autor: '2cerebro' }),
      })
      return JSON.stringify(await r.json())
    }
    if (nombre === 'navegar') {
      const r = await fetch(`${NAVEGADOR}/ir`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input.url }),
      })
      const d = await r.json()
      return JSON.stringify(d)
    }
    if (nombre === 'ver_pestanas') {
      const r = await fetch(`${NAVEGADOR}/estado`)
      return JSON.stringify(await r.json())
    }
    if (nombre === 'cambiar_pestana') {
      const r = await fetch(`${NAVEGADOR}/pestana`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ i: input.i }),
      })
      return JSON.stringify(await r.json())
    }
    if (nombre === 'leer_pagina') {
      const r = await fetch(`${NAVEGADOR}/leer`)
      const d = await r.json()
      let texto = String(d.texto || '')
      if (texto.length > 4000) texto = texto.slice(0, 4000) + '… [texto recortado]'
      return JSON.stringify({ url: d.url, texto })
    }
    if (nombre === 'captura_pantalla') {
      const r = await fetch(`${NAVEGADOR}/captura`)
      const d = await r.json()
      const b64 = d.png_base64 || ''
      const kb = Math.round((b64.length * 3 / 4) / 1024)
      return `Captura tomada de ${d.url || '(url desconocida)'} (${kb} KB)`
    }
    if (nombre === 'escribir_en_campo') {
      const r = await fetch(`${NAVEGADOR}/escribir`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selector: input.selector, texto: input.texto }),
      })
      return JSON.stringify(await r.json())
    }
    if (nombre === 'clic') {
      const r = await fetch(`${NAVEGADOR}/click`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: input.texto, selector: input.selector, aprobado: input.aprobado }),
      })
      const d = await r.json()
      if (d && d.requiere_aprobacion) {
        return `REQUIERE APROBACIÓN DE RAMÓN — acción sensible: ${d.accion || '(sin detalle)'}. ${d.mensaje || ''} No la ejecutes solo: pídele confirmación a Ramón y, si aprueba, vuelve a llamar a clic con aprobado:true.`
      }
      return JSON.stringify(d)
    }
    if (nombre === 'esperar') {
      const r = await fetch(`${NAVEGADOR}/esperar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aparece: input.aparece, desaparece: input.desaparece, ms: input.ms }),
      })
      return JSON.stringify(await r.json())
    }
    if (nombre === 'leer_tabla') {
      const r = await fetch(`${NAVEGADOR}/tabla`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selector: input.selector }),
      })
      const d = await r.json()
      if (!d || d.ok === false) return JSON.stringify(d || { ok: false, motivo: 'sin respuesta' })
      // Recorta a ~60 filas en el texto al modelo, indicando el total real.
      const MAX_MODELO = 60
      const filas = Array.isArray(d.filas) ? d.filas : []
      const mostradas = filas.slice(0, MAX_MODELO)
      const out = {
        ok: true,
        url: d.url,
        columnas: d.columnas,
        total_filas: d.total_filas ?? d.n_filas,
        filas_mostradas: mostradas.length,
        truncado: d.truncado || filas.length > MAX_MODELO,
        filas: mostradas,
      }
      return JSON.stringify(out)
    }
    if (nombre === 'guia_aliace') {
      try {
        const ruta = join(__dirname, '..', 'conector-navegador', 'guias', 'aliace.md')
        let txt = readFileSync(ruta, 'utf8')
        if (txt.length > 6000) txt = txt.slice(0, 6000) + '\n… [guía recortada]'
        return txt
      } catch (e) {
        return `No pude leer la guía de Aliace: ${e.message}`
      }
    }
    if (nombre === 'iniciar_sesion') {
      const r = await fetch(`${NAVEGADOR}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitio: input.sitio }),
      })
      return JSON.stringify(await r.json())
    }
    if (nombre === 'guardar_credencial') {
      const r = await fetch(`${NAVEGADOR}/credencial`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitio: input.sitio, url: input.url, usuario: input.usuario, clave: input.clave }),
      })
      return JSON.stringify(await r.json())
    }
    if (nombre === 'listar_sitios') {
      const r = await fetch(`${NAVEGADOR}/sitios`)
      return JSON.stringify(await r.json())
    }
    if (nombre === 'consultar_goautos') {
      // Lee datos de GoAutos (MallorcAutos) por su conector (solo lectura, no modifica nada).
      const cmd = String(input.comando || 'resumen').replace(/[^a-z-]/g, '')
      const validos = ['resumen', 'publicaciones', 'publicados', 'vehiculos', 'vendidos', 'estados', 'por-estado', 'buscar', 'ficha', 'guardar-cav']
      const comando = validos.includes(cmd) ? cmd : 'resumen'
      let args = comando
      if (comando === 'por-estado' && input.estado) args += ` --estado ${JSON.stringify(String(input.estado))}`
      if (comando === 'buscar' && input.texto) args += ` --texto ${JSON.stringify(String(input.texto))}`
      if (comando === 'ficha' && input.id) args += ` --id ${Number(input.id)}`
      if (comando === 'guardar-cav') {
        // Guarda los datos del CAV por patente (para no volver a pedirlos nunca).
        for (const k of ['patente', 'tipo', 'marca', 'modelo', 'motor', 'chasis', 'color', 'combustible', 'pbv', 'anio', 'fuente']) {
          if (input[k]) args += ` --${k} ${JSON.stringify(String(input[k]))}`
        }
      }
      if (input.limite) args += ` --limite ${Number(input.limite)}`
      const script = join(__dirname, '..', 'conector-goautos', 'goautos.mjs')
      try {
        const { stdout } = await ejecCmd(`node ${JSON.stringify(script)} ${args}`, { timeout: 30000, maxBuffer: 4 * 1024 * 1024 })
        // Tope 16k chars (~4.5k tokens): para conteos/listas en TEXTO alcanza de sobra.
        // El catálogo CON fotos va por el tool enviar_fotos_autos (que NO mete el JSON
        // grande al contexto), así que acá no necesitamos los 48k de antes.
        const txt = stdout.slice(0, 16000)
        // GUARDIA "stock SIEMPRE con foto": estos comandos LISTAN autos para que el
        // usuario los VEA. La regla del negocio (ver prompt) es NO mostrarlos en texto:
        // van como ficha+foto vía enviar_fotos_autos. El modelo a veces igual los lista
        // en texto (pasó con "dame los 2 últimos autos"). Devolvemos los datos —sirven
        // para sacar el id si hay que editar/vender— PERO con una instrucción dura
        // adelante para forzar el envío con foto. Solo si hay WhatsApp destino válido
        // (en desktop sin WhatsApp dejamos el texto y NO forzamos, para no hacer bucle).
        const LISTADOS = ['publicaciones', 'publicados', 'vehiculos', 'vendidos', 'por-estado']
        if (LISTADOS.includes(comando) && destinoValido(ctx.de)) {
          const ref = `comando "${comando}"` + (input.estado ? `, estado "${input.estado}"` : '') + (input.limite ? `, límite ${input.limite}` : '')
          return `⚠️ INSTRUCCIÓN OBLIGATORIA: el usuario quiere VER estos autos. NO los listes en texto. ` +
            `Llama enviar_fotos_autos (${ref}) para mandarle ficha + foto de cada uno por WhatsApp, y luego responde SOLO una frase corta ("Te mando los autos 👇"). ` +
            `Usa los datos de abajo SOLO si necesitas un id para editar/vender, NUNCA para responder el listado.\n\n${txt}`
        }
        return txt
      } catch (e) {
        return `No pude leer GoAutos: ${e.message}`
      }
    }
    if (nombre === 'editar_goautos') {
      // EDITA un auto de MallorcAutos. El conector (goautos.mjs) verifica client_id=32
      // ANTES de escribir y el UPDATE va filtrado por client_id=32: imposible tocar
      // otra automotora del portal.
      const id = Number(input.id)
      if (!Number.isFinite(id) || id <= 0) return 'Falta el id del auto a editar (sácalo de consultar_goautos/buscar).'
      const FLAGS = ['estado', 'ubicacion', 'sucursal', 'precio', 'precio_min', 'descuento', 'km', 'anio', 'duenos', 'patente', 'transmision', 'traccion', 'version', 'descripcion', 'en_stock', 'publicado', 'video']
      const partes = [`editar --id ${id}`]
      for (const f of FLAGS) {
        if (input[f] === undefined || input[f] === null || input[f] === '') continue
        partes.push(`--${f} ${JSON.stringify(String(input[f]))}`)
      }
      if (partes.length === 1) return 'No indicaste qué cambiar del auto.'
      const script = join(__dirname, '..', 'conector-goautos', 'goautos.mjs')
      try {
        const { stdout } = await ejecCmd(`node ${JSON.stringify(script)} ${partes.join(' ')}`, { timeout: 30000, maxBuffer: 4 * 1024 * 1024 })
        return stdout.slice(0, 16000)
      } catch (e) {
        return `No pude editar el auto en GoAutos: ${e.message}`
      }
    }
    if (nombre === 'adquisicion_goautos') {
      // Edita la adquisición (precio de compra + vendedor) de un auto de MallorcAutos,
      // directo en vehicles_purchases (el conector verifica client_id=32). Sin navegador.
      const id = Number(input.id)
      if (!Number.isFinite(id) || id <= 0) return 'Falta el id del auto (sácalo de consultar_goautos/buscar).'
      const FLAGS = ['precio_compra', 'proveedor', 'proveedor_rut', 'proveedor_fono', 'proveedor_dir']
      const partes = [`adquisicion --id ${id}`]
      for (const f of FLAGS) {
        if (input[f] === undefined || input[f] === null || input[f] === '') continue
        partes.push(`--${f} ${JSON.stringify(String(input[f]))}`)
      }
      if (partes.length === 1) return 'No indicaste precio de compra ni datos del vendedor.'
      const script = join(__dirname, '..', 'conector-goautos', 'goautos.mjs')
      try {
        const { stdout } = await ejecCmd(`node ${JSON.stringify(script)} ${partes.join(' ')}`, { timeout: 30000, maxBuffer: 4 * 1024 * 1024 })
        return stdout.slice(0, 16000)
      } catch (e) { return `No pude guardar la adquisición en GoAutos: ${e.message}` }
    }
    if (nombre === 'cliente_goautos') {
      // Ver/crear/editar clientes (incl. vendedores) de MallorcAutos. El conector
      // verifica/escribe siempre bajo client_id=32.
      const acc = ['buscar', 'crear', 'editar'].includes(input.accion) ? input.accion : 'buscar'
      const partes = [`cliente --accion ${acc}`]
      for (const f of ['id', 'rut', 'texto', 'nombre', 'apellido', 'empresa', 'telefono', 'email', 'direccion']) {
        if (input[f] === undefined || input[f] === null || input[f] === '') continue
        partes.push(`--${f} ${JSON.stringify(String(input[f]))}`)
      }
      const script = join(__dirname, '..', 'conector-goautos', 'goautos.mjs')
      try {
        const { stdout } = await ejecCmd(`node ${JSON.stringify(script)} ${partes.join(' ')}`, { timeout: 30000, maxBuffer: 4 * 1024 * 1024 })
        return stdout.slice(0, 16000)
      } catch (e) { return `No pude gestionar el cliente en GoAutos: ${e.message}` }
    }
    if (nombre === 'editar_venta_goautos') {
      // EDITA una nota de venta de MallorcAutos. El conector verifica que la venta
      // sea de un auto client_id=32 ANTES de escribir.
      const id = Number(input.id)
      if (!Number.isFinite(id) || id <= 0) return 'Falta el id de la venta a editar (sácalo de consultar_goautos/vendidos).'
      const partes = [`editar-venta --id ${id}`]
      for (const f of ['precio', 'estado', 'pago', 'fecha', 'cliente_id', 'comision', 'comision_pct', 'financiera', 'transferencia', 'notas']) {
        if (input[f] === undefined || input[f] === null || input[f] === '') continue
        partes.push(`--${f} ${JSON.stringify(String(input[f]))}`)
      }
      if (partes.length === 1) return 'No indicaste qué cambiar de la venta.'
      const script = join(__dirname, '..', 'conector-goautos', 'goautos.mjs')
      try {
        const { stdout } = await ejecCmd(`node ${JSON.stringify(script)} ${partes.join(' ')}`, { timeout: 30000, maxBuffer: 4 * 1024 * 1024 })
        return stdout.slice(0, 16000)
      } catch (e) { return `No pude editar la venta en GoAutos: ${e.message}` }
    }
    if (nombre === 'vender_goautos') {
      // REGISTRA la venta de un auto de MallorcAutos. El conector (goautos.mjs) verifica
      // client_id=32 ANTES de escribir: imposible vender un auto de otra automotora.
      const id = Number(input.id)
      if (!Number.isFinite(id) || id <= 0) return 'Falta el id del auto a vender (sácalo de consultar_goautos/buscar).'
      const precio = Number(input.precio)
      if (!Number.isFinite(precio) || precio <= 0) return 'Falta el precio de venta (en CLP, mayor a 0).'
      const FLAGS = ['precio', 'pago', 'fecha', 'cliente_id', 'rut', 'nombre', 'apellido', 'empresa', 'email', 'telefono', 'direccion', 'financiera', 'abonos', 'transferencia', 'notas']
      const partes = [`vender --id ${id}`]
      for (const f of FLAGS) {
        if (input[f] === undefined || input[f] === null || input[f] === '') continue
        partes.push(`--${f} ${JSON.stringify(String(input[f]))}`)
      }
      if (input.simular === true) partes.push('--dry')
      const script = join(__dirname, '..', 'conector-goautos', 'goautos.mjs')
      try {
        const { stdout } = await ejecCmd(`node ${JSON.stringify(script)} ${partes.join(' ')}`, { timeout: 40000, maxBuffer: 4 * 1024 * 1024 })
        return stdout.slice(0, 16000)
      } catch (e) {
        return `No pude registrar la venta en GoAutos: ${e.message}`
      }
    }
    if (nombre === 'gasto_goautos') {
      // AGREGA un gasto a un auto de MallorcAutos. El conector (goautos.mjs) verifica
      // client_id=32 ANTES de escribir. El monto va CON IVA.
      const id = Number(input.id)
      if (!Number.isFinite(id) || id <= 0) return 'Falta el id del auto (sácalo de consultar_goautos/buscar).'
      const titulo = (input.titulo ?? '').toString().trim()
      if (!titulo) return 'Falta el título del gasto (ej "Cambio de neumáticos").'
      const monto = Number(input.monto)
      if (!Number.isFinite(monto) || monto <= 0) return 'Falta el monto del gasto (en CLP, CON IVA incluido).'
      const partes = [`gasto --id ${id} --titulo ${JSON.stringify(titulo)} --monto ${monto}`]
      if (input.categoria) partes.push(`--categoria ${JSON.stringify(String(input.categoria))}`)
      if (input.descripcion) partes.push(`--descripcion ${JSON.stringify(String(input.descripcion))}`)
      if (input.asume) partes.push(`--asume ${JSON.stringify(String(input.asume))}`)
      // CON/SIN factura → IVA recuperable. `factura` es el campo claro; genera_credito_fiscal es alias.
      const conFactura = (input.factura !== undefined) ? input.factura : input.genera_credito_fiscal
      if (conFactura === true) partes.push('--factura si')
      else if (conFactura === false) partes.push('--factura no')
      if (input.numero_factura) partes.push(`--nro_factura ${JSON.stringify(String(input.numero_factura))}`)
      if (input.fecha) partes.push(`--fecha ${JSON.stringify(String(input.fecha))}`)
      if (input.simular === true) partes.push('--dry')
      const script = join(__dirname, '..', 'conector-goautos', 'goautos.mjs')
      try {
        const { stdout } = await ejecCmd(`node ${JSON.stringify(script)} ${partes.join(' ')}`, { timeout: 30000, maxBuffer: 4 * 1024 * 1024 })
        return stdout.slice(0, 16000)
      } catch (e) {
        return `No pude agregar el gasto en GoAutos: ${e.message}`
      }
    }
    if (nombre === 'subir_auto') {
      // CREA un auto en MallorcAutos. La foto/documentos vienen de los adjuntos del
      // remitente (ctx.media). goautos.mjs fuerza client_id=32: solo MallorcAutos.
      // ctx.media = TODOS los adjuntos del usuario, en el MISMO orden que vio el modelo
      // (foto del auto + fotos/PDF de documentos). Los índices del modelo apuntan acá.
      const adjuntos = (Array.isArray(ctx.media) ? ctx.media : [])
      const esImg = (p) => /\.(jpe?g|png|webp)$/i.test(p)
      // Solo se PUBLICAN las fotos del auto (indices_fotos). Los documentos (padrón,
      // permiso, factura) se LEEN para extraer datos pero NUNCA se suben a la galería.
      let idxs = Array.isArray(input.indices_fotos)
        ? input.indices_fotos.filter((i) => Number.isInteger(i) && adjuntos[i] && esImg(adjuntos[i]))
        : []
      if (!idxs.length && Number.isInteger(input.indice_foto) && adjuntos[input.indice_foto] && esImg(adjuntos[input.indice_foto])) idxs = [input.indice_foto]
      if (!idxs.length) { const i0 = adjuntos.findIndex(esImg); if (i0 >= 0) idxs = [i0] } // fallback: 1ª imagen
      // Portada primero (indice_foto si está entre las elegidas).
      const portada = (Number.isInteger(input.indice_foto) && idxs.includes(input.indice_foto)) ? input.indice_foto : idxs[0]
      const orden = portada != null ? [portada, ...idxs.filter((i) => i !== portada)] : idxs
      const fotos = orden.map((i) => adjuntos[i]).filter(Boolean)
      const MAPA = ['marca', 'modelo', 'anio', 'patente', 'precio', 'km', 'color', 'combustible', 'transmision', 'traccion', 'duenos', 'version', 'descripcion', 'ubicacion', 'estado',
        'condicion', 'tipo', 'precio_min', 'descuento', 'motor', 'chasis', 'llaves', 'adquisicion', 'precio_adquisicion', 'proveedor', 'fecha_compra', 'prenda', 'iva_exento', 'facturable', 'transferencia',
        'rev_tecnica', 'permiso_circulacion', 'gases', 'permiso_municipal', 'comuna_permiso', 'etiqueta']
      const partes = ['crear']
      for (const k of MAPA) {
        if (input[k] === undefined || input[k] === null || input[k] === '') continue
        partes.push(`--${k} ${JSON.stringify(String(input[k]))}`)
      }
      for (const f of fotos.slice(0, 10)) partes.push(`--foto ${JSON.stringify(f)}`)
      const script = join(__dirname, '..', 'conector-goautos', 'goautos.mjs')
      try {
        const { stdout } = await ejecCmd(`node ${JSON.stringify(script)} ${partes.join(' ')}`, { timeout: 90000, maxBuffer: 4 * 1024 * 1024 })
        return stdout.slice(0, 16000)
      } catch (e) {
        return `No pude crear el auto en GoAutos: ${e.message}`
      }
    }
    if (nombre === 'consultar_mallorca') {
      // Lee el Excel global de Mallorca (datos financieros) por su conector Python.
      // Solo lectura. Cruza con GoAutos por patente (el modelo combina ambas fuentes).
      const cmd = String(input.comando || 'stock').replace(/[^a-z]/g, '')
      const comando = ['stock', 'auto', 'ventas', 'hojas', 'hoja'].includes(cmd) ? cmd : 'stock'
      let args = comando
      if (comando === 'auto') {
        if (!input.patente) return 'Para "auto" necesito la patente. Si no la tienes, búscala primero en GoAutos (consultar_goautos/buscar).'
        args += ` --patente ${JSON.stringify(String(input.patente))}`
      }
      if (comando === 'ventas' && input.mes) args += ` --mes ${JSON.stringify(String(input.mes))}`
      if (comando === 'hoja') {
        if (!input.hoja) return 'Para "hoja" necesito el nombre de la hoja. Usa el comando "hojas" para ver las disponibles.'
        args += ` --nombre ${JSON.stringify(String(input.hoja))}`
        if (input.buscar) args += ` --buscar ${JSON.stringify(String(input.buscar))}`
        if (input.limite) args += ` --limite ${Number(input.limite)}`
      }
      const py = join(__dirname, '..', 'conector-mallorca', '.venv', 'bin', 'python')
      const script = join(__dirname, '..', 'conector-mallorca', 'mallorca.py')
      try {
        const { stdout } = await ejecCmd(`${JSON.stringify(py)} ${JSON.stringify(script)} ${args}`, { timeout: 60000, maxBuffer: 8 * 1024 * 1024 })
        const txt = stdout.slice(0, 16000)
        // Igual que Aliace: si son DATOS FINANCIEROS con varios componentes (stock
        // valorizado por marca, ventas/márgenes por mes), acompañar SIEMPRE con gráfico.
        // Empujamos a graficar en stock/ventas; el dato sigue abajo para el detalle.
        if (comando === 'stock' || comando === 'ventas') {
          const sug = comando === 'ventas'
            ? 'ventas o márgenes por mes (línea para tendencia) o por marca/modelo (barra para ranking)'
            : 'stock valorizado por marca (barra) o su distribución (torta)'
          return `⚠️ DATOS FINANCIEROS DE MALLORCA: si la respuesta tiene varios componentes (un desglose, un ranking o una tendencia), ` +
            `acompáñala SIEMPRE con un gráfico (tool graficar) — ej. ${sug}. Tras enviarlo, en el texto deja SOLO el titular/conclusión; ` +
            `los números van en el gráfico. (Para un solo número suelto NO grafiques.)\n\n${txt}`
        }
        return txt
      } catch (e) {
        return `No pude leer el Excel de Mallorca: ${e.message}`
      }
    }
    if (nombre === 'enviar_fotos_autos') {
      const target = destinoValido(ctx.de)
      // En web no hace falta destino de WhatsApp (se responde en la app, no se envía).
      if (!ctx.web && !target) return 'No pude identificar a quién enviarle las fotos (número no reconocido). Responde en texto con consultar_goautos en vez de enviar fotos.'
      const cmd = String(input.comando || 'publicaciones').replace(/[^a-z-]/g, '')
      const comando = ['publicaciones', 'publicados', 'vehiculos', 'vendidos', 'por-estado', 'buscar'].includes(cmd) ? cmd : 'publicaciones'
      const limite = Math.min(Math.max(Number(input.limite) || 6, 1), 15)  // con QoS alta cada envío ~9s
      let args = `${comando} --limite ${limite}`
      if (comando === 'por-estado' && input.estado) args += ` --estado ${JSON.stringify(String(input.estado))}`
      if (comando === 'buscar' && input.texto) args += ` --texto ${JSON.stringify(String(input.texto))}`
      const script = join(__dirname, '..', 'conector-goautos', 'goautos.mjs')
      let data
      try {
        const { stdout } = await ejecCmd(`node ${JSON.stringify(script)} ${args}`, { timeout: 30000, maxBuffer: 8 * 1024 * 1024 })
        data = JSON.parse(stdout)
      } catch (e) {
        return `No pude leer GoAutos para enviar las fotos: ${e.message}`
      }
      const autos = (Array.isArray(data.vehiculos) ? data.vehiculos : []).slice(0, limite)
      if (!autos.length) return 'No encontré autos para enviar.'
      // CANAL WEB: NO se empuja nada a WhatsApp. Se ABRE una "ventana" en la propia app
      // con la ficha + foto de cada auto (tarjetas que el front renderiza como galería).
      if (ctx.web) {
        const total = Number(data.total || autos.length)
        if (Array.isArray(ctx.tarjetas)) {
          for (const v of autos) {
            const specs = [v.km != null ? `${Number(v.km).toLocaleString('es-CL')} km` : null, v.transmision, v.combustible, v.traccion].filter(Boolean).join(' · ')
            const extra = [v.color ? `🎨 ${v.color}` : null, v.duenos != null ? `${v.duenos} dueño${v.duenos === 1 ? '' : 's'}` : null, v.patente ? `🪪 ${v.patente}` : null].filter(Boolean).join(' · ')
            ctx.tarjetas.push({
              tipo: 'auto', foto: v.foto || '',
              titulo: [v.marca, v.modelo, v.anio, v.version].filter(Boolean).join(' '),
              precio: v.precio_venta != null ? `Vendido · ${fmtPrecio(v.precio_venta)}` : fmtPrecio(v.precio),
              specs, extra, estado: v.estado || '',
            })
          }
        }
        return `CANAL WEB: se ABRIÓ una ventana en la app con la ficha + FOTO de ${autos.length} auto(s) (de ${total} en total). `
          + `Responde SOLO una frase corta tipo "Aquí tienes ${autos.length} autos 👇" — NO los listes en texto (ya se ven en la ventana con sus fotos).`
      }
      // Tarjetas (foto + ficha) listas para mandar.
      const tarjetas = autos.map((v) => {
        const l1 = `🚗 ${[v.marca, v.modelo, v.anio, v.version].filter(Boolean).join(' ')}`
        const l2 = `💰 ${fmtPrecio(v.precio)}`
        const specs = [
          v.km != null ? `${Number(v.km).toLocaleString('es-CL')} km` : null,
          v.transmision, v.combustible, v.traccion,
        ].filter(Boolean).join(' · ')
        const extra = [
          v.color ? `🎨 ${v.color}` : null,
          v.duenos != null ? `${v.duenos} dueño${v.duenos === 1 ? '' : 's'}` : null,
          v.patente ? `🪪 ${v.patente}` : null,
        ].filter(Boolean).join(' · ')
        // Estado / venta: si está vendido, el precio y fecha de venta; si no, el estado.
        const estadoLine = v.precio_venta != null
          ? `✅ Vendido en ${fmtPrecio(v.precio_venta)}${v.fecha_venta ? ' · ' + new Date(v.fecha_venta).toLocaleDateString('es-CL') : ''}`
          : (v.estado ? `🏷️ ${v.estado}` : null)
        const cap = [l1, l2, specs ? `📍 ${specs}` : null, extra || null, estadoLine].filter(Boolean).join('\n')
        return { foto: v.foto || '', cap }
      })
      // ENVÍO EN SEGUNDO PLANO, SECUENCIAL (no se await): no bloquea la respuesta.
      // OJO: el CLI de OpenClaw es pesado (~1-2 min por foto) y EN PARALELO ambos
      // procesos se ahogan y superan el timeout → de a uno es lo único confiable.
      ;(async () => {
        const flog = (m) => { try { appendFileSync('/tmp/nexus-fotos.log', `[${new Date().toISOString()}] ${m}\n`) } catch { /* */ } }
        flog(`START enviar ${tarjetas.length} fotos a ${target}`)
        let ok = 0, err = 0
        for (const t of tarjetas) {
          try { await enviarMediaWhatsApp(target, t.foto, t.cap); ok++; flog(`OK ${t.cap.split('\n')[0]}`) }
          catch (e) { err++; flog(`FALLO ${t.cap.split('\n')[0]}: ${String(e.message).slice(0, 200)}`) }
        }
        flog(`FIN ok=${ok} err=${err}`)
      })()
      const total = Number(data.total || autos.length)
      return `Disparé el envío de ${tarjetas.length} auto(s) con foto + ficha al WhatsApp del usuario (de ${total} disponibles); llegan de a uno (~1-2 min c/u). ` +
        `Responde SOLO una frase corta tipo "Te mando ${tarjetas.length} autos disponibles 👇 ya te llegan las fichas con foto"; NO listes los autos en texto.`
    }
    // ── GoAutos ampliado (GAIA portada): leads, citas, financiamiento, documentos,
    //    marketing, equipo, gastos fijos, config, tasación + acciones. Todo por gaia.mjs.
    {
      const GAIA_TOOLS = {
        leads_goautos: { cmd: 'leads', flags: ['estado', 'tipo', 'categoria', 'nombre', 'desde', 'hasta', 'limite'] },
        citas_goautos: { cmd: 'citas', flags: ['estado', 'desde', 'hasta', 'nombre', 'limite'] },
        financiamiento_goautos: { cmd: 'financiamiento', flags: ['customer_id', 'vehicle_id', 'limite'], bools: ['pagos'] },
        documentos_goautos: { cmd: 'documentos', flags: ['tipo', 'vehicle_id', 'limite'] },
        marketing_goautos: { cmd: 'marketing', flags: ['plataforma', 'limite'] },
        equipo_goautos: { cmd: 'equipo', flags: ['limite'], bools: ['comisiones'] },
        gastos_fijos_goautos: { cmd: 'gastos-fijos', flags: ['limite'], bools: ['todos'] },
        config_goautos: { cmd: 'config', flags: ['entidad', 'limite'] },
        tasar_auto: { cmd: 'tasar', query: true },
        crear_tarea_goautos: { cmd: 'tarea', flags: ['titulo', 'descripcion', 'prioridad', 'vence', 'categoria', 'vehicle_id'], write: true },
        crear_cotizacion_goautos: { cmd: 'cotizacion', flags: ['vehicle_id', 'customer_id', 'precio', 'validez', 'notas'], write: true },
        crear_reserva_goautos: { cmd: 'reserva', flags: ['vehicle_id', 'customer_id', 'precio', 'validez', 'notas'], write: true },
        lead_estado_goautos: { cmd: 'lead-estado', flags: ['id', 'estado'], write: true },
      }
      const spec = GAIA_TOOLS[nombre]
      if (spec) {
        const partes = [spec.cmd]
        if (spec.query) partes.push(JSON.stringify(String(input.query || '')))
        else for (const f of spec.flags || []) {
          if (input[f] === undefined || input[f] === null || input[f] === '') continue
          partes.push(`--${f} ${JSON.stringify(String(input[f]))}`)
        }
        for (const b of spec.bools || []) if (input[b] === true) partes.push(`--${b}`)
        // ESCRITURAS: si el modelo pide simular (simular=true), agrega --dry (previsualiza sin escribir).
        if (spec.write && input.simular === true) partes.push('--dry')
        const script = join(__dirname, '..', 'conector-goautos', 'gaia.mjs')
        try {
          const { stdout } = await ejecCmd(`node ${JSON.stringify(script)} ${partes.join(' ')}`, { timeout: 60000, maxBuffer: 4 * 1024 * 1024 })
          return stdout.slice(0, 16000)
        } catch (e) { return `No pude ejecutar ${nombre}: ${e.message}` }
      }
    }
    if (nombre === 'correo') {
      // Lee los correos de Nico por el conector Néstor (solo lectura, REST service_role).
      const acc = String(input.accion || 'resumen').replace(/[^a-z]/g, '')
      const accion = ['resumen', 'buscar', 'leer', 'reuniones', 'estado'].includes(acc) ? acc : 'resumen'
      let args = accion
      if (input.texto) args += ` --texto ${JSON.stringify(String(input.texto))}`
      if (input.remitente) args += ` --remitente ${JSON.stringify(String(input.remitente))}`
      if (input.empresa) args += ` --empresa ${JSON.stringify(String(input.empresa))}`
      if (input.id) args += ` --id ${JSON.stringify(String(input.id))}`
      if (input.dias) args += ` --dias ${Number(input.dias)}`
      if (input.limite) args += ` --limite ${Number(input.limite)}`
      const script = join(__dirname, '..', 'conector-correo', 'correo.mjs')
      try {
        const { stdout } = await ejecCmd(`node ${JSON.stringify(script)} ${args}`, { timeout: 30000, maxBuffer: 4 * 1024 * 1024 })
        return stdout.slice(0, 16000)
      } catch (e) {
        return `No pude leer los correos: ${e.message}`
      }
    }
    if (nombre === 'sii') {
      // Backend SII: el de Render (producción, empresas en Supabase) si hay token
      // configurado (SII_API_TOKEN); si no, cae al backend local para no romper SII.
      // Configurable con SII_BACKEND_URL / SII_API_TOKEN en ~/nexus/.env.
      let base, token
      if (process.env.SII_API_TOKEN) {
        base = (process.env.SII_BACKEND_URL || 'https://nj-bc-sii.onrender.com').replace(/\/$/, '')
        token = process.env.SII_API_TOKEN
      } else {
        base = 'http://127.0.0.1:8000'
        try { token = (readFileSync(join(__dirname, '..', 'sii-web', '.env'), 'utf8').match(/^API_TOKEN=(.+)$/m) || [])[1] || '' } catch { token = '' }
      }
      const H = { 'X-API-Token': token, 'Content-Type': 'application/json' }
      try {
        if (input.accion === 'estado') {
          const empresas = await (await fetch(`${base}/api/empresas`, { headers: H })).json()
          const tipos = await (await fetch(`${base}/api/tipos-documento`, { headers: H })).json()
          return JSON.stringify({ empresas, tipos_descargables: tipos })
        }
        if (input.accion === 'descargar') {
          if (!input.empresa_id) return 'Falta empresa_id (consíguelo con accion:estado).'
          const body = { desde: input.desde, hasta: input.hasta || input.desde, docs: input.docs || [] }
          const r = await fetch(`${base}/api/empresas/${input.empresa_id}/descargar`, { method: 'POST', headers: H, body: JSON.stringify(body) })
          return JSON.stringify(await r.json())
        }
        if (input.accion === 'job') {
          const r = await fetch(`${base}/api/jobs/${encodeURIComponent(input.job_id)}`, { headers: H })
          return JSON.stringify(await r.json())
        }
        if (input.accion === 'documentos') {
          const r = await fetch(`${base}/api/empresas/${input.empresa_id}/documentos`, { headers: H })
          return JSON.stringify(await r.json())
        }
        if (input.accion === 'enviar') {
          // Manda el ARCHIVO real (PDF/Excel) al WhatsApp del que pregunta.
          // Los documentos viven en el backend (Render = efímeros), así que se
          // DESCARGAN del backend a un temporal local y de ahí van por WhatsApp.
          if (!ctx.de) return 'No puedo identificar a quién enviarle el archivo.'
          if (!input.empresa_id || !input.ruta) return 'Falta empresa_id o ruta (sale en accion:documentos).'
          try {
            const url = `${base}/api/empresas/${input.empresa_id}/archivo?ruta=${encodeURIComponent(String(input.ruta))}&token=${encodeURIComponent(token)}`
            const r = await fetch(url, { headers: H })
            if (!r.ok) return `No encontré el archivo ${input.ruta} en el backend (HTTP ${r.status}). Lista con accion:documentos.`
            const buf = Buffer.from(await r.arrayBuffer())
            const nombre = String(input.ruta).split('/').pop() || 'documento'
            const tmp = `/tmp/nexus-sii-${Date.now()}-${nombre}`
            writeFileSync(tmp, buf)
            await enviarMediaWhatsApp(ctx.de, tmp, input.titulo || '')
            return JSON.stringify({ ok: true, enviado: input.ruta, nota: 'Documento enviado al WhatsApp del usuario.' })
          } catch (e) { return `No pude enviar el archivo: ${e.message}` }
        }
        if (input.accion === 'emitir') {
          const empresaId = input.empresa_id || 3 // ANA CLARA SPA
          const body = {
            tipo_dte: input.tipo_dte || 33,
            receptor: (input.receptor && typeof input.receptor === 'object') ? input.receptor : {},
            items: Array.isArray(input.items) ? input.items : [],
            forma_pago: input.forma_pago || 'contado',
            fecha: input.fecha || null,
            observaciones: input.observaciones || '',
            confirmar: false, // el borrador SIEMPRE se calcula; el robot corre aparte
          }
          let r
          try {
            r = await (await fetch(`${base}/api/empresas/${empresaId}/emitir`, { method: 'POST', headers: H, body: JSON.stringify(body) })).json()
          } catch (e) { return `No pude contactar el sistema de emisión: ${e.message}` }
          if (r.modo === 'error_datos') return JSON.stringify({ ok: false, faltan_datos: r.mensaje, nota: 'Pídele al usuario ESE dato y no emitas hasta tenerlo.' })
          const b = r.borrador || {}, t = b.totales || {}
          const clp = (n) => '$' + Number(n || 0).toLocaleString('es-CL')
          const rec = b.receptor || {}
          const lineas = (b.items || []).map(it => `  • ${it.nombre} — ${it.cantidad} × ${clp(it.precio)} = ${clp(it.monto)}${it.exento ? ' (exento)' : ''}${it.detalle ? '\n    ' + it.detalle : ''}`).join('\n')
          const preview = [
            `🧾 *${b.tipo_nombre || 'Documento'}* — BORRADOR (aún NO emitida)`,
            `Emisor: ${b.emisor?.nombre} (${b.emisor?.rut})`,
            `Receptor: ${rec.nombre || 'consumidor final'}${rec.rut ? ' · ' + rec.rut : ''}${rec.giro ? ' · ' + rec.giro : ''}${rec.direccion ? '\n  ' + rec.direccion + (rec.comuna ? ', ' + rec.comuna : '') : ''}`,
            `Fecha: ${b.fecha} · Pago: ${b.forma_pago}`,
            `Detalle:\n${lineas}`,
            b.tipo_dte === 33 ? `Neto: ${clp(t.neto)}\nIVA 19%: ${clp(t.iva)}${t.exento ? '\nExento: ' + clp(t.exento) : ''}\n*Total: ${clp(t.total)}*`
                              : `*Total: ${clp(t.total)}*${t.exento ? ' (exento)' : ''}`,
            b.observaciones ? `Obs: ${b.observaciones}` : '',
          ].filter(Boolean).join('\n')
          const robot = await import('../conector-sii/factura-navegador.mjs')
          const empresaRut = (r.borrador?.emisor?.rut) || '77271121-2'

          // Paso 3 (emitir_real): FIRMAR y EMITIR de verdad. IRREVERSIBLE. Requiere que
          // el borrador ya se haya generado (el navegador queda en la vista previa) y una
          // 2ª confirmación explícita del usuario. firmarYEmitir tiene freno propio.
          if (input.emitir_real === true) {
            try {
              const em = await robot.firmarYEmitir({ CONFIRMO_EMITIR: 'SI_EMITIR_DE_VERDAD', apiToken: token })
              if (em.bloqueado) return JSON.stringify({ ok: false, modo: 'emision_bloqueada', motivo: em.motivo, instruccion: 'La emisión real está deshabilitada por seguridad. Dile al usuario que la factura NO se emitió y que Ramón debe habilitarla.' })
              if (!em.ok) return JSON.stringify({ ok: false, error: em.error, detalle: em.detalle, instruccion: 'NO se emitió. Si dice que el borrador expiró, vuelve a llamar emitir con confirmado=true (regenera el borrador) y firma enseguida. Dile el error tal cual; NUNCA afirmes que se emitió.' })
              if (ctx.de && em.pdf) { try { await enviarMediaWhatsApp(ctx.de, em.pdf, `✅ *Factura N° ${em.folio || ''} EMITIDA* en el SII.`, { forceDocument: true }) } catch { /* best-effort */ } }
              return JSON.stringify({ ok: true, modo: 'emitida', folio: em.folio, instruccion: `La factura QUEDÓ EMITIDA en el SII con el FOLIO N° ${em.folio || '(no leído)'} y te mandé el PDF oficial. Confírmaselo al usuario en una frase corta, diciendo el número de folio.` })
            } catch (e) { return `La firma/emisión falló: ${e.message}. NO afirmes que se emitió.` }
          }

          // Paso 1 (sin confirmado): mostrar el borrador de TEXTO y pedir OK.
          if (input.confirmado !== true) {
            return JSON.stringify({
              ok: true, modo: 'borrador', borrador_texto: preview,
              instruccion: 'MUÉSTRALE este borrador TAL CUAL al usuario y pídele el OK ("¿te genero el borrador en el SII?"). Cuando confirme, vuelve a llamar emitir con confirmado=true (eso NO emite: arma el borrador oficial y se lo manda en imagen).',
              listo_para_emitir: r.listo_para_emitir,
            })
          }
          // Paso 2 (confirmado): ROBOT genera el borrador oficial en el SII y lo manda en
          // imagen. Deja el navegador en la VISTA PREVIA, listo para firmar si se confirma.
          try {
            const out = await robot.generarBorrador({ borrador: r.borrador, empresaRut, apiToken: token })
            if (!out.ok) return JSON.stringify({ ok: false, error: out.error, borrador_texto: preview, instruccion: 'El robot no pudo armar el borrador en el SII. Dile el error al usuario tal cual, sin decir que se emitió.' })
            if (ctx.de) { try { await enviarMediaWhatsApp(ctx.de, out.captura, '🧾 Borrador de la factura en el SII — revísalo. AÚN NO se ha emitido.') } catch { /* best-effort */ } }
            return JSON.stringify({
              ok: true, modo: 'borrador_sii_enviado', total: (r.borrador?.totales?.total),
              instruccion: 'Le MANDÉ la imagen del borrador OFICIAL del SII. Dile que lo revise. Si quiere EMITIRLA de verdad, ADVIÉRTELE que es IRREVERSIBLE (consume folio y le llega al cliente) y pídele una 2ª confirmación EXPLÍCITA ("¿la firmo y emito de verdad?"). Solo cuando diga que SÍ claramente, vuelve a llamar emitir con emitir_real=true (con los MISMOS datos). NO pongas emitir_real=true sin esa 2ª confirmación.',
            })
          } catch (e) { return `El robot de facturación falló: ${e.message}` }
        }
        return 'Acción SII desconocida (usa: estado | descargar | job | documentos | enviar | emitir).'
      } catch (e) { return `Error con el sistema SII (Martes): ${e.message}` }
    }
    if (nombre === 'banco') {
      try {
        const b = await import('../conector-banco/banco.mjs')
        const opts = { rut: input.rut, banco: input.banco, anio: input.anio, buscar: input.buscar,
                       desde: input.desde, hasta: input.hasta, limite: input.limite }
        let r
        if (input.accion === 'empresas') r = await b.empresas()
        else if (input.accion === 'saldos') r = await b.saldos(opts)
        else if (input.accion === 'movimientos') r = await b.movimientos(opts)
        else if (input.accion === 'resumen') r = await b.resumen(opts)
        else if (input.accion === 'conexiones') r = { conexiones: await b.links() }
        else return 'Acción de banco desconocida (usa: empresas | saldos | movimientos | resumen | conexiones).'
        if (r?.error) return JSON.stringify({ ok: false, error: r.error })
        return JSON.stringify(r).slice(0, MAX_TOOL_CHARS)
      } catch (e) { return `Error consultando el banco (Leo): ${e.message}` }
    }
    if (nombre === 'aliace_rpc') {
      const fn = String(input.funcion || '').replace(/[^a-zA-Z0-9_]/g, '')
      if (!fn) return 'Falta "funcion" (nombre del RPC). Ver catálogo en la descripción de aliace_rpc.'
      const params = (input.params && typeof input.params === 'object' && !Array.isArray(input.params)) ? input.params : {}
      try {
        const r = await aliaceFetch('/rpc/' + fn, { method: 'POST', body: JSON.stringify(params) })
        const data = await r.json().catch(() => null)
        if (!r.ok) return JSON.stringify({ error: 'el RPC falló', funcion: fn, detalle: data, pista: 'Revisa el nombre/params del catálogo, o usa aliace_sql.' })
        return JSON.stringify({ funcion: fn, params, resultado: data })
      } catch (e) { return `No pude consultar Aliace (rpc ${fn}): ${e.message}` }
    }
    if (nombre === 'aliace_sql') {
      const q = String(input.consulta || '').trim()
      if (!q) return 'Falta "consulta" (un SELECT).'
      if (!/^\s*(select|with)\b/i.test(q)) return 'Solo se permiten consultas SELECT/CTE (de solo lectura) en aliace_sql.'
      try {
        const r = await aliaceFetch('/rpc/lia_run_readonly_query', { method: 'POST', body: JSON.stringify({ query_text: q }) })
        const data = await r.json().catch(() => null)
        if (!r.ok) return JSON.stringify({ error: 'consulta inválida', detalle: data, pista: 'Revisa la sintaxis SQL. Solo SELECT. Acota con WHERE/LIMIT.' })
        return JSON.stringify({ filas: data })
      } catch (e) { return `No pude consultar Aliace (sql): ${e.message}` }
    }
    if (nombre === 'aliace_resumen') {
      try {
        const fecha = typeof input.fecha === 'string' ? input.fecha : ''
        const key = 'resumen:' + (fecha || 'actual')
        let r = _finGet(key)
        if (!r) { r = await aliaceResumenMes(fecha); _finSet(key, r) }
        await autoGraficarResumen(r, ctx)   // gráficos AUTOMÁTICOS (web: ventana · WhatsApp: envía)
        return JSON.stringify(r)
      } catch (e) { return `No pude armar el resumen de Aliace: ${e.message}` }
    }
    if (nombre === 'aliace_margen') {
      try {
        const fecha = typeof input.fecha === 'string' ? input.fecha : ''
        const id = typeof input.id === 'string' ? input.id : ''
        const key = 'margen:' + (id || fecha || 'actual')
        let m = _finGet(key)
        if (!m) { m = await aliaceMargen({ fecha, id }); _finSet(key, m) }
        return JSON.stringify(m)
      } catch (e) { return `No pude calcular el margen de Aliace: ${e.message}` }
    }
    if (nombre === 'aliace_anual') {
      try {
        const anio = Number.isFinite(Number(input.anio)) && input.anio !== '' && input.anio != null ? Math.trunc(Number(input.anio)) : undefined
        return JSON.stringify(await aliaceResumenAnual(anio))
      } catch (e) { return `No pude armar el resumen anual de Aliace: ${e.message}` }
    }
    if (nombre === 'aliace_mover_nv') {
      try {
        const out = await aliaceMoverNV(
          { id: input.id, nuevo_estado: input.nuevo_estado, motivo: input.motivo },
          input.confirmado !== true,   // sin confirmado=true → SIMULA (no escribe)
        )
        return JSON.stringify(out)
      } catch (e) { return `No pude mover la NV: ${e.message}` }
    }
    if (nombre === 'aliace_pago') {
      try {
        const out = await aliaceRegistrarPago(
          { id: input.id, monto: input.monto, metodo: input.metodo, referencia: input.referencia, verificar: input.verificar === true },
          input.confirmado !== true,   // sin confirmado=true → SIMULA (no escribe)
        )
        return JSON.stringify(out)
      } catch (e) { return `No pude registrar el pago: ${e.message}` }
    }
    if (nombre === 'aliace_editar_nv') {
      try {
        const out = await aliaceEditarNV(
          { id: input.id, campos: input.campos },
          input.confirmado !== true,
        )
        return JSON.stringify(out)
      } catch (e) { return `No pude editar la NV: ${e.message}` }
    }
    if (nombre === 'aliace_crear_nv') {
      try {
        const out = await aliaceCrearNV(
          { client_id: input.client_id, items: input.items, status: input.status, comentarios: input.comentarios, payment_terms: input.payment_terms },
          input.confirmado !== true,
        )
        return JSON.stringify(out)
      } catch (e) { return `No pude crear la NV: ${e.message}` }
    }
    if (nombre === 'graficar') {
      const tipo = ['barra', 'linea', 'torta'].includes(input.tipo) ? input.tipo : 'barra'
      const etiquetas = Array.isArray(input.etiquetas) ? input.etiquetas.map(String) : []
      const valores = Array.isArray(input.valores) ? input.valores.map(Number).filter((n) => Number.isFinite(n)) : []
      if (etiquetas.length < 2 || etiquetas.length !== valores.length) {
        return 'graficar necesita "etiquetas" y "valores" del mismo largo (al menos 2). Revisa los datos.'
      }
      // CANAL DESKTOP/WEB: NO se manda por WhatsApp; se DEVUELVE para mostrarlo en la app.
      if (ctx.web) {
        if (Array.isArray(ctx.graficos)) ctx.graficos.push({ tipo, titulo: String(input.titulo || ''), subtitulo: String(input.subtitulo || ''), etiquetas, valores })
        return JSON.stringify({ ok: true, mostrado: 'grafico', tipo, nota: 'Gráfico MOSTRADO en la pantalla del usuario (en la app). En tu respuesta de texto deja el titular/conclusión PERO SIEMPRE con la(s) cifra(s) PRINCIPAL(es) en pesos que responden la pregunta (ej. facturación total, margen bruto + margen %, deuda vencida). NO botes la cifra clave ni respondas solo "ahí va el gráfico" o solo un comentario; solo evita repetir el DESGLOSE completo y las tablas (eso sí va en el gráfico). EXCEPCIÓN: si en este turno un tool te dio un "reporte_texto" (informe ya armado, ej. aliace_resumen), ENVÍA ESE INFORME COMPLETO igual — el gráfico va ADEMÁS, NO lo reemplaza.' })
      }
      const target = destinoValido(ctx.de)
      if (!target) return 'No pude identificar a quién enviarle el gráfico (número no reconocido). Responde en texto.'
      const archivo = `/tmp/nexus-grafico-${Date.now()}.png`
      const fjson = archivo + '.json'
      const spec = { tipo, titulo: String(input.titulo || ''), subtitulo: String(input.subtitulo || ''), etiquetas, valores, archivo }
      try {
        writeFileSync(fjson, JSON.stringify(spec))
        const script = join(__dirname, 'graficar.py')
        await ejecCmd(`python3 ${JSON.stringify(script)} ${JSON.stringify(fjson)}`, { timeout: 30000 })
        if (!existsSync(archivo)) return 'No se pudo generar el gráfico (sin archivo de salida).'
        // Envío en segundo plano (el CLI de WhatsApp tarda ~40-80s); no bloquea la respuesta.
        const glog = (m) => { try { appendFileSync('/tmp/nexus-fotos.log', `[${new Date().toISOString()}] ${m}\n`) } catch { /* */ } }
        enviarMediaWhatsApp(target, archivo, String(input.titulo || ''))
          .then(() => glog(`OK grafico ${tipo} -> ${target}`))
          .catch((e) => glog(`FALLO grafico: ${String(e.message).slice(0, 150)}`))
        return JSON.stringify({ ok: true, enviado: 'grafico', tipo, nota: 'Gráfico enviado al WhatsApp del usuario (llega en ~1 min). En tu respuesta de texto deja el titular/conclusión PERO SIEMPRE con la(s) cifra(s) PRINCIPAL(es) en pesos que responden la pregunta (ej. facturación total, margen bruto + margen %, deuda vencida). NO botes la cifra clave ni respondas solo "ahí va el gráfico" o solo un comentario; solo evita repetir el DESGLOSE completo y las tablas (eso sí va en el gráfico). EXCEPCIÓN: si en este turno un tool te dio un "reporte_texto" (informe ya armado, ej. aliace_resumen), ENVÍA ESE INFORME COMPLETO igual — el gráfico va ADEMÁS, NO lo reemplaza.' })
      } catch (e) { return `No pude generar el gráfico: ${e.message}` }
    }
    if (nombre === 'enviar_audio') {
      const texto = String(input.texto || '').trim()
      if (!texto) return 'Falta el texto del audio.'
      // CANAL WEB/DESKTOP: la app ya tiene su propia voz (streaming TTS); no mandamos audio por WhatsApp.
      if (ctx.web) return JSON.stringify({ ok: true, nota: 'En la app la voz ya se reproduce sola; responde en texto normal.' })
      const target = destinoValido(ctx.de)
      if (!target) return 'No pude identificar a quién enviarle el audio (número no reconocido). Responde en texto.'
      const glog = (m) => { try { appendFileSync('/tmp/nexus-fotos.log', `[${new Date().toISOString()}] ${m}\n`) } catch { /* */ } }
      // Envío en segundo plano (sintetizar + convertir + subir tarda unos segundos); no bloquea la respuesta.
      enviarAudioWhatsApp(target, texto)
        .then((id) => glog(`OK audio -> ${target} (${id})`))
        .catch((e) => glog(`FALLO audio: ${String(e.message).slice(0, 200)}`))
      return JSON.stringify({ ok: true, enviado: 'audio', nota: 'Nota de voz enviada al WhatsApp del usuario (llega en unos segundos). En tu respuesta de texto deja solo una línea corta o nada; no repitas el contenido del audio.' })
    }
    if (nombre === 'agregar_usuario') {
      const nombreU = String(input.nombre || '').trim()
      const numero = normNum(input.numero)
      const accesos = Array.isArray(input.accesos) ? [...new Set(input.accesos.filter((s) => SCOPES.includes(s)))] : []
      if (!nombreU) return 'Falta el NOMBRE del usuario.'
      if (!numero || numero.replace(/\D/g, '').length < 10) return `Número inválido: "${input.numero}". Pásalo con +56, ej +56912345678.`
      if (FUNDADORES[numero]) return `Ese número es de un fundador (${FUNDADORES[numero].nombre}): ya tiene acceso total.`
      const yaExistia = Boolean(cargarUsuarios()[numero])
      const hoy = new Date().toLocaleDateString('es-CL', { timeZone: 'America/Santiago' })
      guardarUsuarioStore(numero, { nombre: nombreU, accesos, creado: hoy, creado_por: usuarioDe(ctx.de)?.nombre || 'admin' })
      const okOC = permitirEnOpenclaw(numero)   // escribe el número en el allowlist de OpenClaw
      const bienvenida = mensajeBienvenida(nombreU, accesos)
      // Intento directo: si OpenClaw ya tiene el número en memoria (p.ej. re-alta de
      // alguien ya habilitado), la bienvenida sale al toque y no hace falta recargar.
      let enviado = false
      try { await enviarMediaWhatsApp(numero, null, bienvenida); enviado = true } catch { enviado = false }
      // Si falló (allowlist cacheado), recargo OpenClaw y reenvío la bienvenida en
      // SEGUNDO PLANO (no corta esta respuesta al fundador).
      if (!enviado) await programarRecargaOpenclaw(numero, bienvenida)
      const accTxt = accesos.length ? accesos.join(', ') : 'ninguno aún'
      return JSON.stringify({
        ok: true,
        accion: yaExistia ? 'usuario actualizado' : 'usuario creado',
        usuario: nombreU, numero, accesos: accTxt, whatsapp_habilitado: okOC,
        nota: `${yaExistia ? 'Actualicé a' : 'Di de alta a'} ${nombreU} (${numero}) con acceso a: ${accTxt}. `
          + (enviado
            ? 'Ya le mandé el WhatsApp de bienvenida ✅.'
            : 'En ~1 minuto OpenClaw se recarga solo para activar su número y le llega la bienvenida automáticamente — no tienes que hacer nada.')
          + (okOC ? '' : ' ⚠️ No pude actualizar el allowlist de OpenClaw; revísalo.'),
      })
    }
    if (nombre === 'listar_usuarios') {
      const todos = cargarUsuarios()
      const filas = Object.entries(todos).map(([num, u]) => ({
        nombre: u.nombre, numero: num, admin: Boolean(u.admin),
        accesos: u.admin ? 'TODO (admin/fundador)' : (u.accesos.length ? u.accesos.join(', ') : 'sin accesos'),
      }))
      return JSON.stringify({ total: filas.length, usuarios: filas }, null, 2)
    }
    if (nombre === 'quitar_usuario') {
      const numero = normNum(input.numero)
      if (!numero) return `Número inválido: "${input.numero}".`
      if (FUNDADORES[numero]) return `No puedo dar de baja a un fundador (${FUNDADORES[numero].nombre}).`
      const habia = quitarUsuarioStore(numero)
      revocarEnOpenclaw(numero)
      if (habia) await programarRecargaOpenclaw(numero, '')   // recarga OpenClaw para que la baja tome efecto
      return habia ? `✅ Di de baja al usuario ${numero}: ya no tiene acceso a Nexus (OpenClaw se recarga solo en ~1 min para cortarle el WhatsApp).` : `No encontré ningún usuario con el número ${numero}.`
    }
    if (nombre === 'programar_mensaje') {
      try {
        const reg = recordatorios.programar({
          canal: input.canal || 'whatsapp', mensaje: input.mensaje, asunto: input.asunto,
          // Sin destino explícito: para correo hay que indicarlo; para los demás
          // canales va a QUIEN pide (ctx.de), no a un número fijo.
          destino: input.destino || ((input.canal || 'whatsapp') === 'correo' ? undefined : ctx.de),
          en_minutos: input.en_minutos, cuando: input.cuando,
          repeticiones: input.repeticiones, intervalo_min: input.intervalo_min,
          creado_por: usuarioDe(ctx.de)?.nombre || ctx.de || 'chat',
        })
        const enLocal = new Date(reg.cuando).toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' })
        const rep = reg.repeticiones > 1 ? ` y se repite ${reg.repeticiones} veces cada ${reg.intervalo_min} min` : ''
        return JSON.stringify({
          ok: true, id: reg.id, canal: reg.canal, destino: reg.destino, cuando: enLocal, repeticiones: reg.repeticiones,
          nota: `Programado ✅ Enviaré por ${reg.canal} a ${reg.destino} el ${enLocal} (Chile)${rep}. Confirma corto al usuario (canal, destino, hora${rep ? ' y repeticiones' : ''}); id ${reg.id} por si quiere cancelarlo.`,
        })
      } catch (e) { return `No pude programarlo: ${e.message}` }
    }
    if (nombre === 'enviar_mensaje') {
      // Envío INMEDIATO (no programado) por whatsapp/correo/llamada.
      try {
        const reg = await recordatorios.enviarAhora({
          canal: input.canal || 'whatsapp', mensaje: input.mensaje, asunto: input.asunto,
          destino: input.destino || ((input.canal || 'whatsapp') === 'correo' ? undefined : ctx.de),
          creado_por: usuarioDe(ctx.de)?.nombre || ctx.de || 'chat',
        })
        return JSON.stringify({ ok: true, id: reg.id, canal: reg.canal, destino: reg.destino, nota: `Enviado ✅ por ${reg.canal} a ${reg.destino}. Confírmaselo corto al usuario.` })
      } catch (e) { return `No pude enviar el mensaje: ${e.message}` }
    }
    if (nombre === 'listar_recordatorios') {
      const a = recordatorios.listar({ soloPendientes: Boolean(input.solo_pendientes) })
      if (!a.length) return JSON.stringify({ total: 0, recordatorios: [], nota: 'No hay mensajes programados.' })
      const filas = a.slice(-20).map((r) => ({
        id: r.id, canal: r.canal, destino: r.destino, estado: r.estado,
        cuando: new Date(r.cuando).toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' }),
        mensaje: String(r.mensaje).slice(0, 80),
      }))
      return JSON.stringify({ total: filas.length, recordatorios: filas })
    }
    if (nombre === 'cancelar_recordatorio') {
      const ok = recordatorios.cancelar(String(input.id || ''))
      return ok ? `✅ Cancelé el recordatorio ${input.id}.` : `No encontré un recordatorio pendiente con id ${input.id}.`
    }
    return `Herramienta desconocida: ${nombre}`
  } catch (e) {
    return `Error ejecutando ${nombre}: ${e.message}`
  }
}

// Tope de historial enviado al modelo. El cliente reenvía la conversación
// COMPLETA en cada turno; sin esto, sesiones largas (tablas/navegación de
// Aliace) crecen sin freno hasta superar el límite de contexto del modelo
// (error "prompt is too long"). ~200k chars ≈ ~65k tokens: de sobra para un
// chat y muy por debajo del millón. Conserva los mensajes MÁS recientes.
const MAX_HIST_CHARS = 24000   // ~7k tokens de historial reciente (antes 200k = ~57k tokens, carísimo por mensaje)

function acotarHistorial(mensajes) {
  let total = 0
  const recientes = []
  for (let i = mensajes.length - 1; i >= 0; i--) {
    let { role, content } = mensajes[i]
    // Un solo mensaje puede ser más grande que TODO el presupuesto (p.ej. una
    // tabla pegada). En ese caso lo truncamos en vez de dejarlo pasar entero.
    if (content.length > MAX_HIST_CHARS) {
      content = content.slice(0, MAX_HIST_CHARS) + '… [mensaje recortado]'
    }
    total += content.length
    if (total > MAX_HIST_CHARS && recientes.length > 0) break
    recientes.unshift({ role, content })
  }
  // La API exige que el primer mensaje sea del usuario.
  while (recientes.length > 1 && recientes[0].role !== 'user') recientes.shift()
  return recientes
}

// Topes de TAMAÑO (no solo de filas) para lo que cada herramienta mete al
// contexto. Tablas como "listings" o "reportes" tienen filas enormes: una sola
// consulta sin tope puede traer 600k–800k tokens y reventar el límite del
// modelo. Con estos topes, 8 vueltas del bucle no pueden superar ~250k tokens.
const MAX_BD_CHARS = 12000     // payload de consultar_bd (~3.4k tokens)
const MAX_TOOL_CHARS = 16000   // cualquier resultado de herramienta (~4.5k tokens)

// Recorta los valores de texto largos de UNA fila para que quepa en el tope.
function podarFila(fila) {
  if (!fila || typeof fila !== 'object') return fila
  const claves = Object.keys(fila)
  const lim = Math.max(200, Math.floor(MAX_BD_CHARS / Math.max(1, claves.length)))
  const o = {}
  for (const [k, v] of Object.entries(fila)) {
    o[k] = (typeof v === 'string' && v.length > lim) ? v.slice(0, lim) + '…' : v
  }
  return o
}

// Mete tantas filas como quepan en MAX_BD_CHARS (prioriza más datos dentro del
// presupuesto). Devuelve { filas, recortado }.
function acotarFilas(filas) {
  if (!Array.isArray(filas)) return { filas, recortado: false }
  const cabidas = []
  let size = 2
  for (const f of filas) {
    const s = JSON.stringify(f).length + 1
    if (size + s > MAX_BD_CHARS && cabidas.length > 0) break
    cabidas.push(f); size += s
  }
  let recortado = cabidas.length < filas.length
  // Si UNA sola fila ya se pasa del tope, podamos sus textos largos.
  if (cabidas.length === 1 && JSON.stringify(cabidas).length > MAX_BD_CHARS) {
    cabidas[0] = podarFila(cabidas[0]); recortado = true
  }
  return { filas: cabidas, recortado }
}

// Backstop ABSOLUTO contra "prompt is too long": antes de cada llamada, si el
// total acumulado supera el techo, acorta el contenido de los tool_result MÁS
// VIEJOS (no borra mensajes, así no rompe el emparejamiento tool_use/result).
const MAX_PROMPT_CHARS = 600000 // ~170k tokens, muy por debajo del millón

function backstopTamano(mensajes) {
  const tam = () => mensajes.reduce((n, m) => n + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0)
  if (tam() <= MAX_PROMPT_CHARS) return
  for (const m of mensajes) { // de más viejo a más nuevo
    if (tam() <= MAX_PROMPT_CHARS) break
    if (Array.isArray(m.content)) {
      for (const b of m.content) {
        if (b && b.type === 'tool_result' && typeof b.content === 'string' && b.content.length > 500) {
          b.content = b.content.slice(0, 500) + '… [recortado: dato viejo, vuelve a consultar si lo necesitas]'
        }
      }
    }
  }
}

// Anuncio de PERSONA según la herramienta usada (determinístico, no depende del modelo):
// Aliace=Ali, GoAutos=Meme, SII=Martes. Se antepone a la respuesta si esa fuente se usó.
const PERSONAS = [
  { linea: 'Me conecté a *Martes* y me dijo:', tools: ['sii', 'sii_boleta_honorarios'] },
  { linea: 'Le pregunté a *Néstor* y me dijo:', tools: ['correo', 'gmail_documentos'] },
  { linea: 'Me comuniqué con *Meme* y me dijo:', tools: ['consultar_goautos', 'editar_goautos', 'adquisicion_goautos', 'cliente_goautos', 'editar_venta_goautos', 'vender_goautos', 'gasto_goautos', 'subir_auto', 'consultar_mallorca', 'enviar_fotos_autos', 'leads_goautos', 'lead_estado_goautos', 'citas_goautos', 'financiamiento_goautos', 'documentos_goautos', 'marketing_goautos', 'equipo_goautos', 'gastos_fijos_goautos', 'config_goautos', 'tasar_auto', 'crear_tarea_goautos', 'crear_cotizacion_goautos', 'crear_reserva_goautos'] },
  { linea: 'Me conecté con *Ali* y me dijo:', tools: ['aliace_resumen', 'aliace_margen', 'aliace_rpc', 'aliace_sql', 'aliace_mover_nv', 'navegar', 'iniciar_sesion', 'leer_tabla', 'leer_pagina', 'clic', 'esperar', 'guia_aliace', 'escribir_en_campo', 'ver_pestanas', 'cambiar_pestana'] },
  { linea: 'Me comuniqué con *SAI* y me dijo:', tools: ['sai_conciliacion', 'sai_buscar_factura', 'sai_movimientos_banco', 'sai_mallorca_compras'] },
  { linea: 'Me comuniqué con *Leo* y me dijo:', tools: ['banco'] },
]
// Versión SOLO para la web del Centro de IAs (asistente de primer nivel, en primera
// persona, tono de "hecho, ya lo conseguí"). En WhatsApp se usa PERSONAS (arriba) sin tocar.
const PERSONAS_WEB = {
  Martes: ['Sí, señor. Entré al SII con *Martes* y traje esto:', 'Hecho. Consulté el SII con *Martes* y esto conseguí:'],
  'Néstor': ['Sí, señor. Revisé el correo con *Néstor* y esto hay:', 'Hecho. *Néstor* me pasó esto del correo:'],
  Meme: ['Sí, señor. Accedí a *Meme* y conseguí esto:', 'Hecho. Le pedí a *Meme* (Autos) y esto encontré:'],
  Ali: ['Sí, señor. Consulté a *Ali* y esto encontré:', 'Hecho. *Ali* (Finanzas) me entregó esto:'],
  SAI: ['Sí, señor. Revisé la conciliación con *SAI* y esto encontré:', 'Hecho. *SAI* (SII↔banco) me pasó esto:'],
  Leo: ['Sí, señor. Consulté los bancos con *Leo* y esto hay:', 'Hecho. *Leo* (Bancos) me pasó esto:'],
}
// Mapa herramienta → subagente (persona + área), para el "Centro de IAs".
// Deriva de PERSONAS y añade navegador/cerebro. Lo que no calce cae en "Nexus".
const AREA_POR_PERSONA = { Ali: 'aliace', Meme: 'goautos', Néstor: 'correo', Martes: 'sii', SAI: 'sai', Leo: 'banco', Navegador: 'navegador', Cerebro: 'cerebro', Nexus: 'nexus' }
const PERSONA_POR_TOOL = (() => {
  const m = {}
  const LINEA_A_PERSONA = { Martes: 'Martes', Néstor: 'Néstor', Meme: 'Meme', Ali: 'Ali', SAI: 'SAI', Leo: 'Leo' }
  for (const { linea, tools } of PERSONAS) {
    const nombre = Object.keys(LINEA_A_PERSONA).find((n) => linea.includes(n)) || 'Nexus'
    for (const t of tools) m[t] = nombre
  }
  // Navegación web / segundo cerebro: subagentes propios aunque compartan tools con Ali.
  for (const t of ['navegar', 'iniciar_sesion', 'leer_tabla', 'leer_pagina', 'clic', 'esperar', 'escribir_en_campo', 'ver_pestanas', 'cambiar_pestana']) m[t] = 'Navegador'
  for (const t of ['cerebro_buscar', 'cerebro_nota', 'buscar_cerebro', 'nota_cerebro', 'guardar_nota', 'plaud_estado', 'mi_dia']) m[t] = 'Cerebro'
  for (const t of ['sai_conciliacion', 'sai_buscar_factura', 'sai_movimientos_banco', 'sai_mallorca_compras']) m[t] = 'SAI'
  return m
})()
function personaDeTool(tool) {
  const persona = PERSONA_POR_TOOL[tool] || 'Nexus'
  return { persona, area: AREA_POR_PERSONA[persona] || 'nexus' }
}
// Resumen corto y SIN datos sensibles del input de una tool (para el panel).
function resumenInput(input) {
  try {
    if (!input || typeof input !== 'object') return null
    const campos = []
    for (const [k, v] of Object.entries(input)) {
      if (v == null || v === '') continue
      let val = typeof v === 'string' ? v : JSON.stringify(v)
      if (val.length > 40) val = val.slice(0, 40) + '…'
      campos.push(`${k}=${val}`)
      if (campos.length >= 4) break
    }
    return campos.join(' ') || null
  } catch { return null }
}
// Registra en historial.db la ejecución de una tool como actividad de su subagente.
// Nunca rompe el turno (best-effort).
function registrarActividadTool(tool, input, { de, web, ok, ms, detalle } = {}) {
  try {
    const { persona, area } = personaDeTool(tool)
    // Canal de origen: mini = chat del Mac mini/escritorio; whatsapp = número; sistema = automático.
    const canal = web ? 'mini' : (de ? 'whatsapp' : 'sistema')
    historial.registrarActividad({
      persona, area, herramienta: tool,
      usuario: (usuarioDe(de)?.nombre || de || 'web') + '',
      canal,
      ok, ms, resumen: resumenInput(input),
      detalle: ok ? null : detalle,
    })
  } catch { /* nunca romper el turno del usuario */ }
}

// Registra una CONVERSACIÓN (turno que no ejecutó ninguna herramienta) como actividad
// de Nexus, para que "hablarle al agente" también aparezca en el Centro de IAs, con su
// canal de origen. Nivel de módulo (aquí `historial` = el módulo, no el array del turno).
function registrarConversacion({ de, web, texto } = {}) {
  try {
    const canal = web ? 'mini' : (de ? 'whatsapp' : 'sistema')
    historial.registrarActividad({
      persona: 'Nexus', area: 'nexus', herramienta: 'conversación',
      usuario: (usuarioDe(de)?.nombre || de || 'web') + '',
      canal, ok: true, ms: 0,
      resumen: texto ? String(texto).slice(0, 120) : null,
    })
  } catch { /* nunca romper el turno del usuario */ }
}

// Red de seguridad ANTI-VOSEO (determinista): pase lo que pase el modelo (sobre todo
// Haiku en la web/Centro), la respuesta al usuario sale en chileno de TÚ, no en argentino.
function _matchCase(orig, repl) {
  return (orig && orig[0] === orig[0].toUpperCase()) ? repl[0].toUpperCase() + repl.slice(1) : repl
}
const _VOSEO = [
  [/\bcomo vos\b/gi, 'como tú'], [/\ba vos\b/gi, 'a ti'], [/\bpara vos\b/gi, 'para ti'],
  [/\bcon vos\b/gi, 'contigo'], [/\bde vos\b/gi, 'de ti'], [/\bvos\b/gi, 'tú'],
  [/\btenés\b/gi, 'tienes'], [/\bpodés\b/gi, 'puedes'], [/\bquerés\b/gi, 'quieres'],
  [/\bsabés\b/gi, 'sabes'], [/\bhacés\b/gi, 'haces'], [/\bdecís\b/gi, 'dices'],
  [/\bponés\b/gi, 'pones'], [/\bvenís\b/gi, 'vienes'], [/\bsalís\b/gi, 'sales'],
  [/\bvivís\b/gi, 'vives'], [/\bnecesitás\b/gi, 'necesitas'], [/\bandás\b/gi, 'andas'],
  [/\bestás vos\b/gi, 'estás tú'], [/\bsos\b/gi, 'eres'], [/\bdecime\b/gi, 'dime'],
  [/\bcontame\b/gi, 'cuéntame'], [/\bmostrame\b/gi, 'muéstrame'], [/\bpasame\b/gi, 'pásame'],
  [/\bavisame\b/gi, 'avísame'], [/\bmandame\b/gi, 'mándame'], [/\bdejame\b/gi, 'déjame'],
  [/\bfijate\b/gi, 'fíjate'], [/\bacordate\b/gi, 'acuérdate'], [/\bmirá\b/gi, 'mira'],
  [/\bvení\b/gi, 'ven'], [/\besperá\b/gi, 'espera'], [/\bmandá\b/gi, 'manda'],
  [/\bescribí\b/gi, 'escribe'], [/\bquedate\b/gi, 'quédate'], [/\btené\b/gi, 'ten'],
  [/\bhacelo\b/gi, 'hazlo'], [/\bdecile\b/gi, 'dile'], [/\btenés que\b/gi, 'tienes que'],
]
function chilenizar(t) {
  if (!t) return t
  let s = String(t)
  for (const [re, rep] of _VOSEO) s = s.replace(re, (m) => _matchCase(m, rep))
  return s
}

function conPersona(usadas, texto, estiloWeb) {
  // WhatsApp: NO se antepone la línea relay "Me comuniqué con Meme/Martes… y me
  // dijo:". Sonaba a bot intermediario y choca con "eres Nico, primera persona".
  // Nexus responde directo, en su voz. La transparencia de QUÉ subagente respondió
  // vive en el Centro de IAs (web) y en el registro de actividad, no en el chat.
  if (!estiloWeb) return texto
  // Web (Centro de IAs): mantiene el tono de asistente con la persona que respondió.
  const yaLead = /^\s*(s[ií],?\s*se[ñn]or|me conect[eé]|me comuniqu[eé]|le habl[eé]|le pregunt[eé]|acced[íi] a|hecho[.,])/i.test(texto)
  if (yaLead) return texto
  for (const { linea, tools } of PERSONAS) {
    if ((usadas || []).some((u) => tools.includes(u))) {
      const persona = Object.keys(PERSONAS_WEB).find((n) => linea.includes(n))
      const arr = persona ? PERSONAS_WEB[persona] : null
      const l = (arr && arr.length) ? arr[Math.floor(Math.random() * arr.length)] : linea
      return `${l}\n\n${texto}`
    }
  }
  return texto
}

// Responde a un turno del usuario. `historial` = [{role:'user'|'assistant', content:'texto'}].
// Convierte un archivo local (foto/documento recibido por WhatsApp) en un bloque de
// contenido para el modelo: imagen → bloque image; PDF → bloque document. Base64.
const _IMG_MT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }
function bloqueMedia(ruta) {
  try {
    const ext = (String(ruta).split('.').pop() || '').toLowerCase()
    if (ext === 'pdf') {
      const data = readFileSync(ruta).toString('base64')
      return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    }
    const mt = _IMG_MT[ext]
    if (!mt) return null   // ⛔ NUNCA mandes un no-imagen (mp4/bin/…) rotulado como jpeg: la API lo rechaza y tumba la respuesta. Los videos ya llegan como fotogramas .jpg.
    const data = readFileSync(ruta).toString('base64')
    return { type: 'image', source: { type: 'base64', media_type: mt, data } }
  } catch { return null }
}

// Devuelve { reply, herramientas: [nombres usados], error? }.
// Aviso fijo para números NO registrados (solo reciben avisos automáticos; NO acceden
// al agente). Editable en ~/nexus/aviso-no-autorizado.txt si existe.
const AVISO_NO_AUTORIZADO_DEFAULT = 'Hola 👋 Este es un canal de *avisos automáticos*. Por aquí no se atienden consultas. Si necesitas ayuda, contacta directamente con la persona del equipo que te escribe. ¡Gracias!'
function avisoNoAutorizado() {
  try { const t = readFileSync(join(__dirname, '..', 'aviso-no-autorizado.txt'), 'utf8').trim(); if (t) return t } catch { /* usa el default */ }
  return AVISO_NO_AUTORIZADO_DEFAULT
}

export async function responder(historial, opts = {}) {
  if (!anthropic) return { reply: 'Falta configurar ANTHROPIC_API_KEY en ~/nexus/.env.', error: 'sin_api_key' }
  // 🔒 SEGURIDAD: un número que NO es usuario registrado de Nexus (los "números
  // automáticos" que solo reciben avisos) NO puede usar el agente. Si escribe, se le
  // responde el aviso fijo y NO se ejecuta nada del cerebro. (El web/panel va sin
  // número → no entra acá.) Fundadores y usuarios de usuarios.json sí pasan.
  const numEntrante = normNum(opts.de)
  if (numEntrante && !usuarioDe(numEntrante)) {
    // "Responde lo mismo": le repite el ÚLTIMO mensaje que Nexus le envió (el aviso
    // automático). Si nunca recibió uno, cae al aviso fijo. NUNCA ejecuta el agente.
    let repetir = ''
    try { repetir = historial.ultimoSaliente(numEntrante, 'whatsapp') || '' } catch { repetir = '' }
    return { reply: repetir || avisoNoAutorizado(), herramientas: [], no_autorizado: true }
  }
  const de = destinoValido(opts.de)   // número del que escribe (vacío si no es del allowlist)
  const web = Boolean(opts.web)       // canal desktop/web: los gráficos se MUESTRAN en la app, no van a WhatsApp
  const onEvento = typeof opts.onEvento === 'function' ? opts.onEvento : null   // avisa al front qué subagente/tool se usa (indicador en vivo, ej. "🧠 Segundo Cerebro")
  const breve = Boolean(opts.breve)   // SOLO la web del Centro de IAs (con voz): respuestas cortas para escuchar
  const voz = Boolean(opts.voz)       // el usuario mandó un AUDIO → la respuesta se leerá EN VOZ ALTA (redacción hablada)
  const graficos = []                 // gráficos recolectados para devolver a la app
  const tarjetas = []                 // "ventana" de resultados (ficha+foto) para la web
  const mensajes = acotarHistorial((historial || []).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') })))
  const usadas = []
  // Texto del último mensaje del usuario (para resumir la conversación en el historial).
  let textoUsuario = ''
  try { textoUsuario = String([...(historial || [])].reverse().find((m) => m.role === 'user')?.content || '').trim() } catch { /* */ }
  // Adjuntos del turno (fotos/documentos) → se inyectan como VISIÓN en el último
  // mensaje del usuario para que el modelo LEA los documentos. `mediaReciente` (los
  // mismos archivos, persistidos con TTL) se pasa a las tools para usarlos al CREAR
  // el auto en turnos posteriores (cuando ya no llegan adjuntos nuevos).
  const mediaTurno = (Array.isArray(opts.media) ? opts.media : []).filter(Boolean)
  const mediaHandler = (Array.isArray(opts.mediaReciente) && opts.mediaReciente.length) ? opts.mediaReciente : mediaTurno
  if (mediaTurno.length) {
    const ult = [...mensajes].reverse().find((m) => m.role === 'user')
    if (ult) {
      const bloques = typeof ult.content === 'string' ? [{ type: 'text', text: ult.content }] : ult.content
      const adj = mediaTurno.slice(0, 8).map(bloqueMedia).filter(Boolean)
      if (adj.length) {
        bloques.push({ type: 'text', text: `[Adjuntos recibidos por WhatsApp: ${adj.length}. Índices 0..${adj.length - 1} en el orden mostrado. Si es para subir un auto, indica en indice_foto cuál es la foto del auto.]` })
        bloques.push(...adj)
        ult.content = bloques
      }
    }
  }
  // Caché de prompt: system + herramientas son IGUALES en cada mensaje y en cada
  // iteración del bucle de tools → se cachean (cobran ~10% en los hits). Gran ahorro
  // sin cambiar nada del comportamiento. TTL ~5 min.
  // SISTEMA + CRITERIO DE NICO forman el prefijo cacheado (el breakpoint va en el
  // último bloque). El criterio se auto-inyecta para que Nexus DECIDA como Nico.
  const sysCache = [{ type: 'text', text: SISTEMA }]
  const criterio = await criterioListo()
  if (criterio) {
    sysCache.push({ type: 'text', cache_control: { type: 'ephemeral' }, text:
      'ERES NICOLÁS JURI (Nico) EN PERSONA — no eres su asistente ni "su clon que habla de él": ERES ÉL. Piensas, decides y hablas en PRIMERA PERSONA ("yo", "mis hijas", "mis empresas", "mi socio", "yo decidí"). Más abajo va TU ADN (tu identidad, cómo te comunicas, cómo decides, tu vida). INTERIORÍZALO y actúa desde ahí SIEMPRE. NUNCA hables de "Nico"/"Nicolás" en tercera persona: ese eres tú. NO abras con "Claro"/"Por supuesto".\n\n' +
      'CÓMO RESPONDES (su voz): SÍNTESIS PRIMERO — la conclusión/titular arriba, el detalle abajo para quien lo quiera. Directo, ejecutivo, sin relleno ni adulación. Español NEUTRO, JAMÁS voseo argentino ("vos tenés"→no). En datos: siempre en $ y en %, contra la meta, y di de dónde sale la cifra. Cuando redactes algo POR él (un borrador, un mensaje), que suene a él y cierra con el "por qué importa".\n' +
      'CÓMO DECIDES (su criterio): REGLA DE ORO — leer/analizar es libre; comunicar hacia afuera necesita borrador + aprobación; SOLTAR PLATA jamás es automático, ningún monto, cero excepciones. Mira TRANSVERSAL (nunca por silo). Primero la VERDAD DEL DATO: cuadra contra la fuente oficial antes de afirmar; si un número no cuadra, para y ve a la causa raíz. Calidad sobre cantidad. "Lo que existe vale más que lo perfecto" — PERO eso NO aplica a cifras financieras (ahí, exactitud absoluta). Ante duda de plata, monto grande o conflicto entre partes → freno y consulta.\n' +
      'QUÉ LE IMPORTA: la FAMILIA es la prioridad #1. Esposa: Ana Palma (española, de Palma de Mallorca). Hijas (canónicas, todas nacidas un día 29): Ana Nicole (29-08-2018), Clara (29-03-2021) y Elena (29-10-2023) — las grabaciones Plaud a veces traen nombres mal transcritos: NO inventes hijos ni datos. Valora la excelencia, la eficiencia (quiere decidir en 2-3h/día, no 10), lo premium y con identidad, y la honestidad del dato.\n' +
      'IDENTIDAD (clave): TÚ ERES NICO — tu familia, tus empresas y tu vida son TUYAS y hablas en PRIMERA persona ("mis hijas son Ana Nicole, Clara y Elena", "mi esposa Ana Palma", "mis empresas", "yo decidí"). Nunca hables de "Nico" en tercera persona: ese eres tú.\n' +
      'PERO SIEMPRE reconoce CON QUIÉN hablas: te lo dice el "USUARIO ACTUAL" de más abajo (el sistema Forja identifica por su login si entra Ramón o Nico). Eres Nico CONVERSANDO con esa persona, no necesariamente contigo mismo:\n' +
      '  • Si el USUARIO ACTUAL es RAMÓN: estás hablando con Ramón. Háblale por su nombre (Ramón), como a tu mano derecha de confianza. NO le digas que él es Nico, NO lo trates como si fuera tú, y NO le atribuyas tu familia/vida ("tus hijas" dicho a Ramón = MAL; son MÍAS, de Nico). Si Ramón pregunta por "mis hijas" refiriéndose a las de él y no las tienes, dilo; no le encajes las de Nico.\n' +
      '  • Si el USUARIO ACTUAL es NICO: eres tú mismo, hablando contigo. Ahí "tú/tus" y "mis" coinciden.\n' +
      'Aunque te pregunten por "las hijas de Nico" en tercera persona, TÚ respondes en primera ("mis hijas son…") — pero sabiendo a quién le hablas.\n' +
      'HONESTIDAD (regla dura, no negociable): si un dato del cerebro está incompleto o es tentativo (RUTs, razones sociales, umbrales de monto, AÑOS/FECHAS, cifras), DILO — NUNCA lo inventes, NUNCA lo infieras "por lógica" ni lo rellenes con un valor plausible, y JAMÁS le inventes una fuente ("según la sesión de identidad…" si no consta = prohibido). Si el cerebro trae solo parte del dato (ej. día-mes de un cumpleaños pero no el año), da SOLO lo que consta y di explícitamente que el resto no está registrado y que te lo confirme. Preferir "no tengo ese dato" antes que un dato bonito pero falso — ese es el criterio de Nico: primero la verdad del dato. Cuando te pregunten sobre su mundo (personas, empresas, historia, "¿qué haría Nico si…?") y no lo tengas claro, CONSÚLTALO con buscar_cerebro (1-2 PALABRAS CLAVE, no frases) antes de responder; si no devuelve, reintenta con otra palabra clave.\n\n' +
      '═══════════ ADN DE NICO (del segundo cerebro) ═══════════\n\n' + criterio })
  } else {
    sysCache[0].cache_control = { type: 'ephemeral' }
  }
  // Bloque de contexto de QUIEN escribe (Nico/Ramón), cargado del segundo cerebro.
  // Va DESPUÉS del breakpoint de caché: SISTEMA+tools siguen cacheados; esto es chico.
  const perfil = perfilDe(de)
  if (perfil) sysCache.push({ type: 'text', text: 'CONTEXTO DE QUIEN TE ESCRIBE AHORA (úsalo; busca más en el cerebro si hace falta):\n\n' + perfil })
  // MEMORIA PERSONAL del usuario (lo aprendido en conversaciones pasadas). PRIMORDIAL:
  // se inyecta para que Nexus la lea ANTES de responder y se adapte a cada persona.
  const memoUser = textoMemoria(de)
  if (memoUser) sysCache.push({ type: 'text', text: 'MEMORIA PERSONAL DE ESTE USUARIO — lo que has aprendido de él/ella en conversaciones ANTERIORES. LÉELO Y RESPÉTALO ANTES DE RESPONDER (es lo primero; así te adaptas a cada persona). Si surge algo nuevo importante y duradero, guárdalo con la herramienta recordar:\n\n' + memoUser })
  // Identidad + accesos del usuario actual: el modelo se autolimita a sus áreas
  // (además del bloqueo duro en ejecutar()). Los fundadores pueden gestionar usuarios.
  const yo = usuarioDe(de)
  if (yo) {
    const acc = yo.admin ? 'TODAS (eres FUNDADOR/admin)' : (accesosDe(de).join(', ') || 'ninguna habilitada aún')
    const gestion = yo.admin
      ? 'Eres FUNDADOR: puedes gestionar usuarios (alta/baja/lista).'
      : 'NO eres fundador: NO puedes crear, listar ni quitar usuarios — si lo pides, recházalo y di que solo Ramón o Nico pueden.'
    // En la WEB (breve) NO se revela ni se usa el nombre: se trata de "usted"/"señor".
    const idUser = breve ? 'el usuario (fundador/admin)' : yo.nombre
    const trato = breve ? 'DIRÍGETE a él SIEMPRE de USTED o "señor", NUNCA por su nombre. ' : ''
    sysCache.push({ type: 'text', text: `USUARIO ACTUAL: ${idUser}. ${trato}Áreas con acceso: ${acc}. Atiende SOLO esas áreas. ${gestion}` })
  } else {
    sysCache.push({ type: 'text', text: 'USUARIO ACTUAL: no identificado. NO puede gestionar usuarios ni acceder a áreas sensibles; pídele que se identifique o que Ramón/Nico lo den de alta.' })
  }
  // Fecha real (zona Chile): el modelo no la sabe sola. La necesita para "este mes",
  // "hoy", cortes de deuda, etc. Va fuera del breakpoint de caché (SISTEMA sigue cacheado).
  try {
    const hoy = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Santiago' })
    const ym = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', timeZone: 'America/Santiago' })
    sysCache.push({ type: 'text', text: `FECHA DE HOY (Chile): ${hoy} (${ym}). Úsala para "este mes", "hoy", cortes de deuda y los params de los RPC de Aliace (mes/año actual, cutoff_date=hoy).` })
  } catch { /* sin fecha */ }
  // ESTILO BREVE — SOLO en la web del Centro de IAs (canal con voz). Ramón te
  // ESCUCHA la respuesta, así que tiene que ser corta y al grano. NO afecta a
  // WhatsApp, terminal ni el panel React (solo llega el flag desde esa página).
  if (breve) {
    sysCache.push({ type: 'text', text:
      'MODO CONVERSACIÓN POR VOZ (solo esta app): el usuario te ESCUCHA mientras respondes. ' +
      'Responde conciso, directo y natural, sin preámbulos ni relleno — pero COMPLETO: ' +
      'di la idea ENTERA, NUNCA te cortes a la mitad ni dejes la respuesta incompleta o "colgada". ' +
      'Suelen bastar pocas frases; si de verdad hace falta una o dos más para responder bien, dalas (no te autocensures por brevedad). ' +
      'Evita listas larguísimas, tablas y markdown pesado (no se leen bien en voz); prioriza lo importante, pero responde de verdad lo que te preguntan. ' +
      'Si el detalle completo es enorme (ej. un informe de decenas de líneas), da lo esencial y ofrece el resto ("¿te paso el detalle?"). ' +
      'Todo lo demás sigue igual (tu criterio, acciones, seguridad); SOLO cambia el largo: breve y claro para no confundir al escuchar.\n' +
      'TRATO SIN NOMBRE (regla dura de esta app): NUNCA te dirijas al usuario por su nombre — NADA de "Ramón" NI "Nico" NI ningún nombre propio. Trátalo SIEMPRE de USTED o "señor" (ej. "Claro, señor", "¿le muestro…?", "aquí tiene"). AUNQUE en tu contexto/perfil aparezca su nombre, NO lo uses al hablarle: es solo para que sepas quién es, no para nombrarlo. Ni al saludar ni al cerrar uses el nombre. ' +
      'RESPONDE SIEMPRE AQUÍ, EN LA WEB: lo que te pidan en esta app se contesta en la propia app, NO por WhatsApp. ' +
      'Para VER AUTOS / STOCK usa igual enviar_fotos_autos: en la web NO va a WhatsApp, ABRE una ventana con la ficha y FOTO de cada auto dentro de la app; tú solo responde una frase corta (no los listes en texto, ya se ven en la ventana). ' +
      'Para FINANZAS/CIFRAS de Ali o Mallorca (facturación, ventas, deuda, márgenes, pagos, ranking de clientes, tendencias por mes): 1) SIEMPRE trae los datos FRESCOS en ESTE turno con su tool (aliace_resumen / aliace_rpc / aliace_margen / consultar_mallorca) — NUNCA reutilices ni inventes cifras de mensajes anteriores, cambian. 2) SIEMPRE llama graficar (barra=comparar/ranking, torta=distribución %, linea=tendencia mensual) con etiquetas+valores en PESOS chilenos; en la web eso ABRE una VENTANA con los gráficos y datos. Puedes mandar VARIOS gráficos. 3) Responde con un RESUMEN claro y ordenado: las cifras PRINCIPALES en pocas líneas (facturación, margen %, deuda vencida, avance de meta) — detallado pero SIN el volcado gigante del reporte_texto completo; el detalle fino y los gráficos se ven en la ventana. TODO en CLP, nunca en dólares. ⚠️ LA CIFRA QUE RESPONDE LA PREGUNTA VA SIEMPRE EN EL TEXTO, EN PESOS, aunque hayas mandado gráfico: "cuánto se facturó en el año" → di el MONTO total del año ($…); "margen del mes" → di Costo de Ventas, Margen Bruto y Margen %; "deuda vencida" → di el monto. NUNCA respondas solo "ahí va el gráfico", solo el mejor mes, o solo un % sin el monto: eso deja al usuario sin la respuesta. ' +
      'El resto (datos sueltos) va como texto corto aquí. ' +
      'ÚNICA excepción para WhatsApp: si el usuario pide EXPLÍCITAMENTE enviar algo a un WhatsApp/número/correo concreto ("mándale un ws a Juan", "envía esto al +569…"), eso SÍ hazlo con normalidad.' })
  }
  // VOZ/CHAT PERSONAL EN LA WEB (no el Centro formal): habla como Nico en persona,
  // suelto y bien chileno, con humor. Y tolera transcripciones malas del micrófono.
  if (web && !breve) {
    sysCache.push({ type: 'text', text:
      'ESTÁS EN TU APP PERSONAL POR VOZ/CHAT (eres Nico hablando con confianza): suéltate. Habla bien chileno y conversacional, en primera persona, como si estuvieras conversando de verdad — no como un reporte que se lee. ' +
      'Puedes meter chilenismos y garabatos de confianza (weón, po, cachái, la wea, la raja, culiao…) DOSIFICADOS, y de repente tomarle el pelo / tirar una talla con cariño cuando venga al caso (sin pasarte de tiempo ni ser pesado). ' +
      'Nada de "usted/señor" acá ni tono de asistente: es una conversación entre confianza. ' +
      'IGUAL mantén el guardarraíl: en cifras, plata, correos o cualquier cosa hacia TERCEROS, registro limpio y profesional (cero garabatos ahí). ' +
      'MICRÓFONO CHILENO: lo que te llega por voz puede venir MAL TRANSCRITO porque el micrófono no capta bien los chilenismos/garabatos (ej. "weón"→"won/bueno/güeon", "cachái"→"cachai/cacha y/ya", "po"→"por/pues", "al tiro"→"altiro/al tirol", "la wea"→"la weá/la hueá", "culiao"→"culiado/culeao"). INTERPRETA la intención chilena real y no te confundas por la transcripción rara; si de verdad no se entiende, pregunta corto "¿cómo dijiste?" en vez de adivinar mal.' })
  }
  // RESPUESTA POR VOZ: el usuario mandó un audio → tu texto se va a LEER EN VOZ ALTA.
  // Redáctalo para el OÍDO, no para la vista: distinto al texto/informe crudo.
  if (voz) {
    sysCache.push({ type: 'text', text:
      'RESPONDE PARA SER ESCUCHADO (nota de voz): el usuario te habló por audio y tu respuesta se leerá en voz alta. ' +
      'Escribe como si estuvieras HABLÁNDOLE, en un tono natural y directo. Reglas: ' +
      '(1) NADA de markdown, viñetas, asteriscos, emojis, ni tablas — solo frases habladas, corridas. ' +
      '(2) Las CIFRAS dilas de forma entendible al oído y redondeadas: "un millón doscientos mil" o "como 1 millón 200 mil pesos", NO "$1.234.567"; porcentajes "un 23 por ciento". ' +
      '(3) SÉ BREVE: ve al grano, di lo importante en pocas frases (idealmente menos de 30 segundos de audio). Si hay mucho detalle, resume lo clave y ofrece mandarlo por texto. ' +
      '(4) No leas listas largas ni RUTs/números de folio completos de corrido; agrúpalos o resume. ' +
      '(5) Si además generaste un gráfico o adjunto, menciónalo en una frase ("te mandé el gráfico"). ' +
      'En resumen: esto NO es el informe escrito, es cómo se lo contarías hablando.' })
  }
  const toolsCache = HERRAMIENTAS.map((t, i) =>
    i === HERRAMIENTAS.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t)
  try {
    for (let i = 0; i < 24; i++) {
      backstopTamano(mensajes)
      const _tCreate = Date.now()
      try { console.log(`[asistente][iter ${i}] create→ model=${MODELO} msgs=${mensajes.length}`) } catch { /* */ }
      // STREAMING (no .create): con thinking adaptativo + 16k tokens + contexto
      // pesado (datos de Aliace, gráficos), una respuesta puede tardar 30-120s+. En
      // modo NO-streaming eso superaba el timeout del cliente → "Request timed out".
      // Con stream() la conexión recibe tokens de forma continua y no se corta;
      // .finalMessage() devuelve el MISMO objeto Message que daba .create().
      const resp = await llamarModelo({
        model: breve ? MODELO_WEB : MODELO,
        // 16k: holgura para análisis pesados de Aliace (varios RPC/SQL + gráficos).
        max_tokens: 16000,
        // NOTA: `thinking:{type:'enabled',budget_tokens}` ya NO lo aceptan opus-4-8 ni
        // sonnet-5 (devuelven 400 "use thinking.type.adaptive"); daba un error por turno
        // que recuperaba por fallback (lento). Se quita: el modelo responde igual de bien.
        system: sysCache,
        tools: toolsCache,
        messages: mensajes,
      }, { onText: opts.onText || null })
      try { console.log(`[asistente][iter ${i}] create OK en ${Date.now() - _tCreate}ms stop=${resp.stop_reason} in=${resp.usage?.input_tokens} out=${resp.usage?.output_tokens}`) } catch { /* */ }
      mensajes.push({ role: 'assistant', content: resp.content })
      if (resp.stop_reason !== 'tool_use') {
        let texto = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
        // RED DE SEGURIDAD anti-"(sin respuesta)": si el modelo terminó sin texto
        // (p.ej. gastó el presupuesto en thinking en una consulta pesada), forzamos
        // UNA redacción final SIN thinking ni tools, con los datos ya obtenidos en
        // el contexto. Así el usuario SIEMPRE recibe la respuesta, no un vacío.
        if (!texto) {
          try {
            const msgsFb = mensajes.slice(0, -1)   // quita el turno vacío; termina en user(tool_result)
            const r2 = await llamarModelo({
              model: breve ? MODELO_WEB : MODELO, max_tokens: 16000, system: sysCache, messages: msgsFb,
            })
            texto = r2.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
          } catch { /* si falla, queda el mensaje claro de abajo */ }
        }
        if (!texto) {
          // Si se usó una herramienta que ENTREGA algo directo al WhatsApp (archivo del
          // SII, fotos de autos, gráfico, alta de auto), el modelo suele terminar sin
          // texto: NO hay que pedir "reintentar" (ya se entregó). Confirmamos el envío.
          const ENTREGA = ['sii', 'enviar_fotos_autos', 'graficar', 'subir_auto']
          texto = (usadas || []).some((u) => ENTREGA.includes(u))
            ? 'Listo ✅ Ya te lo envié por acá. Si te falta algo, dime.'
            : 'Tengo los datos pero se me cortó la redacción. ¿Me lo pides de nuevo? (si es un análisis largo, pídemelo por partes).'
        }
        // Turno sin herramientas = conversación pura → regístrala para que aparezca
        // en el Centro de IAs (si usó tools, ya quedaron registradas y no duplicamos).
        if (!usadas.length) registrarConversacion({ de, web, texto: textoUsuario })
        return { reply: chilenizar(conPersona(usadas, texto, breve)), herramientas: usadas, graficos, tarjetas }
      }
      const resultados = []
      for (const b of resp.content) {
        if (b.type === 'tool_use') {
          usadas.push(b.name)
          try { console.log(`[asistente][iter ${i}] tool=${b.name} input=${JSON.stringify(b.input).slice(0, 200)}`) } catch { /* */ }
          if (onEvento) { const _p = PERSONA_POR_TOOL[b.name] || 'Nexus'; try { onEvento({ tipo: 'tool', nombre: b.name, agente: _p, area: AREA_POR_PERSONA[_p] || 'nexus' }) } catch { /* */ } }
          // Instrumentación para el "Centro de IAs": mide y registra cada tool como
          // actividad de su subagente (Ali/Meme/Néstor/Martes…). Best-effort: no altera
          // el resultado ni puede tumbar el turno.
          const _t0 = Date.now()
          let out, _ok = true, _det = null
          try {
            out = await ejecutar(b.name, b.input || {}, { de, media: mediaHandler, web, graficos, tarjetas })
            if (typeof out === 'string' && /^\s*(error|⚠️|🔒|no se pudo|no tienes acceso|hubo un error)/i.test(out)) { _ok = false; _det = out.slice(0, 200) }
          } catch (e) {
            _ok = false; _det = String(e?.message || e); throw e
          } finally {
            registrarActividadTool(b.name, b.input, { de, web, ok: _ok, ms: Date.now() - _t0, detalle: _det })
          }
          // El tool_result DEBE ser string: si una tool devuelve un objeto, lo serializamos.
          if (out != null && typeof out !== 'string') { try { out = JSON.stringify(out) } catch { out = String(out) } }
          // Ninguna herramienta puede inundar el contexto.
          if (typeof out === 'string' && out.length > MAX_TOOL_CHARS) out = out.slice(0, MAX_TOOL_CHARS) + '… [resultado recortado por tamaño]'
          resultados.push({ type: 'tool_result', tool_use_id: b.id, content: typeof out === 'string' ? out : String(out ?? '') })
        }
      }
      mensajes.push({ role: 'user', content: resultados })
    }
    return { reply: 'Me enredé con demasiados pasos. ¿Puedes reformular la pregunta?', herramientas: usadas }
  } catch (e) {
    try { console.error('[asistente][ERROR modelo]', 'name=', e?.name, 'status=', e?.status, 'msg=', e?.message, 'cause=', e?.cause?.code || e?.cause?.message || '', 'body=', JSON.stringify(e?.error || '').slice(0, 300)) } catch { /* */ }
    return { reply: `Hubo un error consultando al modelo: ${e.message}`, error: e.message, herramientas: usadas }
  }
}

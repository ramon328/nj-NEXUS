// ── MARGEN BI · integración con el Supabase de NICOJURI ──────────────────────
// Proyecto ydcpsihovvaefyobnhws (NO Aliace, NO GoAutos). Llama al RPC
// margen_bi_sumas (creado por supabase/2026-07-01_margen_bi.sql), trae las 4 sumas
// base y deriva el margen con computeMargen() —única fuente de la fórmula (misma
// que ya cubren los tests de margen-bi.test.mjs).
import { computeMargen } from './margen-bi.mjs'

const NJ_URL = process.env.SUPABASE_URL || ''
const NJ_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''

async function rpcNicojuri(fn, params, { url = NJ_URL, key = NJ_KEY } = {}) {
  if (!url || !key) throw new Error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (Supabase nicojuri)')
  const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
    signal: AbortSignal.timeout(20000),
  })
  const d = await r.json().catch(() => null)
  if (!r.ok) throw new Error(`rpc ${fn} HTTP ${r.status}: ${JSON.stringify(d)?.slice(0, 200)}`)
  return d
}

// Servicio final: calcula el margen BI sobre el Supabase de nicojuri.
// filtros: { desde, hasta, vendedor_id, cliente_id, producto_id } (todos opcionales).
// Devuelve { ventas, NC, ventas_netas, costo_ventas_total, margen_bruto, pct_margen, pct_costos, pct_nc }.
export async function calcularMargenNicojuri(filtros = {}, opts = {}) {
  const rows = await rpcNicojuri('margen_bi_sumas', {
    p_desde: filtros.desde ?? null,
    p_hasta: filtros.hasta ?? null,
    p_vendedor_id: filtros.vendedor_id ?? null,
    p_cliente_id: filtros.cliente_id ?? null,
    p_producto_id: filtros.producto_id ?? null,
  }, opts)
  const r = (Array.isArray(rows) ? rows[0] : rows) || {}
  return computeMargen({
    ventas: r.ventas,
    NC: r.nc,
    costo_ventas_fact: r.costo_ventas_fact,
    costo_ventas_nc: r.costo_ventas_nc,
  })
}

// shared/supabase.mjs — Cliente Supabase compartido + helpers de auditoría y costos.
// Uso desde cualquier servicio Node de Nexus:
//   import { supa, registrarAccion, registrarConsumo } from '../shared/supabase.mjs'
// Carga las credenciales desde ~/nexus/.env. Si no hay credenciales, exporta supa=null
// y los helpers se vuelven no-op (degradación elegante).

import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* opcional */ }

const URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

export const supa = (URL && KEY)
  ? createClient(URL, KEY, { auth: { persistSession: false } })
  : null

// Registra una acción de agente para auditoría.
// Para acciones críticas, pasa { requiere_aprobacion: true } y deja aprobado=null
// hasta que un humano confirme por WhatsApp.
export async function registrarAccion({ agente, accion, descripcion, recurso, resultado = 'ok', requiere_aprobacion = false }) {
  if (!supa) return null
  const { data, error } = await supa.from('log_acciones').insert({
    agente, accion, descripcion, recurso, resultado, requiere_aprobacion,
    aprobado: requiere_aprobacion ? null : true,
  }).select().single()
  if (error) { console.error('[supabase] registrarAccion:', error.message); return null }
  return data
}

// Registra consumo de tokens/costo de una llamada a la API de Claude.
export async function registrarConsumo({ agente, modelo, tokens_in = 0, tokens_out = 0, costo_usd = 0, cacheado = false, batch = false }) {
  if (!supa) return null
  const { error } = await supa.from('consumo_api').insert({
    agente, modelo, tokens_in, tokens_out, costo_usd, cacheado, batch,
  })
  if (error) console.error('[supabase] registrarConsumo:', error.message)
}

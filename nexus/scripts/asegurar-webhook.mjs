#!/usr/bin/env node
// asegurar-webhook.mjs — Garantiza que el webhook de WhatsApp (Kapso) apunte a la URL
// pública ESTABLE del Funnel. Idempotente: solo escribe si detecta deriva. Lo llama
// scripts/arranque.sh tras cada encendido. Falla suave (no rompe el arranque).
import os from 'node:os'
import path from 'node:path'

try { process.loadEnvFile(path.join(os.homedir(), 'nexus', '.env')) } catch { /* */ }

const KEY = process.env.KAPSO_API_KEY || ''
const BASE = (process.env.KAPSO_API_BASE_URL || 'https://api.kapso.ai').replace(/\/+$/, '')
const URL_ESTABLE = 'https://mac-mini-de-nicolas.tailee0068.ts.net/wa/kapso'

if (!KEY) { console.log('[webhook] sin KAPSO_API_KEY → nada que hacer'); process.exit(0) }

const H = { 'X-API-Key': KEY, 'Content-Type': 'application/json' }

try {
  const r = await fetch(`${BASE}/platform/v1/whatsapp/webhooks`, { headers: H, signal: AbortSignal.timeout(15000) })
  if (!r.ok) { console.log('[webhook] no pude listar webhooks:', r.status); process.exit(0) }
  const { data = [] } = await r.json()
  const wh = data.find((w) => w.active) || data[0]
  if (!wh) { console.log('[webhook] no hay webhook registrado en Kapso (revisar manualmente)'); process.exit(0) }
  if (wh.url === URL_ESTABLE) { console.log('[webhook] OK, ya apunta a la URL estable'); process.exit(0) }
  // Deriva detectada → corregir.
  const u = await fetch(`${BASE}/platform/v1/whatsapp/webhooks/${wh.id}`, {
    method: 'PATCH', headers: H, signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ url: URL_ESTABLE }),
  })
  console.log(`[webhook] corregido (${wh.url} → ${URL_ESTABLE}): HTTP ${u.status}`)
} catch (e) {
  console.log('[webhook] aviso:', e.message)
}

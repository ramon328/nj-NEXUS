#!/usr/bin/env node
// tunnel-publish.mjs — Corre el túnel cloudflared al backend SII (8000) y PUBLICA
// su URL pública en Supabase (business_rules → rule_key 'sii_backend_url'). Así el
// proxy del frontend (Vercel) siempre encuentra el backend, aunque la URL cambie
// (reinicios). Auto-reparación: cero intervención manual.

import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

process.loadEnvFile(path.join(os.homedir(), 'nexus', '.env'))
const SUPA = (process.env.SUPABASE_URL || '').replace(/\/$/, '') + '/rest/v1'
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
const CF = path.join(os.homedir(), 'nexus', 'bin', 'cloudflared')

let lastUrl = null
async function publish(url) {
  if (url === lastUrl) return
  lastUrl = url
  try {
    const r = await fetch(`${SUPA}/business_rules?on_conflict=rule_key`, {
      method: 'POST',
      headers: { apikey: SVC, Authorization: 'Bearer ' + SVC, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ rule_key: 'sii_backend_url', rule_value: url, description: 'URL pública del backend SII (auto, túnel cloudflared)' }),
    })
    console.log(`[tunnel-publish] URL publicada (${r.status}): ${url}`)
  } catch (e) { console.log('[tunnel-publish] error publicando:', e.message) }
}

const cf = spawn(CF, ['tunnel', '--url', 'http://127.0.0.1:8000', '--no-autoupdate'], { stdio: ['ignore', 'pipe', 'pipe'] })
function scan(buf) {
  const s = buf.toString()
  process.stdout.write(s) // conserva el log normal de cloudflared
  const m = s.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
  if (m) publish(m[0])
}
cf.stdout.on('data', scan)
cf.stderr.on('data', scan)
cf.on('exit', (code) => { console.log('[tunnel-publish] cloudflared salió:', code); process.exit(code || 1) })

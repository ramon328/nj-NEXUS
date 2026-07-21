import { readFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('/Users/AIagenteia/nexus/reservo/session.json','utf8'))
const cookie = (st.cookies||[]).map(c=>`${c.name}=${c.value}`).join('; ')
const H = { 'Cookie': cookie, 'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/145 Safari/537.36', 'Accept':'text/html,application/json,*/*' }
const base = 'https://reservo.cl'
const get = async (p) => { try { const r = await fetch(base+p, { headers:H, redirect:'manual' }); return { p, status:r.status, ct:(r.headers.get('content-type')||'').split(';')[0], loc:r.headers.get('location')||'', len:+(r.headers.get('content-length')||0) } } catch(e){ return { p, err:e.message.slice(0,50) } } }

console.log('=== 1) ¿esquema/Swagger de la API? ===')
for (const p of ['/api/','/api/v1/','/api/schema/','/api/schema/swagger-ui/','/swagger/','/redoc/','/openapi.json','/api/docs/','/api/schema.json','/docs/']) console.log(JSON.stringify(await get(p)))

console.log('=== 2) dashboard: HTML + bundles JS ===')
const r = await fetch(base+'/', { headers:H })
const html = await r.text()
console.log('home status', r.status, 'url', r.url, 'len', html.length)
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]).filter(s=>/\.js/.test(s))
console.log('bundles JS:', JSON.stringify(scripts.slice(0,15)))
// base del API embebida en el HTML?
const apiHints = [...html.matchAll(/["'`](\/(api|citas|cliente|agenda_online|ventas|fichas|webhooks|sucursal|planes)[^"'`\s]*)["'`]/g)].map(m=>m[1])
console.log('rutas API en el HTML:', JSON.stringify([...new Set(apiHints)].slice(0,25)))

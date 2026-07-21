import { readFileSync, writeFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('/Users/AIagenteia/nexus/reservo/session.json','utf8'))
const cookie = (st.cookies||[]).map(c=>`${c.name}=${c.value}`).join('; ')
const H = { 'Cookie':cookie, 'User-Agent':'Mozilla/5.0 Chrome/145' }
// 1) HTML de la app autenticada → bundles JS
const r = await fetch('https://reservo.cl/appointment/viewAppt/', { headers:H })
const html = await r.text()
const bundles = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/g)].map(m=>m[1].startsWith('http')?m[1]:('https://reservo.cl'+m[1])))]
console.log('bundles JS de la app:', bundles.length)
bundles.slice(0,20).forEach(x=>console.log('  ',x.slice(0,100)))
// 2) bajar cada bundle y extraer rutas de endpoints
const rutas = new Set()
const reEp = /["'`](\/(appointment|schedule|disponibilidad|cliente|paciente|citas?|agenda|agenda_online|ventas?|planes?|fichas?|orden_medica|bloqueosHorario|usuarios|atencion|sucursal|webhooks|upload|caja|finanzas|estadisticas|reportes?|producto|servicio|tratamiento|profesional|convenio|pago|factura|boleta)[a-zA-Z0-9_\/-]*\/)["'`]/g
for (const u of bundles) {
  try { const t = await (await fetch(u, { headers:H })).text(); let m; while((m=reEp.exec(t))!==null) rutas.add(m[1]) } catch(e){ console.log('skip bundle', e.message.slice(0,30)) }
}
const lista = [...rutas].sort()
console.log('=== RUTAS DE ENDPOINT EN EL JS ('+lista.length+') ===')
lista.forEach(x=>console.log('  ',x))
writeFileSync('/Users/AIagenteia/nexus/reservo/mapa/endpoints-js.json', JSON.stringify(lista,null,2))

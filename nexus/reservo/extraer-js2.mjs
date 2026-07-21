import { readFileSync, writeFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('/Users/AIagenteia/nexus/reservo/session.json','utf8'))
const H = { 'Cookie':(st.cookies||[]).map(c=>`${c.name}=${c.value}`).join('; '), 'User-Agent':'Mozilla/5.0 Chrome/145' }
const html = await (await fetch('https://reservo.cl/appointment/viewAppt/', { headers:H })).text()
let bundles = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/g)].map(m=>m[1].startsWith('http')?m[1]:('https://reservo.cl'+m[1])))]
// solo bundles PROPIOS (saltar librerías de terceros)
const vendor = /jquery|bootstrap|luxon|select2|datepicker|timepicker|priceformat|multiselect|prettify|recaptcha|gtag|gtm|loadScript|jquery-ui/i
bundles = bundles.filter(u=>/reservo\.cl|cloudfront/.test(u) && !vendor.test(u))
console.log('bundles propios:', bundles.length)
const rutas = new Set(), escritura = new Set()
const rePath = /["'`](\/[a-zA-Z][a-zA-Z0-9_]{2,}\/[a-zA-Z0-9_\/{}$-]+\/)["'`]/g
const reWrite = /(save|guardar|crear|create|nuev|add|agregar|eliminar|delete|borrar|update|actualizar|editar|modif|anular|cancel|reagend|mover|pagar|cobrar)/i
for (const u of bundles) {
  try {
    const t = await (await fetch(u, { headers:H })).text()
    let m; while((m=rePath.exec(t))!==null){ const p=m[1]; rutas.add(p); if(reWrite.test(p)) escritura.add(p) }
  } catch {}
}
const all=[...rutas].sort(), wr=[...escritura].sort()
console.log('=== TOTAL rutas en JS:', all.length, '===')
console.log('--- ESCRITURA (crear/guardar/editar/eliminar) ---'); wr.forEach(x=>console.log('  ',x))
console.log('--- TODAS ---'); all.forEach(x=>console.log('  ',x))
writeFileSync('/Users/AIagenteia/nexus/reservo/mapa/endpoints-full.json', JSON.stringify({escritura:wr, todas:all},null,2))

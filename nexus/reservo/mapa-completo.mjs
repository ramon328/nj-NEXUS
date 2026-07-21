import { readFileSync, writeFileSync } from 'node:fs'
const st = JSON.parse(readFileSync('/Users/AIagenteia/nexus/reservo/session.json','utf8'))
const H = { 'Cookie':(st.cookies||[]).map(c=>`${c.name}=${c.value}`).join('; '), 'User-Agent':'Mozilla/5.0 Chrome/145', 'Accept':'text/html,*/*' }
const eps = new Map()      // "/mod/action/" -> Set(páginas donde aparece)
const paginas = new Map()  // url -> status
const cola = ['/appointment/viewAppt/']
const vistas = new Set()
const skipEp = /\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ico|pdf)$|cloudfront|googleapis|google\.com|gstatic|recaptcha|\/Web\/|\/img\/|\/css\/|\/js\/|\/icons\/|\/themes\/|\/calendar_|\/lib\/|\/static\/|\/reservo\/es|\/articles/i
const skipPage = /logout|salir|\.(js|css|png|jpg|svg|pdf|zip)|cloudfront|google|facebook|instagram|whatsapp|mailto|tel:|tutorial|soporte|ayuda|invita/i
const reEp = /["'`(](\/[a-zA-Z][a-zA-Z0-9_]{2,}\/[a-zA-Z0-9_]+\/(?:[0-9]+\/)?)["'`)]/g
const rePage = /href=["'](\/[a-zA-Z][a-zA-Z0-9_\/-]*\/)["']/g

let n=0
while (cola.length && n<45) {
  const p = cola.shift()
  if (vistas.has(p)) continue
  vistas.add(p); n++
  try {
    const r = await fetch('https://reservo.cl'+p, { headers:H, redirect:'manual' })
    paginas.set(p, r.status)
    if (r.status>=300) continue
    const html = await r.text()
    if (/accounts\/login/.test(r.url||'') ) continue
    let m
    while ((m=reEp.exec(html))!==null){ const e=m[1]; if(!skipEp.test(e)){ if(!eps.has(e)) eps.set(e,new Set()); eps.get(e).add(p) } }
    while ((m=rePage.exec(html))!==null){ const l=m[1]; if(!skipPage.test(l) && !vistas.has(l) && !cola.includes(l) && cola.length<80) cola.push(l) }
  } catch(e){ paginas.set(p,'err:'+e.message.slice(0,30)) }
  // guardar incremental
  const out = {}; for (const [e,s] of eps) out[e]=[...s].length
  writeFileSync('/Users/AIagenteia/nexus/reservo/mapa/endpoints-completo.json', JSON.stringify({ total_endpoints:eps.size, paginas_visitadas:vistas.size, endpoints:Object.keys(out).sort() },null,2))
}
console.log('páginas visitadas:', vistas.size, '| endpoints:', eps.size)
// buscar página de API/token/integraciones entre las vistas + probar rutas típicas
const cand=[...vistas].filter(p=>/api|token|integ|webhook|desarroll|dev/i.test(p))
console.log('páginas API/token candidatas:', JSON.stringify(cand))

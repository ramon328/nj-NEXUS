import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
const { chromium } = patchright
import { writeFileSync } from 'node:fs'
const b = await chromium.launch({ headless:true, channel:'chrome' })
const ctx = await b.newContext({ storageState:'/Users/AIagenteia/nexus/reservo/session.json' })
const page = await ctx.newPage()
const eps = new Map()
const norm = (u)=>{ try{ const x=new URL(u); if(!/reservo\.cl$/.test(x.hostname)) return null; return x.pathname.replace(/\/[0-9a-f-]{8,}\/?/gi,'/{id}/').replace(/\/\d+\/?/g,'/{n}/') }catch{return null} }
ctx.on('request', r=>{ const ty=r.resourceType(); if(ty!=='xhr'&&ty!=='fetch'&&ty!=='document') return; const p=norm(r.url()); if(p) eps.set(r.method()+' '+p,(eps.get(r.method()+' '+p)||0)+1) })
const guardar = ()=>writeFileSync('/Users/AIagenteia/nexus/reservo/mapa/endpoints.json', JSON.stringify(Object.fromEntries([...eps.entries()].sort()),null,2))

await page.goto('https://reservo.cl/appointment/viewAppt/', { waitUntil:'domcontentloaded', timeout:25000 }).catch(()=>{})
await new Promise(r=>setTimeout(r,3500)); guardar()
let links = await page.evaluate(()=>[...new Set([...document.querySelectorAll('nav a[href], .menu a[href], header a[href], a[href*="/"]')].map(a=>a.href))].filter(h=>/reservo\.cl\//.test(h)&&!/logout|salir|tutorial|soporte|invita|facebook|instagram|whatsapp|mailto/i.test(h)))
links = [...new Set(links)].slice(0,12)
console.log('visitando', links.length, 'secciones')
for (const l of links) {
  try { await page.goto(l, { waitUntil:'domcontentloaded', timeout:18000 }); await new Promise(r=>setTimeout(r,2200)); guardar(); console.log('ok', l.replace('https://reservo.cl','')) } catch(e){ console.log('skip', l.replace('https://reservo.cl','')) }
}
guardar(); console.log('TOTAL endpoints:', eps.size)
await b.close(); process.exit(0)

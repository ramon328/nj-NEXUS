import { chromium } from '/Users/AIagenteia/nexus/conector-navegador/node_modules/playwright/index.mjs'
import { readFileSync } from 'node:fs'
setTimeout(()=>{console.log('HARD');process.exit(2)},55000)
const { usuario, password, login_url } = JSON.parse(readFileSync('/Users/AIagenteia/nexus/reservo/.creds.json','utf8'))
const b = await chromium.connectOverCDP('http://127.0.0.1:9222')
const ctx = b.contexts()[0] || await b.newContext()
const page = ctx.pages()[0] || await ctx.newPage()

await page.goto(login_url, { waitUntil:'domcontentloaded', timeout:30000 })
await page.waitForSelector('input[name=username]', { timeout:15000 }).catch(()=>{})
await new Promise(r=>setTimeout(r,1500))
// Rellenar (sin submit todavía)
await page.evaluate(({u,p})=>{
  const un=document.querySelector('input[name=username]'), pw=document.querySelector('input[name=password]')
  if(un) un.value=u; if(pw) pw.value=p
}, { u:usuario, p:password }).catch(e=>console.log('fill err:', e.message.slice(0,60)))
await new Promise(r=>setTimeout(r,600))
// Submit (esto navega → el contexto se destruye, es esperado)
await page.evaluate(()=>{ const f=document.querySelector('form'); const btn=f&&f.querySelector('button,[type=submit]'); if(btn) btn.click(); else if(f) f.submit() }).catch(()=>{})
await page.waitForLoadState('domcontentloaded',{timeout:20000}).catch(()=>{})
await new Promise(r=>setTimeout(r,3500))

const logueado = !/\/accounts\/login/i.test(page.url())
let info={}
try { info = await page.evaluate(()=>({
  url: location.href, title: document.title,
  hayLogout: !!document.querySelector('a[href*="logout"], a[href*="salir"]'),
  texto: (document.body.innerText||'').replace(/\s+/g,' ').slice(0,250),
  links: [...new Set([...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h&&!h.startsWith('#')&&!/javascript:/.test(h)))].slice(0,45),
})) } catch(e){ info={err:e.message.slice(0,80)} }
console.log('LOGUEADO?:', logueado)
console.log('INFO:', JSON.stringify(info,null,1))
try { await ctx.storageState({ path:'/Users/AIagenteia/nexus/reservo/session.json' }) } catch {}
await b.close()

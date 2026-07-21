import { chromium } from '/Users/AIagenteia/nexus/conector-navegador/node_modules/playwright/index.mjs'
setTimeout(()=>{console.log('HARD');process.exit(2)},40000)
const b = await chromium.connectOverCDP('http://127.0.0.1:9222')
const ctx = b.contexts()[0] || await b.newContext()
const page = ctx.pages()[0] || await ctx.newPage()
await page.goto('https://reservo.cl/accounts/login/', { waitUntil:'load', timeout:30000 }).catch(e=>console.log('goto',e.message))
await new Promise(r=>setTimeout(r,2500))
const info = await page.evaluate(()=>{
  const forms=[...document.querySelectorAll('form')].map(f=>({
    action:f.getAttribute('action'), method:f.getAttribute('method'),
    inputs:[...f.querySelectorAll('input,button,select')].map(i=>({name:i.name||i.id||'', type:i.type||i.tagName, ph:i.placeholder||''})).filter(x=>x.name||x.type)
  }))
  return { url:location.href, title:document.title, forms, hasCsrf:!!document.querySelector('[name=csrfmiddlewaretoken]') }
})
console.log('LOGIN_PAGE:', JSON.stringify(info,null,1))
await b.close()

import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
const { chromium } = patchright
import { readFileSync } from 'node:fs'
setTimeout(()=>{console.log('HARD');process.exit(2)},70000)
const { usuario, password, login_url } = JSON.parse(readFileSync('/Users/AIagenteia/nexus/reservo/.creds.json','utf8'))
const b = await chromium.launch({ headless:true, channel:'chrome' })
const ctx = await b.newContext()
const page = await ctx.newPage()
const xhr = new Set()
page.on('request', r=>{ const u=r.url(), ty=r.resourceType(); if((ty==='xhr'||ty==='fetch') && /reservo/.test(u)) xhr.add(r.method()+' '+u.replace(/https?:\/\//,'').slice(0,110)) })

await page.goto(login_url, { waitUntil:'domcontentloaded', timeout:30000 })
await page.fill('input[name=username]', usuario)
await page.fill('input[name=password]', password)
await Promise.all([ page.waitForNavigation({timeout:20000}).catch(()=>{}), page.click('form button[type=submit], form [type=submit], form button') ])
await page.waitForLoadState('domcontentloaded').catch(()=>{})
await new Promise(r=>setTimeout(r,3500))

const url = page.url()
const cookies = await ctx.cookies()
const tieneSesion = cookies.some(c=>/sessionid/i.test(c.name))
console.log('URL tras login:', url)
console.log('¿sessionid?:', tieneSesion, '| cookies:', cookies.map(c=>c.name).join(','))
const info = await page.evaluate(()=>({ title:document.title, logout:!!document.querySelector('a[href*="logout"],a[href*="salir"]'), texto:(document.body.innerText||'').replace(/\s+/g,' ').slice(0,200) }))
console.log('INFO:', JSON.stringify(info))
// pasear un poco para gatillar XHR de la app
await new Promise(r=>setTimeout(r,2500))
console.log('XHR/API en vivo:', JSON.stringify([...xhr].slice(0,30),null,1))
await ctx.storageState({ path:'/Users/AIagenteia/nexus/reservo/session.json' })
await b.close()

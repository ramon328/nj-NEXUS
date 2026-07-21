// render-doc.mjs — renderiza doc-img.html a un JPG para mandar por WhatsApp.
// Headless, HTML local (no toca el banco).
import patchright from '/Users/AIagenteia/nexus/conector-tek/node_modules/patchright/index.js'
const { chromium } = patchright
const OUT = '/Users/AIagenteia/nexus/conector-tek/data/api-doc.jpg'
const HTML = 'file:///Users/AIagenteia/nexus/conector-tek/doc-img.html'
const b = await chromium.launch({ headless: true, channel: 'chrome' })
const p = await b.newPage({ viewport: { width: 900, height: 1400 }, deviceScaleFactor: 2 })
await p.goto(HTML, { waitUntil: 'networkidle' })
await new Promise((r) => setTimeout(r, 600))
await p.screenshot({ path: OUT, type: 'jpeg', quality: 92, fullPage: true })
await b.close()
console.log('OK', OUT)

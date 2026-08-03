// Driver: se conecta a la ventana AutoRed abierta (CDP :9333) y corre un paso.
// Uso: node ar-do.mjs <archivo-paso.mjs>
// El paso exporta: export default async ({page, ctx, req}) => { ... }
//   req = array de requests XHR/fetch capturados durante el paso
import { chromium } from 'playwright';
import path from 'node:path';

const browser = await chromium.connectOverCDP('http://localhost:9333');
const ctx = browser.contexts()[0];
const page = ctx.pages().find((p) => p.url().includes('autored.cl')) || ctx.pages()[0];

const propio = (u) => u.includes('autored.cl');
const req = [];
page.on('request', (r) => {
  const t = r.resourceType();
  if (propio(r.url()) && (t === 'xhr' || t === 'fetch' || r.method() !== 'GET')) {
    req.push({ method: r.method(), url: r.url(), body: r.postData() || null });
  }
});
const res = [];
page.on('response', async (r) => {
  const t = r.request().resourceType();
  if (propio(r.url()) && (t === 'xhr' || t === 'fetch')) {
    let body = null;
    try { body = (await r.text()).slice(0, 2000); } catch {}
    res.push({ status: r.status(), method: r.request().method(), url: r.url(), body });
  }
});

const mod = await import(path.resolve(process.argv[2]));
try {
  const out = await mod.default({ page, ctx, req, res });
  if (out !== undefined) console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 1));
} catch (e) {
  console.error('PASO ERROR:', e.message);
}
console.log('\n=== REQUESTS (no-GET / xhr) ===');
for (const r of req) console.log(`${r.method} ${r.url}${r.body ? '\n   body: ' + r.body.slice(0, 1200) : ''}`);
console.log('\n=== RESPUESTAS xhr ===');
for (const r of res) console.log(`${r.status} ${r.method} ${r.url}\n   ${(r.body || '').slice(0, 600)}`);
await browser.close(); // cierra la conexión CDP, NO la ventana

#!/usr/bin/env node
// Captura el tráfico real de la SPA RCV (consdcvinternetui) con Playwright.
// REGLA DE ORO: UN solo login, sin bucles de reintento, pausas humanas, headful.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import pw from '/Users/AIagenteia/nexus/conector-navegador/node_modules/playwright/index.js';
const { chromium } = pw;

const rutArg = process.argv[2] || '77271121-2';
const cred = JSON.parse(fs.readFileSync(path.join(os.homedir(), 'nexus', 'credenciales.json'), 'utf8'));
const emp = cred.sii.empresas[rutArg];
const [rutSinDv, dv] = emp.rut.split('-');
const pause = (ms) => new Promise(r => setTimeout(r, ms));

const profile = '/tmp/sii-capture-profile';
fs.rmSync(profile, { recursive: true, force: true });

const captures = [];
const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chrome',
  headless: false,
  viewport: { width: 1280, height: 900 },
});
const page = ctx.pages()[0] || await ctx.newPage();

page.on('request', req => {
  const u = req.url();
  if (u.includes('consdcvinternetui') && (u.includes('services') || u.includes('facadeService'))) {
    const h = req.headers();
    captures.push({ kind: 'req', method: req.method(), url: u, headers: h, postData: req.postData() });
  }
});
page.on('response', async res => {
  const u = res.url();
  if (u.includes('consdcvinternetui') && (u.includes('services') || u.includes('facadeService'))) {
    let body = null;
    try { body = await res.text(); } catch {}
    captures.push({ kind: 'res', status: res.status(), url: u, body: body ? body.slice(0, 4000) : null });
  }
});
page.on('download', async dl => {
  const dest = '/tmp/sii-dl-' + dl.suggestedFilename();
  await dl.saveAs(dest).catch(()=>{});
  console.log('   DOWNLOAD:', dl.suggestedFilename(), '->', dest);
});

console.log('1) Login (UNA vez)...');
await page.goto('https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html', { waitUntil: 'domcontentloaded' });
await pause(1500);
await page.fill('#rutcntr', emp.rut).catch(async () => { await page.fill('input[name="rut"]', rutSinDv); });
await page.fill('#clave', emp.clave).catch(async () => { await page.fill('input[name="clave"]', emp.clave); });
await pause(1200);
await page.click('#bt_ingresar').catch(() => page.click('button[type="submit"]'));
await page.waitForLoadState('networkidle').catch(() => {});
await pause(3000);
const urlTrasLogin = page.url();
console.log('   url tras login:', urlTrasLogin);
if (/IngresoRutClave|CAutInicio/.test(urlTrasLogin)) {
  console.log('!! Login NO avanzó. ABORTO (regla de oro: no reintentar login).');
  fs.writeFileSync('/tmp/sii-capture-out.json', JSON.stringify({ aborted: 'login', urlTrasLogin }, null, 2));
  await ctx.close();
  process.exit(1);
}

console.log('2) Entrando al app RCV (sin reintentos de login)...');
await page.goto('https://www4.sii.cl/consdcvinternetui/', { waitUntil: 'domcontentloaded' }).catch(()=>{});
await pause(7000);
const urlApp = page.url();
console.log('   url app:', urlApp);
if (/IngresoRutClave|CAutInicio/.test(urlApp)) {
  console.log('!! El app rebotó a login. ABORTO (no reenvío credenciales).');
  fs.writeFileSync('/tmp/sii-capture-out.json', JSON.stringify({ aborted: 'app-bounce', urlApp, captures }, null, 2));
  await ctx.close();
  process.exit(1);
}

// Interacción mínima: seleccionar periodo y consultar.
try {
  await pause(2000);
  const ui0 = await page.evaluate(() => ({
    sels: [...document.querySelectorAll('select')].map(s => ({ id: s.id, name: s.name, opts: [...s.options].map(o => o.value + ':' + o.text).slice(0, 24) })),
    btns: [...document.querySelectorAll('button, input[type=button], input[type=submit]')].map(b => (b.textContent || b.value || '').trim()).filter(Boolean),
  }));
  console.log('   UI inicial:', JSON.stringify(ui0));

  // Periodo: mes 04, año 2026 (probable que tenga datos para mediana empresa)
  await page.selectOption('#periodoMes', '04').catch(()=>{});
  await page.evaluate(() => { const s=document.querySelectorAll('select'); const a=[...s].find(x=>[...x.options].some(o=>o.value==='2026')); if(a){a.value='2026'; a.dispatchEvent(new Event('change',{bubbles:true}));} });
  await pause(2000);
  const btn = await page.$('button:has-text("Consultar"), input[value*="Consultar"]');
  if (btn) { console.log('   click Consultar (04/2026)'); await btn.click(); await pause(7000); }
} catch (e) { console.log('   consulta err:', e.message); }

// Click en primer link de resumen para disparar getDetalle
try {
  await pause(2000);
  const lnk = await page.$('table a, td a');
  if (lnk) { console.log('   click detalle'); await lnk.click(); await pause(6000); }
} catch (e) { console.log('   detalle err:', e.message); }

const ui = await page.evaluate(() => ({
  sels: [...document.querySelectorAll('select')].map(s => ({ id: s.id, name: s.name, opts: [...s.options].map(o => o.value + ':' + o.text).slice(0, 24) })),
  btns: [...document.querySelectorAll('button, input[type=button], input[type=submit]')].map(b => (b.textContent || b.value || '').trim()).filter(Boolean),
  title: document.title,
})).catch(e => ({ err: e.message }));

const cookies = await ctx.cookies();
const out = { urlTrasLogin, urlApp, urlFinal: page.url(), ui, captures, cookies: cookies.map(c => ({ name: c.name, domain: c.domain, path: c.path })) };
fs.writeFileSync('/tmp/sii-capture-out.json', JSON.stringify(out, null, 2));
console.log('\n=== CAPTURES (' + captures.length + ') -> /tmp/sii-capture-out.json ===');
for (const c of captures) {
  if (c.kind === 'req') {
    console.log(`\n>>> ${c.method} ${c.url}`);
    console.log('  hdr keys:', Object.keys(c.headers).join(','));
    const interesting = {}; for (const k of Object.keys(c.headers)) if (/token|conversation|transaction|csrf|authorization|x-/i.test(k)) interesting[k]=c.headers[k];
    if (Object.keys(interesting).length) console.log('  hdr especiales:', JSON.stringify(interesting));
    if (c.postData) console.log('  postData:', c.postData.slice(0, 600));
  } else {
    console.log(`<<< ${c.status} ${c.url}`);
    if (c.body) console.log('  body:', c.body.slice(0, 1200));
  }
}
console.log('\nCerrando en 4s...');
await pause(4000);
await ctx.close();

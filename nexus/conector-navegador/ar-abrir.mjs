// Abre una ventana Chromium persistente para mapear el wizard de AutoRed.
// Escucha en CDP :9333 para que los pasos siguientes se conecten sin re-loguear.
import { chromium } from 'playwright';
import fs from 'node:fs';

const JWT = JSON.parse(fs.readFileSync('/Users/AIagenteia/nexus/conector-autored/sesion.json', 'utf8')).jwt;

const ctx = await chromium.launchPersistentContext('/tmp/ar-prof', {
  headless: false,
  args: ['--remote-debugging-port=9333', '--window-size=1500,1000'],
  viewport: { width: 1440, height: 900 },
});

// cookie httpOnly de sesión: se inyecta y no hay que pasar por el login del front
await ctx.addCookies([{
  name: 'authorization', value: JWT, domain: 'autored.cl', path: '/',
  httpOnly: true, secure: true, sameSite: 'Lax',
}]);

const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('https://autored.cl/transferencias', { waitUntil: 'domcontentloaded' });
console.log('LISTA:', page.url());
// se queda viva; los pasos se conectan por CDP
await new Promise(() => {});

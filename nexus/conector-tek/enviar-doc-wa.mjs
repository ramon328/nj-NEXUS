import fs from 'node:fs'
const env = fs.readFileSync('/Users/AIagenteia/nexus/.env', 'utf8')
for (const line of env.split('\n')) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '') }
const { enviarKapso } = await import('/Users/AIagenteia/nexus/hub/kapso.mjs')
const T = '3ac6668cdb7613b9acdd3bdba7245e76e634fb3615316b44'
const msg = [
  '🏦 *CONEXIÓN A SANTANDER (tek) — ANA CLARA SPA*',
  'API HTTP de *solo lectura* sobre Santander Office Banking. Sirve saldos y movimientos reales cacheados (no cuelga). El re-login es bajo demanda.',
  '',
  '*1) DATOS DE CONEXIÓN*',
  '• Base URL local: http://127.0.0.1:7692',
  '• Base URL Tailscale: http://100.91.97.70:7692',
  '• Auth: header  x-api-token: <TOKEN>   ó   ?token=<TOKEN>',
  '• *TOKEN:* ' + T,
  '• Servicio: com.nexus.tek-api (KeepAlive)',
  '• Empresa: ANA CLARA SPA · cta cte CLP 000080280939',
  '',
  '*2) ENDPOINTS*',
  '• GET /health  (sin token) → estado y frescura',
  '• GET /saldos → saldos por cuenta',
  '• GET /movimientos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&cuenta=&q= → movimientos filtrados',
  '• GET /resumen?desde=&hasta= → ingresos, egresos, neto',
  '• POST /refresh → fuerza actualización',
  '',
  '*Ejemplo (saldos):*',
  'curl -H "x-api-token: ' + T + '" http://127.0.0.1:7692/saldos',
  '',
  '*3) REGLAS ANTI-BLOQUEO*',
  '1. En reposo con token vencido → NO se re-loguea.',
  '2. Pides data vencida → login para token nuevo.',
  '3. Reutiliza la sesión mientras siga viva.',
  '4. Data < 15 min se sirve del cache.',
  '',
  '*4) SEGURIDAD*',
  '• Solo lectura: NO transfiere ni firma nada.',
  '• Bind local + Tailscale; token obligatorio salvo /health.',
  '• El cuello es el login con Superclave (asistido por VNC); la sesión expira rápido.',
].join('\n')
const ids = await enviarKapso('56932945240', msg)
console.log('ENVIADO. ids:', JSON.stringify(ids))

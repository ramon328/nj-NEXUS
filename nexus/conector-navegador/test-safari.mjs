import { webkit } from 'playwright'

const creds = {
  usuario: 'ramon@dropout.cl',
  clave: 'Mallorca2026'
}

try {
  console.log('[Safari] Abriendo navegador...')
  const browser = await webkit.launch({ headless: true })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  
  console.log('[Safari] Navegando a login...')
  await page.goto('https://portal.goauto.cl/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
  
  console.log('[Safari] Ingresando credenciales...')
  await page.fill('input[type="email"], input[name*="email"], input[placeholder*="email"]', creds.usuario)
  await page.fill('input[type="password"], input[name*="password"]', creds.clave)
  await page.click('button, [role="button"]', { timeout: 5000 }).catch(() => page.press('Enter'))
  
  console.log('[Safari] Esperando login...')
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 })
  
  console.log('[Safari] Navegando a inventario...')
  await page.goto('https://www.portal.goauto.cl/admin/mallorcautos/inventario', { waitUntil: 'domcontentloaded', timeout: 30000 })
  
  console.log('[Safari] Esperando tabla...')
  await page.waitForSelector('tbody tr', { timeout: 20000 })
  
  const filas = await page.locator('tbody tr').count()
  console.log(`[Safari] ✅ Tabla cargada con ${filas} filas`)
  
  const primeraFila = await page.locator('tbody tr').first().textContent()
  console.log(`[Safari] Primera fila: ${primeraFila?.substring(0, 100)}`)
  
  await browser.close()
} catch (e) {
  console.error(`[Safari] ❌ Error: ${e.message}`)
  process.exit(1)
}

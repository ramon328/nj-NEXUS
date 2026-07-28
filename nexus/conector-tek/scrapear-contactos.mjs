// scrapear-contactos.mjs — recorre TODAS las empresas conectadas de un usuario y scrapea sus
// destinatarios inscritos (login-humano con TEK_SCRAPE_DEST). Merge acumulativo al cerebro tras
// cada empresa (si algo falla a mitad, lo ya scrapeado queda guardado). NO transfiere.
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, renameSync } from 'node:fs'
import * as cred from './credenciales.mjs'
import * as cerebro from './contactos-a-cerebro.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const USER = process.env.TEK_USER || 'nico'
const FRESCA = process.env.TEK_SESION_FRESCA === '1'   // login nuevo por empresa (cambio confiable)
const SOLO = (process.env.TEK_SOLO_EMPRESAS || '').split('|').map((s) => s.trim().toLowerCase()).filter(Boolean)
const log = (...a) => console.log(new Date().toISOString(), ...a)

function sesionFresca() {
  const f = join(DIR, USER === 'ramon' ? 'session.json' : `session-${USER}.json`)
  if (existsSync(f)) { try { renameSync(f, f + '.bak-' + Date.now()) } catch {} }
}

function scrapeEmpresa(empresa) {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      TEK_USER: USER,
      TEK_EMPRESA: String(empresa).replace(/ SPA$/i, '').trim() || empresa,
      TEK_CREAR: 'mapear',
      TEK_SCRAPE_DEST: '1',
      TEK_FORCE_EMPRESA: '1',
      TEK_LOCK_WAIT_MS: '150000',
    }
    const h = spawn(process.execPath, [join(DIR, 'login-humano.mjs')], { cwd: DIR, env })
    let out = ''
    h.stdout.on('data', (d) => { out += d.toString() }); h.stderr.on('data', () => {})
    const kill = setTimeout(() => { try { h.kill('SIGKILL') } catch {} }, 12 * 60_000)
    h.on('exit', () => {
      clearTimeout(kill)
      let res = null; const m = out.match(/RESULTADO:\s*(\{.*\})\s*$/m)
      if (m) { try { res = JSON.parse(m[1]) } catch {} }
      const c = res?.crear || {}
      resolve({ empresa, contactos: c.contactos ?? 0, paginas: c.paginas ?? 0, vacio: !!c.vacio, empresa_real: c.empresa_real || '', estado: c.estado || res?.estado })
    })
  })
}

let empresas = [...new Set((cred.listar(USER) || []).map((c) => c.empresa).filter(Boolean))]
if (SOLO.length) empresas = empresas.filter((e) => SOLO.some((s) => e.toLowerCase().includes(s)))
log(`scrapeando contactos de ${USER} en ${empresas.length} empresas${FRESCA ? ' (sesión fresca c/u)' : ''}…`)
const resumen = []
for (const e of empresas) {
  log(`→ ${e} …`)
  if (FRESCA) sesionFresca()   // login nuevo → aterriza en el selector → elige la empresa bien
  const r = await scrapeEmpresa(e)
  cerebro.merge()                 // dedup GLOBAL por RUT (data/scrape-destinatarios.json)
  const nota = cerebro.escribir() // reescribe la nota con todo lo acumulado (únicos)
  const switchOk = (r.empresa_real || '').toUpperCase().includes(String(e).replace(/ (SPA|LTDA|LIMITADA)$/i, '').toUpperCase().slice(0, 10))
  log(`   pidió "${e}" → cayó en "${r.empresa_real || '?'}" ${switchOk ? '✓' : '⚠ (¿mismo?)'} · ${r.vacio ? 'sin beneficiarios' : r.contactos + ' contactos'} · ÚNICOS acumulados: ${nota.total}`)
  resumen.push({ ...r, unicos: nota.total })
}
console.log('\n===== RESUMEN =====')
for (const r of resumen) console.log(`${String(r.contactos).padStart(4)} · ${r.empresa}${r.vacio ? ' (vacía)' : ''}`)
const fin = cerebro.escribir()
console.log(`\nTOTAL en el cerebro: ${fin.total} contactos en ${fin.empresas} empresas → ${fin.nota}`)

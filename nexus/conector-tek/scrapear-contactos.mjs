// scrapear-contactos.mjs — recorre TODAS las empresas conectadas de un usuario y scrapea sus
// destinatarios inscritos (login-humano con TEK_SCRAPE_DEST). Merge acumulativo al cerebro tras
// cada empresa (si algo falla a mitad, lo ya scrapeado queda guardado). NO transfiere.
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cred from './credenciales.mjs'
import * as cerebro from './contactos-a-cerebro.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const USER = process.env.TEK_USER || 'nico'
const log = (...a) => console.log(new Date().toISOString(), ...a)

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
      resolve({ empresa, contactos: c.contactos ?? 0, paginas: c.paginas ?? 0, vacio: !!c.vacio, estado: c.estado || res?.estado })
    })
  })
}

const empresas = [...new Set((cred.listar(USER) || []).map((c) => c.empresa).filter(Boolean))]
log(`scrapeando contactos de ${USER} en ${empresas.length} empresas…`)
const resumen = []
for (const e of empresas) {
  log(`→ ${e} …`)
  const r = await scrapeEmpresa(e)
  cerebro.merge()                 // acumula lo de ESTA empresa (data/scrape-destinatarios.json)
  const nota = cerebro.escribir() // reescribe la nota del cerebro con todo lo acumulado
  log(`   ${r.vacio ? '(sin beneficiarios)' : r.contactos + ' contactos'} · ${r.paginas} págs · acumulado cerebro: ${nota.total}`)
  resumen.push(r)
}
console.log('\n===== RESUMEN =====')
for (const r of resumen) console.log(`${String(r.contactos).padStart(4)} · ${r.empresa}${r.vacio ? ' (vacía)' : ''}`)
const fin = cerebro.escribir()
console.log(`\nTOTAL en el cerebro: ${fin.total} contactos en ${fin.empresas} empresas → ${fin.nota}`)

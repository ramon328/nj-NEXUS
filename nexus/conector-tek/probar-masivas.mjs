// probar-masivas.mjs — para un usuario, prueba UNA POR UNA si cada empresa conectada puede
// hacer TRANSFERENCIA MASIVA (llega al formulario de importación). DRY: NO sube nada, NO
// mueve plata (login-humano retorna en el form con TEK_MASIVA_DRY=1). Secuencial (una sesión
// de banco a la vez, respeta el candado). Resultado: tabla empresa → masiva sí/no.
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'
import * as cred from './credenciales.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const USER = process.env.TEK_USER || 'nico'
const log = (...a) => console.log(new Date().toISOString(), ...a)

function probar(empresa) {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      TEK_USER: USER,
      TEK_EMPRESA: String(empresa).replace(/ SPA$/i, '').trim() || empresa,
      TEK_MASIVA: 'subir',
      TEK_MASIVA_FILE: '/tmp/dummy-masiva.xlsx',
      TEK_MASIVA_DRY: '1',
      TEK_LOCK_WAIT_MS: '150000',
    }
    const h = spawn(process.execPath, [join(DIR, 'login-humano.mjs')], { cwd: DIR, env })
    let out = ''
    h.stdout.on('data', (d) => { out += d.toString() })
    h.stderr.on('data', () => {})
    const kill = setTimeout(() => { try { h.kill('SIGKILL') } catch {} }, 6 * 60_000)
    h.on('exit', () => {
      clearTimeout(kill)
      let res = null
      const m = out.match(/RESULTADO:\s*(\{.*\})\s*$/m)
      if (m) { try { res = JSON.parse(m[1]) } catch {} }
      const est = res?.masiva?.estado || res?.estado || 'sin_resultado'
      const puede = est === 'form_ok'
      resolve({ empresa, puede, estado: est, ocupado: est === 'ocupado' })
    })
  })
}

const empresas = [...new Set((cred.listar(USER) || []).map((c) => c.empresa).filter(Boolean))]
// ANA CLARA primero (control: sabemos que su masiva funciona) para validar el harness.
empresas.sort((a, b) => (/ana clara/i.test(a) ? -1 : 0) - (/ana clara/i.test(b) ? -1 : 0))
log(`probando MASIVA de ${USER} en ${empresas.length} empresas (dry, no mueve plata)…`)

const resultados = []
for (const e of empresas) {
  log(`→ ${e} …`)
  const r = await probar(e)
  log(`   ${r.puede ? '✅ PUEDE masiva' : '❌ no (' + r.estado + ')'}`)
  resultados.push(r)
}

writeFileSync('/tmp/masivas-por-empresa.json', JSON.stringify({ user: USER, resultados }, null, 2))
console.log('\n===== RESUMEN =====')
for (const r of resultados) console.log(`${r.puede ? '✅ MASIVA' : '❌ normal '} · ${r.empresa} (${r.estado})`)
console.log('\nJSON: /tmp/masivas-por-empresa.json')

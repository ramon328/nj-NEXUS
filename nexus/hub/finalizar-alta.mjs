// finalizar-alta.mjs — Cierra el alta de un usuario en segundo plano.
//
// POR QUÉ: OpenClaw (WhatsApp) lee su allowlist (channels.whatsapp.allowFrom) UNA
// vez, al conectar; no hay reload en caliente. Cuando agregamos un usuario nuevo
// escribimos su número en openclaw.json, pero OpenClaw no lo "ve" hasta recargar.
// Este script: (1) espera un poco para no cortar la respuesta en curso al fundador,
// (2) reinicia OpenClaw (reconecta solo, las credenciales de WhatsApp persisten en
// disco → sin QR), (3) cuando el canal vuelve a escuchar, le manda al usuario nuevo
// su WhatsApp de bienvenida (con reintentos). Se lanza DETACHED desde agregar_usuario.
//
// Uso: node finalizar-alta.mjs <numeroE164> <rutaMensaje|-->
//   rutaMensaje = archivo con el texto de bienvenida; "-" = solo recargar (sin enviar).

import { readFileSync } from 'node:fs'
import { execFile, spawn } from 'node:child_process'

const numero = process.argv[2] || ''
const rutaMsg = process.argv[3] || '-'
const HOME = process.env.HOME || ''
const CLI = `${HOME}/.npm-global/lib/node_modules/openclaw/openclaw.mjs`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function reiniciarOpenclaw() {
  return new Promise((res) => {
    let uid = ''
    try { uid = String(process.getuid()) } catch { uid = '' }
    execFile('launchctl', ['kickstart', '-k', `gui/${uid}/com.nexus.openclaw`], { timeout: 30000 }, () => res())
  })
}

function whatsappEscuchando() {
  try {
    const log = readFileSync('/tmp/nexus-openclaw.log', 'utf8')
    return /Listening for WhatsApp inbound/i.test(log.slice(-4000))
  } catch { return false }
}

function tokenGateway() {
  try { return JSON.parse(readFileSync(`${HOME}/.openclaw/openclaw.json`, 'utf8'))?.gateway?.auth?.token || '' } catch { return '' }
}

function enviar(target, msg) {
  return new Promise((res) => {
    const env = { ...process.env }
    const tk = tokenGateway(); if (tk) env.OPENCLAW_GATEWAY_TOKEN = tk
    // `script -q /dev/null` le da pseudo-TTY al CLI de OpenClaw (mucho más rápido/estable).
    const ch = spawn('script', ['-q', '/dev/null', process.execPath, CLI, 'message', 'send', '--channel', 'whatsapp', '--target', target, '--message', msg], { stdio: 'ignore', env })
    const to = setTimeout(() => { try { ch.kill('SIGKILL') } catch { /* */ } res(false) }, 120000)
    ch.on('exit', (c) => { clearTimeout(to); res(c === 0) })
    ch.on('error', () => { clearTimeout(to); res(false) })
  })
}

;(async () => {
  // 1) Margen para que la confirmación al fundador ya haya salido por WhatsApp.
  await sleep(30000)
  // 2) Recargar OpenClaw para que tome el número nuevo del allowlist.
  await reiniciarOpenclaw()
  // 3) Esperar a que el canal de WhatsApp vuelva a escuchar (hasta ~60s).
  for (let i = 0; i < 20 && !whatsappEscuchando(); i++) await sleep(3000)
  await sleep(4000)
  // 4) Enviar la bienvenida (si hay), con reintentos por si aún reconecta.
  if (rutaMsg && rutaMsg !== '-') {
    let msg = ''
    try { msg = readFileSync(rutaMsg, 'utf8') } catch { msg = '' }
    if (msg && numero) {
      for (let i = 0; i < 4; i++) { if (await enviar(numero, msg)) break; await sleep(8000) }
    }
  }
})().catch(() => process.exit(0))

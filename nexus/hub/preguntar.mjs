#!/usr/bin/env node
// preguntar.mjs — Puente WhatsApp → Nexus Desktop (hub). Recibe el mensaje del
// usuario (argumento o stdin), lo manda al hub (/api/chat, el MISMO cerebro del
// PC) y escribe en stdout SOLO la respuesta (reply), tal cual. Reintenta solo si
// falla, sin preguntarle nada al usuario.
//   node preguntar.mjs "tu mensaje" "+56999..."   (2º arg = remitente, opcional)
//   echo "mensaje" | node preguntar.mjs
// El 2º argumento es el número (E.164) de quien escribe. Sirve para que el cerebro
// pueda MANDARLE fotos por WhatsApp (1 mensaje por auto). Si no viene, igual responde
// en texto; solo no podrá enviar media a un destinatario concreto.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

let msg = (process.argv[2] || '').trim()
const de = (process.argv[3] || '').trim()
// Si el agente agrega --media (porque el usuario mandó foto/documento), adjuntamos
// las rutas de los archivos recibidos por WhatsApp en los últimos minutos. OpenClaw
// los deja en ~/.openclaw/media/inbound/<uuid>.<ext>. El cerebro los lee con visión.
const conMedia = process.argv.includes('--media')
function mediaReciente() {
  try {
    const dir = join(homedir(), '.openclaw', 'media', 'inbound')
    const ahora = Date.now()
    return readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp|pdf)$/i.test(f))
      .map((f) => { const p = join(dir, f); return { p, t: statSync(p).mtimeMs } })
      .filter((x) => ahora - x.t < 180000) // recibidos en los últimos 3 min
      .sort((a, b) => a.t - b.t)
      .map((x) => x.p)
  } catch { return [] }
}
if (!msg) { try { msg = readFileSync(0, 'utf8').trim() } catch { /* sin stdin */ } }
// Si vino con foto/documento pero SIN texto, no es "vacío": que el cerebro lo procese
// (típico al subir un auto mandando solo la foto y los papeles).
if (!msg && conMedia) msg = '[El usuario envió una o más imágenes/documentos sin texto.]'
if (!msg) { process.stdout.write('(mensaje vacío)'); process.exit(0) }
// Guard: si el agente mandó el MARCADOR literal (no reemplazó el placeholder),
// no proceses basura ni gastes tokens: pide que repita.
if (/AQU[IÍ] EL MENSAJE|<MENSAJE>|MENSAJE DEL USUARIO TAL CUAL/i.test(msg)) {
  process.stdout.write('Perdón, no te entendí bien. ¿Me lo repites?')
  process.exit(0)
}

async function pedir() {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 170000) // 170s por intento (consultas pesadas: SII/Aliace)
  try {
    const r = await fetch('http://127.0.0.1:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ historial: [{ role: 'user', content: msg }], de, media: conMedia ? mediaReciente() : [] }),
      signal: ctrl.signal,
    })
    const j = await r.json()
    return (j.reply || '').toString().trim()
  } finally { clearTimeout(t) }
}

let reply = ''
for (let intento = 1; intento <= 2 && !reply; intento++) {
  try { reply = await pedir() } catch { /* reintenta solo */ }
}
// Si tras 2 intentos no hay respuesta, mensaje limpio (sin "¿reintento?").
process.stdout.write(reply || 'No pude obtenerlo en este momento; lo estoy reintentando — vuelve a escribirme en un ratito.')

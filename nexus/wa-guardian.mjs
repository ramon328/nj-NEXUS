#!/usr/bin/env node
// wa-guardian.mjs — GUARDIÁN de la sesión de WhatsApp de OpenClaw.
// Corre cada pocos minutos (LaunchAgent com.nexus.wa-guardian):
//   - Si WhatsApp está VINCULADO y CONECTADO → respalda las credenciales (siempre
//     el último estado bueno). Así nunca perdemos una sesión válida.
//   - Si está caído/desvinculado y hay respaldo bueno → RESTAURA las credenciales y
//     reinicia el canal (recupera SIN QR los casos recuperables: apagones, cortes,
//     desconexiones transitorias, borrado de creds por OpenClaw).
//   - Anti-loop: si tras restaurar sigue sin vincularse (logout REAL del servidor de
//     WhatsApp), no insiste; marca que hace falta re-vincular con el teléfono (QR).
//
// La sesión SOLO se puede crear de cero desde el teléfono (QR). Esto evita PERDERLA
// una vez creada.
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, statSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

const HOME = os.homedir()
const OC = path.join(HOME, '.npm-global', 'lib', 'node_modules', 'openclaw', 'openclaw.mjs')
const CREDS = path.join(HOME, '.openclaw', 'credentials', 'whatsapp')     // sesión activa (Baileys)
const BK = path.join(HOME, '.openclaw', 'wa-backups')                     // respaldos
const GOOD = path.join(BK, 'good')                                        // último estado bueno
const STATE = path.join(HOME, 'nexus', 'wa-guardian-state.json')
const FLAG_RELINK = path.join(HOME, '.openclaw', 'WA-NEEDS-RELINK.txt')
const LABEL = 'com.nexus.openclaw'
const UID = process.getuid()

const log = (m) => { const l = `[wa-guardian ${new Date().toISOString()}] ${m}`; console.log(l); try { appendFileSync('/tmp/nexus-wa-guardian.log', l + '\n') } catch { /* */ } }
const leer = (p, d) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return d } }
const guardar = (p, o) => { try { writeFileSync(p, JSON.stringify(o, null, 2)) } catch { /* */ } }

// Lee el estado del canal WhatsApp desde openclaw.
function estadoWhatsApp() {
  let out = ''
  try { out = execFileSync('/usr/local/bin/node', [OC, 'channels', 'status'], { timeout: 25000 }).toString() } catch (e) { out = String(e.stdout || '') }
  const line = out.split('\n').find((l) => /whatsapp/i.test(l)) || ''
  const linked = /\blinked\b/.test(line) && !/\bnot linked\b/.test(line)
  const connected = /\bconnected\b/.test(line) && !/\bdisconnected\b/.test(line)
  return { ok: linked && connected, linked, connected, line: line.trim() }
}

function archivosDe(dir) { try { return readdirSync(dir).filter((f) => { try { return statSync(path.join(dir, f)).isFile() } catch { return false } }) } catch { return [] } }
function copiarDir(src, dst) {
  mkdirSync(dst, { recursive: true })
  for (const f of archivosDe(src)) copyFileSync(path.join(src, f), path.join(dst, f))
}
// Firma del respaldo bueno (para el anti-loop): tamaños de sus archivos.
function firma(dir) { return archivosDe(dir).sort().map((f) => `${f}:${statSync(path.join(dir, f)).size}`).join('|') || 'vacio' }

function respaldar() {
  if (!archivosDe(CREDS).length) return   // no respaldar un estado vacío
  copiarDir(CREDS, GOOD)
  // rotación: guarda una copia con fecha, deja las últimas 5
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  copiarDir(CREDS, path.join(BK, ts))
  const rot = readdirSync(BK).filter((d) => /^\d{4}-/.test(d)).sort()
  for (const d of rot.slice(0, -5)) { try { rmSync(path.join(BK, d), { recursive: true, force: true }) } catch { /* */ } }
}

function restaurar() {
  // limpia la sesión (vacía) y copia el respaldo bueno
  try { rmSync(CREDS, { recursive: true, force: true }) } catch { /* */ }
  copiarDir(GOOD, CREDS)
}

function reiniciarCanal() {
  try { execFileSync('launchctl', ['kickstart', '-k', `gui/${UID}/${LABEL}`], { timeout: 20000 }); return true } catch (e) { log('no pude reiniciar openclaw: ' + e.message); return false }
}

function main() {
  const st = leer(STATE, { restoreFails: 0, lastSig: '', needsRelink: false })
  const wa = estadoWhatsApp()

  if (wa.ok) {
    // Sesión sana → respaldar y limpiar banderas.
    respaldar()
    if (st.needsRelink || st.restoreFails) log('WhatsApp OK → respaldado; banderas limpiadas')
    try { if (existsSync(FLAG_RELINK)) rmSync(FLAG_RELINK) } catch { /* */ }
    guardar(STATE, { restoreFails: 0, lastSig: firma(GOOD), needsRelink: false, lastGoodAt: new Date().toISOString() })
    return
  }

  // Está caído/desvinculado.
  const hayRespaldo = archivosDe(GOOD).length > 0
  if (!hayRespaldo) {
    log(`WhatsApp caído y SIN respaldo bueno → hace falta re-vincular con el teléfono (QR). ${wa.line}`)
    writeFileSync(FLAG_RELINK, `WhatsApp desvinculado ${new Date().toISOString()}. No hay respaldo previo: re-vincular con el teléfono (QR).\n`)
    guardar(STATE, { ...st, needsRelink: true })
    return
  }

  const sig = firma(GOOD)
  // Si YA restauramos ESTE respaldo y no funcionó (>=2 veces), es un logout REAL → parar.
  if (sig === st.lastSig && st.restoreFails >= 2) {
    if (!st.needsRelink) log('Restaurar no reconectó (logout real de WhatsApp) → hace falta re-vincular con el teléfono (QR).')
    writeFileSync(FLAG_RELINK, `WhatsApp desvinculado ${new Date().toISOString()}. El respaldo no reconecta (logout del servidor): re-vincular con el teléfono (QR).\n`)
    guardar(STATE, { ...st, needsRelink: true })
    return
  }

  // Intento de recuperación SIN QR: restaurar credenciales + reiniciar el canal.
  log(`WhatsApp caído → restaurando credenciales y reiniciando el canal (intento ${(sig === st.lastSig ? st.restoreFails : 0) + 1}). ${wa.line}`)
  restaurar()
  reiniciarCanal()
  const nuevoFails = (sig === st.lastSig ? st.restoreFails : 0) + 1
  guardar(STATE, { restoreFails: nuevoFails, lastSig: sig, needsRelink: false, lastRestoreAt: new Date().toISOString() })
  // La verificación real ocurre en la PRÓXIMA corrida (dando tiempo a reconectar).
}

main()

// backfill-tag.mjs — FUENTE OFICIAL de patentes con TAG: baja el Excel mensual que
// Tag Tico manda a ventas@mallorcautos.cl ("DETALLE TAG ... / FACTURA TAG", adjunto
// "ANA CLARA ... .xlsx" con hojas por año: PLACA, ACCION=TAG NUEVO/TRASPASO...) y extrae
// todas las placas con tag. Cachea en tag-patentes-historicas.json.
// (Antes se escaneaban asuntos de correos → incompleto; este Excel es la lista real.)

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { accessToken } from './enviar.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE = join(__dirname, 'tag-patentes-historicas.json')
const XLSX = join(__dirname, 'cache', 'tagtico-tags.xlsx')
const PARSER = join(__dirname, 'parse-tagtico.py')
const PY = join(process.env.HOME || '', 'nexus', 'conector-mallorca', '.venv', 'bin', 'python')

const api = (at, p) => fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + p, { headers: { Authorization: 'Bearer ' + at }, signal: AbortSignal.timeout(30000) }).then((r) => r.json())

function parsear(path) {
  return new Promise((resolve, reject) => {
    const ch = spawn(PY, [PARSER, path], { env: { ...process.env } })
    let out = '', err = ''
    ch.stdout.on('data', (d) => (out += d)); ch.stderr.on('data', (d) => (err += d))
    ch.on('close', () => { try { resolve(JSON.parse(out).patentes || []) } catch (e) { reject(new Error('parser: ' + (err || e.message).slice(0, 160))) } })
    ch.on('error', reject)
  })
}

export async function backfill() {
  const { at } = await accessToken()
  // Último correo de Tag Tico con el Excel adjunto (detalle/factura mensual).
  const q = 'from:tagtico.cl filename:xlsx (subject:("detalle tag") OR subject:("factura tag") OR filename:("ANA CLARA"))'
  const r = await api(at, 'messages?maxResults=1&q=' + encodeURIComponent(q))
  if (r.error) throw new Error(JSON.stringify(r.error).slice(0, 120))
  if (!(r.messages || []).length) throw new Error('no encontré el Excel mensual de Tag Tico en el buzón')
  const d = await api(at, 'messages/' + r.messages[0].id + '?format=full')
  let att = null
  const walk = (p) => { if (!p) return; if ((p.filename || '').toLowerCase().endsWith('.xlsx') && p.body?.attachmentId) att = { fn: p.filename, aid: p.body.attachmentId }; for (const c of p.parts || []) walk(c) }
  walk(d.payload)
  if (!att) throw new Error('el correo de Tag Tico no trae adjunto .xlsx')
  const a = await api(at, 'messages/' + r.messages[0].id + '/attachments/' + att.aid)
  const buf = Buffer.from(a.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  if (!existsSync(dirname(XLSX))) mkdirSync(dirname(XLSX), { recursive: true })
  writeFileSync(XLSX, buf)
  const patentes = await parsear(XLSX)
  const data = { actualizado: new Date().toISOString(), fuente: att.fn, correo_fecha: (d.payload?.headers || []).find((h) => h.name === 'Date')?.value || '', patentes }
  writeFileSync(CACHE, JSON.stringify(data, null, 2))
  return data
}

export function patentesHistoricas() {
  try { return new Set(JSON.parse(readFileSync(CACHE, 'utf8')).patentes || []) } catch { return new Set() }
}
export function cacheInfo() {
  try { const d = JSON.parse(readFileSync(CACHE, 'utf8')); return { actualizado: d.actualizado, total: (d.patentes || []).length, fuente: d.fuente } } catch { return null } }

// CLI: node backfill-tag.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  backfill().then((d) => console.log(`OK · ${d.patentes.length} patentes con TAG · fuente: ${d.fuente} (${d.correo_fecha})`)).catch((e) => { console.error('ERR', e.message); process.exit(1) })
}

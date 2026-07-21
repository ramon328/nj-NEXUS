// backfill-tag.mjs — Deduce qué PATENTES ya tienen TAG a partir del HISTORIAL de correos
// del buzón de Mallorca (asuntos de Tag Tico: "Contrato ... PPU", y los "Traspaso Tag" /
// "Tag nuevo" enviados). Cachea el set en tag-patentes-historicas.json para que el conteo
// del Excel sea rápido. Complementa a los leads de registro.mjs (que son los nuevos).

import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { accessToken } from './enviar.mjs'
import { normPatente } from './autos-tag.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE = join(__dirname, 'tag-patentes-historicas.json')
// Patente chilena: LLLL## | LL#### | LLL### (autos/motos)
const PAT_RE = /\b([A-Z]{4}\d{2}|[A-Z]{2}\d{4}|[A-Z]{3}\d{3})\b/g

const api = (at, p) => fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + p, { headers: { Authorization: 'Bearer ' + at }, signal: AbortSignal.timeout(20000) }).then((r) => r.json())

async function enChunks(items, n, fn) {
  const out = []
  for (let i = 0; i < items.length; i += n) out.push(...await Promise.all(items.slice(i, i + n).map(fn)))
  return out
}

export async function backfill({ meses = 12, max = 300 } = {}) {
  const { at } = await accessToken()
  const q = `(from:tagtico.cl OR subject:("traspaso tag") OR subject:("tag nuevo") OR subject:(contrato)) newer_than:${meses}m`
  // Junta ids (paginado, con tope)
  const ids = []
  let tok = ''
  do {
    const r = await api(at, 'messages?maxResults=100&q=' + encodeURIComponent(q) + (tok ? '&pageToken=' + tok : ''))
    if (r.error) throw new Error(JSON.stringify(r.error).slice(0, 120))
    for (const mm of (r.messages || [])) ids.push(mm.id)
    tok = r.nextPageToken || ''
  } while (tok && ids.length < max)

  // Trae solo el Subject de cada uno, en paralelo (chunks de 12)
  const subs = await enChunks(ids.slice(0, max), 12, async (id) => {
    const d = await api(at, 'messages/' + id + '?format=metadata&metadataHeaders=Subject')
    return (d.payload?.headers || []).find((x) => x.name === 'Subject')?.value || ''
  })

  const pats = new Set()
  for (const s of subs) for (const mt of String(s).toUpperCase().matchAll(PAT_RE)) pats.add(normPatente(mt[1]))

  const data = { actualizado: new Date().toISOString(), correos: ids.length, patentes: [...pats] }
  writeFileSync(CACHE, JSON.stringify(data, null, 2))
  return data
}

// Lee el cache (set de patentes normalizadas). Vacío si no existe.
export function patentesHistoricas() {
  try { return new Set(JSON.parse(readFileSync(CACHE, 'utf8')).patentes || []) } catch { return new Set() }
}
export function cacheInfo() {
  try { const d = JSON.parse(readFileSync(CACHE, 'utf8')); return { actualizado: d.actualizado, total: (d.patentes || []).length, correos: d.correos } } catch { return null } }

// CLI: node backfill-tag.mjs [meses]
if (import.meta.url === `file://${process.argv[1]}`) {
  const meses = Number(process.argv[2] || 12)
  backfill({ meses }).then((d) => console.log(`OK · ${d.correos} correos · ${d.patentes.length} patentes con TAG detectadas`)).catch((e) => { console.error('ERR', e.message); process.exit(1) })
}

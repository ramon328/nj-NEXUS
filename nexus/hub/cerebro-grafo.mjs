// cerebro-grafo.mjs — Construye el grafo del segundo cerebro (vault de Obsidian)
// para la vista 3D del Centro de IAs. TODO el I/O es ASÍNCRONO (fs/promises → corre
// en el threadpool de libuv), así NUNCA congela el event loop mono-hilo del Hub —a
// diferencia de vista.datosCerebro(), que usa readFileSync y lo cuelga si el vault
// está en iCloud (archivos "dataless" que bloquean la lectura hasta descargarse).
//
// Devuelve { nodes, links, total, enlaces, ts } tal cual lo espera 3d-force-graph:
//   node = { id: rutaRelativa, titulo, grupo(=carpeta raíz), val(=1+grado) }
//   link = { source: id, target: id }  (por cada [[wikilink]] resuelto)

import { readdir, readFile, writeFile, rename } from 'node:fs/promises'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative, basename, sep } from 'node:path'

function cerebroRaiz() {
  const base = process.env.CEREBRO_RUTA || join(process.env.HOME || '', 'nexus', 'cerebro')
  try { return realpathSync(base) } catch { return base }
}

// Recorre el árbol buscando .md. NO sigue symlinks (evita loops/cuelgues) e ignora
// ocultos (.obsidian, etc.). Límite de profundidad por seguridad.
async function walkMd(dir, acc = [], depth = 0) {
  if (depth > 7) return acc
  let ents = []
  try { ents = await readdir(dir, { withFileTypes: true }) } catch { return acc }
  for (const e of ents) {
    if (e.name.startsWith('.')) continue
    if (e.isSymbolicLink()) continue
    const abs = join(dir, e.name)
    if (e.isDirectory()) await walkMd(abs, acc, depth + 1)
    else if (e.isFile() && /\.md$/i.test(e.name)) acc.push(abs)
  }
  return acc
}

export async function construirGrafo({ max = 3000 } = {}) {
  const raiz = cerebroRaiz()
  const files = (await walkMd(raiz)).slice(0, max)
  const nodes = []
  const idByTitle = new Map()
  const contenidos = []
  // Lee en tandas (paralelo acotado) para no abrir cientos de descriptores a la vez.
  const LOTE = 24
  for (let i = 0; i < files.length; i += LOTE) {
    const tanda = files.slice(i, i + LOTE)
    const leidos = await Promise.all(tanda.map(async (abs) => {
      let txt = ''
      try { txt = await readFile(abs, 'utf8') } catch { /* nota ilegible: se ignora su texto */ }
      return { abs, txt }
    }))
    for (const { abs, txt } of leidos) {
      const rel = relative(raiz, abs)
      const titulo = basename(abs).replace(/\.md$/i, '')
      const grupo = rel.includes(sep) ? rel.split(sep)[0] : 'raíz'
      nodes.push({ id: rel, titulo, grupo, val: 1 })
      if (!idByTitle.has(titulo)) idByTitle.set(titulo, rel)
      contenidos.push({ id: rel, txt })
    }
  }
  const links = []
  const vistos = new Set()
  for (const { id, txt } of contenidos) {
    const matches = txt.match(/\[\[([^\]]+)\]\]/g) || []
    for (const m of matches) {
      const target = m.slice(2, -2).split('|')[0].split('#')[0].trim()
      const base = target.split('/').pop().replace(/\.md$/i, '')
      const tid = idByTitle.get(target) || idByTitle.get(base)
      if (tid && tid !== id) {
        const key = id + '>' + tid
        if (!vistos.has(key)) { vistos.add(key); links.push({ source: id, target: tid }) }
      }
    }
  }
  const grado = {}
  for (const l of links) { grado[l.source] = (grado[l.source] || 0) + 1; grado[l.target] = (grado[l.target] || 0) + 1 }
  for (const n of nodes) n.val = 1 + (grado[n.id] || 0)
  return { nodes, links, total: nodes.length, enlaces: links.length, ts: Date.now() }
}

// Modo CLI:
//   node cerebro-grafo.mjs            → imprime el grafo (JSON) por stdout
//   node cerebro-grafo.mjs salida.json → lo ESCRIBE en salida.json (atómico: tmp+rename)
// El Hub lo corre así, DETACHED y sin esperarlo, para pre-generar el archivo que luego
// sirve el endpoint. Al importarse como módulo, este bloque no se ejecuta.
if (process.argv[1] && (() => { try { return fileURLToPath(import.meta.url) === realpathSync(process.argv[1]) } catch { return false } })()) {
  const salida = process.argv[2]
  construirGrafo({ max: 3000 })
    .then(async (g) => {
      const json = JSON.stringify(g)
      if (salida) { const tmp = salida + '.tmp'; await writeFile(tmp, json); await rename(tmp, salida) }
      else process.stdout.write(json)
    })
    .catch((e) => { process.stderr.write(String(e?.message || e)); process.exitCode = 1 })
}

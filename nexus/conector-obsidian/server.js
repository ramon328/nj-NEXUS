// server.js — Conector del Segundo Cerebro (bóveda Obsidian).
// Expone una API local sobre la carpeta de notas Markdown de ~/nexus/cerebro:
//   GET  /health             estado + nº de notas
//   GET  /listar             árbol de notas (.md) con rutas relativas
//   GET  /buscar?q=&limite=  búsqueda en título + contenido, con fragmento
//   GET  /nota?ruta=         leer una nota
//   POST /nota               crear / agregar / sobrescribir una nota (escritura)
// Escucha SOLO en 127.0.0.1. Toda ruta se valida para no salir de la bóveda.
// Cada escritura se audita en Supabase (log_acciones) vía el helper compartido.

import express from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve, relative, sep } from 'node:path'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, appendFileSync, statSync } from 'node:fs'
import { registrarAccion } from '../shared/supabase.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
try { process.loadEnvFile(join(__dirname, '..', '.env')) } catch { /* opcional */ }

const PORT = Number(process.env.PUERTO_CEREBRO || 8081)
const HOST = process.env.CEREBRO_HOST || '127.0.0.1'
// Raíz de la bóveda. Por defecto ~/nexus/cerebro (hermana de este servicio).
const RAIZ = resolve(process.env.CEREBRO_RUTA || join(__dirname, '..', 'cerebro'))

if (!existsSync(RAIZ)) mkdirSync(RAIZ, { recursive: true })

// --- Seguridad de rutas: todo queda dentro de la bóveda y termina en .md ---
function rutaSegura(rel) {
  if (!rel || typeof rel !== 'string') throw new Error('ruta vacía')
  let limpia = rel.replace(/^\/+/, '').trim()
  if (!limpia.toLowerCase().endsWith('.md')) limpia += '.md'
  const abs = resolve(RAIZ, limpia)
  const dentro = abs === RAIZ || abs.startsWith(RAIZ + sep)
  if (!dentro) throw new Error('ruta fuera de la bóveda')
  return { abs, rel: relative(RAIZ, abs) }
}

// --- Recorrer la bóveda y juntar las notas .md (ignora .obsidian y ocultos) ---
function listarNotas(dir = RAIZ, acc = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue
    const abs = join(dir, ent.name)
    if (ent.isDirectory()) listarNotas(abs, acc)
    else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) {
      const st = statSync(abs)
      acc.push({ ruta: relative(RAIZ, abs), titulo: ent.name.replace(/\.md$/i, ''), modificado: st.mtimeMs, bytes: st.size })
    }
  }
  return acc
}

// Normaliza para buscar: minúsculas + sin acentos (así "empresas" matchea "Empresas").
function normal(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') }
// Palabras vacías: se ignoran para que una pregunta natural ("qué sabes de mis
// empresas y proyectos") busque por sus términos reales (empresas, proyectos).
const STOP = new Set(['que', 'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'en', 'al', 'mis', 'mi', 'tu', 'tus', 'su', 'sus', 'me', 'te', 'se', 'lo', 'le', 'les', 'sobre', 'para', 'por', 'con', 'sin', 'es', 'son', 'como', 'cual', 'cuales', 'dime', 'dame', 'sabes', 'saber', 'busca', 'buscar', 'hay', 'tiene', 'tienen', 'todo', 'todos', 'toda', 'todas', 'esta', 'este', 'esto', 'esa', 'ese', 'eso', 'segun', 'nota', 'notas', 'cerebro'])
function tokeniza(q) {
  return [...new Set(normal(q).split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 3 && !STOP.has(w)))]
}
// Fragmento alrededor del PRIMER término que aparece.
function fragmento(texto, tokens) {
  const t = normal(texto)
  let i = -1, tok = ''
  for (const w of tokens) { const k = t.indexOf(w); if (k >= 0 && (i < 0 || k < i)) { i = k; tok = w } }
  if (i < 0) return texto.slice(0, 160).replace(/\s+/g, ' ').trim()
  const ini = Math.max(0, i - 70)
  return (ini > 0 ? '…' : '') + texto.slice(ini, i + tok.length + 90).replace(/\s+/g, ' ').trim() + '…'
}

const app = express()
app.use(express.json({ limit: '2mb' }))

app.get('/health', (_req, res) => {
  let n = 0
  try { n = listarNotas().length } catch {}
  res.json({ ok: true, servicio: 'conector-obsidian', raiz: RAIZ, notas: n, ts: Date.now() })
})

app.get('/listar', (_req, res) => {
  try {
    const notas = listarNotas().sort((a, b) => b.modificado - a.modificado)
    res.json({ raiz: RAIZ, total: notas.length, notas })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/buscar', (req, res) => {
  const q = String(req.query.q || '').trim()
  const limite = Math.min(Number(req.query.limite || 20), 100)
  if (!q) return res.json({ q, total: 0, resultados: [] })
  const frase = normal(q)
  const tokens = tokeniza(q)
  // Si la query era toda stopwords/corta, cae a la frase entera como único término.
  const terminos = tokens.length ? tokens : (frase ? [frase] : [])
  if (!terminos.length) return res.json({ q, total: 0, resultados: [] })
  const out = []
  for (const n of listarNotas()) {
    let texto = ''
    try { texto = readFileSync(join(RAIZ, n.ruta), 'utf8') } catch { continue }
    const tit = normal(n.titulo), cuer = normal(texto)
    let score = 0, hits = 0
    for (const w of terminos) {
      const enT = tit.includes(w), enC = cuer.includes(w)
      if (enT) score += 3
      if (enC) score += 1
      if (enT || enC) hits++
    }
    if (!hits) continue
    if (frase.length > 3 && (tit.includes(frase) || cuer.includes(frase))) score += 4  // bonus frase exacta
    out.push({ ruta: n.ruta, titulo: n.titulo, modificado: n.modificado, score, hits, fragmento: fragmento(texto, terminos) })
  }
  // Ordena por nº de términos que matchean, luego score, luego más reciente.
  out.sort((a, b) => b.hits - a.hits || b.score - a.score || b.modificado - a.modificado)
  res.json({ q, total: out.length, resultados: out.slice(0, limite).map(({ hits, ...r }) => r) })
})

app.get('/nota', (req, res) => {
  try {
    const { abs, rel } = rutaSegura(String(req.query.ruta || ''))
    if (!existsSync(abs)) return res.status(404).json({ error: 'no existe', ruta: rel })
    res.json({ ruta: rel, contenido: readFileSync(abs, 'utf8') })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// GET /dia?fecha=YYYY-MM-DD[&hasta=YYYY-MM-DD]
// "¿Qué hice hoy?" — devuelve lo que REALMENTE pasó ese día, sacado del pipeline
// de Plaud: las reuniones ya destiladas en `90-Agente/Plaud/_Análisis — <mes>.md`
// (una sección "### <fecha> · <título>" por reunión) + las grabaciones crudas de
// esa fecha (los archivos se llaman "<fecha> — <título>.md").
// Vive ACÁ y no en el hub a propósito: el hub es de 1 hilo y leer disco en la ruta
// del mensaje lo cuelga. Acá el I/O es barato (1-2 archivos por mes consultado).
const PLAUD_DIR = join(RAIZ, '90-Agente', 'Plaud')

function seccionesDelAnalisis(mes) {         // mes = 'YYYY-MM'
  const f = join(PLAUD_DIR, `_Análisis — ${mes}.md`)
  if (!existsSync(f)) return []
  const txt = readFileSync(f, 'utf8')
  const out = []
  // Corta por "### YYYY-MM-DD · Título" y se queda con el cuerpo hasta el próximo ###.
  const re = /^###\s+(\d{4}-\d{2}-\d{2})\s*·\s*(.+)$/gm
  let m, prev = null
  while ((m = re.exec(txt)) !== null) {
    if (prev) out.push({ ...prev, cuerpo: txt.slice(prev._fin, m.index).trim() })
    prev = { fecha: m[1], titulo: m[2].trim(), _fin: re.lastIndex }
  }
  if (prev) out.push({ ...prev, cuerpo: txt.slice(prev._fin).trim() })
  return out.map(({ _fin, ...s }) => s)
}

function grabacionesDe(fechas) {
  if (!existsSync(PLAUD_DIR)) return []
  return readdirSync(PLAUD_DIR)
    .filter((n) => n.toLowerCase().endsWith('.md') && !n.startsWith('_'))
    .filter((n) => fechas.some((f) => n.startsWith(f)))
    .map((n) => ({
      fecha: n.slice(0, 10),
      titulo: n.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}\s*—\s*/, ''),
      ruta: relative(RAIZ, join(PLAUD_DIR, n)),
    }))
}

function rangoFechas(desde, hasta) {
  const out = []
  const d = new Date(desde + 'T00:00:00Z'), h = new Date((hasta || desde) + 'T00:00:00Z')
  for (let x = d; x <= h; x = new Date(x.getTime() + 86400000)) out.push(x.toISOString().slice(0, 10))
  return out.slice(0, 40)   // tope de cordura
}

app.get('/dia', (req, res) => {
  try {
    const hoyCL = new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10) // America/Santiago ~UTC-4
    const desde = String(req.query.fecha || hoyCL).slice(0, 10)
    const hasta = String(req.query.hasta || desde).slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
      return res.status(400).json({ error: 'fecha inválida (usa YYYY-MM-DD)' })
    }
    const fechas = rangoFechas(desde, hasta)
    const meses = [...new Set(fechas.map((f) => f.slice(0, 7)))]
    const reuniones = meses.flatMap(seccionesDelAnalisis).filter((s) => fechas.includes(s.fecha))
    const grabaciones = grabacionesDe(fechas)
    res.json({
      desde, hasta, hoy: hoyCL,
      total_reuniones: reuniones.length,
      reuniones,                       // [{fecha, titulo, cuerpo}] ya destilado
      grabaciones,                     // [{fecha, titulo, ruta}] crudas de Plaud
      nota: reuniones.length || grabaciones.length
        ? 'Esto es lo que el pipeline de Plaud registró en esas fechas.'
        : 'No hay nada registrado en Plaud para esas fechas (no significa que no haya pasado nada: puede que no se haya grabado o que el pipeline aún no procese la grabación).',
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Crear / agregar / sobrescribir una nota.
// modo: 'crear' (por defecto, no pisa: si existe crea copia con fecha) | 'agregar' | 'sobrescribir'
app.post('/nota', async (req, res) => {
  try {
    const { contenido = '', modo = 'crear', autor = '2cerebro' } = req.body || {}
    let { abs, rel } = rutaSegura(String(req.body?.ruta || ''))
    mkdirSync(dirname(abs), { recursive: true })

    let accion = modo
    if (modo === 'agregar' && existsSync(abs)) {
      appendFileSync(abs, (contenido.startsWith('\n') ? '' : '\n') + contenido, 'utf8')
    } else if (modo === 'sobrescribir' || !existsSync(abs)) {
      writeFileSync(abs, contenido, 'utf8')
      accion = existsSync(abs) && modo === 'sobrescribir' ? 'sobrescribir' : 'crear'
    } else {
      // modo 'crear' pero ya existe → no pisamos: creamos copia con sufijo de fecha
      const stamp = new Date().toISOString().slice(0, 10)
      const nuevo = rel.replace(/\.md$/i, ` (${stamp}).md`)
      ;({ abs, rel } = rutaSegura(nuevo))
      writeFileSync(abs, contenido, 'utf8')
      accion = 'crear-copia'
    }

    await registrarAccion({
      agente: autor, accion: `cerebro:${accion}`, descripcion: `Nota ${rel}`,
      recurso: rel, resultado: 'ok',
    })
    res.json({ ok: true, ruta: rel, accion })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

app.listen(PORT, HOST, () => {
  console.log(`[nexus-cerebro] escuchando en http://${HOST}:${PORT}  ·  bóveda: ${RAIZ}`)
})

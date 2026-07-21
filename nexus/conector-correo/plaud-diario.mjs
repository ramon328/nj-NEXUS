#!/usr/bin/env node
// plaud-diario.mjs — Corrida DIARIA (22:00) del pipeline Plaud completo:
//   1) DESCARGA los correos nuevos de Plaud (reusa plaud-descargar.mjs, no duplica).
//   2) ANALIZA con Claude cada nota NUEVA (destila la señal de negocio del ruido).
//   3) IMPLEMENTA: agrega el destilado al Segundo Cerebro (mensual, ordenado).
// Estado de análisis en estado-analisis.json (no re-analiza lo ya hecho).
import { readFileSync, writeFileSync, existsSync, readdirSync, appendFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import * as hist from '../hub/historial.mjs'

// Registra actividad en el mismo historial que consume el "Centro de IAs"
// (persona Cerebro · área Plaud) → se ve EN VIVO qué está procesando Nexus.
// Best-effort: si la BD falla, el pipeline sigue igual.
function act(herramienta, resumen, extra = {}) {
  try { hist.registrarActividad({ persona: 'Cerebro', area: 'Plaud', herramienta, canal: 'sistema', ok: true, resumen, ...extra }) } catch { /* */ }
}

const NEXUS = path.join(os.homedir(), 'nexus')
try { process.loadEnvFile(path.join(NEXUS, '.env')) } catch { /* */ }
const DIR = path.join(NEXUS, 'conector-correo')
const PLAUD = path.join(NEXUS, 'cerebro', '90-Agente', 'Plaud')
const ESTADO = path.join(DIR, 'estado-analisis.json')
const KEY = process.env.ANTHROPIC_API_KEY || ''
const MODELO = 'claude-haiku-4-5-20251001'

const log = (m) => { const l = `[plaud-diario ${new Date().toISOString()}] ${m}`; console.log(l); try { appendFileSync('/tmp/nexus-plaud.log', l + '\n') } catch { /* */ } }
const leerJson = (p, d) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return d } }

function descargar() {
  return new Promise((res) => {
    const ch = spawn('/usr/local/bin/node', [path.join(DIR, 'plaud-descargar.mjs'), '50'], { stdio: 'inherit' })
    ch.on('exit', () => res())
    ch.on('error', () => res())
  })
}

// Pre-extrae la SEÑAL: highlights que Plaud marcó (<mark>) + la intro, que
// concentran lo importante (las transcripciones arrancan con mucho ruido personal).
function extraerSenal(contenido) {
  const marks = [...contenido.matchAll(/<mark[^>]*>([^<]+)<\/mark>/g)].map((m) => m[1].trim()).filter((s) => s.length > 8)
  const lineas = contenido.split('\n').map((s) => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean)
  const intro = lineas.slice(0, 2).join(' ')
  return [intro, ...marks].filter(Boolean).map((s) => '• ' + s).join('\n').slice(0, 4500) || '(sin señal marcada)'
}

async function destilar(titulo, senal, contenido) {
  if (!KEY) throw new Error('falta ANTHROPIC_API_KEY')
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODELO, max_tokens: 900,
      system: 'Eres un analista de negocio. Te doy una reunión grabada por Plaud (transcripción CRUDA con MUCHO ruido personal: familia, compras, playa, niños). Primero va una "SEÑAL DESTACADA" con las frases clave que marcó Plaud — préstale ESPECIAL atención, ahí está lo importante. Extrae SOLO lo de NEGOCIO / accionable. AUNQUE el 95% sea ruido personal, si hay CUALQUIER contenido de negocio (proyectos, tecnología, plataformas, dinero, equipo, ventas, decisiones), extráelo. Responde EXACTAMENTE la palabra PERSONAL solo si de verdad NO hay NADA de negocio. Si tiene negocio, responde SOLO un bloque markdown conciso y FACTUAL (no inventes) con este formato:\n### {fecha} · {título corto}\n**Resumen:** 1-2 frases.\n**Decisiones:** viñetas (o "—").\n**Pendientes:** viñetas con responsable si se sabe (o "—").\n**Para Nexus (implementar):** ideas/tareas técnicas que Nexus podría hacer (o "—").\n**Personas/temas:** nombres y temas clave.\nNO detalles datos personales sensibles (RRHH nominal) al detalle.',
      messages: [{ role: 'user', content: `Título: ${titulo}\n\n=== SEÑAL DESTACADA (lo importante) ===\n${senal}\n\n=== TRANSCRIPCIÓN COMPLETA (mucho ruido personal) ===\n${contenido.slice(0, 40000)}` }],
    }),
    signal: AbortSignal.timeout(60000),
  })
  const d = await r.json()
  if (!r.ok) throw new Error('anthropic ' + r.status + ' ' + JSON.stringify(d).slice(0, 120))
  return (d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
}

// Segunda lectura: extrae el lado PERSONAL/humano de la grabación (lo que la de
// negocio descarta). Clasifica como Nico lo pidió: Familia, Pasiones, Relaciones,
// Reflexiones, Valores → va construyendo su perfil personal en el cerebro.
async function destilarPersonal(titulo, contenido) {
  if (!KEY) throw new Error('falta ANTHROPIC_API_KEY')
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODELO, max_tokens: 900,
      system: 'Eres el biógrafo personal de Nicolás (Nico). Te doy una grabación de Plaud de su DÍA A DÍA (transcripción cruda). Tu trabajo NO es el negocio — es entender a Nico COMO PERSONA. Extrae SOLO lo PERSONAL/humano (familia, hijos, pareja, amigos, gustos, deporte, música, autos como pasión, emociones, valores, reflexiones); IGNORA por completo lo laboral (empresas, plataformas, ventas, reuniones de trabajo). Sé FACTUAL: solo lo que de verdad aparece, NO inventes ni rellenes. Si una categoría no aparece en esta grabación, pon "—". Si la grabación NO tiene NADA personal relevante, responde EXACTAMENTE la palabra SIN_PERSONAL. Si tiene, responde SOLO un bloque markdown así:\n### {fecha} · {título corto}\n**Familia:** (hijos, pareja, casa, momentos familiares) o —\n**Pasiones:** (autos, música, deporte, hobbies) o —\n**Relaciones:** (amigos, gente cercana, vínculos) o —\n**Reflexiones:** (cómo piensa, qué lo preocupa/motiva, aprendizajes) o —\n**Valores:** (qué le importa de verdad, principios) o —\nResume, NO transcribas datos sensibles textuales.',
      messages: [{ role: 'user', content: `Título: ${titulo}\n\n=== TRANSCRIPCIÓN COMPLETA (su día a día) ===\n${contenido.slice(0, 40000)}` }],
    }),
    signal: AbortSignal.timeout(60000),
  })
  const d = await r.json()
  if (!r.ok) throw new Error('anthropic ' + r.status + ' ' + JSON.stringify(d).slice(0, 120))
  return (d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
}

async function main() {
  const t0 = Date.now()
  log('== corrida diaria ==')
  act('plaud_descarga', 'Descargando reuniones nuevas de Plaud (Gmail)')
  await descargar()

  const estado = leerJson(ESTADO, { analizados: [], personales_hechas: [] })
  const hechosNeg = new Set(estado.analizados)                 // ya destiladas (negocio)
  const hechosPer = new Set(estado.personales_hechas || [])    // ya con pasada personal
  const notas = existsSync(PLAUD) ? readdirSync(PLAUD).filter((f) => f.endsWith('.md') && !f.startsWith('_')) : []
  // pendiente = le falta la pasada de negocio O la personal (así también rellena el
  // perfil personal de grabaciones viejas que solo tenían la de negocio).
  const pendientes = notas.filter((f) => !hechosNeg.has(f) || !hechosPer.has(f))
  if (!pendientes.length) { log('sin grabaciones pendientes'); act('plaud_analisis', 'Sin grabaciones nuevas que analizar', { ms: Date.now() - t0 }); return }
  log(`procesando ${pendientes.length} grabación(es)`)
  act('plaud_analisis', `Analizando ${pendientes.length} grabación(es)`)

  let negocio = 0, sinNegocio = 0, conPersonal = 0
  for (const f of pendientes) {
    const tf = Date.now()
    const titulo = f.replace(/\.md$/, '')
    const mes = (f.match(/^(\d{4}-\d{2})/) || [])[1] || new Date().toISOString().slice(0, 7)
    try {
      const contenido = readFileSync(path.join(PLAUD, f), 'utf8').replace(/^---[\s\S]*?---\n/, '')

      // 1) PASADA DE NEGOCIO → _Análisis — <mes>.md (solo si aún no se hizo)
      if (!hechosNeg.has(f)) {
        const md = await destilar(titulo, extraerSenal(contenido), contenido)
        if (/^PERSONAL\b/i.test(md.trim())) { log(`  ${f}: sin negocio (omitida del análisis)`); sinNegocio++; act('plaud_reunion', `Reunión sin contenido de negocio: ${titulo}`, { ms: Date.now() - tf }) }
        else {
          const dest = path.join(PLAUD, `_Análisis — ${mes}.md`)
          if (!existsSync(dest)) writeFileSync(dest, `---\ntipo: analisis\ntags: [plaud, reuniones, analisis, negocio]\nmes: ${mes}\n---\n\n# Análisis de reuniones (Plaud · ${mes})\n\n> Destilado por Nexus de las transcripciones crudas (solo lo de negocio). Ver [[40 — Proyectos (tablero)]].\n\n`)
          appendFileSync(dest, `\n${md}\n\n---\n`)
          log(`  ${f}: negocio → _Análisis — ${mes}.md`)
          negocio++; act('plaud_reunion', `Destilado (negocio) al cerebro: ${titulo}`, { ms: Date.now() - tf, detalle: `_Análisis — ${mes}.md` })
        }
        hechosNeg.add(f)
      }

      // 2) PASADA PERSONAL → _Personal — <mes>.md (perfil de Nico: Familia, Pasiones,
      //    Relaciones, Reflexiones, Valores). Corre en TODA grabación (solo si falta).
      if (!hechosPer.has(f)) {
        try {
          const per = await destilarPersonal(titulo, contenido)
          if (!/^SIN_PERSONAL\b/i.test(per.trim()) && per.length > 20) {
            const destP = path.join(PLAUD, `_Personal — ${mes}.md`)
            if (!existsSync(destP)) writeFileSync(destP, `---\ntipo: perfil-personal\ntags: [plaud, personal, identidad, perfil]\nmes: ${mes}\n---\n\n# Nico · vida personal (Plaud · ${mes})\n\n> Perfil personal de Nico construido por Nexus desde sus grabaciones Plaud del día a día — SOLO lo humano (familia, pasiones, relaciones, reflexiones, valores). Alimenta [[10 — Identidad]] · ver [[14 — Yo personal (Nico)]].\n\n`)
            appendFileSync(destP, `\n${per}\n\n---\n`)
            log(`  ${f}: personal → _Personal — ${mes}.md`)
            conPersonal++; act('plaud_personal', `Perfil personal de Nico actualizado: ${titulo}`, { detalle: `_Personal — ${mes}.md` })
          } else { log(`  ${f}: sin contenido personal`) }
          hechosPer.add(f)
        } catch (e2) { log(`  ${f}: FALLO pasada personal: ${String(e2.message).slice(0, 120)}`) }
      }
    } catch (e) { log(`  ${f}: FALLO: ${String(e.message).slice(0, 120)}`); act('plaud_reunion', `Falló el análisis: ${titulo}`, { ok: false, ms: Date.now() - tf, detalle: String(e.message).slice(0, 120) }) }
  }
  writeFileSync(ESTADO, JSON.stringify({ analizados: [...hechosNeg].slice(-500), personales_hechas: [...hechosPer].slice(-500), ultima: new Date().toISOString() }, null, 2))
  act('plaud_analisis', `Listo: ${negocio} de negocio, ${conPersonal} con perfil personal (de ${pendientes.length})`, { ms: Date.now() - t0 })
  log('== fin ==')
}

main().catch((e) => log('ERROR: ' + e.message))

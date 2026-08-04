// analizar-trazas.mjs — LEE las trazas humanas grabadas y saca el "perfil de movimiento"
// (la firma estadística que BioCatch usa para distinguir humano de bot), y lo compara con lo
// que hoy genera el login automático (curvas Bézier + azar uniforme).
//
// Uso:  node analizar-trazas.mjs
// Salida: resumen por pantalla + data/perfil-humano.json (para que el "movedor" replique tu
//         forma real en el login automático — ver el plan al final).
//
// Qué mide y por qué importa (esto es lo que un bot hace "demasiado limpio"):
//   · velocidad: humano acelera y frena (campana ancha, cola larga); Bézier es casi constante.
//   · pausas: humano se detiene en bordes semánticos (antes de clickear, al leer); bot no.
//   · temblor: micro-reversiones de dirección; el bot va recto.
//   · overshoot: humano se pasa del objetivo y corrige; el bot cae justo.
//   · tecleo: dwell (tecla apretada) y flight (gap entre teclas) con distribución log-normal.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const TRAZAS = join(DIR, 'data', 'trazas-humano')

function leerTrazas() {
  let files = []
  try { files = readdirSync(TRAZAS).filter((f) => f.endsWith('.jsonl')) } catch { return [] }
  const out = []
  for (const f of files) {
    const eventos = []; let meta = {}
    for (const linea of readFileSync(join(TRAZAS, f), 'utf8').split('\n')) {
      if (!linea.trim()) continue
      let v; try { v = JSON.parse(linea) } catch { continue }
      if (Array.isArray(v)) eventos.push(...v)
      else if (v && v.meta) meta = v.meta
    }
    if (eventos.length) out.push({ file: f, meta, eventos })
  }
  return out
}

const pct = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))] }
const media = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0

function perfilDeUnaTraza(eventos) {
  const moves = eventos.filter((e) => e.k === 'move' && e.x != null)
  const vel = [], pausas = []
  let reversas = 0, dir = null
  for (let i = 1; i < moves.length; i++) {
    const dt = moves[i].t - moves[i - 1].t
    const dx = moves[i].x - moves[i - 1].x, dy = moves[i].y - moves[i - 1].y
    const dist = Math.hypot(dx, dy)
    if (dt > 0) vel.push(dist / dt)                 // px/ms
    if (dt > 120) pausas.push(dt)                   // se quedó quieto = pausa
    const d = Math.sign(dx)
    if (dir != null && d !== 0 && d !== dir) reversas++   // cambió de dirección horizontal = temblor/corrección
    if (d !== 0) dir = d
  }
  // tecleo: dwell = down→up de la misma tecla; flight = gap entre teclas
  const keys = eventos.filter((e) => e.k === 'key' || e.k === 'keyup')
  const dwell = [], flight = []
  let lastDown = {}
  let lastKeyT = null
  for (const e of keys) {
    if (e.k === 'key') {
      if (lastKeyT != null) flight.push(e.t - lastKeyT)
      lastKeyT = e.t; lastDown[e.code] = e.t
    } else if (e.k === 'keyup' && lastDown[e.code] != null) {
      dwell.push(e.t - lastDown[e.code]); delete lastDown[e.code]
    }
  }
  const trusted = eventos.length ? eventos.filter((e) => e.tr === 1).length / eventos.length : 0
  return {
    n_eventos: eventos.length, n_moves: moves.length, n_teclas: keys.filter((e) => e.k === 'key').length,
    isTrusted_pct: Math.round(trusted * 100),
    vel_media: +media(vel).toFixed(3), vel_p50: +pct(vel, 50).toFixed(3), vel_p95: +pct(vel, 95).toFixed(3),
    pausas: pausas.length, pausa_p50_ms: Math.round(pct(pausas, 50)), pausa_max_ms: Math.round(Math.max(0, ...pausas)),
    reversas_dir: reversas, temblor_ratio: moves.length ? +(reversas / moves.length).toFixed(3) : 0,
    dwell_p50_ms: Math.round(pct(dwell, 50)), flight_p50_ms: Math.round(pct(flight, 50)),
  }
}

function main() {
  const trazas = leerTrazas()
  if (!trazas.length) {
    console.log('Todavía no hay ninguna traza humana grabada.')
    console.log('Se graban SOLAS cada vez que entrás al banco por login asistido (TEK_GRABAR≠0).')
    console.log('Entrá una o dos veces y volvé a correr esto para ver tu perfil de movimiento.')
    return
  }
  console.log(`Trazas grabadas: ${trazas.length}\n`)
  const perfiles = []
  for (const t of trazas) {
    const p = perfilDeUnaTraza(t.eventos)
    perfiles.push({ ...p, user: t.meta.user, cuando: t.meta.inicio })
    console.log(`· ${t.file}  (${t.meta.user || '?'})`)
    console.log(`    eventos ${p.n_eventos} · moves ${p.n_moves} · teclas ${p.n_teclas} · isTrusted ${p.isTrusted_pct}%`)
    console.log(`    velocidad px/ms  media ${p.vel_media}  p50 ${p.vel_p50}  p95 ${p.vel_p95}`)
    console.log(`    pausas ${p.pausas} (p50 ${p.pausa_p50_ms}ms, máx ${p.pausa_max_ms}ms) · temblor ${p.temblor_ratio}`)
    console.log(`    tecleo dwell p50 ${p.dwell_p50_ms}ms · flight p50 ${p.flight_p50_ms}ms\n`)
  }
  // Perfil agregado (lo que el movedor debería imitar). Se guarda para el paso siguiente.
  const agg = (k) => +media(perfiles.map((p) => p[k]).filter((x) => x != null)).toFixed(3)
  const perfil = {
    generado: new Date().toISOString(), trazas: trazas.length,
    vel_media: agg('vel_media'), vel_p95: agg('vel_p95'),
    temblor_ratio: agg('temblor_ratio'), pausa_p50_ms: Math.round(agg('pausa_p50_ms')),
    dwell_p50_ms: Math.round(agg('dwell_p50_ms')), flight_p50_ms: Math.round(agg('flight_p50_ms')),
    isTrusted_pct: Math.round(agg('isTrusted_pct')),
  }
  try { writeFileSync(join(DIR, 'data', 'perfil-humano.json'), JSON.stringify(perfil, null, 2)) } catch { /* */ }
  console.log('Perfil humano agregado → data/perfil-humano.json')
  console.log(JSON.stringify(perfil, null, 2))
  if (perfil.isTrusted_pct < 100) {
    console.log('\n⚠ OJO: hay eventos con isTrusted=0 en la traza (no deberían existir en un login por VNC real).')
  }
  console.log('\nSiguiente paso (ver PUERTA-BANCO.md): el "movedor" del login automático usa este perfil')
  console.log('para moverse/teclear con tu firma real, y sniffAntifraude nos dice si BioCatch puntúa o ata a nonce.')
}

main()

#!/usr/bin/env node
// cobranza.mjs — Recordatorios de cobranza por WhatsApp a clientes de Aliace.
//
// ⚠️ USA EL NÚMERO ACTUAL DE NEXUS → si se banea, cae todo. Por eso es MUY
// conservador y arranca en MODO PRUEBA: con `enviar_real:false` (default) NO
// envía NADA, solo registra en el log lo que enviaría. Recién cuando Nico/Ramón
// pongan `enviar_real:true` en config.json empieza a mandar de verdad.
//
// Uso:
//   node cobranza.mjs estado                 → contadores del día, cola, blocklist, config
//   node cobranza.mjs agregar --nombre "Juan Perez" --tel +56961234567 --factura F-123 --monto 1990000 --fecha 2026-06-20
//   node cobranza.mjs correr                 → procesa la cola respetando TODOS los límites (dry si enviar_real=false)
//   node cobranza.mjs bloquear --tel +569... → opt-out manual (no se le vuelve a escribir)
//   node cobranza.mjs reset-cola             → vacía la cola
//
// La obtención automática de las facturas de 48h desde Aliace (navegador) se hace
// aparte y llena la cola con `agregar`/`cola.json`. Este archivo es el MOTOR anti-ban.

import os from 'node:os'
import path from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { spawn } from 'node:child_process'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const F_CONFIG = path.join(DIR, 'config.json')
const F_COLA = path.join(DIR, 'cola.json')
const F_ESTADO = path.join(DIR, 'estado.json')
const F_LOG = path.join(DIR, 'envios.log')

// ─── Config anti-ban (conservadora; ajustable a mano en config.json) ──────────
const CONFIG_DEFAULT = {
  enviar_real: false,        // ⛔ MASTER SWITCH. false = modo prueba (no envía nada).
  tope_diario: 15,           // máximo de mensajes por día (subir de a poco con el tiempo)
  max_por_hora: 6,           // máximo por hora
  delay_min_seg: 90,         // pausa mínima entre mensajes
  delay_max_seg: 240,        // pausa máxima entre mensajes
  hora_inicio: 10,           // solo horario hábil (Chile)
  hora_fin: 19,
  dias_habiles: [1, 2, 3, 4, 5],   // lun–vie (0=dom)
  cooldown_dias: 30,         // no re-contactar al mismo cliente dentro de N días
  remitente_firma: 'Aliace / MallorcAutos',
}

function cargar(file, def) {
  try { return { ...def, ...JSON.parse(readFileSync(file, 'utf8')) } } catch { return { ...def } }
}
function guardar(file, obj) { writeFileSync(file, JSON.stringify(obj, null, 2)) }
function cargarLista(file) { try { return JSON.parse(readFileSync(file, 'utf8')) } catch { return [] } }
function logLine(m) { try { writeFileSync(F_LOG, `[${new Date().toISOString()}] ${m}\n`, { flag: 'a' }) } catch { /* */ } }

const CONFIG = cargar(F_CONFIG, CONFIG_DEFAULT)
if (!existsSync(F_CONFIG)) guardar(F_CONFIG, CONFIG)   // crea config.json la 1ª vez

// estado: { enviados:[{tel,nombre,factura,ts}], blocklist:[tel] }
const ESTADO = cargar(F_ESTADO, { enviados: [], blocklist: [] })
function persistirEstado() { guardar(F_ESTADO, ESTADO) }

// ─── Plantillas variadas (cada cliente recibe una distinta → evita "mensaje masivo") ──
// Placeholders: {nombre} {factura} {monto} {fecha}. Se elige por hash del teléfono
// (estable por cliente) y se varía saludo/cierre para que no sean idénticos.
const SALUDOS = ['Hola {nombre} 👋', 'Estimado/a {nombre},', 'Buenas {nombre},', '{nombre}, ¿cómo está?']
const CUERPOS = [
  'le recordamos que su factura {factura} por ${monto} (emitida el {fecha}) está pendiente de pago.',
  'queríamos recordarle la factura {factura} de ${monto}, emitida el {fecha}, que figura sin pago.',
  'pasamos a recordarle que tiene la factura {factura} (${monto}, del {fecha}) por cancelar.',
  'le escribimos por la factura {factura} de ${monto} emitida el {fecha}, que aún aparece pendiente.',
]
const CIERRES = [
  'Cualquier duda o si ya pagó, nos avisa. ¡Gracias!',
  'Si necesita los datos de pago o ya lo realizó, escríbanos. Saludos.',
  'Quedamos atentos. Que tenga buen día.',
  'Gracias por su preferencia; cualquier consulta estamos a disposición.',
]
function fmtMonto(m) { const n = Number(m); return Number.isFinite(n) ? n.toLocaleString('es-CL') : String(m) }
function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }
function armarMensaje(c) {
  const h = hash(c.tel || c.nombre || '')
  const s = SALUDOS[h % SALUDOS.length]
  const b = CUERPOS[(h >> 2) % CUERPOS.length]
  const z = CIERRES[(h >> 4) % CIERRES.length]
  const txt = `${s} ${b} ${z}\n\n— ${CONFIG.remitente_firma}`
  return txt
    .replaceAll('{nombre}', c.nombre || '')
    .replaceAll('{factura}', c.factura || 's/n')
    .replaceAll('{monto}', fmtMonto(c.monto))
    .replaceAll('{fecha}', c.fecha || '')
}

// ─── Normalización / dedupe / límites ────────────────────────────────────────
function normTel(t) { const d = String(t || '').replace(/[^0-9]/g, ''); return d ? '+' + d.replace(/^0+/, '') : '' }
function yaContactado(tel) {
  const lim = Date.now() - CONFIG.cooldown_dias * 86400000
  return ESTADO.enviados.some((e) => e.tel === tel && new Date(e.ts).getTime() > lim)
}
function bloqueado(tel) { return ESTADO.blocklist.includes(tel) }
function enHorarioHabil(d = new Date()) {
  return CONFIG.dias_habiles.includes(d.getDay()) && d.getHours() >= CONFIG.hora_inicio && d.getHours() < CONFIG.hora_fin
}
function enviadosHoy() {
  const hoy = new Date().toDateString()
  return ESTADO.enviados.filter((e) => new Date(e.ts).toDateString() === hoy).length
}
function enviadosUltimaHora() {
  const h = Date.now() - 3600000
  return ESTADO.enviados.filter((e) => new Date(e.ts).getTime() > h).length
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rndDelay = () => (CONFIG.delay_min_seg + Math.random() * (CONFIG.delay_max_seg - CONFIG.delay_min_seg)) * 1000

// ─── Envío real (solo si enviar_real:true) — mismo patrón seguro que el Hub ───
const OPENCLAW_CLI = path.join(os.homedir(), '.npm-global', 'lib', 'node_modules', 'openclaw', 'openclaw.mjs')
let OPENCLAW_TOKEN = ''
try { OPENCLAW_TOKEN = JSON.parse(readFileSync(path.join(os.homedir(), '.openclaw', 'openclaw.json'), 'utf8'))?.gateway?.auth?.token || '' } catch { /* */ }
const F_COBRANZA_OFF = path.join(os.homedir(), 'nexus', 'COBRANZA-OFF')
function enviarReal(tel, texto) {
  // Interruptor maestro: si existe ~/nexus/COBRANZA-OFF, NO se envía nada (ni con --forzar).
  if (existsSync(F_COBRANZA_OFF)) return Promise.reject(new Error('Cobranza DESACTIVADA (existe ~/nexus/COBRANZA-OFF). No se envía.'))
  return new Promise((resolve, reject) => {
    const env = { ...process.env }
    if (OPENCLAW_TOKEN) env.OPENCLAW_GATEWAY_TOKEN = OPENCLAW_TOKEN
    const args = ['-q', '/dev/null', process.execPath, OPENCLAW_CLI, 'message', 'send', '--channel', 'whatsapp', '--target', tel, '--message', texto]
    const ch = spawn('script', args, { stdio: 'ignore', env })
    const to = setTimeout(() => { try { ch.kill('SIGKILL') } catch { /* */ } reject(new Error('timeout')) }, 90000)
    ch.on('error', (e) => { clearTimeout(to); reject(e) })
    ch.on('exit', (code) => { clearTimeout(to); code === 0 ? resolve() : reject(new Error('exit ' + code)) })
  })
}

// ─── Procesa la cola respetando TODOS los límites ────────────────────────────
async function correr() {
  const cola = cargarLista(F_COLA)
  const modo = CONFIG.enviar_real ? 'REAL' : 'PRUEBA (no envía)'
  const resumen = { modo, en_cola: cola.length, enviados: 0, omitidos: [], detalle: [] }

  if (!enHorarioHabil()) {
    resumen.nota = `Fuera de horario hábil (${CONFIG.hora_inicio}-${CONFIG.hora_fin}h, lun-vie). No se procesa.`
    return resumen
  }

  const restantes = []
  for (const raw of cola) {
    const tel = normTel(raw.tel)
    const c = { ...raw, tel }
    // Tope diario / horario
    if (enviadosHoy() + resumen.enviados >= CONFIG.tope_diario) { resumen.omitidos.push({ tel, motivo: 'tope diario' }); restantes.push(raw); continue }
    if (enviadosUltimaHora() >= CONFIG.max_por_hora) { resumen.omitidos.push({ tel, motivo: 'tope por hora' }); restantes.push(raw); continue }
    if (!tel) { resumen.omitidos.push({ tel: raw.tel, motivo: 'teléfono inválido' }); continue }
    if (bloqueado(tel)) { resumen.omitidos.push({ tel, motivo: 'en blocklist (opt-out)' }); continue }
    if (yaContactado(tel)) { resumen.omitidos.push({ tel, motivo: `ya contactado < ${CONFIG.cooldown_dias} días` }); continue }

    const texto = armarMensaje(c)
    if (CONFIG.enviar_real) {
      try {
        await enviarReal(tel, texto)
        ESTADO.enviados.push({ tel, nombre: c.nombre, factura: c.factura, ts: new Date().toISOString() })
        persistirEstado()
        logLine(`ENVIADO ${tel} (${c.factura})`)
        resumen.enviados++
        resumen.detalle.push({ tel, factura: c.factura, estado: 'enviado' })
      } catch (e) {
        logLine(`FALLO ${tel}: ${e.message}`)
        resumen.detalle.push({ tel, factura: c.factura, estado: 'fallo', error: e.message })
        restantes.push(raw)
      }
      await sleep(rndDelay())   // ritmo humano entre mensajes
    } else {
      // MODO PRUEBA: no envía, solo muestra/registra lo que enviaría
      logLine(`[DRY] a ${tel} (${c.factura}): ${texto.replace(/\n/g, ' ')}`)
      resumen.enviados++
      resumen.detalle.push({ tel, factura: c.factura, estado: 'DRY-RUN (no enviado)', mensaje: texto })
    }
  }
  // En modo real, lo no enviado (por topes/fallo) queda en la cola para la próxima.
  if (CONFIG.enviar_real) guardar(F_COLA, restantes)
  resumen.en_cola_despues = CONFIG.enviar_real ? restantes.length : cola.length
  return resumen
}

// ─── Iniciar una cobranza: crea la conversación en Supabase + manda el 1er mensaje ──
// Lo usa el flujo de producción (1 por cliente con factura de 48h) y el test.
// --forzar envía aunque enviar_real=false (para probar a tu PROPIO número).
async function iniciarCobranza(flags) {
  const c = { nombre: flags.nombre || '', tel: normTel(flags.tel), factura: flags.factura || '', monto: flags.monto || '', fecha: flags.fecha || '' }
  if (!c.tel) return { error: 'Falta --tel' }
  const forzar = !!flags.forzar
  if (!CONFIG.enviar_real && !forzar) return { error: 'Modo PRUEBA: usa --forzar para enviar de verdad (ej. a tu número), o pon enviar_real:true en config.json.' }
  if (!forzar && !enHorarioHabil()) return { error: `Fuera de horario hábil (${CONFIG.hora_inicio}-${CONFIG.hora_fin}h, lun-vie).` }
  if (!forzar && yaContactado(c.tel)) return { error: `Ya se contactó ese número hace < ${CONFIG.cooldown_dias} días.` }
  if (bloqueado(c.tel)) return { error: 'Ese número está en la blocklist (opt-out).' }
  const texto = armarMensaje(c)
  let conv = null
  try {
    const cob = await import('../hub/cobranza-agente.mjs')
    conv = await cob.crearConversacion({ telefono: c.tel, cliente_nombre: c.nombre, factura: c.factura, monto: c.monto, fecha_emision: c.fecha, es_test: forzar })
    await enviarReal(c.tel, texto)
    if (conv) await cob.logMensaje(conv.id, 'nexus', texto)
    ESTADO.enviados.push({ tel: c.tel, nombre: c.nombre, factura: c.factura, ts: new Date().toISOString() })
    persistirEstado()
    logLine(`INICIADA cobranza ${c.tel} (${c.factura}) conv=${conv?.id || '?'}`)
    return { ok: true, enviado_a: c.tel, conversacion_id: conv?.id || null, mensaje: texto, nota: conv ? 'Conversación creada; las respuestas del cliente las atenderá el agente acotado.' : '⚠️ No se pudo crear la conversación en la BD (¿corriste el schema.sql?).' }
  } catch (e) {
    return { error: 'No se pudo iniciar: ' + e.message, conversacion_id: conv?.id || null }
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
const cmd = process.argv[2]
const flags = {}
for (let i = 3; i < process.argv.length; i++) {
  const a = process.argv[i]; if (a.startsWith('--')) { const v = process.argv[i + 1]; if (!v || v.startsWith('--')) flags[a.slice(2)] = true; else { flags[a.slice(2)] = v; i++ } }
}
const out = (o) => { console.log(JSON.stringify(o, null, 2)); process.exit(0) }

if (cmd === 'estado') {
  out({
    modo: CONFIG.enviar_real ? 'REAL (enviando)' : 'PRUEBA (no envía)',
    config: CONFIG,
    enviados_hoy: enviadosHoy(),
    enviados_ultima_hora: enviadosUltimaHora(),
    en_cola: cargarLista(F_COLA).length,
    en_blocklist: ESTADO.blocklist.length,
    horario_habil_ahora: enHorarioHabil(),
  })
}
if (cmd === 'agregar') {
  const cola = cargarLista(F_COLA)
  cola.push({ nombre: flags.nombre || '', tel: flags.tel || '', factura: flags.factura || '', monto: flags.monto || '', fecha: flags.fecha || '' })
  guardar(F_COLA, cola)
  out({ ok: true, en_cola: cola.length })
}
if (cmd === 'bloquear') {
  const tel = normTel(flags.tel)
  if (!tel) out({ error: 'Falta --tel' })
  if (!ESTADO.blocklist.includes(tel)) { ESTADO.blocklist.push(tel); persistirEstado() }
  out({ ok: true, bloqueado: tel, total_blocklist: ESTADO.blocklist.length })
}
if (cmd === 'reset-cola') { guardar(F_COLA, []); out({ ok: true, en_cola: 0 }) }
if (cmd === 'correr') { correr().then(out) }
else if (cmd === 'iniciar') { iniciarCobranza(flags).then(out) }
else if (!['estado', 'agregar', 'bloquear', 'reset-cola'].includes(cmd)) {
  out({ error: `Comando desconocido: "${cmd || ''}". Usa: estado | agregar | iniciar | correr | bloquear | reset-cola` })
}

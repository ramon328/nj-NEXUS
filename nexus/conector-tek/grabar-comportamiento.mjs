// grabar-comportamiento.mjs — APRENDER del login HUMANO para arreglar el automático.
//
// Idea (pedido de Ramón, 04-ago-2026): el login automatizado rebota en BioCatch aunque teclea
// y clickea con eventos REALES (patchright los dispara a nivel navegador, isTrusted=true). Lo
// que BioCatch distingue es la FORMA del comportamiento: un humano tiembla, se pasa y corrige,
// acelera distinto, hace pausas semánticas; el script hace curvas Bézier demasiado limpias con
// azar uniforme. Para cerrar esa brecha primero hay que MEDIRLA — y nunca lo hicimos.
//
// Este módulo hace dos cosas, ambas SIN RIESGO (se cuelgan de un login que igual estás haciendo):
//   1. grabarComportamiento(page, meta) — durante el login ASISTIDO, registra el stream REAL de
//      eventos de tu mouse/teclado (x, y, tiempo, tipo, presión). Queda en data/trazas-humano/.
//      Con varias trazas tuyas armamos una LIBRERÍA de movimiento humano de verdad.
//   2. sniffAntifraude(ctx, meta) — registra las llamadas al colector de BioCatch/wup y su
//      respuesta, para saber si el antifraude PUNTÚA-y-deja-pasar (replicable) o se ATA a un
//      nonce de sesión (muro duro). Eso decide si el replay tiene sentido o es perder intentos.
//
// NADA de esto mueve plata ni cambia el login: solo observa. Se activa con TEK_GRABAR=1
// (por defecto ON en el asistido; ver login-humano.mjs).
import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const TRAZAS = join(DIR, 'data', 'trazas-humano')
const stamp = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'x'

// El instalador corre DENTRO de la página del banco. Escucha los eventos reales del humano,
// los agrupa y los manda al proceso Node por un binding. Sin backticks acá adentro (se arma con
// comillas normales) para no romper nada al inyectarlo. NO toca el DOM del banco: solo escucha.
function instaladorJS(bindingName) {
  return '(' + function (SINK) {
    if (window.__tekGrabadorOn) return; window.__tekGrabadorOn = true;
    var buf = [], t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    function push(ev, tipo) {
      // solo lo necesario para reconstruir la FORMA del gesto (no capturamos texto tecleado)
      var e = {
        k: tipo,
        t: Math.round(((window.performance && performance.now) ? performance.now() : Date.now()) - t0),
        x: ev.clientX != null ? Math.round(ev.clientX) : null,
        y: ev.clientY != null ? Math.round(ev.clientY) : null,
        b: ev.buttons != null ? ev.buttons : null,
        p: ev.pressure != null ? Number(ev.pressure.toFixed(3)) : null,
        tr: ev.isTrusted === true ? 1 : 0,
      };
      if (tipo === 'key') { e.code = ev.code || ''; }   // qué TECLA (no el valor), para el ritmo
      buf.push(e);
      if (buf.length >= 40) flush();
    }
    function flush() {
      if (!buf.length) return; var batch = buf; buf = [];
      try { SINK(JSON.stringify(batch)); } catch (err) { /* */ }
    }
    var lastMove = 0;
    addEventListener('pointermove', function (ev) {
      var now = e_now(); if (now - lastMove < 12) return; lastMove = now;   // ~80/s, suficiente
      push(ev, 'move');
    }, true);
    addEventListener('pointerdown', function (ev) { push(ev, 'down'); }, true);
    addEventListener('pointerup', function (ev) { push(ev, 'up'); }, true);
    addEventListener('keydown', function (ev) { push(ev, 'key'); }, true);
    addEventListener('keyup', function (ev) { push(ev, 'keyup'); }, true);
    function e_now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
    window.__tekGrabadorFlush = flush;   // para volcar lo pendiente antes de cerrar
    setInterval(flush, 800);
    addEventListener('beforeunload', flush, true);
  }.toString() + ')(window.' + bindingName + ')';
}

/**
 * Graba el comportamiento REAL del humano durante este login. Devuelve la ruta del archivo de
 * traza y un stop() por si se quiere cerrar antes. Best-effort: si algo falla, NO rompe el login.
 * @param {import('patchright').Page} page
 * @param {{user?:string, empresa?:string, via?:string}} meta
 */
export async function grabarComportamiento(page, meta = {}) {
  try { mkdirSync(TRAZAS, { recursive: true }); } catch { /* */ }
  const file = join(TRAZAS, `${stamp(meta.user)}-${Date.now()}.jsonl`);
  let eventos = 0;
  const BINDING = '__tekTrace_' + Math.random().toString(36).slice(2, 8);
  try {
    writeFileSync(file, JSON.stringify({ meta: { ...meta, inicio: new Date().toISOString() } }) + '\n');
    // Sink: el navegador nos manda lotes de eventos; los apilamos en el archivo (JSONL).
    await page.exposeBinding(BINDING, (_src, json) => {
      try { appendFileSync(file, json + '\n'); const n = (JSON.parse(json) || []).length; eventos += n; } catch { /* */ }
    });
    // El documento del login YA está cargado → instalamos ahora en él, y también en futuros
    // frames/navegaciones (el modal de Superclave puede venir en otro frame).
    const js = instaladorJS(BINDING);
    await page.addInitScript(js).catch(() => {});
    for (const fr of page.frames()) { try { await fr.evaluate(js); } catch { /* frame cross-origin */ } }
  } catch { /* si exposeBinding/addInitScript fallan, seguimos sin grabar */ }
  return {
    file,
    contar: () => eventos,
    async cerrar() {
      // Vuelca lo que quede en el buffer del navegador antes de cerrar.
      try { for (const fr of page.frames()) { await fr.evaluate('window.__tekGrabadorFlush&&window.__tekGrabadorFlush()').catch(() => {}); } } catch { /* */ }
    },
  };
}

/**
 * Escucha el diálogo con el antifraude (wup/BioCatch/sendLogs): qué se le manda y qué responde.
 * Con esto sabemos si el muro PUNTÚA (replicable) o se ATA a nonce (perder intentos no sirve).
 * @param {import('patchright').BrowserContext} ctx
 * @param {{user?:string}} meta
 */
export function sniffAntifraude(ctx, meta = {}) {
  const file = join(DIR, 'data', `antifraude-${stamp(meta.user)}-${Date.now()}.jsonl`);
  const RE = /wup-|biocatch|behavioral_biometrics|BioCatchHeartBeat|sendLogs|_bm\/|threatmetrix|imperva|incapsula/i;
  const onResp = async (resp) => {
    try {
      const url = resp.url(); if (!RE.test(url)) return;
      const req = resp.request();
      let reqLen = 0; try { reqLen = (req.postData() || '').length; } catch { /* */ }
      const linea = { t: new Date().toISOString(), m: req.method(), status: resp.status(), reqLen, url: url.slice(0, 200) };
      appendFileSync(file, JSON.stringify(linea) + '\n');
    } catch { /* */ }
  };
  try { mkdirSync(join(DIR, 'data'), { recursive: true }); } catch { /* */ }
  ctx.on('response', onResp);
  return { file, stop() { try { ctx.off('response', onResp); } catch { /* */ } } };
}

export default { grabarComportamiento, sniffAntifraude };

// Worker de la cola: toma pendientes, los entrega y reintenta con espera creciente.
import { db, ahora } from './db.mjs';
import { entregar, modoActual } from './transporte.mjs';
import { registrarEvento, suprimir, PUBLICA, tokenBaja } from './correo.mjs';

// Esperas entre reintentos: 1min, 5min, 15min, 1h, 6h. Despues se rinde.
const ESPERAS = [60e3, 300e3, 900e3, 3600e3, 21600e3];
const MAX = ESPERAS.length;

// Un rebote "duro" (la casilla no existe) no se reintenta nunca: se suprime.
// Seguir insistiendo contra direcciones muertas es lo que arruina la reputacion.
function esDuro(err) {
  const m = String(err && err.message || err).toLowerCase();
  const codigo = err?.responseCode;
  if (codigo && codigo >= 500 && codigo < 600) return true;
  return /5\.1\.[01]|no such user|user unknown|mailbox (not found|unavailable)|does not exist|invalid recipient|address rejected/i.test(m);
}

async function despachar(m) {
  db.prepare("UPDATE mensajes SET estado='enviando' WHERE id=?").run(m.id);
  try {
    const r = await entregar({
      to: m.para_nombre ? `"${m.para_nombre}" <${m.para}>` : m.para,
      from: `"${m.de_nombre}" <${m.de}>`,
      replyTo: m.responder_a || undefined,
      subject: m.asunto,
      html: m.html,
      text: m.texto,
      headers: {
        // Los avisos internos no llevan baja: si el dueno le da sin querer,
        // se suprime su propia casilla y deja de enterarse de las ventas.
        ...(String(m.origen).startsWith('interno') ? {} : {
          'List-Unsubscribe': `<${PUBLICA}/baja/${tokenBaja(m.para)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }),
        'X-Entity-Ref-ID': m.id,
      },
    });
    db.prepare("UPDATE mensajes SET estado='enviado', enviado=?, message_id=?, error=NULL WHERE id=?")
      .run(ahora(), r.messageId || null, m.id);
    registrarEvento(m.id, 'enviado', r.messageId || null);
    return { ok: true };
  } catch (e) {
    const intentos = m.intentos + 1;
    const duro = esDuro(e);
    const rendido = duro || intentos >= MAX;

    if (rendido) {
      db.prepare("UPDATE mensajes SET estado=?, intentos=?, error=? WHERE id=?")
        .run(duro ? 'rebotado' : 'fallido', intentos, String(e.message).slice(0, 500), m.id);
      registrarEvento(m.id, duro ? 'rebote_duro' : 'fallido', String(e.message).slice(0, 300));
      if (duro) suprimir(m.para, 'rebote_duro', String(e.message).slice(0, 200));
    } else {
      db.prepare("UPDATE mensajes SET estado='pendiente', intentos=?, prox_intento=?, error=? WHERE id=?")
        .run(intentos, ahora() + ESPERAS[intentos - 1], String(e.message).slice(0, 500), m.id);
      registrarEvento(m.id, 'reintento', `intento ${intentos}: ${String(e.message).slice(0, 200)}`);
    }
    return { ok: false, error: e.message, rendido };
  }
}

let corriendo = false;

// Procesa una tanda de pendientes que ya cumplieron su espera.
export async function vaciar(lote = 20) {
  if (corriendo) return { saltado: true };
  corriendo = true;
  const res = { enviados: 0, fallidos: 0 };
  try {
    const pendientes = db.prepare(
      "SELECT * FROM mensajes WHERE estado='pendiente' AND prox_intento<=? ORDER BY creado ASC LIMIT ?"
    ).all(ahora(), lote);

    for (const m of pendientes) {
      const r = await despachar(m);
      r.ok ? res.enviados++ : res.fallidos++;
      // Un respiro entre envios: los relays castigan las rafagas.
      if (modoActual() !== 'log') await new Promise((s) => setTimeout(s, 250));
    }
  } finally { corriendo = false; }
  return res;
}

let reloj = null;
export function arrancarCola(cadaMs = 15000) {
  if (reloj) return;
  reloj = setInterval(() => { vaciar().catch((e) => console.error('[cola]', e.message)); }, cadaMs);
  reloj.unref?.();
}

export function resumen() {
  const filas = db.prepare('SELECT estado, COUNT(*) n FROM mensajes GROUP BY estado').all();
  return Object.fromEntries(filas.map((f) => [f.estado, f.n]));
}

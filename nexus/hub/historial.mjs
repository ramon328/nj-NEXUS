// historial.mjs — Persistencia del historial de Nexus (chats, correos, llamadas).
// Usa el SQLite NATIVO de Node 22+ (node:sqlite) → cero dependencias nuevas.
// Vive en ~/nexus/historial.db y sobrevive reinicios del Hub.
//
// Lo alimentan:
//   - recordatorios.mjs  → cada mensaje programado que se envía (saliente)
//   - server.js (/api/asistente) → mensajes entrantes de la persona y respuestas de Nexus
//
// Lo consume el dashboard vía las rutas /api/historial/* del Hub.

import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'

const HOME = process.env.HOME || ''
const RUTA_DB = join(HOME, 'nexus', 'historial.db')

let _db = null
function db() {
  if (_db) return _db
  _db = new DatabaseSync(RUTA_DB)
  _db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS mensajes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts          TEXT NOT NULL,            -- ISO 8601
      canal       TEXT NOT NULL,            -- whatsapp | correo | llamada
      direccion   TEXT NOT NULL,            -- saliente (Nexus→persona) | entrante (persona→Nexus)
      contraparte TEXT NOT NULL,            -- número / correo / usuario de la otra parte
      texto       TEXT,                     -- cuerpo del mensaje
      asunto      TEXT,                     -- solo correo
      origen      TEXT,                     -- recordatorio | chat | manual
      ref_id      TEXT,                     -- id del recordatorio u otra referencia
      estado      TEXT,                     -- enviado | error | recibido
      detalle     TEXT,                     -- error/resultado/duración, etc.
      media       TEXT                      -- JSON con rutas de adjuntos/grabación
    );
    CREATE INDEX IF NOT EXISTS idx_msg_contraparte ON mensajes (contraparte, ts);
    CREATE INDEX IF NOT EXISTS idx_msg_canal       ON mensajes (canal, ts);

    -- Actividad de los "subagentes" (personas) de Nexus: Ali, Meme, Néstor, Martes…
    -- Una fila por cada herramienta ejecutada. La alimenta asistente.mjs (loop de tools)
    -- y la consume el "Centro de IAs" (/api/ias/* del Hub).
    CREATE TABLE IF NOT EXISTS actividad_ias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts          TEXT NOT NULL,   -- ISO 8601, momento en que terminó la acción
      persona     TEXT NOT NULL,   -- Ali | Meme | Néstor | Martes | Navegador | Cerebro | Nexus
      area        TEXT,            -- aliace | goautos | correo | sii | navegador | cerebro | nexus
      herramienta TEXT NOT NULL,   -- nombre de la tool ejecutada
      usuario     TEXT,            -- quién la gatilló (número / nombre)
      ok          INTEGER,         -- 1 = ok · 0 = error
      ms          INTEGER,         -- duración en milisegundos
      resumen     TEXT,            -- resumen corto del input
      detalle     TEXT             -- error o nota (si la hubo)
    );
    CREATE INDEX IF NOT EXISTS idx_act_persona ON actividad_ias (persona, ts);
    CREATE INDEX IF NOT EXISTS idx_act_ts      ON actividad_ias (ts);
  `)
  // Migración: canal desde donde se gatilló la acción (whatsapp | mini | sistema).
  // Permite ver en el Centro de IAs qué se usó por WhatsApp vs en el Mac mini.
  try {
    const cols = _db.prepare('PRAGMA table_info(actividad_ias)').all().map((c) => c.name)
    if (!cols.includes('canal')) _db.exec('ALTER TABLE actividad_ias ADD COLUMN canal TEXT')
  } catch { /* ya existe */ }
  return _db
}

// Normaliza el número/correo para agrupar el "chat" de forma consistente.
function clave(canal, contraparte) {
  const v = String(contraparte || '').trim()
  // Todos los canales telefónicos se normalizan a E.164 (sin espacios/guiones)
  // para que un mismo número no se parta en varias conversaciones.
  if (canal === 'whatsapp' || canal === 'llamada' || canal === 'sms' || canal === 'telefono') {
    return v.replace(/[^0-9+]/g, '')
  }
  return v.toLowerCase()
}

// Registra una fila. Devuelve el id insertado.
export function registrar({ canal, direccion, contraparte, texto, asunto, origen, ref_id, estado, detalle, media }) {
  const stmt = db().prepare(`
    INSERT INTO mensajes (ts, canal, direccion, contraparte, texto, asunto, origen, ref_id, estado, detalle, media)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const r = stmt.run(
    new Date().toISOString(),
    String(canal || 'whatsapp'),
    String(direccion || 'saliente'),
    clave(canal, contraparte),
    texto != null ? String(texto) : null,
    asunto != null ? String(asunto) : null,
    origen || null,
    ref_id || null,
    estado || null,
    detalle != null ? String(detalle).slice(0, 500) : null,
    media ? JSON.stringify(media) : null,
  )
  return Number(r.lastInsertRowid)
}

// Lista de conversaciones (un "chat" por contraparte+canal) con su último mensaje.
export function conversaciones({ canal } = {}) {
  const where = canal ? 'WHERE canal = ?' : ''
  const rows = db().prepare(`
    SELECT canal, contraparte,
           COUNT(*)            AS total,
           MAX(ts)             AS ultimo_ts,
           SUM(CASE WHEN estado='error' THEN 1 ELSE 0 END) AS errores
    FROM mensajes ${where}
    GROUP BY canal, contraparte
    ORDER BY ultimo_ts DESC
  `).all(...(canal ? [canal] : []))
  // Adjunta el texto del último mensaje de cada conversación.
  for (const c of rows) {
    const last = db().prepare(
      `SELECT direccion, texto, asunto FROM mensajes WHERE canal=? AND contraparte=? ORDER BY ts DESC LIMIT 1`,
    ).get(c.canal, c.contraparte)
    c.ultimo_texto = last?.texto || last?.asunto || ''
    c.ultima_direccion = last?.direccion || ''
  }
  return rows
}

// Hilo completo de una conversación (orden cronológico).
export function hilo({ canal, contraparte, limite = 500 }) {
  return db().prepare(`
    SELECT id, ts, canal, direccion, contraparte, texto, asunto, origen, ref_id, estado, detalle, media
    FROM mensajes
    WHERE canal = ? AND contraparte = ?
    ORDER BY ts ASC
    LIMIT ?
  `).all(canal, clave(canal, contraparte), limite)
}

// Últimos N mensajes de una conversación, en orden CRONOLÓGICO. Eficiente (usa el índice
// contraparte,ts): trae los más recientes y los devuelve del más viejo al más nuevo.
// Se usa para REHIDRATAR la memoria en RAM del hub tras un reinicio (así un "emítela"
// después de reiniciar no pierde el borrador que se creó antes).
export function recientes({ canal, contraparte, limite = 32 }) {
  const filas = db().prepare(`
    SELECT ts, direccion, texto
    FROM mensajes
    WHERE canal = ? AND contraparte = ?
    ORDER BY ts DESC
    LIMIT ?
  `).all(canal, clave(canal, contraparte), limite)
  return filas.reverse()
}

// Feed plano (para las pestañas de Correos y Llamadas).
export function feed({ canal, limite = 200 }) {
  const where = canal ? 'WHERE canal = ?' : ''
  return db().prepare(`
    SELECT id, ts, canal, direccion, contraparte, texto, asunto, origen, ref_id, estado, detalle, media
    FROM mensajes ${where}
    ORDER BY ts DESC
    LIMIT ?
  `).all(...(canal ? [canal, limite] : [limite]))
}

// ── Actividad de las IAs (subagentes) ───────────────────────────────────────

// Registra UNA acción de un subagente. Nunca lanza (el turno del usuario manda).
export function registrarActividad({ persona, area, herramienta, usuario, canal, ok = true, ms = 0, resumen, detalle } = {}) {
  try {
    const stmt = db().prepare(`
      INSERT INTO actividad_ias (ts, persona, area, herramienta, usuario, canal, ok, ms, resumen, detalle)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const r = stmt.run(
      new Date().toISOString(),
      String(persona || 'Nexus'),
      area != null ? String(area) : null,
      String(herramienta || '—'),
      usuario != null ? String(usuario) : null,
      canal != null ? String(canal) : null,
      ok ? 1 : 0,
      Number.isFinite(ms) ? Math.round(ms) : 0,
      resumen != null ? String(resumen).slice(0, 200) : null,
      detalle != null ? String(detalle).slice(0, 300) : null,
    )
    return Number(r.lastInsertRowid)
  } catch { return null }
}

// Feed de actividad reciente (todas las IAs o una sola).
export function actividadIAs({ persona, limite = 60 } = {}) {
  const where = persona ? 'WHERE persona = ?' : ''
  const args = persona ? [persona, limite] : [limite]
  return db().prepare(`
    SELECT id, ts, persona, area, herramienta, usuario, canal, ok, ms, resumen, detalle
    FROM actividad_ias ${where}
    ORDER BY ts DESC
    LIMIT ?
  `).all(...args)
}

// Estado ACTUAL de cada IA: su última acción y hace cuánto fue. Se considera
// "activo" si su última acción ocurrió en la ventana `activoSeg` (por defecto 90s).
export function estadoIAs({ activoSeg = 90 } = {}) {
  const rows = db().prepare(`
    SELECT a.persona, a.area, a.herramienta, a.usuario, a.canal, a.ok, a.ms, a.ts, a.detalle
    FROM actividad_ias a
    JOIN (SELECT persona, MAX(id) AS mid FROM actividad_ias GROUP BY persona) u
      ON a.persona = u.persona AND a.id = u.mid
    ORDER BY a.ts DESC
  `).all()
  const ahora = Date.now()
  return rows.map((r) => {
    const desde = ahora - Date.parse(r.ts)
    return {
      persona: r.persona, area: r.area,
      ultima_herramienta: r.herramienta, ultimo_usuario: r.usuario, ultimo_canal: r.canal,
      ultimo_ok: !!r.ok, ultimo_ms: r.ms, ultima_ts: r.ts,
      ultimo_detalle: r.detalle,
      hace_seg: Math.max(0, Math.round(desde / 1000)),
      activo: desde <= activoSeg * 1000,
    }
  })
}

// Métricas del día por IA (desde medianoche local, en la práctica desde las 00:00 UTC
// del día en curso — suficiente para un panel de operación).
export function metricasIAs({ desde } = {}) {
  const corte = desde || new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z').toISOString()
  const por = db().prepare(`
    SELECT persona, area,
           COUNT(*)                                   AS acciones,
           SUM(CASE WHEN ok=0 THEN 1 ELSE 0 END)      AS errores,
           CAST(AVG(ms) AS INTEGER)                   AS ms_promedio,
           MAX(ts)                                    AS ultima_ts
    FROM actividad_ias
    WHERE ts >= ?
    GROUP BY persona
    ORDER BY acciones DESC
  `).all(corte)
  const tot = db().prepare(`
    SELECT COUNT(*) AS acciones, SUM(CASE WHEN ok=0 THEN 1 ELSE 0 END) AS errores
    FROM actividad_ias WHERE ts >= ?
  `).get(corte)
  return { desde: corte, total: tot, por_persona: por }
}

// Último mensaje SALIENTE (que Nexus envió) a una contraparte. Sirve para que, si un
// número "automático" escribe, Nexus le repita EL MISMO mensaje que ya recibió.
export function ultimoSaliente(contraparte, canal = 'whatsapp') {
  try {
    const row = db().prepare(`
      SELECT texto FROM mensajes
      WHERE canal = ? AND contraparte = ? AND direccion = 'saliente'
        AND texto IS NOT NULL AND TRIM(texto) <> ''
      ORDER BY ts DESC LIMIT 1
    `).get(canal, clave(canal, contraparte))
    return row?.texto || null
  } catch { return null }
}
